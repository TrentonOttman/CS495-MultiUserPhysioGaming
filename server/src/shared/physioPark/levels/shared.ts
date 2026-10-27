import type { PlayerPoint } from "./types.js";
import type { PhysioParkRect } from "./types.js";

export const LEVEL_WIDTH = 320;
export const LEVEL_HEIGHT = 180;
export const GROUND_TOP = 156;

/** Returns true only when at least one player is present and every player is inside. */
export function allPlayersInsideGoalArea(players: readonly PlayerPoint[], goalArea: PhysioParkRect): boolean {
    return players.length > 0 && players.every((player) =>
        player.x >= goalArea.x
        && player.x < goalArea.x + goalArea.width
        && player.y >= goalArea.y
        && player.y < goalArea.y + goalArea.height,
    );
}
