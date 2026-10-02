import { generateJoinCode } from "./joinCodeGenerator.js";
import { normalizeJoinCode } from "../../shared/joinCode.js";

/**
 * The join-code index: `code -> roomId`.
 *
 * In-process and in-memory, which is correct for the current deployment
 * (`docs/investigations/scaling.md` records Cloud Run running `--max-instances 1`).
 * Scaling past one instance means moving this to a shared store — the lookup API
 * below is deliberately async-free so that swap stays local to this file.
 *
 * A private room is excluded from `join`/`joinOrCreate` matchmaking, so this
 * index is the ONLY way one can be reached. `LobbyRoom.authorizeJoin` checks the
 * code the client presents, and `LobbyRoom` is what keeps the entries alive.
 */
const index = new Map<string, string>();

/**
 * Generates a code that is not already taken. 30^6 codes makes a collision
 * vanishingly unlikely, but registering one twice would silently hand a stranger
 * someone else's room, so it is checked rather than assumed.
 */
export function generateUniqueJoinCode(): string {
    for (let attempt = 0; attempt < 16; attempt++) {
        const code = generateJoinCode();
        if (!index.has(code)) {
            index.set(code, "");
            return code;
        }
    }
    throw new Error("Could not allocate a unique join code.");
}

export function bindJoinCodeRoom(code: string, roomId: string): void {
    index.set(normalizeJoinCode(code), roomId);
}

export function releaseJoinCode(code: string): void {
    index.delete(normalizeJoinCode(code));
}

/**
 * The roomId a code refers to, or `null` if the code is unknown or stale.
 *
 * `raw` is `unknown` on purpose and is checked rather than assumed: it arrives
 * from an HTTP query parameter and from client join options, either of which can
 * be missing entirely. A guest joining with no code must get "not admitted",
 * not a TypeError out of the room.
 */
export function resolveJoinCode(raw: unknown): string | null {
    if (typeof raw !== "string") { return null; }

    const roomId = index.get(normalizeJoinCode(raw));
    // `generateUniqueJoinCode` reserves a code with an empty roomId before the
    // room exists; that reservation is not joinable.
    return roomId ? roomId : null;
}

/** True when `code` is the one this room minted. */
export function isRoomJoinCode(code: string, roomId: string): boolean {
    return resolveJoinCode(code) === roomId;
}

export function joinCodeIndexSize(): number {
    return index.size;
}
