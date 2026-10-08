import { stepAllPlayers, type PlatformerPlayer, type Solid } from "../src/shared/platformerMovement.js";
import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH_HALF, PLAYER_HEIGHT_HALF } from "../src/shared/platformerConstants.js";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const W = canvas.width;
const H = canvas.height;
const DT = 1 / 60;
const GROUND_TOP = 480;

// Test level based on the "Intro to mechanics" sketch.
const GOAL: Solid = { x: 780, y: GROUND_TOP - 130, width: 180, height: 20 }; // too high for one jump
const solids: Solid[] = [
    { x: 0, y: GROUND_TOP, width: 300, height: 60 },    // left ground
    { x: 360, y: 420, width: 70, height: 20 },          // stepping platform 1
    { x: 480, y: 380, width: 70, height: 20 },          // stepping platform 2
    { x: 620, y: GROUND_TOP, width: 340, height: 60 },  // right ground
    GOAL,
    { x: -20, y: -1000, width: 20, height: 2000 },      // left screen edge
    { x: W, y: -1000, width: 20, height: 2000 },        // right screen edge
];
const LAVA = { x: 300, y: 500, width: 320, height: 40 };

const PLAYERS = [
    { color: "#7ec97e", left: "a", right: "d", jump: "w", spawnX: 60 },
    { color: "#7eb6e0", left: "arrowleft", right: "arrowright", jump: "arrowup", spawnX: 120 },
    { color: "#e09ad8", left: "j", right: "l", jump: "i", spawnX: 180 },
];

function spawn(i: number): PlatformerPlayer {
    return {
        body: {
            position: { x: PLAYERS[i].spawnX, y: GROUND_TOP - PLAYER_HEIGHT_HALF },
            velocity: { x: 0, y: 0 },
            grounded: false,
        },
        input: { moveX: 0, jump: false },
    };
}

let players = PLAYERS.map((_, i) => spawn(i));

const held = new Set<string>();
addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    held.add(key);
    if (key.startsWith("arrow")) { e.preventDefault(); } // stop the page from scrolling
    if (key === "r") { players = PLAYERS.map((_, i) => spawn(i)); }
});
addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

function update() {
    players.forEach((p, i) => {
        const keys = PLAYERS[i];
        p.input.moveX = (held.has(keys.right) ? 1 : 0) - (held.has(keys.left) ? 1 : 0);
        p.input.jump = held.has(keys.jump);
    });

    stepAllPlayers(players, solids, DT);

    // Falling into the lava respawns the player.
    players.forEach((p, i) => {
        if (p.body.position.y + PLAYER_HEIGHT_HALF > LAVA.y + 10) { players[i] = spawn(i); }
    });
}

function onGoal(p: PlatformerPlayer): boolean {
    const feet = p.body.position.y + PLAYER_HEIGHT_HALF;
    return p.body.grounded
        && Math.abs(feet - GOAL.y) < 0.01
        && p.body.position.x > GOAL.x
        && p.body.position.x < GOAL.x + GOAL.width;
}

function draw() {
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#e8743b";
    ctx.fillRect(LAVA.x, LAVA.y, LAVA.width, LAVA.height);

    ctx.fillStyle = "#555";
    for (const s of solids) { ctx.fillRect(s.x, s.y, s.width, s.height); }

    // Goal flag
    ctx.fillStyle = "#333";
    ctx.fillRect(GOAL.x + GOAL.width - 30, GOAL.y - 40, 4, 40);
    ctx.fillStyle = "#3a3";
    ctx.beginPath();
    ctx.moveTo(GOAL.x + GOAL.width - 26, GOAL.y - 40);
    ctx.lineTo(GOAL.x + GOAL.width - 6, GOAL.y - 32);
    ctx.lineTo(GOAL.x + GOAL.width - 26, GOAL.y - 24);
    ctx.fill();

    players.forEach((p, i) => {
        const x = p.body.position.x - PLAYER_WIDTH_HALF;
        const y = p.body.position.y - PLAYER_HEIGHT_HALF;
        ctx.fillStyle = PLAYERS[i].color;
        ctx.fillRect(x, y, PLAYER_WIDTH, PLAYER_HEIGHT);
        ctx.fillStyle = "#111"; // eyes
        ctx.fillRect(x + 7, y + 10, 6, 8);
        ctx.fillRect(x + 19, y + 10, 6, 8);
    });

    if (players.some(onGoal)) {
        ctx.fillStyle = "#3a3";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Goal reached!", 20, 40);
    }
}

// Fixed 60 Hz simulation, drawn every animation frame.
let last = performance.now();
let accumulator = 0;
function frame(now: number) {
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (accumulator >= DT) {
        update();
        accumulator -= DT;
    }
    draw();
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);