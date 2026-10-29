import { getSpriteCollisionRects, PHYSIO_PARK_ANIMATIONS } from "../../shared/physioPark/physioParkAnimations.js";
import { TICK_RATE } from "../../shared/physioPark/physioParkConstants.js";
import type { ResolvedPhysioParkLevel } from "../../shared/physioPark/physioParkLevel.js";
import type { MovingPlatformDefinition, PlayerSwitchDefinition } from "../../shared/physioPark/levels/types.js";
import type { Player } from "../schema/PhysioParkState.js";
import type { Body, Solid } from "../../shared/physioPark/physioParkMovement.js";

type StateMap<T> = { get(key: string): T | undefined };
type MovingPlatformRuntimeState = { x: number; y: number; active: boolean; towardEnd: boolean };
type PlayerSwitchRuntimeState = { active: boolean; hitSequence: number };

export function isStandingOn(body: Body, surface: Solid): boolean {
    const feetY = body.rect.y + body.rect.height;
    const horizontalOverlap = body.rect.x < surface.x + surface.width
        && body.rect.x + body.rect.width > surface.x;
    return horizontalOverlap && Math.abs(feetY - surface.y) <= 1.5;
}

export function isCenteredOnButton(body: Body, surface: Solid): boolean {
    const playerCenterX = body.rect.x + body.rect.width / 2;
    const feetY = body.rect.y + body.rect.height;
    return playerCenterX >= surface.x
        && playerCenterX < surface.x + surface.width
        && Math.abs(feetY - surface.y) <= 1.5;
}

export function getButtonSurface(
    button: NonNullable<ResolvedPhysioParkLevel["button"]>,
    playbackFrame: number,
): Solid {
    const sprite = PHYSIO_PARK_ANIMATIONS[button.sprite];
    const surface = getSpriteCollisionRects(sprite, button.position, playbackFrame)[0];
    if (!surface) {
        throw new Error(`Missing collision shape for button sprite "${button.sprite}" at frame ${playbackFrame}`);
    }
    return surface;
}

export function detectSwitchHits(
    switches: readonly PlayerSwitchDefinition[],
    players: Iterable<[string, Pick<Player, "connected" | "color">]>,
    playerBodies: ReadonlyMap<string, Body>,
): Set<string> {
    const hitSwitches = new Set<string>();
    for (const playerSwitch of switches) {
        const underside = playerSwitch.y + playerSwitch.height;
        for (const [sessionId, player] of players) {
            if (!player.connected || player.color !== playerSwitch.player) continue;
            const body = playerBodies.get(sessionId);
            if (!body || body.velocity.y >= 0) continue;

            const playerRight = body.rect.x + body.rect.width;
            const horizontallyOverlapping = body.rect.x < playerSwitch.x + playerSwitch.width
                && playerRight > playerSwitch.x;
            const currentTop = body.rect.y;
            const nextTop = currentTop + body.velocity.y / TICK_RATE;
            if (horizontallyOverlapping && currentTop >= underside - 0.1 && nextTop <= underside) {
                hitSwitches.add(playerSwitch.id);
            }
        }
    }
    return hitSwitches;
}

export function toggleHitSwitches(
    switches: readonly PlayerSwitchDefinition[],
    hitSwitches: ReadonlySet<string>,
    switchStates: StateMap<PlayerSwitchRuntimeState>,
    platformStates: StateMap<MovingPlatformRuntimeState>,
    platformBodies: ReadonlyMap<string, Body>,
): void {
    for (const playerSwitch of switches) {
        if (!hitSwitches.has(playerSwitch.id)) continue;
        const switchState = switchStates.get(playerSwitch.id);
        if (!switchState) continue;
        switchState.active = !switchState.active;
        switchState.hitSequence = (switchState.hitSequence + 1) % 0x1_0000;

        if (!playerSwitch.target) continue;
        const platformState = platformStates.get(playerSwitch.target);
        const platformBody = platformBodies.get(playerSwitch.target);
        if (!platformState || !platformBody) continue;
        platformState.active = switchState.active;
        if (!platformState.active) platformBody.velocity = { x: 0, y: 0 };
    }
}

export function advanceMovingPlatforms(
    platforms: readonly MovingPlatformDefinition[],
    states: StateMap<MovingPlatformRuntimeState>,
    bodies: ReadonlyMap<string, Body>,
): void {
    for (const platform of platforms) {
        const state = states.get(platform.id);
        const body = bodies.get(platform.id);
        if (!state || !body || !state.active) {
            if (body) body.velocity = { x: 0, y: 0 };
            continue;
        }

        const targetX = state.towardEnd ? platform.endX : platform.x;
        const targetY = state.towardEnd ? platform.endY : platform.y;
        const dx = targetX - body.rect.x;
        const dy = targetY - body.rect.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= 0.001) {
            body.rect.x = targetX;
            body.rect.y = targetY;
            state.towardEnd = !state.towardEnd;
            body.velocity = { x: 0, y: 0 };
            continue;
        }

        const tickDistance = Math.max(0, platform.speed) / TICK_RATE;
        const speed = distance <= tickDistance ? distance * TICK_RATE : Math.max(0, platform.speed);
        body.velocity = { x: (dx / distance) * speed, y: (dy / distance) * speed };
    }
}

export function finishMovingPlatforms(
    platforms: readonly MovingPlatformDefinition[],
    states: StateMap<MovingPlatformRuntimeState>,
    bodies: ReadonlyMap<string, Body>,
): void {
    for (const platform of platforms) {
        const state = states.get(platform.id);
        const body = bodies.get(platform.id);
        if (!state || !body) continue;
        const targetX = state.towardEnd ? platform.endX : platform.x;
        const targetY = state.towardEnd ? platform.endY : platform.y;
        if (Math.hypot(targetX - body.rect.x, targetY - body.rect.y) <= 0.01) {
            body.rect.x = targetX;
            body.rect.y = targetY;
            state.towardEnd = !state.towardEnd;
        }
        state.x = body.rect.x;
        state.y = body.rect.y;
    }
}
