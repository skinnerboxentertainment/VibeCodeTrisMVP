import * as PIXI from 'pixi.js';
import { IMultiplierEffect } from './types';

export class NoneMultiplierEffect implements IMultiplierEffect {
    public init(parent: PIXI.Container): void {
        // Do nothing
    }

    public destroy(): void {
        // Do nothing
    }

    draw(multiplier: number, decayTimer: number, lastMultiplier: number): void {
        // Do nothing - this effect renders no multiplier display
    }
}
