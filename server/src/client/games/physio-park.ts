import Phaser from "phaser";
import { Callbacks, type ColyseusSDK, type InputHandle, type Room } from "@colyseus/sdk";
import type { default as server } from "../../app.config.js";
import type { PhysioParkRoom } from "../../rooms/PhysioParkRoom.js";
import type { MoveInput, Player } from "../../rooms/schema/PhysioParkState.js";
import {
    PHYSIO_PARK_ANIMATIONS,
    type SpriteSheetAnimationDefinition,
} from "../../shared/physioPark/physioParkAnimations.js";
import { RESOLUTION_X, RESOLUTION_Y, TICK_RATE } from "../../shared/physioPark/physioParkConstants.js";
import { PHYSIO_PARK_LEVELS } from "../../shared/physioPark/physioParkLevel.js";
import type { Solid } from "../../shared/physioPark/physioParkMovement.js";
import { getPeak } from "../../sensor/sensorData.js";
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

const RENDER_SCALE = 4;
const UI_RESOLUTION_X = RESOLUTION_X * RENDER_SCALE;
const UI_RESOLUTION_Y = RESOLUTION_Y * RENDER_SCALE;
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
const TILE_SIZE = 16;
const JUMP_SENSOR_THRESHOLD = 0.00001;
const STEP_MS = 1000 / TICK_RATE;
const MAX_STEPS_PER_FRAME = 5;
const GAME_BACKGROUND = "#f4f1ea";

/** Renders server-owned game state; Phaser does not run gameplay physics. */
class PhysioParkScene extends Phaser.Scene {
    private readonly playerEntities = new Map<string, Phaser.GameObjects.Sprite>();
    private levelContainer: Phaser.GameObjects.Container;
    private crateSprite?: Phaser.GameObjects.Image;
    private buttonSprite?: Phaser.GameObjects.Sprite;
    private buttonAnimation?: SpriteSheetAnimationDefinition;
    private renderedButtonFrame = 0;
    private renderedLevelNumber = 0;

    private worldCamera!: Phaser.Cameras.Scene2D.Camera;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;
    private ui!: Phaser.GameObjects.Container;
    private levelText: Phaser.GameObjects.Text;
    private completionText: Phaser.GameObjects.Text;

    private input_: InputHandle<MoveInput>;
    private keys: PlayerKeys;
    private inputAccumulator = 0;

    constructor(
        private readonly room: Room<PhysioParkRoom["state"]>,
    ) {
        super("physio-park");
    }

