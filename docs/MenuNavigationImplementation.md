# Menu Navigation Implementation

## Objective

To enable navigation of UI menus (Main Menu, Pause Menu, Settings, Game Over) using keyboard arrow keys and gamepad D-pad, with selection via the spacebar or gamepad 'A' button. This solution aims to provide a consistent and accessible navigation experience outside of active gameplay.

## Solution Overview

The solution introduces a new `UINavigator` class responsible for managing focusable UI elements and responding to navigation inputs. The existing `InputManager` will be modified to route navigation-specific inputs to the `UINavigator` when the game is not in an active gameplay state. HTML elements will be augmented with a `data-focusable` attribute to identify them as navigable, and a CSS class will provide visual feedback for the currently focused element.

## Core Components and Modifications

### 1. `src/ui/input/UINavigator.ts` (New File)

This class manages the focus state of UI elements within the currently active menu.

**Purpose:**
*   Identifies and tracks all focusable elements within the active UI view.
*   Manages the `currentFocusIndex` to keep track of the currently selected element.
*   Provides methods to move focus up, down, and trigger a click event on the focused element.
*   Subscribes to `UIStateManager` changes to update its list of focusable elements when the active menu changes.

**Key Methods:**

*   `constructor(uiManager: UIStateManager)`: Initializes the navigator and subscribes to UI state changes.
*   `onStateChange(newState: UIState)`: Called when the UI state changes. It updates `focusableElements` based on the new state and sets initial focus.
*   `updateFocusableElements()`: Populates `focusableElements` by querying the DOM for elements with `data-focusable="true"` within the current view container.
*   `getCurrentViewContainer(): HTMLElement | null`: Returns the root HTML element of the current UI view (e.g., `#main-menu`, `#settings-screen`).
*   `setFocus(index: number)`: Applies the `.focused` CSS class to the element at `index` and removes it from the previously focused element. Also calls `focus()` on the new element for accessibility.
*   `navigateDown()`: Moves focus to the next focusable element, cycling to the beginning if at the end.
*   `navigateUp()`: Moves focus to the previous focusable element, cycling to the end if at the beginning.
*   `select()`: Triggers a `click()` event on the currently focused element.

### 2. `src/ui/input/InputManager.ts` (Modification)

The `InputManager` will be updated to integrate the `UINavigator` and conditionally route input events.

**Modifications:**

*   Import `UINavigator` and `UIStateManager`.
*   Instantiate `UINavigator` in the constructor.
*   Modify the `actionHandler` to check the current `UIState`.
    *   If the state is `InGame`, `Paused`, `Settings`, `GameOver`, `Soundboard`, or `ToneJammer`, navigation inputs (Up, Down, Select) will be routed to the `UINavigator`.
    *   Other game-specific inputs will continue to be sent to `renderAPI.sendInput()`.
*   The `disable()` method will be updated to also disable the `UINavigator`'s input listeners if any are added directly to it.

### 3. `src/main.ts` (Modification)

The main application entry point will be updated to instantiate `UINavigator` and pass the `UIStateManager` to it.

**Modifications:**

*   Import `UINavigator`.
*   Instantiate `UINavigator` after `UIStateManager` and `InputManager` are created:
    ```typescript
    const uiManager = new UIStateManager();
    const notificationManager = new NotificationManager();
    const inputManager = new InputManager(notificationManager, uiManager); // Pass uiManager
    const uiNavigator = new UINavigator(uiManager); // Instantiate UINavigator
    ```
*   The `InputManager` constructor will need to accept `uiManager` to allow it to determine the current UI state for conditional input routing.

### 4. `index.html` (Modification)

Interactive UI elements that should be navigable will need a new attribute.

**Modifications:**

*   Add `data-focusable="true"` to all buttons, links, and other interactive elements within the menu screens (`main-menu`, `settings-screen`, `pause-overlay`, `game-over-screen`).
    *   Example:
        ```html
        <button id="play-button" data-focusable="true">Play Game</button>
        <button id="settings-button" data-focusable="true">Settings</button>
        ```

### 5. `style.css` (New or Modified CSS)

A CSS class will be added to provide visual feedback for the focused element.

**Modifications:**

*   Add a `.focused` CSS class to highlight the currently selected menu item. This could involve a border, background color change, or text styling.
    ```css
    .focused {
        outline: 2px solid yellow; /* Example styling */
        box-shadow: 0 0 10px yellow;
    }
    ```

## Implementation Steps

1.  **Create `src/ui/input/UINavigator.ts`**: Implement the class as described above.
2.  **Modify `src/ui/input/InputManager.ts`**:
    *   Import `UINavigator` and `UIStateManager`.
    *   Add `private uiNavigator: UINavigator;` property.
    *   Update the constructor to accept `uiManager` and `uiNavigator`.
    *   Modify `actionHandler` to conditionally call `uiNavigator.navigateUp()`, `uiNavigator.navigateDown()`, and `uiNavigator.select()` based on the `UIState` and the `GameAction` type.
    *   Ensure `disable()` correctly cleans up `UINavigator` listeners if necessary.
3.  **Modify `src/main.ts`**:
    *   Import `UINavigator`.
    *   Update the `InputManager` instantiation to pass `uiManager`.
    *   Instantiate `UINavigator` and pass it to `InputManager`.
4.  **Modify `index.html`**: Add `data-focusable="true"` to all relevant interactive elements.
5.  **Add CSS to `style.css`**: Define the `.focused` class.

## Testing

After implementing the changes:

1.  Start the development server (`npm run dev`).
2.  Navigate to the main menu.
3.  Use the `ArrowUp` and `ArrowDown` keys on the keyboard to move focus between menu items.
4.  Press `Spacebar` to select a focused item.
5.  Connect a gamepad and use the D-pad (Up/Down) to navigate.
6.  Press the 'A' button (or equivalent primary action button) on the gamepad to select.
7.  Verify that navigation works correctly in the Main Menu, Pause Menu, Settings, and Game Over screens.
8.  Ensure that when in-game, arrow keys and gamepad inputs control the piece, not the menu navigation.
