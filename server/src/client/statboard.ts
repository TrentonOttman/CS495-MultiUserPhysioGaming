import Phaser from 'phaser';

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

const BACKGROUND_COLOR = 0xcecece;
const ROW_COLOR = 0xaeaeae;
const BORDER_COLOR = 0x161616;

const BACKGROUND_ALPHA = 0.85;
const ROW_ALPHA = 0.85;
const EMPTY_ROW_ALPHA = 0.85;

export function createStatBoard(
    scene: Phaser.Scene,
    playerInfo: PlayerInfo[]
): StatBoardView {
    const panel = scene.add.container(0, 0).setDepth(1000);

    const background = scene.add.graphics();
    background.fillStyle(BACKGROUND_COLOR, BACKGROUND_ALPHA);
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
        ROW_COLOR,
        BACKGROUND_ALPHA
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
            ROW_COLOR,
            EMPTY_ROW_ALPHA,
        );
        const nameLabel = scene.add.text(
            left + 110,
            rowY,
            '',
            TEXT_STYLE
        ).setOrigin(0.3, 0.5);
        const playerIcon = scene.add.image(
            left + 12,
            rowY,
            "PicoIcon"
        ).setOrigin(0,0.5);
        const deathLabel = scene.add.text(
            right - 12,
            rowY,
            '',
            TEXT_STYLE
        ).setOrigin(1, 0.5);
        const deathIcon = scene.add.image(
            right - 50,
            rowY,
            "DeathIcon"
        ).setOrigin(0.7,0.5);

        panel.add([rowBackground, nameLabel, deathLabel, playerIcon, deathIcon]);
        return { rowBackground, nameLabel, deathLabel, playerIcon, deathIcon};
    });

    const update = (players: PlayerInfo[]) => {
        rows.forEach(({ rowBackground, nameLabel, deathLabel, playerIcon, deathIcon }, index) => {
            const player = players[index];

            if (player) {
                const alpha = player.color ? ROW_ALPHA : EMPTY_ROW_ALPHA;
                rowBackground.setFillStyle(player.color ?? ROW_COLOR, alpha);
                nameLabel.setText(player.name);
                deathLabel.setText(String(player.deaths));
                playerIcon.setTint(player.color ?? ROW_COLOR);
                playerIcon.setScale(4,4);
                deathIcon.setScale(4,4);
            }
            else
            {
                playerIcon.setAlpha(0);
                deathIcon.setAlpha(0);
            }
        });
    };


    update(playerInfo);

    return {
        container: panel,
        update
    };
}
