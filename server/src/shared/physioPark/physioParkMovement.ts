import {
    GRAVITY,
    MAX_FALL_SPEED,
    MOVE_SPEED,
    JUMP_SPEED,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    PLAYER_WIDTH_HALF,
    PLAYER_HEIGHT_HALF,
} from "./physioParkConstants.js";

export interface Vec2Like { x: number; y: number; }

/** A player's physical state. `position` is the center of the player. */
export interface PlatformerBody {
    position: Vec2Like;
    velocity: Vec2Like;
    /** True when the player is standing on something. Only grounded players can jump. */
    grounded: boolean;
}

export interface PlatformerInput {
    /** -1 = left, 0 = none, 1 = right. Out-of-range values are clamped. */
    moveX: number;
    jump: boolean;
}

/** One player in the world: their body plus this tick's input. */
export interface PlatformerPlayer {
    body: PlatformerBody;
    input: PlatformerInput;
}

/**
 * A solid rectangle players cannot pass through. (x, y) is the top-left corner.
 * Note: a solid should be thicker than MAX_FALL_SPEED × dt (15 px at 60 Hz),
 * or a fast-falling player could pass through it in a single tick.
 */
export interface Solid { x: number; y: number; width: number; height: number; }

/** How close (in px) a player's feet must be to another's head to count as standing on them. */
const SUPPORT_EPSILON = 0.01;

const clamp = (value: number, min: number, max: number) =>
    (value < min ? min : value > max ? max : value);

/** True when the body and the solid overlap. Touching edges do not count. */
function overlaps(body: PlatformerBody, solid: Solid): boolean {
    return body.position.x + PLAYER_WIDTH_HALF > solid.x
        && body.position.x - PLAYER_WIDTH_HALF < solid.x + solid.width
        && body.position.y + PLAYER_HEIGHT_HALF > solid.y
        && body.position.y - PLAYER_HEIGHT_HALF < solid.y + solid.height;
}

/** A player's box as a solid, so other players can collide with and stand on it. */
function bodyToSolid(body: PlatformerBody): Solid {
    return {
        x: body.position.x - PLAYER_WIDTH_HALF,
        y: body.position.y - PLAYER_HEIGHT_HALF,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
    };
}

/** True when `top` is standing on `bottom`'s head. */
function isStandingOn(top: PlatformerBody, bottom: PlatformerBody): boolean {
    if (!top.grounded) { return false; }
    const feet = top.position.y + PLAYER_HEIGHT_HALF;
    const head = bottom.position.y - PLAYER_HEIGHT_HALF;
    if (Math.abs(feet - head) > SUPPORT_EPSILON) { return false; }
    return Math.abs(top.position.x - bottom.position.x) < PLAYER_WIDTH;
}

/**
 * Advances one player by one tick. Pure and deterministic: the server runs it
 * as the authority, and the client can run the same function for prediction.
 *
 * `carryX` is extra horizontal movement this tick, used when the player is
 * standing on another player who moved.
 */
export function stepPlatformerBody(
    body: PlatformerBody,
    input: PlatformerInput,
    solids: readonly Solid[],
    dt: number,
    carryX = 0,
): void {
    let vx = clamp(input.moveX, -1, 1) * MOVE_SPEED;
    let vy = body.velocity.y;

    // Jump only from the ground: no mid-air jumps.
    if (input.jump && body.grounded) {
        vy = -JUMP_SPEED;
    }

    vy = Math.min(vy + GRAVITY * dt, MAX_FALL_SPEED);

    // Horizontal: move (own movement plus any carry), then push out of anything we hit.
    const dx = vx * dt + carryX;
    body.position.x += dx;
    const dirX = Math.sign(dx);
    for (const solid of solids) {
        if (!overlaps(body, solid)) { continue; }
        if (dirX > 0) {
            body.position.x = solid.x - PLAYER_WIDTH_HALF;
        } else if (dirX < 0) {
            body.position.x = solid.x + solid.width + PLAYER_WIDTH_HALF;
        }
        vx = 0;
    }

    // Vertical: move, then push out. Landing on top makes the player grounded;
    // hitting from below stops the jump.
    body.position.y += vy * dt;
    body.grounded = false;
    const dirY = Math.sign(vy);
    for (const solid of solids) {
        if (!overlaps(body, solid)) { continue; }
        if (dirY > 0) {
            body.position.y = solid.y - PLAYER_HEIGHT_HALF;
            body.grounded = true;
        } else if (dirY < 0) {
            body.position.y = solid.y + solid.height + PLAYER_HEIGHT_HALF;
        }
        vy = 0;
    }

    body.velocity.x = vx;
    body.velocity.y = vy;
}

/**
 * Advances every player by one tick, with players acting as solids for each
 * other so they can collide and stack.
 *
 * Players are processed bottom-up so a player's support has already moved by
 * the time they are stepped. A player standing on another is carried by that
 * player's horizontal movement.
 *
 * Known limitation: a player with someone standing on them cannot jump
 * (their head is blocked by the player above).
 */
