import { PLAYER_HEIGHT, PLAYER_WIDTH } from "../physioParkConstants.js";
import { allPlayersInsideGoalArea } from "./shared.js";
import type { ResolvedPhysioParkLevel } from "./types.js";
import { LDtkLevel } from "./ldtkLevel2.js";

export const LEVEL_2: ResolvedPhysioParkLevel = {
    id: LDtkLevel.id,
    name: LDtkLevel.name,
    width: LDtkLevel.width,
    height: LDtkLevel.height,
    solids: LDtkLevel.solids,
    lavas: LDtkLevel.lavas,
    goalArea: LDtkLevel.goalArea,
    conveyors: LDtkLevel.conveyors,
    button: LDtkLevel.button,
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
