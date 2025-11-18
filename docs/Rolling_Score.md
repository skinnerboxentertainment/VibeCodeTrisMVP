# 🎰 Rolling Score Display System — VibeCodeTris Implementation Plan

### **Purpose**

To replace the instantaneous score update with a **progressive, animated count-up** that visually “rolls” to the latest score. This enhances game feel by providing tactile, satisfying feedback for score accumulation, reminiscent of classic arcade and pinball machines.

---

## 🧩 Core Architecture within VibeCodeTris

The system will be integrated directly into our existing engine-renderer structure, requiring no new files.

| Component | File / Location | Implementation Detail |
| :--- | :--- | :--- |
| **True Score** | `src/logic/engine.ts` | The existing `this.score` property. It will continue to update instantly. **No changes needed here.** |
| **Display Score** | `src/renderer/pixiRenderer.ts` | A new private property, `_displayScore: number`, will be added to the `PixiRenderer` class. |
| **Roll Controller** | `src/renderer/pixiRenderer.ts` | The animation logic will be implemented inside the existing `update(deltaTime: number)` method. |
| **Render Layer** | `src/renderer/pixiRenderer.ts` | The existing `_scoreText` PIXI object will be modified to display the value of `_displayScore`. |
| **Event Bridge** | `src/renderer/pixiRenderer.ts` | The `_processEvents` method will continue to listen for `scoreUpdated` events to update the renderer's internal target score. |

---

## 🚀 Implementation Steps

1.  **Initialize State in `PixiRenderer`**
    *   In `src/renderer/pixiRenderer.ts`, add a new private property to the `PixiRenderer` class:
        ```typescript
        private _displayScore = 0;
        ```
    *   The existing property that stores the score from the engine event (e.g., `this._score`) will now serve as our `trueScore` target.

2.  **Update Event Handling**
    *   The `_processEvents` method's handler for the `'scoreUpdated'` event is already set up correctly. It updates the renderer's internal `_score` property, which we will use as the target for our animation. No changes are required here.

3.  **Implement the Rolling Logic in `update()`**
    *   In the `update(deltaTime: number)` method of `PixiRenderer`, add the following logic to smoothly animate `_displayScore` towards the `_score` target.

    ```typescript
    // Inside the update() method
    if (this._displayScore < this._score) {
      // Move the display score towards the true score
      const difference = this._score - this._displayScore;
      const increment = difference * 0.08; // Use a fraction for smooth easing

      // Ensure we increment by at least 1 to prevent getting stuck on small numbers
      this._displayScore += Math.max(increment, 1);

      // Clamp the score to prevent overshooting
      if (this._displayScore > this._score) {
        this._displayScore = this._score;
      }
    }
    ```

4.  **Update the Rendered Text**
    *   Locate the line in `PixiRenderer` where `_scoreText.text` is set.
    *   Change it to use the new `_displayScore`, ensuring it's formatted as an integer.

    ```typescript
    // Example of the updated rendering line
    this._scoreText.text = `${Math.floor(this._displayScore).toString().padStart(7, '0')}`;
    ```

---

## 🔢 Recommended Roll Logic: Eased Curve

An **eased curve** provides the most polished feel. The score rolls quickly when the difference is large and gracefully slows down as it approaches the target. The implementation uses a simple form of linear interpolation (lerp) which is highly effective.

**Why this method?**
*   **Smooth & Natural:** Avoids a "steppy" or robotic look.
*   **Responsive:** Handles new score events mid-roll seamlessly.
*   **Simple:** Achieves a high-quality result with minimal, performant code.

---

## 🎨 Future Enhancements (Optional)

Once the core rolling mechanic is implemented, we can explore these optional visual and audio enhancements for extra polish.

*   **Sound Feedback:** Play a subtle "tick" sound on each increment of the display score. The frequency of ticks could increase with the roll speed.
*   **Glow/Pulse on Completion:** Trigger a brief, bright glow animation on the score text when `_displayScore` reaches `_score`.
*   **Per-Digit Rolling:** For a more advanced visual, simulate each digit on a spinning wheel. This is a significant undertaking but offers a premium retro feel.

---

## 🎯 Expected Outcome

This implementation will produce a satisfying, kinetic feedback loop for score accumulation. It directly enhances the player's sense of achievement and aligns perfectly with the arcade aesthetic of the game.