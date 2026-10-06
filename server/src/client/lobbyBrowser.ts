import { getGameLabel } from "../shared/games.js";

/**
 * The public lobby browser: a live list of the public lobbies on the server,
 * with a Join button on each.
 *
 * It holds no registry of its own. Every row is a snapshot of one row of
 * Colyseus's own room listing, re-read from the server on a timer, so a lobby
 * that closed simply stops appearing and nothing has to be un-registered
 * anywhere. `roomId`, `clients` and `maxClients` are the server's values, not a
 * client-side tally that could drift from it.
 *
 * Visibility is decided at the source: the endpoint this reads filters on
 * `private: false`, so a private lobby is never fetched and there is nothing
 * here that could be hidden-but-present. Public/private stays a
 * discoverability setting — a public lobby is still reachable by its join code,
 * and a private one still is too, just not from here.
 *
 * Public and private are the *only* two modes: joining is a plain `joinById`
 * and the room arbitrates admission. The displayed count is never trusted for
 * that; see `join`.
 */

export const PUBLIC_LOBBY_REFRESH_MS = 5000;

const PUBLIC_LOBBY_URL = "/api/lobby/public";

export const LOADING_MESSAGE = "Loading public lobbies…";
export const EMPTY_MESSAGE = "No public lobbies are currently available.";
export const FAILED_MESSAGE = "Unable to load public lobbies.";
export const GONE_MESSAGE = "This lobby is no longer available.";
export const FULL_MESSAGE = "This lobby is now full.";

/** One lobby as the listing reports it. */
export interface PublicLobby {
    roomId: string;
    lobbyName: string;
    gameId: string;
    clients: number;
    maxClients: number;
    locked: boolean;
}

export interface LobbyBrowserCallbacks {
    /**
     * Hands the room id from the listing to the caller, which owns the SDK and
     * the socket. Rejecting is how a caller reports that the join did not
     * happen — the browser turns that into a message and re-reads the listing,
     * rather than guessing why from the error.
     */
    onJoin(roomId: string): void | Promise<void>;
}

export interface LobbyBrowser {
    element: HTMLElement;
    /** Stops polling. Call when the browser is no longer on screen. */
    stop(): void;
}

/** Capacity is the server's `maxClients` compared against its own `clients`. */
function isFull(lobby: PublicLobby): boolean {
    return lobby.clients >= lobby.maxClients;
}

/**
 * Guards against a malformed or hostile payload: only well-formed rows are
 * rendered, so a bad entry cannot produce a broken row or an undefined id in a
 * join request.
 */
function isPublicLobby(value: unknown): value is PublicLobby {
    if (typeof value !== "object" || value === null) { return false; }

    const lobby = value as Partial<PublicLobby>;
    return typeof lobby.roomId === "string"
        && lobby.roomId !== ""
        && typeof lobby.lobbyName === "string"
        && typeof lobby.gameId === "string"
        && typeof lobby.clients === "number"
        && Number.isFinite(lobby.clients)
        && typeof lobby.maxClients === "number"
        && Number.isFinite(lobby.maxClients)
        && typeof lobby.locked === "boolean";
}

async function loadPublicLobbies(): Promise<PublicLobby[]> {
    const response = await fetch(PUBLIC_LOBBY_URL, { headers: { accept: "application/json" } });
    if (!response.ok) {
        throw new Error(`Public lobby lookup failed (${response.status}).`);
    }

    const payload = await response.json() as { lobbies?: unknown };
    if (!Array.isArray(payload?.lobbies)) {
        throw new Error("Public lobby lookup returned an unexpected payload.");
    }

    return payload.lobbies.filter(isPublicLobby);
}

