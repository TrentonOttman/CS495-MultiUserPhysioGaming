import { matchMaker } from "colyseus";
import type { LobbyMetadata } from "../shared/lobbyConfig.js";

/**
 * The browser's view of one public lobby.
 *
 * Every field here is copied out of Colyseus's own room listing — `roomId`,
 * `clients`, `maxClients`, `locked` from the listing itself and the display name
 * and game from the metadata the lobby published with `setMatchmaking`. Nothing
 * is read from `LobbyState`, because a browser is not in the lobby and cannot
 * see its state.
 *
 * There is deliberately no `joinCode` field. A code lives in state, never in
 * metadata, so it is physically absent from the listing this is built from —
 * adding one here would be the only way a private lobby's code could ever leak
 * into a public endpoint.
 */
export interface PublicLobbySummary {
    roomId: string;
    lobbyName: string;
    gameId: string;
    /** Current occupancy, as Colyseus counts it — not a copy kept by the client. */
    clients: number;
    /** The capacity the server actually enforces, which may differ from `clients + 1`. */
    maxClients: number;
    locked: boolean;
}

/**
 * The listing fields this projection reads, kept structural so the mapper can
 * be exercised with a plain object as well as with a driver's row.
 */
export interface RoomListing {
    roomId: string;
    clients?: number;
    maxClients?: number;
    locked?: boolean;
    metadata?: unknown;
}

/** The room players wait in. Its name is the registered handler in `app.config.ts`. */
const SESSION_LOBBY_ROOM = "session_lobby";

/**
 * Every public lobby currently on the server, as the browser needs to see it.
 *
 * Colyseus's listing is the only authority here: this queries it rather than
 * keeping any registry of its own, so a lobby that closed simply stops being
 * returned and a lobby that filled up reports the count the room itself holds.
 *
 * `private: false` and `unlisted: false` are the same filter Colyseus's built-in
 * `lobby` browser applies, so what a player discovers here matches what the
 * server considers publicly joinable. Private lobbies are removed by the query
 * itself, not by filtering the results afterwards.
 */
export async function listPublicLobbies(): Promise<PublicLobbySummary[]> {
    const rooms = await matchMaker.query({
        name: SESSION_LOBBY_ROOM,
        private: false,
        unlisted: false,
    });

    const summaries: PublicLobbySummary[] = [];

    for (const room of rooms as RoomListing[]) {
        const summary = summarize(room);
        if (summary) { summaries.push(summary); }
    }

    return summaries;
}

/**
 * Projects one listing row, or returns `undefined` for a lobby that is not yet
 * presentable.
 *
 * A lobby becomes listable the moment `onCreate` returns, which is *before* the
 * host has sent `configure`: until then the row has no metadata at all and the
 * lobby has no name. Publishing it would show an empty row that nothing can
 * sensibly join, so a lobby is listed only once it has a name and a capacity.
 */
export function summarize(room: RoomListing): PublicLobbySummary | undefined {
    const metadata = room.metadata as Partial<LobbyMetadata> | undefined;

    const lobbyName = typeof metadata?.lobbyName === "string" ? metadata.lobbyName.trim() : "";
    if (lobbyName === "") { return undefined; }

    const maxClients = room.maxClients;
    // `Room.maxClients` defaults to `Infinity`, which serialises to `null` over
    // JSON. A lobby's capacity is always a validated integer, so anything else
    // is a row this projection does not understand.
    if (typeof maxClients !== "number" || !Number.isFinite(maxClients) || maxClients <= 0) {
        return undefined;
    }

    return {
        roomId: room.roomId,
        lobbyName,
        gameId: typeof metadata?.gameId === "string" ? metadata.gameId : "",
        clients: typeof room.clients === "number" ? room.clients : 0,
        maxClients,
        locked: room.locked === true,
    };
}
