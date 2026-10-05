import { schema, t, type SchemaType } from "@colyseus/schema";
import { MIN_PLAYERS } from "../../shared/lobbyConfig.js";

export type LobbyStatus = "configuring" | "starting";

/**
 * The replicated half of a lobby's configuration.
 *
 * Games compose this with `.extend()` rather than redeclaring the fields, so a
 * room that started the game still shows the same lobby identity in play:
 *
 *   export const PongState = LobbyState.extend({ ... }, "PongState");
 *
 * The join code is deliberately kept out of `metadata` (which is published to
 * every room-browser subscriber) and lives here instead, alongside the roster.
 */
export const LobbyState = schema({
    lobbyName: t.string().default(""),
    maxPlayers: t.number().default(MIN_PLAYERS),
    isPrivate: t.boolean().default(false),
    gameId: t.string().default(""),
    hostId: t.string().default(""),
    joinCode: t.string().default(""),
    memberCount: t.number().default(0),
    status: t.string<LobbyStatus>().default("configuring"),
}, "LobbyState");

export type LobbyState = SchemaType<typeof LobbyState>;
