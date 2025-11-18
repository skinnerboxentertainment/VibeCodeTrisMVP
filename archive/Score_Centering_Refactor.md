# Score Centering Refactor

## Objective

To improve player focus and enhance the user experience by repositioning the in-game score to the center of the top UI panel. The Level and Lines counters will flank the score.

## Rationale

The score is the most dynamic and critical piece of feedback for the player, especially with the upcoming introduction of score multipliers and other fast-paced mechanics. Centering it ensures the player's eyes are drawn to this key information, reinforcing the desired "hectic" and engaging gameplay loop.

## Implementation Plan

The change requires modifications in two key areas: the HTML structure for the info panel labels and the PixiJS rendering logic for the dynamic values.

### 1. HTML Layout (`index.html`)

The order of the `info-item` divs within the `#in-game-info` container will be changed.

**Current Order:**
1.  Score (left)
2.  Level (center)
3.  Lines (right)

**New Order:**
1.  Level (left)
2.  Score (center)
3.  Lines (right)

The corresponding CSS (`text-align`) for these items will be updated to match the new layout.

### 2. PixiJS Renderer (`src/renderer/pixiRenderer.ts`)

The positioning and anchoring of the `PIXI.Text` objects within the `uiTextContainer` will be adjusted.

-   `levelText`: Will be moved to the left side.
-   `scoreText`: Will be moved to the center (`BOARD_WIDTH / 2`) and its anchor will be set to `(0.5, 0)` to ensure it's perfectly centered.
-   `linesText`: Will remain on the right side.

This ensures that the dynamic numerical values rendered on the canvas align perfectly with the static HTML labels.
