import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { getTestServer } from "./harness.js";
import type { PhysioParkState, MoveInput } from "../src/rooms/schema/PhysioParkState.js";
import {
    PhysioParkPredictionWorld,
    guessInput,
    snapshotOf,
    type PredictedPlayerState,
    type WorldSnapshot,
} from "../src/shared/physioPark/physioParkPrediction.js";
import { NO_INPUT, type PlayerInputLike } from "../src/shared/physioPark/physioParkInput.js";
import { Body, Rect } from "../src/shared/physioPark/physioParkMovement.js";
import { MOVE_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH } from "../src/shared/physioPark/physioParkConstants.js";
import { PHYSIO_PARK_LEVELS, GROUND_Y } from "../src/shared/physioPark/physioParkLevel.js";

const LOBBY_OPTIONS = { name: "Prediction Test", gameId: "physio_park", maxPlayers: 4, isPrivate: false };
const LEVEL_1 = PHYSIO_PARK_LEVELS[0];
const LEVEL_2 = PHYSIO_PARK_LEVELS[1];
const STANDING_Y = GROUND_Y - PLAYER_HEIGHT;

/** The local player's predicted state, read from a synced Player. */
function selfState(player: { x: number; y: number; vx: number; vy: number; timeSinceGrounded: number }): PredictedPlayerState {
    return {
        x: player.x,
        y: player.y,
        vx: player.vx,
        vy: player.vy,
        timeSinceGrounded: player.timeSinceGrounded,
        grounded: player.timeSinceGrounded === 0,
    };
}

const repeat = (input: PlayerInputLike, count: number) => Array.from({ length: count }, () => input);

/** Walk right, jump while walking, then let go: covers walking, jump, jump cut-off, and landing. */
const SEQUENCE: PlayerInputLike[] = [
    ...repeat({ moveX: 1, jump: false }, 20),
    ...repeat({ moveX: 1, jump: true }, 12),
    ...repeat({ moveX: -1, jump: false }, 10),
    ...repeat(NO_INPUT, 20),
];

describe("physio park client-side prediction", () => {
    let colyseus: ColyseusTestServer<typeof appConfig>;

    before(async () => { colyseus = await getTestServer(); });
    beforeEach(async () => { await colyseus.cleanup(); });

    async function waitTicks(room: { waitForNextTimestep(): Promise<unknown> }, ticks: number) {
        for (let i = 0; i < ticks; i++) { await room.waitForNextTimestep(); }
    }

    function sendAll(client: { input<T>(o: { mode: "reliable" }): any }, inputs: readonly PlayerInputLike[]) {
        const handle = client.input<MoveInput>({ mode: "reliable" });
        for (const input of inputs) {
            handle.data.moveX = input.moveX;
            handle.data.jump = input.jump;
            handle.send();
        }
    }

    it("predicts the local player's movement exactly like the server", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client = await colyseus.connectTo(room);
        await waitTicks(room, 30);

        // Start the prediction from the server's state, then feed both the same inputs.
        const predicted = selfState(room.state.players.get(client.sessionId)!);
        const world = new PhysioParkPredictionWorld(client.sessionId);
        world.adopt(snapshotOf(room.state));

        sendAll(client, SEQUENCE);
        await room.waitForNextMessage();
        await waitTicks(room, SEQUENCE.length + 10);

        // The room repeats the last input (no input) on idle ticks; predict those too.
        for (const input of SEQUENCE) world.step(predicted, input);
        for (let i = 0; i < 40; i++) world.step(predicted, NO_INPUT);

        const server = room.state.players.get(client.sessionId)!;
        assert.ok(Math.abs(predicted.x - server.x) < 1e-6, `x: predicted ${predicted.x}, server ${server.x}`);
        assert.ok(Math.abs(predicted.y - server.y) < 1e-6, `y: predicted ${predicted.y}, server ${server.y}`);
        assert.ok(server.x > LEVEL_1.spawnPoint(0).x + 10, "the sequence really moved the player");
    });

    it("predicts pushing into another player like the server", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const me = await colyseus.connectTo(room);
        const other = await colyseus.connectTo(room);
        await waitTicks(room, 30);

        const predicted = selfState(room.state.players.get(me.sessionId)!);
        const otherStartX = room.state.players.get(other.sessionId)!.x;
        const world = new PhysioParkPredictionWorld(me.sessionId);
        world.adopt(snapshotOf(room.state));

        // The other player stands still; I walk into them and shove them right.
        const push = [...repeat({ moveX: 1, jump: false }, 30), ...repeat(NO_INPUT, 10)];
        sendAll(me, push);
        await room.waitForNextMessage();
        await waitTicks(room, push.length + 10);

        for (const input of push) world.step(predicted, input);
        for (let i = 0; i < 30; i++) world.step(predicted, NO_INPUT);

        const server = room.state.players.get(me.sessionId)!;
        const otherServer = room.state.players.get(other.sessionId)!;
        const otherPredicted = world.remotePosition(other.sessionId)!;
        assert.ok(Math.abs(predicted.x - server.x) < 1e-6, `my x: predicted ${predicted.x}, server ${server.x}`);
        assert.ok(Math.abs(otherPredicted.x - otherServer.x) < 1e-6,
            `their x: predicted ${otherPredicted.x}, server ${otherServer.x}`);
        assert.ok(otherServer.x > otherStartX + 1, `the other player really got pushed (${otherStartX} -> ${otherServer.x})`);
    });
});

