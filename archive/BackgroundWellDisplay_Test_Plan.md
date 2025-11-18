# Background Well Display - Test Plan

## 1. Objective

To visually confirm that the 10x20 background well is perfectly aligned, scaled, and layered behind the main game board.

## 2. Problem

The main game board's empty cells are currently opaque, completely obscuring the background well display, preventing visual inspection of its alignment, scaling, and layering.

## 3. Test Procedure

### Step 3.1: Implement a Clear, Static Test Pattern in `src/main.ts`

We will reintroduce temporary test code into `src/main.ts` to draw a simple, static checkerboard pattern on the `backgroundWellContainer`. This pattern will use two distinct colors to make alignment issues immediately apparent. This will replace the previous rainbow animation, which was too dynamic for precise alignment verification.

### Step 3.2: Temporarily Make Empty Board Cells Transparent in `src/renderer/pixiRenderer.ts`

We will modify the `drawBlock` method within `src/renderer/pixiRenderer.ts`. Specifically, when `colorIndex === 0` (indicating an empty cell on the main game board), we will set the `alpha` property of that `PIXI.Graphics` block to `0`. This will make the empty cells of the main board fully transparent, allowing the checkerboard pattern from the `backgroundWellContainer` to be visible through them.

## 4. Expected Outcome

Upon running the application, a clear, static checkerboard pattern should be visible through the empty cells of the main Tetris well. This pattern should be perfectly aligned with the grid lines of the main board and should cover the entire 10x20 area of the well. This will confirm correct alignment, scaling, and Z-ordering of the background well display.

## 5. Reversion

Once verification is complete, both the temporary test pattern code in `src/main.ts` and the temporary transparency modification in `src/renderer/pixiRenderer.ts` will be removed, restoring the original intended behavior.