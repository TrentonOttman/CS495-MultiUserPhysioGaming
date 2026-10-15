import { Client, type StepContext } from "colyseus";
import { LobbyCapableRoom } from "./base/LobbyCapableRoom.js";
import { PhysioParkState, Player, MoveInput } from "./schema/PhysioParkState.js";
import { Body, PhysicsWorld, Rect } from "../shared/physioPark/physioParkMovement.js";
import { COYOTE_TIME, DT, GRAVITY, JUMP_SPEED, MAX_FALL_SPEED, MOVE_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH, TICK_RATE } from "../shared/physioPark/physioParkConstants.js";
import { SOLIDS, LAVA, GOAL, spawnPoint } from "../shared/physioPark/physioParkLevel.js";

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
     * `idle` repeats a player's last input on ticks where nothing new arrived,
     * so a held key keeps working even though the client only sends inputs when
     * they change.
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

    onJoin(client: Client) {
        console.log(client.sessionId, "joined!");

        const index = this.joinCount++;
        this.spawnIndex.set(client.sessionId, index);

        const spawn = spawnPoint(index);
        this.state.players.set(client.sessionId, new Player({
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            grounded: false,
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
     * One world step per tick: every player takes exactly one input (`next()`,
     * the shared-world primitive), then the shared platformer physics moves
     * everyone together so players can collide with and stand on each other.
     *
     * The schema stores flat `x, y, vx, vy` fields while the physics works on
     * `position` / `velocity` objects, so each player is copied into a plain
     * physics body, stepped, and copied back.
     */
    private step(ctx: StepContext) {
        //         const input = this.inputs.get(sessionId).next();
        for (const [sessionId, player] of this.state.players) {
            const channel = this.inputs.get(sessionId);
            if (!channel) { continue; }

            const playerBody = this.playerMap.get(sessionId);
            const canJump = playerBody.timeSinceGrounded <= COYOTE_TIME;

            for (const input of channel) {
                player.vx = input.moveX * MOVE_SPEED;

                if (input.jump && canJump) {
                    player.vy = -1 * JUMP_SPEED;
                    playerBody.timeSinceGrounded += COYOTE_TIME + 1;
                }

                // Cut off jump early when not holding jump
                const jumping = player.vy < 0 && playerBody.timeSinceGrounded > COYOTE_TIME;
                if (jumping && !input.jump) {
                    player.vy = 0;
                }

                if (player.vy >= MAX_FALL_SPEED) {
                    player.vy = MAX_FALL_SPEED;
                }
            }

            playerBody.velocity = { x: player.vx, y: player.vy };
        }

        this.world.step();

        for (const [sessionId, player] of this.state.players) {
            const channel = this.inputs.get(sessionId);
            if (!channel) { continue; }

            const playerBody = this.playerMap.get(sessionId);

            player.x = playerBody.rect.x;
            player.y = playerBody.rect.y;

            player.vx = playerBody.velocity.x;
            player.vy = playerBody.velocity.y;
        }
    }

    // Immediately kill room on restore to avoid crashing
    async onRestoreRoom() {
        await this.disconnect();
    }
}
