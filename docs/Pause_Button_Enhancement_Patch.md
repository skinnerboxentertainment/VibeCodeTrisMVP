# Patch: In-Game Pause Button Enhancement

**CRITICAL INSTRUCTION: APPLY EACH OF THE FOLLOWING CHANGES INCREMENTALLY. DO NOT ATTEMPT TO APPLY THE ENTIRE PATCH AT ONCE. EACH STEP IS ATOMIC AND SHOULD BE APPLIED AND VERIFIED SEPARATELY.**

This patch details the implementation of **Revised Proposal 2** from the [`In-Game Pause Button Enhancement Plan`](./Pause_Button_Enhancement_Plan.md).

---

### **Objective**

Enhance the in-game pause button in `src/renderer/pixiRenderer.ts` by implementing a stylized border with a hard drop shadow and hover feedback.

---

### **Step 1: Add New Class Properties**

**File:** `src/renderer/pixiRenderer.ts`

**Action:** Add new private properties to the `PixiRenderer` class to manage the button's container, border, shadow, and alpha states.

```typescript
// --- FIND THIS ---
private _lastMultiplierEffectType: 'default' | 'scanline' | 'none' = 'default';

// --- REPLACE WITH THIS ---
private _lastMultiplierEffectType: 'default' | 'scanline' | 'none' = 'default';
private _pauseButtonContainer: PIXI.Container;
private _pauseButtonBorder: PIXI.Graphics;
private _pauseButtonBorderShadow: PIXI.Graphics;
private _pauseButtonDefaultBorderAlpha: number = 0.7; // Default opacity for the border
private _pauseButtonHoverBorderAlpha: number = 1.0;   // Opacity on hover
```

---

### **Step 2: Instantiate New PIXI Objects in Constructor**

**File:** `src/renderer/pixiRenderer.ts`

**Action:** Instantiate the new `PIXI.Container` and `PIXI.Graphics` objects in the class constructor.

```typescript
// --- FIND THIS ---
this.animationManager = new AnimationManager();
this.uiTextContainer = new PIXI.Container();

// --- REPLACE WITH THIS ---
this.animationManager = new AnimationManager();
this.uiTextContainer = new PIXI.Container();
this._pauseButtonContainer = new PIXI.Container();
this._pauseButtonBorder = new PIXI.Graphics();
this._pauseButtonBorderShadow = new PIXI.Graphics();
```

---

### **Step 3: Implement New `initText()` Logic**

**File:** `src/renderer/pixiRenderer.ts`

**Action:** Overhaul the `initText()` method to build the new button structure with its border, shadow, and event listeners for hover feedback.

```typescript
// --- FIND THIS ---
private initText() {
        this.uiTextContainer.addChild(
            this.scoreText, this.levelText, this.linesText, 
            this.scoreLabel, this.levelLabel, this.linesLabel, 
            this.multiplierText, this.pauseButton
        );

        this.levelText.anchor.set(0, 0);
        this.scoreText.anchor.set(0.5, 0);
        this.linesText.anchor.set(1, 0);
        this.levelLabel.anchor.set(0, 0);
        this.scoreLabel.anchor.set(0.5, 0);
        this.linesLabel.anchor.set(1, 0);

        this.multiplierText.anchor.set(0.5, 0);
        this.pauseButton.anchor.set(1, 0);

        this.pauseButton.alpha = 0.25;
        this.pauseButton.eventMode = 'static';
        this.pauseButton.on('pointerdown', this.onPauseButtonClick, this);
}

// --- REPLACE WITH THIS ---
private initText() {
    this.uiTextContainer.addChild(
        this.scoreText, this.levelText, this.linesText,
        this.scoreLabel, this.levelLabel, this.linesLabel,
        this.multiplierText, this._pauseButtonContainer // Add the container
    );

    // Add elements to the new container
    this._pauseButtonContainer.addChild(this._pauseButtonBorderShadow, this._pauseButtonBorder, this.pauseButton);

    this.levelText.anchor.set(0, 0);
    this.scoreText.anchor.set(0.5, 0);
    this.linesText.anchor.set(1, 0);
    this.levelLabel.anchor.set(0, 0);
    this.scoreLabel.anchor.set(0.5, 0);
    this.linesLabel.anchor.set(1, 0);
    this.multiplierText.anchor.set(0.5, 0);
    this.pauseButton.anchor.set(1, 0);

    // Initial drawing of border/shadow. Final dimensions are set in resize().
    const textWidth = this.pauseButton.width;
    const textHeight = this.pauseButton.height;
    const padding = 5;
    const shadowOffset = 3;

    // Draw shadow
    this._pauseButtonBorderShadow.roundRect(-textWidth - padding + shadowOffset, -padding + shadowOffset, textWidth + padding * 2, textHeight + padding * 2, 5).fill(0x000000);
    
    // Draw main border
    this._pauseButtonBorder.roundRect(-textWidth - padding, -padding, textWidth + padding * 2, textHeight + padding * 2, 5).stroke({ width: 2, color: 0xFFFFFF, alpha: this._pauseButtonDefaultBorderAlpha });
    this._pauseButtonBorder.alpha = this._pauseButtonDefaultBorderAlpha;

    // Configure container for interaction
    this._pauseButtonContainer.eventMode = 'static';
    this._pauseButtonContainer.cursor = 'pointer';

    // Event listeners for hover feedback
    this._pauseButtonContainer.on('pointerover', () => { this._pauseButtonBorder.alpha = this._pauseButtonHoverBorderAlpha; }, this);
    this._pauseButtonContainer.on('pointerout', () => { this._pauseButtonBorder.alpha = this._pauseButtonDefaultBorderAlpha; }, this);
    this._pauseButtonContainer.on('pointerdown', this.onPauseButtonClick, this);
}
```

