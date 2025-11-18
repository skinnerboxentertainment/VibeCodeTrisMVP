# Feature Spec: Soundscape Selection

## 1. Overview

This document outlines a plan to refactor the game's audio system to support user-selectable "soundscapes." The goal is to move from a single, hardcoded set of game sounds to a dynamic system where players can choose from multiple audio profiles in the settings menu. This will significantly enhance player customization and create a richer, more varied auditory experience.

The initial implementation will include four distinct soundscapes:
*   **Default:** The original synth-based sound profile.
*   **Dream Celesta:** A sound profile using an ethereal, bell-like FM synth.
*   **Music Box:** A sound profile emulating a classic mechanical music box.
*   **Toy Piano:** A sound profile with a bright, percussive toy piano sound.

## 2. User Experience (UX)

The user interaction will be simple and intuitive:

1.  The user navigates to the **Settings** screen from the main menu.
2.  A new dropdown menu labeled **"Soundscape"** will be present alongside the existing visual settings.
3.  The user can select any of the available soundscapes from this menu.
4.  The change is applied **immediately**. The next piece that spawns and any subsequent movements will use the newly selected instrument set.
5.  The user's choice is **saved** and will persist across game sessions.

## 3. Core Implementation Strategy

The implementation is broken into three main phases: refactoring the audio engine, updating the UI and state management, and integrating the two systems.

### 3.1. Audio Engine Refactor: From Static to Dynamic

The core of this feature is a significant refactor of the `AudioEngine` to make it flexible.

*   **Centralize Instrument Definitions:** All synth presets (Default, Dream Celesta, Music Box, Toy Piano) will be defined as permanent, reusable instruments within the main `audioConfig` in `src/main.ts`. This eliminates the current practice of creating temporary synths for testing, improving performance and consistency.
*   **Create Soundscape Variants:** For each soundscape, we will define two distinct instrument variants:
    *   A **Spawn Synth:** For the initial piece spawn event.
    *   A **Movement Synth:** A separate, typically more percussive and shorter-duration version of the synth for movement, rotation, and drop sounds.
*   **Introduce a Dynamic Dispatcher:** The `RulesEngine` will no longer call hardcoded instrument IDs (e.g., `'pieceMovementSynth'`). Instead, it will hold a reference to the currently **active soundscape**. When a game event occurs, it will dynamically look up the correct instrument to play (e.g., `activeSoundscape.movementSynth`).
*   **Implement a "Setter" Method:** A new public method, `setSoundscape(name: string)`, will be added to the `AudioEngine`. This method will be the single entry point for the UI to switch the active soundscape within the engine.

### 3.2. UI and State Management

The frontend will be updated to provide the user control over the new audio system.

*   **Add Settings Dropdown:** A new `<select>` element will be added to the **Settings** screen in `index.html`.
*   **Extend State Manager:** The `UIStateManager` in `src/ui/state.ts` will be updated to manage and persist the `soundscape` setting, just as it currently does for visual settings like `colorPalette` and `blockStyle`. This will use `localStorage` to remember the user's choice.

### 3.3. System Integration

The bridge between the UI and the audio engine will be established in `src/main.ts`.

*   An event listener will be attached to the new "Soundscape" dropdown.
*   When the user changes the selection, the listener will call the `UIStateManager` to update and save the new setting.
*   The `UIStateManager` will, in turn, call the `audioEngine.setSoundscape()` method to inform the audio engine of the change in real-time.

## 4. Testing & Validation

To ensure the system is working correctly and to facilitate creative iteration, the **Soundboard** will be updated. The existing test buttons will be re-wired to trigger the new, permanent instrument definitions. This ensures that the sounds heard on the soundboard are a 1:1 match for what is heard during gameplay for any selected soundscape.

## 5. Outcome

The result will be a flexible, scalable audio system that allows users to deeply customize their gameplay experience. This refactor also lays the groundwork for easily adding new soundscapes in the future without requiring further architectural changes.