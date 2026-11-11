import { PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT_HALF } from "../physioParkConstants.js";
import { allPlayersInsideGoalArea } from "./shared.js";
import type { ResolvedPhysioParkLevel, BoxDefinition, ButtonDefinition, MovingPlatformDefinition, PlayerSwitchDefinition, LevelTile } from "./types.js";

export interface LDtkLoaderOptions {
    levelIndex?: number;
    levelId?: string;
    isComplete?: (players: any[], objectives: any) => boolean;
    tilesetKey?: string;
}

function mergeRectsVertically(rects: { x: number; y: number; width: number; height: number }[]) {
    const sorted = [...rects].sort((a, b) => a.x - b.x || a.width - b.width || a.y - b.y);
    const merged: { x: number; y: number; width: number; height: number }[] = [];
    
    for (const rect of sorted) {
        const last = merged[merged.length - 1];
        if (last && last.x === rect.x && last.width === rect.width && last.y + last.height === rect.y) {
            last.height += rect.height;
        } else {
            merged.push({ ...rect });
        }
    }
    return merged;
}

export function parseLDtkProjectLevel(projectJson: any, options: LDtkLoaderOptions = {}): ResolvedPhysioParkLevel {
    const levels = projectJson.levels ?? [];
    const targetLevel = options.levelId 
        ? levels.find((l: any) => l.identifier === options.levelId)
        : levels[options.levelIndex ?? 0];

    if (!targetLevel) {
        throw new Error(`LDtk level not found in project (index: ${options.levelIndex}, id: ${options.levelId})`);
    }

    const tilesetKey = options.tilesetKey ?? "ldtkTileset2";
    const layerInstances = targetLevel.layerInstances ?? [];
    const collisionLayer = layerInstances.find((l: any) => l.__identifier === "Collisions");
    const entityLayer = layerInstances.find((l: any) => l.__identifier === "Entities");
    const terrainLayer = layerInstances.find((l: any) => l.__identifier === "Terrain");

const rawSolids: { x: number; y: number; width: number; height: number }[] = [];
const lavaRows: boolean[][] = [];
const convLeftRows: boolean[][] = [];
const convRightRows: boolean[][] = [];
const solidRows: boolean[][] = [];

if (collisionLayer && collisionLayer.intGridCsv) {
    const cWid = collisionLayer.__cWid;
    const cHei = collisionLayer.__cHei;
    const gridSize = collisionLayer.__gridSize;
    const csv = collisionLayer.intGridCsv;

    for (let y = 0; y < cHei; y++) {
        const sRow = Array(cWid).fill(false);
        const lRow = Array(cWid).fill(false);
        const clRow = Array(cWid).fill(false);
        const crRow = Array(cWid).fill(false);

        for (let x = 0; x < cWid; x++) {
            const val = csv[y * cWid + x];
            if (val === 1 || val === 2 || val === 4 || val === 5) sRow[x] = true; 
            if (val === 3) lRow[x] = true;        // llava
            if (val === 4) clRow[x] = true;       // conveyor Left
            if (val === 5) crRow[x] = true;       // conveyor Right
        }
        solidRows.push(sRow);
        lavaRows.push(lRow);
        convLeftRows.push(clRow);
        convRightRows.push(crRow);
    }

    const getRectsFromGrid = (grid: boolean[][]) => {
        const rects: { x: number; y: number; width: number; height: number }[] = [];
        for (let y = 0; y < cHei; y++) {
            let startX = -1;
            for (let x = 0; x <= cWid; x++) {
                const active = x < cWid && grid[y][x];
                if (active && startX === -1) {
                    startX = x;
                } else if (!active && startX !== -1) {
                    rects.push({
                        x: startX * gridSize,
                        y: y * gridSize,
                        width: (x - startX) * gridSize,
                        height: gridSize,
                    });
                    startX = -1;
                }
            }
        }
        return rects;
    };

    rawSolids.push(...getRectsFromGrid(solidRows));
    var lavas = getRectsFromGrid(lavaRows);
    const convLeft = getRectsFromGrid(convLeftRows);
    const convRight = getRectsFromGrid(convRightRows);

    var conveyors = [
        ...convLeft.map(surface => ({ surface, pushSpeed: 28 })),
        ...convRight.map(surface => ({ surface, pushSpeed: 28 }))
    ];
} 

    const width = targetLevel.pxWid;
    const height = targetLevel.pxHei;

    const solids = [
        ...mergeRectsVertically(rawSolids),
        { x: -8, y: -300, width: 8, height: 600 },
        { x: width, y: -300, width: 8, height: 600 },
    ];

    const entityInstances = entityLayer?.entityInstances ?? [];
    const entityByIid = new Map<string, any>(entityInstances.map((e: any) => [e.iid, e]));

    const spawns: { x: number; y: number }[] = [];
    const boxes: BoxDefinition[] = [];
    const movingPlatforms: MovingPlatformDefinition[] = [];
    const switches: PlayerSwitchDefinition[] = [];
    let goalArea = { x: 0, y: 0, width: 16, height: 16 };
    let goalFlagPosition: { x: number; y: number } | undefined;
    let button: ButtonDefinition | undefined;

    for (const ent of entityInstances) {
        const x = ent.px[0];
        const y = ent.px[1];
        const entWidth = ent.width;
        const entHeight = ent.height;

        switch (ent.__identifier) {
            case "SpawnPoint":
                spawns.push({ x, y });
                break;
            case "GoalArea":
                goalArea = { x, y, width: entWidth, height: entHeight };
                break;
            case "GoalFlag":
                goalFlagPosition = { x: x + entWidth / 2, y: y + entHeight };
                break;
            case "Box":
                boxes.push({ id: ent.iid, x, y, width: entWidth, height: entHeight });
                break;
            case "PlayerSwitch": {
                const playerField = ent.fieldInstances.find((f: any) => f.__identifier === "Player")?.__value ?? 0;
                const targetRef = ent.fieldInstances.find((f: any) => f.__identifier === "Target")?.__value;
                switches.push({
                    id: ent.iid,
                    x,
                    y,
                    width: entWidth,
                    height: entHeight,
                    player: playerField,
                    target: targetRef?.entityIid ?? null,
                });
                break;
            }
            case "Button": {
                const targetRef = ent.fieldInstances.find((f: any) => f.__identifier === "Target")?.__value;
                button = {
                    sprite: "buttonPress",
                    position: { x: x + entWidth / 2, y },
                    target: targetRef?.entityIid ?? null,
                };
                break;
            }
            case "MovingPlatform": {
                const speed = ent.fieldInstances.find((f: any) => f.__identifier === "speed")?.__value ?? 10;
                const platformType = ent.fieldInstances.find((f: any) => f.__identifier === "PlatformType")?.__value ?? "Stone";
                const movementType = ent.fieldInstances.find((f: any) => f.__identifier === "MovementType")?.__value ?? "Once";
                const endPointRef = ent.fieldInstances.find((f: any) => f.__identifier === "EndPoint")?.__value;
                
                let endX = x;
                let endY = y;
                if (endPointRef && entityByIid.has(endPointRef.entityIid)) {
                    const endpointEntity = entityByIid.get(endPointRef.entityIid);
                    endX = endpointEntity.px[0];
                    endY = endpointEntity.px[1];
                }

                movingPlatforms.push({
                    id: ent.iid,
                    x,
                    y,
                    width: entWidth,
                    height: entHeight,
                    endX,
                    endY,
                    speed,
                    type: platformType,
                    movementType,
                });
                break;
            }
        }
    }

    const tiles: LevelTile[] = [];
    if (terrainLayer?.gridTiles) {
        for (const tile of terrainLayer.gridTiles) {
            tiles.push({
                x: tile.px[0],
                y: tile.px[1],
                sourceX: tile.src[0],
                sourceY: tile.src[1],
                size: terrainLayer.__gridSize,
                tileset: tilesetKey,
                flipX: (tile.f & 1) !== 0,
                flipY: (tile.f & 2) !== 0,
            });
        }
    }

    const spawnX = spawns[0]?.x ?? (width / 2);
    const spawnY = spawns[0]?.y ?? 0;
    
    const floorRect = rawSolids
        .filter(s => spawnX >= s.x && spawnX <= s.x + s.width && s.y >= spawnY)
        .sort((a, b) => a.y - b.y)[0];
    
    const groundY = floorRect ? floorRect.y : (spawnY || height - 32);

    return {
        id: targetLevel.identifier,
        name: targetLevel.identifier.replace("_", " "),
        width,
        height,
        solids,
        lavas,
        goalArea,
        goalFlagPosition,
        boxes: boxes.length ? boxes : undefined,
        conveyors: conveyors.length ? conveyors : undefined,
        button,
        movingPlatforms: movingPlatforms.length ? movingPlatforms : undefined,
        switches: switches.length ? switches : undefined,
        tiles,
        tilesets: { [tilesetKey]: "/assets/tilesets/AllTiles.png" },
        background: targetLevel.bgRelPath ? targetLevel.bgRelPath.replace("../../../server/public", "") : undefined,
        groundY,
        spawnPoint(index: number) {
            const spawn = spawns[index % spawns.length] ?? { x: 0, y: 0 };
            return {
                x: spawn.x - PLAYER_WIDTH / 2 + (index % 4) * PLAYER_WIDTH,
                y: spawn.y - PLAYER_HEIGHT_HALF,
            };
        },

        isComplete(players, objectives) {
            if (options.isComplete) return options.isComplete(players, objectives);
            const inside = allPlayersInsideGoalArea(players, goalArea);
            return button ? (objectives.buttonPressed && inside) : inside;
        },
    };
}