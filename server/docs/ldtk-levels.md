# LDtk levels

Physio Park can use an LDtk project as its level source. From `server/`, run:

```sh
npm run levels:convert -- ../docs/planning/ldtkLevel1/Level1.ldtk
```

The converter writes `src/shared/physioPark/levels/ldtkLevel1.ts` and copies referenced
tileset images into `public/assets/tilesets/`. Level 1 imports that generated module, so
the server uses its collision rectangles and the Phaser client draws its LDtk tile layer.
Commit both generated files with the level change. Re-run the command after editing or
exporting the LDtk project. An optional second argument selects a level identifier:

```sh
npm run levels:convert -- path/to/project.ldtk Level_0
```

## LDtk authoring convention

- Use an IntGrid layer with values named `Ground` or `Platform` for solids and `Lava` for
  the hazard. Adjacent cells are merged into collision rectangles.
- Optional conveyor IntGrid values may be named `Conveyor_Left` and `Conveyor_Right`;
  they become solid surfaces pushed at 28 px/s in the indicated direction.
- Add at least one `SpawnPoint` entity. Its horizontal center is used as the player
  center; its y coordinate marks the player's feet / supporting surface.
- Add a rectangular `GoalArea` entity. All players must have their centers inside it to
  finish the level. For the existing sample, `GoalPost` is used as the flag anchor and
  creates a 96-by-48 trigger above the supporting platform. Add `GoalPost` to future
  levels to place the game's animated flag; its entity center gives the pole's x position
  and its top gives the platform contact y coordinate.
- Keep lava in one contiguous region for now; multiple disconnected lava regions are
  rejected by the converter instead of silently becoming one oversized hazard.
- Use external tileset images. Auto-layer and grid tile placements are exported and
  rendered from the copied atlas image.
- A level background image referenced by LDtk's `bgRelPath` is copied and rendered behind
  level art.
- `Button` and `Box` entities together create the existing press-button / falling-crate
  objective. The button uses the shared button sprite; the box bounds become its crate.

The generated level dimensions and entity positions are in LDtk pixels. The game retains
its usual level progression and gameplay rules around the imported geometry.
