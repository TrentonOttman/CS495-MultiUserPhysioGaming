import type { Solid } from "./platformerMovement.js";
import { PLAYER_HEIGHT_HALF } from "./platformerConstants.js";

/**
 * The first Physio Park test level, based on the "Intro to mechanics" sketch:
 * left ground, a lava pit with two stepping platforms, right ground, and a goal
 * ledge too high for a single jump (one jump reaches ~117 px; the ledge is 130 px
 * up), so players have to stack to reach it.
 *
 * Shared by the server (physics) and the client (drawing), so both always agree
 * on where the platforms are. Units are pixels; y grows downward.
 */

export const LEVEL_WIDTH = 800;
export const LEVEL_HEIGHT = 600;

const GROUND_TOP = 520;

export interface Rect { x: number; y: number; width: number; height: number; }

/** The goal ledge players must reach. */
export const GOAL: Solid = { x: 640, y: GROUND_TOP - 130, width: 160, height: 20 };

/** Everything players stand on or bump into. */
export const SOLIDS: readonly Solid[] = [
    { x: 0, y: GROUND_TOP, width: 250, height: 80 },    // left ground
    { x: 300, y: 460, width: 60, height: 20 },          // stepping platform 1
    { x: 410, y: 420, width: 60, height: 20 },          // stepping platform 2
    { x: 520, y: GROUND_TOP, width: 280, height: 80 },  // right ground
    GOAL,
    { x: -20, y: -1000, width: 20, height: 2000 },      // left level edge
    { x: LEVEL_WIDTH, y: -1000, width: 20, height: 2000 }, // right level edge
];

/** Falling into this respawns the player. */
export const LAVA: Rect = { x: 250, y: 545, width: 270, height: 55 };

/** Where the player who joined `index`-th spawns: spread out along the left ground. */
export function spawnPoint(index: number): { x: number; y: number } {
    return { x: 40 + (index % 6) * 36, y: GROUND_TOP - PLAYER_HEIGHT_HALF };
}

/** The y-coordinate of a player's feet when standing on the ground. */
export const GROUND_Y = GROUND_TOP;
