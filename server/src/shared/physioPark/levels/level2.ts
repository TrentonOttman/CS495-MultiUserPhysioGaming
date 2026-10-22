import { PLAYER_HEIGHT_HALF } from "../physioParkConstants.js";
import type { ButtonDefinition, PhysioParkLevelCollision, ResolvedPhysioParkLevel } from "./types.js";
import { GROUND_TOP, LEVEL_HEIGHT, LEVEL_WIDTH, allPlayersInsideGoalArea } from "./shared.js";

const goalPlatform = { x: 256, y: 126, width: 64, height: 6 } as const;
const goalArea = { x: 256, y: 116, width: 64, height: 10 } as const;
const conveyorSurface = { x: 88, y: 140, width: 112, height: 8 } as const;
const button: ButtonDefinition = {
    // The level chooses a manifest sprite and world anchor; the shared sprite
    // definition owns its frame art, display transform, and local colliders.
    sprite: "buttonPress",
    position: { x: goalPlatform.x + goalPlatform.width / 2, y: goalPlatform.y },
    crate: { x: 232, y: 60, width: 16, height: 16 },
};

/** Collision shapes for the conveyor, lava jump, and team button level. */
export const LEVEL_2_COLLISION: PhysioParkLevelCollision = {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    solids: [
        { x: 0, y: GROUND_TOP, width: 88, height: 24 },
        conveyorSurface,
        { x: 212, y: GROUND_TOP, width: 108, height: 24 },
        { x: 224, y: 146, width: 28, height: 6 },
        goalPlatform,
        { x: -8, y: -300, width: 8, height: 600 },
        { x: LEVEL_WIDTH, y: -300, width: 8, height: 600 },
    ],
    lava: { x: 88, y: 163.5, width: 124, height: 16.5 },
    goalPlatform,
    goalArea,
    conveyor: { surface: conveyorSurface, pushSpeed: 28 },
    button,
};

export const LEVEL_2: ResolvedPhysioParkLevel = {
    ...LEVEL_2_COLLISION,
    id: "level2",
    name: "Level 2",
    spawnPoint(index) {
        // Eight seats fit on the starting bank without spawning over the lava.
        return { x: 4 + (index % 8) * 10, y: GROUND_TOP - PLAYER_HEIGHT_HALF };
    },
    isComplete(players, objectives) {
        return objectives.buttonPressed && allPlayersInsideGoalArea(players, goalArea);
    },
};
