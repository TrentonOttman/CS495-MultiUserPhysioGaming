import Phaser from 'phaser';
import { PhysioParkScene } from "./games/physio-park"

export interface PlayerInfo {
    name: string;
    deaths: number;
    color: number;
}

type StatBoardView = {
    container: Phaser.GameObjects.Container;
    update: (players: PlayerInfo[]) => void;
};

const WIDTH = 1000;
const HEIGHT = 500;

const PADDING = 20;
const CORNER_RADIUS = 18;
const TEXT_STYLE = {
    fontFamily: 'Arial',
    fontSize: '20px',
    color: '#ffffff'
};

const BACKGROUND_COLOR = 0x111827;
const ROW_COLOR = 0x263449;
const BORDER_COLOR = 0xffffff;

export function createStatBoard(
    scene: PhysioParkScene,
    playerInfo: PlayerInfo[]
): StatBoardView {
    const panel = scene.add.container(0, 0).setDepth(1000);

    const background = scene.add.graphics();
    background.fillStyle(BACKGROUND_COLOR, 0.96);
    background.fillRoundedRect(
        -WIDTH / 2,
        -HEIGHT / 2,
        WIDTH,
        HEIGHT,
        CORNER_RADIUS
    );
    background.lineStyle(3, BORDER_COLOR, 1);
    background.strokeRoundedRect(
        -WIDTH / 2,
        -HEIGHT / 2,
        WIDTH,
        HEIGHT,
        CORNER_RADIUS
    );
    panel.add(background);

    const innerWidth = WIDTH - PADDING * 2;
    const left = -WIDTH / 2 + PADDING;
    const right = WIDTH / 2 - PADDING;

    const headerY = -HEIGHT / 2 + PADDING;
    const headerHeight = 38;

    panel.add(scene.add.rectangle(
        0,
        headerY + headerHeight / 2,
        innerWidth,
        headerHeight,
        ROW_COLOR
    ));

    panel.add(scene.add.text(
        left + 12,
        headerY + headerHeight / 2,
        'Player',
        { ...TEXT_STYLE, fontStyle: 'bold' }
    ).setOrigin(0, 0.5));

    panel.add(scene.add.text(
        right - 12,
        headerY + headerHeight / 2,
        'Deaths',
        { ...TEXT_STYLE, fontStyle: 'bold' }
    ).setOrigin(1, 0.5));

    const ROW_COUNT = 8;
    const rowsTop = headerY + headerHeight + 6;
    const rowsBottom = HEIGHT / 2 - 18;
    const rowSlotHeight = (rowsBottom - rowsTop) / ROW_COUNT;

    const rows = Array.from({ length: ROW_COUNT }, (_, index) => {
        const rowY = rowsTop + index * rowSlotHeight + rowSlotHeight / 2;

        const rowBackground = scene.add.rectangle(
            0,
            rowY,
            innerWidth,
            Math.max(1, rowSlotHeight - 4),
            ROW_COLOR
        );
        const nameLabel = scene.add.text(
            left + 12,
            rowY,
            '',
            TEXT_STYLE
        ).setOrigin(0, 0.5);
        const deathLabel = scene.add.text(
            right - 12,
            rowY,
            '',
            TEXT_STYLE
        ).setOrigin(1, 0.5);

        panel.add([rowBackground, nameLabel, deathLabel]);
        return { rowBackground, nameLabel, deathLabel };
    });

    const update = (players: PlayerInfo[]) => {
        rows.forEach(({ rowBackground, nameLabel, deathLabel }, index) => {
            const player = players[index];

            if (player) {
                rowBackground.setFillStyle(player.color ?? ROW_COLOR);
                nameLabel.setText(player.name);
                deathLabel.setText(String(player.deaths));
            }
        });
    };

    update(playerInfo);

    return {
        container: panel,
        update
    };
}
