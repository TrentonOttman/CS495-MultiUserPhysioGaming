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
    GROUND_Y,
    PHYSIO_PARK_LEVELS,
} from "../src/shared/physioPark/physioParkLevel.js";
import { getSpriteCollisionRects, PHYSIO_PARK_ANIMATIONS } from "../src/shared/physioPark/physioParkAnimations.js";
import { getTestServer } from "./harness.js";

const LOBBY_OPTIONS = { name: "Physics Test", gameId: "physio_park", maxPlayers: 4, isPrivate: false };
const levelOne = PHYSIO_PARK_LEVELS[0];
const levelTwo = PHYSIO_PARK_LEVELS[1];
const STANDING_Y = GROUND_Y - PLAYER_HEIGHT;

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
        assert.ok(player && body, "player exists in the room");

        body.rect.x = x - PLAYER_WIDTH_HALF;
        body.rect.y = y - PLAYER_HEIGHT_HALF;
        body.velocity = { x: 0, y: 0 };
        body.timeSinceGrounded = 0;
        player.x = body.rect.x;
        player.y = body.rect.y;
        player.vx = 0;
        player.vy = 0;
    }

    function goalCenter(level = levelOne) {
        return {
            x: level.goalArea.x + level.goalArea.width / 2,
            y: level.goalArea.y + level.goalArea.height / 2,
        };
    }

    it("spawns joining players and lets them land on the ground", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        const client2 = await colyseus.connectTo(room);

        await waitTicks(room, 20);

        for (const client of [client1, client2]) {
            const player = room.state.players.get(client.sessionId);
            assert.ok(player, "a Player is created on join");
            assert.ok(Math.abs(player.y - STANDING_Y) < 0.5, "player stands on the ground");
            assert.strictEqual(player.grounded, true);
            assert.strictEqual(player.timeSinceGrounded, 0);
        }
    });

    it("keeps moving a player while the last input is held", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 10);

        const player = room.state.players.get(client1.sessionId)!;
        const startX = player.x;
        const input = client1.input<MoveInput>({ mode: "reliable" });
        input.data.moveX = 1;
        input.data.jump = false;
        input.send();
        await waitTicks(room, 5);

        assert.ok(player.x > startX, "the held input keeps moving the player");
    });

    it("jumps a grounded player", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 20);

        const player = room.state.players.get(client1.sessionId)!;
        assert.strictEqual(player.grounded, true);

        const input = client1.input<MoveInput>({ mode: "reliable" });
        input.data.moveX = 0;
        input.data.jump = true;
        input.send();
        await room.waitForNextMessage();
        await waitTicks(room, 3);

        assert.ok(player.y < STANDING_Y - 0.5, "the player left the ground");
        assert.strictEqual(player.grounded, false);
    });

    it("applies one buffered input per tick", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 10);

        const player = room.state.players.get(client1.sessionId)!;
        const input = client1.input<MoveInput>({ mode: "reliable" });
        input.data.jump = false;
        input.data.moveX = 1;
        input.send();
        input.data.moveX = 1;
        input.send();
        input.data.moveX = 0;
        input.send();
        await room.waitForNextMessage();

        // The first tick after the burst applies the first buffered input.
        await room.waitForNextTimestep();
        assert.ok(player.vx > 0, "the first buffered input moves right");
    });

    it("requires every active player at the goal and completes levels in order", async () => {
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

        // Earlier visits do not count: the players must be inside together.
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

        const spawn1 = levelTwo.spawnPoint(0);
        const spawn2 = levelTwo.spawnPoint(1);
        assert.ok(Math.abs(room.state.players.get(client1.sessionId)!.x - spawn1.x) < 2);
        assert.ok(Math.abs(room.state.players.get(client2.sessionId)!.x - spawn2.x) < 2);
        for (const player of room.state.players.values()) {
            assert.strictEqual(player.vx, 0);
            assert.strictEqual(player.vy, 0);
            assert.strictEqual(player.grounded, true);
        }
        await waitForState(() => client1.state.levelNumber === 2 && client2.state.levelNumber === 2);

        // Level loading waits for each player to send a fresh input before movement resumes.
        input.data.moveX = 0;
        input.data.jump = false;
        input.send();
        await room.waitForNextMessage();
        await waitTicks(room, 2);

        // Drop one player onto the button so the test exercises Level 2's objective.
        const button = levelTwo.button!;
        const buttonSurface = getSpriteCollisionRects(
            PHYSIO_PARK_ANIMATIONS[button.sprite],
            button.position,
            0,
        )[0];
        assert.ok(buttonSurface, "button frame has a collision surface");
        const buttonBody = (room as unknown as TestRoomInternals).playerMap.get(client1.sessionId)!;
        buttonBody.rect.x = buttonSurface.x + buttonSurface.width / 2 - PLAYER_WIDTH_HALF;
        buttonBody.rect.y = buttonSurface.y - PLAYER_HEIGHT - 3;
        buttonBody.velocity = { x: 0, y: 240 };
        buttonBody.timeSinceGrounded = 1;
        await waitTicks(room, 1);
        assert.strictEqual(room.state.buttonPressed, true, "landing on the button drops the crate");

        const finalPoint = goalCenter(levelTwo);
        setPlayerCenter(room, client1.sessionId, finalPoint.x - 16, finalPoint.y);
        setPlayerCenter(room, client2.sessionId, finalPoint.x + 16, finalPoint.y);
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
});
