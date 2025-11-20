# VibeCodeTris Audio Engine Evolution Roadmap

## Introduction

This document outlines a potential evolution path for the VibeCodeTris audio engine, drawing inspiration from the concepts presented in the "Procedural Adaptive Audio Engine Spec" (henceforth "the Spec"). The goal is to enhance the existing event-driven system by incorporating more continuous, stateful, and richly textured sonic elements.

Our current system is excellent at reacting to discrete game events (`pieceLock`, `lineClear`). The proposed evolution focuses on adding a layer of continuous audio that reflects the *state* of the game board and the player's performance, moving from a reactive to a truly adaptive model.

---

## Tier 1: Lowest-Hanging Fruit (Incremental Improvements)

These are features that can be implemented relatively quickly by extending the existing `AudioConfig` and `AudioEngine` capabilities.

### 1. Implement Probabilistic Sequencing

*   **Concept:** Borrow the "Melody Density" and "Octave Jumps" ideas from the Spec (Sec 3.2). Instead of an event *always* triggering a sound, we can introduce a probability field to our `EventRuleConfig`.
*   **VibeCodeTris Implementation:**
    1.  Add a `probability?: number` field to `EventRuleConfig` in `types.ts`.
    2.  In `RulesEngine`, before processing a rule, check for this field. If present, run a `Math.random()` check. If it fails, the rule is skipped for that event.
    3.  Add a `randomOctave?: number` field to `PitchSourceConfig`. If present, the engine could randomly add or subtract that many octaves from the calculated pitch.
*   **Benefit:** Creates more varied and less predictable melodic and rhythmic patterns without complex logic. A piece lock might not always trigger a melody note, making the moments it *does* more impactful.

### 2. Introduce Continuous "Atmosphere" and "Drone" Voices

*   **Concept:** Add background layers that are always present but modulate based on the game state, mimicking the "Drone" and "Atmosphere" voices from the Spec (Sec 2.2).
*   **VibeCodeTris Implementation:**
    1.  Define two new `Instrument` configurations in our `AudioConfig`: one for a low, evolving drone (e.g., two slightly detuned `FMSynth`s) and one for filtered noise (`NoiseSynth`).
    2.  In `AudioEngine`, create dedicated, persistent instances of these instruments.
    3.  In the `handleSnapshot` method (not tied to a specific event), add logic to continuously modulate parameters of these synths based on game state.
        *   **Drone Pitch/Detune:** Modulate based on the current `level`. Higher levels could increase the detuning for more tension.
        *   **Noise Filter Cutoff:** Map this directly to the `complexity` metric. As the board gets fuller, the noise gets brighter and more "hissy," like wind resistance increasing.
*   **Benefit:** Fills out the soundscape, making it feel more immersive and less silent between discrete events. Provides a constant, subconscious indicator of the game's tension level.

---

## Tier 2: Medium Effort (Architectural Enhancements)

These features require more significant changes to the `AudioEngine`'s architecture and the `AudioConfig` schema.

### 1. Develop a "Reactive Modulation Matrix"

*   **Concept:** Formalize the continuous modulation from Tier 1 into a proper "Patch Bay" or "Modulation Matrix" as described in the Spec (Sec 4). This is the most powerful concept to borrow.
*   **VibeCodeTris Implementation:**
    1.  **New Config Type:** In `types.ts`, define a new `ModulationRuleConfig` interface. It would look something like this:
        ```typescript
        interface ModulationRuleConfig {
          source: 'complexity' | 'level' | 'boardHeight' | 'lines'; // Game state variable
          target: {
            instrumentName: string;
            parameter: 'frequency' | 'volume' | 'filter.frequency'; // Synth parameter
          };
          amount: number; // How much to modulate
        }
        ```
    2.  **Add to `AudioConfig`:** Add a `modulations?: ModulationRuleConfig[]` array to the main `AudioConfig`.
    3.  **New Logic in `AudioEngine`:** In `handleSnapshot`, create a new loop that iterates over these modulation rules. For each rule, it reads the source value from the snapshot, calculates `newValue = baseValue + (sourceValue * amount)`, and applies it directly to the target instrument's parameter.
*   **Benefit:** Creates a powerful, declarative system for creating living, breathing soundscapes. Sound designers could easily experiment by just changing the JSON config: "What if the line count controlled the reverb mix? What if the height of column 3 controlled the arpeggiator speed?"

### 2. Implement a Generative Arpeggiator

*   **Concept:** Add an "Arpeggiator" voice that provides a constant rhythmic and melodic pulse, as in the Spec (Sec 2.2).
*   **VibeCodeTris Implementation:**
    1.  Add a new `Arpeggiator` instrument configuration.
    2.  In `AudioEngine`, use `Tone.js`'s powerful `Tone.Pattern` or `Tone.Sequence` to create a looping musical pattern.
    3.  Use the new Modulation Matrix to control its parameters:
        *   **Source `level` -> Target `pattern.interval`:** The arpeggiator gets faster as the level increases.
        *   **Source `boardHeight` -> Target `synth.filter.frequency`:** The arpeggiator gets brighter and more urgent as the player nears the top.
*   **Benefit:** Adds a crucial feeling of forward momentum and provides a harmonic bed for the other event-driven sounds to sit on top of.

---

## Tier 3: Maximum Effort (Fundamental Rewrites)

This represents a paradigm shift, requiring a significant rewrite and potentially new dependencies.

### 1. Full Modular Topology & Global FX Chain

*   **Concept:** Fully embrace the "Vangelis" modular topology and Global FX Chain from the Spec (Sec 2.2 & 2.3).
*   **VibeCodeTris Implementation:**
    1.  Instead of a single master output, rewrite the `AudioEngine`'s routing. Create dedicated busses for `Drone`, `Rhythm`, `Melody`, etc.
    2.  Give each bus its own effects chain (e.g., EQ, compression).
    3.  Route all busses into a final Global FX Chain, which would include a high-quality `Tone.Convolver` for reverb and a `Tone.Compressor` for mix cohesion ("glue").
    4.  The Modulation Matrix could now target not just synth parameters, but also bus-level effects (e.g., "increase the reverb send for the Melody bus at high levels").
*   **Benefit:** A professional-grade audio mix. This provides much deeper control over the sonic texture and dynamics, allowing for a polished, cinematic sound.

### 2. Natural Language Patching (AI Integration)

*   **Concept:** Implement the AI-driven "Natural Language Patching" from the Spec (Sec 5.1).
*   **VibeCodeTris Implementation:** This is a research project in itself.
    1.  Develop an external or integrated tool (perhaps using a modern LLM).
    2.  This tool would be trained on our `AudioConfig` schema.
    3.  A user would input a prompt like, "Make the piece lock sound brighter when the board is empty."
    4.  The AI would parse this, identify the `source` (board height), `target` (instrument's filter frequency), and `polarity` (inverse relationship), and then programmatically generate the correct `ModulationRuleConfig` JSON.
*   **Benefit:** Radically accelerates creative iteration. Allows designers and even players to intuitively shape the soundscape without needing to understand the underlying JSON structure, democratizing the sound design process.