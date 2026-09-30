/**
 * Join code alphabet and shape. Pure and shared, so the client can normalise a
 * typed code before sending it. The random generator that *produces* codes is
 * server-only and lives in `src/rooms/joinCode.ts` — `src/shared/` stays free
 * of randomness so the determinism contract documented in AGENTS.md holds.
 */

/** No 0/O/1/I/L — these get read aloud across a classroom and retyped. */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export function normalizeJoinCode(value: string): string {
    return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isWellFormedJoinCode(value: unknown): value is string {
    if (typeof value !== "string") { return false; }
    const normalized = normalizeJoinCode(value);
    return normalized.length === JOIN_CODE_LENGTH
        && [...normalized].every((c) => JOIN_CODE_ALPHABET.includes(c));
}
