# UI Overhaul & Pause Feature Implementation Plan

This document provides a comprehensive plan for redesigning the VibeCodeTris user interface to move the HUD in-game and to implement the Pause feature. The previously planned "Hold" and "Next Queue" features have been deprecated and removed from this scope.

## I. Overview of New Design

The proposed UI moves the core heads-up display (HUD) from external HTML elements to be rendered *inside* the game canvas itself, creating a more integrated and polished look. It also introduces a critical Pause feature.

*   **Layout:** The layout will be simplified, removing the previously planned side panel. The primary focus is on the gameplay area.
*   **In-Game HUD:** The Score, Level, and Lines display will be rendered at the top of the game canvas using a pixelated font for a cohesive retro aesthetic.
*   **Pause Functionality:** A "Pause" button will also be rendered within the canvas. When pressed, the game will pause, and a simple "Resume" overlay will appear.

## II. Analysis of Required Changes by Area

This update primarily affects the renderer and UI state management.

### 1. HTML Structure (`index.html`)

The HTML changes are now minimal.

*   **Current:** A simple vertical flex column with an external `#in-game-info` panel for the HUD.
*   **Proposed:**
    *   The old HTML-based `#in-game-info` panel will be removed.
    *   A new overlay `div` for the "Paused" state will be added. It will be hidden by default and will contain a "Resume" button.

### 2. CSS Styling (`index.html`)

Only one new style is required.

*   **Pause Overlay Style:** CSS rules to center the pause overlay and its contents.

### 3. Renderer (`src/renderer/pixiRenderer.ts`)

This area will see the most significant changes.

*   **Internal HUD Rendering:**
    *   The renderer will take over responsibility for the HUD. `PIXI.Text` objects will be created for the Score, Level, and Lines displays.
    *   These text objects will be added as children to the main `boardContainer` and positioned at the top of the canvas.
    *   The `update` method will be modified to update the text values directly from the `Snapshot` data.
*   **Pause Button Rendering:**
    *   A new `PIXI.Text` or `PIXI.Sprite` will be created for the "Pause" button and positioned within the canvas.
    *   It will be made interactive to handle click/tap events.
*   **Ticker Control:**
    *   The renderer will observe the `UIStateManager`. When the state becomes `Paused`, it will call `this.app.ticker.stop()`. When the state changes back to `InGame`, it will call `this.app.ticker.start()`.

### 4. UI & State Management (`src/main.ts`, `src/ui/state.ts`)

The pause functionality needs to be implemented.

*   **New `Paused` State:** The `UIState` enum in `state.ts` will be extended with a `Paused` member.
*   **Pause Overlay:** The new overlay `div` will be shown when the `UIState` is `Paused`.
*   **State Transitions:**
    *   The "Pause" button's event listener (in the renderer) will call `uiManager.changeState(UIState.Paused)`.
    *   The "Resume" button's listener (in `main.ts`) will call `uiManager.changeState(UIState.InGame)`.

## IV. Step-by-Step Implementation Plan

The work will be performed in the following sequence.

1.  **Step 1: Implement Pause State & Overlay.** Add the `Paused` state to `UIState` in `state.ts`. Create the corresponding HTML overlay and the UI logic in `main.ts` to show/hide it based on state changes.
2.  **Step 2: Update Renderer for In-Canvas HUD.** Modify `src/renderer/pixiRenderer.ts` to render the Score, Level, and Lines text. Remove the old HTML HUD element.
3.  **Step 3: Add Pause Button and Ticker Control.** Extend the renderer to include an interactive "Pause" button. Implement the logic to stop and start the application ticker when the game state changes to `Paused` and back.
4.  **Step 4: Final Wiring and Testing.** Connect all the event listeners and conduct thorough testing of the pause/resume functionality.
