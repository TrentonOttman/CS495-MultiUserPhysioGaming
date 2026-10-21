import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { getTestServer } from "./harness.js";
import type { PhysioParkState, MoveInput } from "../src/rooms/schema/PhysioParkState.js";
import { PLAYER_HEIGHT } from "../src/shared/physioPark/physioParkConstants.js";
import { GROUND_Y } from "../src/shared/physioPark/physioParkLevel.js";

const LOBBY_OPTIONS = { name: "Physics Test", gameId: "physio_park", maxPlayers: 4, isPrivate: false };

/** The y (top of the player's box) while standing on the ground. */
const STANDING_Y = GROUND_Y - PLAYER_HEIGHT;

describe("physio_park_room", () => {
    let colyseus: ColyseusTestServer<typeof appConfig>;

    before(async () => { colyseus = await getTestServer(); });

    beforeEach(async () => {
        await colyseus.cleanup();
    });

    async function waitTicks(room: { waitForNextTimestep(): Promise<unknown> }, ticks: number) {
        for (let i = 0; i < ticks; i++) { await room.waitForNextTimestep(); }
    }

    it("spawns joining players and lets them land on the ground", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        const client2 = await colyseus.connectTo(room);

        await waitTicks(room, 20);

        for (const client of [client1, client2]) {
            const player = room.state.players.get(client.sessionId);
            assert.ok(player, "a Player is created on join");
            assert.ok(Math.abs(player.y - STANDING_Y) < 0.5, `standing on the ground (y=${player.y})`);
            assert.strictEqual(player.grounded, true);
            assert.strictEqual(player.timeSinceGrounded, 0);
        }
    });

    it("keeps moving a player while the last input is held", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 10);

        const player = room.state.players.get(client1.sessionId);
        const startX = player.x;

        // Sent once: on ticks with no new input, the room repeats the last one.
        const input = client1.input<MoveInput>({ mode: "reliable" });
        input.data.moveX = 1;
        input.data.jump = false;
        input.send();

        await room.waitForNextMessage();
        await waitTicks(room, 5);

        assert.ok(player.x > startX, "the held input keeps moving the player");
    });

    it("jumps a grounded player", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 20);

        const player = room.state.players.get(client1.sessionId);
        assert.strictEqual(player.grounded, true);

        const input = client1.input<MoveInput>({ mode: "reliable" });
        input.data.moveX = 0;
        input.data.jump = true;
        input.send();

        await room.waitForNextMessage();
        await waitTicks(room, 3);

        assert.ok(player.y < STANDING_Y - 0.5, `the player left the ground (y=${player.y})`);
        assert.strictEqual(player.grounded, false);
    });

    it("applies one input per tick, not a whole burst at once", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 10);

        const player = room.state.players.get(client1.sessionId);
        const input = client1.input<MoveInput>({ mode: "reliable" });

        // A burst of 3 inputs: right, right, then stop.
        input.data.jump = false;
        input.data.moveX = 1; input.send();
        input.data.moveX = 1; input.send();
        input.data.moveX = 0; input.send();
        await room.waitForNextMessage();

        // The first tick after the burst must apply only the first input
        // (still moving right), not skip straight to the last one (stopped).
        await room.waitForNextTimestep();
        assert.ok(player.vx > 0, `first buffered input applied on its own tick (vx=${player.vx})`);
    });
});
