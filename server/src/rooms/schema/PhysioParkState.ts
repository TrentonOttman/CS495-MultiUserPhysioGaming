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
    /** Top-left corner of the player's collision box, in pixels. */
    x: t.number(),
    y: t.number(),
    vx: t.number(),
    vy: t.number(),
    /** True when standing on something; only grounded players can jump. */
    grounded: t.boolean(),
    /** Index into the client's color list, assigned on join. */
    color: t.uint8(),
    /** False while the player's connection has dropped and their seat is held. */
    connected: t.boolean().default(true),
});
export type Player = SchemaType<typeof Player>;

export type PhysioParkLevelPhase = "playing" | "transitioning" | "completed";

export const PhysioParkState = LobbyState.extend({

    players: t.map(Player),

    /** One-based index of the level currently loaded in the room. */
    levelNumber: t.uint8().default(1),

    /** Server-authoritative phase shared by every client. */
    levelPhase: t.string<PhysioParkLevelPhase>().default("playing"),

}, "PhysioParkState");
export type PhysioParkState = SchemaType<typeof PhysioParkState>;
