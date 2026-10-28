import type { Solid } from "../physioParkMovement.js";
import type { PhysioParkCollidableSpriteKey } from "../physioParkAnimations.js";

export interface PhysioParkRect extends Solid {}

export interface ConveyorCollision {
    surface: Solid;
    pushSpeed: number;
}

export interface ButtonDefinition {
    /** Sprite and animation manifest entry used to draw and collide with the button. */
    sprite: PhysioParkCollidableSpriteKey;
    /** Bottom-center world anchor used by the button sprite. */
    position: { x: number; y: number };
    crate: Solid;
}

/** Legacy name retained for callers that imported the old button collision type. */
export type ButtonCollision = ButtonDefinition;

/** Collision data that a level definition or future editor loader can provide. */
export interface PhysioParkLevelCollision {
    width: number;
    height: number;
    solids: readonly Solid[];
    lava: PhysioParkRect;
    /** Optional visual flag anchor for hand-authored levels. */
    goalPlatform?: Solid;
    goalArea: PhysioParkRect;
    conveyors?: readonly ConveyorCollision[];
    button?: ButtonDefinition;
}

export interface PlayerPoint { x: number; y: number; }

export interface LevelObjectiveState {
    buttonPressed: boolean;
}

/** Flag-pole position relative to the goal platform's top-left corner. */
export interface GoalFlagOffset {
    x: number;
    y: number;
}

/** Data and behavior consumed by the server and client at runtime. */
export interface ResolvedPhysioParkLevel extends PhysioParkLevelCollision {
    id: string;
    name: string;
    goalFlagOffset?: GoalFlagOffset;
    /** LDtk-authored tiles, in world pixels, rendered from the referenced atlas. */
    tiles?: readonly LevelTile[];
    tilesets?: Readonly<Record<string, string>>;
    /** Optional full-level background image copied from the LDtk project. */
    background?: string;
    /** Bottom-center anchor for the level's animated goal flag. */
    goalFlagPosition?: { x: number; y: number };
    spawnPoint(index: number): { x: number; y: number };
    isComplete(players: readonly PlayerPoint[], objectives: LevelObjectiveState): boolean;
}

export interface LevelTile {
    x: number;
    y: number;
    sourceX: number;
    sourceY: number;
    size: number;
    tileset: string;
    flipX?: boolean;
    flipY?: boolean;
}
