import { schema, t, type SchemaType } from "@colyseus/schema";
import { LobbyState } from "./LobbyState.js";

/**
 * One input frame, consumed by `Room.defineInput()`.
 *
 * Platformer controls: horizontal movement plus a jump button. Left/right comes
 * from the keyboard; jump is the action EMG input will drive later.
 *
 * `int8<-1 | 0 | 1>` narrows the type for your code; the room's `sanitize`
 * clamp is what actually enforces it against a modified client.
 */
export const MoveInput = schema({
    moveX: t.int8<-1 | 0 | 1>(),
    jump: t.boolean(),
});
export type MoveInput = SchemaType<typeof MoveInput>;

export const Player = schema({
    /** Center of the player, in pixels. */
    x: t.number(),
    y: t.number(),
    vx: t.number(),
    vy: t.number(),
    /** True when standing on something; only grounded players can jump. */
    grounded: t.boolean(),
    /** Index into the client's color list, assigned on join. */
    color: t.uint8(),
});
export type Player = SchemaType<typeof Player>;

export const PhysioParkState = LobbyState.extend({

    players: t.map(Player),

    /** Set once any player stands on the goal ledge. */
    goalReached: t.boolean().default(false),

}, "PhysioParkState");
export type PhysioParkState = SchemaType<typeof PhysioParkState>;
