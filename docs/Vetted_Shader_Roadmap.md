# Vetted Shader & Filter Roadmap for VibeCodeTris

## 1. Overview

This document provides a prioritized, actionable roadmap for implementing advanced shader and filter effects in VibeCodeTris. It is the result of vetting the concepts proposed in `CompareChatGPTFilterandShader.md` against the specific architecture of our codebase.

The core finding is that foundational engineering work is required in both the renderer and the game engine before most of the desired effects can be implemented. This roadmap prioritizes that foundational work first.

---

## 2. Tier 0: Foundational Prerequisites

These are **blocking tasks**. The effects in subsequent tiers cannot be implemented until these prerequisites are complete.

| Priority | System   | Task                                                                                                                            | Justification                                                                                                                                                           | File(s) to Modify                               |
| :------: | -------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
|  **1**   | **Renderer** | **Implement a Post-Processing Pipeline**                                                                                        | The renderer currently uses direct `PIXI.Graphics` drawing. It has no system for applying global `PIXI.Filter` effects. This is the foundational step for nearly all shaders. | `src/renderer/pixiRenderer.ts`                  |
|  **2**   | **Engine**   | **Implement Lock-Delay Mechanic**                                                                                               | A piece lock-delay timer is required for the "Lock-In Energy Charge" effect. The timer's progress (0.0 to 1.0) must be exposed in the game snapshot.                      | `src/logic/engine.ts`                           |
|  **3**   | **Engine**   | **Implement Hole Counting**                                                                                                     | The "Messy Board" effect requires knowing the number of holes in the playfield. This metric must be calculated and exposed in the snapshot.                               | `src/logic/engine.ts`                           |
|  **4**   | **Audio**    | **Expose Beat Pulse**                                                                                                           | True audio analysis is infeasible. However, the `AudioEngine` knows the BPM. It should expose a simple `onBeat` boolean pulse or event that the renderer can use.         | `src/audio/AudioEngine.ts`                      |

---

## 3. Tier 1: Foundational Juice (High Impact, Low Dependency)

These effects can be implemented **immediately after Tier 0 is complete**, as they rely on data that is already available in the snapshot or is purely aesthetic.

| Priority | Name                            | Vetting Notes                                                                                                                            | Required Uniforms         |
| :------: | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
|  **1**   | **Multiplier-Based Saturation** | **Feasible.** This is a perfect first effect. The `multiplier` is reliably tracked in the snapshot. A simple global filter can control saturation. | `u_multiplier`            |
|  **2**   | **Ghost Piece "Hologram"**      | **Feasible.** This is a purely aesthetic effect applied to the ghost piece. It requires no special game state data, only time.              | `u_time`                  |
|  **3**   | **Velocity-Based Motion Streaks** | **Feasible.** The piece's vertical velocity can be calculated by the renderer based on the change in `snapshot.current.y` between frames. | `u_velocity`              |

---

## 4. Tier 2: Advanced Gameplay Feedback

These effects are dependent on the new engine logic developed in **Tier 0**.

| Priority | Name                              | Vetting Notes                                                                                                                            | Required Uniforms         |
| :------: | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
|  **4**   | **"Lock-In" Energy Charge**       | **Blocked by Prerequisite #3.** Once the lock-delay timer is implemented, this is a high-priority effect for providing gameplay feedback. | `u_lockProgress`          |
|  **5**   | **"Messy Board" Desaturation**    | **Blocked by Prerequisite #3.** Once hole counting is implemented, this provides subtle, non-punishing negative feedback.                 | `u_holeRatio`             |
|  **6**   | **Beat-Matched Piece Illumination** | **Blocked by Prerequisite #4.** This is a great rhythm-based effect. It is a simplified version of the original audio-reactive idea.    | `u_beat` (boolean pulse)  |

---

## 5. Tier 3: Deferred & Requires R&D

These ideas are deferred. The "Audio-Reactive" effects are infeasible without a significant re-architecture of the `AudioEngine`. The others are deferred due to high GPU cost or risk of visual distraction.

| Name                              | Reason for Deferral                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Audio-Reactive Grid Pulse**     | **Requires R&D.** `AudioEngine.ts` is a synthesizer and cannot provide amplitude data. A major engineering effort to add an `AnalyserNode` is required.                                                      |
| **Frequency Spectrum Background** | **Requires R&D.** Same as above. `AudioEngine.ts` cannot provide FFT data.                                                                                                                                   |
| **Sound-Driven Glitch Intensity** | **Requires R&D.** Same as above.                                                                                                                                                                             |
| **"Flow State" Geometric Tunnel** | **High Cost / Distraction Risk.** A full-screen procedural tunnel is computationally expensive and poses a significant risk of distracting from core gameplay. Re-evaluate after core effects are implemented. |
| **Board Density "Nebula"**        | **High Cost.** A procedural nebula is computationally expensive, especially for a background element that could be replaced with a simpler effect.                                                           |
| **"Perfection" Lens Flare**       | **Low Priority.** A "perfect clear" is a rare event, making the development effort for a custom effect a low priority compared to effects that trigger more frequently.                                       |
