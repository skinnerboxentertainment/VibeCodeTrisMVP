# VibeCodeTris Visualization Effects Guide

A comprehensive guide for creating and integrating visual effects that enhance gameplay feedback and "juice" the experience.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [The Multiplier Display System](#the-multiplier-display-system)
4. [Creating Custom Multiplier Effects](#creating-custom-multiplier-effects)
5. [Advanced Visualization Patterns](#advanced-visualization-patterns)
6. [Performance & Optimization](#performance--optimization)
7. [Troubleshooting](#troubleshooting)
8. [Future Effect Ideas](#future-effect-ideas)

---

## Getting Started

### What is "Juice"?

"Juice" in game design refers to visual feedback that makes the game feel more responsive and satisfying. It includes:
- Animations that telegraph player actions
- Feedback when combos are achieved
- Screen shakes on major events
- Particle effects and trails
- Color changes and highlighting
- Sound effects synchronized with visuals

VibeCodeTris uses the procedural audio system **and** visual effects together to create a cohesive "vibe."

### Architecture at a Glance

VibeCodeTris visualizations are powered by **PixiJS**, a 2D WebGL renderer. All effects:
1. Receive game state snapshots each frame
2. Render to PixiJS Graphics/Sprites/Text objects
3. Update internal animation state
4. Fade in/out based on gameplay logic

**Key Technologies:**
- **PixiJS** - 2D rendering engine
- **TypeScript** - Type-safe effect creation
- **PIXI.Graphics** - Drawing primitives (lines, shapes, text)
- **PIXI.Sprite** - Bitmap images and animations
- **Animation State** - Tracked within each effect class

---

## Core Concepts

### 1. The Rendering Loop

```
Game Engine (main thread)
    ↓
    Creates Snapshot (game state: blocks, score, multiplier, etc.)
    ↓
PixiRenderer (receives snapshot)
    ↓
    Updates each active effect with snapshot data
    ↓
    Calls effect.draw() or effect.update() each frame
    ↓
    PixiJS renders to screen
```

### 2. Effect Lifecycle

```
User changes settings / Game event occurs
    ↓
Effect instantiated (constructor runs)
    ↓
draw() / update() called every frame (~60fps)
    ↓
Internal state evolves (animations progress)
    ↓
Effect becomes invisible (alpha reaches 0)
    ↓
Effect destroyed or recycled
```

### 3. Drawing Primitives in PixiJS

#### PIXI.Graphics - For shapes and lines

```typescript
const graphics = new PIXI.Graphics();

// Draw a line
graphics.setStrokeStyle({ width: 2, color: 0xFF0000 });
graphics.moveTo(0, 0).lineTo(100, 100);
graphics.stroke();

// Draw a circle
graphics.setFillStyle({ color: 0x00FF00 });
graphics.circle(50, 50, 25);
graphics.fill();

// Draw a rectangle
graphics.setFillStyle({ color: 0x0000FF });
graphics.rect(10, 10, 80, 60);
graphics.fill();

// Clear for next frame (CRITICAL!)
graphics.clear();
```

#### PIXI.Sprite - For bitmap images

```typescript
const texture = PIXI.Texture.from('image.png');
const sprite = new PIXI.Sprite(texture);
sprite.x = 100;
sprite.y = 100;
sprite.scale.x = 2;
sprite.rotation = Math.PI / 4;  // 45 degrees
container.addChild(sprite);
```

#### PIXI.Text - For text rendering

```typescript
const text = new PIXI.Text({
    text: 'Score: 1000',
    style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xFFFFFF,
    }
});
container.addChild(text);
```

### 4. Animation State Management

Effects typically track animation progress:

```typescript
interface AnimationState {
    progress: number;      // 0 to 1 (often normalized)
    offset: number;        // Position offset for scrolling effects
    pulse: number;         // Oscillating value (0 to 2π)
    scale: number;         // Size multiplier
    rotation: number;      // Angle in radians
    colors: number[];      // Color interpolation
}

// Usage in draw():
this.state.progress += 0.01;  // Progress 1% per frame
const alpha = Math.max(0, 1 - this.state.progress);  // Fade out
```

### 5. Coordinate System

VibeCodeTris uses **grid-based coordinates**:

```
Game board: 10 columns × 20 rows
Block size: Typically 32 pixels

Grid coordinates → Screen coordinates:
  screenX = gridX * BLOCK_SIZE
  screenY = gridY * BLOCK_SIZE

Example: Block at grid (3, 5) renders at screen (96, 160)
```

---

## The Multiplier Display System

### What It Does

When you clear lines, VibeCodeTris shows a multiplier indicator (x2, x3, x4) that:
- Appears when the multiplier increases
- Fades out over time (~2 seconds)
- Can be rendered with different visual styles
- Persists persistently across games (settings)

### System Architecture

```
Game State                  UI Settings
    ↓                           ↓
  multiplier value        multiplierEffect:
  (x1, x2, x3, ...)       'default'|'scanline'|'none'
    ↓                           ↓
    └─→ pixiRenderer.ts ←───────┘
            ↓
        currentMultiplierEffect instance
        (DefaultMultiplierEffect, ScanlineMultiplierEffect, etc.)
            ↓
        effect.draw(graphics, multiplier, decayTimer, lastMultiplier)
            ↓
        Renders to multiplierGraphics PIXI.Graphics object
            ↓
        Displayed on screen above board
```

### Current Multiplier Effects

#### DefaultMultiplierEffect
- **Style:** White outline text with edge/node rendering
- **Colors:** 0xFFFFFF (white)
- **Animation:** Fades in quickly, fades out smoothly
- **Use Case:** Clean, readable default

#### ScanlineMultiplierEffect
- **Style:** Text with animated horizontal scanlines overlaid
- **Colors:** 0xFFFFFF (text) + 0xFF00FF (magenta scanlines)
- **Animation:** Scanlines move continuously while multiplier visible
- **Use Case:** Retro/CRT aesthetic

#### NoneMultiplierEffect
- **Style:** No display
- **Animation:** None
- **Use Case:** Minimal/zen mode

### How Multiplier Effects Work (Technical Deep Dive)

**File:** `src/renderer/animations/multiplier/DefaultMultiplierEffect.ts`

```typescript
export class DefaultMultiplierEffect implements IMultiplierEffect {
    public state: any = {};  // No state needed for static effect

    draw(
        graphics: PIXI.Graphics,
        multiplier: number,
        multiplierDecayTimer: number,
        lastMultiplier: number
    ): void {
        // 1. Clear previous frame
        graphics.clear();

        // 2. Don't render x1
        if (multiplier <= 1) {
            return;
        }

        // 3. Calculate fade based on time remaining
        const decayProgress = multiplierDecayTimer / MULTIPLIER_DECAY_DELAY_TICKS;
        let alpha = 0.1 + (decayProgress * 0.3);  // Fades from 0.4 → 0.1

        // 4. Detect new multiplier and fade-in faster
        if (multiplier > lastMultiplier) {
            const fadeInProgress = 1 - (multiplierDecayTimer / MULTIPLIER_DECAY_DELAY_TICKS);
            alpha = Math.min(alpha, 0.05 + fadeInProgress * 2);  // Quick pop-in
        }

        // 5. Clamp alpha safety
        alpha = Math.max(0, Math.min(alpha, 1));

        // 6. Prepare text and positioning
        const text = `x${multiplier}`;
        const textWidth = text.length * 4 - 1;  // Pixel-based calculation
        const textHeight = 5;
        const startX = Math.round((COLS - textWidth) / 2);
        const startY = Math.round((ROWS - textHeight) / 2);

        // 7. Draw character-by-character using pixel font geometry
        graphics.setStrokeStyle({ width: 1, color: 0xFFFFFF, alpha: alpha });
        let currentX = startX;

        for (const char of text) {
            const charGeometry = PIXEL_FONT_GEOMETRY[char];
            if (charGeometry) {
                // Each character has pre-defined edge coordinates
                for (const [x1, y1, x2, y2] of charGeometry.edges) {
                    const screenX1 = (currentX + x1) * BLOCK_SIZE;
                    const screenY1 = (startY + y1) * BLOCK_SIZE;
                    const screenX2 = (currentX + x2) * BLOCK_SIZE;
                    const screenY2 = (startY + y2) * BLOCK_SIZE;

                    graphics.moveTo(screenX1, screenY1).lineTo(screenX2, screenY2);
                }
                currentX += 4;  // Next character position
            }
        }

        // 8. Commit drawing
        graphics.stroke();
    }
}
```

**Key Pattern:**
1. Clear graphics (always first!)
2. Check visibility conditions
3. Calculate animation values (alpha, scale, offset, etc.)
4. Detect state changes (new multiplier, fade-in triggers)
5. Calculate positions based on game constants
6. Draw primitives using geometry data
7. Stroke/fill to commit

---

## Creating Custom Multiplier Effects

### Beginner: Simple Color Change

Create a variant that pulses between colors:

```typescript
// File: src/renderer/animations/multiplier/PulseMultiplierEffect.ts
import * as PIXI from 'pixi.js';
import { IMultiplierEffect } from './types';
import { COLS, ROWS, BLOCK_SIZE, MULTIPLIER_DECAY_DELAY_TICKS } from '../../../logic/constants';
import { PIXEL_FONT_GEOMETRY } from '../../pixel-font-geometry';

export class PulseMultiplierEffect implements IMultiplierEffect {
    public state: { pulsePhase: number } = { pulsePhase: 0 };

    draw(
        graphics: PIXI.Graphics,
        multiplier: number,
        decayTimer: number,
        lastMultiplier: number
    ): void {
        graphics.clear();

        if (multiplier <= 1) return;

        // Update pulse animation (0 to 2π repeating)
        this.state.pulsePhase = (this.state.pulsePhase + 0.15) % (Math.PI * 2);

        // Calculate alpha
        const decayProgress = decayTimer / MULTIPLIER_DECAY_DELAY_TICKS;
        let alpha = 0.1 + (decayProgress * 0.3);

        if (multiplier > lastMultiplier) {
            const fadeInProgress = 1 - (decayTimer / MULTIPLIER_DECAY_DELAY_TICKS);
            alpha = Math.min(alpha, 0.05 + fadeInProgress * 2);
        }

        alpha = Math.max(0, Math.min(alpha, 1));

        // Calculate pulse color (oscillate between red and yellow)
        const pulseAmount = Math.sin(this.state.pulsePhase) * 0.5 + 0.5;  // 0 to 1
        const color = Math.round(0xFF0000 + (0x00FF00 * pulseAmount));  // Red → Yellow

        // Draw text (same as default)
        const text = `x${multiplier}`;
        const charDisplayWidth = 3;
        const charSpacing = 1;
        const textWidth = text.length * (charDisplayWidth + charSpacing) - charSpacing;
        const textHeight = 5;

        const startX = Math.round((COLS - textWidth) / 2);
        const startY = Math.round((ROWS - textHeight) / 2);

        graphics.setStrokeStyle({ width: 1, color: color, alpha: alpha });
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
                    graphics.moveTo(screenX1, screenY1).lineTo(screenX2, screenY2);
                }
                currentX += (charDisplayWidth + charSpacing);
            }
        }
        graphics.stroke();
    }

    reset?(): void {
        this.state.pulsePhase = 0;
    }
}
```

**Integration (3 changes):**

1. **state.ts** (line 23):
```typescript
multiplierEffect: 'default' | 'scanline' | 'none' | 'pulse';
```

2. **pixiRenderer.ts** (import + case):
```typescript
import { PulseMultiplierEffect } from './animations/multiplier/PulseMultiplierEffect';

case 'pulse':
    this._currentMultiplierEffect = new PulseMultiplierEffect();
    break;
```

3. **index.html** (dropdown):
```html
<option value="pulse">Pulse</option>
```

### Intermediate: Scale Animation

Text grows and shrinks:

```typescript
export class BounceMultiplierEffect implements IMultiplierEffect {
    public state: { bouncePhase: number } = { bouncePhase: 0 };

    draw(graphics, multiplier, decayTimer, lastMultiplier) {
        graphics.clear();
        if (multiplier <= 1) return;

        // Bounce animation
        this.state.bouncePhase = (this.state.bouncePhase + 0.12) % (Math.PI * 2);
        const bounceScale = 0.8 + Math.sin(this.state.bouncePhase) * 0.3;  // 0.5 to 1.1

        // ... rest of drawing code, but apply scale to screen coordinates:
        const screenX1 = (currentX + x1) * BLOCK_SIZE * bounceScale;
        const screenY1 = (startY + y1) * BLOCK_SIZE * bounceScale;
        // ... etc
    }
}
```

### Advanced: Particle System

Text surrounded by orbiting particles:

```typescript
export class ParticleMultiplierEffect implements IMultiplierEffect {
    public state: {
        particles: Array<{ x: number; y: number; angle: number; life: number }>;
    } = { particles: [] };

    draw(graphics, multiplier, decayTimer, lastMultiplier) {
        graphics.clear();
        if (multiplier <= 1) return;

        // Create particles on new multiplier
        if (multiplier > lastMultiplier) {
            for (let i = 0; i < 8; i++) {
                this.state.particles.push({
                    angle: (Math.PI * 2 * i) / 8,
                    x: 0,
                    y: 0,
                    life: 1.0
                });
            }
        }

        // Update and draw particles
        const centerX = (COLS / 2) * BLOCK_SIZE;
        const centerY = (ROWS / 2) * BLOCK_SIZE;

        for (let particle of this.state.particles) {
            particle.life -= 0.02;
            if (particle.life <= 0) continue;

            const distance = 80 * particle.life;
            particle.x = centerX + Math.cos(particle.angle) * distance;
            particle.y = centerY + Math.sin(particle.angle) * distance;

            // Draw particle
            graphics.setFillStyle({ color: 0xFF00FF, alpha: particle.life * 0.5 });
            graphics.circle(particle.x, particle.y, 3);
            graphics.fill();
        }

        // Remove dead particles
        this.state.particles = this.state.particles.filter(p => p.life > 0);

        // ... draw text same as default
    }
}
```

---

## Advanced Visualization Patterns

### Pattern 1: State Machines

Use an enumeration to track what "phase" an effect is in:

```typescript
enum EffectPhase {
    FadeIn,
    Sustain,
    FadeOut,
    Complete
}

export class StateAnimatedEffect implements IMultiplierEffect {
    public state: { phase: EffectPhase; progress: number } = {
        phase: EffectPhase.FadeIn,
        progress: 0
    };

    draw(graphics, multiplier, decayTimer, lastMultiplier) {
        this.state.progress += 0.02;

        switch (this.state.phase) {
            case EffectPhase.FadeIn:
                // Animate in (0-1)
                if (this.state.progress > 0.3) this.state.phase = EffectPhase.Sustain;
                break;
            case EffectPhase.Sustain:
                // Stay visible (1.0 alpha)
                if (this.state.progress > 0.7) this.state.phase = EffectPhase.FadeOut;
                break;
            case EffectPhase.FadeOut:
                // Animate out (1-0)
                if (this.state.progress > 1.0) this.state.phase = EffectPhase.Complete;
                break;
        }
        // ... rest of drawing
    }
}
```

### Pattern 2: Easing Functions

Make animations feel more natural with easing:

```typescript
// Easing functions (Robert Penner's)
const easeInQuad = (t: number): number => t * t;
const easeOutQuad = (t: number): number => t * (2 - t);
const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Usage:
const t = decayProgress;  // 0 to 1
const easedValue = easeOutQuad(t);  // Apply easing
const alpha = 0.1 + easedValue * 0.3;
```

### Pattern 3: Layered Drawing

Draw multiple layers for depth:

```typescript
// Background glow
graphics.setFillStyle({ color: 0xFF00FF, alpha: 0.1 });
graphics.rect(textX - 20, textY - 10, textWidth + 40, textHeight + 20);
graphics.fill();

// Middle layer (semi-transparent)
graphics.setStrokeStyle({ width: 2, color: 0xFF00FF, alpha: 0.3 });
// ... draw rectangle outline

// Foreground text (full opacity)
graphics.setStrokeStyle({ width: 1, color: 0xFFFFFF, alpha: 1.0 });
// ... draw text using pixel font geometry
```

### Pattern 4: Responsive to Multiplier Value

Higher multipliers = more dramatic effect:

```typescript
draw(graphics, multiplier, decayTimer, lastMultiplier) {
    // Scale effect intensity with multiplier
    const intensity = (multiplier - 1) * 0.5;  // Higher multiplier = more intense
    
    // Use for:
    const strokeWidth = 1 + intensity;
    const alphaBoost = 0.2 + intensity;
    const particleCount = Math.floor(5 + intensity * 3);
    
    // ... rest of drawing
}
```

---

## Performance & Optimization

### Frame Budget

VibeCodeTris runs at ~60fps. Each frame gets ~16ms.

**Multiplier effect budgets:**
- ✅ Can call draw() every frame (runs fast)
- ✅ Can create/update ~50 particles per frame
- ✅ Can do geometric calculations
- ⚠️ Should NOT do heavy image processing
- ❌ Should NOT create new objects every frame (causes GC)

### Memory Efficiency

```typescript
// ❌ BAD: Creates array every frame
draw(graphics, multiplier, ...) {
    const particles = [];  // NEW ARRAY every frame!
    // ...
}

// ✅ GOOD: Reuse state array
public state = { particles: [] };
draw(graphics, multiplier, ...) {
    // Reuse this.state.particles
    // Clear and rebuild only when needed
}
```

### Graphics Batching

PixiJS automatically batches draw calls. For best performance:

```typescript
// Better: Fewer stroke() calls
graphics.setStrokeStyle({ ... });
for (let i = 0; i < 100; i++) {
    graphics.moveTo(x1, y1).lineTo(x2, y2);
}
graphics.stroke();  // Single batch

// Worse: More stroke() calls
for (let i = 0; i < 100; i++) {
    graphics.setStrokeStyle({ ... });
    graphics.moveTo(x1, y1).lineTo(x2, y2);
    graphics.stroke();  // 100 batches!
}
```

### Profiling

Use browser DevTools:
1. Open DevTools (F12)
2. Performance tab
3. Record gameplay
4. Look for long frames or dropped frames
5. Identify expensive draw() calls

---

## Troubleshooting

### Effect doesn't appear
- [ ] Check type union includes effect name (state.ts)
- [ ] Check case statement in pixiRenderer.ts
- [ ] Check HTML dropdown has matching value
- [ ] Verify multiplier > 1 (x1 is not displayed)
- [ ] Check alpha isn't 0

### Effect looks jittery
- [ ] Verify `graphics.clear()` called at start
- [ ] Check animation calculations don't have gaps
- [ ] Ensure state updates are continuous, not step-based
- [ ] Look for floating point precision issues

### Effect leaves artifacts
- [ ] Confirm only one `graphics.clear()` per frame
- [ ] Check previous effect isn't still drawing (verify effect changes)
- [ ] Verify alpha blending (should be 0-1)
- [ ] Look for overlapping stroke/fill calls

### Effect performance is bad
- [ ] Profile with DevTools (see above)
- [ ] Reduce particle count
- [ ] Reduce geometric complexity
- [ ] Cache expensive calculations
- [ ] Use simpler colors/gradients

### Color looks wrong
- [ ] Check hex format (0xRRGGBB)
- [ ] Verify alpha channel separately (0-1 range)
- [ ] Test in Firefox/Chrome (rare GPU differences)
- [ ] Check PixiJS version compatibility

---

## Future Effect Ideas

### Visual Effects to Explore

1. **Wave Distortion**
   - Multiplier text appears to ripple
   - Wave frequency increases with combo
   - Use sine/cosine offset on coordinates

2. **Rainbow Gradient**
   - Text cycles through spectrum
   - Use HSL color space conversion
   - Smooth interpolation between hues

3. **Glow/Bloom**
   - Bright white core + fading halo
   - Multiple strokes with decreasing width
   - Alpha decreases outward

4. **Shake/Vibration**
   - Text position jitters slightly
   - Intensity based on multiplier
   - Use random offset

5. **Trail Effect**
   - Previous frames' text positions persist
   - Fade out over time
   - Creates motion blur

6. **Rotate/Spin**
   - Text rotates
   - Speed increases with multiplier
   - Could combine with scale for "zoom spin"

7. **Glitch Effect**
   - Channels offset (RGB separation)
   - Random line fragments
   - Retro/cyberpunk aesthetic

8. **Matrix Rain**
   - Digits rain down from above
   - Converge to form multiplier text
   - Matches "code" theme

9. **Physics-Based**
   - Text "bounces" into place
   - Gravity simulation
   - Elastic easing

10. **Sound-Reactive**
    - Amplitude/frequency from audio system
    - Text size/color responds to music
    - Creates audio-visual sync

### Integration Opportunities

- **Settings Menu:** Allow players to customize effect colors, speed, intensity
- **Themes:** Different effect packs (retro, neon, minimal, maximalist)
- **Accessibility:** Simpler effects option for reduced visual complexity
- **Customization:** Player-created effect scripts?
- **Procedural Generation:** Effects that respond to piece types, board state, etc.

---

## Reference: PixiJS API Cheat Sheet

### Graphics Methods

```typescript
// Setup
graphics.setStrokeStyle({ width: 2, color: 0xFF0000, alpha: 0.8 });
graphics.setFillStyle({ color: 0x00FF00, alpha: 0.5 });

// Drawing
graphics.moveTo(x, y);                    // Start point
graphics.lineTo(x, y);                    // Line to point
graphics.circle(x, y, radius);            // Circle
graphics.rect(x, y, width, height);       // Rectangle
graphics.ellipse(x, y, radiusX, radiusY); // Ellipse
graphics.polygon([x1, y1, x2, y2, ...]);  // Polygon
graphics.arc(x, y, radius, startAngle, endAngle); // Arc

// Rendering
graphics.stroke();                        // Draw strokes
graphics.fill();                          // Fill shapes
graphics.clear();                         // Clear all drawing

// Transform
graphics.scale.x = 2;
graphics.scale.y = 2;
graphics.rotation = Math.PI / 4;  // Radians
graphics.x = 100;
graphics.y = 100;
graphics.alpha = 0.5;
```

### Constants in VibeCodeTris

```typescript
// Board dimensions
COLS = 10                                 // Board width in blocks
ROWS = 20                                 // Board height in blocks
BLOCK_SIZE = 32                           // Pixels per block

// Game timing
MULTIPLIER_DECAY_DELAY_TICKS = 120        // Frames until multiplier fades
LINE_CLEAR_DELAY_TICKS = 30              // Frames for line clear animation

// Colors (hex format)
0x000000 = Black
0xFFFFFF = White
0xFF0000 = Red
0x00FF00 = Green
0x0000FF = Blue
0xFFFF00 = Yellow
0xFF00FF = Magenta
0x00FFFF = Cyan
```

### PIXEL_FONT_GEOMETRY

Pre-computed character rendering data:

```typescript
PIXEL_FONT_GEOMETRY['x'] = {
    edges: [
        [x1, y1, x2, y2],  // Line segment 1
        [x1, y1, x2, y2],  // Line segment 2
        // ... more edges
    ]
};

// Usage:
for (const [x1, y1, x2, y2] of PIXEL_FONT_GEOMETRY['x'].edges) {
    const screenX1 = (gridX + x1) * BLOCK_SIZE;
    const screenY1 = (gridY + y1) * BLOCK_SIZE;
    graphics.moveTo(screenX1, screenY1).lineTo(...);
}
```

---

## Best Practices Summary

1. **Keep It Simple First** - Start with color/alpha changes before complex animations
2. **Test Early** - Rebuild and test after each change
3. **Profile Performance** - Use DevTools to ensure 60fps
4. **Reuse State** - Don't create arrays/objects every frame
5. **Clamp Values** - Alpha should always be 0-1, angles 0-2π
6. **Document Your Code** - Comment why you're doing calculations
7. **Consider Accessibility** - Offer "simple" effect option
8. **Match the Audio** - Sync visuals with procedural audio feedback
9. **Test All Settings** - Ensure effects switch cleanly
10. **Version Control** - Keep old effects for comparison

---

## Resources & Examples

### In This Repository

- `src/renderer/animations/multiplier/DefaultMultiplierEffect.ts` - Simple reference
- `src/renderer/animations/multiplier/ScanlineMultiplierEffect.ts` - Advanced reference with animation
- `src/renderer/pixel-font-geometry.ts` - Character rendering data
- `src/logic/constants.ts` - Game constants

### External References

- [PixiJS Documentation](https://pixijs.com/docs)
- [Robert Penner Easing Functions](http://robertpenner.com/easing/)
- [Game Feel by Steve Swink](https://www.amazon.com/Game-Feel-Game-Design-Experience/dp/0415967453) - Juicing games
- [The Art of Game Design by Jesse Schell](https://www.amazon.com/Art-Game-Design-Book-Lenses/dp/1138632058) - Visual feedback

---

**Last Updated:** November 14, 2025  
**Version:** 1.0  
**Maintained By:** VibeCodeTris Team
