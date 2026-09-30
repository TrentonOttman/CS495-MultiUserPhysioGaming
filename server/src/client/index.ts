import { ColyseusSDK, Callbacks, type Room } from "@colyseus/sdk";
import { Predict } from "@colyseus/sdk/predict";
import type { default as server } from "../app.config.js";
import type { MoveInput } from "../rooms/schema/PongState.js";
import type { LobbyState } from "../rooms/schema/LobbyState.js";
import type { LobbyRoom as SessionLobby } from "../rooms/LobbyRoom.js";
import type { PongRoom } from "../rooms/PongRoom.js";
import { stepEntity } from "../shared/movement.js";
import { createLobbyScreen } from "./lobby.js";
import type { LobbyConfig } from "../shared/lobbyConfig.js";

const statusEl = document.getElementById("status")!;
const arenaEl = document.getElementById("arena")!;
const gameEl = document.getElementById("game")!;

const score = document.getElementById("score");

const client = new ColyseusSDK<typeof server>(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);

const held = new Set<string>();
addEventListener("keydown", (e) => held.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

/** Opposite keys cancel out, so the axis is always exactly -1, 0 or 1. */
function axis(negative: string[], positive: string[]): -1 | 0 | 1 {
    const back = negative.some((k) => held.has(k));
    const forward = positive.some((k) => held.has(k));
    if (back === forward) { return 0; }
    return back ? -1 : 1;
}

/**
 * Creates the lobby and applies the configuration the host just submitted.
 *
 * The game room is never joined from here. The lobby creates it with the chosen
 * configuration and broadcasts its id, and everyone transitions by id.
 * `joinById` is used rather than `join` because `join` filters private rooms
 * out of matchmaking and a lobby may legitimately be private.
 */
async function enterLobby(config: LobbyConfig) {
    const room = await client.create("session_lobby", { gameId: config.gameId });

    // The creator is the host by construction: Colyseus reserves the creating
    // client's seat in the same request that ran the room's onCreate, so this
    // client is the first to arrive and the server has already marked it host.
    room.send("configure", {
        name: config.name,
        maxPlayers: config.maxPlayers,
        isPrivate: config.isPrivate,
    });

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
 * Wires an already-joined lobby room to this client's UI. Shared by the host
 * and by guests joining by code, so both get the same screen and — critically —
 * the same `gameReady` transition when the host starts the game.
 */
async function attachToLobby(room: Room<SessionLobby, LobbyState>) {
    // `start` is host-only server-side; the button is hidden for guests, and the
    // room refuses it regardless, so this is safe to leave wired for everyone.
    lobbyScreen.onStart = () => room.send("start");

    room.onMessage("error", (payload) => {
        lobbyScreen.clearError();
        lobbyScreen.showError(payload.error);
    });

    room.onMessage("gameReady", async ({ roomId }) => {
        try {
            await room.leave();
            await enterGame(roomId);
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
 * Joins a game room by id and starts the render loop. Reached either from a
 * lobby that started, or from a room id the host shared.
 */
async function enterGame(roomId: string) {
    // Typed explicitly because `roomId` is a runtime string: without the room
    // type argument the SDK falls back to `Room<any>`, which would erase the
    // state and input types the rest of this function depends on.
    const room = await client.joinById<PongRoom>(roomId);
    const predict = Predict.get(room);

    // Other players' inputs aren't ours to predict: interpolate them toward the
    // latest snapshot instead. `smoothMs` springs the interpolated output — ~65 ms
    // of extra display lag buys velocity that stays continuous even when the
    // snapshot stream is rough. Use 0 where draw == hit precision matters most.
    predict.attachAll("players", { mode: "lerp", fields: ["x", "y"], smoothMs: 65 });

    const input = room.input<MoveInput>({ mode: "reliable" });

    // The first patch is what creates our own Player.
    await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
    const self = room.state.players.get(room.sessionId);

    predict.reconciler(self, {
        input,
        fields: ["x", "y", "vx", "vy"],
        // The same function the server runs — determinism is the whole contract.
        step: (ctx, predicted, command) => stepEntity(predicted, command, ctx.dt),
    });

    lobbyScreen.element.remove();
    gameEl.hidden = false;
    statusEl.textContent = `Connected as ${room.sessionId}`;

    const nodes = new Map<string, HTMLElement>();
    const callbacks = Callbacks.get(room);

    const ballDiv = document.createElement("div");
    ballDiv.className = "ball";
    arenaEl.appendChild(ballDiv);

    callbacks.onAdd("players", (_player, sessionId) => {
        const node = document.createElement("div");
        node.className = sessionId === room.sessionId ? "player self" : "player";
        arenaEl.appendChild(node);
        nodes.set(sessionId, node);
    });

    callbacks.onRemove("players", (_player, sessionId) => {
        nodes.get(sessionId)?.remove();
        nodes.delete(sessionId);
    });

    room.onLeave(() => {
        statusEl.textContent = "Disconnected";
        nodes.forEach((node) => node.remove());
        nodes.clear();
    });

    function frame(now: number) {
        // Drives prediction, interpolation and the reconciler, and returns how many
        // fixed steps came due — so input rate follows the simulation rate, not the
        // monitor's refresh rate.
        const steps = predict.tick(now);

        for (let i = 0; i < steps; i++) {
            // input.data.moveX = axis(["a", "arrowleft"], ["d", "arrowright"]);
            input.data.moveY = axis(["w", "arrowup"], ["s", "arrowdown"]);
            input.send();
        }

        for (const [sessionId, player] of room.state.players) {
            const node = nodes.get(sessionId);
            if (!node) { continue; }
            // Predicted for us, interpolated for everyone else — one read either way.
            // node.style.transform = `translate(${predict.value(player, "x")}px, ${predict.value(player, "y")}px)`;
            node.style.transform = `translate(${player.position.x}px, ${player.position.y}px) translate(-50%, -50%)`;
        }

        const ballState = room.state.ball;
        ballDiv.style.transform = `translate(${ballState.position.x}px, ${ballState.position.y}px) translate(-50%, -50%)`;

        score.textContent = `${room.state.leftScore} | ${room.state.rightScore}`;

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
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
            lobbyScreen.showError("Could not create the lobby.");
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
});

document.body.prepend(lobbyScreen.element);
gameEl.hidden = true;
statusEl.textContent = "Create a lobby to start.";
