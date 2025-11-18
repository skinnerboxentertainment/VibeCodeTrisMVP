# Foreground Multiplier Display - Implementation Plan

## 1. Objective

To test a new rendering approach for the "Ghosted Multiplier Display" where the multiplier text is rendered on a new, transparent layer *on top* of all other gameplay elements. This is intended to solve the potential issue of the multiplier text being obscured by the player's stack of locked blocks.

## 2. Core Problem

The current implementation renders the multiplier on the `backgroundWellContainer`. As the player's stack of locked pieces (the "well") rises, it covers the background, making the multiplier text difficult or impossible to see. This new approach will test the viability of rendering the text in a foreground layer to ensure it's always visible.

## 3. Proposed Architecture Changes (`src/renderer/pixiRenderer.ts`)

### Step 3.1: Add New `PixiRenderer` Properties

A new container and a corresponding array of sprites will be added to the `PixiRenderer` class to manage the foreground layer.

```typescript
// In: src/renderer/pixiRenderer.ts

export class PixiRenderer {
    // ... existing properties

    private foregroundWellContainer: PIXI.Container;
    private foregroundWellSprites: PIXI.Graphics[] = [];

    // ... rest of the class
}
```

### Step 3.2: Create `initForegroundWell` Method

A new private method will be created to initialize the container and its sprites. The key difference from the background well is that these sprites will be fully transparent by default.

```typescript
// In: src/renderer/pixiRenderer.ts, inside the PixiRenderer class

private initForegroundWell(): void {
    this.foregroundWellContainer = new PIXI.Container();

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = new PIXI.Graphics();
            // Initially completely transparent
            cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill({ alpha: 0 });

            cell.x = x * BLOCK_SIZE;
            cell.y = y * BLOCK_SIZE;

            this.foregroundWellContainer.addChild(cell);
            this.foregroundWellSprites.push(cell);
        }
    }
}
```

### Step 3.3: Integrate into the `create` Lifecycle

The new `initForegroundWell` method will be called during the renderer's setup phase, alongside the other initialization methods.

```typescript
// In: src/renderer/pixiRenderer.ts, in the static `create` method

// ...
renderer.initBoard();
renderer.initBackgroundWell();
renderer.initForegroundWell(); // <-- Add this line
// ...
```

### Step 3.4: Critical - Adjust Z-Ordering (Render Order)

The new `foregroundWellContainer` must be added to the stage *after* the `boardContainer` to ensure it renders on top of the game pieces.

```typescript
// In: src/renderer/pixiRenderer.ts, inside the `create` method

// Find this existing line block:
renderer.app.stage.addChild(
    renderer.backgroundWellContainer, 
    renderer.boardContainer, 
    renderer.uiTextContainer
);

// And modify it to:
renderer.app.stage.addChild(
    renderer.backgroundWellContainer, 
    renderer.boardContainer, 
    renderer.foregroundWellContainer, // <-- Add this line
    renderer.uiTextContainer
);
```

### Step 3.5: Modify Drawing Logic

The `drawMultiplierOnBackgroundWell` method will be refactored to draw on the new `foregroundWellSprites` array instead of the background one. A corresponding `clearForegroundWell` method will also be needed. The core logic of calculating alpha and positioning will remain the same, but it will target the new top layer.

## 4. Verification

After implementation, the multiplier text should appear to "float" over all game elements, including the falling piece and the stack of locked blocks. It should remain fully visible regardless of how high the player's stack is. The text should still exhibit the same fade-in and fade-out behavior based on the multiplier's decay timer.
