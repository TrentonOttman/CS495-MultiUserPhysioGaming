import Phaser from "phaser";
import { Callbacks, type ColyseusSDK, type InputHandle, type Room } from "@colyseus/sdk";
import type { default as server } from "../../app.config.js";
import type { PhysioParkRoom } from "../../rooms/PhysioParkRoom.js";
import type { MoveInput, Player } from "../../rooms/schema/PhysioParkState.js";
import {
    PHYSIO_PARK_ANIMATIONS,
    type SpriteSheetAnimationDefinition,
} from "../../shared/physioPark/physioParkAnimations.js";
import { RESOLUTION_X, RESOLUTION_Y } from "../../shared/physioPark/physioParkConstants.js";
import { PHYSIO_PARK_LEVELS } from "../../shared/physioPark/physioParkLevel.js";
import type { Solid } from "../../shared/physioPark/physioParkMovement.js";
import { setupRoom } from "./roomSetup.ts";

type HorizontalMove = -1 | 0 | 1;

interface PlayerKeys {
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    jump: Phaser.Input.Keyboard.Key[];
}

export interface PhysioParkElements {
    game: HTMLElement;
    arena: HTMLElement;
    score: HTMLElement;
    status: HTMLElement;
    title: HTMLElement;
    help: HTMLElement;
    displayName?: string;
}

const PLAYER_COLORS = [
    0x7ec97e,
    0x7eb6e0,
    0xe09ad8,
    0xf2c14e,
    0xe0705a,
    0x9b7ee0,
    0x5ec4b6,
    0xd9a066,
];
const PLAYER_SNAP_DISTANCE = 16;
const SMOOTHING_MS = 40;
const CAMERA_ZOOM = 1;
const TILE_SIZE = 16;
const GAME_BACKGROUND = "#f4f1ea";

/** Renders the server-owned game state; Phaser does not run gameplay physics. */
class PhysioParkScene extends Phaser.Scene {
    private playerEntities = new Map<string, Phaser.GameObjects.Image>();
    private levelContainer: Phaser.GameObjects.Container;
    private crateSprite?: Phaser.GameObjects.Image;
    private buttonSprite?: Phaser.GameObjects.Sprite;
    private buttonAnimation?: SpriteSheetAnimationDefinition;
    private renderedButtonFrame = 0;
    private renderedLevelNumber = 0;

    private input_: InputHandle<MoveInput>;
    private keys: PlayerKeys;
    private lastSent: { moveX: HorizontalMove; jump: boolean } = { moveX: 0, jump: false };

    private hud: HTMLDivElement;
    private levelText: HTMLDivElement;
    private completionText: HTMLDivElement;

    constructor(
        private readonly room: Room<PhysioParkRoom["state"]>,
        private readonly arena: HTMLElement,
    ) {
        super("physio-park");
    }

    preload() {
        this.load.image("robo_pico", "assets/RoboPico1.png");
        this.load.image("crate16", "assets/Crate16x16.png");

        for (const animation of Object.values(PHYSIO_PARK_ANIMATIONS)) {
            this.load.spritesheet(animation.textureKey, animation.assetPath, {
                frameWidth: animation.frameWidth,
                frameHeight: animation.frameHeight,
            });
        }
    }

    create() {
        this.createConveyorAnimations();

        this.levelContainer = this.add.container(0, 0);
        this.drawLevel(this.room.state.levelNumber);
        this.cameras.main.setZoom(CAMERA_ZOOM).setRoundPixels(true);

        this.createControls();
        this.input_ = this.room.input<MoveInput>({ mode: "reliable" });
        this.sendInput(0, false);

        this.createHud();
        this.registerPlayers();
    }

    update(_time: number, delta: number) {
        this.updateLevelIfNeeded();
        this.updateInput();
        this.updateCrate();
        this.updateButtonFrame();
        this.updateHud();
        this.updatePlayerSprites(delta);
    }

