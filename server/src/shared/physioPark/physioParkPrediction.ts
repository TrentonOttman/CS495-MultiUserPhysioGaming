import { Body, PhysicsWorld, Rect, type Solid } from "./physioParkMovement.js";
import { GRAVITY, MOVE_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH } from "./physioParkConstants.js";
import { applyPlayerInput, type PlayerInputLike } from "./physioParkInput.js";
import { applyConveyorPush, conveyorPushUnder } from "./physioParkConveyors.js";
import { getSpriteCollisionRects, PHYSIO_PARK_ANIMATIONS } from "./physioParkAnimations.js";
import { PHYSIO_PARK_LEVELS, type ResolvedPhysioParkLevel } from "./physioParkLevel.js";

/** The local player's predicted physics state: the synced `Player` fields `step` reads and writes. */
export interface PredictedPlayerState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    timeSinceGrounded: number;
    grounded: boolean;
}

/** One player as the server last reported them. */
export interface PlayerSnapshot {
    sessionId: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    timeSinceGrounded: number;
    connected: boolean;
}

/** Everything besides the local player that the server last reported. */
export interface WorldSnapshot {
    level: ResolvedPhysioParkLevel;
    /** Every player in room join order, INCLUDING the local one (its entry is ignored). */
    players: readonly PlayerSnapshot[];
    buttonPressFrame: number;
    boxes: readonly { id: string; x: number; y: number }[];
}

/** The parts of the synced room state a snapshot is read from (`room.state` on either side). */
export interface SnapshotSource {
    levelNumber: number;
    players: Iterable<[string, Omit<PlayerSnapshot, "sessionId">]>;
    buttonPressFrame: number;
    boxes: Iterable<[string, { x: number; y: number }]>
}

/** Copy the synced room state into a plain snapshot for {@link PhysioParkPredictionWorld.adopt}. */
export function snapshotOf(state: SnapshotSource): WorldSnapshot {
    const level = PHYSIO_PARK_LEVELS[Math.max(0, state.levelNumber - 1)] ?? PHYSIO_PARK_LEVELS[0];
    const players: PlayerSnapshot[] = [];
    for (const [sessionId, p] of state.players) {
        players.push({
            sessionId,
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            timeSinceGrounded: p.timeSinceGrounded,
            connected: p.connected,
        });
    }
    return {
        level,
        players,
        buttonPressFrame: state.buttonPressFrame,
        boxes: [...state.boxes].map(([id, box]) => ({ id, x: box.x, y: box.y })),
    };
}

/**
 * The browser's copy of the Physio Park world, used to predict the local
 * player's movement before the server confirms it.
 *
 * It rebuilds the same `PhysicsWorld` the room builds (same level geometry,
 * same body order, same `applyPlayerInput` and conveyor rules), so one input
 * moves the local player here exactly as it will on the server.
 *
 * Other players can't be predicted exactly (their inputs aren't known yet), so
 * each one is assumed to keep doing what it was doing at the last server update:
 * same walking direction, still holding jump while rising. They are real
 * physics bodies, which is what lets the local player stand on them, ride them
 * and push them like on the server.
 *
 * `adopt` resets everything to the server's latest state; `step` advances one
 * tick. Client-side prediction calls `adopt` whenever the server acknowledges
 * inputs, then replays the not-yet-acknowledged inputs with `step`.
 */
export class PhysioParkPredictionWorld {
    private world = new PhysicsWorld({ x: 0, y: GRAVITY });
    private level: ResolvedPhysioParkLevel | undefined;
    private buttonBody: Body | undefined;
    private readonly boxBodies = new Map<string, Body>();
    private readonly selfBody = createPlayerBody();
    private readonly remoteBodies = new Map<string, Body>();
    /** Session ids in the order their bodies were added, to detect join/leave. */
    private playerOrder: string[] = [];

    constructor(readonly localSessionId: string) { }

    /** Reset the world to the server's latest state. */
    adopt(snapshot: WorldSnapshot): void {
        const order = snapshot.players.map((player) => player.sessionId);
        if (snapshot.level !== this.level || !sameOrder(order, this.playerOrder)) {
            this.rebuild(snapshot.level, order);
        }

        if (this.buttonBody && snapshot.level.button) {
            const surface = getButtonSurface(snapshot.level.button, snapshot.buttonPressFrame);
            Object.assign(this.buttonBody.rect, surface);
        }
        for (const box of snapshot.boxes) {
            const body = this.boxBodies.get(box.id);
            if (!body) continue;
            body.rect.x = box.x;
            body.rect.y = box.y;
        }

        for (const player of snapshot.players) {
            const body = this.remoteBodies.get(player.sessionId);
            if (!body) continue;
            body.rect.x = player.x;
            body.rect.y = player.y;
            body.velocity = { x: player.vx, y: player.vy };
            body.timeSinceGrounded = player.timeSinceGrounded;
            // The room freezes a dropped player in place and lets others pass through.
            body.isStatic = !player.connected;
            body.isSensor = !player.connected;
        }
    }

