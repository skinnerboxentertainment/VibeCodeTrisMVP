# Background Well Display - Implementation Plan

This document outlines the detailed technical steps required to implement the "Background Well Display" feature as specified in the `Juice_Spec.md`. The plan is based on the findings from the `codebase_investigator` analysis.

---

## 1. Objective

To create a 10x20 grid of sprites that sits behind the active gameplay pieces in the Tetris well. This grid will function as a low-resolution, programmable display, serving as a foundational system for a variety of future visual effects.

---

## 2. Core Architecture & Integration Point

*   **Primary File:** `src/renderer/pixiRenderer.ts`
*   **Owning Class:** `PixiRenderer`

The `PixiRenderer` class is the central authority for all rendering logic, making it the ideal and correct place to own, manage, and render the new background well grid.

---

## 3. Git Branching Strategy

All work for this feature will be performed on a dedicated feature branch.

*   **Branch Name:** `feature/background-well-display`

---

## 4. Step-by-Step Implementation Procedure

### Step 4.1: Modify `PixiRenderer` Class Definition

Two new private properties will be added to the `PixiRenderer` class to manage the container and the individual sprites of the well display.

```typescript
// In: src/renderer/pixiRenderer.ts

export class PixiRenderer implements RenderAPI {
    // ... existing properties

    private backgroundWellContainer: PIXI.Container;
    private backgroundWellSprites: PIXI.Sprite[] = [];

    // ... rest of the class
}
```

### Step 4.2: Create the `initBackgroundWell` Method

A new private method will be created within the `PixiRenderer` class. This method will be responsible for the one-time setup of the grid, including instantiating the container and creating all 200 cell sprites.

```typescript
// In: src/renderer/pixiRenderer.ts, inside the PixiRenderer class

private initBackgroundWell(): void {
    this.backgroundWellContainer = new PIXI.Container();

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            // For the initial implementation, we'll use simple Graphics objects.
            // This can be changed to Sprites with textures later.
            const cell = new PIXI.Graphics();
            cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
            cell.fill({ color: 0x000000, alpha: 0.2 }); // Dim, semi-transparent black

            cell.x = x * BLOCK_SIZE;
            cell.y = y * BLOCK_SIZE;

            this.backgroundWellContainer.addChild(cell);
            this.backgroundWellSprites.push(cell as any); // Cast to any to satisfy Sprite array type for now
        }
    }
}
```
*Note: The initial implementation will use `PIXI.Graphics` for simplicity. This provides a solid foundation that can easily be swapped to `PIXI.Sprite` if a texture-based approach is needed for more advanced effects.*

### Step 4.3: Integrate into the `create` Lifecycle

The new `initBackgroundWell` method must be called during the renderer's setup phase. The static `create` method is the correct place for this.

```typescript
// In: src/renderer/pixiRenderer.ts

public static async create(canvas: HTMLCanvasElement): Promise<PixiRenderer> {
    // ... existing setup code
    const renderer = new PixiRenderer(app, canvas);
    renderer.initBoard();
    renderer.initBackgroundWell(); // <-- Add this line
    
    // ... existing code
}
```

### Step 4.4: Ensure Correct Z-Ordering

This is a critical step. The `backgroundWellContainer` must be added to the main stage *before* the `boardContainer` to ensure it renders behind the gameplay elements.

```typescript
// In: src/renderer/pixiRenderer.ts, inside the `create` method

// Find this existing line:
// renderer.app.stage.addChild(renderer.boardContainer, renderer.uiTextContainer);

// And modify it to:
renderer.app.stage.addChild(
    renderer.backgroundWellContainer, 
    renderer.boardContainer, 
    renderer.uiTextContainer
);
```

---

## 5. Verification & Expected Outcome

After completing the steps above, running the application should produce the following result:

*   The game should look and function as normal.
*   Behind the falling pieces and the locked blocks, a faint, 10x20 grid of dark, semi-transparent squares should be visible, covering the entire area of the well.
*   This confirms that the container has been initialized correctly and the Z-ordering is as expected.

---

## 6. Future Expansion (API)

Once the foundational system is verified, a public method will be added to the `PixiRenderer` to allow external game logic to control the cells.

**Example (to be implemented after initial setup):**

```typescript
public setWellCell(x: number, y: number, color: number, alpha: number): void {
    const index = y * COLS + x;
    if (this.backgroundWellSprites[index]) {
        const cell = this.backgroundWellSprites[index] as PIXI.Graphics;
        cell.clear();
        cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
        cell.fill({ color, alpha });
    }
}
```
This API will be the bridge that allows us to implement features like the "Ghosted Multiplier Display" and "Line Clear Ripple".
