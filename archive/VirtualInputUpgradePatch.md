# Patch Plan: Virtual Input and Responsive Layout Refactor

## 1. Postmortem: Analysis of Initial Implementation Failure

The initial attempt to upgrade the virtual inputs failed due to a critical flaw in the initial strategy: **a failure of reconnaissance**. The task was treated as a simple component swap without a holistic understanding of the systems controlling the application's layout.

### Sequence of Errors:

1.  **Incorrect Assumption:** The primary mistake was assuming the game's layout was controlled exclusively by CSS. The original plan was logical under this assumption, but the assumption was incorrect.
2.  **Overlooking JavaScript's Role:** The investigation was confined to HTML and CSS. We failed to analyze `src/main.ts`, which contained a `handleResize` function that programmatically calculated and enforced a fixed size on the game's `<canvas>` element. This JavaScript logic was the true source of truth for the game's dimensions, making our CSS changes ineffective.
3.  **Symptom-Based Debugging:** When the layout broke, we incorrectly diagnosed it as a CSS issue. Our attempts to fix it (`flex-grow`, `width: 100%`, etc.) were merely treating symptoms. We were fighting a losing battle against the JavaScript, which would always override the CSS and have the final say on the canvas size.

## 2. The Correct Approach: A Holistic Refactor

The task should have been approached as a **layout refactoring** project first and a feature implementation second.

1.  **Holistic Investigation:** Before implementing, the first step should have been to answer the question: **"What system controls the size and position of the game container?"** This requires inspecting the HTML structure, the CSS layout rules, and searching the JavaScript codebase for terms like `resize`, `canvas`, `width`, and `height` to find any DOM manipulation logic.
2.  **Identify the Conflict:** This investigation would have immediately revealed the `handleResize` function and its conflict with the CSS layout, establishing the need for a coordinated fix.
3.  **Formulate a Cohesive Plan:** The correct plan is to make CSS the single source of truth for layout and have the JavaScript adapt to it. This involves refactoring both the CSS and the JavaScript *before* implementing the new feature.

---

## 3. The Patch: Step-by-Step Upgrade Instructions

This plan will correctly implement the virtual input upgrade and fix the responsive layout issues.

### **Step 1: Refactor Application Layout (CSS)**

1.  **File:** `index.html`
2.  **Action:** Modify the `#app-container` CSS rule. Remove the `width: 90%` and `max-width: 40rem` properties to allow the main container to fill the viewport on all screen sizes.
3.  **Action:** Modify the `#in-game` CSS rule. Change its `display` to `grid` and define `grid-template-columns` to create a three-column layout with a constrained, centered main column: `grid-template-columns: 1fr minmax(auto, 40rem) 1fr;`.
4.  **Action:** Update the CSS for `#in-game-info`, `#game-container`, and `#touch-controls` to assign them to the correct grid columns, ensuring they are properly aligned within the new layout. The info panel and game container should be in column 2, and the touch controls should span all columns.

### **Step 2: Decouple Renderer from Layout Logic (JavaScript)**

1.  **File:** `src/main.ts`
2.  **Action:** Locate the `handleResize` function.
3.  **Action:** Remove the entire block of code responsible for calculating `availableHeight`, `availableWidth`, `aspectRatio`, `newWidth`, and `newHeight`.
4.  **Action:** Remove the lines that programmatically set `gameContainer.style.width` and `gameContainer.style.height`.
5.  **Action:** Replace the removed logic with two lines that read the container's dimensions directly from the DOM, allowing the renderer to adapt to the CSS layout:
    ```javascript
    const newWidth = gameContainer.clientWidth;
    const newHeight = gameContainer.clientHeight;
    ```

### **Step 3: Implement Virtual Input Enhancements**

1.  **File:** `index.html`
2.  **Action:** In the `#touch-controls` div, replace the Unicode characters inside each button with the appropriate `<img src="..." alt="...">` tag pointing to the new SVG assets (see list below).
3.  **Action:** Add the `.touch-button.pressed img` CSS rule to style the visual feedback for button presses.
4.  **File:** `src/ui/input/touch.ts`
5.  **Action:** Modify the `onButtonPress` and `onButtonRelease` functions to add and remove the `.pressed` class on the target element.
6.  **Action:** In `onButtonPress`, add the `navigator.vibrate(50);` call to provide haptic feedback.

---

## 4. SVG Asset Reference

| Action | Icon Name | File Path |
| :--- | :--- | :--- |
| **Move Left** | `keyboard_arrow_left.svg` | `public/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_left.svg` |
| **Move Right** | `keyboard_arrow_right.svg` | `public/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_right.svg` |
| **Soft Drop** | `keyboard_arrow_down.svg` | `public/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_down.svg` |
| **Hard Drop** | `keyboard_capslock_icon_down.svg` | `public/assets/icons/Keyboard & Mouse/Vector/keyboard_capslock_icon_down.svg` |
| **Rotate CCW** | `flair_arrow_3_reverse.svg` | `public/assets/icons/Flairs/Vector/flair_arrow_3_reverse.svg` |
| **Rotate CW** | `flair_arrow_3.svg` | `public/assets/icons/Flairs/Vector/flair_arrow_3.svg` |

