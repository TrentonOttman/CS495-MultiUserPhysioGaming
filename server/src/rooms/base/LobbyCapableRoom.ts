import { Room, ServerError, ErrorCode } from "colyseus";
import type { LobbyState } from "../schema/LobbyState.js";
import {
    toLobbyMetadata,
    validateLobbyConfig,
    type LobbyConfig,
    type LobbyMetadata,
} from "../../shared/lobbyConfig.js";

/**
 * Base class for a game room that a lobby can start.
 *
 * Opting a game in is two changes: its state composes `LobbyState` with
 * `.extend()`, and the room extends this class instead of `Room`. Everything the
 * lobby configures — capacity, visibility, the listable metadata, the host —
 * is applied here so no game has to repeat it.
 *
 * `onCreate` owns validation and the matchmaking projection; a game puts its own
 * setup in `onLobbyCreate`, which runs after the configuration is in place.
 */
export abstract class LobbyCapableRoom<S extends LobbyState, I = never> extends Room<{
    state: S;
    metadata: LobbyMetadata;
    input: I;
}> {
    /**
     * Colyseus persists `room.maxClients` into the room listing immediately
     * after `onCreate` returns, so assigning it here is what makes the capacity
     * the server enforces — the room auto-locks once it is reached.
     */
    maxClients = 2;
    minClients = 2;

    reconnectionTime = 5;

    /** Set from the validated options so `onLobbyCreate` can read them. */
    protected lobbyConfig!: LobbyConfig;

    async onCreate(options: any) {
        const result = validateLobbyConfig(options);
        // `result.ok === false` rather than `!result.ok`: this project's tsconfig
        // sets `strictNullChecks: false`, which disables narrowing of a
        // discriminated union by truthiness. An explicit comparison still works.
        if (result.ok === false) {
            // Throwing here aborts room creation: Colyseus disposes the
            // half-built room and rejects the matchmaking request, so an
            // invalid configuration never yields a playable room.
            throw new ServerError(ErrorCode.MATCHMAKE_UNHANDLED, result.error);
        }

        this.lobbyConfig = result.config;
        this.maxClients = result.config.maxPlayers;

        // Replicated state, so the game room opens showing the same lobby
        // identity the players configured. Metadata alone would not do: the SDK
        // room exposes no metadata, so clients could not read it.
        this.state.lobbyName = result.config.name;
        this.state.maxPlayers = result.config.maxPlayers;
        this.state.isPrivate = result.config.isPrivate;
        this.state.gameId = result.config.gameId;

        // The lobby passes who created the session, so the game room opens with
        // the host already identified. Direct creation (no lobby) leaves it
        // empty, which `isHost` reports as "no host" rather than "everyone".
        this.state.hostId = typeof options?.hostId === "string" ? options.hostId : "";
        this.state.joinCode = typeof options?.joinCode === "string" ? options.joinCode : "";

        // A single `setMatchmaking` call so capacity, visibility and the
        // listable metadata share one persist. Note that `metadata` is
        // REPLACED, not merged — `toLobbyMetadata` always returns the whole
        // object, so there is nothing to spread.
        await this.setMatchmaking({
            metadata: toLobbyMetadata(result.config),
            private: result.config.isPrivate,
            maxClients: result.config.maxPlayers,
        });

        await this.onLobbyCreate(result.config);
    }

    /**
     * Game-specific setup, run once the lobby configuration is applied.
     * Override to install a fixed timestep, spawn entities, and so on.
     */
    protected async onLobbyCreate(_config: LobbyConfig): Promise<void> { }

    /** The validated configuration this room was created with. */
    getLobbyConfig(): LobbyConfig {
        return this.lobbyConfig;
    }

    /** True when this client created the lobby it was started from. */
    isHost(sessionId: string): boolean {
        return this.state.hostId !== "" && this.state.hostId === sessionId;
    }

    onDrop(client: Client, code: number) {
        console.log(`Client ${client.sessionId} dropped (code: ${code})`);
    
        // Allow reconnection for x seconds
        this.allowReconnection(client, this.reconnectionTime);
    
        // Mark player as disconnected (but don't remove them)
        const player = this.state.players.get(client.sessionId);
        if (player) {
            player.connected = false;
        }

        this.broadcast("disconnect", "Player Disconnected");

    }

    onLeave(client: Client, code: number) {
        console.log(`Client ${client.sessionId} left permanently (code: ${code})`);
        // Now it's safe to remove the player
        this.state.players.delete(client.sessionId);

        this.broadcast("leave", "Player Left");

        if (this.clients.length < this.minClients)
        {
            this.disconnect();
        }
    }

    onReconnect(client: Client) {
        console.log(`Client ${client.sessionId} reconnected!`);
    
        // Restore player connection status
        const player = this.state.players.get(client.sessionId);
        if (player) {
            player.connected = true;
        }
    }
}
