import assert from "assert";
import { matchMaker } from "colyseus";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { getTestServer } from "./harness.js";
import type { LobbyRoom } from "../src/rooms/LobbyRoom.js";
import type { PongRoom } from "../src/rooms/PongRoom.js";
import { MIN_PLAYERS, MAX_PLAYERS, validateLobbyConfig } from "../src/shared/lobbyConfig.js";
import { getGameRoomName } from "../src/shared/games.js";
import { resolveJoinCode } from "../src/client/matchmaking/joinCodeIndex.js";

/**
 * Covers the lobby-configuration PBI: creating a lobby, naming it, choosing a
 * size and visibility, the room that gets created, host identity, and the
 * rejection of invalid configurations.
 *
 * Joining by code, public discovery and host transfer belong to later PBIs and
 * are deliberately not asserted here.
 */
describe("session_lobby", () => {
    let colyseus: ColyseusTestServer<typeof appConfig>;

    before(async () => { colyseus = await getTestServer(); });

    beforeEach(async () => {
        await colyseus.cleanup();
    });

    /** Creates a lobby and seats the creating client in it. */
    async function createLobby(options: Record<string, unknown> = {}) {
        const room = await colyseus.createRoom<LobbyRoom>("session_lobby", { gameId: "pong", ...options });
        const client = await colyseus.connectTo(room);
        return { room, client };
    }

    const validConfig = {
        name: "Friday Group",
        maxPlayers: 6,
        isPrivate: false,
    };

    describe("creating a lobby", () => {
        it("seats the creator and marks them host", async () => {
            const { room, client } = await createLobby();

            assert.strictEqual(room.state.hostId, client.sessionId, "the first client to arrive is the host");
            assert.strictEqual(room.state.memberCount, 1, "the creator is in the room");
            assert.strictEqual(room.state.gameId, "pong");
        });

        it("mints a join code for the host to share", async () => {
            const { room } = await createLobby();
            assert.match(room.state.joinCode, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
        });

        it("rejects an unknown game", async () => {
            await assert.rejects(
                () => colyseus.createRoom("session_lobby", { gameId: "not-a-game" }),
                /Unknown game/,
            );
        });
    });

    describe("configuring a lobby", () => {
        it("accepts the minimum and maximum sizes", async () => {
            for (const maxPlayers of [MIN_PLAYERS, MAX_PLAYERS]) {
                // A distinct name per iteration: public lobbies may not share one.
                const { room, client } = await createLobby();
                client.send("configure", { ...validConfig, name: `Size ${maxPlayers}`, maxPlayers });
                await room.waitForNextPatch();

                assert.strictEqual(room.state.maxPlayers, maxPlayers);
                assert.strictEqual(room.maxClients, maxPlayers, "capacity is enforced by the room");
                assert.strictEqual(room.metadata.maxPlayers, maxPlayers, "the listing carries the size");
            }
        });

        it("records the name and visibility in state and metadata", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...validConfig, name: "Study Hall", isPrivate: true });
            await room.waitForNextPatch();

            assert.strictEqual(room.state.lobbyName, "Study Hall");
            assert.strictEqual(room.metadata.lobbyName, "Study Hall");
            assert.strictEqual(room.state.isPrivate, true);
            assert.strictEqual(room.metadata.isPrivate, true);
        });

        it("rejects sizes outside 2..12", async () => {
            for (const maxPlayers of [1, 13, 0, -3]) {
                const { room, client } = await createLobby();
                client.send("configure", { ...validConfig, maxPlayers });
                const payload = await client.waitForMessage("error");

                assert.match(payload.error, /between 2 and 12/);
                assert.strictEqual(room.state.maxPlayers, MIN_PLAYERS, "the rejected value is not applied");
            }
        });

        it("rejects a fractional size", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...validConfig, maxPlayers: 4.5 });
            const payload = await client.waitForMessage("error");

            assert.match(payload.error, /whole number/);
        });

        it("rejects an empty or whitespace-only name", async () => {
            for (const name of ["", "   "]) {
                const { room, client } = await createLobby();
                client.send("configure", { ...validConfig, name });
                const payload = await client.waitForMessage("error");

                assert.match(payload.error, /empty/);
                assert.strictEqual(room.state.lobbyName, "");
            }
        });

        it("rejects a name longer than the limit", async () => {
            const { client } = await createLobby();
            client.send("configure", { ...validConfig, name: "x".repeat(41) });
            const payload = await client.waitForMessage("error");

            assert.match(payload.error, /40 characters/);
        });

        it("rejects a non-boolean visibility", async () => {
            const { client } = await createLobby();
            // Cast because the point of the test is a value the payload type
            // forbids — a modified client, which is exactly what the room must
            // not trust.
            client.send("configure", { ...validConfig, isPrivate: "yes" as unknown as boolean });
            const payload = await client.waitForMessage("error");

            assert.match(payload.error, /public or private/);
        });

        it("refuses configuration from a non-host", async () => {
            const { room, client: host } = await createLobby();
            const guest = await colyseus.connectTo(room);

            guest.send("configure", { ...validConfig, name: "Hijacked" });
            const payload = await guest.waitForMessage("error");

            assert.match(payload.error, /host/);
            await room.waitForNextPatch();
            assert.strictEqual(room.state.lobbyName, "", "the host's configuration is untouched");
        });

        it("rejects a duplicate name between public lobbies", async () => {
            const { room: first, client: firstHost } = await createLobby();
            firstHost.send("configure", validConfig);
            await first.waitForNextPatch();

            const { client: secondHost } = await createLobby();
            secondHost.send("configure", validConfig);
            const payload = await secondHost.waitForMessage("error");

            assert.match(payload.error, /already uses that name/);
        });

        it("allows two private lobbies to share a name", async () => {
            const { room: first, client: firstHost } = await createLobby();
            firstHost.send("configure", { ...validConfig, isPrivate: true });
            await first.waitForNextPatch();

            const { room: second, client: secondHost } = await createLobby();
            secondHost.send("configure", { ...validConfig, isPrivate: true });
            await second.waitForNextPatch();

            assert.strictEqual(first.state.lobbyName, validConfig.name);
            assert.strictEqual(second.state.lobbyName, validConfig.name);
        });

        it("keeps private lobbies out of the public listing", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...validConfig, name: "Hidden", isPrivate: true });
            await room.waitForNextPatch();

            assert.strictEqual(room.metadata.isPrivate, true);

            // This is the same filter the built-in `lobby` browser room applies,
            // so a private lobby is invisible to discovery and unreachable
            // through `joinOrCreate`.
            const listed = await matchMaker.query({ name: "session_lobby", private: false });
            assert.ok(
                !listed.some((r) => r.roomId === room.roomId),
                "a private lobby does not appear in the public listing",
            );
        });

        it("lists public lobbies", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...validConfig, name: "Open Session", isPrivate: false });
            await room.waitForNextPatch();

            const listed = await matchMaker.query({ name: "session_lobby", private: false });
            const found = listed.find((r) => r.roomId === room.roomId);
            assert.ok(found, "a public lobby appears in the listing");
            assert.strictEqual((found!.metadata as { lobbyName?: string }).lobbyName, "Open Session");
        });
    });

    describe("starting the game", () => {
        it("creates the game room with the configured lobby", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...validConfig, maxPlayers: 4 });
            await room.waitForNextPatch();

            client.send("start");
            const ready = await client.waitForMessage("gameReady");

            const game = colyseus.getRoomById<PongRoom>(ready.roomId);
            assert.ok(game, "the game room exists");
            assert.strictEqual(game.maxClients, 4, "the game room honours the lobby size");

            // Assert the replicated state, not just the listing: the SDK room
            // exposes no metadata, so state is the only way a client can see
            // the configuration it was started with.
            assert.strictEqual(game.state.maxPlayers, 4);
            assert.strictEqual(game.state.lobbyName, validConfig.name);
            assert.strictEqual(game.state.isPrivate, false);
            assert.strictEqual(game.state.gameId, "pong");
            assert.strictEqual(game.state.hostId, room.state.hostId, "the host carries into the game");
            assert.strictEqual(game.state.joinCode, room.state.joinCode, "the join code carries into the game");

            // And the listing, which is what the room browser reads.
            assert.strictEqual(game.metadata.maxPlayers, 4);
            assert.strictEqual(game.metadata.lobbyName, validConfig.name);
        });

        it("starts the room named by the registry", async () => {
            const { client } = await createLobby();
            client.send("configure", validConfig);
            client.send("start");
            const ready = await client.waitForMessage("gameReady");

            assert.strictEqual(getGameRoomName("pong"), "pong_room");
            assert.ok(colyseus.getRoomById(ready.roomId), `a room exists for ${ready.roomId}`);
        });

        it("refuses to start from a non-host", async () => {
            const { room, client: host } = await createLobby();
            host.send("configure", validConfig);
            const guest = await colyseus.connectTo(room);

            guest.send("start");
            const payload = await guest.waitForMessage("error");

            assert.match(payload.error, /host/);
            assert.strictEqual(room.state.status, "configuring", "the game did not start");
        });

        it("refuses to start an unnamed lobby", async () => {
            const { client } = await createLobby();
            client.send("start");
            const payload = await client.waitForMessage("error");

            assert.match(payload.error, /name/);
        });

        it("ignores a second start", async () => {
            const { room, client } = await createLobby();
            client.send("configure", validConfig);
            client.send("start");
            await client.waitForMessage("gameReady");

            client.send("start");
            const payload = await client.waitForMessage("error");
            assert.match(payload.error, /already started/);
        });
    });

    describe("joining with a code", () => {
        it("resolves a code to the lobby that minted it", async () => {
            const { room } = await createLobby();
            const code = room.state.joinCode;

            assert.strictEqual(resolveJoinCode(code), room.roomId, "the code resolves to its lobby");
            assert.strictEqual(resolveJoinCode(code.toLowerCase()), room.roomId, "codes are case-insensitive");
            assert.strictEqual(resolveJoinCode(` ${code} `), room.roomId, "surrounding space is ignored");
        });

        it("returns nothing for an unknown code", async () => {
            await createLobby();
            assert.strictEqual(resolveJoinCode("ZZZZZZ"), null);
        });

        it("stops resolving once the lobby is disposed", async () => {
            const { room } = await createLobby();
            const code = room.state.joinCode;
            assert.strictEqual(resolveJoinCode(code), room.roomId);

            await colyseus.cleanup();

            assert.strictEqual(resolveJoinCode(code), null, "a dead lobby's code is not handed out");
        });

        it("admits a guest presenting the right code to a private lobby", async () => {
            const { room, client: host } = await createLobby();
            host.send("configure", { ...validConfig, isPrivate: true });
            await room.waitForNextPatch();

            const guest = await colyseus.connectTo(room, { joinCode: room.state.joinCode });
            assert.ok(guest.sessionId, "the guest was seated");
            await room.waitForNextPatch();
            assert.strictEqual(room.state.memberCount, 2);
        });

        it("refuses a guest with the wrong code on a private lobby", async () => {
            const { room, client: host } = await createLobby();
            host.send("configure", { ...validConfig, isPrivate: true });
            await room.waitForNextPatch();

            await assert.rejects(
                () => colyseus.connectTo(room, { joinCode: "ZZZZZZ" }),
                /Not allowed to join this lobby/,
            );
        });

        it("refuses a guest with no code at all on a private lobby", async () => {
            const { room, client: host } = await createLobby();
            host.send("configure", { ...validConfig, isPrivate: true });
            await room.waitForNextPatch();

            await assert.rejects(() => colyseus.connectTo(room), /Not allowed to join this lobby/);
        });

        it("lets any guest into a public lobby without a code", async () => {
            const { room, client: host } = await createLobby();
            host.send("configure", { ...validConfig, isPrivate: false });
            await room.waitForNextPatch();

            const guest = await colyseus.connectTo(room);
            await room.waitForNextPatch();
            assert.strictEqual(room.state.memberCount, 2);
        });

        it("carries the code into the game room it starts", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...validConfig, isPrivate: true });
            await room.waitForNextPatch();
            const code = room.state.joinCode;

            client.send("start");
            const ready = await client.waitForMessage("gameReady");

            assert.strictEqual(colyseus.getRoomById<PongRoom>(ready.roomId).state.joinCode, code);
        });
    });

    describe("the shared validator", () => {
        it("agrees with the room on what is valid", () => {
            assert.strictEqual(validateLobbyConfig({ ...validConfig, gameId: "pong" }).ok, true);
            assert.strictEqual(validateLobbyConfig({ ...validConfig, gameId: "pong", maxPlayers: 13 }).ok, false);
            assert.strictEqual(validateLobbyConfig({ ...validConfig, gameId: "pong", name: "" }).ok, false);
        });

        it("rejects non-objects", () => {
            const badValues: unknown[] = [null, undefined, "nope", 42, []];
            for (const bad of badValues) {
                assert.strictEqual(validateLobbyConfig(bad).ok, false);
            }
        });
    });
});
