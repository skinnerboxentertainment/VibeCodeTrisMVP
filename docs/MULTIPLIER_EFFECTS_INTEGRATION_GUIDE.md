# Multiplier Effects Integration Guide

## Overview
VibeCodeTris supports multiple visual styles for the multiplier display (the "x2", "x3", etc. text that appears when you chain line clears). This guide explains the architecture and how to safely add or modify effects.

## Architecture

### 1. Effect Type Definition
**File:** `src/ui/state.ts`
```typescript
multiplierEffect: 'default' | 'scanline' | 'none';
```
- Add new effect names here as a type union
- Example: `multiplierEffect: 'default' | 'scanline' | 'none' | 'glow' | 'wave';`

### 2. Effect Interface
**File:** `src/renderer/animations/multiplier/types.ts`

All effects must implement `IMultiplierEffect`:
```typescript
export interface IMultiplierEffect {
    state: any;  // Animation state (e.g., { offset: 0, progress: 0.5 })
    
    draw(
        graphics: PIXI.Graphics,
        multiplier: number,
        decayTimer: number,
        lastMultiplier: number
    ): void;

    reset?(): void;  // Optional: called when effect is switched
}
```

**Parameters explained:**
- `graphics`: PixiJS Graphics object to draw on. Call `graphics.clear()` at the start to wipe previous frame.
- `multiplier`: Current multiplier value (e.g., 2, 3, 4)
- `decayTimer`: How many ticks until the multiplier fades away (0 = just appeared, increases until decay)
- `lastMultiplier`: The previous multiplier value (use to detect new multiplier)

### 3. Creating a New Effect

#### Step 1: Create the Effect File
**Location:** `src/renderer/animations/multiplier/{EffectName}MultiplierEffect.ts`

Example: Creating a "Glow" effect
```typescript
import * as PIXI from 'pixi.js';
import { IMultiplierEffect } from './types';
import { COLS, ROWS, BLOCK_SIZE, MULTIPLIER_DECAY_DELAY_TICKS } from '../../../logic/constants';
import { PIXEL_FONT_GEOMETRY } from '../../pixel-font-geometry';

export class GlowMultiplierEffect implements IMultiplierEffect {
    public state: { glowPulse: number } = { glowPulse: 0 };

    draw(
        graphics: PIXI.Graphics,
        multiplier: number,
        decayTimer: number,
        lastMultiplier: number
    ): void {
        graphics.clear();

        if (multiplier <= 1) {
            return; // Don't draw 'x1'
        }

        // Calculate alpha based on decay
        const decayProgress = decayTimer / MULTIPLIER_DECAY_DELAY_TICKS;
        let alpha = 0.1 + (decayProgress * 0.3);

        // Fade in when new multiplier appears
        if (multiplier > lastMultiplier) {
            const fadeInProgress = 1 - (decayTimer / MULTIPLIER_DECAY_DELAY_TICKS);
            alpha = Math.min(alpha, 0.05 + fadeInProgress * 2);
        }

        alpha = Math.max(0, Math.min(alpha, 1));

        // Update glow pulse animation
        this.state.glowPulse = (this.state.glowPulse + 0.1) % (Math.PI * 2);
        const glowScale = 1 + Math.sin(this.state.glowPulse) * 0.1;

        // Draw text with glow effect
        const text = `x${multiplier}`;
        const charDisplayWidth = 3;
        const charSpacing = 1;
        const textWidth = text.length * (charDisplayWidth + charSpacing) - charSpacing;
        const textHeight = 5;

        const startX = Math.round((COLS - textWidth) / 2);
        const startY = Math.round((ROWS - textHeight) / 2);

        // Draw base text
        graphics.setStrokeStyle({ width: 1, color: 0xFFFFFF, alpha: alpha });
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

        // Draw glow halo
        graphics.setStrokeStyle({ width: 2, color: 0x00FF00, alpha: alpha * 0.3 * glowScale });
        currentX = startX;
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
        this.state.glowPulse = 0;
    }
}
```

**Key points:**
- Start with `graphics.clear()` to avoid rendering artifacts
- Calculate `alpha` from `decayProgress` for fade effect
- Detect new multiplier with `multiplier > lastMultiplier` for fade-in
- Use `PIXEL_FONT_GEOMETRY[char].edges` to get character edge coordinates
- Update state animation values (e.g., `this.state.scanlineOffset`)
- Keep calculations efficient (runs every frame!)

#### Step 2: Add to Type Definition
**File:** `src/ui/state.ts`, line 23
```typescript
multiplierEffect: 'default' | 'scanline' | 'none' | 'glow';  // Add 'glow' here
```

#### Step 3: Import and Wire in Renderer
**File:** `src/renderer/pixiRenderer.ts`

**Add import (around line 18-23):**
```typescript
import { GlowMultiplierEffect } from
    './animations/multiplier/GlowMultiplierEffect';
```

