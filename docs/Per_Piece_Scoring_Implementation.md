# Per-Piece Live Scoring: Implementation Plan

## 1. Feature Vision

This feature introduces a dynamic, real-time scoring mechanic where each Tetris piece accumulates its own score as it is manipulated by the player. The goal is to provide immediate, gratifying visual feedback for skillful actions like soft and hard drops.

- **Core Idea:** A small, unobtrusive text element is attached to the currently active piece.
- **Live Updates:** This text displays a score that increments in real-time as the player performs soft drops and hard drops.
- **Player Feedback:** This creates a direct, visceral connection between player actions and scoring, enhancing the feeling of mastery and making the game more engaging.

---

## 2. Technical Implementation

The implementation is divided into two main parts: the game logic (Engine) and the visual representation (Renderer).

### A. Engine (`src/logic/engine.ts`)

The engine needs to be updated to track the score of the individual piece currently in play.

1.  **Add New State Variable:**
    - Introduce a new class property to `TetrisEngine`:
      ```typescript
      private currentPieceScore: number;
      ```

2.  **Initialize and Reset:**
    - In the `spawnPiece()` method, reset the score to zero immediately after a new piece is created:
      ```typescript
      this.currentPieceScore = 0;
      ```
    - In the `lockPiece()` method, before the `currentPiece` is set to `null`, the `currentPieceScore` will be used in the final drop score calculation.

3.  **Track Score on Drop:**
    - The `handleInput` and `updateMovement` methods will be modified to increment this new score.
    - The points awarded will mirror the existing drop score logic: **1 point** per soft drop row, **2 points** per hard drop row.
    - **Example (`handleInput` for 'softDrop'):**
      ```typescript
      // ... inside 'softDrop' case
      if (isValidPosition(matrix, x, y, this.board)) {
          this.currentSoftDropRows++;
          this.currentPieceScore++; // Increment the piece's score
      }
      ```
    - **Example (`handleInput` for 'hardDrop'):**
      ```typescript
      // ... inside 'hardDrop' case
      let distance = 0;
      while (isValidPosition(matrix, x, y + 1, this.board)) {
          y++;
          distance++;
      }
      this.currentHardDropRows = distance;
      this.currentPieceScore += distance * 2; // Add hard drop points
      this.lockPiece();
      // ...
      ```

4.  **Integrate with Final Score:**
    - In `finalizeLineClear()`, the `calculateDropPoints` function will now receive this pre-calculated score.
      ```typescript
      // The existing `calculateDropPoints` will be adjusted or this value will be used directly.
      const dropPoints = calculateDropPoints(this.currentPieceScore, this.multiplier); 
      this.score += dropPoints;
      this.currentPieceScore = 0; // Reset for safety, though spawnPiece also does this.
      ```

5.  **Expose to Renderer via Snapshot:**
    - The `createSnapshot()` method must be updated to include the `currentPieceScore`.
    - The `Snapshot` interface in `src/logic/types.ts` must also be updated.
      ```typescript
      // In the Snapshot interface (types.ts)
      export interface Snapshot {
        // ... other properties
        currentPieceScore?: number;
      }

      // In engine.ts createSnapshot()
      const snapshotData: Omit<Snapshot, 'checksum'> = {
        // ... other properties
        currentPieceScore: this.currentPieceScore,
      };
      ```

### B. Renderer (`src/renderer/pixiRenderer.ts`)

The renderer will be responsible for displaying the score on the screen.

1.  **Create a Text Object:**
    - A `PIXI.Text` object will be created and managed within the `PixiRenderer` class. It should be added to a high-level container (like the main stage) to ensure it's rendered on top of other elements.

2.  **Update in Render Loop:**
    - In the main render loop (`update(snapshot: Snapshot)`), the renderer will check for the new `currentPieceScore` property.
    - If `snapshot.current` and `snapshot.currentPieceScore > 0` exist:
        - The text object's `visible` property is set to `true`.
        - The `text` property is updated: `scoreText.text = "+${snapshot.currentPieceScore}";`
        - The text object's position is updated to follow the current piece. The coordinates will be calculated based on the piece's `x` and `y` from the snapshot, translated into pixel coordinates.

3.  **Hide When Inactive:**
    - If `snapshot.current` is `null` or `snapshot.currentPieceScore` is `0`, the text object's `visible` property is set to `false`.

---

## 3. UI/UX Considerations

- **Font & Style:**
  - **Font:** A clean, sans-serif font that is easy to read at a small size.
  - **Color:** White or a very light color.
  - **Readability:** A subtle black stroke or drop shadow will be applied to the text to ensure it remains legible against all piece and background colors.
  - **Size:** The font size will be small enough to be unobtrusive, likely around `12px` to `14px`.

- **Positioning:**
  - The score text will be positioned consistently relative to the piece. A good starting point is slightly above and to the right of the piece's bounding box, ensuring it doesn't overlap the piece's blocks.

- **Animation (Optional Enhancement):**
  - To make the score updates feel more impactful, a simple "pop" animation can be added using a library like GSAP (if available) or a simple custom animation loop.
  - When the score increments, the text could quickly scale up and then back down (e.g., from `1.0x` to `1.3x` and back) over a fraction of a second.

---

## 4. Action Plan

1.  **Branch:** Create a new feature branch: `feature/per-piece-scoring`.
2.  **Engine:** Implement all changes in `src/logic/engine.ts` and `src/logic/types.ts`.
3.  **Test Engine:** Write a unit test to verify that `currentPieceScore` is calculated and added to the snapshot correctly.
4.  **Renderer:** Implement the rendering logic in `src/renderer/pixiRenderer.ts`.
5.  **UI Polish:** Test the feature in-game, refining the text's position, size, and style for optimal aesthetics and readability.
6.  **Merge:** Once complete and verified, merge the feature branch into the main development branch.
