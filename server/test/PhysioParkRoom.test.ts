import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { getTestServer } from "./harness.js";
import type { PhysioParkState, MoveInput } from "../src/rooms/schema/PhysioParkState.js";
import { PLAYER_HEIGHT_HALF } from "../src/shared/platformerConstants.js";
import { GROUND_Y } from "../src/shared/physioParkLevel.js";

const LOBBY_OPTIONS = { name: "Physics Test", gameId: "physio_park", maxPlayers: 4, isPrivate: false };

/** The y a player's center sits at while standing on the ground. */
const STANDING_Y = GROUND_Y - PLAYER_HEIGHT_HALF;

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

        await waitTicks(room, 10);

        for (const client of [client1, client2]) {
            const player = room.state.players.get(client.sessionId);
            assert.ok(player, "a Player is created on join");
            assert.strictEqual(player.y, STANDING_Y);
            assert.strictEqual(player.grounded, true);
        }
    });

    it("moves a player right while the input is held", async () => {
        const room = await colyseus.createRoom<PhysioParkState>("physio_park_room", LOBBY_OPTIONS);
        const client1 = await colyseus.connectTo(room);
        await waitTicks(room, 5);

        const player = room.state.players.get(client1.sessionId);
        const startX = player.x;

        // Sent once: the room keeps applying the last input until a new one arrives.
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
        await waitTicks(room, 5);

        const player = room.state.players.get(client1.sessionId);
        assert.strictEqual(player.grounded, true);

        const input = client1.input<MoveInput>({ mode: "reliable" });
        input.data.moveX = 0;
        input.data.jump = true;
        input.send();

        await room.waitForNextMessage();
        await waitTicks(room, 2);

        assert.ok(player.y < STANDING_Y, "the player left the ground");
    });
});
