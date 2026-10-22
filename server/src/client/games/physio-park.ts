import Phaser from "phaser";
import { Callbacks, type ColyseusSDK, type Room, type InputHandle } from "@colyseus/sdk";
import type { default as server } from "../../app.config.js";
import type { PhysioParkRoom } from "../../rooms/PhysioParkRoom.js";
import type { MoveInput, Player } from "../../rooms/schema/PhysioParkState.js";
import { RESOLUTION_X, RESOLUTION_Y } from "../../shared/physioPark/physioParkConstants.js";
import { LEVEL_WIDTH, SOLIDS, LAVA, GOAL } from "../../shared/physioPark/physioParkLevel.js";
import { setupRoom } from "./roomSetup.ts";
import { getData } from "../../sensor/sensorData.js";

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

const JumpSensorThreshold = 0.00001; //Threshold for sensor value to cause a jump

/**
 * Draws the game. It does not simulate anything: the server runs the shared
 * platformer physics and this scene only draws players where the server says
 * they are. That is why it uses plain shapes (`this.add`) and never enables
 * Phaser's arcade physics, which would fight the server for control.
 */
class PhysioParkScene extends Phaser.Scene {
    private room: Room<PhysioParkRoom["state"]>;
    private input_: InputHandle<MoveInput>;
    private goalText: Phaser.GameObjects.Text;

    private playerEntities = new Map<string, any>();

    private keys: {
        left: Phaser.Input.Keyboard.Key[];
        right: Phaser.Input.Keyboard.Key[];
        jump: Phaser.Input.Keyboard.Key[];
    };

    /** The last input sent, so a new one is only sent when it changes. */
    private lastSent = { moveX: 0, jump: false };

    constructor(room: Room<PhysioParkRoom["state"]>) {
        super("physio-park");
        this.room = room;
    }

    preload() {
        this.load.image('robo_pico', 'assets/RoboPico1.png');
    }

    create() {
        this.drawLevel();

        const K = Phaser.Input.Keyboard.KeyCodes;
        const kb = this.input.keyboard;
        this.keys = {
            left: [kb.addKey(K.A), kb.addKey(K.LEFT)],
            right: [kb.addKey(K.D), kb.addKey(K.RIGHT)],
            jump: [kb.addKey(K.W), kb.addKey(K.UP), kb.addKey(K.SPACE)],
        };

        this.input_ = this.room.input<MoveInput>({ mode: "reliable" });
        this.sendInput(0, false);

        this.goalText = this.add.text(LEVEL_WIDTH / 2, 40, "Goal reached!", {
            fontFamily: "sans-serif",
            fontSize: "24px",
            fontStyle: "bold",
            color: "#2e7d32",
        }).setOrigin(0.5).setVisible(false);

        const callbacks = Callbacks.get(this.room);

        callbacks.onAdd("players", (player: Player, sessionId: string) => {
            const entity = this.add.image(player.x, player.y, 'robo_pico').setOrigin(0);
            
            console.log(player.color);
            const tint = PLAYER_COLORS[player.color % PLAYER_COLORS.length];
            entity.setTint(tint);
            
            this.playerEntities.set(sessionId, entity);
        });

        callbacks.onRemove("players", (_player: Player, sessionId: string) => {
            this.playerEntities.get(sessionId)?.destroy();
            this.playerEntities.delete(sessionId);
        });
    }

    update(_time: number, delta: number) {
        const held = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
        const moveX = (held(this.keys.right) ? 1 : 0) - (held(this.keys.left) ? 1 : 0);
        const jump = held(this.keys.jump) || (getData() > JumpSensorThreshold);
        console.log(getData());

        if (moveX !== this.lastSent.moveX || jump !== this.lastSent.jump) {
            this.sendInput(moveX, jump);
        }

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

        this.goalText.setVisible(this.room.state.goalReached);
    }

    private sendInput(moveX: number, jump: boolean) {
        this.input_.data.moveX = moveX as -1 | 0 | 1;
        this.input_.data.jump = jump;
        this.input_.send();
        this.lastSent = { moveX, jump };
    }

    private drawLevel() {
        this.add.rectangle(LAVA.x, LAVA.y, LAVA.width, LAVA.height, 0xe8743b).setOrigin(0);

        for (const s of SOLIDS) {
            this.add.rectangle(s.x, s.y, s.width, s.height, 0x555555).setOrigin(0);
        }

        // Goal flag on the high ledge.
        const poleX = GOAL.x + GOAL.width - 30;
        this.add.rectangle(poleX, GOAL.y - 40, 4, 40, 0x333333).setOrigin(0);
        this.add.triangle(0, 0, poleX + 4, GOAL.y - 40, poleX + 24, GOAL.y - 32, poleX + 4, GOAL.y - 24, 0x33aa33).setOrigin(0);
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
    let room = typeof roomOrId === "string"
        ? await client.joinById(roomOrId, {displayName: elements.displayName})
        : roomOrId;
    room = setupRoom(room as any, "physio_park") as any;

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
        scene: [new PhysioParkScene(room)],
    };
    
    new Phaser.Game(config);
}
