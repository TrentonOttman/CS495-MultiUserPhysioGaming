import Phaser from "phaser";

/** Owns the level badge and completion overlay for a Physio Park scene. */
export class PhysioParkHud {
    private readonly levelBadge: Phaser.GameObjects.Graphics;
    private readonly levelText: Phaser.GameObjects.Text;
    private readonly completionPanel: Phaser.GameObjects.Graphics;
    private readonly completionText: Phaser.GameObjects.Text;
    private readonly completionGroup: Phaser.GameObjects.Container;
    private completionTween?: Phaser.Tweens.TweenChain;
    private completionPanelWidth = 0;
    private completionPanelHeight = 0;
    private renderedLevelNumber = -1;
    private renderedPhase?: string;

    constructor(
        private readonly scene: Phaser.Scene,
        ui: Phaser.GameObjects.Container,
        private readonly width: number,
        private readonly height: number,
    ) {
        this.levelBadge = scene.add.graphics();
        this.levelText = scene.add.text(0, 0, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "16px",
            fontStyle: "bold",
            color: "#1f2937",
        }).setOrigin(0);

        this.completionPanel = scene.add.graphics();
        this.completionText = scene.add.text(0, 0, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "28px",
            fontStyle: "bold",
            color: "#1b5e20",
            align: "center",
        }).setOrigin(0);
        this.completionGroup = scene.add.container(0, 0, [this.completionPanel, this.completionText]);
        this.completionGroup.setVisible(false);
        ui.add([this.levelBadge, this.levelText, this.completionGroup]);

        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.completionTween?.stop());
    }

    update(levelNumber: number, phase: string) {
        if (this.renderedLevelNumber !== levelNumber) {
            this.renderedLevelNumber = levelNumber;
            this.renderLevelBadge(levelNumber);
        }
        if (this.renderedPhase === phase) return;
        this.renderedPhase = phase;

        const message = phase === "transitioning"
            ? "Level Complete!"
            : phase === "completed"
                ? "Game Complete!"
                : "";
        this.showCompletionMessage(message, phase === "transitioning");
    }

    private renderLevelBadge(levelNumber: number) {
        const scale = this.getUiScale();
        const border = scale;
        const paddingX = 8.8 * scale;
        const paddingY = 4.8 * scale;
        const x = 10 * scale;
        const y = 10 * scale;
        const radius = 7.2 * scale;

        this.levelText.setFontSize(16 * scale);
        this.levelText.setText(`Level ${levelNumber}`);
        this.levelText.setPosition(x + border + paddingX, y + border + paddingY);

        const width = this.levelText.width + 2 * (border + paddingX);
        const height = this.levelText.height + 2 * (border + paddingY);
        this.levelBadge.clear();
        this.levelBadge.fillStyle(0xf4f1ea, 0.95).fillRoundedRect(x, y, width, height, radius);
        this.levelBadge.lineStyle(border, 0x1f2937, 0.2).strokeRoundedRect(x, y, width, height, radius);
    }

    private showCompletionMessage(message: string, animate: boolean) {
        this.completionTween?.stop();
        this.completionTween = undefined;

        if (!message) {
            this.completionGroup.setVisible(false);
            return;
        }

        const scale = this.getUiScale();
        const fontSizeCss = Math.min(32, Math.max(19.2, window.innerWidth * 0.04));
        const border = 2 * scale;
        const paddingX = 18.4 * scale;
        const paddingY = 10.4 * scale;
        const radius = 12 * scale;
        const maxTextWidth = this.width - 32 * scale - 2 * (border + paddingX);

        this.completionText.setFontSize(fontSizeCss * scale);
        this.completionText.setText(message);
        if (this.completionText.width > maxTextWidth) {
            const fittedFontSize = fontSizeCss * scale * maxTextWidth / this.completionText.width;
            this.completionText.setFontSize(fittedFontSize);
        }

        this.completionPanelWidth = this.completionText.width + 2 * (border + paddingX);
        this.completionPanelHeight = this.completionText.height + 2 * (border + paddingY);
        this.completionText.setPosition(border + paddingX, border + paddingY);
        this.completionPanel.clear();
        this.completionPanel.fillStyle(0xf4f1ea, 0.96)
            .fillRoundedRect(0, 0, this.completionPanelWidth, this.completionPanelHeight, radius);
        this.completionPanel.lineStyle(border, 0x33aa33, 1)
            .strokeRoundedRect(0, 0, this.completionPanelWidth, this.completionPanelHeight, radius);

        const centerX = (this.width - this.completionPanelWidth) / 2;
        const centerY = (this.height - this.completionPanelHeight) / 2;
        this.completionGroup.setVisible(true);
        if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            this.completionGroup.setPosition(centerX, centerY).setAlpha(1).setScale(1);
            return;
        }

        this.completionGroup.setPosition(-this.width, centerY).setAlpha(0).setScale(0.92);
        this.completionTween = this.scene.tweens.chain({
            targets: this.completionGroup,
            tweens: [
                { x: centerX, alpha: 1, scaleX: 1.06, scaleY: 1.06, duration: 300, ease: "Sine.easeInOut" },
                { scaleX: 1, scaleY: 1, duration: 120, ease: "Sine.easeInOut" },
                { x: centerX, duration: 1_060 },
                {
                    x: this.width * 1.1,
                    alpha: 0,
                    scaleX: 0.96,
                    scaleY: 0.96,
                    duration: 520,
                    ease: "Sine.easeInOut",
                },
            ],
            onComplete: () => {
                this.completionGroup.setVisible(false);
                this.completionTween = undefined;
            },
        });
    }

    private getUiScale() {
        return this.width / Math.max(1, this.scene.scale.displaySize.width);
    }
}
