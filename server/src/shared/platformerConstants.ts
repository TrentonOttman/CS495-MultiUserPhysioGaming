/**
 * Tunable physics constants for Physio Park.
 * Units are pixels and seconds. y grows downward, matching Phaser.
 */

/** Gravity, in pixels per second squared. */
export const GRAVITY = 1800;

/** Fastest a player can fall, in pixels per second. */
export const MAX_FALL_SPEED = 900;

/** Horizontal walking speed, in pixels per second. */
export const MOVE_SPEED = 220;

/** Upward speed at the start of a jump. Jump height ≈ JUMP_SPEED² / (2 × GRAVITY) ≈ 117 px. */
export const JUMP_SPEED = 650;

export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 32;
export const PLAYER_WIDTH_HALF = PLAYER_WIDTH / 2;
export const PLAYER_HEIGHT_HALF = PLAYER_HEIGHT / 2;