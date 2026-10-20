import { ColyseusSDK, type Room } from "@colyseus/sdk";
import type { default as server } from "../app.config.js";
import type { LobbyState } from "../rooms/schema/LobbyState.js";
import type { LobbyRoom as SessionLobby } from "../rooms/LobbyRoom.js";
import { createLobbyScreen } from "./lobby.js";
import type { LobbyConfig } from "../shared/lobbyConfig.js";
import type { GameId } from "../shared/games.js";
import { startPong } from "./games/pong.js";
import { startPhysioPark } from "./games/physio-park.js";
import { connectSensor, disconnectSensor, getSensorSamples, subscribeSensor } from "./sensorConnection.js";
import Visualizer from "../sensor/visualizer.js";

const statusEl = document.getElementById("status")!;
const arenaEl = document.getElementById("arena")!;
const gameEl = document.getElementById("game")!;
const appEl = document.getElementById("app")!;
const scoreEl = document.getElementById("score")!;
const titleEl = document.getElementById("game-title")!;
const helpEl = document.getElementById("game-help")!;
const rejoinButton = document.getElementById("rejoin")!;
const sensorStatusEl = document.getElementById("sensor-status")!;
const sensorStatusIndicator = document.getElementById("sensor-status-indicator")!;
const sensorErrorEl = document.getElementById("sensor-error")!;
const sensorConnectButton = document.getElementById("sensor-connect") as HTMLButtonElement;
const sensorDisconnectButton = document.getElementById("sensor-disconnect") as HTMLButtonElement;
const sensorCanvas = document.getElementById("sensor-graph") as HTMLCanvasElement;
const sensorCurrentSample = document.getElementById("sensor-current-sample")!;
const sensorPanel = document.querySelector(".sensor-panel") as HTMLElement;
const sensorToggle = document.getElementById("sensor-toggle") as HTMLButtonElement;
const sensorDetails = document.getElementById("sensor-details")!;
sensorDetails.inert = true;
const sensorVisualizer = new Visualizer("sensor-graph", 1);

sensorConnectButton.addEventListener("click", () => void connectSensor());
sensorDisconnectButton.addEventListener("click", disconnectSensor);
sensorToggle.addEventListener("click", () => {
    const expanded = sensorToggle.getAttribute("aria-expanded") !== "true";
    sensorToggle.setAttribute("aria-expanded", String(expanded));
    sensorToggle.setAttribute("aria-label", expanded ? "Hide sensor details" : "Show sensor details");
    sensorDetails.setAttribute("aria-hidden", String(!expanded));
    sensorDetails.inert = !expanded;
    sensorPanel.classList.toggle("is-expanded", expanded);
});
subscribeSensor((sensorStatus, message) => {
    sensorStatusEl.textContent = sensorStatus;
    sensorStatusEl.setAttribute("data-status", sensorStatus);
    sensorStatusIndicator.setAttribute("data-status", sensorStatus);
    sensorErrorEl.textContent = message;
    sensorErrorEl.hidden = !message;
    sensorConnectButton.hidden = sensorStatus === "Connected" || sensorStatus === "Connecting";
    sensorConnectButton.textContent = sensorStatus === "Error" ? "Reconnect" : "Connect";
    sensorConnectButton.disabled = sensorStatus === "Connecting";
    sensorDisconnectButton.hidden = sensorStatus !== "Connected";
});

function drawSensorGraph() {
    const samples = getSensorSamples();
    const current = samples.length ? samples[samples.length - 1] : 0;
    sensorCurrentSample.textContent = current.toFixed(3);
    sensorVisualizer.updateTrackData(0, current);
    requestAnimationFrame(drawSensorGraph);
}
requestAnimationFrame(drawSensorGraph);

const REJOIN_KEY = "colyseus-rejoin";

type RejoinInfo = {
    token: string;
    gameId: GameId;
    roomId: string;
};

function getRejoinInfo(): RejoinInfo | null {
    const saved = sessionStorage.getItem(REJOIN_KEY);

    if (!saved) return null;

    try {
        return JSON.parse(saved) as RejoinInfo;
    } catch {
        sessionStorage.removeItem(REJOIN_KEY);
        return null;
    }
}

