# Ghost Piece Rendering Fix Plan

## 1. Objective

To correct the visual rendering of the "ghost piece" so that it appears as a contiguous, faded color, correctly obscuring any pattern on the background well display.

## 2. Problem Description

The ghost piece is currently rendered with partial transparency (alpha). When drawn on top of the now-transparent empty board cells, this transparency allows the background well's test pattern (the checkerboard) to show through. This results in a visually distracting effect where the ghost piece inherits the pattern from the background instead of appearing as a solid, faded tetromino.

## 3. Proposed Solution

The fix involves modifying the ghost piece drawing logic within the `drawBoard` method in `src/renderer/pixiRenderer.ts`.

For each block that the ghost piece occupies, we will perform a two-step drawing process:

1.  **"Prime" the Block:** Before drawing the semi-transparent ghost piece color, we will first draw a solid, opaque, dark background color (e.g., the board's background color, `colors[0]`) into the block's `PIXI.Graphics` object. This will completely cover the checkerboard pattern from the background well.
2.  **Draw the Ghost Piece:** Immediately after priming, we will draw the ghost piece itself with its intended semi-transparent color on top of the primer.

This ensures that the ghost piece's transparency blends with a solid, dark color rather than the dynamic background pattern, achieving the desired contiguous, faded look.

### 3.1. Target File

*   `src/renderer/pixiRenderer.ts`

### 3.2. Target Method

*   `private drawBoard(snapshot: Snapshot)`

### 3.3. Conceptual Code Change

```typescript
// Inside the ghost piece drawing loop in drawBoard method:

// ... existing logic to find the block for the ghost piece ...
const block = this.boardBlocks[blockIndex];

// 1. Clear the block and "prime" it with a solid background color
block.clear();
block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill(colors[0]); // Opaque background fill

// 2. Draw the semi-transparent ghost piece color on top
block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill({ color: colors[piece.colorIndex], alpha: 0.4 });

// 3. (Optional but good practice) Add the grid stroke if needed
if (!solidPieces) {
    block.stroke({ width: BORDER_WIDTH, color: 0x333333, alpha: 0.2 });
}
```

## 4. Expected Outcome

After implementing this change, the ghost piece will render correctly. It will appear as a solid, faded tetromino that completely obscures the checkerboard pattern on the background well, resolving the visual artifact. This will confirm that both the background well and the ghost piece can render correctly and independently.