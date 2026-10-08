import {
    GRAVITY,
    MAX_FALL_SPEED,
    MOVE_SPEED,
    JUMP_SPEED,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
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

/** One player in the world: their body plus this tick's input. */
export interface PlatformerPlayer {
    body: PlatformerBody;
    input: PlatformerInput;
}

/**
 * A solid rectangle players cannot pass through. (x, y) is the top-left corner.
 * Note: a solid should be thicker than MAX_FALL_SPEED × dt (15 px at 60 Hz),
 * or a fast-falling player could pass through it in a single tick.
 */
export interface Solid { x: number; y: number; width: number; height: number; }

/** How close (in px) a player's feet must be to another's head to count as standing on them. */
const SUPPORT_EPSILON = 0.01;

const clamp = (value: number, min: number, max: number) =>
    (value < min ? min : value > max ? max : value);

/** True when the body and the solid overlap. Touching edges do not count. */
function overlaps(body: PlatformerBody, solid: Solid): boolean {
    return body.position.x + PLAYER_WIDTH_HALF > solid.x
        && body.position.x - PLAYER_WIDTH_HALF < solid.x + solid.width
        && body.position.y + PLAYER_HEIGHT_HALF > solid.y
        && body.position.y - PLAYER_HEIGHT_HALF < solid.y + solid.height;
}

/** A player's box as a solid, so other players can collide with and stand on it. */
function bodyToSolid(body: PlatformerBody): Solid {
    return {
        x: body.position.x - PLAYER_WIDTH_HALF,
        y: body.position.y - PLAYER_HEIGHT_HALF,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
    };
}

/** True when `top` is standing on `bottom`'s head. */
function isStandingOn(top: PlatformerBody, bottom: PlatformerBody): boolean {
    if (!top.grounded) { return false; }
    const feet = top.position.y + PLAYER_HEIGHT_HALF;
    const head = bottom.position.y - PLAYER_HEIGHT_HALF;
    if (Math.abs(feet - head) > SUPPORT_EPSILON) { return false; }
    return Math.abs(top.position.x - bottom.position.x) < PLAYER_WIDTH;
}

/**
 * Advances one player by one tick. Pure and deterministic: the server runs it
 * as the authority, and the client can run the same function for prediction.
 *
 * `carryX` is extra horizontal movement this tick, used when the player is
 * standing on another player who moved.
 */
export function stepPlatformerBody(
    body: PlatformerBody,
    input: PlatformerInput,
    solids: readonly Solid[],
    dt: number,
    carryX = 0,
): void {
    let vx = clamp(input.moveX, -1, 1) * MOVE_SPEED;
    let vy = body.velocity.y;

    // Jump only from the ground: no mid-air jumps.
    if (input.jump && body.grounded) {
        vy = -JUMP_SPEED;
    }

    vy = Math.min(vy + GRAVITY * dt, MAX_FALL_SPEED);

    // Horizontal: move (own movement plus any carry), then push out of anything we hit.
    const dx = vx * dt + carryX;
    body.position.x += dx;
    const dirX = Math.sign(dx);
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

/**
 * Advances every player by one tick, with players acting as solids for each
 * other so they can collide and stack.
 *
 * Players are processed bottom-up so a player's support has already moved by
 * the time they are stepped. A player standing on another is carried by that
 * player's horizontal movement.
 *
 * Known limitation: a player with someone standing on them cannot jump
 * (their head is blocked by the player above).
 */
export function stepAllPlayers(
    players: readonly PlatformerPlayer[],
    solids: readonly Solid[],
    dt: number,
): void {
    // Who stands on whom, based on positions at the start of this tick.
    const supporter = new Map<PlatformerPlayer, PlatformerPlayer>();
    for (const top of players) {
        for (const bottom of players) {
            if (top !== bottom && isStandingOn(top.body, bottom.body)) {
                supporter.set(top, bottom);
                break;
            }
        }
    }

    const startX = new Map<PlatformerPlayer, number>();
    for (const p of players) { startX.set(p, p.body.position.x); }

    // Bottom of the screen first (larger y = lower). The sort is stable, so
    // ties keep their original order and the result stays deterministic.
    const order = [...players].sort((a, b) => b.body.position.y - a.body.position.y);

    for (const player of order) {
        const support = supporter.get(player);
        const carryX = support ? support.body.position.x - startX.get(support) : 0;

        const others = players
            .filter((other) => other !== player)
            .map((other) => bodyToSolid(other.body));

        stepPlatformerBody(player.body, player.input, [...solids, ...others], dt, carryX);
    }
}