    preload() {
        this.load.spritesheet("idleSheet", "assets/RoboPicoIdle.png", { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("walkSheet", "assets/RoboPicoWalk.png", { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("jumpSheet", "assets/RoboPicoJump.png", { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("flagSheet", "assets/FlagSheet.png", { frameWidth: 16, frameHeight: 16 });
        this.load.image("flagPole", "assets/FlagPole.png");
        this.load.image("crate16", "assets/Crate16x16.png");

        for (const animation of Object.values(PHYSIO_PARK_ANIMATIONS)) {
            this.load.spritesheet(animation.textureKey, animation.assetPath, {
                frameWidth: animation.frameWidth,
                frameHeight: animation.frameHeight,
            });
        }
    }

    create() {
        this.createAnimations();

        this.worldCamera = this.cameras.main.setZoom(RENDER_SCALE).setRoundPixels(true);
        this.worldCamera.centerOn(RESOLUTION_X / 2, RESOLUTION_Y / 2);
        this.uiCamera = this.cameras.add(0, 0, UI_RESOLUTION_X, UI_RESOLUTION_Y);
        this.ui = this.add.container(0, 0);
        this.worldCamera.ignore(this.ui);
        this.createHud();

        this.levelContainer = this.add.container(0, 0);
        this.uiCamera.ignore(this.levelContainer);
        this.drawLevel(this.room.state.levelNumber);
        this.createControls();
        this.input_ = this.room.input<MoveInput>({ mode: "reliable" });

        const callbacks = Callbacks.get(this.room);
        callbacks.onAdd("players", (player: Player, sessionId: string) => this.addPlayer(player, sessionId));
        callbacks.onRemove("players", (_player: Player, sessionId: string) => this.removePlayer(sessionId));
    }

    update(_time: number, delta: number) {
        this.updateLevelIfNeeded();
        this.updateInput(delta);
        this.updateCrate();
        this.updateButtonFrame();
        this.updateHud();
        this.updatePlayerSprites(delta);
    }

    private createAnimations() {
        for (const animation of Object.values(PHYSIO_PARK_ANIMATIONS)) {
            if (!animation.textureKey.startsWith("conveyor-")) continue;
            this.anims.create({
                key: `${animation.textureKey}-loop`,
                frames: animation.frames.map((frame) => ({ key: animation.textureKey, frame })),
                frameRate: animation.frameRate,
                repeat: animation.repeat,
            });
        }

        this.anims.create({
            key: "idle",
            frames: this.anims.generateFrameNumbers("idleSheet", { start: 0, end: 0 }),
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: "walk",
            frames: this.anims.generateFrameNumbers("walkSheet", { start: 0, end: 4 }),
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: "jump",
            frames: this.anims.generateFrameNumbers("jumpSheet", { start: 0, end: 0 }),
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: "flag",
            frames: this.anims.generateFrameNumbers("flagSheet", { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1,
        });
    }

    private createHud() {
        this.levelText = this.add.text(24, 18, "", {
            fontFamily: "sans-serif",
            fontSize: "28px",
            color: "#222222",
            backgroundColor: "#f4f1eacc",
            padding: { x: 10, y: 6 },
        });
        this.completionText = this.add.text(UI_RESOLUTION_X / 2, UI_RESOLUTION_Y / 2, "", {
            fontFamily: "sans-serif",
            fontSize: "64px",
            fontStyle: "bold",
            color: "#2e7d32",
            backgroundColor: "#f4f1eacc",
            padding: { x: 18, y: 12 },
        }).setOrigin(0.5).setVisible(false);
        this.ui.add([this.levelText, this.completionText]);
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

    private addPlayer(player: Player, sessionId: string) {
        const sprite = this.addWorld(this.add.sprite(player.x, player.y, "idleSheet").setOrigin(0));
        sprite.setTint(PLAYER_COLORS[player.color % PLAYER_COLORS.length]);
        sprite.play("idle");
        this.playerEntities.set(sessionId, sprite);

        if (sessionId === this.room.sessionId) {
            this.worldCamera.startFollow(sprite, true, 0.12, 0.12);
        }
    }

    private removePlayer(sessionId: string) {
        this.playerEntities.get(sessionId)?.destroy();
        this.playerEntities.delete(sessionId);
    }

    private updateLevelIfNeeded() {
        const levelNumber = this.room.state.levelNumber;
        if (this.renderedLevelNumber === levelNumber) return;
        this.inputAccumulator = 0;
        this.drawLevel(levelNumber);
    }

    private updateInput(delta: number) {
        const moveX = this.getHorizontalMove();
        const jump = this.isAnyKeyDown(this.keys.jump) || getPeak() > JUMP_SENSOR_THRESHOLD;

        this.inputAccumulator = Math.min(
            this.inputAccumulator + delta,
            STEP_MS * MAX_STEPS_PER_FRAME,
        );
        while (this.inputAccumulator >= STEP_MS) {
            this.sendInput(moveX, jump);
            this.inputAccumulator -= STEP_MS;
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
        this.levelText.setText(`Level ${this.room.state.levelNumber}`);
        const phase = this.room.state.levelPhase;
        this.completionText
            .setText(phase === "transitioning" ? "Level Complete!" : phase === "completed" ? "Game Complete!" : "")
            .setVisible(phase !== "playing");
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

            const moving = Math.abs(player.vx) >= 0.0001;
            if (moving) sprite.setFlipX(player.vx < 0);
            const animation = player.timeSinceGrounded > 0 ? "jump" : moving ? "walk" : "idle";
            sprite.play(animation, true);
        }
    }

    private drawLevel(levelNumber: number) {
        this.levelContainer.removeAll(true);
        this.crateSprite = undefined;
        this.buttonSprite = undefined;
        this.buttonAnimation = undefined;
        this.renderedButtonFrame = 0;

        const level = PHYSIO_PARK_LEVELS[levelNumber - 1] ?? PHYSIO_PARK_LEVELS[0];
        this.worldCamera.setBounds(0, 0, level.width, level.height);
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
        const poleX = hasButton ? goalPlatform.x + 8 : goalPlatform.x + goalPlatform.width - 8;
        this.addToLevel(this.add.image(poleX, goalPlatform.y, "flagPole").setOrigin(0.5, 1));
        this.addToLevel(this.add.sprite(poleX, goalPlatform.y - 16, "flagSheet")
            .setOrigin(0.5, 1)
            .play("flag"));
    }

    private drawButtonAndCrate(level: (typeof PHYSIO_PARK_LEVELS)[number]) {
        if (!level.button) return;
        const { position, crate } = level.button;
        const animation = PHYSIO_PARK_ANIMATIONS[level.button.sprite];
        this.buttonAnimation = animation;
        this.buttonSprite = this.addToLevel(this.add.sprite(position.x, position.y, animation.textureKey)
            .setOrigin(animation.originX, animation.originY)
            .setScale(animation.scaleX, animation.scaleY));

        const frameIndex = Math.min(this.room.state.buttonPressFrame, animation.frames.length - 1);
        this.buttonSprite.setFrame(String(animation.frames[frameIndex]));
        this.renderedButtonFrame = frameIndex;
        this.crateSprite = this.addToLevel(this.add.image(
            this.room.state.crateX + crate.width / 2,
            this.room.state.crateY + crate.height / 2,
            "crate16",
        ).setOrigin(0.5));
    }

    private addWorld<T extends Phaser.GameObjects.GameObject>(object: T): T {
        this.uiCamera.ignore(object);
        return object;
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

/** Starts the Physio Park client for an existing or newly joined room. */
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
        width: UI_RESOLUTION_X,
        height: UI_RESOLUTION_Y,
        backgroundColor: GAME_BACKGROUND,
        parent: arena,
        pixelArt: true,
        scale: {
            mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
            autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        },
        scene: [new PhysioParkScene(configuredRoom)],
    };

    new Phaser.Game(config);
}
