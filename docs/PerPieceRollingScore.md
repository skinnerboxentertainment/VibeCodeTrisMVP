# 🎰 Rolling Score for Per-Piece Display System — VibeCodeTris Implementation Plan

### **Purpose**

To enhance the visual feedback of individual piece scores by implementing a **progressive, animated count-up** that visually “rolls” to the latest score. This adds a layer of tactile satisfaction and reinforces the immediate points gained from drops and locks, similar to the main rolling score system.

---

## 🧩 Core Architecture within VibeCodeTris

This feature will be integrated directly into the `PieceScoreAnimation` class, leveraging its existing animation lifecycle.

| Component | File / Location | Implementation Detail |
| :--- | :--- | :--- |
| **Target Score** | `src/renderer/animations/PieceScoreAnimation.ts` | The existing `score` property passed to the constructor will serve as the animation's target score. |
| **Display Score** | `src/renderer/animations/PieceScoreAnimation.ts` | A new private property, `_displayScore: number`, will be added to the `PieceScoreAnimation` class, initialized to 0. |
| **Roll Controller** | `src/renderer/animations/PieceScoreAnimation.ts` | The animation logic will be implemented inside the existing `update(deltaTime: number)` method of `PieceScoreAnimation`. |
| **Render Layer** | `src/renderer/animations/PieceScoreAnimation.ts` | The existing `_scoreText` PIXI object within the animation will be modified to display the value of `_displayScore`. |

---

## 🚀 Implementation Steps

1.  **Initialize State in `PieceScoreAnimation`**
    *   In `src/renderer/animations/PieceScoreAnimation.ts`, add a new private property to the `PieceScoreAnimation` class:
        ```typescript
        private _displayScore = 0;
        ```
    *   Initialize `this._displayScore` with the actual score at the start of the animation, or `0` if you want it to roll up from zero. For ease of initial implementation, we will start it at 0.

2.  **Modify the Constructor**
    *   Update the constructor to store the incoming `score` as a `_targetScore` property.
        ```typescript
        // Example, assuming existing score parameter
        constructor(..., private _targetScore: number, ...) {
            // ... existing code ...
            this._displayScore = 0; // Starts rolling from 0
        }
        ```

3.  **Implement the Rolling Logic in `update()`**
    *   In the `update(deltaTime: number)` method of `PieceScoreAnimation`, add the following logic to smoothly animate `_displayScore` towards the `_targetScore`.

    ```typescript
    // Inside the update() method of PieceScoreAnimation
    if (this._displayScore < this._targetScore) {
      const difference = this._targetScore - this._displayScore;
      // Adjust the `0.1` factor as needed for desired roll speed
      // Increment by at least `1` to prevent getting stuck on small differences
      const increment = Math.max(difference * 0.1, 1);
      
      this._displayScore += increment;

      // Ensure it doesn't overshoot the target
      if (this._displayScore > this._targetScore) {
        this._displayScore = this._targetScore;
      }
    }
    ```

4.  **Update the Rendered Text**
    *   Locate the line in `PieceScoreAnimation` where the score text is set (likely `this._scoreText.text`).
    *   Change it to use the new `_displayScore`, ensuring it's formatted as an integer.

    ```typescript
    // Example of the updated rendering line
    this._scoreText.text = `+${Math.floor(this._displayScore)}`;
    ```

---

## 🔢 Recommended Roll Logic: Eased Curve

Similar to the main score, an **eased curve** (achieved through fractional incrementation) will provide the most polished and satisfying feel for the per-piece score pop-ups. It rolls quickly at first and slows down as it reaches the exact score.

---

## 🎯 Expected Outcome

Each individual score pop-up will now animate from `+0` up to its actual value (e.g., `+20`, `+40`), providing a more dynamic and rewarding visual experience. This aligns with the arcade aesthetic and enhances the immediate feedback for player actions.