    private createConveyorAnimations() {
        const conveyors = [
            PHYSIO_PARK_ANIMATIONS.conveyorLeft,
            PHYSIO_PARK_ANIMATIONS.conveyorMiddle,
            PHYSIO_PARK_ANIMATIONS.conveyorRight,
        ];

        for (const animation of conveyors) {
            this.anims.create({
                key: `${animation.textureKey}-loop`,
                frames: animation.frames.map((frame) => ({ key: animation.textureKey, frame })),
                frameRate: animation.frameRate,
                repeat: animation.repeat,
            });
        }
    }

    private createControls() {
        const keyCodes = Phaser.Input.Keyboard.KeyCodes;
        const keyboard = this.input.keyboard;

        this.keys = {
            left: [keyboard.addKey(keyCodes.A), keyboard.addKey(keyCodes.LEFT)],
            right: [keyboard.addKey(keyCodes.D), keyboard.addKey(keyCodes.RIGHT)],
            jump: [keyboard.addKey(keyCodes.W), keyboard.addKey(keyCodes.UP), keyboard.addKey(keyCodes.SPACE)],
        };
    }

    private createHud() {
        this.arena.querySelector(".physio-park-hud")?.remove();

        this.hud = document.createElement("div");
        this.hud.className = "physio-park-hud";

        this.levelText = document.createElement("div");
        this.levelText.className = "physio-park-level";
        this.setLiveRegion(this.levelText);

        this.completionText = document.createElement("div");
        this.completionText.className = "physio-park-message";
        this.setLiveRegion(this.completionText);
        this.completionText.hidden = true;

        this.hud.append(this.levelText, this.completionText);
        this.arena.append(this.hud);
        this.levelText.textContent = `Level ${this.room.state.levelNumber}`;
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud.remove());
    }

    private setLiveRegion(element: HTMLElement) {
        element.setAttribute("aria-live", "polite");
        element.setAttribute("aria-atomic", "true");
    }

    private registerPlayers() {
        const callbacks = Callbacks.get(this.room);

        callbacks.onAdd("players", (player: Player, sessionId: string) => {
            this.addPlayer(player, sessionId);
        });
        callbacks.onRemove("players", (_player: Player, sessionId: string) => {
            this.removePlayer(sessionId);
        });
    }

    private addPlayer(player: Player, sessionId: string) {
        const sprite = this.add.image(player.x, player.y, "robo_pico").setOrigin(0);
        sprite.setTint(PLAYER_COLORS[player.color % PLAYER_COLORS.length]);
        this.playerEntities.set(sessionId, sprite);

        if (sessionId === this.room.sessionId) {
            this.cameras.main.startFollow(sprite, true, 0.12, 0.12);
        }
    }

    private removePlayer(sessionId: string) {
        this.playerEntities.get(sessionId)?.destroy();
        this.playerEntities.delete(sessionId);
    }

    private updateLevelIfNeeded() {
        const levelNumber = this.room.state.levelNumber;
        if (this.renderedLevelNumber === levelNumber) return;

        this.drawLevel(levelNumber);
        this.lastSent = { moveX: 0, jump: false };
    }

    private updateInput() {
        const moveX = this.getHorizontalMove();
        const jump = this.isAnyKeyDown(this.keys.jump);

        if (moveX !== this.lastSent.moveX || jump !== this.lastSent.jump) {
            this.sendInput(moveX, jump);
        }
    }

    private getHorizontalMove(): HorizontalMove {
        const right = this.isAnyKeyDown(this.keys.right) ? 1 : 0;
        const left = this.isAnyKeyDown(this.keys.left) ? 1 : 0;
        return (right - left) as HorizontalMove;
    }

    private isAnyKeyDown(keys: Phaser.Input.Keyboard.Key[]) {
        return keys.some((key) => key.isDown);
    }

    private sendInput(moveX: HorizontalMove, jump: boolean) {
        this.input_.data.moveX = moveX;
        this.input_.data.jump = jump;
        this.input_.send();
        this.lastSent = { moveX, jump };
    }

    private updateCrate() {
        this.crateSprite?.setPosition(this.room.state.crateX + 8, this.room.state.crateY + 8);
    }

    private updateButtonFrame() {
        if (!this.buttonSprite || !this.buttonAnimation
            || this.renderedButtonFrame === this.room.state.buttonPressFrame) return;

        this.renderedButtonFrame = this.room.state.buttonPressFrame;
        const frames = this.buttonAnimation.frames;
        const frameIndex = Math.min(this.renderedButtonFrame, frames.length - 1);
        this.buttonSprite.setFrame(String(frames[frameIndex]));
    }

    private updateHud() {
        this.updateLevelText();
        this.updateCompletionText();
    }

    private updateLevelText() {
        const label = `Level ${this.room.state.levelNumber}`;
        if (this.levelText.textContent !== label) this.levelText.textContent = label;
    }

    private updateCompletionText() {
        const phase = this.room.state.levelPhase;
        const isTransitioning = phase === "transitioning";
        const message = isTransitioning
            ? "Level Complete!"
            : phase === "completed"
                ? "Game Complete!"
                : "";

        if (this.completionText.textContent !== message) {
            this.completionText.textContent = message;
        }
        this.completionText.hidden = message === "";
        this.completionText.classList.toggle("is-transitioning", isTransitioning);
    }

    private updatePlayerSprites(delta: number) {
        const smoothing = 1 - Math.exp(-delta / SMOOTHING_MS);

        for (const [sessionId, player] of this.room.state.players) {
            const sprite = this.playerEntities.get(sessionId);
            if (!sprite) continue;

            const teleported = Math.abs(player.x - sprite.x) > PLAYER_SNAP_DISTANCE
                || Math.abs(player.y - sprite.y) > PLAYER_SNAP_DISTANCE;
            if (teleported) {
                sprite.setPosition(player.x, player.y);
            } else {
                sprite.setPosition(
                    sprite.x + (player.x - sprite.x) * smoothing,
                    sprite.y + (player.y - sprite.y) * smoothing,
                );
            }

            if (player.vx < 0) sprite.setFlipX(true);
            else if (player.vx > 0) sprite.setFlipX(false);
        }
    }

    private drawLevel(levelNumber: number) {
        this.levelContainer.removeAll(true);
        this.crateSprite = undefined;
        this.buttonSprite = undefined;
        this.buttonAnimation = undefined;
        this.renderedButtonFrame = 0;

        const level = PHYSIO_PARK_LEVELS[levelNumber - 1] ?? PHYSIO_PARK_LEVELS[0];
        this.cameras.main.setBounds(0, 0, level.width, level.height);

        this.drawHazardsAndGoalArea(level);
        this.drawSolids(level.solids, level.conveyor?.surface);
        this.drawConveyor(level.conveyor?.surface);
        this.drawGoalFlag(level.goalPlatform, Boolean(level.button));
        this.drawButtonAndCrate(level);

        this.renderedLevelNumber = levelNumber;
    }

    private drawHazardsAndGoalArea(level: (typeof PHYSIO_PARK_LEVELS)[number]) {
        this.addToLevel(this.add.rectangle(
            level.lava.x,
            level.lava.y,
            level.lava.width,
            level.lava.height,
            0xe8743b,
        ).setOrigin(0));
        this.addToLevel(this.add.rectangle(
            level.goalArea.x,
            level.goalArea.y,
            level.goalArea.width,
            level.goalArea.height,
            0x33aa33,
        ).setOrigin(0).setAlpha(0.16));
    }

    private drawSolids(solids: readonly Solid[], conveyorSurface?: Solid) {
        for (const solid of solids) {
            if (conveyorSurface && sameBounds(solid, conveyorSurface)) continue;

            this.addToLevel(this.add.rectangle(
                solid.x,
                solid.y,
                solid.width,
                solid.height,
                0x555555,
            ).setOrigin(0));
        }
    }

    private drawConveyor(surface?: Solid) {
        if (!surface) return;

        const tileCount = Math.floor(surface.width / TILE_SIZE);
        for (let index = 0; index < tileCount; index++) {
            const animation = this.getConveyorAnimation(index, tileCount);
            this.addToLevel(this.add.sprite(
                surface.x + index * TILE_SIZE + TILE_SIZE / 2,
                surface.y + TILE_SIZE / 2,
                animation.textureKey,
            ).setOrigin(animation.originX, animation.originY)
                .setScale(animation.scaleX, animation.scaleY)
                .play(`${animation.textureKey}-loop`));
        }
    }

    private getConveyorAnimation(index: number, tileCount: number): SpriteSheetAnimationDefinition {
        if (index === 0) return PHYSIO_PARK_ANIMATIONS.conveyorLeft;
        if (index === tileCount - 1) return PHYSIO_PARK_ANIMATIONS.conveyorRight;
        return PHYSIO_PARK_ANIMATIONS.conveyorMiddle;
    }

    private drawGoalFlag(goalPlatform: Solid, hasButton: boolean) {
        const poleX = hasButton ? goalPlatform.x : goalPlatform.x + goalPlatform.width - 30;
        const poleTop = goalPlatform.y - 40;

        this.addToLevel(this.add.rectangle(poleX, poleTop, 4, 40, 0x333333).setOrigin(0));
        this.addToLevel(this.add.triangle(
            0,
            0,
            poleX + 4,
            poleTop,
            poleX + 24,
            poleTop + 8,
            poleX + 4,
            poleTop + 16,
            0x33aa33,
        ).setOrigin(0));
    }

    private drawButtonAndCrate(level: (typeof PHYSIO_PARK_LEVELS)[number]) {
        if (!level.button) return;

        const { position, crate } = level.button;
        const buttonAnimation = PHYSIO_PARK_ANIMATIONS[level.button.sprite];
        this.buttonAnimation = buttonAnimation;
        this.buttonSprite = this.addToLevel(this.add.sprite(
            position.x,
            position.y,
            buttonAnimation.textureKey,
        ).setOrigin(buttonAnimation.originX, buttonAnimation.originY)
            .setScale(buttonAnimation.scaleX, buttonAnimation.scaleY));

        const frames = buttonAnimation.frames;
        const frameIndex = Math.min(this.room.state.buttonPressFrame, frames.length - 1);
        this.buttonSprite.setFrame(String(frames[frameIndex]));
        this.renderedButtonFrame = frameIndex;

        this.crateSprite = this.addToLevel(this.add.image(
            this.room.state.crateX + crate.width / 2,
            this.room.state.crateY + crate.height / 2,
            "crate16",
        ).setOrigin(0.5));
    }

    private addToLevel<T extends Phaser.GameObjects.GameObject>(object: T): T {
        this.levelContainer.add(object);
        return object;
    }
}

