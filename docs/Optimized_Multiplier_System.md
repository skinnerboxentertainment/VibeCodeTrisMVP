# Optimized Scoring & Multiplier System

## 1. Vision & Core Mechanic

This system is designed to reward high-tempo, skilled play. It introduces a single, unified **Score Multiplier (`M`)** that amplifies points from all player-driven actions (line clears and drops), creating a compelling risk/reward loop. Hesitation is penalized through multiplier decay, while continuous action is rewarded with exponential scoring potential.

---

## 2. Scoring Formulas

Scoring is calculated upon a piece locking into place. The multiplier `M` is applied to the score *before* being updated for the current clear.

### Formula A: Line Clear Score
Points awarded for clearing lines.

```
LineClearScore = BaseLineValue * LinesCleared * M
```

### Formula B: Drop Score
Points awarded for manually dropping pieces. Auto-fall grants no points.

```
DropScore = (SoftDropRows * 1 + HardDropRows * 2) * DropMultiplierShare * M
```
*Note: `DropScore` is capped by `MaxDropPoints` to prevent farming.*

### Formula C: Total Score Update
The final score added to the player's total.

```
TotalScore += LineClearScore + DropScore
```

---

## 3. Multiplier (`M`) Lifecycle

The multiplier `M` follows a simple "gain, refresh, or decay" lifecycle.

### Gain
- Immediately after a score is calculated, if lines were cleared, the multiplier increases.
- **Rule:** `M = min(M + LinesCleared, M_max)`
- A **Tetris** provides a bonus gain.
- **Rule (Tetris):** `M = min(M + TetrisGainBonus, M_max)`

### Refresh
- Any line clear resets the decay timer.
- **Rule:** On line clear, `DecayTimer = DecayDelay`

### Decay
- If the `DecayTimer` reaches zero, the multiplier decays over time until it returns to its base value of `1`.
- **Rule:** If `DecayTimer <= 0`, then `M = max(M - DecayRate, 1)` per second.

---

## 4. Tunable Parameters

This table contains all variables for balancing the system.

| Parameter             | Recommended Default | Description                                                 |
| --------------------- | ------------------- | ----------------------------------------------------------- |
| `BaseLineValue`         | 100                 | Base points awarded per line cleared.                       |
| `M_max`                 | 8                   | The maximum value the multiplier can reach.                 |
| `TetrisGainBonus`       | 5                   | The multiplier gain from a 4-line clear (Tetris).           |
| `DecayDelay`            | 3s                  | Grace period (in seconds) before the multiplier starts decaying. |
| `DecayRate`             | 1                   | Amount the multiplier decreases by per second during decay.   |
| `DropMultiplierShare` | 0.6                 | The fraction of `M` applied to drop scores (e.g., 60%).     |
| `MaxDropPoints`       | 150                 | The maximum score a single piece can earn from drops, pre-multiplier. |

---

## 5. Risk Analysis & Mitigation

| Risk                      | Mitigation Strategy                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Runaway Scoring**       | The `M_max` cap provides a hard ceiling. The `DropMultiplierShare` throttles one of the two scoring sources.       |
| **Hard-Drop Farming**     | The `MaxDropPoints` cap prevents players from accumulating excessive points by repeatedly dropping pieces from the top without clearing lines. |
| **Ambiguous Payouts**     | The order of operations is strictly defined: score is calculated with the *current* `M`, which is *then* incremented for the next piece. |
| **Level Speed Bias**      | This is an inherent challenge in Tetris. The system accepts that drop points are less valuable at higher speeds, shifting focus to clear efficiency. |
| **Cognitive Overload**    | The UI will provide clear, ambient feedback (e.g., a pulsing bar for the decay timer) rather than requiring players to track numbers. |

---

## 6. Implementation & UI Guide

### State Tracking
- **Engine (`GameState`):**
  - `multiplier: number`
  - `multiplierDecayTimer: number` (in game ticks)
- **Piece Logic:**
  - Must track `softDropRows` and `hardDropRows` for the current piece, resetting after each lock.

### Critical Logic
- **Tick-Based Timers:** All timers (`DecayDelay`) must be implemented using game ticks, not wall-clock time, to ensure deterministic behavior for replays.
- **Drop Calculation:** Only count rows dropped as a direct result of player input, ignoring passive gravity.

### UI/UX Feedback
- **Multiplier Display:** Show `M` prominently (e.g., "x8"). The element should change color or intensity as `M` increases.
- **Decay Timer:** Represent this with a visual bar or a subtle pulsing animation on the multiplier text that intensifies as the timer nears zero.
- **Score Popups:** On piece lock, briefly show the breakdown of points gained (e.g., "+400 (clear) +36 (drop)").
