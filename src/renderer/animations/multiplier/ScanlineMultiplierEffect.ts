import * as PIXI from 'pixi.js';
import { IMultiplierEffect } from './types';
import { COLS, ROWS, BLOCK_SIZE } from '../../../logic/constants';
import { PIXEL_FONT, PIXEL_FONT_GEOMETRY } from '../../pixel-font-geometry';

import { MULTIPLIER_DECAY_DELAY_TICKS } from '../../../logic/constants';

export class ScanlineMultiplierEffect implements IMultiplierEffect {
    private graphics: PIXI.Graphics | null = null;
    private state: { scanlineOffset: number } = { scanlineOffset: 0 };

    public init(parent: PIXI.Container): void {
        this.graphics = new PIXI.Graphics();
        parent.addChild(this.graphics);
    }

    public destroy(): void {
        if (this.graphics) {
            this.graphics.destroy({ children: true });
            this.graphics = null;
        }
    }

    draw(
        multiplier: number,
        decayTimer: number,
        lastMultiplier: number
    ): void {
        if (!this.graphics) {
            return;
        }

        // Destroy children from the previous frame to prevent visual artifacts and memory leaks
        while (this.graphics.children.length > 0) {
            const child = this.graphics.removeChildAt(0);
            child.destroy();
        }
        this.graphics.clear();

        if (multiplier <= 1) {
            return; // Don't draw 'x1'
        }

        const decayProgress = decayTimer / MULTIPLIER_DECAY_DELAY_TICKS;
        let alpha = 0.15 + (decayProgress * 0.25); 

        if (multiplier > lastMultiplier) {
            const fadeInProgress = 1 - (decayTimer / MULTIPLIER_DECAY_DELAY_TICKS);
            alpha = Math.min(alpha, 0.05 + fadeInProgress * 2);
        }

        alpha = Math.max(0, Math.min(alpha, 1));

        const text = `x${multiplier}`;
        const charDisplayWidth = 3;
        const charSpacing = 1;
        const textWidth = text.length * (charDisplayWidth + charSpacing) - charSpacing;
        const textHeight = 5;

        const startX = Math.round((COLS - textWidth) / 2);
        const startY = Math.round((ROWS - textHeight) / 2);

        // Update scanline offset for animation
        this.state.scanlineOffset = (this.state.scanlineOffset + 0.8) % (BLOCK_SIZE * 4);

        // Create mask graphics
        const maskGraphics = new PIXI.Graphics();
        // Position maskGraphics relative to the main graphics container
        maskGraphics.x = startX * BLOCK_SIZE;
        maskGraphics.y = startY * BLOCK_SIZE;
        
        // Draw filled text shape into maskGraphics using PIXEL_FONT data
        maskGraphics.setFillStyle({ color: 0xFFFFFF, alpha: 1 }); // Solid white for mask
        let currentXMask = 0; // Relative to maskGraphics.x
        for (const char of text) {
            const charPixels = PIXEL_FONT[char];
            if (charPixels) {
                // The 'x' character is 3 rows high, while numbers are 5.
                // It needs to be shifted down by 1 row to visually align with the outline.
                const yOffset = (char === 'x') ? 1 : 0;
                for (let y = 0; y < charPixels.length; y++) {
                    for (let x = 0; x < charPixels[y].length; x++) {
                        if (charPixels[y][x] === 1) {
                            maskGraphics.rect(
                                (currentXMask + x) * BLOCK_SIZE,
                                (y + yOffset) * BLOCK_SIZE,
                                BLOCK_SIZE,
                                BLOCK_SIZE
                            );
                        }
                    }
                }
                currentXMask += (charDisplayWidth + charSpacing);
            }
        }
        maskGraphics.fill();

        // Create scanline graphics
        const scanlineGraphics = new PIXI.Graphics();
        // Position scanlineGraphics relative to the main graphics container
        scanlineGraphics.x = startX * BLOCK_SIZE;
        scanlineGraphics.y = startY * BLOCK_SIZE;

        // Draw horizontal scanlines into scanlineGraphics
        const textRegionHeightPixels = textHeight * BLOCK_SIZE;
        const scanlineHeight = BLOCK_SIZE / 2; // Thin horizontal lines
        const scanlineCount = Math.ceil(textRegionHeightPixels / scanlineHeight);
        
        scanlineGraphics.setStrokeStyle({ width: 1.5, color: 0xFF00FF, alpha: alpha * 0.8 });

        for (let i = 0; i < scanlineCount; i++) {
            const scanlineY = ((this.state.scanlineOffset + i * scanlineHeight) % textRegionHeightPixels);
            scanlineGraphics.moveTo(0, scanlineY).lineTo(textWidth * BLOCK_SIZE, scanlineY);
        }
        scanlineGraphics.stroke();

        // Apply mask
        scanlineGraphics.mask = maskGraphics;

        // Add mask and scanline graphics to the main graphics container
        this.graphics.addChild(maskGraphics);
        this.graphics.addChild(scanlineGraphics);

        // Draw the main text lines (top layer, white outline)
        this.graphics.setStrokeStyle({ width: 1, color: 0xFFFFFF, alpha: alpha });
        let currentX = startX;
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

    reset?(): void {
        this.state.scanlineOffset = 0;
    }
}