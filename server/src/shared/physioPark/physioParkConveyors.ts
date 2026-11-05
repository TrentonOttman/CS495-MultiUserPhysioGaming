import type { Body, Solid } from "./physioParkMovement.js";
import type { ConveyorCollision } from "./levels/types.js";

/** How close (in pixels) a body's feet must be to a surface to count as standing on it. */
const STANDING_TOLERANCE = 1.5;

/** True when `body`'s feet rest on top of `surface`. */
export function isStandingOn(body: Body, surface: Solid): boolean {
    const feetY = body.rect.y + body.rect.height;
    const horizontalOverlap = body.rect.x < surface.x + surface.width
        && body.rect.x + body.rect.width > surface.x;
    return horizontalOverlap && Math.abs(feetY - surface.y) <= STANDING_TOLERANCE;
}

/** The push of the first conveyor `body` is standing on, or 0. */
export function conveyorPushUnder(body: Body, conveyors: readonly ConveyorCollision[] = []): number {
    for (const conveyor of conveyors) {
        if (isStandingOn(body, conveyor.surface)) return conveyor.pushSpeed;
    }
    return 0;
}

/**
 * Adds a conveyor's push to a player who is standing on one. Runs after
 * `applyPlayerInput` and before the world steps, on the server and in
 * client-side prediction alike, so both move riders identically.
 */
export function applyConveyorPush(body: Body, conveyors: readonly ConveyorCollision[] = []): void {
    const push = conveyorPushUnder(body, conveyors);
    if (push !== 0) body.velocity = { x: body.velocity.x + push, y: body.velocity.y };
}
