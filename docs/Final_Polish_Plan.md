# VibeCodeTris: Final Polish & Feature Expansion Plan

This document outlines a one-week development plan to elevate VibeCodeTris from a feature-complete engine to a polished, engaging, and well-rounded game. The focus is on adding "juice" (satisfying feedback), quality-of-life (QoL) improvements, and implementing low-hanging fruit features that offer a high return on investment.

## I. Core Strengths & Foundation

Our starting point is exceptionally strong. The code-level review confirms:

*   **Rock-Solid Engine (`src/logic/engine.ts`):** The deterministic, tick-based engine is the project's greatest asset. It's robust, testable, and cleanly separated from the presentation layer, which makes adding and verifying new mechanics straightforward.
*   **Modular Renderer (`src/renderer/pixiRenderer.ts`):** The renderer is well-structured, with a clear separation of concerns for drawing the board, handling animations, and managing visual effects. The existence of the `AnimationManager` and the `IMultiplierEffect` interface makes it highly extensible.
*   **Advanced Audio Engine (`src/audio/AudioEngine.ts`):** The procedural audio system is a standout feature. Its rule-based design, configured entirely within `main.ts`, allows for significant audio enhancements without altering the core audio code.

## II. "Juice" Enhancements (High-Impact Polish)

These changes focus on making the game feel more dynamic and responsive.

### 1. GSAP Integration for UI Transitions

*   **Analysis:** The `UIStateManager.ts` currently switches between views by instantly adding or removing a `.hidden` CSS class. This is functional but jarring. The clean `changeState` method is a perfect hook for adding smooth animations.
*   **Plan:**
    1.  **Install GSAP:** Add `gsap` as a project dependency.
    2.  **Animate Transitions:** In `UIStateManager.ts`, modify the `updateVisibility` method. Instead of toggling the class directly, use `gsap.to()` to animate the opacity and transform of the view elements. For example, fade out the old screen (`opacity: 0, y: -20`) and fade in the new one (`opacity: 1, y: 0`).
    3.  **Animate Buttons:** In `main.ts`, add `pointerdown` and `pointerup` event listeners to the primary UI buttons. Use GSAP to animate a button's `scale` down to `0.95` on press and back to `1.0` with a subtle bounce on release (`ease: "elastic.out(1, 0.5)"`).

### 2. Piece Spawn & Lock Animations

*   **Analysis:** Pieces currently appear and lock instantly. Adding small animations will significantly improve game feel. The `pieceSpawn` and `pieceLockedWithScore` events are the ideal triggers.
*   **Plan:**
    1.  **Spawn Animation:** In `pixiRenderer.ts`, when handling a `pieceSpawn` event, don't just draw the piece. Animate its properties over a few frames. A good effect would be animating its scale from `0.8` to `1.0` and alpha from `0.5` to `1.0`.
    2.  **Lock Feedback:** When a piece locks, create a brief visual effect. A simple, effective approach is to create a "flash" by quickly tweening the color of the locked blocks to white and then back to their original color. This can be managed within the `_processEvents` method.

## III. Quality of Life (QoL) Improvements

These are standard features that players expect and will make the game more comfortable to play.

### 1. Implement Hold Piece Functionality

*   **Analysis:** This is a critical missing feature. The engine state (`engine.ts`) already includes a `holdType` property, but the logic to use it is absent from `handleInput`.
*   **Plan (Low-Hanging Fruit):**
    1.  **Engine Logic (`engine.ts`):**
        *   In `handleInput`, add a `case 'hold':`.
        *   This logic will swap `this.currentPiece` with `this.holdType`.
        *   If `holdType` is empty, store the current piece and spawn a new one from the bag.
        *   Implement a flag to prevent repeated holding until a piece has been locked, which is standard practice.
    2.  **Renderer (`pixiRenderer.ts`):**
        *   Create a new `PIXI.Container` to the side of the main board.
        *   In the main render loop, check `snapshot.holdType` and draw the corresponding piece inside this container.
    3.  **UI (`index.html`, `keyboard.ts`):** Add a key binding (e.g., 'c' or 'Shift') and a dedicated touch button for the 'hold' action.

