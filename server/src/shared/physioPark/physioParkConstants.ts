/**
 * Tunable physics constants for Physio Park.
 * Units are pixels and seconds. y grows downward, matching Phaser.
 */

/** Simulation rate in Hz. One input advances exactly one step at this rate. */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const RESOLUTION_X = 320;
export const RESOLUTION_Y = 180;

/** Physics constants are multiplied by PIXELS_PER_METER for rough unit conversion to metric. 
 * Also allows for easily changing resolution without affecting physics */
export const PIXELS_PER_METER = 8;

/** Gravity, in pixels per second squared. */
export const GRAVITY = 9.81 * PIXELS_PER_METER;

/** Fastest a player can fall, in pixels per second. */
export const MAX_FALL_SPEED = 20 * PIXELS_PER_METER;

/** Horizontal walking speed, in pixels per second. */
export const MOVE_SPEED = 5 * PIXELS_PER_METER;

/** Upward speed at the start of a jump. Jump height ≈ JUMP_SPEED² / (2 × GRAVITY) ≈ 117 px. */
export const JUMP_SPEED = 8 * PIXELS_PER_METER;

export const PLAYER_WIDTH = 10;
export const PLAYER_HEIGHT = 10;

export const PLAYER_WIDTH_HALF = PLAYER_WIDTH / 2;
export const PLAYER_HEIGHT_HALF = PLAYER_HEIGHT / 2;
