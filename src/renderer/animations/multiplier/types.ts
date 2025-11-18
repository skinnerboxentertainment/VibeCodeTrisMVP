import * as PIXI from 'pixi.js';

export interface IMultiplierEffect {
    // The core method to update and draw the effect.
    // This is called every frame.
    draw(
        multiplier: number, 
        decayTimer: number, 
        lastMultiplier: number
    ): void;

    // Called once when the effect is created and added to the scene.
    // The effect is responsible for adding its own PIXI objects to the parent.
    init(parent: PIXI.Container): void;

    // Called once when the effect is about to be destroyed.
    // The effect is responsible for removing its objects and cleaning up.
    destroy(): void;

    // Optional: A method to reset the animation state.
    reset?(): void;
}