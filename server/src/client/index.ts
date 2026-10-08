import { ColyseusSDK, type Room } from "@colyseus/sdk";
import type { default as server } from "../app.config.js";
import type { LobbyState } from "../rooms/schema/LobbyState.js";
import type { LobbyRoom as SessionLobby } from "../rooms/LobbyRoom.js";
import { createLobbyScreen } from "./lobby.js";
import type { LobbyConfig } from "../shared/lobbyConfig.js";
import type { GameId } from "../shared/games.js";
import { startPong } from "./games/pong.js";
import { startPhysioPark } from "./games/physio-park.js";

const statusEl = document.getElementById("status")!;
const arenaEl = document.getElementById("arena")!;
const gameEl = document.getElementById("game")!;
const appEl = document.getElementById("app")!;
const scoreEl = document.getElementById("score")!;

const client = new ColyseusSDK<typeof server>(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);

/**
 * Creates the lobby and applies the configuration the host just submitted.
 *
 * The game room is never joined from here. The lobby creates it with the chosen
 * configuration and broadcasts its id, and everyone transitions by id.
 * `joinById` is used rather than `join` because `join` filters private rooms
 * out of matchmaking and a lobby may legitimately be private.
 */
async function enterLobby(config: LobbyConfig) {
    // Include configuration in the create request so the server can reject a
    // duplicate public name before it allocates a lobby room.
    const room = await client.create("session_lobby", config);

    await attachToLobby(room);
    statusEl.textContent = `Hosting as ${room.sessionId}`;
}

/**
 * Joins an existing lobby by its join code.
 *
 * The code is resolved to a room id over HTTP first: the client cannot read a
 * room's metadata through the SDK, and a private lobby is excluded from both the
 * room browser and `joinOrCreate`, so the code is the only handle a guest has.
 *
 * The code is then passed through as join options because the lobby re-checks it
 * server-side — resolving it client-side is convenience, not authority.
 */
async function joinLobbyByCode(code: string) {
    const response = await fetch(`/api/lobby/resolve/${encodeURIComponent(code)}`);
    if (!response.ok) {
        throw new Error(`Join code lookup failed (${response.status}).`);
    }

    const { roomId } = await response.json() as { roomId: string | null };
    if (!roomId) {
        throw new Error("That join code is not valid. Codes are 6 characters; the lobby may have ended.");
    }

    const room = await client.joinById<SessionLobby>(roomId, { joinCode: code });
    await attachToLobby(room);
    statusEl.textContent = `Joined as ${room.sessionId}`;
}

/**
 * Joins a public lobby the player picked from the lobby browser.
 *
 * The room id is the one Colyseus's own listing reported, so this is the same
 * handle a join code resolves to — no second identifier, and no lookup step.
 * `joinById` is used for the same reason as everywhere else: a lobby may
 * legitimately be private, and `join` filters those out of matchmaking.
 *
 * A public lobby admits any guest without a code, so unlike the by-code path
 * there is nothing to present. This lands in the same waiting room as either
 * other route because it goes through the same `attachToLobby`.
 *
 * The rejection is deliberately not translated here. Whether the room filled up
 * or closed is not something this error can say — Colyseus rejects an unknown
 * room, a locked room and a full one alike — so the browser re-reads the listing
 * to find out, and reports it next to the button the player pressed.
 */
async function joinLobbyById(roomId: string) {
    const room = await client.joinById<SessionLobby>(roomId);
    await attachToLobby(room);
    statusEl.textContent = `Joined as ${room.sessionId}`;
}

/**
 * Wires an already-joined lobby room to this client's UI. Shared by the host
 * and by guests joining by code or from the browser, so all three get the same
 * screen and — critically — the same `gameReady` transition when the host starts
 * the game.
 */
async function attachToLobby(room: Room<SessionLobby, LobbyState>) {
    lobbyScreen.clearError();

    // `start` is host-only server-side; the button is hidden for guests, and the
    // room refuses it regardless, so this is safe to leave wired for everyone.
    lobbyScreen.onStart = () => room.send("start");

    room.onMessage("error", (payload) => {
        lobbyScreen.clearError();
        lobbyScreen.showError(payload.error);
    });

    room.onMessage("gameReady", async ({ roomId }) => {
        try {
            const gameId = room.state.gameId as GameId;
            await room.leave();
            await enterGame(gameId, roomId);
        } catch (e) {
            console.error(e);
            statusEl.textContent = "Could not enter the game";
        }
    });

    room.onLeave(() => {
        // Leaving the lobby is what happens when the game starts, so this is
        // not a disconnection.
        if (gameEl.hidden) { statusEl.textContent = "Left the lobby"; }
    });

    // Any patch can carry config, roster, host or code changes, so the screen is
    // redrawn from state rather than only in response to the events that caused it.
    room.onStateChange(() => {
        const state = room.state;
        lobbyScreen.renderLobby({
            lobbyName: state.lobbyName,
            maxPlayers: state.maxPlayers,
            isPrivate: state.isPrivate,
            gameId: state.gameId,
            joinCode: state.joinCode,
            memberCount: state.memberCount,
            isHost: state.hostId === room.sessionId,
            status: state.status,
        });
    });
}

/**
 * Application-level game launcher.
 * index.ts decides WHICH game to start.
 * Each game module decides HOW that game works.
 */
async function enterGame(gameId: GameId, roomId: string) {
    // The section is about to be removed, so stop the browser polling rather
    // than leaving it re-reading the public lobby list under the game.
    lobbyScreen.stop();
    lobbyScreen.element.remove();

    switch (gameId) {
        case "pong":
            await startPong(client, roomId, { game: gameEl, arena: arenaEl, score: scoreEl, status: statusEl });
            break;

        case "physio_park":
            await startPhysioPark(client, roomId);
            break;

        default:
            throw new Error(`No client implementation registered for game "${gameId}".`);
    }
}

const lobbyScreen = createLobbyScreen({
    onCreate: async (config) => {
        lobbyScreen.setBusy(true);
        lobbyScreen.clearError();
        try {
            await enterLobby(config);
            lobbyScreen.setBusy(false);
        } catch (e) {
            console.error(e);
            lobbyScreen.setBusy(false);
            const message = e instanceof Error ? e.message : "";
            lobbyScreen.showError(message.includes("Another public lobby already uses that name.")
                ? "Another public lobby already uses that name."
                : "Could not create the lobby.");
        }
    },
    onJoinWithCode: async (code) => {
        lobbyScreen.setBusy(true);
        lobbyScreen.clearError();
        try {
            await joinLobbyByCode(code);
            lobbyScreen.setBusy(false);
        } catch (e) {
            console.error(e);
            lobbyScreen.setBusy(false);
            lobbyScreen.showError(e instanceof Error && e.message.startsWith("That join code")
                ? e.message
                : "Could not join that lobby.");
        }
    },
    onJoinListed: (roomId) => joinLobbyById(roomId),
});

appEl.prepend(lobbyScreen.element);
gameEl.hidden = true;
statusEl.textContent = "Create a lobby to start.";
