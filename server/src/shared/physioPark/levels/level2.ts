import { PLAYER_HEIGHT, PLAYER_WIDTH } from "../physioParkConstants.js";
import type { ButtonDefinition, PhysioParkLevelCollision, ResolvedPhysioParkLevel } from "./types.js";
import { GROUND_TOP, LEVEL_HEIGHT, LEVEL_WIDTH, allPlayersInsideGoalArea } from "./shared.js";

// Lower than before while still beyond a solo jump from the floor.
const goalPlatform = { x: 290, y: 116, width: 54, height: 6 } as const;
// The zone sits over the right half of the platform and ends at its top edge.
const goalArea = { x: 290, y: 52, width: 54, height: 64 } as const;
const levelWidth = LEVEL_WIDTH + 64;
// Three short belts leave 28 px, 28 px, and 32 px lava gaps.
const conveyorSurfaces = [
    { x: 88, y: 140, width: 32, height: 8 },
    { x: 148, y: 140, width: 32, height: 8 },
    { x: 208, y: 140, width: 32, height: 8 },
] as const;
const button: ButtonDefinition = {
    // The level chooses a manifest sprite and world anchor; the shared sprite
    // definition owns its frame art, display transform, and local colliders.
    sprite: "buttonPress",
    position: { x: goalPlatform.x + goalPlatform.width - 8, y: goalPlatform.y },
    // Drops onto the lower bank just left of the goal area.
    crate: { x: 356, y: 106, width: 16, height: 16 },
};

/** Collision shapes for the lava jumps and team button level. */
export const LEVEL_2_COLLISION: PhysioParkLevelCollision = {
    width: levelWidth,
    height: LEVEL_HEIGHT,
    solids: [
        { x: 0, y: GROUND_TOP, width: 88, height: 24 },
        ...conveyorSurfaces,
        { x: 272, y: GROUND_TOP, width: levelWidth - 272, height: 24 },
        goalPlatform,
        { x: -8, y: -300, width: 8, height: 600 },
        { x: levelWidth, y: -300, width: 8, height: 600 },
    ],
    lava: { x: 88, y: 163.5, width: 184, height: 16.5 },
    goalPlatform,
    goalArea,
    conveyors: conveyorSurfaces.map((surface) => ({ surface, pushSpeed: 28 })),
    button,
};

export const LEVEL_2: ResolvedPhysioParkLevel = {
    ...LEVEL_2_COLLISION,
    id: "level2",
    name: "Level 2",
    goalFlagOffset: { x: 16, y: 0 },
    spawnPoint(index) {
        // Five players fit across the starting bank; the remaining three stack
        // above the first row without overlapping at spawn.
        const columns = 5;
        const row = Math.floor(index / columns);
        const column = index % columns;
        return {
            x: 4 + column * PLAYER_WIDTH,
            y: GROUND_TOP - PLAYER_HEIGHT - row * PLAYER_HEIGHT,
        };
    },
    isComplete(players, objectives) {
        return objectives.buttonPressed && allPlayersInsideGoalArea(players, goalArea);
    },
};
