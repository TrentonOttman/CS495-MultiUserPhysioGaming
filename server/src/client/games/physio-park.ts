import Phaser from "phaser";
import { Room, Callbacks, type ColyseusSDK } from "@colyseus/sdk";
import { PhysioParkRoom } from "../../rooms/PhysioParkRoom";
import type { default as server } from "../../app.config.js";
import { Player } from "../../rooms/schema/PhysioParkState.js";

// custom scene class
export class GameScene extends Phaser.Scene {
    client: ColyseusSDK<typeof server>;
    room: Room<PhysioParkRoom, any>;

    playerEntities: { [sessionId: string]: any } = {};

    inputPayload = {
        left: false,
        right: false,
        up: false,
        down: false,
    };

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

    keyW: Phaser.Input.Keyboard.Key;
    keyA: Phaser.Input.Keyboard.Key;
    keyS: Phaser.Input.Keyboard.Key;
    keyD: Phaser.Input.Keyboard.Key;

    constructor(client: ColyseusSDK<typeof server>, room: Room<PhysioParkRoom, any>) {
        super();
        this.client = client;
        this.room = room;
    }

    preload() {
        // preload scene
        this.load.image('ship_0001', 'https://cdn.jsdelivr.net/gh/colyseus/tutorial-phaser@master/client/dist/assets/ship_0001.png');
    }

    async create() {
        this.cursorKeys = this.input.keyboard.createCursorKeys();

        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        
        const callbacks = Callbacks.get(this.room);

        callbacks.onAdd("players", (player: Player, sessionId: string) => {
            console.log("A player has joined! Their unique session id is", sessionId);

            const entity = this.physics.add.image(player.x, player.y, 'ship_0001');
            this.playerEntities[sessionId] = entity;

            callbacks.onChange(player, () => {
                // update local position immediately
                entity.x = player.x;
                entity.y = player.y;
            });
        });

        callbacks.onRemove("players", (_player, sessionId: string) => {
            const entity = this.playerEntities[sessionId];
            if (entity) {
                // destroy entity
                entity.destroy();

                // clear local reference
                delete this.playerEntities[sessionId];
            }
        });
    }

    update(time: number, delta: number): void {
        // skip loop if not connected with room yet.
        if (!this.room) { return; }

        // send input to the server
        this.inputPayload.left = this.cursorKeys.left.isDown || this.keyA.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown || this.keyD.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown || this.keyW.isDown; 
        this.inputPayload.down = this.cursorKeys.down.isDown || this.keyS.isDown;
        this.room.send(0, this.inputPayload);
    }
}

export async function startPhysioPark(client: ColyseusSDK<typeof server>, roomId: string) {
    const room = await client.joinById<PhysioParkRoom>(roomId);

    // game config
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: '#b6d53c',
        parent: 'phaser-example',
        physics: { default: "arcade" },
        pixelArt: true,
        scene: [new GameScene(client, room)],
    };

    // instantiate the game
    const game = new Phaser.Game(config);
}