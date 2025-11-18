 
---

# Tetris Scoring & Multiplier System — Comprehensive Analysis

## 📘 Overview

This system rewards **tempo, precision, and intentional play** through an integrated **multiplier and drop scoring mechanic**.
It ties all score gains to *player agency* — rewarding manual actions (clears, drops) while punishing hesitation via multiplier decay.

---

## ⚙️ System Summary

### Base Scoring

* Each line clear yields a **base value** (default: 100 points per line).
* Multi-line clears scale proportionally:

  * Single = ×1
  * Double = ×2
  * Triple = ×3
  * Tetris = ×4
* The total is multiplied by the **current multiplier** `M`.

```
LineClearPoints = BaseLineValue * LinesCleared * M
```

---

### Drop Scoring

* **Soft Drop:** +1 point per row (manual slow descent).
* **Hard Drop:** +2 points per row (instant lock).
* Auto-gravity (passive fall) yields **no points**.

```
DropPoints = (SoftDropRows * 1 + HardDropRows * 2) * M
```

---

### Multiplier (M) Mechanics

* Each clear increases the multiplier by a fixed gain:

  * Single = +1
  * Double = +2
  * Triple = +3
  * Tetris = +5
* Each clear **resets the decay timer** (default: 3s).
* When no clear occurs before the timer expires:

  * `M` **decays** by 1 per second until it returns to ×1.
* Maximum multiplier (`Mmax`) recommended: ×10.

```
M increases per clear (up to cap)
M resets decay timer on clear
M decays gradually after inactivity
```

---

### Piece-Lock Scoring Flow

1. Compute drop points (based on manual descent).
2. Compute line clear points (if any).
3. Add both together, multiplied by current `M`.
4. Add to total score.
5. If lines were cleared, increase `M` and reset decay timer.

```
TotalPieceScore = (LineClearPoints + DropPoints)
TotalScore += TotalPieceScore
```

---

### UI & Feedback

* **Multiplier Display:** Visual bar or number with escalating color intensity.
* **Decay Warning:** Pulse or ticking sound as time runs out.
* **Score Popups:** Show breakdown of clear + drop points.
* **Combo Announcer:** “Chain 3!”, “On Fire!”, etc.

---

## ✅ Strengths

1. **Unified risk/reward loop:** Encourages speed and mastery.
2. **Single reward lever:** `M` ties all scoring systems together.
3. **Agency-driven:** Rewards only player actions, not passive events.
4. **Flexible tuning:** Many parameters easily adjusted.
5. **Emergent playstyles:** Supports aggressive vs strategic balance.

---

## ⚠️ Weaknesses & Exploits

| Issue                     | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| **Runaway scoring**       | Drop + clear both scaling with M can yield exponential spikes.          |
| **Hard-drop farming**     | High M + repetitive drops can inflate score without much risk.          |
| **Soft-drop spam**        | Continuous soft dropping may be abused if unbounded.                    |
| **Ambiguity: M timing**   | Whether M applies before or after increment changes payout drastically. |
| **Level-speed bias**      | Late levels reduce hard-drop distances → fewer drop points.             |
| **Leaderboard inflation** | Extreme multipliers can create unbalanced score ranges.                 |
| **Complexity**            | High cognitive load for casual players.                                 |
| **Edge cases**            | Wall kicks or spawn offsets might miscount drop distance.               |

---

## 🔄 Critical Tradeoffs

### Apply Multiplier Before or After Increment

* **After Increment (Recommended):**
  Clear uses current M; then M increases. Fair, predictable, less spiky.
* **Before Increment:**
  Current clear benefits from the new M — flashier but can double-pay.

### Drop Points Multiplied by M?

* **Yes:** Cohesive and rewarding, but risks runaway scores.
* **No:** Safer and clearer, but less synergy between mechanics.
* **Hybrid (Recommended):** Partial multiplier (e.g., 60% of M).

### Decay Style

* **Timer Reset:** Simple and arcade-like.
* **Gradual Decay:** Smooth and forgiving.
* **Hybrid (Recommended):** Short grace window + linear decay.

---

## 💥 Exploit Examples

### A. Tetris Chain

* Start M=1.
* 1st Tetris: 400 pts → M=6.
* 2nd Tetris: 2400 pts → M capped at 10.
* 3rd Tetris: 4000 pts.
  ➡ Rapid score escalation in 3 moves.

### B. Drop Farming

* Maintain M=8; hard-drop 6 rows = `6×2×8 = 96 pts/piece`.
* Even without clears, score accumulates heavily.

**Mitigation:** Cap per-piece drop points or reduce drop multiplier.

---

## ⚖️ Balancing Recommendations

| Parameter             | Suggested Default | Notes                   |
| --------------------- | ----------------- | ----------------------- |
| BaseLineValue         | 100               | Standard per line       |
| M Gains               | +1/+2/+3/+4       | Reduce Tetris spike     |
| M Cap                 | ×8                | Safer than ×10          |
| DecayDelay            | 3s                | Grace window            |
| DecayRate             | -1/s              | Gradual                 |
| Drop Multiplier Share | 0.6×M             | Prevent runaway scaling |
| Max Drop Points       | 150 pre-M         | Per-piece limit         |

---

## 🧪 Telemetry to Track

| Metric                       | Purpose                        |
| ---------------------------- | ------------------------------ |
| Average / max `M` per run    | Balance multiplier progression |
| % Score from drops vs clears | Detect imbalance               |
| Avg time between clears      | Pacing metric                  |
| Soft vs hard drop ratio      | Detect spam                    |
| Chain length distributions   | Skill curve                    |
| Decay triggers per game      | Engagement pacing              |
| Top 1% score patterns        | Identify exploit strategies    |

---

## 🧱 Implementation Pitfalls

* **Hard-drop distance:** Measure from *input* to *lock*, exclude gravity.
* **Soft-drop tracking:** Only count active key-hold movement.
* **Frame independence:** Use row deltas, not frame counts.
* **Authoritative scoring:** Server-side in multiplayer.
* **Consistent rounding:** Keep scores integer-based.
* **Deterministic logging:** Record top runs for analysis.

---

## 🎨 Player Experience

* Clear UI and popups showing multiplier, breakdown, and timer.
* Tutorial emphasizing player-driven scoring.
* Visual + auditory escalation with higher M levels.
* Accessibility: use text + audio, not color alone.

---

## 🧩 Alternative Experiments

1. **Drop points not multiplied.**
2. **Fractional drop multiplier (0.5–0.75×).**
3. **Diminishing M gains at higher tiers.**
4. **Separate combo meter (additive bonus instead of multiplier).**
5. **Risk tax:** High M slightly increases drop speed or visual intensity.

---

## 🚀 Action Plan (For Implementation & Testing)

1. **Finalize order-of-operations** → *Apply M after scoring current clear*.
2. **Set conservative defaults** (Mmax=8, gains +1/+2/+3/+4, 60% drop multiplier).
3. **Instrument telemetry** (metrics above).
4. **Run early playtests** → 50–200 rounds, collect data.
5. **Adjust drop multiplier or add per-piece cap** if farming detected.
6. **Refine UI for clarity & feedback.**
7. **Decide leaderboard normalization rules** after tuning results.

---

## 🧭 Final Recommendation

Maintain the **unified multiplier system** — it’s elegant and skill-driven.
However:

* **Throttle drop point impact** (partial or capped multiplier).
* **Increment multiplier after scoring** to prevent double-payout.
* **Base balancing on telemetry**, not intuition — it’s highly nonlinear.

This design can scale from classic Tetris pacing to modern score-attack intensity, depending on how aggressively the multiplier is tuned.

---

 