    /** Advance one tick: apply `input` to the local player (`self`, mutated in place). */
    step(self: PredictedPlayerState, input: PlayerInputLike): void {
        const level = this.level;
        if (!level) return;

        const body = this.selfBody;
        body.rect.x = self.x;
        body.rect.y = self.y;
        body.velocity = { x: self.vx, y: self.vy };
        body.timeSinceGrounded = self.timeSinceGrounded;

        applyPlayerInput(body, input);
        applyConveyorPush(body, level.conveyors);

        for (const remote of this.remoteBodies.values()) {
            if (remote.isStatic) continue;
            applyPlayerInput(remote, guessInput(remote, level));
            applyConveyorPush(remote, level.conveyors);
        }

        this.world.step();

        self.x = body.rect.x;
        self.y = body.rect.y;
        self.vx = body.velocity.x;
        self.vy = body.velocity.y;
        self.timeSinceGrounded = body.timeSinceGrounded;
        self.grounded = body.timeSinceGrounded === 0;
    }

    /** Where another player is predicted to be right now (top-left), or undefined. */
    remotePosition(sessionId: string): { x: number; y: number } | undefined {
        const body = this.remoteBodies.get(sessionId);
        return body && { x: body.rect.x, y: body.rect.y };
    }

    /** Rebuild geometry and player bodies in the same order the room adds them. */
    private rebuild(level: ResolvedPhysioParkLevel, order: readonly string[]): void {
        this.level = level;
        this.world = new PhysicsWorld({ x: 0, y: GRAVITY });
        this.buttonBody = undefined;
        this.boxBodies.clear();

        for (const solid of level.solids) this.world.add(staticBody(solid));

        if (level.button) {
            this.buttonBody = this.world.add(staticBody(getButtonSurface(level.button, 0)));
        }

        for (const box of level.boxes ?? []) {
            const body = this.world.add(new Body(new Rect(box.x, box.y, box.width, box.height)));
            this.boxBodies.set(box.id, body);
        }

        // The room adds a lava sensor here. Respawning is left to the server
        // (the client doesn't know each player's spawn slot), so it is skipped.

        const previous = new Map(this.remoteBodies);
        this.remoteBodies.clear();
        for (const sessionId of order) {
            if (sessionId === this.localSessionId) {
                this.world.add(this.selfBody);
                continue;
            }
            const body = previous.get(sessionId) ?? createPlayerBody();
            this.remoteBodies.set(sessionId, body);
            this.world.add(body);
        }
        this.playerOrder = [...order];
    }
}

/**
 * The input another player is most likely holding, read from their velocity:
 * the same walking direction, and jump still held while they are rising (a
 * released jump would already have stopped them).
 */
export function guessInput(body: Body, level: Pick<ResolvedPhysioParkLevel, "conveyors">): PlayerInputLike {
    const walking = body.velocity.x - conveyorPushUnder(body, level.conveyors);
    const moveX = Math.abs(walking) < MOVE_SPEED / 2 ? 0 : Math.sign(walking);
    return { moveX, jump: body.velocity.y < 0 };
}

function createPlayerBody(): Body {
    const body = new Body(new Rect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT), { x: 0, y: 0 });
    body.tags.add("player");
    return body;
}

function staticBody(shape: Solid): Body {
    return new Body(new Rect(shape.x, shape.y, shape.width, shape.height), { x: 0, y: 0 }, true);
}

function getButtonSurface(button: NonNullable<ResolvedPhysioParkLevel["button"]>, frame: number): Solid {
    const sprite = PHYSIO_PARK_ANIMATIONS[button.sprite];
    const surface = getSpriteCollisionRects(sprite, button.position, frame)[0];
    if (!surface) throw new Error(`Missing collision shape for button sprite "${button.sprite}"`);
    return { x: surface.x, y: surface.y, width: surface.width, height: surface.height };
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
    return a.length === b.length && a.every((id, i) => id === b[i]);
}
