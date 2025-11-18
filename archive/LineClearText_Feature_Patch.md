### **Feature Patch: Line Clear Text Animation**

#### **1. Feature Description**

This feature displays animated text (e.g., "Single", "Double", "Tetris!") over the game board whenever one or more lines are cleared. The text appears at the location of the cleared lines, fades in, and then fades out. This provides immediate, visually rewarding feedback to the player. The feature can be enabled or disabled via a new "Line Clear Text" checkbox in the game's settings menu.

#### **2. Technical Breakdown (How It Works)**

The implementation touches six key areas of the application:

1.  **Game Event Data (`src/logic/types.ts`):** The `lineClear` event in the `GameEvent` type is modified to include `rows`, an array of the specific row indices that were cleared. This is essential for positioning the text animation correctly.
2.  **UI State (`src/ui/state.ts`):** A new boolean property, `lineClearText`, is added to the `VisualSettings` interface and the default state in `UIStateManager`. This allows the feature's on/off state to be tracked.
3.  **HTML (`index.html`):** A new checkbox control (`line-clear-text-checkbox`) is added to the settings panel.
4.  **UI Element Mapping (`src/main.ts`):** The new checkbox element is mapped in the `uiElements` object so its state can be read.
5.  **Animation Logic (`src/renderer/animations/LineClearTextAnimation.ts`):** A new, dedicated animation class is created. It handles the lifecycle of the text object, including its creation, fade-in/fade-out animation based on progress, and cleanup. This encapsulates the animation logic cleanly.
6.  **Renderer Logic (`src/renderer/pixiRenderer.ts`):**
    *   A new private method, `_showLineClearText`, is added. Instead of managing the animation itself, it creates an instance of the new `LineClearTextAnimation` and registers it with the existing `animationManager`.
    *   The `lineClear` case within the `_processEvents` method is updated to call `_showLineClearText` if the feature is enabled.

#### **3. Integration Instructions**

To apply this feature to the clean, working build, modify the following files as described below.

**Step 1: Update Game Event Type**

*   **File:** `src/logic/types.ts`
*   **Action:** Modify the `GameEvent` type to ensure the `lineClear` event includes the `rows` that were cleared.

```typescript
// src/logic/types.ts

// REPLACE THIS:
export type GameEvent = {
  type: 'lineClear' | 'tSpin' | 'backToBack' | 'combo' | 'pieceSpawn' | 'pieceLock' | 'hold' | 'gameOver' | 'scoreUpdate' | 'hardDrop' | 'pieceMoveRight' | 'pieceMoveLeft' | 'softDropTick' | 'gravityStep';
  tick: number;
  data?: any;
};

// WITH THIS:
export type GameEvent = {
  type: 'lineClear';
  tick: number;
  data: {
    rows: number[];
    count: number;
  };
} | {
  type: 'tSpin' | 'backToBack' | 'combo' | 'pieceSpawn' | 'pieceLock' | 'hold' | 'gameOver' | 'scoreUpdate' | 'hardDrop' | 'pieceMoveRight' | 'pieceMoveLeft' | 'softDropTick' | 'gravityStep';
  tick: number;
  data?: any;
};
```

**Step 2: Add UI Setting**

*   **File:** `src/ui/state.ts`
*   **Action:** Add the `lineClearText` property to the `VisualSettings` interface and the `defaultSettings` object.

```typescript
// src/ui/state.ts

// In the VisualSettings interface, add the new property:
export interface VisualSettings {
    isGhostPieceEnabled: boolean;
    isLineClearAnimationEnabled: boolean;
    lineClearAnimation: string;
    lineClearText: boolean; // ADD THIS LINE
}

// In the UIStateManager class, update the defaultSettings:
export class UIStateManager {
    // ...
    private defaultSettings: VisualSettings = {
        isGhostPieceEnabled: true,
        isLineClearAnimationEnabled: true,
        lineClearAnimation: 'Center-Out Wipe',
        lineClearText: true, // ADD THIS LINE
    };
    // ...
}
```

**Step 3: Add Settings Checkbox**

*   **File:** `index.html`
*   **Action:** Add the new checkbox HTML inside the "Visuals" fieldset.

```html
<!-- index.html -->

<!-- Find this div: -->
<div class="checkbox-row">
    <label for="animated-line-clear-checkbox">Animated Line Clear</label>
    <input type="checkbox" id="animated-line-clear-checkbox" checked>
</div>

<!-- ADD THIS DIV DIRECTLY AFTER IT: -->
<div class="checkbox-row">
    <label for="line-clear-text-checkbox">Line Clear Text</label>
    <input type="checkbox" id="line-clear-text-checkbox" checked>
</div>
```

