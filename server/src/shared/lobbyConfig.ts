import { isGameId, GAME_REGISTRY, type GameId } from "./games.js";

/**
 * The physiological-input games target 2–12 simultaneous players, which is what
 * bounds every lobby size. Kept here (rather than in the room) so the client
 * form and the server's authority agree on the same numbers.
 */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const MAX_LOBBY_NAME_LENGTH = 40;

export interface LobbyConfig {
    name: string;
    maxPlayers: number;
    isPrivate: boolean;
    gameId: GameId;
}

export type LobbyConfigField = "name" | "maxPlayers" | "isPrivate" | "gameId";

export type LobbyConfigResult =
    | { ok: true; config: LobbyConfig }
    | { ok: false; field: LobbyConfigField; error: string };

/**
 * Defaults for a lobby that has not been configured yet. The host overwrites
 * these with a `configure` message; until then the lobby is listable under this
 * placeholder so joining by room id still works.
 */
export const DEFAULT_LOBBY_CONFIG: LobbyConfig = {
    name: "",
    maxPlayers: MIN_PLAYERS,
    isPrivate: false,
    gameId: "pong",
};

/**
 * The listable projection of a lobby. This is the half of the configuration that
 * room browsers and the discovery PBI read, so it must stay small and must never
 * carry anything secret — the join code lives in state, not here, because
 * metadata is published to every lobby subscriber.
 */
export interface LobbyMetadata {
    gameId: GameId;
    lobbyName: string;
    maxPlayers: number;
    isPrivate: boolean;
}

export function toLobbyMetadata(config: LobbyConfig): LobbyMetadata {
    return {
        gameId: config.gameId,
        lobbyName: config.name,
        maxPlayers: config.maxPlayers,
        isPrivate: config.isPrivate,
    };
}

const trim = (value: string) => value.trim();

/**
 * Validates a complete, untrusted lobby configuration.
 *
 * Pure function of its argument: no clocks, no randomness, no reads outside
 * `raw`. The browser form runs it to enable/disable its submit button; the
 * lobby room runs it as the authority and rejects the room outright on failure.
 * Because both sides run the same function they cannot disagree about what a
 * valid configuration is.
 *
 * `raw` is `unknown` on purpose — it arrives from the wire.
 */
export function validateLobbyConfig(raw: unknown): LobbyConfigResult {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return { ok: false, field: "name", error: "Lobby configuration must be an object." };
    }

    const input = raw as Record<string, unknown>;

    if (!isGameId(input.gameId)) {
        return { ok: false, field: "gameId", error: "Unknown game." };
    }

    if (typeof input.name !== "string") {
        return { ok: false, field: "name", error: "Lobby name must be text." };
    }
    const name = trim(input.name);
    if (name.length === 0) {
        return { ok: false, field: "name", error: "Lobby name cannot be empty." };
    }
    if (name.length > MAX_LOBBY_NAME_LENGTH) {
        return {
            ok: false,
            field: "name",
            error: `Lobby name cannot exceed ${MAX_LOBBY_NAME_LENGTH} characters.`,
        };
    }

    if (typeof input.maxPlayers !== "number" || !Number.isInteger(input.maxPlayers)) {
        return { ok: false, field: "maxPlayers", error: "Maximum players must be a whole number." };
    }

    const game = GAME_REGISTRY[input.gameId];

    if (input.maxPlayers < game.minPlayers || input.maxPlayers > game.maxPlayers) {
        return { ok: false, field: "maxPlayers", error: game.minPlayers === game.maxPlayers
                ? `${game.label} requires exactly ${game.minPlayers} players.`
                : `${game.label} supports ${game.minPlayers}-${game.maxPlayers} players.`,
        };
    }

    if (typeof input.isPrivate !== "boolean") {
        return { ok: false, field: "isPrivate", error: "Visibility must be public or private." };
    }

    return { ok: true, config: { name, maxPlayers: input.maxPlayers, isPrivate: input.isPrivate, gameId: input.gameId } };
}
