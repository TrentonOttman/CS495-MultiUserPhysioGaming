import assert from "node:assert";
import { stepPlatformerBody, type PlatformerBody, type Solid } from "../src/shared/platformerMovement.js";
import { PLAYER_WIDTH_HALF, PLAYER_HEIGHT_HALF } from "../src/shared/platformerConstants.js";

const DT = 1 / 60;
const NO_INPUT = { moveX: 0, jump: false };

function makeBody(x: number, y: number): PlatformerBody {
    return { position: { x, y }, velocity: { x: 0, y: 0 }, grounded: false };
}

function stepMany(body: PlatformerBody, input: { moveX: number; jump: boolean }, solids: Solid[], ticks: number) {
    for (let i = 0; i < ticks; i++) {
        stepPlatformerBody(body, input, solids, DT);
    }
}

// A wide floor whose top edge is at y = 200.
const FLOOR: Solid = { x: 0, y: 200, width: 1000, height: 40 };
const FLOOR_Y = FLOOR.y - PLAYER_HEIGHT_HALF; // where a player standing on the floor sits

describe("platformer physics", () => {
    it("falls when there is nothing below", () => {
        const body = makeBody(100, 50);
        stepPlatformerBody(body, NO_INPUT, [], DT);
        assert.ok(body.velocity.y > 0, "should be moving down");
        assert.ok(body.position.y > 50, "should have moved down");
        assert.strictEqual(body.grounded, false);
    });

    it("lands on the floor and stops", () => {
        const body = makeBody(100, 50);
        stepMany(body, NO_INPUT, [FLOOR], 120);
        assert.strictEqual(body.position.y, FLOOR_Y);
        assert.strictEqual(body.velocity.y, 0);
        assert.strictEqual(body.grounded, true);
    });

    it("jumps when grounded", () => {
        const body = makeBody(100, FLOOR_Y);
        stepPlatformerBody(body, NO_INPUT, [FLOOR], DT); // settle onto the floor
        assert.strictEqual(body.grounded, true);

        stepPlatformerBody(body, { moveX: 0, jump: true }, [FLOOR], DT);
        assert.ok(body.velocity.y < 0, "should be moving up");
        assert.ok(body.position.y < FLOOR_Y, "should have left the floor");
        assert.strictEqual(body.grounded, false);
    });

    it("cannot jump in mid-air", () => {
        const body = makeBody(100, 50);
        stepPlatformerBody(body, NO_INPUT, [], DT); // airborne
        stepPlatformerBody(body, { moveX: 0, jump: true }, [], DT);
        assert.ok(body.velocity.y > 0, "should still be falling");
    });

    it("stops at a wall", () => {
        const wall: Solid = { x: 120, y: 100, width: 20, height: 100 };
        const body = makeBody(100, FLOOR_Y);
        stepMany(body, { moveX: 1, jump: false }, [FLOOR, wall], 30);
        assert.strictEqual(body.position.x, wall.x - PLAYER_WIDTH_HALF);
        assert.strictEqual(body.velocity.x, 0);
    });

    it("stops rising when it hits a ceiling", () => {
        const ceiling: Solid = { x: 0, y: 0, width: 1000, height: 20 };
        const body = makeBody(100, 40);
        body.velocity.y = -600;
        stepPlatformerBody(body, NO_INPUT, [ceiling], DT);
        assert.strictEqual(body.position.y, ceiling.y + ceiling.height + PLAYER_HEIGHT_HALF);
        assert.strictEqual(body.velocity.y, 0);
    });
});