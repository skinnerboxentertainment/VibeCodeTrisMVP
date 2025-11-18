# Multiplier System Implementation Plan

This plan outlines the steps to integrate the multiplier-based scoring system into the VibeCodeTris codebase, based on the analysis of existing files.

## 1. State Management

### 1.1. `src/logic/types.ts`
*   **Modify `Snapshot` interface:** Add `multiplier: number;` and `multiplierDecayTimer: number;` to the `Scoring State` section.

### 1.2. `src/logic/engine.ts`
*   **Add private fields:** Introduce `private multiplier: number;` and `private multiplierDecayTimer: number;` to the `TetrisEngine` class.
*   **Initialize in constructor:** Set initial values for `multiplier` (e.g., `1`) and `multiplierDecayTimer` (e.g., `0` or a default delay) in the `TetrisEngine` constructor.
*   **Update `fromSnapshot`:** Ensure these new fields are correctly restored when creating an engine from a snapshot.
*   **Update `createSnapshot`:** Include `multiplier` and `multiplierDecayTimer` in the snapshot data.

## 2. Scoring Logic (`src/logic/rules.ts`)

### 2.1. Modify `calculateScore` function
*   **Update signature:** Add a `multiplier: number` parameter to the `calculateScore` function.
*   **Apply multiplier:** Integrate the `multiplier` into the score calculation for line clears: `let score = baseScore * level * multiplier;`.

### 2.2. Add `calculateDropPoints` function
*   **New function:** Create a new function, `calculateDropPoints(softDropRows: number, hardDropRows: number, multiplier: number): number`, to compute points gained from manual drops.
*   **Logic:** Implement the formula: `(softDropRows * 1 + hardDropRows * 2) * multiplier`.

## 3. Engine Integration (`src/logic/engine.ts`)

### 3.1. Track Drops
*   **`handleInput` method:**
    *   For `softDrop` actions, track the number of rows moved.
    *   For `hardDrop` actions, calculate the distance dropped.
    *   Store these drop distances temporarily (e.g., in new private fields `currentSoftDropRows` and `currentHardDropRows`) until the piece locks.

### 3.2. Update Score
*   **`lockPiece` method:**
    *   Before calling `finalizeLineClear`, capture the `currentSoftDropRows` and `currentHardDropRows`.
    *   Reset `currentSoftDropRows` and `currentHardDropRows` to `0`.
*   **`finalizeLineClear` method:**
    *   Pass the current `multiplier` to the `calculateScore` function.
    *   Call the new `calculateDropPoints` function with the captured drop distances and current `multiplier`.
    *   Add the calculated drop points to the total score.

### 3.3. Manage Multiplier
*   **`finalizeLineClear` method:**
    *   After a line clear, increase the `multiplier` based on the number of lines cleared (e.g., +1 for single, +2 for double, etc., up to a cap).
    *   Reset the `multiplierDecayTimer` to its initial delay value.
*   **`tick()` method:**
    *   Implement logic to decrement `multiplierDecayTimer` each tick.
    *   If `multiplierDecayTimer` reaches zero and the `multiplier` is greater than `1`, decrement the `multiplier` by `1` and reset the `multiplierDecayTimer` to a shorter decay interval (e.g., 1 second).
    *   Ensure the `multiplier` does not go below `1`.

## 4. UI Rendering and Animations

### 4.1. `src/renderer/pixiRenderer.ts`
*   **Display Multiplier:**
    *   Create a new `PIXI.Text` object to display the current `multiplier` (e.g., "x1").
    *   Position it below the main score.
    *   Update its text content and color based on the `multiplier` value in the rendering loop.

### 4.2. `src/renderer/animations/AnimationManager.ts`
*   **Multiplier Increase Animation:**
    *   When the `multiplier` increases, trigger a "flash and scale" animation on the multiplier text. This might involve adding a new animation type or extending an existing one.
*   **Decay Warning Animation:**
    *   When `multiplierDecayTimer` is low (e.g., last second), trigger a "pulsing" animation on the multiplier text. This will likely require a new animation type.

## 5. Constants and Configuration

*   **`src/logic/constants.ts`:** Add new constants for:
    *   `MULTIPLIER_MAX_CAP` (e.g., 8)
    *   `MULTIPLIER_DECAY_DELAY_TICKS` (initial delay after clear, e.g., 180 ticks for 3 seconds at 60fps)
    *   `MULTIPLIER_DECAY_RATE_TICKS` (decay interval, e.g., 60 ticks for 1 second)
    *   `DROP_MULTIPLIER_SHARE` (e.g., 0.6)
    *   `MAX_DROP_POINTS_PER_PIECE` (e.g., 150)
    *   `MULTIPLIER_GAINS` (object mapping lines cleared to multiplier increase)

## 6. Testing and Refinement

*   **Unit Tests:** Add or update unit tests for `src/logic/rules.ts` to cover the new scoring and drop point calculations.
*   **Integration Tests:** Create integration tests to verify the end-to-end behavior of the multiplier system within the `TetrisEngine`.
*   **Playtesting & Telemetry:** As outlined in `Multiplier_Proposal.md`, use telemetry to balance the system and refine parameters.
