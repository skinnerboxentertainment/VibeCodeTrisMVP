# VibeCodeTris Juice Specification

This document outlines a comprehensive roadmap for enhancing the "juice" and overall player feedback in VibeCodeTris. The ideas are prioritized into tiers, starting with foundational, PIXI-first implementations and progressing towards more advanced, choreographed effects that may leverage GSAP.

---

### **Tier 1: The "Living Well" System (Highest Priority / PIXI-First)**

This tier focuses on implementing the foundational **Background Well Display**, which will serve as a canvas for numerous future effects.

1.  **Core System: Background Well Display**
    *   **What:** Create a 10x20 grid of sprites that sits behind the active gameplay pieces. This grid acts as a low-resolution, programmable display.
    *   **Why:** This is the cornerstone of our new juice strategy. It's a single system that unlocks a huge range of dynamic, procedural, and audio-reactive visual possibilities. It's technically straightforward and aligns perfectly with the project's aesthetic.

2.  **Feature: Ghosted Multiplier Display**
    *   **What:** Use the Background Well Display to render the current multiplier (e.g., "x4") in large, blocky numbers in the center of the well.
    *   **Why:** This is the first, most obvious use case for the system. It's a high-impact visual that immediately communicates game state in a diegetic, stylish way. We can add simple fade-in/fade-out animations for transitions.

3.  **Feature: Line Clear "Ripple"**
    *   **What:** When a line is cleared, a subtle pulse of light ripples across the background grid, originating from the cleared row.
    *   **Why:** Reinforces the line clear event with a satisfying, non-intrusive visual that makes the well feel reactive to player success.

4.  **Feature: "Danger Zone" Flicker**
    *   **What:** When the piece stack gets above a certain height (e.g., >75% of the well), the bottom rows of the background grid begin to subtly flicker or pulse a warning color (like a dim red).
    *   **Why:** Creates a natural, ambient tension that communicates danger to the player without needing a separate UI element.

---

### **Tier 2: High-Impact Player Feedback (PIXI-First)**

These are classic, standalone juice effects that can be implemented in parallel to Tier 1 to improve the moment-to-moment "feel" of the game.

5.  **Piece Lock Flash**
    *   **What:** The piece flashes a bright color for a single frame upon locking.
    *   **Why:** The absolute easiest win for game feel. It provides instant, crisp feedback that the player's action is complete.

6.  **Hard Drop Squash & Stretch**
    *   **What:** The piece squashes down and stretches out for a few frames upon a hard drop landing.
    *   **Why:** Gives the pieces a tangible sense of weight and impact, making a basic action feel much more powerful.

7.  **Coyote Time & Input Buffering**
    *   **What:** Implement "game feel" mechanics that make the controls more forgiving and responsive.
    *   **Why:** These are invisible but deeply felt improvements that separate a good-feeling game from a great one, especially for advanced players.

---

### **Tier 3: Advanced Synesthetic Events (Future Step / GSAP Integration)**

This tier represents the next level of polish, where we would introduce a dedicated animation library like GSAP to handle more complex, precisely timed choreographies.

8.  **The "Synesthetic Line Clear"**
    *   **What:** The ultimate line clear event. A precisely timed sequence of screen shake, shader-based flashes, staggered block animations, and particle bursts, all choreographed by GSAP and synchronized with a musical chord from Tone.js.
    *   **Why:** This is the full realization of the "VibeCoding" philosophy—a perfect fusion of visuals, audio, and feel.

9.  **Dynamic UI & Scene Transitions**
    *   **What:** Smoothly animate UI elements (like the main score counting up) and screen transitions (like the main menu sliding away).
    *   **Why:** Provides a professional, polished "shell" around the core gameplay experience.

10. **Advanced Background Well Animations**
    *   **What:** Use GSAP to create more complex animations on our Background Well Display, like "digital rain" transitions or intricate, beat-synced patterns that would be cumbersome to code by hand.
    *   **Why:** Takes the foundational system from Tier 1 and elevates its expressive potential.