describe("physio park prediction world", () => {
    /** A level-1 snapshot with me standing at `me` and, optionally, one other player. */
    function snapshot(me: { x: number; y: number }, other?: Partial<WorldSnapshot["players"][number]>): WorldSnapshot {
        const players: WorldSnapshot["players"][number][] = [
            { sessionId: "me", x: me.x, y: me.y, vx: 0, vy: 0, timeSinceGrounded: 0, connected: true },
        ];
        if (other) {
            players.push({ sessionId: "other", x: 0, y: STANDING_Y, vx: 0, vy: 0, timeSinceGrounded: 0, connected: true, ...other });
        }
        return { level: LEVEL_1, players, buttonPressFrame: 0, crateX: 0, crateY: 0 };
    }

    function standingAt(x: number, y = STANDING_Y): PredictedPlayerState {
        return { x, y, vx: 0, vy: 0, timeSinceGrounded: 0, grounded: true };
    }

    it("lets the local player stand on another player", () => {
        const world = new PhysioParkPredictionWorld("me");
        world.adopt(snapshot({ x: 40, y: STANDING_Y - PLAYER_HEIGHT }, { x: 40 }));
        const me = standingAt(40, STANDING_Y - PLAYER_HEIGHT);

        for (let i = 0; i < 30; i++) world.step(me, NO_INPUT);

        assert.ok(Math.abs(me.y - (STANDING_Y - PLAYER_HEIGHT)) < 0.5, `standing on their head (y=${me.y})`);
        assert.strictEqual(me.grounded, true);
    });

    it("carries the local player along on top of a walking player", () => {
        const world = new PhysioParkPredictionWorld("me");
        world.adopt(snapshot({ x: 20, y: STANDING_Y - PLAYER_HEIGHT }, { x: 20, vx: MOVE_SPEED }));
        const me = standingAt(20, STANDING_Y - PLAYER_HEIGHT);

        for (let i = 0; i < 30; i++) world.step(me, NO_INPUT);

        const below = world.remotePosition("other")!;
        assert.ok(below.x > 35, `the player below kept walking (x=${below.x})`);
        assert.ok(Math.abs(me.x - below.x) < 0.5, `rode along on top (me ${me.x}, them ${below.x})`);
        assert.ok(me.y < below.y - PLAYER_HEIGHT + 0.5, "still on top");
    });

    it("lets the local player walk through a disconnected player", () => {
        const world = new PhysioParkPredictionWorld("me");
        world.adopt(snapshot({ x: 10, y: STANDING_Y }, { x: 30, connected: false }));
        const me = standingAt(10);

        for (let i = 0; i < 60; i++) world.step(me, { moveX: 1, jump: false });

        assert.ok(me.x > 30 + PLAYER_WIDTH, `walked past them (x=${me.x})`);
    });

    it("rebuilds when the level changes", () => {
        const world = new PhysioParkPredictionWorld("me");
        world.adopt(snapshot({ x: 4, y: STANDING_Y }));

        // Level 2's first conveyor (x 88-120, top at y 140) pushes riders right.
        const onBelt = { x: 92, y: 140 - PLAYER_HEIGHT };
        world.adopt({ ...snapshot(onBelt), level: LEVEL_2 });
        const me = standingAt(onBelt.x, onBelt.y);

        for (let i = 0; i < 20; i++) world.step(me, NO_INPUT);
        assert.ok(me.x > onBelt.x + 5, `the conveyor carried me (x=${me.x})`);
        assert.ok(Math.abs(me.y - onBelt.y) < 0.5, "and I'm standing on it, not falling");
    });

    it("guesses another player's input from their velocity", () => {
        const body = new Body(new Rect(20, STANDING_Y, PLAYER_WIDTH, PLAYER_HEIGHT), { x: -MOVE_SPEED, y: 0 });
        assert.deepStrictEqual(guessInput(body, LEVEL_1), { moveX: -1, jump: false });
        body.velocity = { x: 0, y: -100 };
        assert.deepStrictEqual(guessInput(body, LEVEL_1), { moveX: 0, jump: true });
    });
});
