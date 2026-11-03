import { DISPLAY_NAME_MAX_LENGTH } from "../displayName.js";

/** Shown when a player has no usable display name yet. */
export const FALLBACK_PLAYER_LABEL = "Player";

/** Anything with a `get(sessionId)` that returns `{ displayName }`, e.g. `state.lobbyPlayers`. */
export interface DisplayNameLookup {
    get(sessionId: string): { displayName?: string } | undefined;
}

/**
 * The text drawn above a player in Physio Park. Uses the name the player picked
 * in the lobby, trimmed and capped at the lobby's length limit, so a long or
 * blank name never breaks the tag.
 */
export function getPlayerLabel(names: DisplayNameLookup | undefined, sessionId: string): string {
    const name = names?.get(sessionId)?.displayName?.trim() ?? "";
    if (name.length === 0) return FALLBACK_PLAYER_LABEL;
    return name.slice(0, DISPLAY_NAME_MAX_LENGTH);
}
