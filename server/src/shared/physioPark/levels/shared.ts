import type { PlayerPoint } from "./types.js";
import type { Solid } from "../physioParkMovement.js";

// Level 1's starting platform is the shared ground reference used by tests and
// spawn placement (the authored surface begins at y=144).
export const GROUND_TOP = 144;

/** Returns true only when at least one player is present and every player is inside. */
export function allPlayersInsideGoalArea(players: readonly PlayerPoint[], goalArea: Solid): boolean {
    return players.length > 0 && players.every((player) =>
        player.x >= goalArea.x
        && player.x < goalArea.x + goalArea.width
        && player.y >= goalArea.y
        && player.y < goalArea.y + goalArea.height,
    );
}
