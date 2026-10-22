import { LEVEL_2 } from "./levels/level2.js";
import { LEVEL_1 } from "./levels/level1.js";
import { allPlayersInsideGoalArea, GROUND_TOP } from "./levels/shared.js";
import type { ResolvedPhysioParkLevel } from "./levels/types.js";

export { LEVEL_HEIGHT, LEVEL_WIDTH, GOAL, GOAL_AREA_RECT, LAVA, SOLIDS } from "./physioParkCollision.js";
export type {
    ButtonDefinition,
    ButtonCollision,
    ConveyorCollision as ConveyorDefinition,
    PhysioParkRect as Rect,
    ResolvedPhysioParkLevel,
} from "./levels/types.js";
export type { LevelObjectiveState, PlayerPoint } from "./levels/types.js";
export { allPlayersInsideGoalArea };

/** The y-coordinate of a player's feet when standing on the ground. */
export const GROUND_Y = GROUND_TOP;

/** Registry order determines the shared level number and progression order. */
export const PHYSIO_PARK_LEVELS: readonly ResolvedPhysioParkLevel[] = [
    LEVEL_1,
    LEVEL_2,
];

// First-level spawn alias retained for existing callers.
export const spawnPoint = LEVEL_1.spawnPoint;
