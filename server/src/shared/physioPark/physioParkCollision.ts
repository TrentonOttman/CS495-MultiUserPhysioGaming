import { LEVEL_2_COLLISION } from "./levels/level2.js";
import { LEVEL_1_COLLISION } from "./levels/level1.js";

export type {
    ButtonDefinition,
    ButtonCollision,
    ConveyorCollision,
    PhysioParkLevelCollision,
    PhysioParkRect,
} from "./levels/types.js";
export { GROUND_TOP, LEVEL_HEIGHT, LEVEL_WIDTH } from "./levels/shared.js";

/** Collision lookup retained as a stable entry point for shared game systems. */
export const PHYSIO_PARK_COLLISIONS = {
    level1: LEVEL_1_COLLISION,
    level2: LEVEL_2_COLLISION,
} as const;

// First-level aliases retained for existing callers.
export const GOAL = LEVEL_1_COLLISION.goalPlatform;
export const SOLIDS = LEVEL_1_COLLISION.solids;
export const LAVA = LEVEL_1_COLLISION.lava;
export const GOAL_AREA_RECT = LEVEL_1_COLLISION.goalArea;
