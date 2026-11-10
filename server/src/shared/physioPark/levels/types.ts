import type { Solid } from "../physioParkMovement.js";
import type { PhysioParkCollidableSpriteKey } from "../physioParkAnimations.js";

export interface ConveyorCollision {
    surface: Solid;
    pushSpeed: number;
}

export type MovingPlatformMovementType = "Once" | "PingPong";

export interface MovingPlatformDefinition extends Solid {
    id: string;
    endX: number;
    endY: number;
    speed: number;
    type: string;
    movementType: MovingPlatformMovementType;
}

export interface PlayerSwitchDefinition extends Solid {
    id: string;
    player: number;
    target: string | null;
}

export interface BoxDefinition extends Solid {
    id: string;
}

export interface ButtonDefinition {
    /** Sprite and animation manifest entry used to draw and collide with the button. */
    sprite: PhysioParkCollidableSpriteKey;
    /** Bottom-center world anchor used by the button sprite. */
    position: { x: number; y: number };
    /** Entity IID of the moving platform this button activates. */
    target: string | null;
}

/** Data and behavior consumed by the server and client at runtime. */
export interface ResolvedPhysioParkLevel {
    width: number;
    height: number;
    solids: readonly Solid[];
    lavas: readonly Solid[];
    /** Optional visual flag anchor for hand-authored levels. */
    goalPlatform?: Solid;
    goalArea: Solid;
    boxes?: readonly BoxDefinition[];
    conveyors?: readonly ConveyorCollision[];
    button?: ButtonDefinition;
    movingPlatforms?: readonly MovingPlatformDefinition[];
    switches?: readonly PlayerSwitchDefinition[];
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

export interface PlayerPoint { x: number; y: number; }

export interface LevelObjectiveState {
    buttonPressed: boolean;
}

/** Flag-pole position relative to the goal platform's top-left corner. */
export interface GoalFlagOffset {
    x: number;
    y: number;
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
