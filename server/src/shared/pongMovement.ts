import { Ball, Vec2, Vec2Like } from "../rooms/schema/PongState.js";
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_SPEED, PLAYER_WIDTH_HALF, PLAYER_HEIGHT_HALF, BALL_RADIUS, BALL_SPEED } from "./pongConstants.js";

export interface MovingEntity { position: Vec2; velocity: Vec2 }
export interface MoveInputLike { moveY: number; }

const clamp = (value: number, min: number, max: number) =>
    (value < min ? min : value > max ? max : value);


export function stepPlayer(player: MovingEntity, input: MoveInputLike, dt: number): void {
    const dirY = input.moveY;

    let vy = dirY * PLAYER_SPEED;
    const y = player.position.y + vy * dt;

    const clampedY = clamp(y, PLAYER_HEIGHT_HALF, ARENA_HEIGHT - PLAYER_HEIGHT_HALF);
    if (clampedY !== y) { vy = 0; }

    player.position.y = clampedY;
    player.velocity.y = vy;
}

export function stepBall(ball: MovingEntity, paddles: MovingEntity[], dt: number): void {
    const x = ball.position.x + ball.velocity.x * dt;
    const y = ball.position.y + ball.velocity.y * dt;

    // const clampedX = clamp(x, BALL_RADIUS, ARENA_WIDTH - BALL_RADIUS);
    const clampedY = clamp(y, BALL_RADIUS, ARENA_HEIGHT - BALL_RADIUS);

    // if (clampedX !== x) { ball.velocity.x *= -1; }
    if (clampedY !== y) { ball.velocity.y *= -1; }

    ball.position.set(x, clampedY);

    for (const p of paddles) {
        const collisionOffset = playerCollidesWithBall(p.position, ball.position);

        if (collisionOffset !== null) {
            ball.position.add(collisionOffset);
            const collisionAngle = ball.position.clone().sub(p.position).norm();
            ball.velocity = collisionAngle.mult(BALL_SPEED);
            ball.velocity.y *= -1;
        }
    }
}

export function checkIfScored(ball: Ball): "left" | "right" | null {
    if (ball.position.x <= 0) {
        return "right";
    }

    if (ball.position.x >= ARENA_WIDTH) {
        return "left";
    }
    
    return null;
}

function playerCollidesWithBall(
    playerPosition: Vec2,
    ballPosition: Vec2,
): Vec2 | null {
    const dx = ballPosition.x - playerPosition.x;
    const dy = ballPosition.y - playerPosition.y;

    const overlapX = PLAYER_WIDTH_HALF + BALL_RADIUS - Math.abs(dx);

    const overlapY = PLAYER_HEIGHT_HALF + BALL_RADIUS - Math.abs(dy);

    // No collision, or only touching edges
    if (overlapX <= 0 || overlapY <= 0) {
        return null;
    }

    // Resolve only x axis, probably would be better to auto resolve torward center
    return new Vec2({
        x: Math.sign(dx || 1) * overlapX,
        y: 0,
    });
}

