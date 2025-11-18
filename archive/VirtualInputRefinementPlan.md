# Virtual Input Refinement Plan

## Analysis of Current Implementation

*   **Structure:** The virtual buttons are simple `<div>` elements in `index.html`. Their appearance is controlled by CSS within the same file. Icons are currently just Unicode text characters (e.g., `&#8678;` for the left arrow).
*   **Event Handling:** All touch logic is cleanly handled in `src/ui/input/touch.ts`. It attaches `touchstart` and `touchend` event listeners to the buttons, which then map to game actions.
*   **Feedback:** The only visual feedback is the browser's default `:active` pseudo-class on the `divs`, which is minimal and inconsistent across devices. There is no haptic feedback.

## Path Forward: An Intelligent Patch

Based on the analysis, we can implement the desired features with minimal, targeted changes that respect the current architecture.

1.  **Integrate SVG Assets:**
    *   **Action:** Place your new SVG files into the `public/assets/icons/` directory (we may need to create this).
    *   **Action:** In `index.html`, replace the Unicode characters inside each `.touch-button` `div` with an `<img>` tag pointing to the corresponding SVG file.
    *   **Benefit:** This is a simple, low-risk change that isolates the visual representation of the buttons to the HTML, making them easy to update in the future.

2.  **Implement Visual Feedback (Button Press State):**
    *   **Action:** In `src/ui/input/touch.ts`, modify the `onButtonPress` function to add a `.pressed` class to the button's DOM element.
    *   **Action:** Modify the `onButtonRelease` function to remove the `.pressed` class.
    *   **Action:** In `index.html`, add a new CSS rule (e.g., `.touch-button.pressed img { transform: scale(0.9); opacity: 0.7; }`) to define the visual style for the pressed state.
    *   **Benefit:** This creates a clear, explicit visual state change that we have full control over, directly tied to the user's interaction.

3.  **Implement Haptic Feedback:**
    *   **Action:** In `src/ui/input/touch.ts`, inside the `onButtonPress` function, add a call to the browser's Vibration API: `navigator.vibrate(50);` (for a 50ms vibration).
    *   **Benefit:** This leverages a standard browser feature to provide immediate physical feedback. We can (and should) later tie this to a user setting.

## Conclusion

This plan is a safe and intelligent patch. It builds upon the existing, clean structure without requiring a major refactor. The changes are localized to the view (`index.html`) and the touch input logic (`touch.ts`), making them easy to implement, test, and maintain.
