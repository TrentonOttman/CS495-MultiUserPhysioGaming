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
    goalPlatform: Solid;
    goalArea: PhysioParkRect;
    conveyor?: ConveyorCollision;
    button?: ButtonDefinition;
}

export interface PlayerPoint { x: number; y: number; }

export interface LevelObjectiveState {
    buttonPressed: boolean;
}

/** Data and behavior consumed by the server and client at runtime. */
export interface ResolvedPhysioParkLevel extends PhysioParkLevelCollision {
    id: string;
    name: string;
    spawnPoint(index: number): { x: number; y: number };
    isComplete(players: readonly PlayerPoint[], objectives: LevelObjectiveState): boolean;
}
