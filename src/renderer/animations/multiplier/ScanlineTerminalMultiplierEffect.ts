import * as PIXI from 'pixi.js';
import { IMultiplierEffect } from './types';
import {
  COLS,
  ROWS,
  BLOCK_SIZE,
  MULTIPLIER_DECAY_DELAY_TICKS
} from '../../../logic/constants';
import { PIXEL_FONT, PIXEL_FONT_GEOMETRY } from '../../pixel-font-geometry';

/**
 * CRT Terminal style "super" scanline effect.
 * - Persistent Graphics objects (no per-frame allocation)
 * - Masked scanline layer (drawn once per frame but reused)
 * - Subtle flicker, jitter, ripple, and chroma-ish green tint
 */
export class ScanlineTerminalMultiplierEffect implements IMultiplierEffect {
  private state = {
    scanlineOffset: 0,
    pulsePhase: 0,
    jitterSeed: Math.random() * 1000,
  };

  // Persistent children (created once)
  private maskGraphics = new PIXI.Graphics();        // pixel mask shape (filled blocks)
  private scanlineGraphics = new PIXI.Graphics();    // horizontal scanlines to be masked
  private noiseGraphics = new PIXI.Graphics();       // procedural static/noise layer (masked)
  private outlineGraphics = new PIXI.Graphics();     // crisp white outline on top
  private glowGraphics = new PIXI.Graphics();        // subtle green glow behind text

  // Container for layering
  private layerContainer = new PIXI.Container();

  // Tunable constants for "CRT TERMINAL"
  private readonly SCANLINE_SPEED = 1.2;             // pixels per frame
  private readonly SCANLINE_HEIGHT = BLOCK_SIZE / 2; // thin lines
  private readonly FLICKER_FREQ = 0.06;              // probability factor for micro flicker each frame
  private readonly JITTER_MAG = 0.5;                 // pixel jitter amplitude for vibration
  private readonly RIPPLE_FREQ = 3.0;                // ripple speed multiplier
  private readonly CHROMA_OFFSET = 1.0;              // small sub-pixel-like offset (in px)
  private readonly GLOW_ALPHA = 0.10;                // glow behind text
  private readonly BASE_COLOR = 0x00FF66;            // slightly green terminal hue
  private readonly SCANLINE_COLOR = 0x00FF33;        // bright green scanline color

  constructor() {
    // Setup mask+scanline relation: scanlineGraphics will be masked by maskGraphics
    this.scanlineGraphics.mask = this.maskGraphics;
    this.noiseGraphics.mask = this.maskGraphics;
    this.glowGraphics.mask = this.maskGraphics;  // Glow should also be masked!

    // Slight additive glow behind the outline (use blend mode)
    this.glowGraphics.blendMode = 'add';

    // Compose layers in the container in correct order:
    // glow (behind) -> noise & scanlines (masked) -> outline (front)
    this.layerContainer.addChild(this.glowGraphics);
    this.layerContainer.addChild(this.noiseGraphics);
    this.layerContainer.addChild(this.scanlineGraphics);
    this.layerContainer.addChild(this.maskGraphics); // keep mask in tree too (invisible)
    this.layerContainer.addChild(this.outlineGraphics);
  }

  public init(parent: PIXI.Container): void {
      parent.addChild(this.layerContainer);
  }

  public destroy(): void {
      this.layerContainer.destroy({ children: true });
  }

