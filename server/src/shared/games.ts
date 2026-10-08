/**
 * The games the lobby knows how to start. Adding a game means adding an entry
 * here and registering a room that extends `LobbyCapableRoom` — nothing in the
 * lobby itself changes.
 *
 * `roomName` must match the key the room is registered under in
 * `src/app.config.ts`; the lobby passes it to `matchMaker.createRoom()`.
 */
export const GAME_REGISTRY = {
    pong: { roomName: "pong_room", label: "Pong", minPlayers: 2, maxPlayers: 2 },
    physio_park: { roomName: "physio_park_room", label: "Physio Park", minPlayers: 2, maxPlayers: 8 },
} as const;

export type GameId = keyof typeof GAME_REGISTRY;

export const GAME_IDS = Object.keys(GAME_REGISTRY) as GameId[];

export function isGameId(value: unknown): value is GameId {
    return typeof value === "string" && Object.hasOwn(GAME_REGISTRY, value);
}

export function getGameRoomName(gameId: string): string | undefined {
    return isGameId(gameId) ? GAME_REGISTRY[gameId].roomName : undefined;
}

export function getGameLabel(gameId: string): string {
    return isGameId(gameId) ? GAME_REGISTRY[gameId].label : gameId;
}
