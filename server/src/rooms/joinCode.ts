import { randomInt } from "node:crypto";
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from "../shared/joinCode.js";

/**
 * Server-side join code generation.
 *
 * The alphabet, length and normaliser are pure and live in
 * `src/shared/joinCode.ts` so the browser can use them too. The generator does
 * not: `src/shared/` is reserved for code that runs identically on the server
 * and in the client reconciler, which means no randomness. Only this file knows
 * how to produce a code, and it never runs on the client.
 *
 * Resolving a code to a room (code -> roomId -> `joinById`) belongs to the
 * join-by-code PBI. This PBI generates, stores and displays codes; the
 * authorisation seam it will hook into is `LobbyRoom.authorizeJoin`.
 */

/** Number of distinct codes: 30^6, far beyond any plausible class size. */
export const JOIN_CODE_SPACE = JOIN_CODE_ALPHABET.length ** JOIN_CODE_LENGTH;

export function generateJoinCode(): string {
    let code = "";
    for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
        code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
    }
    return code;
}
