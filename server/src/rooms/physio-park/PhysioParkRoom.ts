import type { Client, StepContext } from "colyseus";
import { LobbyCapableRoom } from "../base/LobbyCapableRoom.js";
import {
    PhysioParkState,
    Player,
    MoveInput,
} from "../schema/PhysioParkState.js";
import { Body, PhysicsWorld, Rect } from "../../shared/physioPark/physioParkMovement.js";
import {
    LEVEL_TRANSITION_DELAY_MS,
    PLAYER_HEIGHT,
    PLAYER_HEIGHT_HALF,
    PLAYER_WIDTH,
    PLAYER_WIDTH_HALF,
    TICK_RATE,
} from "../../shared/physioPark/physioParkConstants.js";
import { applyPlayerInput, NO_INPUT } from "../../shared/physioPark/physioParkInput.js";
import { PHYSIO_PARK_LEVELS, type ResolvedPhysioParkLevel } from "../../shared/physioPark/physioParkLevel.js";
import { PHYSIO_PARK_ANIMATIONS } from "../../shared/physioPark/physioParkAnimations.js";
import { validateDisplayName } from "../../shared/displayName.ts";
import { PlayerInfo } from "../schema/LobbyState.ts";
import {
    advanceMovingPlatforms,
    detectSwitchHits,
    finishMovingPlatforms,
    getButtonSurface,
    isCenteredOnButton,
    isStandingOn,
    toggleHitSwitches,
} from "./physioParkRoomMechanics.js";
import { createPhysioParkWorld } from "./physioParkWorld.js";

export class PhysioParkRoom extends LobbyCapableRoom<PhysioParkState, MoveInput> {
    maxClients = 8;
    state = new PhysioParkState();

    private world!: PhysicsWorld;
    private playerMap = new Map<string, Body>();
    private sessionByBody = new Map<Body, string>();
    private currentLevelIndex = 0;
    private transitionScheduled = false;
    private inputLockedUntilFresh = new Set<string>();
    private crateBody: Body | undefined;
    private buttonBody: Body | undefined;
    private buttonPressTick = 0;
    private movingPlatformBodies = new Map<string, Body>();

    /** Physics steps at 60 Hz; state patches are sent at 30 Hz. */
    patchRate = 1000 / 30;

    /** One queued input is consumed per world tick. */
    inputs = this.defineInput(MoveInput, {
        bufferMaxSize: 64,
        sanitize: { moveX: [-1, 1] },
        idle: ({ latest }) => latest ?? true,
    });

    private spawnIndex = new Map<string, number>();
    private joinCount = 0;

    private get currentLevel(): ResolvedPhysioParkLevel {
        return PHYSIO_PARK_LEVELS[this.currentLevelIndex];
    }

