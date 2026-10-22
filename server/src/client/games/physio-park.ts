import Phaser from "phaser";
import { Callbacks, type ColyseusSDK, type Room, type InputHandle } from "@colyseus/sdk";
import type { default as server } from "../../app.config.js";
import type { PhysioParkRoom } from "../../rooms/PhysioParkRoom.js";
import type { MoveInput, Player } from "../../rooms/schema/PhysioParkState.js";
import { RESOLUTION_X, RESOLUTION_Y } from "../../shared/physioPark/physioParkConstants.js";
import { PHYSIO_PARK_LEVELS } from "../../shared/physioPark/physioParkLevel.js";
import { setupRoom } from "./roomSetup.ts";

export interface PhysioParkElements {
    game: HTMLElement;
    arena: HTMLElement;
    score: HTMLElement;
    status: HTMLElement;
    title: HTMLElement;
    help: HTMLElement;
    displayName?: string;

}

/** One color per player slot (placeholders until the character sprites land). */
const PLAYER_COLORS = [0x7ec97e, 0x7eb6e0, 0xe09ad8, 0xf2c14e, 0xe0705a, 0x9b7ee0, 0x5ec4b6, 0xd9a066];

/**
 * How quickly a drawn player catches up to its latest server position. The
 * server sends 30 updates a second; easing toward each one keeps movement
 * smooth between them.
 */
const SMOOTHING_MS = 40;
const CAMERA_ZOOM = 1.5;

/**
 * Draws the game. It does not simulate anything: the server runs the shared
 * platformer physics and this scene only draws players where the server says
 * they are. That is why it uses plain shapes (`this.add`) and never enables
 * Phaser's arcade physics, which would fight the server for control.
 */
class PhysioParkScene extends Phaser.Scene {
    private room: Room<PhysioParkRoom["state"]>;
    private arena: HTMLElement;
    private input_: InputHandle<MoveInput>;
    private levelText: HTMLDivElement;
    private completionText: HTMLDivElement;
    private hud: HTMLDivElement;
    private levelContainer: Phaser.GameObjects.Container;
    private renderedLevelNumber = 0;

    private playerEntities = new Map<string, any>();

    private keys: {
        left: Phaser.Input.Keyboard.Key[];
        right: Phaser.Input.Keyboard.Key[];
        jump: Phaser.Input.Keyboard.Key[];
    };

    /** The last input sent, so a new one is only sent when it changes. */
    private lastSent = { moveX: 0, jump: false };

    constructor(room: Room<PhysioParkRoom["state"]>, arena: HTMLElement) {
        super("physio-park");
        this.room = room;
        this.arena = arena;
    }

    preload() {
        this.load.image('robo_pico', 'assets/RoboPico1.png');
    }

    create() {
        this.levelContainer = this.add.container(0, 0);
        this.drawLevel(this.room.state.levelNumber);
        this.cameras.main.setZoom(CAMERA_ZOOM).setRoundPixels(true);

        const K = Phaser.Input.Keyboard.KeyCodes;
        const kb = this.input.keyboard;
        this.keys = {
            left: [kb.addKey(K.A), kb.addKey(K.LEFT)],
            right: [kb.addKey(K.D), kb.addKey(K.RIGHT)],
            jump: [kb.addKey(K.W), kb.addKey(K.UP), kb.addKey(K.SPACE)],
        };

        this.input_ = this.room.input<MoveInput>({ mode: "reliable" });
        this.sendInput(0, false);

        this.arena.querySelector(".physio-park-hud")?.remove();
        this.hud = document.createElement("div");
        this.hud.className = "physio-park-hud";
        this.levelText = document.createElement("div");
        this.levelText.className = "physio-park-level";
        this.levelText.setAttribute("aria-live", "polite");
        this.levelText.setAttribute("aria-atomic", "true");
        this.completionText = document.createElement("div");
        this.completionText.className = "physio-park-message";
        this.completionText.setAttribute("aria-live", "polite");
        this.completionText.setAttribute("aria-atomic", "true");
        this.completionText.hidden = true;
        this.hud.append(this.levelText, this.completionText);
        this.arena.append(this.hud);
        this.levelText.textContent = `Level ${this.room.state.levelNumber}`;
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud.remove());

        const callbacks = Callbacks.get(this.room);

        callbacks.onAdd("players", (player: Player, sessionId: string) => {
            const entity = this.add.image(player.x, player.y, 'robo_pico').setOrigin(0);
            const tint = PLAYER_COLORS[player.color % PLAYER_COLORS.length];
            entity.setTint(tint);
            this.playerEntities.set(sessionId, entity);

            if (sessionId === this.room.sessionId) {
                this.cameras.main.startFollow(entity, true, 0.12, 0.12);
            }
        });

