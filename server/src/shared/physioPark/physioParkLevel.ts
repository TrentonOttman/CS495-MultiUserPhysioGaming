import { parseLDtkProjectLevel } from "./levels/ldtkloader.ts";
export type { ResolvedPhysioParkLevel } from "./levels/types.js";
import ldtkProjectJson from "./levels/PhysioPark.json";
export { allPlayersInsideGoalArea } from "./levels/shared.js";

export const PHYSIO_PARK_LEVELS = [
    //parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_1" }),
   parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_1" }),
    parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_2" }),
    parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_3" }),
   parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_4" }),
//parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_5" }),

] as const;
export const GROUND_Y = PHYSIO_PARK_LEVELS[0].groundY;


/** The y-coordinate of a player's feet when standing on the ground. */
/**
export const GROUND_Y = GROUND_TOP;
**/