### 2. Display the "Next" Piece Queue

*   **Analysis:** The engine correctly maintains a `nextTypes` array of upcoming pieces. The renderer simply needs to display them.
*   **Plan (Low-Hanging Fruit):**
    1.  **Renderer (`pixiRenderer.ts`):** Create a `PIXI.Container` for the "next" queue display. In the main render loop, iterate through `snapshot.nextTypes` and draw small, scaled-down versions of the upcoming pieces. Displaying 3-5 pieces is standard.

## IV. Low-Hanging Fruit (High-Value Features)

These features leverage existing systems to add significant gameplay depth with minimal new code.

### 1. T-Spin Detection & Scoring

*   **Analysis:** The scoring function in `src/logic/rules.ts` is already built to handle T-Spins (`isTSpin` parameter), but the detection logic is missing.
*   **Plan:**
    1.  **Detection (`engine.ts`):** In the `lockPiece` method, if the locked piece is a 'T', perform a T-Spin check before clearing lines. The standard check involves verifying if 3 of the 4 corners diagonally adjacent to the T-piece's center are occupied by other blocks or walls.
    2.  **Scoring:** Pass the `isTSpin` boolean result to the `calculateScore` function.
    3.  **Feedback:** Add a new `tSpin` game event. Use this in `pixiRenderer.ts` to trigger a unique text animation (e.g., "T-Spin!") and in `AudioEngine.ts` to play a distinct sound.

### 2. Expanded Audio Feedback

*   **Analysis:** The rule-based `AudioEngine.ts` is highly extensible. We can add new sounds for advanced gameplay events that are already being tracked.
*   **Plan:**
    1.  **Add New Rules (`main.ts`):** In the `audioConfig`, define new `EventRuleConfig` entries for "Tetris" (4-line clear), T-Spins, and combos.
    2.  **Implement Combo Pitch Scaling:** In `AudioEngine.ts`, modify the `pieceLock` rule handler. Have it read the `combo` count from the game snapshot and use it to pitch-shift the lock sound upwards, providing satisfying auditory feedback for sustained play.
    3.  **Create New Instruments:** Define new synth presets in the `audioConfig` for a more impactful "Tetris" sound and a specific T-Spin sound.

### 3. New Visual Block Style: "Outline"

*   **Analysis:** The `drawBlock` function in `pixiRenderer.ts` uses a simple `switch` statement, making new visual styles trivial to add.
*   **Plan:**
    1.  **Update Config:** Add a new style name (e.g., `'outline'`) to the `VisualSettings` type in `state.ts` and to the dropdown in `index.html`.
    2.  **Implement Style (`pixiRenderer.ts`):** Add a `case 'outline':` to the `drawBlock` switch. This new style can draw only the block's stroke with a bright color and leave the fill transparent or as a dark, low-alpha color. This creates a high-contrast, "wireframe" look that is easy to implement and visually distinct.

## V. Suggested Weekly Plan

*   **Day 1-2: QoL Foundation.** Implement Hold, Next Queue, and basic Pause functionality. These are essential for player comfort and make testing other features easier.
*   **Day 3-4: Juice & Polish.** Integrate GSAP for all UI transitions and button feedback. Add the spawn and lock animations for pieces.
*   **Day 5: Advanced Mechanics.** Implement T-Spin detection logic in the engine and hook it up to the existing scoring system.
*   **Day 6: Sensory Feedback.** Expand the audio engine with new rules and sounds for T-Spins, combos, and Tetris clears. Implement the new "Outline" block style.
*   **Day 7: Final Playtesting & Tuning.** Play the game extensively. Tweak animation timings, sound effect volumes, and scoring values until the experience feels perfectly polished.
