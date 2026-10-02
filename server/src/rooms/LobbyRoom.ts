import { Room, Client, CloseCode, matchMaker, ServerError, ErrorCode } from "colyseus";
import { LobbyState } from "./schema/LobbyState.js";
import {
    bindJoinCodeRoom,
    generateUniqueJoinCode,
    isRoomJoinCode,
    releaseJoinCode,
} from "../client/matchmaking/joinCodeIndex.js";
import { getGameRoomName } from "../shared/games.js";
import {
    DEFAULT_LOBBY_CONFIG,
    toLobbyMetadata,
    validateLobbyConfig,
    type LobbyConfig,
    type LobbyConfigField,
    type LobbyMetadata,
} from "../shared/lobbyConfig.js";

/** Payload the host sends to replace the lobby configuration. */
export interface ConfigurePayload {
    name?: string;
    maxPlayers?: number;
    isPrivate?: boolean;
}

/**
 * Server -> client messages. These are payload *types* keyed by message name,
 * which is what types `client.send(...)` and `this.broadcast(...)`.
 */
export interface LobbyClientMessages {
    error: { field: LobbyConfigField | ""; error: string };
    gameReady: { roomId: string; gameId: string };
}

export type LobbyClient = Client<{ messages: LobbyClientMessages }>;

/**
 * The per-session waiting room.
 *
 * A lobby is what players see in the room browser and what they sit in while
 * the host configures the session. It is deliberately NOT the room already
 * registered as `lobby` in `app.config.ts` — that is Colyseus's built-in
 * `LobbyRoom`, the global room *browser* fed by the `$lobby` presence channel.
 * This room is one per session, and it is registered as `session_lobby`.
 *
 * The game room it starts is created with the same configuration and is never
 * listed publicly: players discover the lobby, then transition to the game room
 * by id. That keeps the room browser showing lobbies rather than games already
 * in progress.
 */