**Step 4: Wire Up UI Element**

*   **File:** `src/main.ts`
*   **Action:** Add the new checkbox to the `uiElements` object.

```typescript
// src/main.ts

// In the uiElements object, add the new element:
const uiElements = {
    // ... other elements
    lineClearAnimationSelect: document.getElementById('line-clear-animation-select'),
    lineClearTextCheckbox: document.getElementById('line-clear-text-checkbox'), // ADD THIS LINE
    testSpawnSynthButton: document.getElementById('test-spawn-synth'),
    // ... other elements
};
```

**Step 5: Create the Animation Class**

*   **File:** `src/renderer/animations/LineClearTextAnimation.ts` (Create this new file)
*   **Action:** Add the following code to define the animation logic.

```typescript
// src/renderer/animations/LineClearTextAnimation.ts
import * as PIXI from 'pixi.js';
import { BLOCK_SIZE, BOARD_WIDTH, LINE_CLEAR_DELAY_TICKS } from '../../logic/constants';
import { Animation } from './types';

export class LineClearTextAnimation implements Animation {
    private text: PIXI.Text;
    private progress: number = 0;
    private isFinished: boolean = false;
    private readonly duration: number = LINE_CLEAR_DELAY_TICKS;

    constructor(container: PIXI.Container, textString: string, clearedRowIndices: number[]) {
        const style = new PIXI.TextStyle({
            fontFamily: 'Press Start 2P',
            fontSize: Math.max(20, BLOCK_SIZE * 0.8),
            fill: 0xFFFFFF,
            align: 'center',
            stroke: 0x000000,
            strokeThickness: 4,
        });

        this.text = new PIXI.Text(textString, style);
        this.text.anchor.set(0.5);

        const avgY = clearedRowIndices.reduce((sum, row) => sum + row, 0) / clearedRowIndices.length;
        this.text.x = BOARD_WIDTH / 2;
        this.text.y = avgY * BLOCK_SIZE + BLOCK_SIZE / 2;
        this.text.alpha = 0;

        container.addChild(this.text);
    }

    update(delta: number): void {
        if (this.isFinished) return;

        this.progress += delta;
        const progressRatio = this.progress / this.duration;

        if (progressRatio < 0.5) {
            // Fade in
            this.text.alpha = progressRatio * 2;
        } else if (progressRatio < 1.0) {
            // Fade out
            this.text.alpha = 1 - ((progressRatio - 0.5) * 2);
        } else {
            // Animation complete
            this.isFinished = true;
            this.text.destroy();
        }
    }

    get finished(): boolean {
        return this.isFinished;
    }
}
```

**Step 6: Implement Renderer Logic**

*   **File:** `src/renderer/pixiRenderer.ts`
*   **Action:** Import the new animation class, add the `_showLineClearText` method, and update the `lineClear` event handler in `_processEvents`.

```typescript
// src/renderer/pixiRenderer.ts

// ADD THIS IMPORT at the top of the file:
import { LineClearTextAnimation } from './animations/LineClearTextAnimation';

export class PixiRenderer {
    // ... existing properties and methods ...

    // ADD THIS METHOD to the class:
    private _showLineClearText(clearedLineCount: number, clearedRowIndices: number[]): void {
        if (!this.visualSettings.lineClearText) {
            return;
        }

        let textString: string;
        switch (clearedLineCount) {
            case 1: textString = "Single"; break;
            case 2: textString = "Double"; break;
            case 3: textString = "Triple"; break;
            case 4: textString = "Tetris!"; break;
            default: return;
        }

        const animation = new LineClearTextAnimation(this.boardContainer, textString, clearedRowIndices);
        this.animationManager.add(animation);
    }

    // In the _processEvents method, update the 'lineClear' case:
    private _processEvents(events: GameEvent[]): void {
        for (const event of events) {
            switch (event.type) {
                case 'lineClear':
                    // REPLACE THE EXISTING 'lineClear' case with this:
                    const { count, rows } = event.data;
                    if (count === 1) this.accessibilityManager.announce('Single line clear.');
                    else if (count === 2) this.accessibilityManager.announce('Double line clear.');
                    else if (count === 3) this.accessibilityManager.announce('Triple line clear.');
                    else if (count >= 4) this.accessibilityManager.announce('Tetris!');
                    
                    // Note: The line clear animation itself is handled elsewhere.
                    // This just triggers the text animation.
                    this._showLineClearText(count, rows);
                    break;
                // ... other cases
            }
        }
    }

    // ... rest of the class
}
```