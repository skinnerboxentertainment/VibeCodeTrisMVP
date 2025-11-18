# Multiplier Effect Refactor Plan

This document outlines the plan to refactor the in-game multiplier display system. The goal is to move from a single, hard-coded visual effect to a flexible, scalable system that supports multiple, user-selectable effects.

## Core Strategy: "Strategy Pattern"

We will implement the **Strategy Pattern** to manage different multiplier animations. This approach will allow us to encapsulate each visual effect into its own class, making the system clean, organized, and easy to extend with new effects in the future.

## Implementation Steps

### 1. Update UI State & Settings

-   **File to Modify:** `src/ui/state.ts`
-   **Action:** Add a new property, `multiplierEffect`, to the `VisualSettings` interface.
-   **Details:** This property will be a string literal type, allowing for a predefined set of effect names.
    ```typescript
    export interface VisualSettings {
        // ... existing settings
        multiplierEffect: 'default' | 'scanline' | 'none';
    }
    ```
-   **Goal:** This will enable the settings panel to control which multiplier effect is active.

### 2. Define a Common Animation Interface

-   **New File:** `src/renderer/animations/multiplier/types.ts`
-   **Action:** Define an interface named `IMultiplierEffect`.
-   **Details:** This interface will serve as the "contract" for all multiplier effect classes. It will define the methods and properties that `PixiRenderer` will use to interact with the effect.
    ```typescript
    import * as PIXI from 'pixi.js';

    export interface IMultiplierEffect {
        // State can be used to track animation progress, e.g., { progress: 0, state: 'revealing' }
        state: any; 
        
        // The core method to draw the effect
        draw(
            graphics: PIXI.Graphics, 
            multiplier: number, 
            decayTimer: number, 
            lastMultiplier: number
        ): void;

        // Optional: A method to reset the animation state when the effect changes
        reset?(): void;
    }
    ```

### 3. Create Concrete Effect Classes

We will create separate classes for each visual effect, each implementing the `IMultiplierEffect` interface.

#### a. Default Effect

-   **New File:** `src/renderer/animations/multiplier/DefaultMultiplierEffect.ts`
-   **Action:** Create a `DefaultMultiplierEffect` class.
-   **Details:** The existing multiplier rendering logic (the simple fade) from `pixiRenderer.ts` will be moved into the `draw()` method of this class.

#### b. Scanline Effect (New)

-   **New File:** `src/renderer/animations/multiplier/ScanlineMultiplierEffect.ts`
-   **Action:** Create a `ScanlineMultiplierEffect` class.
-   **Details:** This class will contain all the new logic for the "juicy" scanline reveal, color flash, and scan-off animations. It will manage its own internal state for the reveal/sustain/hide phases.

### 4. Integrate the System into `PixiRenderer`

-   **File to Modify:** `src/renderer/pixiRenderer.ts`
-   **Action:** Refactor the renderer to act as the "context" for the strategy pattern.
-   **Details:**
    1.  **Add a new property:** `private _currentMultiplierEffect: IMultiplierEffect;`
    2.  **Update `onVisualSettingsChanged()`:** This method will be responsible for selecting the active strategy. It will contain a `switch` statement that checks `settings.multiplierEffect` and instantiates the corresponding effect class (e.g., `this._currentMultiplierEffect = new ScanlineMultiplierEffect();`).
    3.  **Simplify `drawMultiplierOnWell()`:** This function will be reduced to a single line that delegates the drawing task to the current effect:
        ```typescript
        private drawMultiplierOnWell(multiplier: number, multiplierDecayTimer: number, lastMultiplier: number): void {
            this._currentMultiplierEffect.draw(this.multiplierGraphics, multiplier, multiplierDecayTimer, lastMultiplier);
        }
        ```

This plan establishes a robust foundation for creating and managing a library of multiplier effects, starting with the default and the new scanline animation.