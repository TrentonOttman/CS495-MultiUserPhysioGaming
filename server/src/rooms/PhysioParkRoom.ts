import { Client, type StepContext } from "colyseus";
import { LobbyCapableRoom } from "./base/LobbyCapableRoom.js";
import { PhysioParkState, Player, MoveInput } from "./schema/PhysioParkState.js";
import { stepAllPlayers, type PlatformerPlayer } from "../shared/platformerMovement.js";
import { PLATFORMER_TICK_RATE, PLAYER_HEIGHT_HALF } from "../shared/platformerConstants.js";
import { SOLIDS, LAVA, GOAL, spawnPoint } from "../shared/physioParkLevel.js";

/** How far below the lava's surface a player's feet must sink before respawning. */
const LAVA_DEPTH = 10;

export class PhysioParkRoom extends LobbyCapableRoom<PhysioParkState, MoveInput> {
    maxClients = 8;
    state = new PhysioParkState();

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
        this.setFixedTimestep((ctx) => this.step(ctx), PLATFORMER_TICK_RATE);
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
        const entries: { player: Player; sessionId: string; sim: PlatformerPlayer }[] = [];

        for (const [sessionId, player] of this.state.players) {
            const input = this.inputs.get(sessionId).next();
            entries.push({
                player,
                sessionId,
                sim: {
                    body: {
                        position: { x: player.x, y: player.y },
                        velocity: { x: player.vx, y: player.vy },
                        grounded: player.grounded,
                    },
                    input: { moveX: input?.moveX ?? 0, jump: input?.jump ?? false },
                },
            });
        }

        stepAllPlayers(entries.map((e) => e.sim), SOLIDS, ctx.dt);

        for (const { player, sessionId, sim } of entries) {
            const { body } = sim;

            // Fell into the lava: back to this player's spawn point.
            if (body.position.y + PLAYER_HEIGHT_HALF > LAVA.y + LAVA_DEPTH) {
                const spawn = spawnPoint(this.spawnIndex.get(sessionId) ?? 0);
                body.position.x = spawn.x;
                body.position.y = spawn.y;
                body.velocity.x = 0;
                body.velocity.y = 0;
                body.grounded = false;
            }

            player.x = body.position.x;
            player.y = body.position.y;
            player.vx = body.velocity.x;
            player.vy = body.velocity.y;
            player.grounded = body.grounded;

            if (isOnGoal(player)) {
                this.state.goalReached = true;
            }
        }
    }
}

/** True when the player is standing on top of the goal ledge. */
function isOnGoal(player: Player): boolean {
    const feet = player.y + PLAYER_HEIGHT_HALF;
    return player.grounded
        && Math.abs(feet - GOAL.y) < 0.01
        && player.x > GOAL.x
        && player.x < GOAL.x + GOAL.width;
}
