#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(scriptDir, "..");
const inputPath = process.argv[2];
if (!inputPath) {
    console.error("Usage: npm run levels:convert -- <project.ldtk> [level identifier] [output name]");
    process.exit(2);
}

const sourcePath = path.resolve(process.cwd(), inputPath);
const projectDirectory = path.dirname(sourcePath);
const outputName = (process.argv[4] ?? path.basename(projectDirectory)).replace(/[^a-zA-Z0-9_-]/g, "") || "ldtkLevel";
const outputPath = path.resolve(serverDir, `src/shared/physioPark/levels/${outputName}.ts`);
const project = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const level = project.levels.find((candidate) => !process.argv[3] || candidate.identifier === process.argv[3]);
if (!level) throw new Error(`Level '${process.argv[3]}' was not found in ${sourcePath}`);

const layerDefs = new Map(project.defs.layers.map((definition) => [definition.uid, definition]));
const entityDefs = new Map(project.defs.entities.map((definition) => [definition.uid, definition.identifier]));
const tilesetDefs = new Map(project.defs.tilesets.map((definition) => [definition.uid, definition]));
const semanticValues = new Map();
for (const definition of project.defs.layers) {
    for (const value of definition.intGridValues ?? []) {
        semanticValues.set(`${definition.uid}:${value.value}`, value.identifier);
    }
}

// Turn grid cells into maximal rectangles. Horizontal runs are merged vertically
// when their x coordinate and width match, keeping collision data compact.
function rectanglesFor(cells, cellSize) {
    const rows = new Map();
    for (const { x, y } of cells) {
        const row = rows.get(y) ?? [];
        row.push(x);
        rows.set(y, row);
    }
    const runs = [];
    for (const [y, xs] of rows) {
        xs.sort((a, b) => a - b);
        let start = xs[0];
        let previous = xs[0];
        for (const x of xs.slice(1).concat([Number.NaN])) {
            if (x === previous + 1) { previous = x; continue; }
            runs.push({ x: start, y, width: previous - start + 1, height: 1 });
            start = previous = x;
        }
    }
    runs.sort((a, b) => a.x - b.x || a.width - b.width || a.y - b.y);
    const merged = [];
    for (const run of runs) {
        const previous = merged.find((rect) => rect.x === run.x && rect.width === run.width && rect.y + rect.height === run.y);
        if (previous) previous.height++;
        else merged.push({ ...run });
    }
    return merged.map(({ x, y, width, height }) => ({ x: x * cellSize, y: y * cellSize, width: width * cellSize, height: height * cellSize }));
}

