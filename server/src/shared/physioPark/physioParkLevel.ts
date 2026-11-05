import { LEVEL_1 } from "./levels/level1.js";
import { parseLDtkProjectLevel } from "./levels/ldtkloader.ts";

import ldtkProjectJson from "./levels/Level2.json";


export const PHYSIO_PARK_LEVELS = [
    LEVEL_1,
    //parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_1" }),
    parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_2" }),
    parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_3" }),
] as const;