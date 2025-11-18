# Controls Modal - Tabbed Interface Proposal

## Problem
The current controls modal presents all control mappings (Keyboard, Gamepad, Touch) in a single, scrollable list. This approach is not consistent with the established UI/UX patterns in the application and can be cumbersome for users to navigate, especially on smaller screens or when using a gamepad/keyboard for navigation.

## Proposed Solution
To improve usability and align with the application's design principles, we will refactor the controls modal to use a tabbed interface. This will allow users to easily switch between Keyboard, Gamepad, and Touch control mappings using dedicated tabs. Navigation between these tabs will be supported via both mouse clicks and directional inputs (left/right) from the keyboard or gamepad.

## Implementation Plan
1.  **Restructure HTML (`index.html`):**
    *   Modify the `controls-modal` structure to include a `div` for tab buttons (`.controls-tabs`) and separate `div` elements for each control section (e.g., `keyboard-controls-section`, `gamepad-controls-section`, `touch-controls-section`).
    *   Each control section will initially be hidden, with only the default (e.g., Keyboard) section visible.
    *   Add `button` elements within `.controls-tabs` for each control type, with `data-controls` attributes to link them to their respective content sections.

2.  **Add CSS Styling (`index.html` `<style>` block):**
    *   Introduce styles for the `.controls-tabs` container to arrange the tab buttons horizontally.
    *   Style the `.control-tab` buttons to match the application's aesthetic, including `active` states for visual feedback.
    *   Ensure that `.controls-section` elements can be hidden and shown effectively.

3.  **Update Control Logic (`src/ui/controls.ts`):**
    *   Implement JavaScript logic to handle tab switching:
        *   Add event listeners to the tab buttons to show the corresponding control section and hide others.
        *   Manage the `active` class on tab buttons to highlight the currently selected tab.
    *   Modify the `renderControls` function to populate the correct container based on the active tab.

4.  **Modify Input Handling (`src/ui/input/InputManager.ts`):**
    *   Extend the `actionHandler` to detect `moveLeft` and `moveRight` actions when the `controls-modal` is open.
    *   If these actions are detected, implement logic to programmatically switch between the control tabs, simulating a click on the next/previous tab button.
    *   Ensure that the `back` action continues to close the modal as previously implemented.