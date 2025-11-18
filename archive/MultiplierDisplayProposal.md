# Multiplier Display Proposal

## Current Situation
The game currently calculates per-piece drop scores (for both soft and hard drops) and displays them as floating text animations. However, these displayed scores reflect the *raw* points accumulated during the drop (e.g., 1 point per soft-dropped row, 2 points per hard-dropped row) and do not incorporate the active game multiplier. The multiplier is applied later when updating the player's total score, but this is not visually represented in the per-piece score animation.

## Desired Outcome
To enhance player feedback and provide a more impactful "rush," the per-piece score animations should display the score *after* the current game multiplier has been applied. This will show larger, "crazy numbers" directly reflecting the bonus earned.

## Proposed Solution

**File:** `src/logic/engine.ts`

**Method:** `private lockPiece(): void`

**Changes:**
1.  **Calculate Display Score:** Introduce a new local variable, `displayScore`, calculated by applying the current `this.multiplier` to `this.currentPieceScore` using `calculateDropPoints`.
2.  **Emit Multiplied Display Score:** The `pieceLockedWithScore` event's `data.score` property will carry this `displayScore` value.
3.  **Update Total Score (No Line Clear):** If no lines are cleared, add the `displayScore` directly to `this.score`.
4.  **Total Score (Line Clear):** The total score calculation in `finalizeLineClear` will continue to use `this.currentPieceScore` (raw value) and apply the multiplier there, ensuring no double-multiplication.

**Example (Conceptual Change in `lockPiece`):**

```typescript
// ... existing code ...

const cleared = this.findClearedLines();
const lockedPieceX = this.currentPiece.x;
const lockedPieceY = this.currentPiece.y;
const lockedPieceType = this.currentPiece.type;

// Calculate the score to be displayed (multiplied)
const displayScore = calculateDropPoints(this.currentPieceScore, this.multiplier);

if (cleared.length > 0) {
    // ... existing line clear animation logic ...
    if (displayScore > 0) {
        this.events.push({ 
            type: 'pieceLockedWithScore', 
            tick: this.tickCounter, 
            data: { 
                score: displayScore, // This will now be the multiplied score for display
                x: lockedPieceX, 
                y: lockedPieceY,
                type: lockedPieceType as PieceType,
            } 
        });
    }
    // ... rest of line clear logic ...
} else {
    // If no lines are cleared, add the already multiplied displayScore to total score
    this.score += displayScore; 
    
    if (displayScore > 0) {
        this.events.push({ 
            type: 'pieceLockedWithScore', 
            tick: this.tickCounter, 
            data: { 
                score: displayScore, // This will now be the multiplied score for display
                x: lockedPieceX, 
                y: lockedPieceY,
                type: lockedPieceType as PieceType,
            } 
        });
    }
    // ... rest of no line clear logic ...
}

// ... existing code ...
```

## Impact
*   **Enhanced Player Feedback:** The floating score numbers will directly show the effect of multipliers, providing a more satisfying visual reward.
*   **No Change to Total Score Logic:** The overall game score calculation will remain accurate, as the multiplier is already correctly applied to the final drop points before adding them to `this.score`. This change simply ensures the visual representation matches the numerical outcome.
*   **Minimal Code Changes:** The modification is localized to the `lockPiece` method and is relatively low risk.
