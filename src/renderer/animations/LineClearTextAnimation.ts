// src/renderer/animations/LineClearTextAnimation.ts
import * as PIXI from 'pixi.js';
import { BLOCK_SIZE, BOARD_WIDTH, LINE_CLEAR_DELAY_TICKS } from '../../logic/constants';
import { Animation } from './types';

export class LineClearTextAnimation implements Animation {
    private text: PIXI.Text;
    private progress: number = 0;
    private isFinished: boolean = false;
    private readonly duration: number = LINE_CLEAR_DELAY_TICKS;

    constructor(container: PIXI.Container, textString: string, clearedRowIndices: number[]) {
        const style = new PIXI.TextStyle({
            fontFamily: 'Press Start 2P',
            fontSize: Math.max(20, BLOCK_SIZE * 0.8),
            fill: 0xFFFFFF,
            align: 'center',
            stroke: 0x000000,
            strokeThickness: 4,
        });

        this.text = new PIXI.Text(textString, style);
        this.text.anchor.set(0.5);

        const avgY = clearedRowIndices.reduce((sum, row) => sum + row, 0) / clearedRowIndices.length;
        this.text.x = BOARD_WIDTH / 2;
        this.text.y = avgY * BLOCK_SIZE + BLOCK_SIZE / 2;
        this.text.alpha = 0;

        container.addChild(this.text);
    }

    update(delta: number): void {
        if (this.isFinished) return;

        this.progress += delta;
        const progressRatio = this.progress / this.duration;

        if (progressRatio < 0.5) {
            // Fade in
            this.text.alpha = progressRatio * 2;
        } else if (progressRatio < 1.0) {
            // Fade out
            this.text.alpha = 1 - ((progressRatio - 0.5) * 2);
        } else {
            // Animation complete
            this.isFinished = true;
            this.text.destroy();
        }
    }

    get finished(): boolean {
        return this.isFinished;
    }
}
