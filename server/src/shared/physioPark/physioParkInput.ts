import { COYOTE_TIME, JUMP_SPEED, MAX_FALL_SPEED, MOVE_SPEED } from "./physioParkConstants.js";
import type { Vec2Like } from "./physioParkMovement.js";

/** One tick of player input: horizontal direction plus the jump button. */
export interface PlayerInputLike {
    /** -1 = left, 0 = none, 1 = right. Out-of-range values are clamped. */
    moveX: number;
    jump: boolean;
}

/** The parts of a player's physics body that input changes. */
export interface ControlledBody {
    velocity: Vec2Like;
    /** Ticks since the player last stood on something (0 = grounded). */
    timeSinceGrounded: number;
}

export const NO_INPUT: PlayerInputLike = { moveX: 0, jump: false };

const clamp = (value: number, min: number, max: number) =>
    (value < min ? min : value > max ? max : value);

/**
 * Applies one tick of input to a player's body, before the world steps.
 *
 * Shared by the server (authority) and the client (prediction), so both apply
 * input identically. Pure function of (body, input): no clocks, no randomness.
 *
 * - Horizontal speed comes straight from `moveX`.
 * - Jump works while grounded or within `COYOTE_TIME` ticks of leaving the ground.
 * - Releasing jump while still rising cuts the jump short.
 * - Falling speed is capped at `MAX_FALL_SPEED`.
 */
export function applyPlayerInput(body: ControlledBody, input: PlayerInputLike): void {
    const canJump = body.timeSinceGrounded <= COYOTE_TIME;

    const vx = clamp(input.moveX, -1, 1) * MOVE_SPEED;
    let vy = body.velocity.y;

    if (input.jump && canJump) {
        vy = -JUMP_SPEED;
        // Push past the coyote window so the jump can't be repeated mid-air.
        body.timeSinceGrounded += COYOTE_TIME + 1;
    }

    // Cut the jump short when the button is released while still rising.
    const rising = vy < 0 && body.timeSinceGrounded > COYOTE_TIME;
    if (rising && !input.jump) {
        vy = 0;
    }

    if (vy >= MAX_FALL_SPEED) {
        vy = MAX_FALL_SPEED;
    }

    body.velocity = { x: vx, y: vy };
}
