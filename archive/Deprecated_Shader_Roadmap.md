# VibeCodeTris - Official Shader & Filter Roadmap

## 1. Guiding Philosophy & Architectural Constraints

This document synthesizes the concepts from the `VibeCodeTris_ShaderAndFilterResearch.md` into an actionable, prioritized roadmap. All concepts have been vetted against our established architecture.

**Our Core Paradigm:** The `TetrisEngine` is the single source of truth. All game state required for rendering must be calculated in the engine and passed to the `PixiRenderer` via the `Snapshot`. The renderer remains a "dumb" system that only reflects the state it is given. Therefore, for any shader to react to game state, that state must first be explicitly tracked and exposed by the engine.

## 2. Prerequisite Engineering Tasks

Before implementing most of the proposed effects, we must expand the engine's capabilities. These are foundational tasks.

### 2.1. Engine State Expansion

The `TetrisEngine` and `Snapshot` must be updated to track and expose the following values.

*   **T-Spin Detection:**
    *   **Task:** Implement logic within the `lockPiece` method to detect if the last action was a T-Spin.
    *   **Snapshot Change:** Add a new event type, `tSpin`, to the `events` array.
    *   **Blocks:** Idea #5 (T-Spin "Vortex").

*   **Board "Messiness" Metric:**
    *   **Task:** Create a function to calculate the number of "holes" (empty cells under filled cells) in the board state. This should be calculated efficiently, likely after a piece locks.
    *   **Snapshot Change:** Add a `holeCount: number` property to the snapshot.
    *   **Blocks:** Idea #12 ("Messy Board" Desaturation).

*   **Lock Delay Progress:**
    *   **Task:** The `lockDelay` timer already exists. We just need to expose it.
    *   **Snapshot Change:** Add a `lockDelayProgress: number` (a float from 0.0 to 1.0) to the `current` piece data in the snapshot.
    *   **Blocks:** Idea #6 ("Lock-In" Energy Charge), Idea #17 ("Pre-Lock" Warning Pulse).

### 2.2. The Audio-Reactive Bridge (Major Epic)

This is the largest prerequisite and unlocks the most unique potential of the game.

*   **Task:** The `AudioEngine` must be refactored to expose key metrics. This involves using the Web Audio API's `AnalyserNode` to extract data.
*   **Data to Expose:**
    1.  **Overall Amplitude (`float`):** The current volume/energy of the sound.
    2.  **Beat Detection (`boolean` pulse):** A trigger that fires on the beat of the music.
    3.  **Frequency Bands (`float[]`):** An array representing the intensity of bass, mids, and treble.
*   **Architectural Challenge:** We need an efficient, low-latency way to make this data available to the `PixiRenderer` on every frame for use in shader uniforms.
*   **Blocks:** All ideas in the "Audio-Reactive Effects" category (#1, #2, #3, #4).

## 3. Vetted & Prioritized Implementation Tiers

### Tier 1: Foundational Juice (High Impact, Low Engineering Cost)

These effects provide the most immediate value, relying on data we already have or can easily add to the snapshot.

| Priority | Name                            | Engine Task                                                              | Renderer Task                                                                                             | Justification                                                              |
| :------: | ------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
|    **1**     | **Multiplier-Based Saturation** | None. The `multiplier` is already in the snapshot.                       | Implement a simple post-processing filter (`PIXI.Filter`) that takes `u_multiplier` as a uniform and boosts color saturation. | A perfect, low-cost introduction to shaders that directly rewards the player's "flow state." |
|    **2**     | **"Lock-In" Energy Charge**     | Expose `lockDelayProgress` in the snapshot (see Prereq 2.1).             | Apply a fragment shader to the active piece that uses `u_lockProgress` to drive a shimmering noise or glow effect. | Provides critical, non-distracting gameplay feedback and builds tension. |
|    **3**     | **Ghost Piece "Hologram"**      | None.                                                                    | Apply a simple fragment shader to the ghost piece that adds flickering scanlines using `u_time`.          | A purely aesthetic polish that improves clarity and fits our theme.        |

### Tier 2: Advanced Gameplay Feedback

These effects require more specific engine logic but provide powerful, targeted feedback for skilled play.

| Priority | Name                  | Engine Task                                                              | Renderer Task                                                                                             | Justification                                                              |
| :------: | --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
|    **4**     | **T-Spin "Vortex"**   | Implement T-Spin detection (see Prereq 2.1).                             | On the `tSpin` event, trigger a localized "twirl" distortion filter (`PIXI.Filter`) at the piece's final position. | Provides a high-impact, satisfying visual reward for a complex and intentional maneuver. |
|    **5**     | **"Messy Board" Desaturation** | Implement hole counting (see Prereq 2.1).                                | Apply a global color-grading filter that uses `u_holeRatio` to subtly desaturate the scene and add faint film grain. | A clever, non-punishing way to provide negative feedback for inefficient play. |

### Tier 3: The Synesthetic Leap (Audio-Reactive)

This entire tier is blocked by the **Audio-Reactive Bridge** (Prereq 2.2). Once that is complete, these become the highest priority.

| Priority | Name                          | Engine/Audio Task                                                        | Renderer Task                                                                                             | Justification                                                              |
| :------: | ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
|    **6**     | **Audio-Reactive Grid Pulse** | Expose `u_audioAmp` and `u_beat` to the renderer.                        | A global filter that makes the background grid lines pulse with the music's amplitude and flash on the beat. | The core of the "living world" concept. Makes the game feel constantly connected to the soundscape. |
|    **7**     | **Frequency Spectrum Background** | Expose `u_fftBands` (FFT data) to the renderer, likely via a texture. | A dedicated background shader that visualizes the frequency data as waves and particles.                  | The deepest implementation of synesthesia—literally allowing the player to *see* the music. |

### Tier 4: Deferred & Under Review

These ideas are valid but are deferred due to high potential GPU cost, risk of visual distraction, or lower impact-to-effort ratio. They will be reconsidered after the higher tiers are complete.

*   **"Flow State" Geometric Tunnel (#13):** Deferred due to high GPU cost and a significant risk of distracting from the core gameplay. A simpler background effect (like #16) might be a better fit.
*   **Board Density "Nebula" (#16):** Deferred. While cool, it's a complex procedural texture that might be too computationally expensive, especially for a background element.
*   **"Perfection" Lens Flare (#9):** Deferred. A "perfect clear" is a rare event, making the development effort for this custom effect a low priority.
