# LDtk levels

Physio Park levels are authored in LDtk and converted to TypeScript for use by the
server and Phaser client. Run the converter from the `server/` directory:

```sh
npm run levels:convert -- ../docs/planning/ldtkLevel1/Level1.ldtk     Level_1 ldtkLevel1
npm run levels:convert -- ../docs/planning/ldtkLevel2/PhysioPark.ldtk Level_2 ldtkLevel2
npm run levels:convert -- ../docs/planning/ldtkLevel3/PhysioPark.ldtk Level_3 ldtkLevel3
```

The arguments are the LDtk project path, the level identifier to convert, and the
output module name. The last two arguments are optional: if omitted, the converter
uses the first level in the project and the parent folder name for the output module.
The converted files are written to `src/shared/physioPark/levels/<output name>.ts`.
Referenced tileset atlases and level backgrounds are copied into `public/assets/`.

When changing a level, export or save the LDtk project, run the corresponding command,
and commit the project, generated TypeScript file, and any copied image assets. The
runtime level adapters in `src/shared/physioPark/levels/level1.ts`, `level2.ts`, and
`level3.ts` select which generated project feeds each game level.

## Supported terrain and entities

- Use IntGrid values named `Ground`, `Platform`, or `Solid` for player collision and
  `Lava` for hazards. Adjacent cells are merged into rectangles in the generated data.
- Optional IntGrid values `Conveyor_Left` and `Conveyor_Right` create solid conveyor
  surfaces that push objects at 28 pixels per second in the named direction.
- Add at least one `SpawnPoint`. Its horizontal center is the spawn x position, and its
  y coordinate marks the player's feet/supporting surface.
- Add a rectangular `GoalArea` to define where players must gather. Every active player
  must enter it to complete a level. Level 2 also requires its button to have been
  pressed. A `GoalFlag` places the flag using the entity's bottom-center as its anchor.
  For older projects, a `GoalPost` can place the flag and, when no `GoalArea` exists,
  create a default goal trigger above the solid surface beneath it.
- Add `Box` entities for gravity-driven, pushable boxes. Their entity bounds define the
  box size and starting position.
- Add a `Button` entity to create a pressable animated button. Its optional `Target`
  reference selects the moving platform it activates.
- Add `MovingPlatform` entities with an `EndPoint` reference, speed, platform type, and
  movement type (`Once` or `PingPong`). `Once` platforms start when activated and stop
  at an endpoint; subsequent switch hits reverse them. `PingPong` platforms travel
  between endpoints while active.
- Add `PlayerSwitch` entities to activate or toggle their referenced moving platforms
  when the assigned player hits the switch from below. Set the `Player` field to that
  player's color/index and `Target` to a `MovingPlatform`.
- Use external tileset images. LDtk auto-layer and grid tile placements are exported and
  rendered from the copied atlas. The image referenced by LDtk's `bgRelPath` is copied
  and rendered as the level background.

The converter uses LDtk pixel coordinates for dimensions, entity positions, and tile
placements. It validates entity references and requires collision cells, lava cells,
at least one spawn, and either a `GoalArea` or a usable `GoalPost`.
