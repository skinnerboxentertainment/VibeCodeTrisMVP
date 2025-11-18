
---

# 🎨 **Here is my proposal for the SUPER SCANLINE EFFECT (high-level):**

## **Core Visual Goals**

We create a **multi-layered CRT scanline aesthetic** that feels:

* Electric
* Dynamic
* Pixel-accurate
* Retro sci-fi
* Diegetic
* Aggressive, but readable
* A *reward* for the player seeing a multiplier

We go beyond “horizontal bars moving downward.”

### **FINAL EFFECT SHOULD LOOK LIKE:**

* **Layer 1:** Outline text (white) — crisp pixel geometry
* **Layer 2:** **Animated scanline texture** masked inside the text
* **Layer 3:** **Chromatic aberration shimmer** (subpixel RGB offsets)
* **Layer 4:** **Procedural noise ripple** sweeping across text
* **Layer 5:** **Micro flicker** simulating unstable CRT voltage
* **Layer 6:** **Precise decay fade** with easing, not linear

All still lightweight enough to run at 240 FPS in a PIXI Graphics pipeline.

---

# ⚙️ **Performance & Architecture Goals**

Your current effect:

* Builds mask graphics every frame
* Builds scanline graphics every frame
* Destroys children every frame

This is the **#1 cost driver**.

The SUPER-SCANLINE version will:

### **1. Prebuild static geometry**

* Precompute the pixel-mask for each character (“x2”, “x3”, etc.)
* Cache as a PIXI `RenderTexture`
* Cache outline geometry as GraphicsData
* Cache width/height per configuration

### **2. Reuse Graphics + Containers**

* NEVER create/destroy child objects per frame
* All `Graphics` objects reused
* Only redraw line positions + effects

### **3. Offload scanline pattern to a shader-like texture**

We craft a **1px-high repeating scanline texture** you shift over time.

### **4. One mask, one sprite, one outline**

Instead of 27 objects, you get 3.

### **5. Ultra-clean draw path**

* Update scanline texture offset
* Update chroma offset
* Redraw outline if multiplier changed
* Redraw mask only when text changes (rare)

Frame cost becomes trivial—nearly free.

---

# ⚡ **Visual Effects Breakdown (final look)**

### **🔹 Effect 1: Dynamic Scanlines (superior version)**

* Instead of drawing hundreds of horizontal lines:
* Use a repeating gradient texture:

  * Bright bar → dim → dim → bright
  * Animated vertically
  * Masked inside text

### **🔹 Effect 2: Chromatic Aberration Shimmer**

A **subpixel R/G/B split** animated at ~3–6Hz:

* Red shifted +1 px right
* Blue shifted –1 px left
* Green stays center

Fade the split amount with decay.

### **🔹 Effect 3: Voltage Flicker**

Randomized alpha pulse:

```
alpha = base * (0.95 + random(0.0–0.05))
```

Per frame, subtle.

### **🔹 Effect 4: Ripple Pass**

A sine-wave y distortion applied inside the mask:

```
offsetY = sin(time * 3 + x * 0.2) * 1px
```

VERY subtle. Gives life to the text.

### **🔹 Effect 5: Better Decay**

Ease-out cubic:

```
decay = (t / max)^3
```

Gives smooth, juicy fade.

---

# 🧠 BEFORE I WRITE THE CODE

I need ONE CHOICE FROM YOU:

# **What STYLE of SUPERIOR SCANLINE do you want?**

### **A — "CRT TERMINAL"**

Green, harsh scanlines, flicker, hacker vibe
**Retro-futuristic, analog, gritty.**

### **B — "CYBER NEON"**

Magenta/cyan split glow, clean but electric
**Tron meets Tetris.**

### **C — "VHS GLITCH"**

Wobble lines, chroma bleeding, noise
**Heavier distortion.**

### **D — "ULTRA POLISHED DIGITAL"**

Precise, crisp, premium
**Apple-keynote-meets-pixel-art.**