    /** Runs after lobby options have been validated and applied. */
    protected async onLobbyCreate(): Promise<void> {
        this.state.levelNumber = 1;
        this.state.levelPhase = "playing";
        this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);
        this.rebuildWorld();
    }

    onJoin(client: Client, options: any) {
        let rawName = options?.displayName;
        if (!rawName || typeof rawName !== "string" || rawName.trim() === "") {
            rawName = `Player ${this.state.lobbyPlayers.size + 1}`;
        }
        const nameResult = validateDisplayName(rawName);
        const finalDisplayName = nameResult.ok
            ? nameResult.displayName
            : `Player ${this.state.lobbyPlayers.size + 1}`;
        const playerInfo = new PlayerInfo();
        playerInfo.displayName = finalDisplayName;
        this.state.lobbyPlayers.set(client.sessionId, playerInfo);

        if (this.state.playerIds && !this.state.playerIds.includes(client.sessionId)) {
            this.state.playerIds.push(client.sessionId);
        }

        const index = this.joinCount++;
        this.spawnIndex.set(client.sessionId, index);
        const spawn = this.currentLevel.spawnPoint(index);
        this.state.players.set(client.sessionId, new Player({
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            grounded: false,
            timeSinceGrounded: 0,
            color: index % 8,
        }));

        const body = new Body(
            new Rect(spawn.x, spawn.y, PLAYER_WIDTH, PLAYER_HEIGHT),
            { x: 0, y: 0 },
        );
        body.tags.add("player");
        this.playerMap.set(client.sessionId, body);
        this.sessionByBody.set(body, client.sessionId);
        this.world.add(body);
    }

    /** A dropped player's seat is retained, but its body cannot drift or block teammates. */
    override onDrop(client: Client, code: number) {
        super.onDrop(client, code);
        this.lockInputUntilFresh(client.sessionId);
        const body = this.playerMap.get(client.sessionId);
        if (body) this.freezeBody(body);
        const player = this.state.players.get(client.sessionId);
        if (player) {
            player.vx = 0;
            player.vy = 0;
        }
    }

    override onReconnect(client: Client) {
        super.onReconnect(client);
        this.lockInputUntilFresh(client.sessionId);
        const body = this.playerMap.get(client.sessionId);
        const player = this.state.players.get(client.sessionId);
        if (!body || !player) return;

        body.velocity = { x: 0, y: 0 };
        body.timeSinceGrounded = 0;
        body.isStatic = false;
        body.isSensor = false;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;
        player.timeSinceGrounded = 0;
    }

    /** Remove bodies and spawn slots once the reconnection window expires. */
    override onLeave(client: Client, code: number) {
        this.spawnIndex.delete(client.sessionId);
        this.inputLockedUntilFresh.delete(client.sessionId);
        const body = this.playerMap.get(client.sessionId);
        if (body) {
            this.world.remove(body);
            this.sessionByBody.delete(body);
            this.playerMap.delete(client.sessionId);
        }
        super.onLeave(client, code);
    }

    onDispose() {
        this.transitionScheduled = false;
        console.log("room", this.roomId, "disposing...");
    }

    /**
     * Consume one input per tick, apply the shared movement rule, and step all
     * bodies together. Level transitions continue to simulate movement while
     * the completion message is visible.
     */
    private step(_ctx: StepContext) {
        for (const [sessionId, player] of this.state.players) {
            const body = this.playerMap.get(sessionId);
            if (!body) continue;

            if (!player.connected) {
                this.freezeBody(body);
                player.vx = 0;
                player.vy = 0;
                continue;
            }

            body.isStatic = false;
            body.isSensor = false;
            const channel = this.inputs.get(sessionId);
            if (this.inputLockedUntilFresh.has(sessionId)) {
                if (!channel || channel.size === 0) {
                    player.vx = 0;
                    body.velocity = { x: 0, y: player.vy };
                    continue;
                }
                this.inputLockedUntilFresh.delete(sessionId);
            }

            const input = channel?.next() ?? NO_INPUT;
            applyPlayerInput(body, input);
            for (const conveyor of this.currentLevel.conveyors ?? []) {
                if (!isStandingOn(body, conveyor.surface)) continue;
                body.velocity = { x: body.velocity.x + conveyor.pushSpeed, y: body.velocity.y };
                break;
            }
            player.vx = body.velocity.x;
        }

        if (this.crateBody && !this.crateBody.isStatic) {
            for (const conveyor of this.currentLevel.conveyors ?? []) {
                if (!isStandingOn(this.crateBody, conveyor.surface)) continue;
                this.crateBody.velocity = {
                    x: conveyor.pushSpeed,
                    y: this.crateBody.velocity.y,
                };
                break;
            }
        }

        const button = this.currentLevel.button;
        const playersOnButtonBeforeStep = new Set<string>();
        if (button) {
            const surface = getButtonSurface(button, this.state.buttonPressFrame);
            for (const [sessionId, player] of this.state.players) {
                const body = this.playerMap.get(sessionId);
                if (player.connected && body && isCenteredOnButton(body, surface)) {
                    playersOnButtonBeforeStep.add(sessionId);
                }
            }
        }

        const hitSwitches = detectSwitchHits(
            this.currentLevel.switches ?? [],
            this.state.players,
            this.playerMap,
        );
        this.advanceButtonPress();
        advanceMovingPlatforms(
            this.currentLevel.movingPlatforms ?? [],
            this.state.movingPlatforms,
            this.movingPlatformBodies,
        );
        this.world.step();
        finishMovingPlatforms(
            this.currentLevel.movingPlatforms ?? [],
            this.state.movingPlatforms,
            this.movingPlatformBodies,
        );
        toggleHitSwitches(
            this.currentLevel.switches ?? [],
            hitSwitches,
            this.state.playerSwitches,
            this.state.movingPlatforms,
            this.movingPlatformBodies,
        );

        if (button && !this.state.buttonPressed) {
            const surface = getButtonSurface(button, this.state.buttonPressFrame);
            const landedOnButton = [...this.state.players].some(([sessionId, player]) => {
                if (!player.connected) return false;
                const body = this.playerMap.get(sessionId);
                return body !== undefined
                    && !playersOnButtonBeforeStep.has(sessionId)
                    && isCenteredOnButton(body, surface);
            });
            if (landedOnButton) this.dropCrateFromButton();
        }

        for (const [sessionId, player] of this.state.players) {
            const body = this.playerMap.get(sessionId);
            if (!body) continue;

            player.x = body.rect.x;
            player.y = body.rect.y;
            player.vx = body.velocity.x;
            player.vy = body.velocity.y;
            player.timeSinceGrounded = body.timeSinceGrounded;
            player.grounded = body.timeSinceGrounded === 0;
        }

        if (this.crateBody) {
            this.state.crateX = this.crateBody.rect.x;
            this.state.crateY = this.crateBody.rect.y;
        }

        const activePlayers = [...this.state.players.values()]
            .filter((player) => player.connected)
            .map((player) => ({
                x: player.x + PLAYER_WIDTH_HALF,
                y: player.y + PLAYER_HEIGHT_HALF,
            }));

        if (this.state.levelPhase === "playing" && this.currentLevel.isComplete(activePlayers, {
            buttonPressed: this.state.buttonPressed,
        })) {
            this.beginLevelTransition();
        }
    }

    private beginLevelTransition() {
        if (this.state.levelPhase !== "playing" || this.transitionScheduled) return;

        if (this.currentLevelIndex >= PHYSIO_PARK_LEVELS.length - 1) {
            this.state.levelPhase = "completed";
            return;
        }

        this.state.levelPhase = "transitioning";
        this.transitionScheduled = true;
        this.clock.setTimeout(() => {
            if (!this.transitionScheduled || this.state.levelPhase !== "transitioning") return;
            this.transitionScheduled = false;
            this.loadLevel(this.currentLevelIndex + 1);
        }, LEVEL_TRANSITION_DELAY_MS);
    }

    private loadLevel(levelIndex: number) {
        if (levelIndex < 0 || levelIndex >= PHYSIO_PARK_LEVELS.length) {
            this.state.levelPhase = "completed";
            return;
        }

        this.currentLevelIndex = levelIndex;
        this.state.levelNumber = levelIndex + 1;

        for (const [sessionId, player] of this.state.players) {
            const body = this.playerMap.get(sessionId);
            if (!body) continue;

            const spawn = this.currentLevel.spawnPoint(this.spawnIndex.get(sessionId) ?? 0);
            body.rect.x = spawn.x;
            body.rect.y = spawn.y;
            body.velocity = { x: 0, y: 0 };
            body.timeSinceGrounded = 0;
            body.isStatic = !player.connected;
            body.isSensor = !player.connected;

            player.x = spawn.x;
            player.y = spawn.y;
            player.vx = 0;
            player.vy = 0;
            player.grounded = false;
            player.timeSinceGrounded = 0;
        }

        this.lockAllInputsUntilFresh();
        this.rebuildWorld();
        this.state.levelPhase = "playing";
    }

    private freezeBody(body: Body) {
        body.velocity = { x: 0, y: 0 };
        body.isStatic = true;
        body.isSensor = true;
    }

    private lockInputUntilFresh(sessionId: string) {
        this.inputs.get(sessionId).clear();
        this.inputLockedUntilFresh.add(sessionId);
    }

    private lockAllInputsUntilFresh() {
        for (const sessionId of this.state.players.keys()) {
            this.lockInputUntilFresh(sessionId);
        }
    }

    /** Rebuild only level geometry; session and player bodies remain room-owned. */
    private rebuildWorld() {
        this.buttonPressTick = 0;
        const parts = createPhysioParkWorld(
            this.currentLevel,
            this.state,
            this.playerMap.values(),
            (body) => this.respawnFromLava(body),
        );
        this.world = parts.world;
        this.crateBody = parts.crateBody;
        this.buttonBody = parts.buttonBody;
        this.movingPlatformBodies = parts.movingPlatformBodies;
    }

    /** Landing on the button activates its one-time crate drop. */
    private dropCrateFromButton() {
        if (!this.currentLevel.button || !this.buttonBody || !this.crateBody || this.state.buttonPressed) return;
        this.state.buttonPressed = true;
        this.state.buttonPressFrame = 0;
        this.buttonPressTick = 0;
        this.state.crateDropped = true;
        this.crateBody.isStatic = false;
        this.crateBody.velocity = { x: 0, y: 0 };
        this.crateBody.timeSinceGrounded = 0;
    }

    /** Keep the server collider on the same animation frame as the rendered cap. */
    private advanceButtonPress() {
        const button = this.currentLevel.button;
        if (!button || !this.buttonBody || !this.state.buttonPressed) return;
        const animation = PHYSIO_PARK_ANIMATIONS[button.sprite];
        const finalFrame = animation.frames.length - 1;
        if (finalFrame <= 0 || this.state.buttonPressFrame >= finalFrame) return;

        this.buttonPressTick++;
        const ticksPerFrame = Math.ceil(TICK_RATE / animation.frameRate);
        if (this.buttonPressTick < ticksPerFrame) return;
        this.buttonPressTick = 0;
        this.state.buttonPressFrame++;

        const surface = getButtonSurface(button, this.state.buttonPressFrame);
        this.buttonBody.rect.x = surface.x;
        this.buttonBody.rect.y = surface.y;
        this.buttonBody.rect.width = surface.width;
        this.buttonBody.rect.height = surface.height;
    }

    private respawnFromLava(body: Body) {
        if (body.isSensor) return;
        const sessionId = this.sessionByBody.get(body);
        if (!sessionId) return;
        const player = this.state.players.get(sessionId);
        if (!player?.connected) return;

        const spawn = this.currentLevel.spawnPoint(this.spawnIndex.get(sessionId) ?? 0);
        body.rect.x = spawn.x;
        body.rect.y = spawn.y;
        body.velocity = { x: 0, y: 0 };
        body.timeSinceGrounded = 0;
    }

    // Immediately kill the room on restore to avoid crashing on stale physics state.
    async onRestoreRoom() {
        await this.disconnect();
    }
}
