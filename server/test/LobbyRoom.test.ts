import assert from "assert";
import { matchMaker } from "colyseus";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { getTestServer } from "./harness.js";
import type { LobbyRoom } from "../src/rooms/LobbyRoom.js";
import type { PongRoom } from "../src/rooms/PongRoom.js";
import { MIN_PLAYERS, MAX_PLAYERS, validateLobbyConfig } from "../src/shared/lobbyConfig.js";
import { GAME_REGISTRY, getGameRoomName } from "../src/shared/games.js";
import { resolveJoinCode } from "../src/lobby/joinCodeIndex.js";
import type { PublicLobbySummary } from "../src/lobby/publicLobbyListing.js";

/**
 * Covers the lobby-configuration PBI: creating a lobby, naming it, choosing a
 * size and visibility, the room that gets created, host identity, and the
 * rejection of invalid configurations.
 *
 * Also covers public discovery — the listing the public lobby browser polls —
 * and the join-code paths. Host transfer is still not asserted; it belongs to a
 * later PBI.
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

    /**
     * Pong's rules, read from the registry rather than restated here.
     *
     * `MIN_PLAYERS`/`MAX_PLAYERS` in `shared/lobbyConfig.ts` are only the shared
     * envelope; `validateLobbyConfig` bounds a lobby by the *game's* own range,
     * which is narrower. These fixtures used to hardcode `maxPlayers: 6`, a size
     * Pong does not allow, so every `configure` built on it was rejected and a
     * dozen tests failed — or, worse, passed for the wrong reason. Any size that
     * depends on the game has to be read from the game.
     */
    const pongRule = GAME_REGISTRY.pong;

    const validConfig = {
        name: "Friday Group",
        maxPlayers: pongRule.minPlayers,
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
        it("accepts a size the game allows", async () => {
            // One size when the game fixes its player count, two when it accepts
            // a range — derived from the registry, so a second game needs no edit.
            for (const maxPlayers of new Set([pongRule.minPlayers, pongRule.maxPlayers])) {
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

        it("rejects a size the game does not allow", async () => {
            // `MAX_PLAYERS` is in this list on purpose: the shared envelope is not
            // automatically a size this game accepts.
            const rejected = [
                pongRule.minPlayers - 1,
                pongRule.maxPlayers + 1,
                MAX_PLAYERS,
                0,
                -3,
            ];

            for (const maxPlayers of new Set(rejected)) {
                const { room, client } = await createLobby();
                client.send("configure", { ...validConfig, maxPlayers });
                const payload = await client.waitForMessage("error");

                // The refusal cites the game's own rule, not the shared envelope.
                assert.match(payload.error, new RegExp(pongRule.label));
                assert.strictEqual(
                    room.state.maxPlayers,
                    MIN_PLAYERS,
                    "the rejected value is not applied",
                );
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
            const size = pongRule.maxPlayers;
            const { room, client } = await createLobby();
            client.send("configure", { ...validConfig, maxPlayers: size });
            await room.waitForNextPatch();
            await colyseus.connectTo(room);

            client.send("start");
            const ready = await client.waitForMessage("gameReady");

            const game = colyseus.getRoomById<PongRoom>(ready.roomId);
            assert.ok(game, "the game room exists");
            assert.strictEqual(game.maxClients, size, "the game room honours the lobby size");

            // Assert the replicated state, not just the listing: the SDK room
            // exposes no metadata, so state is the only way a client can see
            // the configuration it was started with.
            assert.strictEqual(game.state.maxPlayers, size);
            assert.strictEqual(game.state.lobbyName, validConfig.name);
            assert.strictEqual(game.state.isPrivate, false);
            assert.strictEqual(game.state.gameId, "pong");
            assert.strictEqual(game.state.hostId, room.state.hostId, "the host carries into the game");
            assert.strictEqual(game.state.joinCode, room.state.joinCode, "the join code carries into the game");

            // And the listing, which is what the room browser reads.
            assert.strictEqual(game.metadata.maxPlayers, size);
            assert.strictEqual(game.metadata.lobbyName, validConfig.name);
        });

        it("starts the room named by the registry", async () => {
            const { room, client } = await createLobby();
            client.send("configure", validConfig);
            await room.waitForNextPatch();
            await colyseus.connectTo(room);

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

        it("refuses to start before the game minimum is met", async () => {
            const { room, client } = await createLobby();
            client.send("configure", validConfig);
            await room.waitForNextPatch();

            client.send("start");
            const payload = await client.waitForMessage("error");

            assert.match(payload.error, new RegExp(`at least ${pongRule.minPlayers} players`, "i"));
            assert.strictEqual(room.state.status, "configuring", "the game did not start");
        });

        it("ignores a second start", async () => {
            const { room, client } = await createLobby();
            client.send("configure", validConfig);
            await room.waitForNextPatch();
            await colyseus.connectTo(room);

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
            await colyseus.connectTo(room, { joinCode: code });

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

    /**
     * The endpoint the public lobby browser polls.
     *
     * `maxPlayers` is 2 here because that is all `GAME_REGISTRY.pong` accepts.
     * The module-level `validConfig` asks for 6, which the registry rejects, so
     * a lobby configured from it is never configured at all — these tests need a
     * lobby that really is configured, so they do not borrow it.
     */
    describe("the public lobby listing", () => {
        const publicConfig = { name: "Open Session", maxPlayers: 2, isPrivate: false };

        /** Reads the listing the browser renders. */
        async function fetchLobbies(): Promise<PublicLobbySummary[]> {
            const response = await colyseus.http.get<{ lobbies: PublicLobbySummary[] }>("/api/lobby/public");
            // An empty listing is an ordinary answer, not a fault.
            assert.strictEqual(response.statusCode, 200);
            return response.data.lobbies;
        }

        /**
         * The listing is written as sockets close and `setMatchmaking` settles,
         * both of which can land after the message that caused them, so these
         * assertions wait for the state they are about rather than racing it.
         * The last listing is returned so a timeout still fails on a diff.
         */
        async function waitForLobbies(match: (lobbies: PublicLobbySummary[]) => boolean) {
            let lobbies = await fetchLobbies();

            for (let attempt = 0; attempt < 40 && !match(lobbies); attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                lobbies = await fetchLobbies();
            }

            return lobbies;
        }

        it("describes a public lobby from the room listing", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...publicConfig, name: "Physio Party" });

            const lobbies = await waitForLobbies((all) => all.some((l) => l.roomId === room.roomId));
            const found = lobbies.find((l) => l.roomId === room.roomId);

            assert.ok(found, "the lobby is offered to the browser");
            assert.strictEqual(found!.lobbyName, "Physio Party");
            assert.strictEqual(found!.gameId, "pong");
            assert.strictEqual(found!.clients, 1, "the host is counted by the server");
            assert.strictEqual(found!.maxClients, 2, "capacity comes from the listing, not the metadata");
        });

        it("omits a private lobby", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...publicConfig, name: "Hidden", isPrivate: true });
            await room.waitForNextPatch();

            // Visibility has to have reached the listing first, or this would
            // pass for the wrong reason — the lobby would still be unconfigured,
            // and an unnamed lobby is omitted too.
            assert.strictEqual(room.metadata.lobbyName, "Hidden");
            assert.strictEqual(room.metadata.isPrivate, true);

            // Named and marked private, and still not offered. Waiting is what
            // makes the assertion mean something: an immediate check would also
            // pass against a filter that had merely not been applied yet.
            const lobbies = await waitForLobbies((all) => all.some((l) => l.lobbyName === "Hidden"));

            assert.ok(
                !lobbies.some((l) => l.lobbyName === "Hidden"),
                "a private lobby is never fetched, so it cannot be hidden-but-present",
            );
        });

        it("omits a lobby that has not been configured yet", async () => {
            const { room } = await createLobby();

            const lobbies = await fetchLobbies();

            // A lobby is listable the moment it is created, before the host has
            // named it. Publishing that would show an empty, unjoinable row.
            assert.ok(
                !lobbies.some((l) => l.roomId === room.roomId),
                "an unnamed lobby is not offered",
            );
        });

        it("tracks occupancy as players join and leave", async () => {
            const { room, client } = await createLobby();
            client.send("configure", publicConfig);
            await waitForLobbies((all) => all.some((l) => l.roomId === room.roomId));

            const guest = await colyseus.connectTo(room);
            const full = await waitForLobbies(
                (all) => all.some((l) => l.roomId === room.roomId && l.clients === 2),
            );
            const occupied = full.find((l) => l.roomId === room.roomId)!;
            assert.strictEqual(occupied.clients, 2);
            assert.strictEqual(
                occupied.clients >= occupied.maxClients,
                true,
                "at capacity, which is what the browser renders as Full",
            );

            await guest.leave();
            const emptied = await waitForLobbies(
                (all) => all.some((l) => l.roomId === room.roomId && l.clients === 1),
            );

            assert.strictEqual(
                emptied.find((l) => l.roomId === room.roomId)!.clients,
                1,
                "a seat going free is reflected, so Full returns to Join",
            );
        });

        it("omits the game room a lobby starts", async () => {
            const { room, client } = await createLobby();
            client.send("configure", publicConfig);
            await waitForLobbies((all) => all.some((l) => l.roomId === room.roomId));
            await colyseus.connectTo(room);

            client.send("start");
            const ready = await client.waitForMessage("gameReady");

            const lobbies = await fetchLobbies();

            assert.ok(colyseus.getRoomById(ready.roomId), "the game room exists");
            assert.ok(
                !lobbies.some((l) => l.roomId === ready.roomId),
                "a match in progress is not a lobby to discover",
            );
        });

        it("omits lobbies that have closed", async () => {
            const { room, client } = await createLobby();
            client.send("configure", publicConfig);
            await waitForLobbies((all) => all.some((l) => l.roomId === room.roomId));

            await colyseus.cleanup();

            const lobbies = await fetchLobbies();
            assert.deepStrictEqual(lobbies, [], "a disposed lobby simply stops being listed");
        });

        it("never exposes a join code", async () => {
            const { room, client } = await createLobby();
            client.send("configure", { ...publicConfig, name: "Secret Session" });
            await waitForLobbies((all) => all.some((l) => l.roomId === room.roomId));

            const code = room.state.joinCode;
            assert.match(code, /^[A-Z2-9]{6}$/, "the lobby really does have a code to leak");

            const lobbies = await fetchLobbies();
            const found = lobbies.find((l) => l.roomId === room.roomId)!;

            // A code lives in state and never in metadata, so it is not in the
            // listing this is built from. Asserting the whole field set is what
            // keeps it that way as the projection grows.
            assert.deepStrictEqual(
                Object.keys(found).sort(),
                ["clients", "gameId", "lobbyName", "locked", "maxClients", "roomId"],
            );
            assert.ok(
                !JSON.stringify(lobbies).includes(code),
                "no join code appears anywhere in the public listing",
            );
        });
    });
});
