import { allPlayersInsideGoalArea } from "./shared.js";
import { PLAYER_HEIGHT_HALF } from "../physioParkConstants.js";
import type { ResolvedPhysioParkLevel } from "./types.js";
import { LDtkLevel } from "./ldtkLevel1.js";

export const LEVEL_1: ResolvedPhysioParkLevel = {
    width: LDtkLevel.width,
    height: LDtkLevel.height,
    solids: LDtkLevel.solids,
    lava: LDtkLevel.lava,
    goalArea: LDtkLevel.goalArea,
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
