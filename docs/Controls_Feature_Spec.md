# Feature Spec: In-Game Controls Panel

**Status:** Proposed

## 1. Overview

This document outlines the specification for implementing a "Controls" panel in VibeCodeTris. This feature will provide players with a clear, accessible, and visually appealing reference for all input methods (Keyboard, Gamepad, and Touch).

The primary goal is to improve player onboarding. As a secondary but crucial goal, the design of this panel will be forward-thinking, creating a foundational UI structure that will support future control customization, a key aspect of enhancing the game's accessibility.

## 2. Goals & Rationale

*   **Improve Player Experience:** New players will have an immediate and easy-to-understand guide to the game's controls without leaving the application.
*   **Centralize Control Information:** Consolidate all control schemes into a single, unified view.
*   **Enhance Visual Polish:** Utilize the high-quality SVG assets to create a professional and cohesive UI that matches the game's aesthetic.
*   **Foundation for Accessibility:** By building a modular panel that maps actions to visual icons, we create a clear separation between the game action and its input. This is the first step toward allowing players to remap these inputs, which is a critical accessibility feature.

## 3. Scope

### In Scope (Phase 1)

*   A "Controls" button will be added to the main menu screen.
*   Clicking the button will open a modal/overlay panel.
*   The panel will display a **static, non-interactive** list of controls for Keyboard, Gamepad, and Touch.
*   The display will use the vector (SVG) icons as detailed in the asset manifest.
*   The panel will include a "Close" button to return to the main menu.

### Out of Scope (Future Work)

*   **Control Customization:** The ability for users to remap controls will not be implemented in this phase.
*   **In-Game Access:** The panel will only be accessible from the main menu, not from a pause menu during gameplay.
*   **Dynamic Controller Detection:** The panel will initially display the Xbox Series controller layout by default, without detecting other controller types (e.g., PlayStation).

## 4. Implementation Details

### 4.1. HTML Structure

The following elements will be added to `index.html`:

1.  **Controls Button:** A new button on the main menu screen.
    ```html
    <!-- In the main menu section -->
    <button id="btn-controls" class="menu-button">Controls</button>
    ```

2.  **Controls Modal:** A new, initially hidden `div` for the modal panel.
    ```html
    <!-- At the end of the body or in a dedicated modals container -->
    <div id="controls-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <button id="btn-close-controls" class="modal-close-button">&times;</button>
            <h2>Controls</h2>
            
            <div class="controls-section">
                <h3>Keyboard</h3>
                <!-- Control rows will be generated here -->
            </div>

            <div class="controls-section">
                <h3>Gamepad</h3>
                <!-- Control rows will be generated here -->
            </div>

            <div class="controls-section">
                <h3>Touch</h3>
                <!-- Control rows will be generated here -->
            </div>
        </div>
    </div>
    ```

3.  **Control Row Structure:** Each control will be represented by a `div` containing the action description and the corresponding SVG icon.
    ```html
    <!-- Example for a single control row -->
    <div class="control-row">
        <span class="control-action">Move Left</span>
        <img src="/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_left.svg" alt="Left Arrow Key" class="control-icon">
    </div>
    ```

### 4.2. CSS Styling

*   The `#controls-modal` will be styled as a fixed-position overlay with a semi-transparent background, covering the entire viewport.
*   The `.modal-content` will be centered on the screen.
*   The `.hidden` class will have `display: none;` to control visibility.
*   Flexbox or CSS Grid will be used within `.controls-section` and `.control-row` to ensure clean alignment of text and icons.
*   The `.control-icon` class will define a consistent size (e.g., `height: 40px;`) for all SVG images to ensure uniformity.

### 4.3. TypeScript Logic

A new UI script (e.g., `src/ui/controls.ts`) will be created to manage the controls panel.

1.  **Data Structure:** A configuration object will be defined to map game actions to their corresponding icons and labels for each input type.

    ```typescript
    // Example structure
    const controlMappings = {
        keyboard: [
            { action: 'Move Left', icon: '/path/to/left_arrow.svg' },
            { action: 'Move Right', icon: '/path/to/right_arrow.svg' },
            // ... more keyboard controls
        ],
        gamepad: [
            { action: 'Move Left', icon: '/path/to/dpad_left.svg' },
            // ... more gamepad controls
        ],
        touch: [
            { action: 'Move Left', icon: '/path/to/swipe_left.svg' },
            // ... more touch controls
        ]
    };
    ```

2.  **Dynamic Row Generation:** On initialization, the script will iterate through the `controlMappings` object. For each entry, it will dynamically create the HTML for a `.control-row` and append it to the corresponding `.controls-section` (e.g., keyboard, gamepad, touch).

3.  **Event Handling:**
    *   Get element references for `#btn-controls`, `#btn-close-controls`, and `#controls-modal`.
    *   Add a click event listener to `#btn-controls` to open the modal (by removing the `.hidden` class).
    *   Add a click event listener to `#btn-close-controls` and the modal overlay to close the modal (by adding the `.hidden` class).

## 5. Asset Manifest

The specific SVG files to be used for each control are detailed in the [`SVG_Asset_Manifest.md`](./SVG_Asset_Manifest.md) document. The implementation will use the paths defined in that manifest.

## 6. Future Considerations & Customization Path

The implementation of this feature is intentionally data-driven to serve as a direct foundation for future control remapping capabilities.

*   **Data-Driven by Default:** By generating the control rows from a TypeScript configuration object from the start, we avoid hardcoding them in HTML. This makes the control scheme easy to manage and update.
*   **Clear Path to Customization:** To implement control remapping in the future, the `controlMappings` object can be modified based on user input and saved to local storage. The UI will automatically re-render with the updated mappings, providing a seamless customization experience.
