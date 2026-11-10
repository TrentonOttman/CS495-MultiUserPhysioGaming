import type { Solid } from "./physioParkMovement.js";

export interface SpriteSheetAnimationDefinition {
    textureKey: string;
    assetPath: string;
    frameWidth: number;
    frameHeight: number;
    /** Source frame indices in playback order. */
    frames: readonly number[];
    frameRate: number;
    repeat: number;
    /** Phaser animation name; omitted for sprites advanced manually by server state. */
    animationKey?: string;
    originX: number;
    originY: number;
    scaleX: number;
    scaleY: number;
    /** Local collision rectangles keyed by source spritesheet frame. */
    collisionFrames?: readonly SpriteFrameCollision[];
}

export interface SpriteFrameCollision {
    /** Source frame index in the spritesheet, not its playback position. */
    sourceFrame: number;
    /** Collision rectangles in that frame's unscaled source-pixel coordinates. */
    shapes: readonly Solid[];
}

const conveyor = (side: "left" | "middle" | "right"): SpriteSheetAnimationDefinition => ({
    textureKey: `conveyor-${side}`,
    animationKey: `conveyor-${side}-loop`,
    assetPath: `assets/Conveyor${side[0].toUpperCase()}${side.slice(1)}Sheet.png`,
    frameWidth: 16,
    frameHeight: 16,
    frames: [0, 1],
    frameRate: 8,
    repeat: -1,
    originX: 0.5,
    originY: 0.5,
    scaleX: 1,
    scaleY: 1,
});

/** Shared sprite and animation manifest for the client renderer and server. */
export const PHYSIO_PARK_ANIMATIONS = {
    playerIdle: {
        textureKey: "idleSheet",
        assetPath: "assets/RoboPicoIdle.png",
        frameWidth: 16,
        frameHeight: 16,
        frames: [0],
        frameRate: 10,
        repeat: -1,
        animationKey: "idle",
        originX: 0,
        originY: 0,
        scaleX: 1,
        scaleY: 1,
    },
    playerWalk: {
        textureKey: "walkSheet",
        assetPath: "assets/RoboPicoWalk.png",
        frameWidth: 16,
        frameHeight: 16,
        frames: [0, 1, 2, 3, 4],
        frameRate: 10,
        repeat: -1,
        animationKey: "walk",
        originX: 0,
        originY: 0,
        scaleX: 1,
        scaleY: 1,
    },
    playerJump: {
        textureKey: "jumpSheet",
        assetPath: "assets/RoboPicoJump.png",
        frameWidth: 16,
        frameHeight: 16,
        frames: [0],
        frameRate: 10,
        repeat: -1,
        animationKey: "jump",
        originX: 0,
        originY: 0,
        scaleX: 1,
        scaleY: 1,
    },
    goalFlag: {
        textureKey: "flagSheet",
        assetPath: "assets/FlagSheet.png",
        frameWidth: 16,
        frameHeight: 16,
        frames: [0, 1, 2, 3, 4],
        frameRate: 8,
        repeat: -1,
        animationKey: "flag",
        originX: 0.5,
        originY: 1,
        scaleX: 1,
        scaleY: 1,
    },
    switchActivate: {
        textureKey: "switchSheet",
        assetPath: "assets/Switch.png",
        frameWidth: 16,
        frameHeight: 16,
        frames: [0, 1, 2, 3, 4],
        frameRate: 16,
        repeat: 0,
        animationKey: "switch-activate",
        originX: 0.5,
        originY: 0.5,
        scaleX: 1,
        scaleY: 1,
    },
    switchDeactivate: {
        textureKey: "switchSheet",
        assetPath: "assets/Switch.png",
        frameWidth: 16,
        frameHeight: 16,
        frames: [4, 3, 2, 1, 0],
        frameRate: 16,
        repeat: 0,
        animationKey: "switch-deactivate",
        originX: 0.5,
        originY: 0.5,
        scaleX: 1,
        scaleY: 1,
    },
    conveyorLeft: conveyor("left"),
    conveyorMiddle: conveyor("middle"),
    conveyorRight: conveyor("right"),
    buttonPress: {
        textureKey: "red-button",
        assetPath: "assets/RedButton-sheet.png",
        frameWidth: 16,
        frameHeight: 16,
        // Playback order is kept separate from source-frame collider lookup.
        frames: [0, 1, 2, 3],
        frameRate: 12,
        repeat: 0,
        // The sprite is positioned by its bottom-center at native pixel scale.
        originX: 0.5,
        originY: 1,
        scaleX: 1,
        scaleY: 1,
        // Pixel bounds follow the visible 10px-wide cap down to the sprite base.
        // Frame-local shapes live beside the art and can be reused by any level.
        collisionFrames: [
            { sourceFrame: 0, shapes: [{ x: 3, y: 5, width: 10, height: 11 }] },
            { sourceFrame: 1, shapes: [{ x: 3, y: 7, width: 10, height: 9 }] },
            { sourceFrame: 2, shapes: [{ x: 3, y: 9, width: 10, height: 7 }] },
            { sourceFrame: 3, shapes: [{ x: 3, y: 10, width: 10, height: 6 }] },
        ],
    },
} as const satisfies Record<string, SpriteSheetAnimationDefinition>;

export type PhysioParkAnimationKey = keyof typeof PHYSIO_PARK_ANIMATIONS;

/** Keys limited to sprites that declare source-frame collision shapes. */
export type PhysioParkCollidableSpriteKey = {
    [Key in PhysioParkAnimationKey]:
        typeof PHYSIO_PARK_ANIMATIONS[Key] extends { collisionFrames: readonly SpriteFrameCollision[] }
            ? Key
            : never
}[PhysioParkAnimationKey];

/** Transform all collision shapes for a sprite's current playback frame into world space. */
export function getSpriteCollisionRects(
    sprite: SpriteSheetAnimationDefinition,
    position: { x: number; y: number },
    playbackFrame: number,
): Solid[] {
    if (sprite.frames.length === 0) return [];

    const frameIndex = Math.max(0, Math.min(Math.trunc(playbackFrame), sprite.frames.length - 1));
    const sourceFrame = sprite.frames[frameIndex];
    const collisionFrame = sprite.collisionFrames?.find((entry) => entry.sourceFrame === sourceFrame);
    if (sprite.collisionFrames && !collisionFrame) {
        throw new Error(`Missing collision data for source frame ${sourceFrame}`);
    }
    const localShapes = collisionFrame?.shapes ?? [];
    const spriteLeft = position.x - sprite.originX * sprite.frameWidth * sprite.scaleX;
    const spriteTop = position.y - sprite.originY * sprite.frameHeight * sprite.scaleY;

    return localShapes.map((shape) => ({
        x: spriteLeft + shape.x * sprite.scaleX,
        y: spriteTop + shape.y * sprite.scaleY,
        width: shape.width * sprite.scaleX,
        height: shape.height * sprite.scaleY,
    }));
}