function showRejoinButton() {
    rejoinButton.hidden = getRejoinInfo() === null;
}

rejoinButton.addEventListener("click", async () => {
    const saved = sessionStorage.getItem(REJOIN_KEY);

    if (!saved) return;

    const info = JSON.parse(saved) as RejoinInfo;

    try {
        const room = await client.reconnect(info.token);

        // Reuse the existing game initialization with the
        // already-reconnected room.
        rejoinButton.hidden = true;
        await resumeGame(info.gameId, room);
    } catch (error) {
        console.error("Could not rejoin game:", error);

        sessionStorage.removeItem(REJOIN_KEY);
        rejoinButton.hidden = true;
        statusEl.textContent = "The game is no longer available.";
    }
});

async function resumeGame(
    gameId: GameId,
    room: Room
) {
    lobbyScreen.stop();
    lobbyScreen.element.remove();

    switch (gameId) {
        case "pong":
            await startPong(client, room, {
                game: gameEl,
                arena: arenaEl,
                score: scoreEl,
                status: statusEl,
            });
            break;

        case "physio_park":
            await startPhysioPark(client, room, {
                game: gameEl, arena: arenaEl, score: scoreEl, status: statusEl, title: titleEl, help: helpEl,
            });
            break;

        default:
            throw new Error(
                `No client implementation registered for game "${gameId}".`
            );
    }
}

showRejoinButton();

const client = new ColyseusSDK<typeof server>(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);
let activeLobbyRoom: Room<SessionLobby, LobbyState> | null = null;



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
    activeLobbyRoom = room;
    lobbyScreen.clearError();
    let transitioningToGame = false;

    // `start` is host-only server-side; the button is hidden for guests, and the
    // room refuses it regardless, so this is safe to leave wired for everyone.
    lobbyScreen.onStart = () => room.send("start");
    lobbyScreen.onKick = (sessionId) => room.send("kick", { sessionId });

    room.onMessage("error", (payload) => {
        lobbyScreen.clearError();
        lobbyScreen.showError(payload.error);
    });

    room.onMessage("kicked", ({ message }) => {
        transitioningToGame = true;
        activeLobbyRoom = null;
        lobbyScreen.exitLobby();
        lobbyScreen.showNotice(message);
        statusEl.textContent = "Removed from the lobby";
    });

    room.onMessage("gameReady", async ({ roomId }) => {
        transitioningToGame = true;
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
        if (gameEl.hidden && !transitioningToGame) {
            lobbyScreen.exitLobby();
            statusEl.textContent = "Left the lobby";
        }
    });

    // Any patch can carry config, roster, host or code changes, so the screen is
    // redrawn from state rather than only in response to the events that caused it.
    const renderState = () => {
        const state = room.state;
        lobbyScreen.renderLobby({
            lobbyName: state.lobbyName,
            maxPlayers: state.maxPlayers,
            isPrivate: state.isPrivate,
            gameId: state.gameId,
            joinCode: state.joinCode,
            memberCount: state.memberCount,
            // Collection fields can be absent from a client's decoded state
            // until their first server patch. Treat that initial gap as empty;
            // the roster patch will redraw the view once it arrives.
            playerIds: Array.from(state.playerIds ?? []),
            hostId: state.hostId,
            localPlayerId: room.sessionId,
            isHost: state.hostId === room.sessionId,
            status: state.status,
        });
    };
    room.onStateChange(renderState);
    // The initial state may already have arrived before attachToLobby runs.
    // Render it now as well as on future server patches so every join path
    // immediately lands in the waiting room.
    renderState();
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
            await startPhysioPark(client, roomId, {
                game: gameEl, arena: arenaEl, score: scoreEl, status: statusEl, title: titleEl, help: helpEl,
            });
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
    onLeaveLobby: () => {
        void activeLobbyRoom?.leave();
        activeLobbyRoom = null;
        lobbyScreen.exitLobby();
        statusEl.textContent = "Left the lobby";
    },
});

appEl.prepend(lobbyScreen.element);
gameEl.hidden = true;
statusEl.textContent = "Create a lobby to start.";
