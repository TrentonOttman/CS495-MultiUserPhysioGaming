import { Client, type StepContext } from "colyseus";
import { LobbyCapableRoom } from "./base/LobbyCapableRoom.js";
import { PhysioParkState, Player, MoveInput } from "./schema/PhysioParkState.js";
import { Body, PhysicsWorld, Rect } from "../shared/physioPark/physioParkMovement.js";
import { GRAVITY, PLAYER_HEIGHT, PLAYER_WIDTH, TICK_RATE } from "../shared/physioPark/physioParkConstants.js";
import { applyPlayerInput, NO_INPUT } from "../shared/physioPark/physioParkInput.js";
import { SOLIDS, LAVA, GOAL, spawnPoint } from "../shared/physioPark/physioParkLevel.js";
import { validateDisplayName } from "../shared/displayName.ts";
import { PlayerInfo } from "./schema/LobbyState.ts";

export class PhysioParkRoom extends LobbyCapableRoom<PhysioParkState, MoveInput> {
    maxClients = 8;
    state = new PhysioParkState();

    private world = new PhysicsWorld({ x: 0, y: GRAVITY });

    private playerMap = new Map<string, Body>();

    /**
     * State updates 30 times a second. The client smooths between updates, so
     * movement looks fluid without sending a patch every 60 Hz tick.
     */
    patchRate = 1000 / 30;

    /**
     * Per-client input buffer. `sanitize` clamps `moveX` as it is decoded —
     * never trust the wire.
     *
     * The client sends one input per tick. `idle` repeats a player's last input
     * on any tick where none arrived (a late packet), so a held key keeps working.
     */
    inputs = this.defineInput(MoveInput, {
        bufferMaxSize: 64,
        sanitize: { moveX: [-1, 1] },
        idle: ({ latest }) => latest ?? true,
    });

    /** Each player's spawn slot, so respawning puts them back where they started. */
    private spawnIndex = new Map<string, number>();
    private joinCount = 0;

    /**
     * Runs after `LobbyCapableRoom` has validated and applied the lobby
     * configuration, so capacity and visibility are already set.
     */
    protected async onLobbyCreate(): Promise<void> {
        this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);

        for (let s of SOLIDS) {
            this.world.add(
                new Body(new Rect(s.x, s.y, s.width, s.height), { x: 0, y: 0 }, true), // solid platform
            );
        }

        const lava = this.world.add(
            new Body(new Rect(LAVA.x, LAVA.y, LAVA.width, LAVA.height), { x: 0, y: 0 }, true, true), // sensor
        );
        lava.tags.add("lava");

        const goal = this.world.add(
            new Body(new Rect(GOAL.x, GOAL.y - GOAL.height, GOAL.width, GOAL.height), { x: 0, y: 0 }, true, true), // sensor
        );
        goal.tags.add("goal");

        this.world.addOverlapRule({
            actorTag: "player",
            targetTag: "lava",
            handle: (player) => {
                const spawn = spawnPoint(1);
                player.rect.x = spawn.x;
                player.rect.y = spawn.y;
                player.velocity = { x: 0, y: 0 };
            },
        });

        this.world.addOverlapRule({
            actorTag: "player",
            targetTag: "goal",
            handle: () => {
                this.state.goalReached = true;
            },
        });
    }

    onJoin(client: Client, options:any) {
        console.log(client.sessionId, "joined!");

        let rawName = options?.displayName;
        if (!rawName || typeof rawName !== "string" || rawName.trim() === "") {
            rawName = `Player ${this.state.lobbyPlayers.size + 1}`;
        }
        const nameResult = validateDisplayName(rawName);
        const finalDisplayName = nameResult.ok ? nameResult.displayName : `Player ${this.state.lobbyPlayers.size + 1}`;
        const playerInfo = new PlayerInfo();
        playerInfo.displayName = finalDisplayName;
        this.state.lobbyPlayers.set(client.sessionId, playerInfo);

        if (this.state.playerIds && !this.state.playerIds.includes(client.sessionId)) {
            this.state.playerIds.push(client.sessionId);
        }

        const index = this.joinCount++;
        this.spawnIndex.set(client.sessionId, index);

        const spawn = spawnPoint(index);
        this.state.players.set(client.sessionId, new Player({
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            grounded: false,
            timeSinceGrounded: 0,
            color: index % 8,
        }));

        const player = this.world.add(new Body(new Rect(spawn.x, spawn.y, PLAYER_WIDTH, PLAYER_HEIGHT)));
        player.tags.add("player");
        this.playerMap.set(client.sessionId, player);
    }

    /**
     * Disconnect handling (holding a dropped player's seat, removing them once
     * the window passes, ending the match when too few remain) lives in
     * `LobbyCapableRoom`. This only forgets the player's spawn slot.
     */
    onLeave(client: Client, code: number) {
        this.spawnIndex.delete(client.sessionId);
        super.onLeave(client, code);
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }

    /**
     * One world step per tick. Each player consumes exactly ONE input (`next()`,
     * the shared-world primitive), so "one input = one step" holds on the server
     * just as it will in client-side prediction. Input is applied with the shared
     * `applyPlayerInput`, then the world steps everyone together.
     */
    private step(_ctx: StepContext) {
        for (const sessionId of this.state.players.keys()) {
            const body = this.playerMap.get(sessionId);
            if (!body) { continue; }

            const input = this.inputs.get(sessionId).next() ?? NO_INPUT;
            applyPlayerInput(body, input);
        }

        this.world.step();

        for (const [sessionId, player] of this.state.players) {
            const body = this.playerMap.get(sessionId);
            if (!body) { continue; }

            player.x = body.rect.x;
            player.y = body.rect.y;
            player.vx = body.velocity.x;
            player.vy = body.velocity.y;
            player.timeSinceGrounded = body.timeSinceGrounded;
            player.grounded = body.timeSinceGrounded === 0;
        }
    }

    // Immediately kill room on restore to avoid crashing
    async onRestoreRoom() {
        await this.disconnect();
    }
}
