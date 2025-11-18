Nice — below is the **full implementation** (drop-in TypeScript) of the **VHS GLITCH MULTIPLIER (Tier 2)** effect, prefaced by the short intro we locked in. Paste this into:

`src/renderer/animations/multiplier/VhsGlitchMultiplierEffect.ts`

Then wire it into your renderer (add type union, import, switch-case, dropdown) the same way as other effects.

---

```typescript
/**
 * VHS GLITCH MULTIPLIER EFFECT — Tier 2 (Moderate Glitch)
 *
 * Intent:
 * The multiplier text ("x2", "x4", etc.) appears as if played from a degraded VHS tape:
 * - chroma misalignment (R/G/B offsets)
 * - horizontal tearing bands (short strips sliding left/right)
 * - sinusoidal per-scanline horizontal wobble
 * - RF noise speckles
 * - vertical micro-jitter
 *
 * Tier 2: moderate glitch — readable, stylish, energetic.
 *
 * Implementation notes:
 * - All PIXI.Graphics children are created once in the constructor and reused each frame.
 * - The mask is built from PIXEL_FONT (bitmap) and used as a mask for distortion/noise layers.
 * - Tear bands are allocated once and recycled; no per-frame `new` allocations.
 * - Tunable constants live at top of class.
 * - The draw(...) method expects to be called every frame with:
 *     (graphics: PIXI.Graphics, multiplier: number, decayTimer: number, lastMultiplier: number)
 *
 * Agent note:
 * - This implementation avoids RenderTexture and shaders to stay compatible with existing renderer.
 * - If you provide an application/renderer reference later, we can move heavy parts to GPU.
 */

import * as PIXI from 'pixi.js';
import { IMultiplierEffect } from './types';
import { COLS, ROWS, BLOCK_SIZE, MULTIPLIER_DECAY_DELAY_TICKS } from '../../../logic/constants';
import { PIXEL_FONT, PIXEL_FONT_GEOMETRY } from '../../pixel-font-geometry';

type TearBand = {
  yStart: number;
  height: number;
  xOffset: number;   // current horizontal offset in pixels
  xTarget: number;   // target offset to smoothly approach
  life: number;      // current life in frames
  maxLife: number;   // frames until this band dies
  active: boolean;
};

export class VhsGlitchMultiplierEffect implements IMultiplierEffect {
  // Persistent state
  public state = {
    time: 0,
    chromaPhase: 0,
    trackingY: -9999,
    lastMultiplierText: '',
  };

  // Persistent PIXI children (created once)
  private layerContainer = new PIXI.Container();
  private maskGraphics = new PIXI.Graphics();        // filled mask (invisible, used for masking)
  private distortionGraphics = new PIXI.Graphics();  // tearing + wobble + noise - masked by maskGraphics
  private outlineGraphics = new PIXI.Graphics();     // main white outline + chroma offsets
  private addedToParent = false;

  // Tear band pool (reused entries)
  private readonly MAX_TEAR_BANDS = 8;
  private tearBands: TearBand[] = [];

  // Random seed (for deterministic-ish small variety)
  private rngSeed = Math.random() * 10000;

  // Tunables for Tier 2 VHS
  private readonly TEAR_BAND_MIN_HT = 1;   // blocks
  private readonly TEAR_BAND_MAX_HT = 3;   // blocks
  private readonly TEAR_X_MIN = -6;        // px
  private readonly TEAR_X_MAX = 6;         // px
  private readonly TEAR_MIN_LIFE = 8;      // frames (~133ms @60fps)
  private readonly TEAR_MAX_LIFE = 18;     // frames (~300ms @60fps)

  private readonly CHROMA_MAX_OFFSET = 2.0; // px
  private readonly WOBBLE_AMPLITUDE = 1.2;  // px
  private readonly WOBBLE_FREQ = 2.8;       // Hz-ish
  private readonly NOISE_DENSITY = 0.03;    // fraction of area filled with noise rectangles
  private readonly NOISE_SIZE_PX = Math.max(1, Math.round(BLOCK_SIZE * 0.25)); // small dot size
  private readonly TRACKING_SPEED = 500;    // px/s for tracking line when spawned (unused if not used)
  private readonly JITTER_Y_PIXELS = 1;     // vertical micro-jitter amplitude
  private readonly TEAR_SPAWN_ON_NEW = 4;   // spawn count on new multiplier
  private readonly BASE_SCAN_ALPHA = 1.0;   // base alpha multiplier for layers

  constructor() {
    // Compose layer: distortionGraphics will be masked by maskGraphics
    this.distortionGraphics.mask = this.maskGraphics;

    // layering: distortion (masked) under, outline on top
    this.layerContainer.addChild(this.distortionGraphics);
    this.layerContainer.addChild(this.maskGraphics); // visible=false, but must be in display list for mask
    this.layerContainer.addChild(this.outlineGraphics);

    // Initialize tear band pool
    for (let i = 0; i < this.MAX_TEAR_BANDS; i++) {
      this.tearBands.push({
        yStart: 0,
        height: 0,
        xOffset: 0,
        xTarget: 0,
        life: 0,
        maxLife: 0,
        active: false,
      });
    }
  }

  // Helper: simple pseudo-random (LCG) so flicker / tear pattern is deterministic-ish
  private rand(): number {
    // LCG parameters
    this.rngSeed = (this.rngSeed * 1664525 + 1013904223) % 2147483647;
    return (this.rngSeed % 10000) / 10000;
  }

  private easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }

  private spawnTearBand(textHeightPx: number): void {
    // find inactive band slot
    for (let i = 0; i < this.tearBands.length; i++) {
      const tb = this.tearBands[i];
      if (!tb.active) {
        const bandBlocks = this.TEAR_BAND_MIN_HT + Math.floor(this.rand() * (this.TEAR_BAND_MAX_HT - this.TEAR_BAND_MIN_HT + 1));
        const height = bandBlocks * BLOCK_SIZE;
        const yStart = Math.floor(this.rand() * Math.max(1, textHeightPx - height));
        const xTarget = this.TEAR_X_MIN + Math.floor(this.rand() * (this.TEAR_X_MAX - this.TEAR_X_MIN + 1));
        const maxLife = this.TEAR_MIN_LIFE + Math.floor(this.rand() * (this.TEAR_MAX_LIFE - this.TEAR_MIN_LIFE + 1));
        tb.yStart = yStart;
        tb.height = height;
        tb.xOffset = 0;
        tb.xTarget = xTarget;
        tb.life = 0;
        tb.maxLife = maxLife;
        tb.active = true;
        break;
      }
    }
  }

  // update tear bands smoothly
  private updateTearBands(): void {
    for (const tb of this.tearBands) {
      if (!tb.active) continue;
      // lerp offset toward target
      tb.xOffset += (tb.xTarget - tb.xOffset) * 0.25; // smooth approach
      tb.life++;
      // small chance to change direction mid-life (adds authenticity)
      if (this.rand() < 0.02) {
        tb.xTarget = this.TEAR_X_MIN + Math.floor(this.rand() * (this.TEAR_X_MAX - this.TEAR_X_MIN + 1));
      }
      if (tb.life >= tb.maxLife) {
        tb.active = false;
      }
    }
  }

  draw(
    graphics: PIXI.Graphics,
    multiplier: number,
    decayTimer: number,
    lastMultiplier: number
  ): void {
    // Hide if x1
    if (multiplier <= 1) {
      if (this.addedToParent) this.layerContainer.visible = false;
      return;
    }

    // Add layerContainer to renderer scene once (attempt parent attach)
    if (!this.addedToParent) {
      if ((graphics as any).parent && (graphics as any).parent.addChild) {
        (graphics as any).parent.addChild(this.layerContainer);
      } else {
        (graphics as any).addChild(this.layerContainer);
      }
      this.addedToParent = true;
    }
    this.layerContainer.visible = true;

    // Clear internal graphics each frame (but do not destroy)
    this.maskGraphics.clear();
    this.distortionGraphics.clear();
    this.outlineGraphics.clear();

    // Timing / animation updates
    const deltaT = 1 / 60; // assume 60fps delta for speed-stable values; renderer can change to pass dt if available
    this.state.time += deltaT;
    this.state.chromaPhase += deltaT * 1.0;

    // Compute alpha based on decay
    const decayProgress = Math.min(1, decayTimer / MULTIPLIER_DECAY_DELAY_TICKS);
    // stronger at start -> ease out to subtle
    const decayAlpha = this.easeOutCubic(1 - decayProgress) * this.BASE_SCAN_ALPHA;

    // Text geometry
    const text = `x${multiplier}`;
    const charDisplayWidth = 3;
    const charSpacing = 1;
    const textWidthChars = text.length * (charDisplayWidth + charSpacing) - charSpacing;
    const textHeightChars = 5;
    const startX = Math.round((COLS - textWidthChars) / 2);
    const startY = Math.round((ROWS - textHeightChars) / 2);

    const originX = startX * BLOCK_SIZE;
    const originY = startY * BLOCK_SIZE;

    // Position container
    // We'll apply a tiny vertical jitter to the whole container below
    this.layerContainer.x = originX;
    this.layerContainer.y = originY;

    // Rebuild mask (pixel-perfect filled glyphs) — deterministic, but only cheap rectangles
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
    this.maskGraphics.alpha = 0; // invisible mask

    // Prepare text region sizes in px
    const textRegionWidthPx = textWidthChars * BLOCK_SIZE;
    const textRegionHeightPx = textHeightChars * BLOCK_SIZE;

    // On new multiplier: spawn a few tear bands and boost chroma
    const isNew = multiplier > lastMultiplier;
    if (isNew) {
      for (let i = 0; i < this.TEAR_SPAWN_ON_NEW; i++) {
        this.spawnTearBand(textRegionHeightPx);
      }
      // quick chroma burst
      this.state.chromaPhase += 0.8;
      // small transient noise burst: spawn some additional tear bands
      for (let i = 0; i < 2; i++) this.spawnTearBand(textRegionHeightPx);
    }

    // Update tear bands
    this.updateTearBands();

    // --- DISTORTION LAYER (masked) ---
    // Distortion draws:
    // 1) per-scanline horizontal wobble (cheap: approximate by drawing many short line segments offset per-y)
    // 2) tear bands (rects horizontally offset)
    // 3) RF noise speckles (small rectangles)
    //
    // We'll draw them all into distortionGraphics which is masked by maskGraphics.

    // 1) Per-scanline wobble (coarse, not per pixel — step by BLOCK_SIZE/2 to reduce draw count)
    const stepY = Math.max(2, Math.floor(BLOCK_SIZE / 2)); // step size in px
    const wobbleAmp = this.WOBBLE_AMPLITUDE * (0.6 + 0.4 * (1 - decayProgress)); // fade with decay
    const wobbleFreq = this.WOBBLE_FREQ * (0.8 + 0.4 * this.rand());

    // We'll draw thin translucent horizontal lines (as subtle additional distortion) — small cost
    this.distortionGraphics.lineStyle(0.6, 0xffffff, 0.04 * decayAlpha);
    for (let y = 0; y < textRegionHeightPx; y += stepY) {
      const progressY = y / (textRegionHeightPx || 1);
      const phase = this.state.time * wobbleFreq + progressY * 6.28;
      const xShift = Math.sin(phase) * wobbleAmp;
      // draw a semi-transparent horizontal hairline as part of the distortion (blended into mask)
      this.distortionGraphics.moveTo(xShift, y + 0.5);
      this.distortionGraphics.lineTo(textRegionWidthPx + xShift, y + 0.5);
    }

    // 2) Tear bands — draw blurred-like strip by drawing the region offset horizontally
    for (const tb of this.tearBands) {
      if (!tb.active) continue;
      const bandAlpha = 0.55 * decayAlpha * (1 - tb.life / tb.maxLife); // fades out over life
      // draw the band as a filled rectangle in distortionGraphics at offset tb.xOffset
      this.distortionGraphics.beginFill(0xffffff, bandAlpha * 0.12); // subtle bright smear
      this.distortionGraphics.drawRect(tb.xOffset, tb.yStart, textRegionWidthPx, tb.height);
      this.distortionGraphics.endFill();

      // also draw a narrow darker slice to emphasize 'break' border
      this.distortionGraphics.beginFill(0x000000, bandAlpha * 0.06);
      this.distortionGraphics.drawRect(tb.xOffset, tb.yStart, Math.max(2, textRegionWidthPx * 0.02), 1);
      this.distortionGraphics.endFill();
    }

    // 3) RF noise speckles (low density)
    const areaPx = textRegionWidthPx * textRegionHeightPx || 1;
    // derive noise count from density and area, but clamp to reasonable amount
    const approxDots = Math.max(1, Math.floor(areaPx * this.NOISE_DENSITY / 100));
    // Use deterministic-ish loop but no new allocations
    for (let n = 0; n < approxDots; n++) {
      const nx = Math.floor(this.rand() * textRegionWidthPx);
      const ny = Math.floor(this.rand() * textRegionHeightPx);
      this.distortionGraphics.beginFill(0xffffff, 0.08 * decayAlpha);
      this.distortionGraphics.drawRect(nx, ny, this.NOISE_SIZE_PX, this.NOISE_SIZE_PX);
      this.distortionGraphics.endFill();
    }

    // --- OUTLINE + CHROMA (drawn on top, outside mask so it's crisp) ---
    // We draw three outlines: red offset right, blue offset left, white center.
    // Use PIXEL_FONT_GEOMETRY for crisp strokes.

    // Compute jitter / vertical micro-shake
    const jitterY = Math.sin(this.state.time * 12.0 + this.rand() * 6.28) * this.JITTER_Y_PIXELS * (1 - decayProgress);
    this.layerContainer.y = originY + jitterY;

    // Chroma offsets drift by a slow sine
    const chromaDrift = Math.sin(this.state.chromaPhase * 1.2) * this.CHROMA_MAX_OFFSET * (1 - decayProgress);

    // Draw colored offsets first (behind), then white outline
    const yOffsetOutline = Math.floor((textHeightChars - 5) / 2);
    // Helper to draw stroke with offset and color
    const drawOutlineWithOffset = (offsetX: number, color: number, alphaMul: number) => {
      this.outlineGraphics.lineStyle(1, color, alphaMul * decayAlpha);
      let cursorX = 0;
      for (const char of text) {
        const geo = PIXEL_FONT_GEOMETRY[char];
        if (!geo) {
          cursorX += charDisplayWidth + charSpacing;
          continue;
        }
        for (const [x1, y1, x2, y2] of geo.edges) {
          const sx1 = (cursorX + x1) * BLOCK_SIZE + offsetX;
          const sy1 = (yOffsetOutline + y1) * BLOCK_SIZE;
          const sx2 = (cursorX + x2) * BLOCK_SIZE + offsetX;
          const sy2 = (yOffsetOutline + y2) * BLOCK_SIZE;
          this.outlineGraphics.moveTo(sx1, sy1);
          this.outlineGraphics.lineTo(sx2, sy2);
        }
        cursorX += charDisplayWidth + charSpacing;
      }
    };

    // Blue channel left
    drawOutlineWithOffset(-Math.abs(chromaDrift), 0x3366ff, 0.28);
    // Red channel right
    drawOutlineWithOffset(Math.abs(chromaDrift), 0xff3366, 0.28);
    // White center (main)
    drawOutlineWithOffset(0, 0xffffff, 1.0);

    // Final minor scale / pop-in when new multiplier
    if (isNew) {
      const popAlphaBoost = Math.min(1, 0.15 + (1 - decayProgress) * 0.85);
      this.layerContainer.alpha = Math.max(0.4, decayAlpha + popAlphaBoost * 0.6);
    } else {
      this.layerContainer.alpha = decayAlpha;
    }

    // Clamp alpha safely
    this.layerContainer.alpha = Math.max(0, Math.min(1, this.layerContainer.alpha));

    // === done frame: update tear band life progression (already updated in updateTearBands called earlier)
    // small chance to spawn additional bands occasionally
    if (this.rand() < 0.01) {
      this.spawnTearBand(textRegionHeightPx);
    }

    // update lastMultiplierText just in case (not used heavily)
    this.state.lastMultiplierText = text;
  }

  reset?(): void {
    this.state.time = 0;
    this.state.chromaPhase = 0;
    this.state.trackingY = -9999;
    this.state.lastMultiplierText = '';
    // deactivate tear bands
    for (const tb of this.tearBands) {
      tb.active = false;
      tb.life = 0;
      tb.xOffset = 0;
      tb.xTarget = 0;
    }
    this.layerContainer.visible = false;
  }
}
```

---

### Quick integration checklist for Agent

1. Save file: `src/renderer/animations/multiplier/VhsGlitchMultiplierEffect.ts`
2. Add `'vhs_glitch'` (or desired name) to `src/ui/state.ts` union.
3. Import & wire in `src/renderer/pixiRenderer.ts` the same as other multiplier effects.
4. Add `<option value="vhs_glitch">VHS Glitch</option>` to settings UI.
5. Run `npm run dev` and test with rapid multiplier changes (x2→x8 loops).
6. If shimmer is too strong, reduce `CHROMA_MAX_OFFSET` and `TEAR_X_MAX` first.

---