export function createLobbyBrowser(callbacks: LobbyBrowserCallbacks): LobbyBrowser {
    const element = document.createElement("section");
    element.id = "lobby-browser";
    element.className = "lobby-card browser-card";
    element.innerHTML = `
        <div class="card-header browser-header">
            <div>
                <h3>Public Lobbies</h3>
                <p>Join an open session without a code.</p>
            </div>

            <!-- An SVG rather than a glyph: ↻ is missing from plenty of system
                 fonts, and this button has to read as a refresh control
                 everywhere. -->
            <button type="button" id="browser-refresh" class="icon-button" title="Refresh" aria-label="Refresh public lobbies">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <path d="M20 11a8 8 0 1 0-2.3 5.7"></path>
                    <polyline points="20 4 20 11 13 11"></polyline>
                </svg>
            </button>
        </div>

        <ul id="browser-list" class="browser-list"></ul>

        <p id="browser-note" class="browser-note" role="status" hidden></p>
    `;

    const refreshButton = element.querySelector<HTMLButtonElement>("#browser-refresh")!;
    const list = element.querySelector<HTMLUListElement>("#browser-list")!;
    const note = element.querySelector<HTMLParagraphElement>("#browser-note")!;

    /** The most recent listing, kept only to interpret a failed join. */
    let latest: PublicLobby[] = [];

    /** False until the first attempt settles, so only that one shows a loading state. */
    let loaded = false;
    let failed = false;

    /** A message about what just happened, which outranks the passive states. */
    let notice: string | null = null;

    /** Room ids with a join in flight, so a row cannot be asked to join twice. */
    const joining = new Set<string>();

    /** The request currently in flight, so two refreshes never overlap. */
    let inFlight: Promise<void> | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    /** Last painted signature, so an unchanged list is left alone. */
    let painted = "";

    function el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        className: string,
        text?: string,
    ): HTMLElementTagNameMap[K] {
        const node = document.createElement(tag);
        node.className = className;
        // Lobby names are player-supplied, so they are set as text and never
        // interpolated into markup.
        if (text !== undefined) { node.textContent = text; }
        return node;
    }

    /**
     * Rebuilds the whole panel from current state.
     *
     * The message the panel shows is a priority chain: something the player just
     * did outranks the passive states, which outrank showing anything at all.
     */
    function render() {
        if (notice !== null) {
            showNote(notice);
        } else if (!loaded) {
            showNote(LOADING_MESSAGE);
        } else if (failed) {
            showNote(FAILED_MESSAGE);
        } else if (latest.length === 0) {
            showNote(EMPTY_MESSAGE);
        } else {
            note.hidden = true;
            note.textContent = "";
        }

        // Rows are dropped on a failed load rather than left stale: an occupancy
        // count that may be minutes old is worse than no count, and the next
        // poll restores them.
        if (!loaded || failed || latest.length === 0) {
            painted = "";
            list.replaceChildren();
            return;
        }

        const signature = latest
            .map((lobby) => `${lobby.roomId}/${lobby.lobbyName}/${lobby.gameId}/${lobby.clients}/${lobby.maxClients}/${joining.has(lobby.roomId)}`)
            .join("|");

        // Repainting an unchanged list would drop keyboard focus onto <body>
        // every five seconds, so it is skipped.
        if (signature === painted) { return; }

        painted = signature;
        list.replaceChildren(...latest.map(rowFor));
    }

    function showNote(message: string) {
        note.textContent = message;
        note.hidden = false;
    }

    function rowFor(lobby: PublicLobby): HTMLLIElement {
        const row = el("li", "browser-row");

        row.append(el("span", "browser-name", lobby.lobbyName));

        const detail = el("span", "browser-detail");
        detail.append(el("span", "browser-game", getGameLabel(lobby.gameId)));
        detail.append(el("span", "browser-count", `${lobby.clients} / ${lobby.maxClients}`));
        row.append(detail);

        const action = el("span", "browser-action");
        const button = el("button", "secondary-button browser-join");
        button.type = "button";

        if (joining.has(lobby.roomId)) {
            button.textContent = "Joining…";
            button.disabled = true;
        } else if (isFull(lobby)) {
            // Not a button in any meaningful sense: no listener, and disabled so
            // it cannot be activated by pointer or keyboard.
            button.textContent = "Full";
            button.disabled = true;
            button.title = "This lobby is full.";
        } else {
            button.textContent = "Join";
            button.addEventListener("click", () => { void join(lobby); });
        }

        action.append(button);
        row.append(action);
        return row;
    }

    /**
     * Re-reads the listing. The row the player clicked is a snapshot, so this is
     * also how capacity is re-checked before any request is sent.
     */
    function refresh(): Promise<void> {
        // Coalesced: a poll tick and a click on the refresh button join the
        // request already in flight rather than starting a second one.
        inFlight ??= runRefresh().finally(() => { inFlight = null; });
        return inFlight;
    }

    async function runRefresh(): Promise<void> {
        notice = null;

        try {
            latest = await loadPublicLobbies();
            failed = false;
        } catch (e) {
            console.error(e);
            failed = true;
        }

        loaded = true;
        render();
    }

    /**
     * Joins a listed lobby by its room id.
     *
     * A full row is rejected here as well as in the DOM, so the rendered button
     * is never the only thing preventing a join attempt.
     */
    async function join(lobby: PublicLobby) {
        if (isFull(lobby) || joining.has(lobby.roomId)) { return; }

        joining.add(lobby.roomId);
        render();

        try {
            await callbacks.onJoin(lobby.roomId);
        } catch (e) {
            console.error(e);

            // The room may have filled or closed since the row was drawn, and the
            // failure does not say which: Colyseus rejects an unknown room, a
            // locked room and a full one alike. Re-reading the listing separates
            // them, and leaves the server as the authority on capacity. If that
            // read also failed there is nothing to identify, so the generic
            // message is used rather than a guess.
            await refresh();

            const current = failed ? undefined : latest.find((other) => other.roomId === lobby.roomId);
            notice = current !== undefined && isFull(current) ? FULL_MESSAGE : GONE_MESSAGE;
        } finally {
            joining.delete(lobby.roomId);
            render();
        }
    }

    refreshButton.addEventListener("click", () => { void refresh(); });

    // Painted before the first request is sent so the panel opens in its
    // loading state rather than as an empty card. `render` is synchronous, so
    // this happens before the browser gets a chance to paint it.
    render();
    void refresh();
    timer = setInterval(() => { void refresh(); }, PUBLIC_LOBBY_REFRESH_MS);

    return {
        element,

        stop() {
            if (timer !== undefined) {
                clearInterval(timer);
                timer = undefined;
            }
        },
    };
}
