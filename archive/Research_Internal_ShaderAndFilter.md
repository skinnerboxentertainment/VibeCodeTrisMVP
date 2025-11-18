# VibeCodeTris - Vetted Shader & Filter Research (Version 2.0)

## Introduction

This document is the refactored and vetted version of the original shader research. It outlines 20 novel shader/filter concepts for *VibeCodeTris*, aligned with our core design philosophy of inducing a “flow state” through synesthesia. All concepts have been analyzed against our established architecture and prioritized based on a realistic assessment of impact versus engineering effort.

## Core Concepts

*   **Game:** Modern interpretation of the classic block‐stacking puzzle genre.
*   **Aesthetic:** Clean, modern design with retro-digital influences.
*   **Philosophy:** Induce a “flow state” by linking sensory pathways. The `TetrisEngine` is the single source of truth; all visual effects must be driven by data passed in the `Snapshot`.
*   **Technology:** Built with PIXI.js. All proposed effects must be feasible as custom `PIXI.Filter` or `PIXI.Shader`.

## Existing Effects (for context)

To avoid redundancy, new ideas should differ from:

*   *Line Clear:* Screen-wide shockwave + chromatic aberration + bloom.
*   *Hard Drop:* Screen-shake + localized pixel jitter on impact.
*   *Flow State:* God rays + positive colour grading + focus vignette.
*   *Danger State:* Pulsing red vignette + screen static + edge-detection glow on block stack.
*   *Transitions:* Pixelation + digital glitch effects.

---

## Vetted Ideation Appendix: 20 Shader & Filter Concepts

### Category: Player State & Performance

| #  | Name                            | Effect                                                                                            | Trigger                      | Priority         | Prerequisites & Vetting Notes                                                                                             | Juice Explanation                                                        |
| -- | ------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 10 | **Multiplier-Based Saturation** | As multiplier increases, overall colour saturation intensifies; decays as multiplier goes down.   | `multiplierValue` numeric >1 | **Tier 1 (High)**  | **None.** The `multiplier` is already in the snapshot. This is a perfect, low-cost entry point into shader implementation. | Ties player performance directly to visual vibrancy—rewarding good play. |
| 12 | **“Messy Board” Desaturation**  | As number of holes in stack increases, game colours subtly desaturate + faint film grain applies. | `holeCountNormalized` (0..1) | **Tier 2 (Medium)** | **Engine Task:** Implement `holeCount` logic and pass it (normalized) in the snapshot. A clever, non-punishing feedback mechanism. | Gives subtle negative feedback for inefficient play without punishing.   |
| 11 | **Back-to-Back “Rainbow” Wave** | After back-to-back clear, a vibrant multi-coloured wave pulses up from cleared lines.             | Event: `onBackToBackClear`.  | **Deferred**     | **Engine Task:** Requires logic to detect back-to-back clears. Deferred due to the rarity of the event.                  | Visually distinguishes skilful clear sequences and adds spectacle.       |
| 9  | **“Perfection” Lens Flare**     | On perfect clear: stylised anamorphic lens flare across screen + chromatic burst.                 | Event: `onPerfectClear`.     | **Deferred**     | **Engine Task:** Requires "perfect clear" detection. Deferred due to low impact-to-effort ratio for a rare event.       | Delivers high-impact visual reward when player hits something rare.      |

### Category: Piece & Interaction Effects

| # | Name                              | Effect                                                                                     | Trigger                      | Priority         | Prerequisites & Vetting Notes                                                                                             | Juice Explanation                                                                 |
| - | --------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 6 | **“Lock-In” Energy Charge**       | As the lock delay timer runs down, the active piece accumulates shimmering energy field.   | `lockDelayProgress` from 0→1 | **Tier 1 (High)**  | **Engine Task:** Expose the existing `lockDelay` timer as a normalized `lockDelayProgress` (0-1) in the snapshot.         | Visually communicates impending lock and builds tension, supporting player focus. |
| 7 | **Ghost Piece “Hologram”**        | Ghost-piece rendered with flickering scanlines and holographic distortion.                 | Always when ghost is shown.  | **Tier 1 (High)**  | **None.** A purely renderer-side effect using `u_time`. Excellent aesthetic polish with no engine changes.                  | Improves clarity (distinguish ghost vs real) and adds aesthetic polish.           |
| 5 | **T-Spin “Vortex”**               | A brief swirling pixel vortex at the piece location when a T-Spin succeeds.                | Event: `onTSpin`.            | **Tier 2 (Medium)** | **Engine Task:** Implement T-Spin detection logic and fire an `onTSpin` event in the snapshot.                            | Rewards a skilled manoeuvre with a satisfying and distinct visual cue.            |
| 8 | **Velocity-Based Motion Streaks** | During a fast soft-drop, the piece leaves colored motion streaks proportional to velocity. | `velocityY > threshold`      | **Tier 2 (Medium)** | **Engine Task:** Expose the active piece's vertical velocity (`velocityY`) in the snapshot.                               | Makes fast movement *feel* fast and improves player feedback on speed.            |

### Category: Advanced & Novel Concepts

