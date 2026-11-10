/**
 * Tunable physics constants for Physio Park.
 * Units are pixels and seconds. y grows downward, matching Phaser.
 */

/** Simulation rate in Hz. One input advances exactly one step at this rate. */
export const TICK_RATE = 60;

/** Pause shown to every player before loading the next level. */
export const LEVEL_TRANSITION_DELAY_MS = 2000;

export const RESOLUTION_X = 320;
export const RESOLUTION_Y = 180;

/** Rough pixel conversion factor used to keep gameplay tuning in meter-like units. */
export const PIXELS_PER_METER = 8;

/** Gravity, in pixels per second squared. */
export const GRAVITY = 30 * PIXELS_PER_METER;

/** Maximum downward player speed, in pixels per second. */
export const MAX_FALL_SPEED = 8 * PIXELS_PER_METER;

/** Horizontal walking speed, in pixels per second. */
export const MOVE_SPEED = 5 * PIXELS_PER_METER;

/** Target jump height in pixels. */
export const JUMP_HEIGHT = 4.5 * PIXELS_PER_METER;
export const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);

export const PLAYER_WIDTH = 16;
export const PLAYER_HEIGHT = 16;

export const PLAYER_WIDTH_HALF = PLAYER_WIDTH / 2;
export const PLAYER_HEIGHT_HALF = PLAYER_HEIGHT / 2;

/** Allow players to jump 0.2 seconds after leaving the ground. */
export const COYOTE_TIME = Math.floor(0.2 * TICK_RATE);