export class LobbyRoom extends Room<{
    state: LobbyState;
    metadata: LobbyMetadata;
    client: LobbyClient;
}> {
    maxClients = DEFAULT_LOBBY_CONFIG.maxPlayers;

    state = new LobbyState();

    /** The roster, in arrival order. */
    private members: LobbyClient[] = [];

    private config: LobbyConfig = { ...DEFAULT_LOBBY_CONFIG };

    /** Set once the game room exists, so `start` cannot run twice. */
    private gameRoomId: string | null = null;

    messages = {
        /** Host-only. Replaces the configuration after validation. */
        configure: (client: LobbyClient, message: ConfigurePayload) =>
            this.enqueue(() => this.handleConfigure(client, message)),

        /** Host-only. Creates the game room and hands everyone its id. */
        start: (client: LobbyClient) => this.enqueue(() => this.handleStart(client)),
    };

    /**
     * Handlers are dispatched synchronously, so an `async` one yields
     * mid-flight and the next message overtakes it: a `start` sent immediately
     * after `configure` would be evaluated against a half-applied
     * configuration. Chaining each handler onto the previous one serialises
     * them in arrival order.
     *
     * The `catch` is only there so one rejected handler cannot poison the chain
     * and wedge every later message; Colyseus already reports the rejection.
     */
    private queue: Promise<void> = Promise.resolve();

    private enqueue(work: () => Promise<void>): Promise<void> {
        this.queue = this.queue.then(work).catch(() => { });
        return this.queue;
    }

    onCreate(options: any) {
        // The game is fixed at lobby-creation time, so a lobby only ever concerns
        // one game; the host configures everything else afterwards.
        const gameId = options?.gameId;
        if (getGameRoomName(gameId) === undefined) {
            throw new ServerError(ErrorCode.MATCHMAKE_UNHANDLED, `Unknown game "${String(gameId)}".`);
        }

        this.config = { ...DEFAULT_LOBBY_CONFIG, gameId: gameId as LobbyConfig["gameId"] };
        this.state.gameId = gameId as string;

        // A code is minted per lobby regardless of visibility, so flipping a
        // lobby to public and back does not invalidate links already shared.
        // It is reserved first and bound second, because a code that resolves to
        // no room must not be advertised.
        this.state.joinCode = generateUniqueJoinCode();
        bindJoinCodeRoom(this.state.joinCode, this.roomId);
    }

    onDispose() {
        releaseJoinCode(this.state.joinCode);
        this.members = [];
        this.gameRoomId = null;
        this.config = { ...DEFAULT_LOBBY_CONFIG };
    }

    /**
     * Seats players in the waiting room. The host is whoever joined first:
     * Colyseus reserves the creator's seat in the same matchmaking request that
     * ran `onCreate`, so the first client through the door created the lobby.
     *
     * Membership is bounded by the lobby's own `maxClients`, so the configured
     * capacity gates entry here as well as in the game room.
     */
    async onJoin(client: LobbyClient, options: any) {
        const allowed = await this.authorizeJoin(client, options);
        if (!allowed) {
            // Failing inside onJoin releases the seat reservation the SDK is
            // waiting on, so the client sees a rejected join rather than a
            // silent room it can never enter.
            throw new ServerError(ErrorCode.MATCHMAKE_UNHANDLED, "Not allowed to join this lobby.");
        }

        this.members.push(client);
        this.state.memberCount = this.members.length;

        if (this.state.hostId === "") {
            this.state.hostId = client.sessionId;
        }
    }

    onLeave(client: LobbyClient) {
        this.members = this.members.filter((c) => c.sessionId !== client.sessionId);
        this.state.memberCount = this.members.length;

        // Host transfer is deliberately not implemented: it is not in this PBI's
        // acceptance criteria and needs its own rules (does a mid-game lobby
        // promote? does a reconnected host reclaim the role?). Until then a
        // permanent host disconnect leaves the lobby without one. The onDrop
        // reconnection window covers the common case of a host whose tab slept.
        if (this.members.length === 0) {
            this.state.hostId = "";
        }
    }

    /**
     * Join gate. A private lobby is unreachable by `join`/`joinOrCreate`
     * (Colyseus filters `private: true` out of matchmaking) and only by id, so
     * the code presented here is what actually decides admission.
     *
     * Public lobbies stay open: they are meant to be found in the room browser
     * and joined by id without a secret.
     */
    protected async authorizeJoin(client: LobbyClient, options: any): Promise<boolean> {
        if (!this.state.isPrivate) { return true; }
        return isRoomJoinCode(options?.joinCode, this.roomId);
    }

    private isHost(client: LobbyClient): boolean {
        return this.state.hostId === client.sessionId;
    }

    private reject(client: LobbyClient, field: LobbyConfigField | "", error: string) {
        client.send("error", { field, error });
    }

    private async handleConfigure(client: LobbyClient, message: ConfigurePayload) {
        if (!this.isHost(client)) {
            return this.reject(client, "", "Only the lobby host can change the configuration.");
        }
        if (this.state.status !== "configuring") {
            return this.reject(client, "", "The game has already started.");
        }

        // Spread over the current config so a partial update is validated as a
        // whole — the server always sees a complete configuration.
        const result = validateLobbyConfig({ ...this.config, ...message });
        // `result.ok === false` rather than `!result.ok`: tsconfig sets
        // `strictNullChecks: false`, which disables truthiness narrowing of a
        // discriminated union.
        if (result.ok === false) {
            return this.reject(client, result.field, result.error);
        }

        const nameTaken = await this.publicNameTaken(result.config);
        if (nameTaken) {
            return this.reject(client, "name", "Another public lobby already uses that name.");
        }

        this.config = result.config;
        this.state.lobbyName = result.config.name;
        this.state.maxPlayers = result.config.maxPlayers;
        this.state.isPrivate = result.config.isPrivate;

        // Capacity is enforced by the room, not merely displayed: the room locks
        // itself once the configured number of players is present.
        this.maxClients = result.config.maxPlayers;

        // `metadata` is REPLACED by setMatchmaking, and `toLobbyMetadata` always
        // returns the whole object, so there is nothing to spread here.
        this.setMatchmaking({
            metadata: toLobbyMetadata(result.config),
            private: result.config.isPrivate,
            maxClients: result.config.maxPlayers,
        }).catch(() => this.reject(client, "", "Could not apply the lobby configuration."));
    }

    /**
     * Two public lobbies may not share a name, because the room browser lists
     * them side by side. Private lobbies are exempt: two groups should each be
     * free to call their session "Friday Group".
     */
    private async publicNameTaken(config: LobbyConfig): Promise<boolean> {
        if (config.isPrivate) { return false; }
        const rooms = await matchMaker.query({ name: "session_lobby", lobbyName: config.name });
        return rooms.some((room) => room.roomId !== this.roomId);
    }

    private async handleStart(client: LobbyClient) {
        if (!this.isHost(client)) {
            return this.reject(client, "", "Only the lobby host can start the game.");
        }
        if (this.state.status !== "configuring" || this.gameRoomId !== null) {
            return this.reject(client, "", "The game has already started.");
        }
        if (this.state.lobbyName === "") {
            return this.reject(client, "name", "Give the lobby a name before starting.");
        }

        // Re-validate before committing: `this.config` may predate a rejection,
        // and the game room inherits whatever is sent here.
        const result = validateLobbyConfig(this.config);
        if (result.ok === false) {
            return this.reject(client, result.field, result.error);
        }

        const roomName = getGameRoomName(result.config.gameId);
        if (roomName === undefined) {
            return this.reject(client, "gameId", "Unknown game.");
        }

        this.state.status = "starting";

        // Freeze membership before anyone moves across, so nobody can slip into
        // the lobby after the game room's capacity has been reserved for it.
        await this.lock();

        try {
            // `createRoom` rather than `matchMaker.create`: it reserves no seat
            // for a caller, it builds the room and returns its listing. That is
            // what lets every member transition by id together.
            const gameRoom = await matchMaker.createRoom(roomName, {
                ...result.config,
                hostId: this.state.hostId,
                joinCode: this.state.joinCode,
            });

            this.gameRoomId = gameRoom.roomId;
            this.broadcast("gameReady", {
                roomId: gameRoom.roomId,
                gameId: result.config.gameId,
            });
        } catch {
            this.state.status = "configuring";
            this.gameRoomId = null;
            await this.unlock();
            this.reject(client, "", "Could not start the game.");
        }
    }

    onDrop(client: LobbyClient, code: CloseCode) {
        // Matches the other rooms: a dropped player keeps their seat, so a
        // backgrounded tab does not lose its place in the session.
        this.allowReconnection(client, 30).catch(() => { });
    }
}
