import Phaser from "phaser";
import type { Player } from "../../../rooms/schema/PhysioParkState.js";
import { PLAYER_WIDTH } from "../../../shared/physioPark/physioParkConstants.js";
import { getPlayerLabel, type DisplayNameLookup } from "../../../shared/physioPark/physioParkNames.js";

/** Gap between the top of a player's sprite and the bottom of its name, in world pixels. */
const TAG_GAP = 2;

/** Font size in world pixels. The world is zoomed 4x, so this draws ~24px on screen. */
const TAG_FONT_SIZE = 6;

/** Name tags of players whose connection dropped are faded out. */
const DISCONNECTED_ALPHA = 0.4;

/**
 * Draws each player's display name above their character and keeps it there.
 *
 * Tags live in the world (not the HUD) so they follow the camera for free. The
 * text is rendered at `resolution` times its size so it stays sharp after the
 * world camera's zoom.
 */
export class PlayerNameTags {
    private readonly tags = new Map<string, Phaser.GameObjects.Text>();

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly localSessionId: string,
        private readonly resolution: number,
        /** Called on each new tag so the scene can hide it from the HUD camera. */
        private readonly addToWorld: (tag: Phaser.GameObjects.Text) => void,
    ) { }

    add(sessionId: string) {
        if (this.tags.has(sessionId)) return;
        const isLocal = sessionId === this.localSessionId;
        const tag = this.scene.add.text(0, 0, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: `${TAG_FONT_SIZE}px`,
            fontStyle: isLocal ? "bold" : "normal",
            color: isLocal ? "#1f2937" : "#374151",
            stroke: "#ffffff",
            strokeThickness: 1.5,
        })
            .setOrigin(0.5, 1)
            .setResolution(this.resolution)
            .setDepth(10);
        this.addToWorld(tag);
        this.tags.set(sessionId, tag);
    }

    remove(sessionId: string) {
        this.tags.get(sessionId)?.destroy();
        this.tags.delete(sessionId);
    }

    /** Call every frame after the player sprites have moved. */
    update(
        players: Iterable<[string, Player]>,
        sprites: ReadonlyMap<string, Phaser.GameObjects.Sprite>,
        names: DisplayNameLookup | undefined,
    ) {
        for (const [sessionId, player] of players) {
            const tag = this.tags.get(sessionId);
            const sprite = sprites.get(sessionId);
            if (!tag || !sprite) continue;

            const label = getPlayerLabel(names, sessionId);
            if (tag.text !== label) tag.setText(label);

            // Sprites use a top-left origin, so center the tag over the player's box.
            tag.setPosition(Math.round(sprite.x + PLAYER_WIDTH / 2), Math.round(sprite.y - TAG_GAP));
            tag.setAlpha(player.connected ? 1 : DISCONNECTED_ALPHA);
        }

        this.separateOverlappingTags();
    }

    /**
     * Players often stand shoulder to shoulder, which would draw their names on
     * top of each other. Going left to right, any tag that overlaps one already
     * placed is lifted above it, so every name stays readable.
     */
    private separateOverlappingTags() {
        const placed: { left: number; right: number; top: number; bottom: number }[] = [];
        const ordered = [...this.tags.values()].sort((a, b) => a.x - b.x);

        for (const tag of ordered) {
            const halfWidth = tag.displayWidth / 2;
            const height = tag.displayHeight;
            let bottom = tag.y;

            let moved = true;
            while (moved) {
                moved = false;
                for (const box of placed) {
                    const overlapsX = tag.x - halfWidth < box.right && tag.x + halfWidth > box.left;
                    const overlapsY = bottom - height < box.bottom && bottom > box.top;
                    if (overlapsX && overlapsY) {
                        bottom = box.top;
                        moved = true;
                    }
                }
            }

            tag.setY(bottom);
            placed.push({ left: tag.x - halfWidth, right: tag.x + halfWidth, top: bottom - height, bottom });
        }
    }

    destroy() {
        for (const tag of this.tags.values()) tag.destroy();
        this.tags.clear();
    }
}

