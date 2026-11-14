# Development Guide

## Prerequisites

- **Node.js:** `>= 22.12.0` (see the `engines` field in `server/package.json`)
- **LDtk:** `>= 1.5.3` (required for level editing; [download here](https://ldtk.io/download/))

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