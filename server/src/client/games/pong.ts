import { Callbacks, type ColyseusSDK } from "@colyseus/sdk";
import { Predict } from "@colyseus/sdk/predict";
import type { default as server } from "../../app.config.js";
import type { MoveInput } from "../../rooms/schema/PongState.js";
import type { PongRoom } from "../../rooms/PongRoom.js";
import { stepEntity } from "../../shared/movement.js";

export interface PongElements {
    game: HTMLElement;
    arena: HTMLElement;
    score: HTMLElement;
    status: HTMLElement;
}

/**
 * Starts the Pong client for an existing Pong room.
 *
 * The application owns the Colyseus client and decides which game to launch.
 * Pong owns everything specific to playing and rendering Pong.
 */
export async function startPong(client: ColyseusSDK<typeof server>, roomId: string, elements: PongElements) {
    const { game, arena, score, status } = elements;
    const room = await client.joinById<PongRoom>(roomId);
    const predict = Predict.get(room);

    const held = new Set<string>();

    const onKeyDown = (event: KeyboardEvent) => {
        held.add(event.key.toLowerCase());
    };

    const onKeyUp = (event: KeyboardEvent) => {
        held.delete(event.key.toLowerCase());
    };

    addEventListener("keydown", onKeyDown);
    addEventListener("keyup", onKeyUp);

    // Opposite keys cancel out, so the axis is always exactly -1, 0 or 1.
    function axis(negative: string[], positive: string[]): -1 | 0 | 1 {
        const back = negative.some((key) => held.has(key));
        const forward = positive.some((key) => held.has(key));
        if (back === forward) { return 0; }
        return back ? -1 : 1;
    }

    // Other players' inputs aren't ours to predict: interpolate them toward the
    // latest snapshot instead. `smoothMs` springs the interpolated output — ~65 ms
    // of extra display lag buys velocity that stays continuous even when the
    // snapshot stream is rough. Use 0 where draw == hit precision matters most.
    predict.attachAll("players", { mode: "lerp", fields: ["x", "y"], smoothMs: 65 });

    const input = room.input<MoveInput>({ mode: "reliable" });

    // The first patch is what creates our own Player.
    await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
    const self = room.state.players.get(room.sessionId);

    predict.reconciler(self, {
        input,
        fields: ["x", "y", "vx", "vy"],
        // The same function the server runs — determinism is the whole contract.
        step: (ctx, predicted, command) => stepEntity(predicted, command, ctx.dt),
    });

    game.hidden = false;
    status.textContent = `Connected as ${room.sessionId}`;

    const nodes = new Map<string, HTMLElement>();
    const callbacks = Callbacks.get(room);

    // Create the ball
    const ballDiv = document.createElement("div");
    ballDiv.className = "ball";
    arena.appendChild(ballDiv);

    // Create a DOM element when a player joins
    callbacks.onAdd("players", (_player, sessionId) => {
        const node = document.createElement("div");
        node.className = sessionId === room.sessionId ? "player self" : "player";
        arena.appendChild(node);
        nodes.set(sessionId, node);
    });

    // Remove a players DOM element
    callbacks.onRemove("players", (_player, sessionId) => {
        nodes.get(sessionId)?.remove();
        nodes.delete(sessionId);
    });


    room.onLeave(() => {
        status.textContent = "Disconnected";
        nodes.forEach((node) => node.remove());
        nodes.clear();
        ballDiv.remove();
        removeEventListener("keydown", onKeyDown);
        removeEventListener("keyup", onKeyUp);
    });

    function frame(now: number) {
        // Drives prediction, interpolation and the reconciler, and returns how many
        // fixed steps came due — so input rate follows the simulation rate, not the
        // monitor's refresh rate.
        const steps = predict.tick(now);

        for (let i = 0; i < steps; i++) {
            // input.data.moveX = axis(["a", "arrowleft"], ["d", "arrowright"]);
            input.data.moveY = axis(["w", "arrowup"], ["s", "arrowdown"]);
            input.send();
        }

        for (const [sessionId, player] of room.state.players) {
            const node = nodes.get(sessionId);
            if (!node) { continue; }
            // Predicted for us, interpolated for everyone else — one read either way.
            // node.style.transform = `translate(${predict.value(player, "x")}px, ${predict.value(player, "y")}px)`;
            node.style.transform = `translate(${player.position.x}px, ${player.position.y}px) translate(-50%, -50%)`;
        }

        const ballState = room.state.ball;
        ballDiv.style.transform = `translate(${ballState.position.x}px, ${ballState.position.y}px) translate(-50%, -50%)`;

        score.textContent = `${room.state.leftScore} | ${room.state.rightScore}`;

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}