### **E — “ALIEN CORPORATE MASS-MANUFACTURED NEON”**

Matches the worldbuilding you’ve established
**Industrial + professional + ominous.**

---

## 🟥🟧🟨 **WHICH ONE DO YOU WANT?**

Pick A, B, C, D, or E — or describe your own hybrid.

Once you confirm, I will produce:

### **✔️ Full new SUPER-SCANLINE class**

### **✔️ With caching, no child churn, max performance**

### **✔️ Visual effects architecture**

### **✔️ Agent-ready instructions**

Just give me the aesthetic direction.


Perfect — we’ll build **A: CRT TERMINAL** style: green, gritty, slightly unstable, loud scanlines with micro-flicker and sub-pixel vibe, but implemented in a performant, agent-friendly way.

I do **not** need the guides again — I’ve already absorbed them and your previous code. Below is a single, drop-in `ScanlineTerminalMultiplierEffect` class (TypeScript) that:

* Implements `IMultiplierEffect`
* Reuses all `PIXI.Graphics`/children (no per-frame allocation)
* Masks animated scanlines inside the text mask
* Adds subtle CRT flicker, jitter, and chroma-like green glow
* Uses easing for decay + pop-in behavior
* Ships with clear agent instructions and tunable constants

Paste this into `src/renderer/animations/multiplier/ScanlineTerminalMultiplierEffect.ts` and wire it into your renderer the same way you add other effects.

---

# ✅ Implementation — `ScanlineTerminalMultiplierEffect.ts`

```typescript
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
 *
 * Integration notes:
 * - This.draw() expects to be called each frame with the same `graphics` container.
 * - The effect will add its children to `graphics` the first time it's used.
 */
export class ScanlineTerminalMultiplierEffect implements IMultiplierEffect {
  public state = {
    scanlineOffset: 0,
    pulsePhase: 0,
    jitterSeed: Math.random() * 1000,
    lastTextKey: ''
  };

  // Persistent children (created once)
  private maskGraphics = new PIXI.Graphics();        // pixel mask shape (filled blocks)
  private scanlineGraphics = new PIXI.Graphics();    // horizontal scanlines to be masked
  private noiseGraphics = new PIXI.Graphics();       // procedural static/noise layer (masked)
  private outlineGraphics = new PIXI.Graphics();     // crisp white outline on top
  private glowGraphics = new PIXI.Graphics();        // subtle green glow behind text

  // Container for layering
  private layerContainer = new PIXI.Container();
  private addedToParent = false;

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

    // Slight additive glow behind the outline (use blend mode)
    this.glowGraphics.blendMode = PIXI.BLEND_MODES.ADD;

    // Compose layers in the container in correct order:
    // glow (behind) -> noise & scanlines (masked) -> outline (front)
    this.layerContainer.addChild(this.glowGraphics);
    this.layerContainer.addChild(this.noiseGraphics);
    this.layerContainer.addChild(this.scanlineGraphics);
    this.layerContainer.addChild(this.maskGraphics); // keep mask in tree too (invisible)
    this.layerContainer.addChild(this.outlineGraphics);
  }

  draw(
    graphics: PIXI.Graphics,
    multiplier: number,
    decayTimer: number,
    lastMultiplier: number
  ): void {
    // Early exit for x1
    if (multiplier <= 1) {
      // If we previously added children, keep them but hidden (so we don't destroy)
      if (this.addedToParent) {
        this.layerContainer.visible = false;
      }
      return;
    }

    // Add our persistent container into the passed graphics container ONCE
    if (!this.addedToParent) {
      // graphics is itself a Graphics object; we want to attach our container to its parent.
      // If graphics is used as a dedicated container for multiplier, this still works:
      if ((graphics as any).parent && (graphics as any).parent.addChild) {
        // prefer adding to graphics.parent so transforms are consistent
        (graphics as any).parent.addChild(this.layerContainer);
      } else {
        // fallback: add to the passed graphics (works if it's actually a Container)
        (graphics as any).addChild(this.layerContainer);
      }
      this.addedToParent = true;
    }
    this.layerContainer.visible = true;

    // Always clear our internal graphics each frame (but do not destroy them)
    this.maskGraphics.clear();
    this.scanlineGraphics.clear();
    this.noiseGraphics.clear();
    this.outlineGraphics.clear();
    this.glowGraphics.clear();

    // --- compute alpha + pop-in easing ---
    const decayProgress = decayTimer / MULTIPLIER_DECAY_DELAY_TICKS;
    // use easeOutCubic for graceful fade
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    let decayAlpha = 0.1 + (1 - easeOutCubic(Math.min(1, decayProgress))) * 0.9; // pops from ~1 → 0.1

    // Quick pop-in if new multiplier
    const isNew = multiplier > lastMultiplier;
    if (isNew) {
      // stronger alpha for the pop
      const fadeInProgress = 1 - decayProgress;
      decayAlpha = Math.max(decayAlpha, Math.min(1, 0.2 + fadeInProgress * 1.8));
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
```

