import { Predict, type InputHandle, type Room } from "@colyseus/sdk";
import type { PhysioParkRoom } from "../../../rooms/PhysioParkRoom.js";
import type { MoveInput, Player } from "../../../rooms/schema/PhysioParkState.js";
import { PhysioParkPredictionWorld, snapshotOf } from "../../../shared/physioPark/physioParkPrediction.js";

/**
 * A correction bigger than this (in pixels) is a teleport (lava respawn, new
 * level), so the sprite jumps straight there instead of sliding across the map.
 * Normal corrections are a pixel or two.
 */
const TELEPORT_DISTANCE = 16;

/**
 * Other players are drawn a little in the past (smoothly, between server
 * updates), while you are drawn in the present. When someone is close enough
 * to touch, that gap would show (standing on a head that isn't there yet), so
 * between these distances their sprite blends over to where the prediction
 * thinks they are right now.
 */
/**
 * Client-side prediction for Physio Park.
 *
 * - Your own player moves the moment you press a key: each input is applied
 *   locally with the same physics the server runs, then the server's answer is
 *   checked against it. Any difference is smoothed out (or snapped, for a teleport).
 * - Everyone else is interpolated between server updates.
 *
 * Turn it off with `?prediction=off` in the page URL to compare with plain
 * server-driven movement.
 */
export class PhysioParkClientPrediction {
    static isEnabled(): boolean {
        return new URLSearchParams(window.location.search).get("prediction") !== "off";
    }

    private readonly predict: Predict<any>;
    private readonly world: PhysioParkPredictionWorld;
    private controller: { world: { self: { x: number; y: number; vx: number; timeSinceGrounded: number } } } | undefined;
    private readonly detachers = new Map<string, () => void>();

    constructor(
        private readonly room: Room<PhysioParkRoom["state"]>,
        private readonly input: InputHandle<MoveInput>,
    ) {
        this.predict = Predict.get(room);
        this.world = new PhysioParkPredictionWorld(room.sessionId);
    }

    /** Call from the scene's `players` onAdd. */
    addPlayer(player: Player, sessionId: string) {
        if (sessionId !== this.room.sessionId) {
            this.detachers.set(sessionId, this.predict.attach(player, {
                mode: "lerp",
                fields: ["x", "y"],
                snap: TELEPORT_DISTANCE,
            }));
            return;
        }

        this.world.adopt(snapshotOf(this.room.state));
        this.controller = this.predict.sim({
            input: this.input,
            // `self` is the synced Player (copied for prediction); `physics` is the local world.
            world: { self: player, physics: this.world },
            // Re-sync the local world with the server before replaying unconfirmed inputs.
            adopt: (w) => w.physics.adopt(snapshotOf(this.room.state)),
            step: (_ctx, w, command) => w.physics.step(w.self, command),
            snap: TELEPORT_DISTANCE,
        });
    }

    /** Call from the scene's `players` onRemove. */
    removePlayer(sessionId: string) {
        this.detachers.get(sessionId)?.();
        this.detachers.delete(sessionId);
    }

    /**
     * Call once per frame, before reading positions. Returns how many inputs to
     * send this frame (one per server tick).
     */
    tick(now: number): number {
        return this.predict.tick(now);
    }

    /** Where to draw `player` (top-left), this frame. */
    drawPosition(player: Player, sessionId: string): { x: number; y: number } {
        return {
            x: this.predict.value(player, "x"),
            y: this.predict.value(player, "y"),
        };
    }

    /** Velocity and air time to animate `player` with: predicted for you, synced for others. */
    motion(player: Player, sessionId: string): { vx: number; timeSinceGrounded: number } {
        if (sessionId === this.room.sessionId && this.controller) return this.controller.world.self;
        return player;
    }

    dispose() {
        for (const detach of this.detachers.values()) detach();
        this.detachers.clear();
        this.predict.dispose();
    }
}

