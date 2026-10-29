import Phaser from "phaser";
import { Callbacks, type ColyseusSDK, type InputHandle, type Room } from "@colyseus/sdk";
import type { default as server } from "../../../app.config.js";
import type { PhysioParkRoom } from "../../../rooms/PhysioParkRoom.js";
import type { MoveInput, Player } from "../../../rooms/schema/PhysioParkState.js";
import {
    PHYSIO_PARK_ANIMATIONS,
    type SpriteSheetAnimationDefinition,
} from "../../../shared/physioPark/physioParkAnimations.js";
import { RESOLUTION_X, RESOLUTION_Y, TICK_RATE } from "../../../shared/physioPark/physioParkConstants.js";
import { PHYSIO_PARK_LEVELS } from "../../../shared/physioPark/physioParkLevel.js";
import { setupRoom } from "../roomSetup.ts";
import { getSensitivity, getPeak } from "../../../sensor/sensorData.js";
import { PhysioParkHud } from "./physioParkHud.js";
import { PhysioParkRenderer } from "./physioParkRenderer.js";
import { PLAYER_COLORS } from "./physioParkPalette.js";

export interface PhysioParkElements {
    game: HTMLElement;
    arena: HTMLElement;
    score: HTMLElement;
    status: HTMLElement;
    title: HTMLElement;
    help: HTMLElement;
    displayName?: string;
}

type HorizontalMove = -1 | 0 | 1;

interface PlayerKeys {
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    jump: Phaser.Input.Keyboard.Key[];
}

const RENDER_SCALE = 4;
const FOLLOW_CAMERA_ZOOM = 1.0;
const UI_RESOLUTION_X = RESOLUTION_X * RENDER_SCALE;
const UI_RESOLUTION_Y = RESOLUTION_Y * RENDER_SCALE;
const PLAYER_SNAP_DISTANCE = 16;
const SMOOTHING_MS = 40;

/** Milliseconds per simulation tick. The client sends exactly one input per tick. */
const STEP_MS = 1000 / TICK_RATE;
const MAX_STEPS_PER_FRAME = 5;
const GAME_BACKGROUND = "#f4f1ea";

/** Renders server-owned game state; Phaser does not run gameplay physics. */
class PhysioParkScene extends Phaser.Scene {
    private readonly playerEntities = new Map<string, Phaser.GameObjects.Sprite>();
    private levelRenderer!: PhysioParkRenderer;
    private renderedLevelNumber = 0;

    private worldCamera!: Phaser.Cameras.Scene2D.Camera;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;
    private ui!: Phaser.GameObjects.Container;
    private hud!: PhysioParkHud;

    private input_: InputHandle<MoveInput>;
    private keys: PlayerKeys;
    private inputAccumulator = 0;

    constructor(private readonly room: Room<PhysioParkRoom["state"]>) {
        super("physio-park");
    }

    preload() {
        this.load.image("flagPole", "assets/FlagPole.png");
        this.load.image("crate16", "assets/Crate16x16.png");
        this.load.image("moving-platform-stone-16", "assets/Stone16x16.png");
        this.load.image("moving-platform-stone-24", "assets/Stone24x24.png");
        for (const level of PHYSIO_PARK_LEVELS) {
            if (level.background) this.load.image(`levelBackground-${level.id}`, level.background);
        }

        const spriteSheets = new Map<string, SpriteSheetAnimationDefinition>();
        for (const animation of Object.values(PHYSIO_PARK_ANIMATIONS)) {
            spriteSheets.set(animation.textureKey, animation);
        }
        for (const animation of spriteSheets.values()) {
            this.load.spritesheet(animation.textureKey, animation.assetPath, {
                frameWidth: animation.frameWidth,
                frameHeight: animation.frameHeight,
            });
        }
        const tilesets = new Map<string, string>();
        for (const level of PHYSIO_PARK_LEVELS) {
            for (const [key, url] of Object.entries(level.tilesets ?? {})) tilesets.set(key, url);
        }
        for (const [key, url] of tilesets) this.load.image(key, url);
    }

    create() {
        this.createAnimations();

        this.worldCamera = this.cameras.main
            .setZoom(RENDER_SCALE * FOLLOW_CAMERA_ZOOM)
            .setRoundPixels(true);
        this.worldCamera.centerOn(RESOLUTION_X / 2, RESOLUTION_Y / 2);
        this.uiCamera = this.cameras.add(0, 0, UI_RESOLUTION_X, UI_RESOLUTION_Y);
        this.ui = this.add.container(0, 0);
        this.worldCamera.ignore(this.ui);
        this.hud = new PhysioParkHud(this, this.ui, UI_RESOLUTION_X, UI_RESOLUTION_Y);
        this.hud.update(this.room.state.levelNumber, this.room.state.levelPhase);

        this.levelRenderer = new PhysioParkRenderer(this, this.room, this.worldCamera, this.uiCamera);
        this.levelRenderer.drawLevel(this.room.state.levelNumber);
        this.renderedLevelNumber = this.room.state.levelNumber;
        this.createControls();
        this.input_ = this.room.input<MoveInput>({ mode: "reliable" });

        const callbacks = Callbacks.get(this.room);
        callbacks.onAdd("players", (player: Player, sessionId: string) => this.addPlayer(player, sessionId));
        callbacks.onRemove("players", (_player: Player, sessionId: string) => this.removePlayer(sessionId));
    }

    update(_time: number, delta: number) {
        this.updateLevelIfNeeded();
        this.updateInput(delta);
        this.levelRenderer.update();
        this.hud.update(this.room.state.levelNumber, this.room.state.levelPhase);
        this.updatePlayerSprites(delta);
    }

    private createAnimations() {
        for (const animation of Object.values(PHYSIO_PARK_ANIMATIONS) as SpriteSheetAnimationDefinition[]) {
            if (!animation.animationKey) continue;
            this.anims.create({
                key: animation.animationKey,
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

    private addPlayer(player: Player, sessionId: string) {
        const idle = PHYSIO_PARK_ANIMATIONS.playerIdle;
        const sprite = this.addWorld(this.add.sprite(player.x, player.y, idle.textureKey)
            .setOrigin(idle.originX, idle.originY)
            .setScale(idle.scaleX, idle.scaleY));
        sprite.setTint(PLAYER_COLORS[player.color % PLAYER_COLORS.length]);
        sprite.play(idle.animationKey!);
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
        this.levelRenderer.drawLevel(levelNumber);
        this.renderedLevelNumber = levelNumber;
    }

    private updateInput(delta: number) {
        const moveX = this.getHorizontalMove();
        const jumpThreshold = getSensitivity();
        const jump = this.isAnyKeyDown(this.keys.jump) || getPeak() > jumpThreshold;

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
            const animation = player.timeSinceGrounded > 0
                ? PHYSIO_PARK_ANIMATIONS.playerJump.animationKey!
                : moving
                    ? PHYSIO_PARK_ANIMATIONS.playerWalk.animationKey!
                    : PHYSIO_PARK_ANIMATIONS.playerIdle.animationKey!;
            sprite.play(animation, true);
        }
    }

    private addWorld<T extends Phaser.GameObjects.GameObject>(object: T): T {
        this.uiCamera.ignore(object);
        return object;
    }
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
    help.textContent = "Move with A/D or the arrow keys. Jump with W, Up, or Space. Stack on each other to reach the flag. On Level 2, press the red button to drop the crate. On Level 3, hit your switch from below to toggle its moving platform.";
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