**Update switch case (around line 240-254):**
```typescript
if (multiplierEffectChanged) {
    this._lastMultiplierEffectType = settings.multiplierEffect;
    switch (settings.multiplierEffect) {
        case 'scanline':
            this._currentMultiplierEffect = new ScanlineMultiplierEffect();
            break;
        case 'glow':  // NEW
            this._currentMultiplierEffect = new GlowMultiplierEffect();
            break;
        case 'none':
            this._currentMultiplierEffect = new NoneMultiplierEffect();
            break;
        case 'default':
        default:
            this._currentMultiplierEffect = new DefaultMultiplierEffect();
            break;
    }
}
```

#### Step 4: Add to Settings UI
**File:** `index.html`, find the multiplier effect select element:
```html
<select id="multiplier-effect-select">
    <option value="default">Default</option>
    <option value="scanline">Scanline</option>
    <option value="none">None</option>
    <option value="glow">Glow</option>  <!-- NEW -->
</select>
```

#### Step 5: Test
1. Rebuild: `npm run dev`
2. Go to Settings menu
3. Select the new effect from the dropdown
4. Start a game and clear lines to see the multiplier effect
5. Verify it switches correctly when you change the setting

## Critical Rules to Avoid Breaking Changes

### ⚠️ DO:
- ✅ Always call `graphics.clear()` at the start of `draw()`
- ✅ Keep the effect name in all three places (type, renderer, HTML)
- ✅ Use `this._lastMultiplierEffectType` for change detection (already set up)
- ✅ Test switching between all effects to ensure no rendering artifacts
- ✅ Use constants from `constants.ts` (COLS, ROWS, BLOCK_SIZE, etc.)
- ✅ Use `PIXEL_FONT_GEOMETRY` to render text consistently
- ✅ Clamp alpha between 0 and 1 to avoid rendering issues

### ⛔ DON'T:
- ❌ Don't compare `this.visualSettings.multiplierEffect` directly (it won't detect changes)
- ❌ Don't forget to update the type union in `state.ts`
- ❌ Don't forget to import the new effect class in `pixiRenderer.ts`
- ❌ Don't add the case but forget the HTML option (or vice versa)
- ❌ Don't call `graphics.clear()` multiple times in one `draw()` call
- ❌ Don't modify multiplier text rendering outside of character geometry system
- ❌ Don't assume the multiplier display is always centered (it uses COLS/ROWS calculation)

## Debugging Tips

### If the effect doesn't appear:
1. Check if `multiplierEffect` in `state.ts` type union includes your effect name
2. Verify the case name in the switch statement matches exactly
3. Check if the HTML option value matches exactly
4. Rebuild with `npm run dev` (changes to type files need rebuild)

### If the effect looks wrong:
1. Check `alpha` calculation - values should fade from 0.4 to 0.1 over decay time
2. Verify text positioning matches other effects (use same startX/startY calculation)
3. Ensure `graphics.clear()` is only called once per frame
4. Check color values are valid hex (0xRRGGBB format)

### If switching effects causes rendering artifacts:
1. Make sure `reset()` is implemented if your effect has animation state
2. Verify `graphics.clear()` is called at the start
3. Check if previous effect's graphics are overlapping (confirm single instance per effect)

## File Structure Reference
```
src/
├── ui/
│   └── state.ts                          // Type definition for effect names
├── renderer/
│   ├── pixiRenderer.ts                   // Main renderer + switch statement
│   └── animations/
│       └── multiplier/
│           ├── types.ts                  // IMultiplierEffect interface
│           ├── DefaultMultiplierEffect.ts
│           ├── ScanlineMultiplierEffect.ts
│           ├── NoneMultiplierEffect.ts
│           └── {YourEffect}MultiplierEffect.ts  // NEW EFFECT HERE
└── index.html                             // UI options dropdown
```

## Example: Modifying Existing Effect

To change the scanline color from magenta (0xFF00FF) to cyan (0x00FFFF):

1. Open `src/renderer/animations/multiplier/ScanlineMultiplierEffect.ts`
2. Find: `graphics.setStrokeStyle({ width: 1.5, color: 0xFF00FF, alpha: alpha * 0.8 });`
3. Change to: `graphics.setStrokeStyle({ width: 1.5, color: 0x00FFFF, alpha: alpha * 0.8 });`
4. Rebuild and test

No other files need to be touched!

## Performance Considerations

The `draw()` method runs every frame for every active multiplier. Keep it efficient:
- ✅ Avoid heavy calculations in loops
- ✅ Cache character geometry lookups if possible
- ✅ Reuse variables instead of creating new objects
- ✅ Limit animation state updates to simple arithmetic

The scanline effect is a good reference for acceptable complexity.

---

**Last Updated:** November 14, 2025
**Tested With:** PixiJS v8.x, TypeScript
