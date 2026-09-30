import { GAME_IDS, GAME_REGISTRY, type GameId } from "../shared/games.js";
import { normalizeJoinCode } from "../shared/joinCode.js";
import {
    MAX_PLAYERS,
    MIN_PLAYERS,
    validateLobbyConfig,
    type LobbyConfig,
} from "../shared/lobbyConfig.js";

/**
 * The lobby screen: a create form, and — once a lobby exists — the waiting
 * room showing the configuration, the roster count, the join code and the
 * host's controls.
 *
 * It knows nothing about rooms or sockets. `createLobbyScreen` takes callbacks
 * and returns a controller, so the same screen works for any game: the only
 * game-specific thing here is the `gameId` dropdown, which is generated from
 * the shared registry.
 *
 * The form runs `validateLobbyConfig` — the same pure function the server runs
 * as its authority — so the UI and the server can never disagree about what a
 * valid configuration is. The server still decides; this only avoids asking
 * the player to submit something that will bounce.
 */

export interface LobbyScreenCallbacks {
    onCreate(config: LobbyConfig): void;
    /**
     * Join by join code. The code is resolved to a room id server-side — the
     * client cannot read a room's metadata through the SDK, and a private lobby
     * never appears in the room browser — so the screen hands over the raw code
     * and the caller owns the round trip.
     */
    onJoinWithCode(code: string): void;
}

export interface LobbyScreen {
    element: HTMLElement;
    /** The lobby's replicated fields, as seen by this client. */
    renderLobby(view: LobbyView): void;
    /**
     * Sends the host's "start" message. Assigned by the caller, because the
     * screen deliberately holds no room reference and the room only exists once
     * `onCreate` has resolved.
     */
    onStart: (() => void) | null;
    setBusy(busy: boolean): void;
    showError(message: string): void;
    clearError(): void;
}

export interface LobbyView {
    lobbyName: string;
    maxPlayers: number;
    isPrivate: boolean;
    gameId: string;
    joinCode: string;
    memberCount: number;
    isHost: boolean;
    status: string;
}

const options = GAME_IDS.map((id) => `<option value="${id}">${GAME_REGISTRY[id].label}</option>`).join("");
const playerOptions = Array.from(
    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
    (_, i) => `<option value="${i + MIN_PLAYERS}">${i + MIN_PLAYERS}</option>`,
).join("");

export function createLobbyScreen(callbacks: LobbyScreenCallbacks): LobbyScreen {
    const element = document.createElement("section");
    element.id = "lobby";
    element.innerHTML = `
        <h2>Create a lobby</h2>
        <form id="create-form">
            <label>Lobby name <input id="lobby-name" name="name" maxlength="40" placeholder="Friday Group" autocomplete="off" /></label>
            <label>Game <select id="lobby-game" name="gameId">${options}</select></label>
            <label>Max players
                <select id="lobby-max" name="maxPlayers">${playerOptions}</select>
            </label>
            <fieldset>
                <legend>Visibility</legend>
                <label><input type="radio" name="isPrivate" value="false" checked /> Public — listed in the room browser</label>
                <label><input type="radio" name="isPrivate" value="true" /> Private — join by code only</label>
            </fieldset>
            <button type="submit">Create lobby</button>
        </form>

        <div id="lobby-waiting" hidden>
            <h2 id="waiting-name">Lobby</h2>
            <p id="waiting-summary"></p>
            <p>Join code: <strong id="waiting-code"></strong></p>
            <p id="waiting-role"></p>
            <button id="lobby-start" hidden>Start game</button>
        </div>

        <form id="join-form">
            <h2>Join with a code</h2>
            <label>Join code
                <input name="joinCode" id="join-code" maxlength="6" placeholder="ABC123" autocomplete="off" autocapitalize="characters" spellcheck="false" />
            </label>
            <button type="submit">Join</button>
        </form>

        <p id="lobby-error" role="alert" hidden></p>
    `;

    const form = element.querySelector<HTMLFormElement>("#create-form")!;
    const waiting = element.querySelector<HTMLElement>("#lobby-waiting")!;
    const error = element.querySelector<HTMLElement>("#lobby-error")!;
    const startButton = element.querySelector<HTMLButtonElement>("#lobby-start")!;
    const joinForm = element.querySelector<HTMLFormElement>("#join-form")!;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError();

        const data = new FormData(form);
        const result = validateLobbyConfig({
            name: String(data.get("name") ?? ""),
            gameId: String(data.get("gameId") ?? ""),
            maxPlayers: Number(data.get("maxPlayers")),
            isPrivate: data.get("isPrivate") === "true",
        });

        if (result.ok === false) {
            showError(`${result.field}: ${result.error}`);
            return;
        }

        callbacks.onCreate(result.config);
    });

    joinForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError();

        // The `name` attribute is what FormData reads — an `id` alone yields
        // null for every field, which is how this form used to reject every
        // entry, typed or not.
        const code = normalizeJoinCode(String(new FormData(joinForm).get("joinCode") ?? ""));
        if (code === "") {
            showError("Enter a join code to join.");
            return;
        }

        callbacks.onJoinWithCode(code);
    });

    // Assigned after construction, once the caller has a room to send on.
    let onStart: (() => void) | null = null;
    startButton.addEventListener("click", () => onStart?.());

    function setBusy(busy: boolean) {
        for (const control of element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")) {
            control.disabled = busy;
        }
    }

    function showError(message: string) {
        error.textContent = message;
        error.hidden = false;
    }

    function clearError() {
        error.textContent = "";
        error.hidden = true;
    }

    function renderLobby(view: LobbyView) {
        form.hidden = true;
        joinForm.hidden = true;
        waiting.hidden = false;

        element.querySelector("#waiting-name")!.textContent = view.lobbyName || "Unnamed lobby";
        element.querySelector("#waiting-summary")!.textContent =
            `${view.memberCount} of ${view.maxPlayers} players · ${view.isPrivate ? "private" : "public"}`
            + ` · ${GAME_REGISTRY[view.gameId as GameId]?.label ?? view.gameId}`;
        element.querySelector("#waiting-code")!.textContent = view.joinCode;
        element.querySelector("#waiting-role")!.textContent = view.isHost
            ? "You are the host."
            : "Waiting for the host to start…";

        startButton.hidden = !view.isHost || view.status !== "configuring";
    }

    return {
        element,
        renderLobby,
        setBusy,
        showError,
        clearError,
        get onStart() { return onStart; },
        set onStart(handler: (() => void) | null) { onStart = handler; },
    };
}
