import { allPlayersInsideGoalArea } from "./shared.js";
import { PLAYER_HEIGHT_HALF } from "../physioParkConstants.js";
import type { PhysioParkLevelCollision, ResolvedPhysioParkLevel } from "./types.js";
import { LDtkLevel } from "./ldtkLevel1.js";

/** Collision data generated from docs/planning/ldtkLevel1/Level1.ldtk. */
export const LEVEL_1_COLLISION: PhysioParkLevelCollision = {
    width: LDtkLevel.width,
    height: LDtkLevel.height,
    solids: LDtkLevel.solids,
    lava: LDtkLevel.lava,
    goalArea: LDtkLevel.goalArea,
};

export const LEVEL_1: ResolvedPhysioParkLevel = {
    ...LEVEL_1_COLLISION,
    id: LDtkLevel.id,
    name: LDtkLevel.name,
    tiles: LDtkLevel.tiles,
    tilesets: LDtkLevel.tilesets,
    background: LDtkLevel.background,
    goalFlagPosition: LDtkLevel.goalFlagPosition,
    spawnPoint(index) {
        const spawn = LDtkLevel.spawns[index % LDtkLevel.spawns.length];
        return { x: spawn.x, y: spawn.y - PLAYER_HEIGHT_HALF };
    },
    isComplete(players) {
        return allPlayersInsideGoalArea(players, LDtkLevel.goalArea);
    },
};
