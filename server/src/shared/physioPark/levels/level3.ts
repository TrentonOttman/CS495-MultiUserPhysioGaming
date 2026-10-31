import { allPlayersInsideGoalArea } from "./shared.js";
import { PLAYER_HEIGHT_HALF } from "../physioParkConstants.js";
import type { ResolvedPhysioParkLevel } from "./types.js";
import { LDtkLevel } from "./ldtkLevel3.js";

/** Moving platform and player switch level authored in docs/planning/ldtkLevel2/level2.ldtk. */
export const LEVEL_3: ResolvedPhysioParkLevel = {
    id: LDtkLevel.id,
    name: LDtkLevel.name,
    width: LDtkLevel.width,
    height: LDtkLevel.height,
    solids: LDtkLevel.solids,
    lavas: LDtkLevel.lavas,
    goalArea: LDtkLevel.goalArea,
    tiles: LDtkLevel.tiles,
    tilesets: LDtkLevel.tilesets,
    background: LDtkLevel.background,
    goalFlagPosition: LDtkLevel.goalFlagPosition,
    movingPlatforms: LDtkLevel.movingPlatforms,
    switches: LDtkLevel.switches,
    spawnPoint(index) {
        const spawn = LDtkLevel.spawns[index % LDtkLevel.spawns.length];
        return { x: spawn.x, y: spawn.y - PLAYER_HEIGHT_HALF };
    },
    isComplete(players) {
        return allPlayersInsideGoalArea(players, LDtkLevel.goalArea);
    },
};
