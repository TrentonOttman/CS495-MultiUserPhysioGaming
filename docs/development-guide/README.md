# Development Guide

## Project Overview

**MultiUserPhysioGaming** is a browser-based multiplayer gaming platform designed as a fun, accessible introduction to physiological computing for a younger audience, featuring **PhysioPark** as its primary game. The platform supports electromyography (EMG) sensor connections alongside standard controls as player inputs, using a unified client-server architecture where game logic and LDtk level geometry are shared between the frontend and backend.

## Codebase Structure

```text
├── server/
│   ├── public/              # Static game assets (sprites, backgrounds, animations)
│   ├── src/
│   │   ├── client/          # Frontend rendering and standard controls
│   │   ├── rooms/           # Multiplayer state, networking, and backend logic
│   │   ├── sensor/          # EMG sensor connection and input handling
│   │   └── shared/          # Shared types, physics, and game definitions
│   │       └── physioPark/
│   │           ├── levels/  # LDtk project files (PhysioPark.json)
│   │           └── physioParkLevel.ts
│   ├── tests/               # Automated unit and integration tests
│   └── package.json
```

## Prerequisites

- **Node.js:** `>= 22.12.0` (see the `engines` field in `server/package.json`)
- **LDtk:** `>= 1.5.3` (required for level editing; [download here](https://ldtk.io/download/))

## Environment Config

MultiUserPhysioGaming does not require environment files or use any secrets.

## Setup & Running Locally

The client and server are both built and run from the `server` directory.

1. Install dependencies:
    ```sh
    cd server
    npm install
    ```

2. Start the development server:
   ```sh
   npm run dev
   ```
    The app will be available at `http://localhost:5173/`.

## Creating Game Levels

1. Launch LDtk, click **Load**, and open `server/src/shared/physioPark/levels/PhysioPark.json`.
2. Select **CREATE A NEW LEVEL** and place it on the canvas.
3. Build your level using the three available layers:
    - `Terrain`: Visual tiles only.
    - `Collisions`: Solid boundaries and physical obstacles.
    - `Entities`: Interactive objects, spawn points, and triggers.
      > **Note:** Every level must include both a `SpawnPoint` and a `GoalArea` entity to function properly.
4. Save your changes to the project file (`Ctrl+S` / `Cmd+S`).
5. Register the new level by adding its LDtk level identifier to `PHYSIO_PARK_LEVELS` in `server/src/shared/physioPark/physioParkLevel.ts`:
    ```ts
    export const PHYSIO_PARK_LEVELS = [
        parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_1" }),
        parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Level_2" }),
        // ...
        parseLDtkProjectLevel(ldtkProjectJson, { levelId: "Your_New_Level_ID" }), // <-- Add identifier here
    ] as const;
    ```

## Testing

From the `server` directory, run the Jest test suite:

```sh
npm test
```

All unit and integration tests live in `server/tests/`. For more information about this project's tests, see the [Testing Plan](/docs/testing/test-plan.md).

## Coding & Style Standards

- **Respect Module Boundaries:** Keep domain logic within its respective directory (`client/`, `rooms/`, `sensor/`, `shared/`).
- **Naming Conventions:**
    - Use `camelCase` for variables, functions, and file names.
    - Use `PascalCase` for classes, interfaces, types, and LDtk entity identifiers.
- **TypeScript Usage:** Avoid using the `any` type when possible.
- **Type Checking (CI Requirement):** `npx tsc --noEmit` runs automatically on every pull request. Run it inside the `server` directory before opening or updating a PR to catch TypeScript errors early:
    ```sh
    npx tsc --noEmit
    ```

## Known Gotchas & Caveats

- Adding a level inside `PhysioPark.json` in LDtk does not automatically make it playable, you must manually register its level ID.
- Physics and collision logic in `shared/` must remain deterministic to avoid the client and server desyncing.
- Pong is currently bugged and sometimes does not load properly for one player.
- Most **PhysioPark** levels are designed around a two-player experience despite supporting up to eight players in one lobby.