  draw(
    multiplier: number,
    decayTimer: number,
    lastMultiplier: number
  ): void {
    // Early exit for x1
    if (multiplier <= 1) {
      this.layerContainer.visible = false;
      return;
    }
    
    this.layerContainer.visible = true;

    // Always clear our internal graphics each frame (but do not destroy them)
    this.maskGraphics.clear();
    this.scanlineGraphics.clear();
    this.noiseGraphics.clear();
    this.outlineGraphics.clear();
    this.glowGraphics.clear();

    // --- compute alpha + pop-in easing ---
    const decayProgress = decayTimer / MULTIPLIER_DECAY_DELAY_TICKS;  // 1.0 → 0.0 as time passes
    
    // FLASHBULB EFFECT:
    // - RAMP UP quickly to peak brightness (first 20% of time)
    // - THEN FADE OUT smoothly (remaining 80% of time)
    const isNew = multiplier > lastMultiplier;
    
    let decayAlpha: number;
    if (isNew) {
      // Brand new multiplier: ramp up quickly, then fade
      const flashDuration = 0.2;  // First 20% of time for the ramp-up
      
      if (decayProgress > (1 - flashDuration)) {
        // Still in ramp-up phase (last 20% of decay timer = first 20% of display)
        const rampProgress = (1 - decayProgress) / flashDuration;  // 0 → 1
        // Use easeInQuad for smooth acceleration into the flash
        const easeInQuad = (t: number) => t * t;
        decayAlpha = easeInQuad(Math.min(1, rampProgress));
      } else {
        // Now fading out (after the ramp)
        const fadeProgress = decayProgress / (1 - flashDuration);  // 0 → 1
        // Use easeOutQuad for smooth fade
        const easeOutQuad = (t: number) => t * (2 - t);
        decayAlpha = easeOutQuad(1 - fadeProgress);  // 1 → 0
      }
    } else {
      // Already displayed, just fade out smoothly
      const easeOutQuad = (t: number) => t * (2 - t);
      decayAlpha = easeOutQuad(Math.min(1, decayProgress));
    }
    
    decayAlpha = Math.max(0, Math.min(1, decayAlpha));

    // pulse + animation state
    this.state.pulsePhase = (this.state.pulsePhase + 0.12) % (Math.PI * 2);
    this.state.scanlineOffset = (this.state.scanlineOffset + this.SCANLINE_SPEED) % (BLOCK_SIZE * 4);

    // text geometry (grid-based pixel font)
    const text = `x${multiplier}`;
    const charDisplayWidth = 3;
    const charSpacing = 1;
    const textWidthChars = text.length * (charDisplayWidth + charSpacing) - charSpacing;
    const textHeightChars = 5;
    const startX = Math.round((COLS - textWidthChars) / 2);
    const startY = Math.round((ROWS - textHeightChars) / 2);

    const originX = startX * BLOCK_SIZE;
    const originY = startY * BLOCK_SIZE;

    // Position our container so it lines up with the game's multiplier layer
    this.layerContainer.x = originX;
    this.layerContainer.y = originY;

    // --- BUILD MASK (filled pixel blocks) ---
    // Use PIXEL_FONT (bitmap 2D arrays) to fill blocks (cheap)
    let maskCursorX = 0;
    for (const char of text) {
      const charPixels = PIXEL_FONT[char];
      if (!charPixels) {
        maskCursorX += charDisplayWidth + charSpacing;
        continue;
      }
      const yOffset = (char === 'x') ? 1 : 0;
      for (let y = 0; y < charPixels.length; y++) {
        for (let x = 0; x < charPixels[y].length; x++) {
          if (charPixels[y][x]) {
            this.maskGraphics.beginFill(0xffffff, 1);
            this.maskGraphics.drawRect(
              (maskCursorX + x) * BLOCK_SIZE,
              (y + yOffset) * BLOCK_SIZE,
              BLOCK_SIZE,
              BLOCK_SIZE
            );
            this.maskGraphics.endFill();
          }
        }
      }
      maskCursorX += charDisplayWidth + charSpacing;
    }
    // Mask should be invisible (we use it only as a mask)
    this.maskGraphics.alpha = 0;

    // --- GLOW BACKDROP (subtle) ---
    // Draw a soft blocky glow behind the text (layer under everything)
    const glowSpread = 2; // blocks
    this.glowGraphics.beginFill(this.BASE_COLOR, this.GLOW_ALPHA * decayAlpha);
    // Draw a rounded-ish rectangle behind the whole text area (cheap)
    const glowW = textWidthChars * BLOCK_SIZE + glowSpread * BLOCK_SIZE * 2;
    const glowH = textHeightChars * BLOCK_SIZE + glowSpread * BLOCK_SIZE * 2;
    this.glowGraphics.drawRect(
      -glowSpread * BLOCK_SIZE,
      -glowSpread * BLOCK_SIZE,
      glowW,
      glowH
    );
    this.glowGraphics.endFill();

    // --- SCANLINES (masked) ---
    const textRegionWidthPx = textWidthChars * BLOCK_SIZE;
    const textRegionHeightPx = textHeightChars * BLOCK_SIZE;
    const scanlineH = this.SCANLINE_HEIGHT;
    const scanlineCount = Math.ceil(textRegionHeightPx / scanlineH) + 2;

    // vertical ripple: small per-x offset
    const time = this.state.pulsePhase;
    const rippleStrength = Math.sin(time * 0.6) * 0.8; // px offset for subtle wave

    this.scanlineGraphics.lineStyle(1.2, this.SCANLINE_COLOR, decayAlpha * 0.9);

    for (let i = 0; i < scanlineCount; i++) {
      // offset each line vertically, animated by scanlineOffset
      const rawY = (this.state.scanlineOffset + i * scanlineH) % (textRegionHeightPx + scanlineH) - scanlineH;
      // apply tiny ripple jitter across the width (simulating signal)
      const jitterSeed = this.state.jitterSeed + i * 13;
      const jitter = Math.sin((jitterSeed + time * this.RIPPLE_FREQ) * 0.9) * rippleStrength;
      this.scanlineGraphics.moveTo(0, rawY + jitter);
      this.scanlineGraphics.lineTo(textRegionWidthPx, rawY + jitter);
    }
    this.scanlineGraphics.endFill();

    // --- PROCEDURAL NOISE (VERY SUBTLE) ---
    // low-frequency per-pixel static — only a few rectangles to simulate grain
    const noiseDensity = Math.max(1, Math.floor(4 * (multiplier / Math.max(2, multiplier))));
    for (let n = 0; n < noiseDensity; n++) {
      const nx = Math.floor((Math.sin(time * (n + 1) * 1.3 + n) * 0.5 + 0.5) * textRegionWidthPx);
      const ny = Math.floor((Math.cos(time * (n + 2) * 0.9 + n) * 0.5 + 0.5) * textRegionHeightPx);
      const s = Math.max(1, Math.round(BLOCK_SIZE * 0.25));
      this.noiseGraphics.beginFill(this.BASE_COLOR, 0.06 * decayAlpha);
      this.noiseGraphics.drawRect(nx, ny, s, s);
      this.noiseGraphics.endFill();
    }

    // --- OUTLINE DRAW (white crisp pixel outline) ---
    this.outlineGraphics.lineStyle(1, 0xffffff, decayAlpha);
    let outlineCursorX = 0;
    const yOffsetOutline = Math.floor((textHeightChars - 5) / 2);
    for (const char of text) {
      const charGeometry = PIXEL_FONT_GEOMETRY[char];
      if (!charGeometry) {
        outlineCursorX += charDisplayWidth + charSpacing;
        continue;
      }

      for (const [x1, y1, x2, y2] of charGeometry.edges) {
        const sx1 = (outlineCursorX + x1) * BLOCK_SIZE;
        const sy1 = (yOffsetOutline + y1) * BLOCK_SIZE;
        const sx2 = (outlineCursorX + x2) * BLOCK_SIZE;
        const sy2 = (yOffsetOutline + y2) * BLOCK_SIZE;
        this.outlineGraphics.moveTo(sx1, sy1);
        this.outlineGraphics.lineTo(sx2, sy2);
      }
      outlineCursorX += charDisplayWidth + charSpacing;
    }
    this.outlineGraphics.endFill();

    // --- MICRO-FLICKER & JITTER (CRT character) ---
    // occasional flicker reduces alpha momentarily
    // seed pseudo-random flicker: deterministic-ish per-frame small flicker
    const flicker = (Math.random() < this.FLICKER_FREQ) ? (0.9 + Math.random() * 0.1) : 1.0;
    const jitterX = (Math.sin(time * 1.3 + this.state.jitterSeed) * this.JITTER_MAG) * (1 - decayProgress);
    const jitterY = (Math.cos(time * 1.7 + this.state.jitterSeed * 0.7) * this.JITTER_MAG) * (1 - decayProgress);

    // Apply jitter + flicker by transforming the entire layer container (cheap)
    this.layerContainer.x = originX + jitterX;
    this.layerContainer.y = originY + jitterY;
    this.layerContainer.alpha = decayAlpha * flicker;

    // --- Chromatic-ish green tint on outline: subtle technique ---
    // Instead of separate RenderTextures, we cheat: draw a faint secondary outline offset and tinted
    // to emulate small chroma. This is cheap and runs as simple extra strokes.
    // (Drawn behind the main outline)
    const chromaOffset = this.CHROMA_OFFSET * (1 - decayProgress);
    if (chromaOffset > 0.01) {
      // green-tinted offset
      this.outlineGraphics.lineStyle(1, this.BASE_COLOR, decayAlpha * 0.35);
      // draw slightly offset geometry behind (slow small cost)
      let coCursorX = 0;
      for (const char of text) {
        const charGeometry = PIXEL_FONT_GEOMETRY[char];
        if (!charGeometry) {
          coCursorX += charDisplayWidth + charSpacing;
          continue;
        }
        for (const [x1, y1, x2, y2] of charGeometry.edges) {
          const sx1 = (coCursorX + x1) * BLOCK_SIZE + chromaOffset;
          const sy1 = (yOffsetOutline + y1) * BLOCK_SIZE + chromaOffset;
          const sx2 = (coCursorX + x2) * BLOCK_SIZE + chromaOffset;
          const sy2 = (yOffsetOutline + y2) * BLOCK_SIZE + chromaOffset;
          this.outlineGraphics.moveTo(sx1, sy1);
          this.outlineGraphics.lineTo(sx2, sy2);
        }
        coCursorX += charDisplayWidth + charSpacing;
      }
      this.outlineGraphics.endFill();
    }

    // Final safety clamp: keep values sane
    this.layerContainer.alpha = Math.max(0, Math.min(1, this.layerContainer.alpha));
  }

  reset?(): void {
    this.state.scanlineOffset = 0;
    this.state.pulsePhase = 0;
    this.state.jitterSeed = Math.random() * 1000;
    this.layerContainer.visible = false;
  }
}