function resolveProjectAsset(reference, { matchStem = false } = {}) {
    const direct = path.resolve(projectDirectory, reference);
    if (fs.existsSync(direct)) return direct;
    const basename = path.basename(reference);
    // Projects may refer to assets that have been consolidated into the game's
    // public asset folders instead of keeping local copies beside the .ldtk.
    for (const assetDirectory of ["backgrounds", "tilesets"]) {
        const publicDirectory = path.resolve(serverDir, `public/assets/${assetDirectory}`);
        if (!fs.existsSync(publicDirectory)) continue;
        const match = fs.readdirSync(publicDirectory).find((name) => name.toLowerCase() === basename.toLowerCase());
        if (match) return path.join(publicDirectory, match);
    }
    if (matchStem) {
        const stem = path.parse(basename).name;
        const match = fs.readdirSync(projectDirectory)
            .filter((name) => name.startsWith(stem) && /\.(png|jpg|jpeg)$/i.test(name))
            .sort()[0];
        if (match) return path.join(projectDirectory, match);
    }
    const parentDirectory = path.dirname(projectDirectory);
    for (const entry of fs.readdirSync(parentDirectory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const sibling = path.join(parentDirectory, entry.name, basename);
        if (fs.existsSync(sibling)) return sibling;
    }
    throw new Error(`Could not resolve project image '${reference}' from ${projectDirectory}`);
}

const semanticCells = new Map();
const tiles = [];
const tilesets = {};
const copiedTilesets = new Set();
const spawns = [];
const movingPlatforms = [];
const switches = [];
let goalArea;
let goalPostEntity;
let goalFlagEntity;
let goalFlagPosition;
let buttonEntity;
let boxEntity;
let lavaCells = [];
const conveyorCells = new Map();
for (const layer of level.layerInstances ?? []) {
    if (!layer) continue;
    const layerDef = layerDefs.get(layer.layerDefUid);
    if (layerDef?.type === "IntGrid") {
        const cells = layer.intGridCsv ?? [];
        for (let index = 0; index < cells.length; index++) {
            const semantic = semanticValues.get(`${layer.layerDefUid}:${cells[index]}`);
            if (!semantic || cells[index] === 0) continue;
            const entry = semanticCells.get(semantic) ?? [];
            entry.push({ x: index % layer.__cWid, y: Math.floor(index / layer.__cWid), size: layer.__gridSize });
            semanticCells.set(semantic, entry);
        }
    }
    for (const entity of layer.entityInstances ?? []) {
        const identifier = entityDefs.get(entity.defUid);
        if (identifier === "SpawnPoint") {
            // LDtk marker y is the intended foot/surface height; the level adapter
            // offsets the player center by its half-height.
            spawns.push({ x: entity.px[0] + entity.width / 2, y: entity.px[1] });
        } else if (identifier === "GoalArea") {
            goalArea = { x: entity.px[0], y: entity.px[1], width: entity.width, height: entity.height };
        } else if (identifier === "GoalPost") {
            goalPostEntity = entity;
        } else if (identifier === "GoalFlag") {
            goalFlagEntity = entity;
        } else if (identifier === "Button") {
            buttonEntity = entity;
        } else if (identifier === "Box") {
            boxEntity = entity;
        } else if (identifier === "MovingPlatform") {
            const field = (name) => entity.fieldInstances?.find((entry) => entry.__identifier === name)?.__value;
            const endpoint = field("endPoint");
            const gridSize = layer.__gridSize;
            movingPlatforms.push({
                id: entity.iid,
                x: entity.px[0],
                y: entity.px[1],
                width: entity.width,
                height: entity.height,
                endX: endpoint ? endpoint.cx * gridSize : entity.px[0],
                endY: endpoint ? endpoint.cy * gridSize : entity.px[1],
                speed: Number(field("speed") ?? 20),
                type: field("PlatformType") ?? "Stone",
            });
        } else if (identifier === "PlayerSwitch") {
            const field = (name) => entity.fieldInstances?.find((entry) => entry.__identifier === name)?.__value;
            const target = field("Target");
            switches.push({
                id: entity.iid,
                x: entity.px[0],
                y: entity.px[1],
                width: entity.width,
                height: entity.height,
                player: Number(field("Player") ?? 0),
                target: target?.entityIid ?? target?.iid ?? null,
            });
        }
    }
    const tileset = tilesetDefs.get(layer.__tilesetDefUid);
    const tileSize = layer.__gridSize;
    for (const tile of [...(layer.autoLayerTiles ?? []), ...(layer.gridTiles ?? [])]) {
        if (!tileset || !tile.src || !tile.px) continue;
        const key = `ldtkTileset${tileset.uid}`;
        const relPath = tileset.relPath;
        if (!relPath) throw new Error(`Tileset '${tileset.identifier}' must reference an external image.`);
        const atlasPath = resolveProjectAsset(relPath, { matchStem: true });
        const atlasName = path.basename(atlasPath);
        tilesets[key] = `/assets/tilesets/${atlasName}`;
        if (!copiedTilesets.has(tileset.uid) && atlasPath !== path.resolve(serverDir, `public/assets/tilesets/${atlasName}`)) {
            const atlasTarget = path.resolve(serverDir, `public/assets/tilesets/${atlasName}`);
            fs.mkdirSync(path.dirname(atlasTarget), { recursive: true });
            fs.copyFileSync(atlasPath, atlasTarget);
            copiedTilesets.add(tileset.uid);
        }
        tiles.push({ x: tile.px[0], y: tile.px[1], sourceX: tile.src[0], sourceY: tile.src[1], size: tileSize, tileset: key, flipX: Boolean(tile.f & 1), flipY: Boolean(tile.f & 2) });
    }
}

if (!spawns.length) throw new Error("Level needs at least one SpawnPoint entity.");
const solidCells = [];
for (const [semantic, cells] of semanticCells) {
    if (semantic.toLowerCase() === "lava") lavaCells.push(...cells);
    else if (["ground", "platform", "solid"].includes(semantic.toLowerCase())) solidCells.push(...cells);
    else if (["conveyor_left", "conveyor_right"].includes(semantic.toLowerCase())) conveyorCells.set(semantic.toLowerCase(), cells);
}
const conveyors = [];
const conveyorSolidRects = [];
for (const [semantic, cells] of conveyorCells) {
    const size = cells[0]?.size ?? 8;
    const surfaces = rectanglesFor(cells, size);
    const pushSpeed = semantic === "conveyor_left" ? -28 : 28;
    for (const surface of surfaces) {
        conveyors.push({ surface, pushSpeed });
        conveyorSolidRects.push(surface);
    }
}
if (!solidCells.length) throw new Error("Level has no collision cells. Name IntGrid values Ground, Platform, or Solid.");
if (!lavaCells.length) throw new Error("Level has no Lava IntGrid cells.");
const solidsBySize = new Map();
for (const cell of solidCells) {
    const bucket = solidsBySize.get(cell.size) ?? [];
    bucket.push(cell);
    solidsBySize.set(cell.size, bucket);
}
const solids = [
    ...[...solidsBySize].flatMap(([size, cells]) => rectanglesFor(cells, size)),
    ...conveyorSolidRects,
    { x: -8, y: -300, width: 8, height: 600 },
    { x: level.pxWid, y: -300, width: 8, height: 600 },
];
if (goalFlagEntity) {
    // GoalFlag is authored as a rectangle; its bottom-center is the flag pole anchor.
    goalFlagPosition = {
        x: goalFlagEntity.px[0] + goalFlagEntity.width / 2,
        y: goalFlagEntity.px[1] + goalFlagEntity.height,
    };
} else if (goalPostEntity) {
    const goalX = goalPostEntity.px[0] + goalPostEntity.width / 2;
    const support = solids.find((solid) => goalX >= solid.x
        && goalX < solid.x + solid.width
        && solid.y >= goalPostEntity.px[1]
        && solid.y <= goalPostEntity.px[1] + goalPostEntity.height);
    const platformY = support?.y ?? goalPostEntity.px[1];
    goalFlagPosition = { x: goalX, y: platformY };
    // Preserve a generous trigger above wide goal platforms, but keep it compact
    // when the LDtk goal sits on a short platform.
    const areaWidth = Math.min(96, support?.width ?? 48);
    const areaHeight = areaWidth >= 96 ? 48 : 32;
    goalArea ??= {
        x: goalX - areaWidth / 2,
        y: platformY - areaHeight,
        width: areaWidth,
        height: areaHeight,
    };
}
if (!goalArea) throw new Error("Level needs a rectangular GoalArea entity or a GoalPost over a solid platform.");
const lavaBySize = new Map();
for (const cell of lavaCells) {
    const bucket = lavaBySize.get(cell.size) ?? [];
    bucket.push(cell);
    lavaBySize.set(cell.size, bucket);
}
const lavaRects = [...lavaBySize].flatMap(([size, cells]) => rectanglesFor(cells, size));
let button;
if (buttonEntity || boxEntity) {
    if (!buttonEntity || !boxEntity) throw new Error("Button and Box entities must both be present for the button/crate mechanic.");
    button = {
        sprite: "buttonPress",
        // Button.position is the bottom-center anchor. The LDtk marker's y is
        // already placed on the platform top, so don't add the marker height.
        position: { x: buttonEntity.px[0] + buttonEntity.width / 2, y: buttonEntity.px[1] },
        crate: { x: boxEntity.px[0], y: boxEntity.px[1], width: boxEntity.width, height: boxEntity.height },
    };
}
const runtimeSprites = [];
if (buttonEntity) {
    runtimeSprites.push({
        x: buttonEntity.px[0],
        y: buttonEntity.px[1] - 16,
        width: 16,
        height: 16,
    });
}
if (boxEntity) {
    runtimeSprites.push({
        x: boxEntity.px[0],
        y: boxEntity.px[1],
        width: boxEntity.width,
        height: boxEntity.height,
    });
}

const generated = {
    id: level.identifier,
    name: level.identifier.replaceAll("_", " "),
    width: level.pxWid,
    height: level.pxHei,
    solids,
    lavas: lavaRects,
    goalArea,
    ...(goalFlagPosition ? { goalFlagPosition } : {}),
    ...(conveyors.length ? { conveyors } : {}),
    ...(button ? { button } : {}),
    ...(movingPlatforms.length ? { movingPlatforms } : {}),
    ...(switches.length ? { switches } : {}),
    spawns,
    tiles: tiles.filter((tile) => {
        return !runtimeSprites.some((sprite) => tile.x < sprite.x + sprite.width
            && tile.x + tile.size > sprite.x
            && tile.y < sprite.y + sprite.height
            && tile.y + tile.size > sprite.y);
    }),
    tilesets,
    ...(level.bgRelPath ? { background: `/assets/backgrounds/${path.basename(resolveProjectAsset(level.bgRelPath))}` } : {}),
};
if (level.bgRelPath) {
    const backgroundPath = resolveProjectAsset(level.bgRelPath);
    const target = path.resolve(serverDir, `public/assets/backgrounds/${path.basename(backgroundPath)}`);
    if (backgroundPath !== target) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(backgroundPath, target);
    }
}
const sourceLabel = path.relative(serverDir, sourcePath).split(path.sep).join("/");
const code = `// Generated from ${sourceLabel} by scripts/convert-ldtk.mjs. Do not edit.\nexport const LDtkLevel = ${JSON.stringify(generated, null, 4)} as const;\n`;
fs.writeFileSync(outputPath, code);
console.log(`Converted '${level.identifier}' to ${path.relative(serverDir, outputPath)} (${solids.length} solid rectangles, ${tiles.length} art tiles).`);
