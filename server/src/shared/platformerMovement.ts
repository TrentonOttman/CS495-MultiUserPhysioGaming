import {
    GRAVITY,
    MAX_FALL_SPEED,
    MOVE_SPEED,
    JUMP_SPEED,
    PLAYER_WIDTH_HALF,
    PLAYER_HEIGHT_HALF,
} from "./platformerConstants.js";

export interface Vec2Like { x: number; y: number; }

/** A player's physical state. `position` is the center of the player. */
export interface PlatformerBody {
    position: Vec2Like;
    velocity: Vec2Like;
    /** True when the player is standing on something. Only grounded players can jump. */
    grounded: boolean;
}

export interface PlatformerInput {
    /** -1 = left, 0 = none, 1 = right. Out-of-range values are clamped. */
    moveX: number;
    jump: boolean;
}

/**
 * A solid rectangle players cannot pass through. (x, y) is the top-left corner.
 * Note: a solid should be thicker than MAX_FALL_SPEED × dt (15 px at 60 Hz),
 * or a fast-falling player could pass through it in a single tick.
 */
export interface Solid { x: number; y: number; width: number; height: number; }

const clamp = (value: number, min: number, max: number) =>
    (value < min ? min : value > max ? max : value);

/** True when the body and the solid overlap. Touching edges do not count. */
function overlaps(body: PlatformerBody, solid: Solid): boolean {
    return body.position.x + PLAYER_WIDTH_HALF > solid.x
        && body.position.x - PLAYER_WIDTH_HALF < solid.x + solid.width
        && body.position.y + PLAYER_HEIGHT_HALF > solid.y
        && body.position.y - PLAYER_HEIGHT_HALF < solid.y + solid.height;
}

/**
 * Advances one player by one tick. Pure and deterministic: the server runs it
 * as the authority, and the client can run the same function for prediction.
 */
export function stepPlatformerBody(
    body: PlatformerBody,
    input: PlatformerInput,
    solids: readonly Solid[],
    dt: number,
): void {
    let vx = clamp(input.moveX, -1, 1) * MOVE_SPEED;
    let vy = body.velocity.y;

    // Jump only from the ground: no mid-air jumps.
    if (input.jump && body.grounded) {
        vy = -JUMP_SPEED;
    }

    vy = Math.min(vy + GRAVITY * dt, MAX_FALL_SPEED);

    // Horizontal: move, then push out of anything we walked into.
    body.position.x += vx * dt;
    const dirX = Math.sign(vx);
    for (const solid of solids) {
        if (!overlaps(body, solid)) { continue; }
        if (dirX > 0) {
            body.position.x = solid.x - PLAYER_WIDTH_HALF;
        } else if (dirX < 0) {
            body.position.x = solid.x + solid.width + PLAYER_WIDTH_HALF;
        }
        vx = 0;
    }

    // Vertical: move, then push out. Landing on top makes the player grounded;
    // hitting from below stops the jump.
    body.position.y += vy * dt;
    body.grounded = false;
    const dirY = Math.sign(vy);
    for (const solid of solids) {
        if (!overlaps(body, solid)) { continue; }
        if (dirY > 0) {
            body.position.y = solid.y - PLAYER_HEIGHT_HALF;
            body.grounded = true;
        } else if (dirY < 0) {
            body.position.y = solid.y + solid.height + PLAYER_HEIGHT_HALF;
        }
        vy = 0;
    }

    body.velocity.x = vx;
    body.velocity.y = vy;
}