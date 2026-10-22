import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import type { PhysioParkState, MoveInput } from "../src/rooms/schema/PhysioParkState.js";
import type { Body } from "../src/shared/physioPark/physioParkMovement.js";
import {
    LEVEL_TRANSITION_DELAY_MS,
    PLAYER_HEIGHT,
    PLAYER_HEIGHT_HALF,
    PLAYER_WIDTH,
    PLAYER_WIDTH_HALF,
} from "../src/shared/physioPark/physioParkConstants.js";
import {
    allPlayersInsideGoalArea,
    PHYSIO_PARK_LEVELS,
} from "../src/shared/physioPark/physioParkLevel.js";
import { getTestServer } from "./harness.js";

const LOBBY_OPTIONS = { name: "Physics Test", gameId: "physio_park", maxPlayers: 4, isPrivate: false };
const levelOne = PHYSIO_PARK_LEVELS[0];

type TestRoomInternals = {
    playerMap: Map<string, Body>;
};

describe("physio_park_room", () => {
    let colyseus: ColyseusTestServer<typeof appConfig>;

    before(async () => { colyseus = await getTestServer(); });

    beforeEach(async () => {
        await colyseus.cleanup();
    });

    async function waitTicks(room: { waitForNextTimestep(): Promise<unknown> }, ticks: number) {
        for (let i = 0; i < ticks; i++) await room.waitForNextTimestep();
    }

    async function waitForState(predicate: () => boolean, timeoutMs = 1000) {
        const deadline = Date.now() + timeoutMs;
        while (!predicate() && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.ok(predicate(), "client state reached the expected value before the timeout");
    }

    function setPlayerCenter(room: { state: PhysioParkState }, sessionId: string, x: number, y: number) {
        const player = room.state.players.get(sessionId);
        const body = (room as unknown as TestRoomInternals).playerMap.get(sessionId);
        assert.ok(player && body, `player ${sessionId} exists in the room`);

        body.rect.x = x - PLAYER_WIDTH_HALF;
        body.rect.y = y - PLAYER_HEIGHT_HALF;
        body.velocity = { x: 0, y: 0 };
        body.timeSinceGrounded = 0;
        player.x = body.rect.x;
        player.y = body.rect.y;
        player.vx = 0;
        player.vy = 0;
    }

    function goalCenter() {
        return {
            x: levelOne.goalArea.x + levelOne.goalArea.width / 2,
            y: levelOne.goalArea.y + levelOne.goalArea.height / 2,
        };
    }

    it("requires every active player to occupy the goal at the same time", async () => {
        const point = goalCenter();
        const outside = { x: levelOne.goalArea.x - PLAYER_WIDTH, y: point.y };

        assert.strictEqual(allPlayersInsideGoalArea([], levelOne.goalArea), false);
        assert.strictEqual(allPlayersInsideGoalArea([point, outside], levelOne.goalArea), false);
        assert.strictEqual(allPlayersInsideGoalArea([point, point], levelOne.goalArea), true);

        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        const client2 = await colyseus.connectTo(room);
        await waitTicks(room, 5);

        setPlayerCenter(room, client1.sessionId, point.x, point.y);
        setPlayerCenter(room, client2.sessionId, outside.x, outside.y);
        await waitTicks(room, 2);
        assert.strictEqual(room.state.levelPhase, "playing", "one player at the goal is not enough");

        const input = client1.input<MoveInput>({ mode: "reliable" });
        const goalPlayerStartX = room.state.players.get(client1.sessionId)!.x;
        input.data.moveX = 1;
        input.data.jump = false;
        input.send();
        await waitTicks(room, 3);
        assert.ok(room.state.players.get(client1.sessionId)!.x > goalPlayerStartX, "a player can keep moving inside the goal");

        // Earlier visits do not stick: both players must be inside together.
        setPlayerCenter(room, client1.sessionId, outside.x, outside.y);
        setPlayerCenter(room, client2.sessionId, point.x, point.y);
        await waitTicks(room, 2);
        assert.strictEqual(room.state.levelPhase, "playing", "the first player left before the team arrived");

        setPlayerCenter(room, client1.sessionId, point.x, point.y);
        setPlayerCenter(room, client2.sessionId, point.x, point.y);
        await waitTicks(room, 2);
        assert.strictEqual(room.state.levelPhase, "transitioning");
        await waitForState(() => client1.state.levelPhase === "transitioning" && client2.state.levelPhase === "transitioning");

        const before = room.state.players.get(client1.sessionId)!.x;
        input.data.moveX = -1;
        input.data.jump = false;
        input.send();
        await waitTicks(room, 60);
        const movedPlayer = room.state.players.get(client1.sessionId)!;
        assert.ok(movedPlayer.x < before, "players can keep moving during the transition");
        assert.ok(movedPlayer.x + PLAYER_WIDTH_HALF < levelOne.goalArea.x, "players can leave the goal after completing it");
        assert.strictEqual(room.state.levelPhase, "transitioning", "leaving the goal does not cancel the transition");

        await new Promise((resolve) => setTimeout(resolve, LEVEL_TRANSITION_DELAY_MS + 150));
        assert.strictEqual(room.state.levelNumber, 2);
        assert.strictEqual(room.state.levelPhase, "playing");
        assert.ok(room.state.players.has(client1.sessionId), "the room keeps the first session");
        assert.ok(room.state.players.has(client2.sessionId), "the room keeps the second session");

        const spawn1 = PHYSIO_PARK_LEVELS[1].spawnPoint(0);
        const spawn2 = PHYSIO_PARK_LEVELS[1].spawnPoint(1);
        assert.ok(Math.abs(room.state.players.get(client1.sessionId)!.x - spawn1.x) < 2);
        assert.ok(Math.abs(room.state.players.get(client2.sessionId)!.x - spawn2.x) < 2);
        for (const player of room.state.players.values()) {
            assert.strictEqual(player.vx, 0);
            assert.strictEqual(player.vy, 0);
            assert.strictEqual(player.grounded, true);
        }
        await waitForState(() => client1.state.levelNumber === 2 && client2.state.levelNumber === 2);

        const nextGoal = PHYSIO_PARK_LEVELS[1].goalArea;
        const finalPoint = { x: nextGoal.x + nextGoal.width / 2, y: nextGoal.y + nextGoal.height / 2 };
        setPlayerCenter(room, client1.sessionId, finalPoint.x, finalPoint.y);
        setPlayerCenter(room, client2.sessionId, finalPoint.x, finalPoint.y);
        await waitTicks(room, 2);
        assert.strictEqual(room.state.levelNumber, 2, "final completion does not increment the level");
        assert.strictEqual(room.state.levelPhase, "completed");

        await new Promise((resolve) => setTimeout(resolve, LEVEL_TRANSITION_DELAY_MS + 150));
        assert.strictEqual(room.state.levelNumber, 2, "there is no third level transition");
        assert.strictEqual(room.state.levelPhase, "completed");
        await waitForState(() => client1.state.levelPhase === "completed" && client2.state.levelPhase === "completed");
    });

    it("excludes dropped players from the goal quorum and restores them on reconnect", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        const client2 = await colyseus.connectTo(room);
        await waitTicks(room, 5);

        const point = goalCenter();
        const outside = { x: levelOne.goalArea.x - PLAYER_WIDTH, y: point.y };
        setPlayerCenter(room, client1.sessionId, point.x, point.y);
        setPlayerCenter(room, client2.sessionId, outside.x, outside.y);
        const reconnectionToken = client2.reconnectionToken;
        client2.reconnection.enabled = false;
        await client2.leave(false);
        await waitForState(() => room.state.players.get(client2.sessionId)?.connected === false);
        await waitTicks(room, 2);
        assert.strictEqual(room.state.levelPhase, "transitioning", "the connected player can finish without a dropped seat");

        // The room lifecycle hook restores the seat and leaves it movable during the transition.
        const reconnected = await colyseus.sdk.reconnect<PhysioParkState>(reconnectionToken);
        await reconnected.waitForInitialState();
        assert.strictEqual(reconnected.sessionId, client2.sessionId);
        assert.strictEqual(room.state.players.get(client2.sessionId)!.connected, true);

        await new Promise((resolve) => setTimeout(resolve, LEVEL_TRANSITION_DELAY_MS + 150));
        const body = (room as unknown as TestRoomInternals).playerMap.get(client2.sessionId)!;
        assert.strictEqual(body.isStatic, false, "reconnected player becomes active in the loaded level");
        assert.strictEqual(body.isSensor, false);
        assert.strictEqual(room.state.levelNumber, 2);
    });

    it("spawns players and applies held movement and jump input", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 10);

        const player = room.state.players.get(client1.sessionId)!;
        assert.ok(player);
        assert.strictEqual(player.grounded, true);

        const startX = player.x;
        const input = client1.input<MoveInput>({ mode: "reliable" });
        input.data.moveX = 1;
        input.data.jump = false;
        input.send();
        await waitTicks(room, 5);
        assert.ok(player.x > startX, "a held horizontal input moves the player");

        input.data.moveX = 0;
        input.data.jump = true;
        input.send();
        await waitTicks(room, 2);
        assert.ok(player.y < GROUND_STANDING_Y, "jump input moves the player off the ground");
    });
});

const GROUND_STANDING_Y = 156 - PLAYER_HEIGHT;
