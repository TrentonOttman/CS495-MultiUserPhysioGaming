import type { Solid } from "./physioParkMovement.js";
import { PLAYER_HEIGHT_HALF } from "./physioParkConstants.js";

/**
 * The first Physio Park test level, based on the "Intro to mechanics" sketch:
 * left ground, a lava pit with stepping platforms, right ground, and a goal
 * ledge 30 px above the right ground. An intermediate step lets every player
 * climb the last section independently with two jumps.
 *
 * Shared by the server (physics) and the client (drawing), so both always agree
 * on where the platforms are. Units are pixels; y grows downward.
 */

export const LEVEL_WIDTH = 320;
export const LEVEL_HEIGHT = 180;

const GROUND_TOP = 156;

export interface Rect { x: number; y: number; width: number; height: number; }

/** World-space player center used by level completion objectives. */
export interface PlayerPoint { x: number; y: number; }

/**
 * Resolved level data consumed by the game runtime. A future JSON/editor loader
 * can produce this same shape while keeping the room and renderer independent
 * of the source format.
 */
export interface ResolvedPhysioParkLevel {
    id: string;
    name: string;
    width: number;
    height: number;
    solids: readonly Solid[];
    lava: Rect;
    goalPlatform: Solid;
    goalArea: Rect;
    spawnPoint(index: number): { x: number; y: number };
    isComplete(players: readonly PlayerPoint[]): boolean;
}

/** The goal ledge players must reach. */
const GOAL_PLATFORM: Solid = { x: 256, y: GROUND_TOP - 30, width: 64, height: 6 };

/** Everything players stand on or bump into. */
const LEVEL_SOLIDS: readonly Solid[] = [
    { x: 0, y: GROUND_TOP, width: 100, height: 24 },       // left ground
    { x: 120, y: 138, width: 24, height: 6 },              // stepping platform 1
    { x: 164, y: 126, width: 24, height: 6 },              // stepping platform 2
    { x: 208, y: GROUND_TOP, width: 112, height: 24 },     // right ground
    { x: 224, y: 136, width: 24, height: 6 },              // step up to the goal ledge
    GOAL_PLATFORM,
    { x: -8, y: -300, width: 8, height: 600 },             // left level edge
    { x: LEVEL_WIDTH, y: -300, width: 8, height: 600 },    // right level edge
];

/** Falling into this respawns the player. */
const LEVEL_LAVA: Rect = { x: 100, y: 163.5, width: 108, height: 16.5 };

/** Where the player who joined `index`-th spawns: spread out along the left ground. */
function defaultSpawnPoint(index: number): { x: number; y: number } {
    return { x: 16 + (index % 6) * 14.4, y: GROUND_TOP - PLAYER_HEIGHT_HALF };
}

/** The y-coordinate of a player's feet when standing on the ground. */
export const GROUND_Y = GROUND_TOP;

/** A standing player on the goal ledge has its center inside this region. */
const GOAL_AREA: Rect = {
    x: GOAL_PLATFORM.x,
    y: GOAL_PLATFORM.y - 30,
    width: GOAL_PLATFORM.width,
    height: 30,
};

/** Returns true only when at least one player is present and every player is inside. */
export function allPlayersInsideGoalArea(players: readonly PlayerPoint[], goalArea: Rect): boolean {
    return players.length > 0 && players.every((player) =>
        player.x >= goalArea.x
        && player.x < goalArea.x + goalArea.width
        && player.y >= goalArea.y
        && player.y < goalArea.y + goalArea.height,
    );
}

function createLevel(id: string, name: string): ResolvedPhysioParkLevel {
    return {
        id,
        name,
        width: LEVEL_WIDTH,
        height: LEVEL_HEIGHT,
        solids: LEVEL_SOLIDS,
        lava: LEVEL_LAVA,
        goalPlatform: GOAL_PLATFORM,
        goalArea: GOAL_AREA,
        spawnPoint: defaultSpawnPoint,
        isComplete: (players) => allPlayersInsideGoalArea(players, GOAL_AREA),
    };
}

/** The second level is a temporary copy used to exercise progression. */
export const PHYSIO_PARK_LEVELS: readonly ResolvedPhysioParkLevel[] = [
    createLevel("intro", "Intro to mechanics"),
    createLevel("intro-copy", "Intro to mechanics (test level)"),
];

// First-level aliases retained for existing callers while gameplay migrates to
// the resolved level registry.
export const GOAL = GOAL_PLATFORM;
export const SOLIDS = LEVEL_SOLIDS;
export const LAVA = LEVEL_LAVA;
export const GOAL_AREA_RECT = GOAL_AREA;
export const spawnPoint = defaultSpawnPoint;
