import assert from "node:assert";
import { stepPlatformerBody, stepAllPlayers, type PlatformerBody, type PlatformerPlayer, type Solid } from "../src/shared/platformerMovement.js";
import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH_HALF, PLAYER_HEIGHT_HALF } from "../src/shared/platformerConstants.js";
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

function makePlayer(x: number, y: number): PlatformerPlayer {
    return { body: makeBody(x, y), input: { moveX: 0, jump: false } };
}

function stepWorld(players: PlatformerPlayer[], solids: Solid[], ticks: number) {
    for (let i = 0; i < ticks; i++) {
        stepAllPlayers(players, solids, DT);
    }
}

describe("player stacking", () => {
    it("lands on another player's head", () => {
        const bottom = makePlayer(100, FLOOR_Y);
        const top = makePlayer(100, 50);
        stepWorld([bottom, top], [FLOOR], 120);

        assert.strictEqual(top.body.position.y, FLOOR_Y - PLAYER_HEIGHT);
        assert.strictEqual(top.body.grounded, true);
        assert.strictEqual(bottom.body.position.y, FLOOR_Y);
    });

    it("can jump off another player's head", () => {
        const bottom = makePlayer(100, FLOOR_Y);
        const top = makePlayer(100, 50);
        stepWorld([bottom, top], [FLOOR], 120);

        top.input.jump = true;
        stepWorld([bottom, top], [FLOOR], 1);
        assert.ok(top.body.velocity.y < 0, "top player should be moving up");
    });

    it("is carried when the player underneath walks", () => {
        const bottom = makePlayer(100, FLOOR_Y);
        const top = makePlayer(100, 50);
        stepWorld([bottom, top], [FLOOR], 120);

        const bottomStartX = bottom.body.position.x;
        const topStartX = top.body.position.x;

        bottom.input.moveX = 1;
        stepWorld([bottom, top], [FLOOR], 30);

        const bottomMoved = bottom.body.position.x - bottomStartX;
        const topMoved = top.body.position.x - topStartX;
        assert.ok(bottomMoved > 0, "bottom player should have moved right");
        assert.ok(Math.abs(topMoved - bottomMoved) < 1e-6, "top player should move with the bottom player");
        assert.strictEqual(top.body.grounded, true, "top player should still be standing on the bottom player");
    });

    it("stacks three players", () => {
        const bottom = makePlayer(100, FLOOR_Y);
        const middle = makePlayer(100, FLOOR_Y - 60);
        const top = makePlayer(100, FLOOR_Y - 120);
        stepWorld([bottom, middle, top], [FLOOR], 180);

        assert.strictEqual(bottom.body.position.y, FLOOR_Y);
        assert.strictEqual(middle.body.position.y, FLOOR_Y - PLAYER_HEIGHT);
        assert.strictEqual(top.body.position.y, FLOOR_Y - 2 * PLAYER_HEIGHT);
        assert.ok(bottom.body.grounded && middle.body.grounded && top.body.grounded);
    });

    it("blocks players from walking through each other", () => {
        const walker = makePlayer(100, FLOOR_Y);
        const blocker = makePlayer(200, FLOOR_Y);
        walker.input.moveX = 1;
        stepWorld([walker, blocker], [FLOOR], 60);

        assert.strictEqual(walker.body.position.x, blocker.body.position.x - PLAYER_WIDTH);
    });
});