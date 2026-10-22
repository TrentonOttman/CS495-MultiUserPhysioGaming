import assert from "node:assert";
import { applyPlayerInput, type ControlledBody } from "../src/shared/physioPark/physioParkInput.js";
import { COYOTE_TIME, JUMP_SPEED, MAX_FALL_SPEED, MOVE_SPEED } from "../src/shared/physioPark/physioParkConstants.js";

function body(timeSinceGrounded: number, vy = 0): ControlledBody {
    return { velocity: { x: 0, y: vy }, timeSinceGrounded };
}

describe("physio park input", () => {
    it("sets horizontal speed from moveX, clamped to -1..1", () => {
        const b = body(0);
        applyPlayerInput(b, { moveX: 1, jump: false });
        assert.strictEqual(b.velocity.x, MOVE_SPEED);

        applyPlayerInput(b, { moveX: -5, jump: false });
        assert.strictEqual(b.velocity.x, -MOVE_SPEED);
    });

    it("jumps when grounded", () => {
        const b = body(0);
        applyPlayerInput(b, { moveX: 0, jump: true });
        assert.strictEqual(b.velocity.y, -JUMP_SPEED);
        assert.ok(b.timeSinceGrounded > COYOTE_TIME, "can't jump again mid-air");
    });

    it("still jumps within coyote time after leaving the ground", () => {
        const b = body(COYOTE_TIME);
        applyPlayerInput(b, { moveX: 0, jump: true });
        assert.strictEqual(b.velocity.y, -JUMP_SPEED);
    });

    it("does not jump after coyote time runs out", () => {
        const b = body(COYOTE_TIME + 1, 10);
        applyPlayerInput(b, { moveX: 0, jump: true });
        assert.strictEqual(b.velocity.y, 10);
    });

    it("cuts the jump short when jump is released while rising", () => {
        const b = body(0);
        applyPlayerInput(b, { moveX: 0, jump: true });
        applyPlayerInput(b, { moveX: 0, jump: false });
        assert.strictEqual(b.velocity.y, 0);
    });

    it("caps falling speed", () => {
        const b = body(COYOTE_TIME + 1, MAX_FALL_SPEED * 3);
        applyPlayerInput(b, { moveX: 0, jump: false });
        assert.strictEqual(b.velocity.y, MAX_FALL_SPEED);
    });
});
