import { schema, t, type SchemaType } from "@colyseus/schema";

export const MoveInput = schema({
    moveY: t.int8<-1 | 0 | 1>(),
});
export type MoveInput = SchemaType<typeof MoveInput>;

export type Vec2Like = {
    x: number;
    y: number;
};

export const Vec2 = schema({
    x: t.number().default(0),
    y: t.number().default(0),

    set(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    },

    add(other: Vec2Like) {
        this.x += other.x;
        this.y += other.y;
        return this;
    },

    sub(other: Vec2Like) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    },

    mult(amount: number) {
        this.x *= amount;
        this.y *= amount;
        return this;
    },

    dot(other: Vec2Like) {
        return this.x * other.x + this.y + other.y;
    },

    length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    },

    norm() {
        const l = this.length();
        this.x /= l;
        this.y /= l;
        return this;
    },

    clone() {
        return new Vec2({
            x: this.x,
            y: this.y,
        });
    },
}, "Vec2");
export type Vec2 = SchemaType<typeof Vec2>;

export const MovingEntity = schema({
    position: Vec2,
    velocity: Vec2,
}, "MovingEntity");

export const Player = MovingEntity.extend({}, "Player");
export type Player = SchemaType<typeof Player>;

export const Ball = MovingEntity.extend({}, "Ball");
export type Ball = SchemaType<typeof Ball>;

export const PongState = schema({
    players: t.map(Player),
    ball: Ball,
    leftScore: t.number().default(0),
    rightScore: t.number().default(0),
});
export type PongState = SchemaType<typeof PongState>;