| #  | Name                              | Effect                                                                                                                              | Trigger                            | Priority         | Prerequisites & Vetting Notes                                                                                             | Juice Explanation                                                                             |
| -- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 17 | **“Pre-Lock” Warning Pulse**      | Just before a piece locks, the grid cells where it will land pulse faintly (visual warning).                                        | `lockDelayProgress ∈ [0.7,1.0]`    | **Tier 2 (Medium)** | **Engine Task:** Requires `lockDelayProgress` and a mask of the piece's target cells passed in the snapshot.              | Enhances readability, giving player subtle feedback about imminent lock and reducing errors.  |
| 18 | **“Stack Proximity” Field**       | As active piece nears the stack, it emits a downward-facing energy field that compresses and brightens.                             | `distanceToStack` (normalized)     | **Tier 2 (Medium)** | **Engine Task:** Requires engine to calculate `distanceToStack` and pass it (normalized) in the snapshot.                 | Reinforces spatial awareness of piece near stack and adds subtle depth to movement.           |
| 19 | **“DAS” Motion Echo**             | When Delayed Auto Shift (DAS) is active, a faint after-image trail of the moving piece appears and fades.                           | `isDasActive == true` & `dasTimer` | **Tier 2 (Medium)** | **Engine Task:** Expose `isDasActive` boolean in the snapshot. Renderer can handle the echo effect.                       | Improves feedback for auto-shift movement, making the mechanic feel richer and more polished. |
| 20 | **“Game Over” Scanline Shutdown** | On game over, the screen emulates a CRT monitor shutdown: bright horizontal line collapses into a central point and fades to black. | `isGameOver` event                 | **Deferred**     | **None.** A simple post-processing effect. Deferred as it's a low-priority stylistic flourish.                           | Provides a thematic, stylised finish to the game session—reinforcing retro/digital aesthetic. |

### Category: Audio-Reactive Effects (Blocked by Prerequisite Epic)

**Note:** All effects in this category are blocked by the **"Audio-Reactive Bridge"** prerequisite: a major engineering task to expose `AudioEngine` data (amplitude, beat, FFT) to the renderer. Once complete, these become the highest priority.

| # | Name                                | Effect                                                                                          | Trigger                                           | Priority             | Prerequisites & Vetting Notes                                                                                             | Juice Explanation                                                                                        |
| - | ----------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1 | **Audio-Reactive Grid Pulse**       | Grid lines of the playfield glow/pulse; intensity and speed vary with music amplitude/BPM.      | Continuous: `u_audioAmp` and optionally `u_beat`. | **Tier 3 (Audio Epic)** | **Blocked.** Requires `u_audioAmp` and `u_beat` from the audio engine. The core of the "living world" concept.          | Creates ambient but always-active visual feedback tied to music, enhancing the “living world” sensation. |
| 2 | **Frequency Spectrum Background**   | Background shows a real-time frequency spectrum: bass => slow waves, treble => sharp particles. | Continuous: `u_fftBands[]` (low/mid/high).        | **Tier 3 (Audio Epic)** | **Blocked.** Requires `u_fftBands` (FFT data), likely passed as a texture. The deepest implementation of synesthesia. | Strengthens synesthesia: you *see* the music structure behind the gameplay.                              |
| 3 | **Beat-Matched Piece Illumination** | Active piece flashes internal glow on the beat of the music.                                    | Event: `onBeat` pulse.                            | **Tier 3 (Audio Epic)** | **Blocked.** Requires an `onBeat` trigger from the audio engine.                                                          | Rhythmically reinforces player’s actions, aligning input with the music.                                 |
| 4 | **Sound-Driven Glitch Intensity**   | During danger state, glitch/static intensity scales with music amplitude.                       | Combined: `dangerState == true` & `u_audioAmp`.   | **Tier 3 (Audio Epic)** | **Blocked.** Requires `u_audioAmp` from the audio engine.                                                                 | Amplifies tension by linking audio chaos to visual chaos in danger state.                                |

### Category: Background & Ambiance Effects (Deferred)

**Note:** These ideas are deferred due to high potential GPU cost, risk of visual distraction, or lower impact-to-effort ratio. They will be reconsidered after higher-tier features are complete.

| #  | Name                              | Effect                                                                                                                | Trigger                                    | Priority   | Prerequisites & Vetting Notes                                                                                             | Juice Explanation                                                                                    |
| -- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 13 | **“Flow State” Geometric Tunnel** | When in high multiplier flow state, background transforms into receding tunnel of geometric patterns sync’d to music. | `multiplier ≥ threshold` && sustained time | **Deferred** | High GPU cost and significant risk of distracting from core gameplay. A simpler effect would be better.                   | Strengthens the sensation of “in the zone” by creating a sense of forward momentum.                  |
| 15 | **Input‐Rate “Heat Haze”**        | Background applies subtle heat-haze/distortion tied to player’s input rate; stronger distortion when input rate high. | `inputsPerSecond` (smoothed)               | **Deferred** | **Engine Task:** Requires calculating `inputsPerSecond`. Deferred as it could be visually distracting.                    | Rewards high-energy play with dynamic world responsiveness.                                          |
| 16 | **Board Density “Nebula”**        | Background shows procedural nebula that becomes brighter & more complex as board fills with blocks.                   | `boardDensity` (0..1)                      | **Deferred** | High GPU cost for a background element. Could be reconsidered with performance-saving techniques.                         | Visualises the board state in ambient form, reducing static backgrounds and reinforcing progression. |
| 14 | **Idle “Sleep Mode”**             | After inactivity, screen dims, gentle breathing glow across playfield, slight chromatic aberration at edges.          | `timeSinceLastInput > idleThreshold`       | **Deferred** | **Engine Task:** Requires tracking `timeSinceLastInput`. A low-priority "nice-to-have" feature.                           | Keeps the game world alive even in idle, gently prompting player return.                             |

---

## Implementation Summary & Sources

(The original implementation guidance, sources, and further reading sections are retained below for reference.)

... (rest of the original document) ...