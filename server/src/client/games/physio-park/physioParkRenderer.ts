import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";
import type { PhysioParkRoom } from "../../../rooms/PhysioParkRoom.js";
import {
    PHYSIO_PARK_ANIMATIONS,
    type SpriteSheetAnimationDefinition,
} from "../../../shared/physioPark/physioParkAnimations.js";
import { PHYSIO_PARK_LEVELS } from "../../../shared/physioPark/physioParkLevel.js";
import type { GoalFlagOffset, LevelTile } from "../../../shared/physioPark/levels/types.js";
import type { Solid } from "../../../shared/physioPark/physioParkMovement.js";
import { PLAYER_COLORS } from "./physioParkPalette.js";

type PhysioParkClientRoom = Room<PhysioParkRoom["state"]>;
type SwitchView = {
    sprite: Phaser.GameObjects.Sprite;
    x: number;
    y: number;
    playerColor: number;
    hitSequence: number;
};
type MovingPlatformView = {
    object: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    width: number;
    height: number;
};

const TILE_SIZE = 16;

/** Draws LDtk-authored levels and projects the server's dynamic object state. */
export class PhysioParkRenderer {
    private readonly levelContainer: Phaser.GameObjects.Container;
    private crateSprite?: Phaser.GameObjects.Image;
    private buttonSprite?: Phaser.GameObjects.Sprite;
    private buttonAnimation?: SpriteSheetAnimationDefinition;
    private renderedButtonFrame = 0;
    private readonly movingPlatformSprites = new Map<string, MovingPlatformView>();
    private readonly playerSwitchSprites = new Map<string, SwitchView>();

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly room: PhysioParkClientRoom,
        private readonly worldCamera: Phaser.Cameras.Scene2D.Camera,
        private readonly uiCamera: Phaser.Cameras.Scene2D.Camera,
    ) {
        this.levelContainer = scene.add.container(0, 0);
        uiCamera.ignore(this.levelContainer);
    }

    update() {
        this.crateSprite?.setPosition(this.room.state.crateX + 8, this.room.state.crateY + 8);
        this.updateButtonFrame();
        this.updateMovingObjects();
    }

    drawLevel(levelNumber: number) {
        this.levelContainer.removeAll(true);
        this.crateSprite = undefined;
        this.buttonSprite = undefined;
        this.buttonAnimation = undefined;
        this.movingPlatformSprites.clear();
        this.playerSwitchSprites.clear();
        this.renderedButtonFrame = 0;

        const level = PHYSIO_PARK_LEVELS[levelNumber - 1] ?? PHYSIO_PARK_LEVELS[0];
        this.worldCamera.setBounds(0, 0, level.width, level.height);
        const conveyors = level.conveyors ?? [];
        const conveyorSurfaces = conveyors.map((conveyor) => conveyor.surface);
        if (level.background) {
            this.addToLevel(this.scene.add.image(0, 0, `levelBackground-${level.id}`)
                .setOrigin(0)
                .setDisplaySize(level.width, level.height));
        }
        this.drawHazardsAndGoalArea(level);
        if (level.tiles?.length) this.drawAuthoredTiles(level.tiles);
        else this.drawSolids(level.solids, conveyorSurfaces);
        for (const conveyor of conveyors) this.drawConveyor(conveyor.surface);
        if (level.goalFlagPosition) this.drawGoalFlagAt(level.goalFlagPosition);
        else if (level.goalPlatform && level.goalFlagOffset) this.drawGoalFlag(level.goalPlatform, level.goalFlagOffset);
        this.drawMovingObjects(level);
        this.drawButtonAndCrate(level);
    }

    private updateMovingObjects() {
        for (const [id, view] of this.movingPlatformSprites) {
            const state = this.room.state.movingPlatforms.get(id);
            if (state) view.object.setPosition(state.x + view.width / 2, state.y + view.height / 2);
        }
        for (const [id, switchView] of this.playerSwitchSprites) {
            const state = this.room.state.playerSwitches.get(id);
            if (!state) continue;
            switchView.sprite.setTint(switchView.playerColor).setAlpha(state.active ? 1 : 0.7);
            if (state.hitSequence !== switchView.hitSequence) {
                switchView.hitSequence = state.hitSequence;
                this.animateSwitchHit(switchView, state.active);
            }
        }
    }

    private animateSwitchHit(switchView: SwitchView, activated: boolean) {
        const { sprite, x, y } = switchView;
        const animation = activated
            ? PHYSIO_PARK_ANIMATIONS.switchActivate
            : PHYSIO_PARK_ANIMATIONS.switchDeactivate;
        this.scene.tweens.killTweensOf(sprite);
        sprite.setPosition(x, y).play(animation.animationKey!);
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            const restingFrame = animation.frames[animation.frames.length - 1];
            sprite.setFrame(String(restingFrame));
        });
        this.scene.tweens.add({
            targets: sprite,
            y: y - 2,
            duration: 35,
            yoyo: true,
            repeat: 2,
            ease: "Sine.easeInOut",
            onComplete: () => sprite.setY(y),
        });
    }

    private updateButtonFrame() {
        if (!this.buttonSprite || !this.buttonAnimation
            || this.renderedButtonFrame === this.room.state.buttonPressFrame) return;

        this.renderedButtonFrame = this.room.state.buttonPressFrame;
        const frames = this.buttonAnimation.frames;
        const frameIndex = Math.min(this.renderedButtonFrame, frames.length - 1);
        this.buttonSprite.setFrame(String(frames[frameIndex]));
    }

    private drawHazardsAndGoalArea(level: (typeof PHYSIO_PARK_LEVELS)[number]) {
        if (!level.tiles?.length) {
            for (const lavaArea of level.lavas) {
                this.addToLevel(this.scene.add.rectangle(
                    lavaArea.x,
                    lavaArea.y,
                    lavaArea.width,
                    lavaArea.height,
                    0xe8743b,
                ).setOrigin(0));
            }
        }
        this.addToLevel(this.scene.add.rectangle(
            level.goalArea.x,
            level.goalArea.y,
            level.goalArea.width,
            level.goalArea.height,
            0x33aa33,
        ).setOrigin(0).setAlpha(0.16));
    }

    private drawSolids(solids: readonly Solid[], conveyorSurfaces: readonly Solid[] = []) {
        for (const solid of solids) {
            if (conveyorSurfaces.some((surface) => sameBounds(solid, surface))) continue;
            this.addToLevel(this.scene.add.rectangle(
                solid.x,
                solid.y,
                solid.width,
                solid.height,
                0x555555,
            ).setOrigin(0));
        }
    }

    private drawAuthoredTiles(tiles: readonly LevelTile[]) {
        for (const tile of tiles) {
            const frameName = `${tile.sourceX}_${tile.sourceY}_${tile.size}`;
            const texture = this.scene.textures.get(tile.tileset);
            if (!texture.has(frameName)) {
                texture.add(frameName, 0, tile.sourceX, tile.sourceY, tile.size, tile.size);
            }
            this.addToLevel(this.scene.add.image(tile.x + tile.size / 2, tile.y + tile.size / 2, tile.tileset, frameName)
                .setFlip(tile.flipX ?? false, tile.flipY ?? false));
        }
    }

    private drawConveyor(surface?: Solid) {
        if (!surface) return;
        const tileCount = Math.floor(surface.width / TILE_SIZE);
        for (let index = 0; index < tileCount; index++) {
            const animation = this.getConveyorAnimation(index, tileCount);
            this.addToLevel(this.scene.add.sprite(
                surface.x + index * TILE_SIZE + TILE_SIZE / 2,
                surface.y + TILE_SIZE / 2,
                animation.textureKey,
            ).setOrigin(animation.originX, animation.originY)
                .setScale(animation.scaleX, animation.scaleY)
                .play(animation.animationKey!));
        }
    }

    private getConveyorAnimation(index: number, tileCount: number): SpriteSheetAnimationDefinition {
        if (index === 0) return PHYSIO_PARK_ANIMATIONS.conveyorLeft;
        if (index === tileCount - 1) return PHYSIO_PARK_ANIMATIONS.conveyorRight;
        return PHYSIO_PARK_ANIMATIONS.conveyorMiddle;
    }

    private drawGoalFlag(goalPlatform: Solid, offset: GoalFlagOffset) {
        this.drawGoalFlagAt({ x: goalPlatform.x + offset.x, y: goalPlatform.y + offset.y });
    }

    private drawGoalFlagAt(position: { x: number; y: number }) {
        const { x: poleX, y: poleY } = position;
        const flag = PHYSIO_PARK_ANIMATIONS.goalFlag;
        this.addToLevel(this.scene.add.image(poleX, poleY, "flagPole").setOrigin(0.5, 1));
        this.addToLevel(this.scene.add.sprite(poleX, poleY - flag.frameHeight, flag.textureKey)
            .setOrigin(flag.originX, flag.originY)
            .setScale(flag.scaleX, flag.scaleY)
            .play(flag.animationKey!));
    }

    private drawButtonAndCrate(level: (typeof PHYSIO_PARK_LEVELS)[number]) {
        if (!level.button) return;
        const { position, crate } = level.button;
        const animation = PHYSIO_PARK_ANIMATIONS[level.button.sprite];
        this.buttonAnimation = animation;
        this.buttonSprite = this.addToLevel(this.scene.add.sprite(position.x, position.y, animation.textureKey)
            .setOrigin(animation.originX, animation.originY)
            .setScale(animation.scaleX, animation.scaleY));

        const frameIndex = Math.min(this.room.state.buttonPressFrame, animation.frames.length - 1);
        this.buttonSprite.setFrame(String(animation.frames[frameIndex]));
        this.renderedButtonFrame = frameIndex;
        this.crateSprite = this.addToLevel(this.scene.add.image(
            this.room.state.crateX + crate.width / 2,
            this.room.state.crateY + crate.height / 2,
            "crate16",
        ).setOrigin(0.5));
    }

    private drawMovingObjects(level: (typeof PHYSIO_PARK_LEVELS)[number]) {
        for (const platform of level.movingPlatforms ?? []) {
            const textureKey = platform.type.trim().toLowerCase() === "stone"
                ? platform.width === 16 && platform.height === 16
                    ? "moving-platform-stone-16"
                    : platform.width === 24 && platform.height === 24
                        ? "moving-platform-stone-24"
                        : undefined
                : undefined;

            if (textureKey && this.scene.textures.exists(textureKey)) {
                const image = this.addToLevel(this.scene.add.image(
                    platform.x + platform.width / 2,
                    platform.y + platform.height / 2,
                    textureKey,
                ).setDisplaySize(platform.width, platform.height));
                this.movingPlatformSprites.set(platform.id, {
                    object: image,
                    width: platform.width,
                    height: platform.height,
                });
                continue;
            }

            const color = platform.type.toLowerCase() === "wood" ? 0x9a714d : 0x9ca3af;
            const sprite = this.addToLevel(this.scene.add.rectangle(
                platform.x + platform.width / 2,
                platform.y + platform.height / 2,
                platform.width,
                platform.height,
                color,
            ).setStrokeStyle(1, 0x263238, 0.8));
            this.movingPlatformSprites.set(platform.id, {
                object: sprite,
                width: platform.width,
                height: platform.height,
            });
        }
        for (const playerSwitch of level.switches ?? []) {
            const playerColor = PLAYER_COLORS[playerSwitch.player % PLAYER_COLORS.length];
            const x = playerSwitch.x + playerSwitch.width / 2;
            const y = playerSwitch.y + playerSwitch.height / 2;
            const animation = PHYSIO_PARK_ANIMATIONS.switchActivate;
            const sprite = this.addToLevel(this.scene.add.sprite(x, y, animation.textureKey, "0")
                .setTint(playerColor)
                .setAlpha(0.7));
            this.playerSwitchSprites.set(playerSwitch.id, { sprite, x, y, playerColor, hitSequence: 0 });
        }
    }

    private addToLevel<T extends Phaser.GameObjects.GameObject>(object: T): T {
        this.levelContainer.add(object);
        this.uiCamera.ignore(object);
        return object;
    }
}

function sameBounds(first: Solid, second: Solid) {
    return first.x === second.x
        && first.y === second.y
        && first.width === second.width
        && first.height === second.height;
}
