# Physics Sandbox

A local test page for the Physio Park platformer physics (`src/shared/platformerMovement.ts`).
It runs the shared physics directly in the browser on a test level based on the
"Intro to mechanics" sketch. No server, no networking, and no Phaser: players are drawn
as colored squares on an HTML canvas.

## Run it

From the `server` folder:

    npx vite sandbox

Then open the `Local:` address it prints (usually http://localhost:5173) in Chrome or Edge,
and click the page so it receives keyboard input.

## Controls

| Player | Move | Jump |
|---|---|---|
| Green | A / D | W |
| Blue | ← / → | ↑ |
| Pink | J / L | I |

Press **R** to reset everyone. Falling into the lava respawns that player.

## What to try

- The goal ledge on the right is too high for a single jump. Stand on another player to reach it.
- Stand on a player and walk the bottom one around; the top one rides along.

## Tuning

Gravity, jump strength, move speed, and player size live in `src/shared/platformerConstants.ts`.
Change a value, save, and refresh the page.