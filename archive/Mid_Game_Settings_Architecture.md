# Architecture Deep Dive: Mid-Game Settings Changes

This document details the architectural design of VibeCodeTris that allows for game settings to be changed "live" (e.g., while paused) and have those changes take effect immediately upon resuming gameplay.

## I. Core Principle: Separation of Concerns

The system is fundamentally built on a strict separation between the **Logic Worker** and the **Renderer**. This decoupling is the key to why mid-game changes are not only possible but also safe and robust.

*   **The Logic Worker (`src/logic/worker.ts` & `engine.ts`):**
    *   Runs in a completely separate thread.
    *   Is the **authoritative source of truth** for the game state.
    *   Only concerns itself with the deterministic simulation: piece mechanics, timing (DAS/ARR), scoring, line clearing, etc.
    *   It has no knowledge of visuals (colors, styles, animations) or audio. Its world is pure data and rules.

*   **The Renderer (`src/renderer/pixiRenderer.ts`):**
    *   Runs on the main UI thread.
    *   Is a **"dumb" presentation layer.** Its sole job is to visualize the `Snapshot` data it receives from the Logic Worker.
    *   It manages all visual aspects: color palettes, block styles, animation effects, and UI elements.

## II. The Settings Update Flow

When a player changes a setting, a clean, unidirectional data flow is triggered:

1.  **UI Interaction:** The player interacts with a control in the HTML (`index.html`).
2.  **State Management (`UIStateManager.ts`):** The UI event listener calls `uiManager.updateVisualSettings()`. This updates the central settings object.
3.  **Renderer Notification:** The `UIStateManager` notifies all its subscribers about the change. The `PixiRenderer` is a primary subscriber.
4.  **Renderer Reacts (`pixiRenderer.ts`):** The `onVisualSettingsChanged` method in the renderer fires. It does two critical things:
    *   **A) Updates Itself:** It immediately updates its own internal state. If the `blockStyle` was changed, the renderer will use the new style on the very next frame it draws.
    *   **B) Notifies the Worker:** It sends the new settings to the Logic Worker via `renderAPI.updateSettings(settings)`.

5.  **Worker Receives (`worker.ts` -> `engine.ts`):**
    *   The message is received by the worker, which passes the new settings to the `TetrisEngine`'s `updateSettings()` method.
    *   The engine updates its internal properties for any settings that affect gameplay logic. **Currently, these are `isLineClearAnimationEnabled` (which controls the `lineClearDelay`) and timing values like DAS/ARR.**
    *   Settings that are purely visual (e.g., `colorPalette`) are received but correctly ignored by the engine's simulation logic.

## III. The "Pause" Scenario

Pausing elegantly fits into this model without adding complexity.

1.  **Player Pauses:** The "Pause" button is pressed.
2.  **Ticker Stops:** The `pixiRenderer` calls `this.app.ticker.stop()`. This freezes the rendering loop on the main thread.
3.  **Worker Goes Idle:** Because the rendering loop has stopped, the renderer is no longer calling `engine.tick()` via the `renderAPI`. The Logic Worker remains alive and running, but it becomes idle, waiting for the next command. The game state is perfectly preserved within it.
4.  **Player Changes Settings:** The player navigates the pause menu and changes settings. The **Settings Update Flow (II)** described above happens exactly as normal. The renderer updates its visual configuration, and the worker updates its gameplay configuration, all while the game simulation is frozen.
5.  **Player Resumes:** The "Resume" button is pressed.
6.  **Ticker Starts:** The `pixiRenderer` calls `this.app.ticker.start()`.
7.  **Seamless Resumption:**
    *   On the very next frame, the renderer draws the board using the **new visual settings**.
    *   The game loop resumes sending `tick` commands to the worker. The worker continues its simulation from where it left off, using the **new gameplay settings**.

### Conclusion

The architecture is inherently designed to support this functionality. The clean separation of logic and presentation, combined with the asynchronous message-passing between the worker and the main thread, ensures that changing settings mid-game is a safe, non-destructive operation.
