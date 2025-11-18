import * as PIXI from 'pixi.js';
import { IAnimation } from './types';
import { BLOCK_SIZE, BOARD_WIDTH } from '../../logic/constants';

export class LineClearScoreAnimation implements IAnimation {
    private _scoreText: PIXI.Text;
    private container: PIXI.Container;
    private initialY: number;
    private targetY: number;
    private duration: number = 60; // 1 second at 60 FPS
    private elapsed: number = 0;
    private _displayScore = 0;
    private _targetScore: number;

    constructor(container: PIXI.Container, score: number, clearedRowIndices: number[]) {
        this.container = container;
        this._targetScore = score;
        const style = new PIXI.TextStyle({
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 14,
            fill: '#FFD700', // Gold color for score
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
        });
        this._scoreText = new PIXI.Text({ text: `+0`, style });
        this._scoreText.anchor.set(0.5, 0.5);
        
        // Calculate the vertical center of the cleared lines
        const avgY = clearedRowIndices.reduce((sum, row) => sum + row, 0) / clearedRowIndices.length;
        const centerY = avgY * BLOCK_SIZE + BLOCK_SIZE / 2;

        // Position to the right of the board, centered vertically on cleared lines
        this._scoreText.x = BOARD_WIDTH / 2 + BLOCK_SIZE * 3; // Adjust offset as needed
        this._scoreText.y = centerY; 
        this.initialY = this._scoreText.y;
        this.targetY = this.initialY - BLOCK_SIZE * 1.5; // Move up 1.5 blocks
        this._scoreText.alpha = 1;
        this.container.addChild(this._scoreText);
    }

    update(deltaTime: number): boolean {
        this.elapsed += deltaTime;
        const progress = this.elapsed / this.duration;

        if (this._displayScore < this._targetScore) {
            const difference = this._targetScore - this._displayScore;
            const increment = Math.max(difference * 0.1, 1);
            
            this._displayScore += increment;
      
            if (this._displayScore > this._targetScore) {
              this._displayScore = this._targetScore;
            }
        }

        this._scoreText.text = `+${Math.floor(this._displayScore)}`;

        if (progress >= 1) {
            this._scoreText.alpha = 0;
            this.container.removeChild(this._scoreText);
            this._scoreText.destroy();
            return true; // Animation finished
        }

        // Fade out
        this._scoreText.alpha = 1 - progress;

        // Move up
        this._scoreText.y = this.initialY + (this.targetY - this.initialY) * progress;

        return false; // Animation not finished
    }

    onStart?(clearedRows: number[], renderer: any): void {
        // Not used for this animation
    }

    onEnd?(clearedRows: number[], renderer: any): void {
        // Not used for this animation
    }

    animate?(progress: number, clearedRows: number[], renderer: any): void {
        // Not used for this animation
    }
}