        callbacks.onRemove("players", (_player: Player, sessionId: string) => {
            this.playerEntities.get(sessionId)?.destroy();
            this.playerEntities.delete(sessionId);
        });
    }

    update(_time: number, delta: number) {
        const held = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
        const moveX = (held(this.keys.right) ? 1 : 0) - (held(this.keys.left) ? 1 : 0);
        const jump = held(this.keys.jump);

        if (this.renderedLevelNumber !== this.room.state.levelNumber) {
            this.renderedLevelNumber = this.room.state.levelNumber;
            this.drawLevel(this.renderedLevelNumber);
            this.lastSent = { moveX: 0, jump: false };
        }

        if (moveX !== this.lastSent.moveX || jump !== this.lastSent.jump) {
            this.sendInput(moveX, jump);
        }

        const levelLabel = `Level ${this.room.state.levelNumber}`;
        if (this.levelText.textContent !== levelLabel) {
            this.levelText.textContent = levelLabel;
        }

        const isTransitioning = this.room.state.levelPhase === "transitioning";
        let completionMessage = "";
        if (isTransitioning) {
            completionMessage = "Level Complete!";
        } else if (this.room.state.levelPhase === "completed") {
            completionMessage = "Game Complete!";
        }
        if (this.completionText.textContent !== completionMessage) {
            this.completionText.textContent = completionMessage;
        }
        this.completionText.hidden = completionMessage === "";
        this.completionText.classList.toggle("is-transitioning", isTransitioning);

        // Ease each drawn player toward its latest server position.
        const t = 1 - Math.exp(-delta / SMOOTHING_MS);
        for (const [sessionId, player] of this.room.state.players) {
            const sprite = this.playerEntities.get(sessionId);
            if (!sprite) { continue; }

            // A big jump (e.g. a lava respawn) snaps instead of sliding across the level.
            if (Math.abs(player.x - sprite.x) > 16 || Math.abs(player.y - sprite.y) > 16) {
                sprite.setPosition(player.x, player.y);
            } else {
                sprite.setPosition(
                    sprite.x + (player.x - sprite.x) * t,
                    sprite.y + (player.y - sprite.y) * t,
                );
            }

            // Don't change sprite direction when velocity is zero.
            if (player.vx < 0) {
                sprite.setFlipX(true);
            } else if (player.vx > 0) {
                sprite.setFlipX(false);
            }
        }

    }

    private sendInput(moveX: number, jump: boolean) {
        this.input_.data.moveX = moveX as -1 | 0 | 1;
        this.input_.data.jump = jump;
        this.input_.send();
        this.lastSent = { moveX, jump };
    }

    private drawLevel(levelNumber: number) {
        this.levelContainer.removeAll(true);
        const level = PHYSIO_PARK_LEVELS[levelNumber - 1] ?? PHYSIO_PARK_LEVELS[0];
        this.cameras.main.setBounds(0, 0, level.width, level.height);
        const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
            this.levelContainer.add(object);
            return object;
        };

        add(this.add.rectangle(level.lava.x, level.lava.y, level.lava.width, level.lava.height, 0xe8743b).setOrigin(0));
        add(this.add.rectangle(
            level.goalArea.x,
            level.goalArea.y,
            level.goalArea.width,
            level.goalArea.height,
            0x33aa33,
        ).setOrigin(0).setAlpha(0.16));

        for (const solid of level.solids) {
            add(this.add.rectangle(solid.x, solid.y, solid.width, solid.height, 0x555555).setOrigin(0));
        }

        // Goal flag on the high ledge.
        const poleX = level.goalPlatform.x + level.goalPlatform.width - 30;
        add(this.add.rectangle(poleX, level.goalPlatform.y - 40, 4, 40, 0x333333).setOrigin(0));
        add(this.add.triangle(
            0,
            0,
            poleX + 4,
            level.goalPlatform.y - 40,
            poleX + 24,
            level.goalPlatform.y - 32,
            poleX + 4,
            level.goalPlatform.y - 24,
            0x33aa33,
        ).setOrigin(0));
        this.renderedLevelNumber = levelNumber;
    }
}

/**
 * Starts the Physio Park client for an existing room. The application decides
 * which game to launch; this module owns joining, drawing and input.
 */
export async function startPhysioPark(
    client: ColyseusSDK<typeof server>,
    roomOrId: string | Room<PhysioParkRoom>,
    elements: PhysioParkElements,
) {
    const { game, arena, score, status, title, help } = elements;

    // A string is a normal game start; a room is a rejoin via client.reconnect().
    let room: Room<PhysioParkRoom["state"]>;
    if (typeof roomOrId === "string") {
        room = await client.joinById(roomOrId, { displayName: elements.displayName }) as any;
    } else {
        room = roomOrId as unknown as Room<PhysioParkRoom["state"]>;
    }
    room = setupRoom(room as any, "physio_park") as unknown as Room<PhysioParkRoom["state"]>;

    game.hidden = false;
    title.textContent = "Physio Park";
    score.hidden = true;
    help.textContent = "Move with A/D or ←/→. Jump with W, ↑ or Space. Stack on each other to reach the flag!";
    const displayName = room.state?.lobbyPlayers?.get(room.sessionId)?.displayName || room.sessionId;
    status.textContent = `Connected as ${displayName}, SessionID: ${room.sessionId}`;

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: RESOLUTION_X,
        height: RESOLUTION_Y,
        backgroundColor: "#f4f1ea",
        parent: arena,
        pixelArt: true,
        scale: {
            mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
            autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
        },
        scene: [new PhysioParkScene(room, arena)],
    };
    
    new Phaser.Game(config);
}
