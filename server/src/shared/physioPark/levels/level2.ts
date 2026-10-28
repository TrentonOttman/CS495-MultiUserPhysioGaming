import { PLAYER_HEIGHT, PLAYER_WIDTH } from "../physioParkConstants.js";
import { allPlayersInsideGoalArea } from "./shared.js";
import type { PhysioParkLevelCollision, ResolvedPhysioParkLevel } from "./types.js";
import { LDtkLevel } from "./ldtkLevel2.js";

/** Collision data generated from docs/planning/ldtkLevel2/level2.ldtk. */
export const LEVEL_2_COLLISION: PhysioParkLevelCollision = {
    width: LDtkLevel.width,
    height: LDtkLevel.height,
    solids: LDtkLevel.solids,
    lava: LDtkLevel.lava,
    goalArea: LDtkLevel.goalArea,
    conveyors: LDtkLevel.conveyors,
    button: LDtkLevel.button,
};

export const LEVEL_2: ResolvedPhysioParkLevel = {
    ...LEVEL_2_COLLISION,
    id: "level2",
    name: "Level 2",
    tiles: LDtkLevel.tiles,
    tilesets: LDtkLevel.tilesets,
    background: LDtkLevel.background,
    goalFlagPosition: LDtkLevel.goalFlagPosition,
    spawnPoint(index) {
        const columns = 4;
        const row = Math.floor(index / columns);
        const column = index % columns;
        const spawn = LDtkLevel.spawns[0];
        // LDtk's SpawnPoint marks the top-left of the player-sized start area.
        return {
            x: spawn.x - PLAYER_WIDTH / 2 + column * PLAYER_WIDTH,
            y: spawn.y - row * PLAYER_HEIGHT,
        };
    },
    isComplete(players, objectives) {
        return objectives.buttonPressed && allPlayersInsideGoalArea(players, LDtkLevel.goalArea);
    },
};
