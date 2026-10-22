import type { Client } from "colyseus";
import { LobbyCapableRoom } from "./base/LobbyCapableRoom.js";
import { PhysioParkState, Player, MoveInput } from "./schema/PhysioParkState.js";
import { Body, PhysicsWorld, Rect } from "../shared/physioPark/physioParkMovement.js";
import {
    COYOTE_TIME,
    GRAVITY,
    JUMP_SPEED,
    LEVEL_TRANSITION_DELAY_MS,
    MAX_FALL_SPEED,
    MOVE_SPEED,
    PLAYER_HEIGHT,
    PLAYER_HEIGHT_HALF,
    PLAYER_WIDTH,
    PLAYER_WIDTH_HALF,
    TICK_RATE,
} from "../shared/physioPark/physioParkConstants.js";
import { PHYSIO_PARK_LEVELS, type ResolvedPhysioParkLevel } from "../shared/physioPark/physioParkLevel.js";
import { validateDisplayName } from "../shared/displayName.ts";
import { PlayerInfo } from "./schema/LobbyState.ts";

export class PhysioParkRoom extends LobbyCapableRoom<PhysioParkState, MoveInput> {
    maxClients = 8;
    state = new PhysioParkState();

    private world = new PhysicsWorld({ x: 0, y: GRAVITY });
    private playerMap = new Map<string, Body>();
    private sessionByBody = new Map<Body, string>();
    private currentLevelIndex = 0;
    private transitionScheduled = false;
    private inputLockedUntilFresh = new Set<string>();

    /** State updates 30 times a second; clients smooth between patches. */
    patchRate = 1000 / 30;

    /**
     * `idle` repeats a player's last input on ticks where nothing new arrived,
     * so a held key keeps working even though the client only sends changes.
     */
    inputs = this.defineInput(MoveInput, {
        bufferMaxSize: 64,
        sanitize: { moveX: [-1, 1] },
        idle: ({ latest }) => latest ?? true,
    });

    /** Each player's spawn slot is preserved across every level. */
    private spawnIndex = new Map<string, number>();
    private joinCount = 0;

    private get currentLevel(): ResolvedPhysioParkLevel {
        return PHYSIO_PARK_LEVELS[this.currentLevelIndex];
    }

    /** Runs after lobby options have been validated and applied. */
    protected async onLobbyCreate(): Promise<void> {
        this.state.levelNumber = 1;
        this.state.levelPhase = "playing";
        this.setFixedTimestep(() => this.step(), TICK_RATE);
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
     * Keep simulating movement through the completion display. The goal is
     * evaluated only while playing, so leaving it cannot cancel a transition.
     */
    private step() {
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
            const canJump = body.timeSinceGrounded <= COYOTE_TIME;

            if (this.inputLockedUntilFresh.has(sessionId)) {
                if (!channel || channel.size === 0) {
                    player.vx = 0;
                    body.velocity = { x: 0, y: player.vy };
                    continue;
                }
                this.inputLockedUntilFresh.delete(sessionId);
            }

            if (channel) {
                for (const input of channel) {
                    player.vx = input.moveX * MOVE_SPEED;

                    if (input.jump && canJump) {
                        player.vy = -JUMP_SPEED;
                        body.timeSinceGrounded += COYOTE_TIME + 1;
                    }

                    // Cut off a jump early when jump is released.
                    const jumping = player.vy < 0 && body.timeSinceGrounded > COYOTE_TIME;
                    if (jumping && !input.jump) player.vy = 0;
                    if (player.vy >= MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
                }
            }

            body.velocity = { x: player.vx, y: player.vy };
        }

        this.world.step();

        for (const [sessionId, player] of this.state.players) {
            const body = this.playerMap.get(sessionId);
            if (!body) continue;

            player.x = body.rect.x;
            player.y = body.rect.y;
            player.vx = body.velocity.x;
            player.vy = body.velocity.y;
            player.grounded = body.timeSinceGrounded === 0;
        }

        const activePlayers = [...this.state.players.values()]
            .filter((player) => player.connected)
            .map((player) => ({
                x: player.x + PLAYER_WIDTH_HALF,
                y: player.y + PLAYER_HEIGHT_HALF,
            }));

        if (this.state.levelPhase === "playing" && this.currentLevel.isComplete(activePlayers)) {
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

    /** Rebuild only level geometry; session and player bodies remain owned by this room. */
    private rebuildWorld() {
        const level = this.currentLevel;
        this.world = new PhysicsWorld({ x: 0, y: GRAVITY });

        for (const solid of level.solids) {
            this.world.add(new Body(new Rect(solid.x, solid.y, solid.width, solid.height), { x: 0, y: 0 }, true));
        }

        const lava = this.world.add(
            new Body(new Rect(level.lava.x, level.lava.y, level.lava.width, level.lava.height), { x: 0, y: 0 }, true, true),
        );
        lava.tags.add("lava");

        this.world.addOverlapRule({
            actorTag: "player",
            targetTag: "lava",
            handle: (body) => this.respawnFromLava(body),
        });

        for (const body of this.playerMap.values()) this.world.add(body);
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
