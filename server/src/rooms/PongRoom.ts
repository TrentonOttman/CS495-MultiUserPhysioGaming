import { Room, Client, CloseCode, type StepContext } from "colyseus";
import { PongState, Player, MoveInput, Vec2, Ball } from "./schema/PongState.js";
import { TICK_RATE, ARENA_WIDTH, ARENA_HEIGHT, BALL_SPEED } from "../shared/pongConstants.js";
import { stepPlayer, stepBall, checkIfScored } from "../shared/pongMovement.js";

const arenaCenter: Vec2 = new Vec2({
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
});

const ballNorm: Vec2 = new Vec2({
    x: 1,
    y: 1,
}).norm();

export class PongRoom extends Room<{ state: PongState, input: MoveInput }> {
    maxClients = 2;
    state = new PongState();

    private leftPaddle: string | null = null;
    private rightPaddle: string | null = null;
    
    /**
     * Per-client input buffer. `sanitize` clamps every field as it is decoded —
     * never trust the wire — and the buffer holds ~2s of inputs at this tick rate
     * so a burst after a stall still replays in order.
     */
    inputs = this.defineInput(MoveInput, {
        bufferMaxSize: 64,
        sanitize: { moveY: [-1, 1] },
    });

    messages = {
        // movement arrives through the input buffer above — register handlers here
        // only for things that are not inputs (chat, emotes, …).
    };

    onCreate(options: any) {
        this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);

        this.state.ball = new Ball({
            position: arenaCenter.clone(),
            velocity: ballNorm.clone().mult(-BALL_SPEED),
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        const playerCount = this.state.players.size;

        // Spawn left paddle
        if (!this.leftPaddle) {
            this.state.players.set(client.sessionId, new Player({
                position: new Vec2({
                    x: 80, 
                    y: ARENA_HEIGHT / 2
                }),
                velocity: new Vec2({x: 0, y: 0}),
            }));

            this.leftPaddle = client.sessionId;
        }
        // Spawn right paddle
        else {
            this.state.players.set(client.sessionId, new Player({
                position: new Vec2({
                    x: ARENA_WIDTH - 80,
                    y: ARENA_HEIGHT / 2,
                }),
                velocity: new Vec2({x: 0, y: 0}),
            }));

            this.rightPaddle = client.sessionId;
        }
    }

    onLeave(client: Client, code: CloseCode) {
        console.log(client.sessionId, "left!", code);
        this.state.players.delete(client.sessionId);

        if (client.sessionId === this.leftPaddle) {
            this.leftPaddle = null;
        } else if (client.sessionId === this.rightPaddle) {
            this.rightPaddle = null;
        }
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }

    /**
     * One shared `stepEntity` per received input, so the set the client predicted
     * is exactly the set the server applied. A client that sends nothing simply
     * does not move — an empty tick advances no one.
     */
    private step(ctx: StepContext) {
        for (const [sessionId, player] of this.state.players) {
            const channel = this.inputs.get(sessionId);
            if (!channel) { continue; }

            for (const input of channel) {
                stepPlayer(player, input, ctx.dt);
            }
        }

        if (this.state.players.size === 2) {
            const paddles = Array.from(this.state.players, ([_sessionId, player]) => player);
            stepBall(this.state.ball, paddles, ctx.dt);

            const hasScored = checkIfScored(this.state.ball);
            if (hasScored === "left") {
                this.state.leftScore += 1;
                this.state.ball.position = arenaCenter.clone();
                this.state.ball.velocity = ballNorm.clone().mult(-BALL_SPEED);
            } else if (hasScored === "right") {
                this.state.rightScore += 1;
                this.state.ball.position = arenaCenter.clone();
                this.state.ball.velocity = ballNorm.clone().mult(BALL_SPEED);
            }
        }
    }

    /**
     * Called on any disconnection the client did not ask for — a network blip, a
     * suspended tab, a tunnel change. Holding the seat lets the SDK retry into the
     * same session, so the player keeps their entity and their place in the room.
     */
    onDrop(client: Client, code: CloseCode) {
        // Deliberately not awaited: the framework routes the outcome to onReconnect()
        // or onLeave() by itself. The catch is only here because the promise also
        // rejects when the room is already disposing (server shutdown), which would
        // otherwise surface as an unhandled rejection.
        this.allowReconnection(client, 30).catch(() => { });
    }

    onReconnect(client: Client) {
        console.log(client.sessionId, "reconnected!");
    }
}
