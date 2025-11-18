import * as PIXI from 'pixi.js';
import { IAnimation } from './types';
import { BLOCK_SIZE } from '../../logic/constants';

export class PieceScoreAnimation implements IAnimation {
    private _scoreText: PIXI.Text;
    private container: PIXI.Container;
    private initialY: number;
    private targetY: number;
    private duration: number = 60; // 1 second at 60 FPS
    private elapsed: number = 0;
    private _displayScore = 0;
    private _targetScore: number;

    constructor(container: PIXI.Container, score: number, x: number, y: number, pieceWidth: number, pieceHeight: number) {
        this.container = container;
        this._targetScore = score;
        const style = new PIXI.TextStyle({
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 14,
            fill: '#FFD700', // Gold color for piece score
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
        });
        this._scoreText = new PIXI.Text({ text: `+0`, style });
        this._scoreText.anchor.set(0.5, 0.5);
        
        // Calculate the center of the piece
        const centerX = (x * BLOCK_SIZE) + (pieceWidth * BLOCK_SIZE / 2);
        const centerY = (y * BLOCK_SIZE) + (pieceHeight * BLOCK_SIZE / 2);

        this._scoreText.x = centerX;
        this._scoreText.y = centerY; // Start at the center of the locked piece
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
            // Adjust the `0.1` factor as needed for desired roll speed
            // Increment by at least `1` to prevent getting stuck on small differences
            const increment = Math.max(difference * 0.1, 1);
            
            this._displayScore += increment;
      
            // Ensure it doesn't overshoot the target
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
