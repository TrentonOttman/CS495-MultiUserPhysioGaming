import { PLAYER_HEIGHT_HALF } from "../physioParkConstants.js";
import type { PhysioParkLevelCollision, ResolvedPhysioParkLevel } from "./types.js";
import { allPlayersInsideGoalArea, GROUND_TOP, LEVEL_HEIGHT, LEVEL_WIDTH } from "./shared.js";

const goalPlatform = { x: 256, y: GROUND_TOP - 30, width: 64, height: 6 } as const;
const goalArea = {
    x: goalPlatform.x,
    y: goalPlatform.y - 30,
    width: goalPlatform.width,
    height: 30,
} as const;

/** Collision shapes for the introductory stepping-platform level. */
export const LEVEL_1_COLLISION: PhysioParkLevelCollision = {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    solids: [
        { x: 0, y: GROUND_TOP, width: 100, height: 24 },
        { x: 120, y: 138, width: 24, height: 6 },
        { x: 164, y: 126, width: 24, height: 6 },
        { x: 208, y: GROUND_TOP, width: 112, height: 24 },
        { x: 224, y: 136, width: 24, height: 6 },
        goalPlatform,
        { x: -8, y: -300, width: 8, height: 600 },
        { x: LEVEL_WIDTH, y: -300, width: 8, height: 600 },
    ],
    lava: { x: 100, y: 163.5, width: 108, height: 16.5 },
    goalPlatform,
    goalArea,
};

export const LEVEL_1: ResolvedPhysioParkLevel = {
    ...LEVEL_1_COLLISION,
    id: "level1",
    name: "Level 1",
    goalFlagOffset: { x: 8, y: 0 },
    spawnPoint(index) {
        return { x: 16 + (index % 6) * 14.4, y: GROUND_TOP - PLAYER_HEIGHT_HALF };
    },
    isComplete(players) {
        return allPlayersInsideGoalArea(players, goalArea);
    },
};