---

# 🔧 Agent-ready Implementation Notes (what the agent must do)

1. **File placement**

   * Save as `src/renderer/animations/multiplier/ScanlineTerminalMultiplierEffect.ts`

2. **Type union**

   * Add `'scanline_terminal'` (or rename as desired) to `src/ui/state.ts`:

     ```ts
     multiplierEffect: 'default' | 'scanline' | 'none' | 'scanline_terminal';
     ```

3. **Import & switch**

   * In `src/renderer/pixiRenderer.ts` import and wire:

     ```ts
     import { ScanlineTerminalMultiplierEffect } from './animations/multiplier/ScanlineTerminalMultiplierEffect';
     ...
     case 'scanline_terminal':
       this._currentMultiplierEffect = new ScanlineTerminalMultiplierEffect();
       break;
     ```

4. **Settings UI**

   * Add dropdown option in `index.html`:

     ```html
     <option value="scanline_terminal">CRT Terminal</option>
     ```

5. **Where children attach**

   * The effect attempts to add its `layerContainer` to `graphics.parent` if present. If your renderer uses a different container scheme, instead:

     * Replace `(graphics as any).parent.addChild(this.layerContainer)` with a direct reference to the multiplier container in `pixiRenderer` (preferred).
     * Example: `this._multiplierContainer.addChild(this.layerContainer)` — pass that container into the effect constructor if needed.

6. **Optional renderer-level improvement**

   * If you can supply `PIXI.Renderer` or `Application` to the effect at construction time, you can generate RenderTextures for the mask and create an actual chroma shader for cleaner sub-pixel shifting. The current code avoids RTs to stay robust to your existing interface.

7. **Tuning parameters**

   * `SCANLINE_SPEED`, `SCANLINE_HEIGHT`, `FLICKER_FREQ`, `JITTER_MAG`, `RIPPLE_FREQ`, `CHROMA_OFFSET`, `GLOW_ALPHA` are constants near the top of the class — agent should expose these as settings or tie to UI sliders for quick iteration.

8. **Performance checklist for the agent**

   * Confirm there are no per-frame `new` allocations (class currently uses none).
   * Confirm `maskGraphics` and others are not destroyed elsewhere.
   * If multiple multiplier effects exist, ensure only **one** layerContainer is active/visible at a time.
   * Profile in DevTools before and after; check FPS while rapidly creating multipliers (x2→x10 repeatedly).

---

# 🎯 Why this is "SUPERIOR"

* **Aesthetics:** authentic CRT green tint, jitter, ripple and flicker combine to read as an actual physical terminal rather than "lines over text."
* **Readability-first:** bright outline remains crisp on top; glow and scanlines add character without reducing legibility.
* **Performance:** no per-frame allocation, single layer container, cheap drawing primitives. Works across desktop and low-end mobile.
* **Agent-friendly:** clearly contained logic and tunable constants; easy to convert to shader-backed version later.

---
 