export function stepAllPlayers(
    players: readonly PlatformerPlayer[],
    solids: readonly Solid[],
    dt: number,
): void {
    // Who stands on whom, based on positions at the start of this tick.
    const supporter = new Map<PlatformerPlayer, PlatformerPlayer>();
    for (const top of players) {
        for (const bottom of players) {
            if (top !== bottom && isStandingOn(top.body, bottom.body)) {
                supporter.set(top, bottom);
                break;
            }
        }
    }

    const startX = new Map<PlatformerPlayer, number>();
    for (const p of players) { startX.set(p, p.body.position.x); }

    // Bottom of the screen first (larger y = lower). The sort is stable, so
    // ties keep their original order and the result stays deterministic.
    const order = [...players].sort((a, b) => b.body.position.y - a.body.position.y);

    for (const player of order) {
        const support = supporter.get(player);
        const carryX = support ? support.body.position.x - startX.get(support) : 0;

        const others = players
            .filter((other) => other !== player)
            .map((other) => bodyToSolid(other.body));

        stepPlatformerBody(player.body, player.input, [...solids, ...others], dt, carryX);
    }
}

export interface PlatformerBody {
    position: Vec2Like;
    velocity: Vec2Like;
    /** Checks if a player was recently grounded to allow for coyote time */
    ticks_since_grounded: number;
}

export interface Vec2Like {
    x: number;
    y: number;
}

export const Vec2 = {
    add(a: Vec2Like, b: Vec2Like): Vec2Like {
        return { x: a.x + b.x, y: a.y + b.y };
    },

    subtract(a: Vec2Like, b: Vec2Like): Vec2Like {
        return { x: a.x - b.x, y: a.y - b.y };
    },

    multiply(v: Vec2Like, scalar: number): Vec2Like {
        return { x: v.x * scalar, y: v.y * scalar };
    },

    dot(a: Vec2Like, b: Vec2Like): number {
        return a.x * b.x + a.y * b.y;
    },
};

export class Rect {
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
    ) {
        if (width < 0 || height < 0) {
            throw new Error("Rect width and height must be non-negative");
        }
    }

    overlaps(other: Rect): boolean {
        // Edges touching counts as not overlapping.
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }

    /**
     * Returns the smallest offset to apply to this Rect to separate it
     * from `other`. Returns { x: 0, y: 0 } if they don't overlap.
     */
    collisionOffset(other: Rect): Vec2Like {
        if (!this.overlaps(other)) return { x: 0, y: 0 };

        const overlapX =
            Math.min(this.x + this.width, other.x + other.width) -
            Math.max(this.x, other.x);
        const overlapY =
            Math.min(this.y + this.height, other.y + other.height) -
            Math.max(this.y, other.y);

        const thisCenterX = this.x + this.width / 2;
        const otherCenterX = other.x + other.width / 2;
        const thisCenterY = this.y + this.height / 2;
        const otherCenterY = other.y + other.height / 2;

        // Resolve along the axis with the least penetration.
        // Ties resolve horizontally.
        if (overlapX <= overlapY) {
            const direction = thisCenterX <= otherCenterX ? -1 : 1;
            return Vec2.multiply({ x: direction, y: 0 }, overlapX);
        }

        const direction = thisCenterY <= otherCenterY ? -1 : 1;
        return Vec2.multiply({ x: 0, y: direction }, overlapY);
    }
}

let nextBodyId = 0;

export type BodyTag = "player" | "lava" | "goal";

export interface OverlapRule {
    actorTag: BodyTag;
    targetTag: BodyTag;
    handle: (actor: Body, target: Body) => void;
}

export class Body {
    readonly id = nextBodyId++;
    readonly tags = new Set<BodyTag>();

    hasTag(tag: BodyTag): boolean {
        return this.tags.has(tag);
    }

    constructor(
        public rect: Rect,
        public velocity: Vec2Like = { x: 0, y: 0 },
        public isStatic = false,
        public isSensor = false,
        public gravityScale = 1,
        public timeSinceGrounded = 0,
    ) { }
}

export class PhysicsWorld {
    private readonly bodies: Body[] = [];
    private accumulator = 0;

    private readonly tickRate = 60;
    private readonly substeps = 4;
    private readonly fixedDt = 1 / this.tickRate;

    private readonly overlapRules: OverlapRule[] = [];

    constructor(public gravity: Vec2Like = { x: 0, y: 900 }) { }

    add(body: Body): Body {
        this.bodies.push(body);
        return body;
    }

    remove(body: Body): boolean {
        const index = this.bodies.indexOf(body);
        if (index < 0) return false;
        this.bodies.splice(index, 1);
        return true;
    }

    addOverlapRule(rule: OverlapRule): void {
        this.overlapRules.push(rule);
    }