---

### **Step 4: Clean Up `update()` Method**

**File:** `src/renderer/pixiRenderer.ts`

**Action:** Remove the now-redundant hover logic from the `update()` method, as it is handled by the new event listeners.

```typescript
// --- FIND THIS ---
private update(deltaTime: number) {
    if (!this.lastSnapshot) return;

    const targetScore = this.lastSnapshot.score;
    if (this._displayScore < targetScore) {
        const difference = targetScore - this._displayScore;
        const increment = difference * 0.08;

        this._displayScore += Math.max(increment, 1);

        if (this._displayScore > targetScore) {
            this._displayScore = targetScore;
        }
    }

    this.scoreText.text = `${Math.floor(this._displayScore).toString().padStart(7, '0')}`;
}

// --- REPLACE WITH THIS ---
private update(deltaTime: number) {
    if (!this.lastSnapshot) return;

    const targetScore = this.lastSnapshot.score;
    if (this._displayScore < targetScore) {
        const difference = targetScore - this._displayScore;
        const increment = difference * 0.08;

        this._displayScore += Math.max(increment, 1);

        if (this._displayScore > targetScore) {
            this._displayScore = targetScore;
        }
    }

    this.scoreText.text = `${Math.floor(this._displayScore).toString().padStart(7, '0')}`;
}
```
*Note: If the `update` method contains other logic (like the animation timer from previous attempts), ensure it is removed, leaving only the score update logic.*

---

### **Step 5: Update `resize()` Method**

**File:** `src/renderer/pixiRenderer.ts`

**Action:** Update the `resize()` method to correctly position the new pause button container and redraw the border and shadow to ensure they scale correctly with the text.

```typescript
// --- FIND THIS ---
// Position PAUSE button
this.pauseButton.x = BOARD_WIDTH - TEXT_HORIZONTAL_OFFSET;
this.pauseButton.y = this.multiplierText.y + 22;

// --- REPLACE WITH THIS ---
// Position PAUSE button container
this._pauseButtonContainer.x = BOARD_WIDTH - TEXT_HORIZONTAL_OFFSET;
this._pauseButtonContainer.y = this.multiplierText.y + 22;

// Redraw the border and shadow with updated dimensions
const textWidth = this.pauseButton.width;
const textHeight = this.pauseButton.height;
const padding = 5;
const shadowOffset = 3;

// Redraw shadow
this._pauseButtonBorderShadow.clear();
this._pauseButtonBorderShadow.roundRect(-textWidth - padding + shadowOffset, -padding + shadowOffset, textWidth + padding * 2, textHeight + padding * 2, 5).fill(0x000000);

// Redraw main border, preserving its current alpha state
this._pauseButtonBorder.clear();
this._pauseButtonBorder.roundRect(-textWidth - padding, -padding, textWidth + padding * 2, textHeight + padding * 2, 5).stroke({ width: 2, color: 0xFFFFFF });
```