function sameBounds(first: Solid, second: Solid) {
    return first.x === second.x
        && first.y === second.y
        && first.width === second.width
        && first.height === second.height;
}

/** Starts the Physio Park client for a room created by the application. */
export async function startPhysioPark(
    client: ColyseusSDK<typeof server>,
    roomOrId: string | Room<PhysioParkRoom>,
    elements: PhysioParkElements,
) {
    const { game, arena, score, status, title, help } = elements;
    const room = typeof roomOrId === "string"
        ? await client.joinById(roomOrId, { displayName: elements.displayName }) as unknown as Room<PhysioParkRoom["state"]>
        : roomOrId as unknown as Room<PhysioParkRoom["state"]>;
    const configuredRoom = setupRoom(room as any, "physio_park") as unknown as Room<PhysioParkRoom["state"]>;

    game.hidden = false;
    title.textContent = "Physio Park";
    score.hidden = true;
    help.textContent = "Move with A/D or the arrow keys. Jump with W, Up, or Space. Stack on each other to reach the flag; on Level 2, jump onto the red button to drop the crate.";

    const displayName = configuredRoom.state?.lobbyPlayers?.get(configuredRoom.sessionId)?.displayName
        || configuredRoom.sessionId;
    status.textContent = `Connected as ${displayName}, SessionID: ${configuredRoom.sessionId}`;

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: RESOLUTION_X,
        height: RESOLUTION_Y,
        backgroundColor: GAME_BACKGROUND,
        parent: arena,
        pixelArt: true,
        scale: {
            mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
            autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        },
        scene: [new PhysioParkScene(configuredRoom, arena)],
    };

    new Phaser.Game(config);
}
