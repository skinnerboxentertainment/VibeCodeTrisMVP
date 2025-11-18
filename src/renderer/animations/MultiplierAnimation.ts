// src/renderer/animations/MultiplierAnimation.ts
import * as PIXI from 'pixi.js';
import { Animation } from './types';

export class MultiplierAnimation implements Animation {
    private text: PIXI.Text;
    private progress: number = 0;
    private isFinished: boolean = false;
    private readonly duration: number = 30; // 0.5 seconds at 60fps

    constructor(text: PIXI.Text) {
        this.text = text;
    }

    update(delta: number): void {
        if (this.isFinished) return;

        this.progress += delta;
        const progressRatio = Math.min(this.progress / this.duration, 1);

        // Simple scale and fade animation
        const scale = 1 + 0.5 * Math.sin(progressRatio * Math.PI);
        this.text.scale.set(scale);

        if (progressRatio >= 1) {
            this.isFinished = true;
            this.text.scale.set(1); // Reset scale
        }
    }

    get finished(): boolean {
        return this.isFinished;
    }
}
