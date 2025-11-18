# Multiplier Feature: Player Experience & UI Vision

This document outlines the intended user experience for the score multiplier feature, ensuring a clear and cohesive vision before implementation.

## 1. The Core Idea: "Keep the Flow"

From the player's perspective, the multiplier is a direct reward for staying "in the zone." The core message is simple: **clear lines continuously to keep your multiplier high and score big.** If you slow down or get stuck, your multiplier will fade, acting as a gentle nudge to regain momentum. This creates a thrilling loop of chasing high scores by maintaining a smooth, aggressive pace.

## 2. Visual Implementation: Centered and Clear

To ensure the player is always aware of this critical game state, the multiplier will be displayed directly **beneath the main score**, reinforcing the link between the two.

### The Multiplier Display:
- **Format:** It will be a simple, bold text element (e.g., "**x4**").
- **Location:** Centered on the screen, directly under the score value.
- **Animation:**
    - **On Increase:** When the multiplier goes up, the text will briefly scale up in size and flash brightly before settling back to its normal state. This provides immediate, positive feedback for the line clear.
    - **Color:** The text color will shift as the multiplier climbs, moving from a cool color (like white or light blue at x1) to progressively hotter colors (yellow, then orange, then a fiery red at the max multiplier). This gives the player an at-a-glance sense of how "hot" their scoring potential is.

### The Decay Warning:
- **Cue:** When the decay timer is about to expire (e.g., in the last second), the multiplier text will begin to **pulse subtly and rhythmically**.
- **Sound (Optional but Recommended):** This visual pulse could be paired with a soft, "ticking" or "heartbeat" sound effect that fades in, adding an auditory layer of urgency without being distracting.

## 3. A Gameplay Scenario: The First 30 Seconds

Here’s how a typical gameplay moment would look and feel to the player:

1.  **Start of the Game:** The player starts. The UI at the top-center of the screen reads:
    ```
    0
    x1
    ```
    The "x1" is a calm, white color.

2.  **First Clear (Double):** The player clears two lines.
    - A score popup appears near the cleared lines: `+200`.
    - The main score updates to `200`.
    - The multiplier text "**x1**" instantly flashes and grows, then settles as "**x3**" in a new, slightly warmer yellow color. The decay timer is full.

3.  **Second Clear (Single):** The player quickly follows up with a single line clear.
    - A score popup appears: `+300` (100 points * multiplier of 3).
    - The main score updates to `500`.
    - The multiplier text "**x3**" flashes and grows, settling as "**x4**" in a brighter yellow. The decay timer is reset again.

4.  **Hesitation:** The player now struggles to find a place for a difficult piece. Three seconds pass.
    - The "**x4**" text begins to pulse gently. A soft ticking sound might begin. This is the decay warning.

5.  **Decay:** The player fails to clear a line in time.
    - The pulsing stops. The "**x4**" text smoothly animates down to "**x3**", and its color cools slightly. A second later, it animates down to "**x2**".

6.  **Hard Drop & Recovery:** The player sees an opportunity and hard drops a piece 10 rows to clear a Tetris.
    - A score popup appears with a breakdown: `+800 (Tetris!) +24 (Drop)`. The drop score was calculated using the "x2" multiplier.
    - The main score updates to `1324`.
    - The multiplier text "**x2**" flashes brilliantly, growing larger than before, and settles as "**x7**" in a vibrant orange color. The player is back in the flow.

This approach ensures the multiplier is not just a number, but a core part of the game's feedback loop, encouraging the exact kind of exciting, high-tempo play we're aiming for.
