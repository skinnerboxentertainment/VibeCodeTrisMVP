# Mobile Layout Canvas Clipping Analysis

## Problem Description
On mobile layouts, the PIXI canvas is being scaled down inside a parent container that does not maintain the intended aspect ratio. The visible rendering surface becomes vertically compressed, pushing the top HUD (including SCORE text) partially outside the drawable viewport and causing it to appear clipped.

## Root Cause Analysis

### Current Layout Flow
1. **#app-container** (parent)
   - `width: 90%`
   - `height: 100%`
   - `max-width: 40rem`
   - `display: flex, flex-direction: column`
   - `align-items: center`
   
2. **#in-game** (mid-level container)
   - `display: flex, flex-direction: column`
   - `width: 100%`
   - `height: 100%`
   - `justify-content: center`

3. **.responsive-game-wrapper** (game wrapper)
   - Mobile: `width: 100%, max-width: 480px, flex-direction: column`
   - `display: flex`

4. **#game-container** (canvas parent)
   - `width: 100%`
   - `flex-grow: 1`
   - `min-height: 0`

5. **Canvas** (PIXI element)
   - Rendered by PixiRenderer
   - Maintains aspect ratio via CSS: `max-width: 100%, max-height: 100%, object-fit: contain`

### The Issue
The problem occurs when:

1. **On mobile portrait**, `#app-container` is 90% of viewport width, centered
2. Its height is 100% of `body` (which is `100vh`)
3. `#in-game` gets 100% of `#app-container`'s height
4. `.responsive-game-wrapper` is a flex column that tries to fit content
5. `#game-container` has `flex-grow: 1` but `min-height: 0` 
6. **HOWEVER**: The parent chain hasn't reserved enough vertical space for the content
7. When canvas is rendered, `handleResize()` reads `gameContainer.clientHeight`
8. This returns a compressed value because the parent containers haven't allocated proper height

### Why Top HUD Gets Clipped
- The PIXI renderer calculates available height: `const newHeight = gameContainer.clientHeight`
- With limited container height, the renderer scales everything proportionally
- The logical game coordinates (BOARD_HEIGHT + UI_TOP_AREA_HEIGHT) don't fit
- Elements at the top (SCORE, LEVEL, LINES) get positioned outside the visible canvas bounds

## Solution Strategy

### Option 1: Allocate More Vertical Space (RECOMMENDED)
- Ensure `#game-container` gets sufficient height on mobile
- Remove or adjust the `max-width` constraint on `.responsive-game-wrapper`
- Explicitly allocate full remaining height after accounting for touch controls

### Option 2: Add Letterboxing/Pillarboxing
- Render the game at native logical resolution
- Add black bars if needed
- Ensures nothing is clipped, though might add unused space

### Option 3: Scale Canvas Content Differently
- Adjust PIXI renderer scaling to prioritize fitting all content
- Add vertical padding/margins to ensure HUD stays visible

## Recommended Fix (Option 1)

### Changes Needed

1. **CSS Adjustment** - Ensure mobile portrait allocates proper height:
   ```css
   .responsive-game-wrapper {
       display: flex;
       flex-direction: column;
       width: 100%;
       height: 100%; /* Add explicit height */
       padding: 10px;
       box-sizing: border-box;
   }

   .responsive-game-wrapper #game-container {
       width: 100%;
       flex-grow: 1;
       min-height: 0;
   }

   .responsive-game-wrapper #touch-controls {
       width: 100%;
       flex-shrink: 0;
   }
   ```

2. **JavaScript Adjustment** - `src/main.ts`:
   ```typescript
   const handleResize = () => {
       document.body.style.height = `${window.innerHeight}px`;

       if (!renderer) return;

       // Read container dimensions
       const newWidth = gameContainer.clientWidth;
       let newHeight = gameContainer.clientHeight;

       // On mobile portrait, if height is too small, use viewport-based calculation
       const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
       if (isMobilePortrait && newHeight < 400) {
           // Calculate based on viewport height minus controls
           const controlsHeight = touchControls.clientHeight || 0;
           newHeight = window.innerHeight - controlsHeight - 20; // 20px for padding/spacing
       }

       const scale = window.devicePixelRatio;
       renderer.resize(newWidth * scale, newHeight * scale);
       
       if (renderer.app.view.style) {
           renderer.app.view.style.width = `${newWidth}px`;
           renderer.app.view.style.height = `${newHeight}px`;
       }
   };
   ```

3. **PIXI Renderer Adjustment** - `src/renderer/pixiRenderer.ts`:
   - Ensure the resize method prioritizes fitting the full logical scene
   - Consider adding minimum height requirements
   - Verify scaling calculation doesn't create negative margins

## Verification Checklist
- [ ] Mobile portrait: SCORE/LEVEL/LINES visible in HUD
- [ ] Mobile portrait: No clipping of top UI elements
- [ ] Mobile landscape: Game scales appropriately
- [ ] Desktop: Layout remains unchanged
- [ ] Canvas maintains aspect ratio
- [ ] Touch controls positioned correctly
