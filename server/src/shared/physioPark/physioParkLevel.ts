import type { Solid } from "./physioParkMovement.js";
import { PLAYER_HEIGHT_HALF } from "./physioParkConstants.js";

/**
 * The first Physio Park test level, based on the "Intro to mechanics" sketch:
 * left ground, a lava pit with two stepping platforms, right ground, and a goal
 * ledge too high for a single jump (one jump reaches ~117 px; the ledge is 130 px
 * up), so players have to stack to reach it.
 *
 * Shared by the server (physics) and the client (drawing), so both always agree
 * on where the platforms are. Units are pixels; y grows downward.
 */

export const LEVEL_WIDTH = 320;
export const LEVEL_HEIGHT = 180;

const GROUND_TOP = 156;

export interface Rect { x: number; y: number; width: number; height: number; }

/** The goal ledge players must reach. */
export const GOAL: Solid = { x: 256, y: GROUND_TOP - 39, width: 64, height: 6 };

/** Everything players stand on or bump into. */
export const SOLIDS: readonly Solid[] = [
    { x: 0, y: GROUND_TOP, width: 100, height: 24 },       // left ground
    { x: 120, y: 138, width: 24, height: 6 },              // stepping platform 1
    { x: 164, y: 126, width: 24, height: 6 },              // stepping platform 2
    { x: 208, y: GROUND_TOP, width: 112, height: 24 },     // right ground
    GOAL,
    { x: -8, y: -300, width: 8, height: 600 },             // left level edge
    { x: LEVEL_WIDTH, y: -300, width: 8, height: 600 },    // right level edge
];

/** Falling into this respawns the player. */
export const LAVA: Rect = { x: 100, y: 163.5, width: 108, height: 16.5 };

/** Where the player who joined `index`-th spawns: spread out along the left ground. */
export function spawnPoint(index: number): { x: number; y: number } {
    return { x: 16 + (index % 6) * 14.4, y: GROUND_TOP - PLAYER_HEIGHT_HALF };
}

/** The y-coordinate of a player's feet when standing on the ground. */
export const GROUND_Y = GROUND_TOP;
