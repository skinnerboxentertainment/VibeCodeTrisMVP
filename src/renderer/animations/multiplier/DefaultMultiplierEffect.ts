import * as PIXI from 'pixi.js';
import { IMultiplierEffect } from './types';
import { COLS, ROWS, BLOCK_SIZE, MULTIPLIER_DECAY_DELAY_TICKS } from '../../../logic/constants';
import { PIXEL_FONT_GEOMETRY } from '../../pixel-font-geometry';

export class DefaultMultiplierEffect implements IMultiplierEffect {
    private graphics: PIXI.Graphics | null = null;

    public init(parent: PIXI.Container): void {
        this.graphics = new PIXI.Graphics();
        parent.addChild(this.graphics);
    }

    public destroy(): void {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
    }

    draw(
        multiplier: number,
        multiplierDecayTimer: number,
        lastMultiplier: number
    ): void {
        if (!this.graphics) {
            return;
        }
        this.graphics.clear();

        if (multiplier <= 1) {
            return; // Don't draw 'x1'
        }

        // Calculate alpha based on decay timer
        const decayProgress = multiplierDecayTimer / MULTIPLIER_DECAY_DELAY_TICKS;
        let alpha = 0.1 + (decayProgress * 0.3); // Fade from 0.4 down to 0.1

        // Quick fade-in when multiplier first appears
        if (multiplier > lastMultiplier) {
            const fadeInProgress = 1 - (multiplierDecayTimer / MULTIPLIER_DECAY_DELAY_TICKS); // 0 to 1
            alpha = Math.min(alpha, 0.05 + fadeInProgress * 2); // Ramp up quickly, but don't exceed the decay alpha
        }
        
        alpha = Math.max(0, Math.min(alpha, 1)); // Clamp alpha between 0 and 1

        const text = `x${multiplier}`;
        const charDisplayWidth = 3; 
        const charSpacing = 1;
        const textWidth = text.length * (charDisplayWidth + charSpacing) - charSpacing; 
        const textHeight = 5;

        const startX = Math.round((COLS - textWidth) / 2);
        const startY = Math.round((ROWS - textHeight) / 2);

        let currentX = startX;
        
        // Use graphics directly for drawing
        this.graphics.clear();
        this.graphics.setStrokeStyle({ width: 1, color: 0xFFFFFF, alpha: alpha });

        for (const char of text) {
            const charGeometry = PIXEL_FONT_GEOMETRY[char];
            if (charGeometry) {
                const yOffset = Math.floor((textHeight - 5) / 2); 

                for (const [x1, y1, x2, y2] of charGeometry.edges) {
                    const screenX1 = (currentX + x1) * BLOCK_SIZE;
                    const screenY1 = (startY + y1 + yOffset) * BLOCK_SIZE;
                    const screenX2 = (currentX + x2) * BLOCK_SIZE;
                    const screenY2 = (startY + y2 + yOffset) * BLOCK_SIZE;

                    this.graphics.moveTo(screenX1, screenY1).lineTo(screenX2, screenY2);
                }
                currentX += (charDisplayWidth + charSpacing); 
            }
        }
        
        this.graphics.stroke();
    }
}