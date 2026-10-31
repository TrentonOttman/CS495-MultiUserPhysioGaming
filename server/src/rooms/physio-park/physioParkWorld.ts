import { getButtonSurface } from "./physioParkRoomMechanics.js";
import type { ResolvedPhysioParkLevel } from "../../shared/physioPark/physioParkLevel.js";
import { Body, PhysicsWorld, Rect } from "../../shared/physioPark/physioParkMovement.js";
import { GRAVITY } from "../../shared/physioPark/physioParkConstants.js";
import { MovingPlatformState, PlayerSwitchState, type PhysioParkState } from "../schema/PhysioParkState.js";

export interface PhysioParkWorldParts {
    world: PhysicsWorld;
    crateBody?: Body;
    buttonBody?: Body;
    movingPlatformBodies: Map<string, Body>;
}

export function createPhysioParkWorld(
    level: ResolvedPhysioParkLevel,
    state: PhysioParkState,
    playerBodies: Iterable<Body>,
    onPlayerHitLava: (body: Body) => void,
): PhysioParkWorldParts {
    const world = new PhysicsWorld({ x: 0, y: GRAVITY });
    const movingPlatformBodies = new Map<string, Body>();
    let crateBody: Body | undefined;
    let buttonBody: Body | undefined;

    state.buttonPressed = false;
    state.buttonPressFrame = 0;
    state.crateDropped = false;
    state.crateX = 0;
    state.crateY = 0;
    state.movingPlatforms.clear();
    state.playerSwitches.clear();

    for (const solid of level.solids) {
        world.add(new Body(new Rect(solid.x, solid.y, solid.width, solid.height), { x: 0, y: 0 }, true));
    }

    for (const platform of level.movingPlatforms ?? []) {
        const body = world.add(new Body(
            new Rect(platform.x, platform.y, platform.width, platform.height),
            { x: 0, y: 0 }, false, false, 0, 0, true,
        ));
        movingPlatformBodies.set(platform.id, body);
        state.movingPlatforms.set(platform.id, new MovingPlatformState({
            x: platform.x,
            y: platform.y,
            active: false,
            towardEnd: true,
        }));
    }

    for (const playerSwitch of level.switches ?? []) {
        state.playerSwitches.set(playerSwitch.id, new PlayerSwitchState({ active: false }));
        world.add(new Body(
            new Rect(playerSwitch.x, playerSwitch.y, playerSwitch.width, playerSwitch.height),
            { x: 0, y: 0 }, true,
        ));
    }

    if (level.button) {
        const surface = getButtonSurface(level.button, 0);
        buttonBody = world.add(new Body(
            new Rect(surface.x, surface.y, surface.width, surface.height),
            { x: 0, y: 0 },
            true,
        ));

        const crate = level.button.crate;
        crateBody = world.add(new Body(
            new Rect(crate.x, crate.y, crate.width, crate.height),
            { x: 0, y: 0 },
            true,
        ));
        state.crateX = crate.x;
        state.crateY = crate.y;
    }

    for (const lavaArea of level.lavas) {
        const lava = world.add(
            new Body(new Rect(lavaArea.x, lavaArea.y, lavaArea.width, lavaArea.height), { x: 0, y: 0 }, true, true),
        );
        lava.tags.add("lava");
    }
    world.addOverlapRule({
        actorTag: "player",
        targetTag: "lava",
        handle: (body) => onPlayerHitLava(body),
    });

    for (const body of playerBodies) world.add(body);

    return { world, crateBody, buttonBody, movingPlatformBodies };
}