    /**
     * Advances exactly one 1/60-second tick, divided into four substeps.
     * A sensor callback fires at most once per body pair per tick.
     */
    step(): void {
        const dt = this.fixedDt / this.substeps;
        const sensorPairs = new Map<string, [Body, Body]>();
        const supportEpsilon = 0.5;

        for (const body of this.bodies) {
            body.timeSinceGrounded += 1;
        }

        for (let substep = 0; substep < this.substeps; substep++) {
            // Snapshot positions before this substep moves anything.
            const startPositions = new Map<Body, Vec2Like>();
            for (const body of this.bodies) {
                startPositions.set(body, { x: body.rect.x, y: body.rect.y });
            }

            // Record which solid body each movable body is standing on.
            const supports = new Map<Body, Body>();
            for (const body of this.bodies) {
                if (body.isStatic || body.isSensor) continue;

                const support = this.findSupport(body, supportEpsilon);
                if (support) supports.set(body, support);

                if(support && body.velocity.y >= 0) {
                    body.timeSinceGrounded = 0;
                }
            }

            // Integrate motion.
            for (const body of this.bodies) {
                if (body.isStatic) continue;

                body.velocity = Vec2.add(
                    body.velocity,
                    Vec2.multiply(this.gravity, dt * body.gravityScale),
                );

                const position = Vec2.add(
                    { x: body.rect.x, y: body.rect.y },
                    Vec2.multiply(body.velocity, dt),
                );

                body.rect.x = position.x;
                body.rect.y = position.y;
            }

            // Carry supported bodies by their platform's displacement.
            // Recursion lets a stack of bodies move together.
            const carried = new Set<Body>();

            const carryWithSupport = (rider: Body): void => {
                if (carried.has(rider)) return;

                const platform = supports.get(rider);
                if (!platform) {
                    carried.add(rider);
                    return;
                }

                carryWithSupport(platform);

                const platformStart = startPositions.get(platform)!;
                const platformDelta = Vec2.subtract(
                    { x: platform.rect.x, y: platform.rect.y },
                    platformStart,
                );

                const riderPosition = Vec2.add(
                    { x: rider.rect.x, y: rider.rect.y },
                    platformDelta,
                );

                rider.rect.x = riderPosition.x;
                rider.rect.y = riderPosition.y;
                carried.add(rider);
            };

            for (const rider of supports.keys()) {
                carryWithSupport(rider);
            }

            // Resolve solid collisions and collect sensor overlaps.
            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const a = this.bodies[i];
                    const b = this.bodies[j];

                    if (a.isStatic && b.isStatic) continue;
                    if (!a.rect.overlaps(b.rect)) continue;

                    if (a.isSensor || b.isSensor) {
                        sensorPairs.set(`${a.id}:${b.id}`, [a, b]);
                        continue;
                    }

                    const offset = a.rect.collisionOffset(b.rect);
                    const aMoves = !a.isStatic;
                    const bMoves = !b.isStatic;

                    const aShare = aMoves ? (bMoves ? 0.5 : 1) : 0;
                    const bShare = bMoves ? (aMoves ? 0.5 : 1) : 0;

                    const aPosition = Vec2.add(
                        { x: a.rect.x, y: a.rect.y },
                        Vec2.multiply(offset, aShare),
                    );
                    const bPosition = Vec2.subtract(
                        { x: b.rect.x, y: b.rect.y },
                        Vec2.multiply(offset, bShare),
                    );

                    a.rect.x = aPosition.x;
                    a.rect.y = aPosition.y;
                    b.rect.x = bPosition.x;
                    b.rect.y = bPosition.y;

                    const offsetLength = Math.abs(offset.x) + Math.abs(offset.y);
                    const normal = Vec2.multiply(offset, 1 / offsetLength);

                    if (aMoves) this.removeInwardVelocity(a, normal);
                    if (bMoves) this.removeInwardVelocity(b, Vec2.multiply(normal, -1));
                }
            }
        }

        for (const [a, b] of sensorPairs.values()) {
            for (const rule of this.overlapRules) {
                let actor: Body | undefined;
                let target: Body | undefined;

                if (a.hasTag(rule.actorTag) && b.hasTag(rule.targetTag)) {
                    actor = a;
                    target = b;
                } else if (b.hasTag(rule.actorTag) && a.hasTag(rule.targetTag)) {
                    actor = b;
                    target = a;
                }

                if (actor && target) {
                    rule.handle(actor, target);
                }
            }
        }
    }

    private findSupport(body: Body, epsilon: number): Body | undefined {
        const bodyBottom = body.rect.y + body.rect.height;

        return this.bodies.find((other) => {
            if (other === body || other.isSensor) return false;

            const horizontalOverlap =
                body.rect.x < other.rect.x + other.rect.width &&
                body.rect.x + body.rect.width > other.rect.x;

            const closeToTop = Math.abs(bodyBottom - other.rect.y) <= epsilon;

            return horizontalOverlap && closeToTop;
        });
    }

    /**
     * Feed in elapsed frame time in seconds; runs zero or more fixed ticks.
     */
    advance(frameDt: number): void {
        this.accumulator += frameDt;

        while (this.accumulator >= this.fixedDt) {
            this.step();
            this.accumulator -= this.fixedDt;
        }
    }

    private removeInwardVelocity(body: Body, normal: Vec2Like): void {
        const inwardSpeed = Vec2.dot(body.velocity, normal);

        if (inwardSpeed < 0) {
            body.velocity = Vec2.subtract(
                body.velocity,
                Vec2.multiply(normal, inwardSpeed),
            );
        }
    }
}
