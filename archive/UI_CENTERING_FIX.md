# UI Text Centering Solution

This document outlines the problem and proposed solution for centering the `levelText` and `linesText` values under their respective `levelLabel` and `linesLabel` in `pixiRenderer.ts`.

## Problem

The numerical values for "LEVEL" and "LINES" are not visually centered beneath their corresponding labels.

-   **LEVEL:** Both `levelLabel` and `levelText` are anchored at their top-left `(0, 0)`. When positioned at the same `x` coordinate, their left edges align, but because the text "LEVEL" is wider than the number "1", their centers are misaligned.
-   **LINES:** Both `linesLabel` and `linesText` are anchored at their top-right `(1, 0)`. When positioned at the same `x` coordinate, their right edges align, but their centers are also misaligned due to differing text widths.

## Proposed Solution

To fix this, we need to adjust the anchoring and positioning logic in the `initText()` and `resize()` methods of `pixiRenderer.ts`.

### 1. Update Anchors in `initText()`

The anchors for the numerical value text objects (`levelText` and `linesText`) will be changed to center them horizontally. The label anchors will remain as they are to control the overall group position (left-aligned for LEVEL, right-aligned for LINES).

-   Change `this.levelText.anchor.set(0, 0);` to `this.levelText.anchor.set(0.5, 0);`
-   Change `this.linesText.anchor.set(1, 0);` to `this.linesText.anchor.set(0.5, 0);`

The `scoreText` and `scoreLabel` already use a center anchor and are aligned correctly.

### 2. Update X-Coordinates in `resize()`

With the new anchors, we must calculate the `x` position of the values based on the center of their labels.

-   **For `levelText`:**
    -   The `levelLabel` is positioned from its left edge (`x = TEXT_HORIZONTAL_OFFSET`).
    -   To find the center of the label, we take its `x` position and add half its width.
    -   The new `levelText.x` will be `this.levelLabel.x + this.levelLabel.width / 2`.

-   **For `linesText`:**
    -   The `linesLabel` is positioned from its right edge (`x = BOARD_WIDTH - TEXT_HORIZONTAL_OFFSET`).
    -   To find the center of the label, we take its `x` position and subtract half its width.
    -   The new `linesText.x` will be `this.linesLabel.x - this.linesLabel.width / 2`.

This will ensure that the numerical values are always perfectly centered under their labels, regardless of the width of the numbers being displayed.
