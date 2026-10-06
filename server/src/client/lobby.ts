import { GAME_IDS, GAME_REGISTRY, type GameId } from "../shared/games.js";
import { normalizeJoinCode } from "../shared/joinCode.js";
import {validateLobbyConfig, type LobbyConfig } from "../shared/lobbyConfig.js";
import { createLobbyBrowser } from "./lobbyBrowser.js";

/**
 * The lobby screen: a create form, a browser of the public lobbies that already
 * exist, a join-by-code form, and — once a lobby exists — the waiting room
 * showing the configuration, the roster count, the join code and the host's
 * controls.
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
 *
 * The public lobby browser lives in its own module and owns its own polling and
 * join state; this screen only decides where it sits and when it is hidden.
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
    /**
     * Join a lobby the player picked from the public browser.
     *
     * `roomId` is the one from Colyseus's own listing — there is no second
     * identifier for this — and the caller joins by it exactly as it would for
     * a code, landing in the same waiting room.
     *
     * Must reject if the join did not happen. The browser uses that to report
     * that a lobby went away or filled up and to re-read the listing, so
     * swallowing the failure here would leave it showing a stale row with no
     * explanation.
     */
    onJoinListed(roomId: string): Promise<void>;
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
    /** Releases the browser's polling, for when this screen leaves the page. */
    stop(): void;
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

export function createLobbyScreen(callbacks: LobbyScreenCallbacks): LobbyScreen {
    const element = document.createElement("section");
    element.id = "lobby";
    element.innerHTML = `
        <div class="lobby-header">
            <h2>Play</h2>
            <p>Create a new lobby, join a public one, or enter a code.</p>
        </div>

        <div id="lobby-menu">
            <form id="create-form" class="lobby-card">
                <div class="card-header">
                    <h3>Create Lobby</h3>
                    <p>Start a new game for your group.</p>
                </div>

                <div class="form-group">
                    <label for="lobby-name">Lobby name</label>
                    <input
                        id="lobby-name"
                        name="name"
                        maxlength="40"
                        placeholder="My Group"
                        autocomplete="off"
                    />
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="lobby-game">Game</label>
                        <select id="lobby-game" name="gameId">
                            ${options}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="lobby-max">Max players</label>
                        <select id="lobby-max" name="maxPlayers">
                        </select>
                    </div>
                </div>

                <fieldset class="visibility-options">
                    <legend>Visibility</legend>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="isPrivate"
                            value="false"
                            checked
                        />
                        <span>
                            <strong>Public</strong>
                            <small>Anyone can discover and join this lobby.</small>
                        </span>
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="isPrivate"
                            value="true"
                        />
                        <span>
                            <strong>Private</strong>
                            <small>Players need a join code.</small>
                        </span>
                    </label>
                </fieldset>

                <button type="submit" class="primary-button">
                    Create Lobby
                </button>
            </form>

            <div class="lobby-join-row">
                <p class="lobby-divider">or join directly</p>

                <form id="join-form" class="lobby-card join-card">
                    <div class="card-header">
                        <h3>Join Lobby</h3>
                        <p>Enter a code shared by the lobby host.</p>
                    </div>

                    <div class="form-group">
                        <label for="join-code">Join code</label>
                        <input
                            name="joinCode"
                            id="join-code"
                            maxlength="6"
                            placeholder="ABC123"
                            autocomplete="off"
                            autocapitalize="characters"
                            spellcheck="false"
                        />
                    </div>

                    <button type="submit" class="secondary-button">
                        Join Lobby
                    </button>
                </form>
            </div>
        </div>

        <div id="lobby-waiting" class="lobby-card waiting-room" hidden>
            <div class="waiting-header">
                <div>
                    <span class="eyebrow">LOBBY</span>
                    <h2 id="waiting-name">Lobby</h2>
                </div>

                <span class="status-badge">Waiting</span>
            </div>

            <p id="waiting-summary" class="waiting-summary"></p>

            <div class="join-code-container">
                <span>JOIN CODE</span>
                <strong id="waiting-code"></strong>
            </div>

            <p id="waiting-role"></p>

            <button id="lobby-start" class="primary-button" hidden>
                Start Game
            </button>
        </div>

        <p id="lobby-error" role="alert" hidden></p>
    `;

    const form = element.querySelector<HTMLFormElement>("#create-form")!;
    const waiting = element.querySelector<HTMLElement>("#lobby-waiting")!;
    const error = element.querySelector<HTMLElement>("#lobby-error")!;
    const startButton = element.querySelector<HTMLButtonElement>("#lobby-start")!;
    const joinForm = element.querySelector<HTMLFormElement>("#join-form")!;
    const joinRow = element.querySelector<HTMLElement>(".lobby-join-row")!;
    const gameSelect = element.querySelector<HTMLSelectElement>("#lobby-game")!;
    const maxPlayersSelect = element.querySelector<HTMLSelectElement>("#lobby-max")!;

    // Sits between the create form and the join-code row: the two ways a player
    // arrives without a code, side by side, with the code entry below them.
    const browser = createLobbyBrowser({
        onJoin: (roomId) => callbacks.onJoinListed(roomId),
    });
    joinRow.parentElement!.insertBefore(browser.element, joinRow);

    function updatePlayerOptions() {
        const gameId = gameSelect.value as GameId;
        const game = GAME_REGISTRY[gameId];

        maxPlayersSelect.innerHTML = "";

        for (let count = game.minPlayers; count <= game.maxPlayers; count++) {
            const option = document.createElement("option");
            option.value = String(count);
            option.textContent = String(count);
            maxPlayersSelect.appendChild(option);
        }
    }

    gameSelect.addEventListener("change", updatePlayerOptions);

    updatePlayerOptions();

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
            // The browser panel owns its own button states — joining, full,
            // disabled — so a blanket pass would stomp them, most visibly by
            // re-enabling a Join button that is mid-request.
            if (control.closest("#lobby-browser") !== null) { continue; }

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
        joinRow.hidden = true;
        browser.element.hidden = true;
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
        stop() { browser.stop(); },
        get onStart() { return onStart; },
        set onStart(handler: (() => void) | null) { onStart = handler; },
    };
}
