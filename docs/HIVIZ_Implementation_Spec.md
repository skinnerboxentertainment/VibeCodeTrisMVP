# HIVIZ: High-Fidelity Visualization System
## VibeCodeTris Subcell Effects Architecture

**Version:** 1.0  
**Date:** November 13, 2025  
**Status:** Implementation Specification  
**Target:** Path A - Light Renderer-Side Expansion

---

## Executive Summary

HIVIZ is a **rendering middleware layer** that expands the 10×20 game grid into a 20×40 subcell visualization grid. The engine remains completely untouched and unaware of subcells—it continues to operate at the 10×20 level with perfect determinism and portability. The renderer intercepts engine snapshots and events, transforms them into subcell-level effects, and produces rich visual output with programmatic animation control.

**Core Philosophy:** The engine is the brain. HIVIZ is the special effects artist. They never directly communicate.

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────┐
│   TetrisEngine (10×20)  │
│   - Board state         │
│   - Piece state         │
│   - Game events         │
└────────────┬────────────┘
             │ snapshot + events
             ↓
┌─────────────────────────────────────────┐
│       HIVIZ Visualization Layer          │
│  ─────────────────────────────────────  │
│  1. SubcellStateManager                 │
│     - Maintains 20×40 grid              │
│     - Tracks subcell animation state    │
│                                          │
│  2. EffectDispatcher                    │
│     - Listens to engine events          │
│     - Queues visual effects             │
│                                          │
│  3. Effect System                       │
│     - Animate subcells independently    │
│     - Apply transforms (opacity,        │
│       rotation, scale, offset)          │
│     - Physics simulation (optional)     │
└────────────┬────────────────────────────┘
             │ subcell states + effects
             ↓
┌─────────────────────────┐
│  Renderer (Three.js,    │
│  Pixi.js, Canvas, etc)  │
│  - Renders each subcell │
│  - Applies visual       │
│    transforms           │
└─────────────────────────┘
             │
             ↓
        ┌─────────┐
        │ Visuals │
        └─────────┘
```

### Key Principle: Separation of Concerns

| Layer | Responsibility | Can See | Cannot See |
|-------|---|---|---|
| **Engine** | Game logic, determinism, state management | Constants, rules, RNG | Rendering, audio, UI |
| **HIVIZ** | Visual effects, animation sequencing | Snapshots, events, constants | Engine internals, gameplay logic |
| **Renderer** | Drawing pixels/geometry | Subcell states with transforms | Engine, event dispatch |

---

## Layer 1: Subcell State Manager

### Purpose
Maintains a 20×40 grid of subcell states and coordinates animations. Synchronizes from engine snapshots and updates subcell properties each frame.

### File Location
`src/renderer/subcellLayer/SubcellStateManager.ts`

### Data Structures

#### SubcellState
```typescript
interface SubcellState {
  // Grid position
  cellX: number;                // Parent cell column (0-9)
  cellY: number;                // Parent cell row (0-19)
  subcellX: number;             // Within cell (0-1)
  subcellY: number;             // Within cell (0-1)

  // Visual properties
  colorIndex: number;           // Base color (1-7 from engine, 0 = empty)
  opacity: number;              // 0-1 (0 = invisible, 1 = opaque)
  rotation: number;             // degrees (0-360)
  scale: number;                // uniform scaling (0-N)
  scaleX: number;               // independent X scale
  scaleY: number;               // independent Y scale

  // Position adjustment
  offsetX: number;              // pixel offset from grid position X
  offsetY: number;              // pixel offset from grid position Y

  // State machines
  animationState?: SubcellAnimation;
  physicsState?: SubcellPhysics;
}
```

#### SubcellAnimation
```typescript
interface SubcellAnimation {
  type: 'dissolve' | 'pulse' | 'spin' | 'bounce' | 'wave' | 'ripple' | 'particle' | 'custom';
  
  // Timeline
  startTick: number;            // When animation started
  duration: number;             // Total duration in ticks
  currentTick: number;          // Elapsed ticks (auto-incremented)
  
  // Motion
  easing: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn' | 'easeInCubic' | 'easeOutCubic';
  
  // Effect-specific parameters
  params?: {
    amplitude?: number;         // Wave height, pulse scale, etc
    height?: number;            // Bounce height
    speed?: number;             // Rotation speed
    color?: number;             // Color override
    [key: string]: number;      // Custom parameters
  };
  
  // Lifecycle
  onComplete?: () => void;
  finished: boolean;
}
```

#### SubcellPhysics (Optional)
```typescript
interface SubcellPhysics {
  vx: number;                   // Velocity X (pixels/tick)
  vy: number;                   // Velocity Y (pixels/tick)
  ax: number;                   // Acceleration X
  ay: number;                   // Acceleration Y
  mass: number;                 // For gravity calculation
  friction: number;             // Velocity damping (0-1)
  active: boolean;              // Is physics simulation running?
}
```

### Core Methods

#### Constructor
```typescript
constructor() {
  this.grid = this.initializeGrid();  // 20×40 grid
  this.animationQueue = [];
  this.currentTick = 0;
}
```

Initializes a 20×40 grid. Each subcell has default state (empty, opaque=0).

#### syncFromSnapshot(snapshot: Snapshot)
```typescript
syncFromSnapshot(snapshot: Snapshot): void {
  // For each of 10×20 cells in engine snapshot
  // - Read color index
  // - Set all 4 corresponding subcells to that color
  // - Preserve ongoing animations/physics if present
  // - Mark subcells as opaque if color > 0
}
```

**Frequency:** Called once per engine tick (60 Hz)  
**Purpose:** Keep subcell colors synchronized with engine state  
**Key Detail:** Does NOT reset animations—preserves effect state

#### queueEffect(cellX, cellY, effectType, config)
```typescript
queueEffect(
  cellX: number,           // Parent cell X (0-9)
  cellY: number,           // Parent cell Y (0-19)
  effectType: EffectType,  // 'dissolve', 'pulse', etc
  config: EffectConfig
): void {
  // For each of 4 subcells in this cell:
  // - Create animation job
  // - Add to animation queue
  // - Apply stagger delay if configured
}
```

**Called By:** EffectDispatcher  
**Staggering:** Sequential effects can have per-subcell delays for wave/ripple effects

#### update(deltaTime: number)
```typescript
update(deltaTime: number): void {
  this.currentTick++;
  
  // Update all active animations
  for (const job of this.animationQueue) {
    this.updateAnimation(job);
  }
  
  // Update physics simulation if enabled
  this.updatePhysics(deltaTime);
  
  // Cleanup finished animations
  this.animationQueue = this.animationQueue.filter(job => !job.finished);
}
```

**Frequency:** Called every frame (60 Hz)  
**Responsibilities:**
- Advance animation timelines
- Compute animation transforms
- Apply physics
- Clean expired animations

#### Private: updateAnimation(job: AnimationJob)
```typescript
private updateAnimation(job: AnimationJob): void {
  const elapsed = job.currentTick++;
  const progress = Math.min(elapsed / job.duration, 1);
  const eased = this.applyEasing(progress, job.easing);

  // Apply animation transforms to each subcell
  job.subcells.forEach(subcell => {
    switch (job.animation.type) {
      case 'dissolve':
        subcell.opacity = 1 - eased;  // Fade out
        break;
      
      case 'pulse':
        const scale = 1 + Math.sin(eased * Math.PI) * (job.animation.params?.amplitude || 0.3);
        subcell.scale = scale;
        break;
      
      case 'spin':
        subcell.rotation = eased * (job.animation.params?.speed || 360);
        break;
      
      case 'bounce':
        const bounceHeight = -Math.sin(eased * Math.PI) * (job.animation.params?.height || 10);
        subcell.offsetY = bounceHeight;
        break;
      
      case 'wave':
        // Stagger based on subcell index for ripple effect
        const staggerAmount = job.subcells.indexOf(subcell) * (job.animation.params?.stagger || 0.05);
        const waveOffset = Math.sin((eased + staggerAmount) * Math.PI * 2) * (job.animation.params?.amplitude || 5);
        subcell.offsetY = waveOffset;
        break;
      
      case 'ripple':
        // Radial propagation from center
        const distance = subcell.distanceFromCenter;
        const delay = distance * (job.animation.params?.delayPerPixel || 0.01);
        const adjustedProgress = Math.max(0, eased - delay);
        subcell.opacity = 1 - adjustedProgress;
        break;
      
      case 'particle':
        // Burst outward with velocity
        if (job.animation.params?.vx) {
          subcell.offsetX += job.animation.params.vx * elapsed;
          subcell.offsetY += job.animation.params.vy * elapsed;
        }
        subcell.opacity = 1 - eased;
        break;
    }
  });

  // Mark finished
  if (progress >= 1) {
    job.finished = true;
    job.animation.onComplete?.();
  }
}
```

#### Private: applyEasing(t, easingType)
```typescript
private applyEasing(t: number, easing: string): number {
  // t = progress (0-1)
  switch (easing) {
    case 'linear':
      return t;
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'easeOut':
      return 1 - Math.pow(1 - t, 3);
    case 'easeIn':
      return t * t * t;
    case 'easeInCubic':
      return t * t * t;
    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3);
    default:
      return t;
  }
}
```

#### getSubcell(x, y): SubcellState
Returns the subcell at grid position (x, y) where x ∈ [0-19], y ∈ [0-39].

#### getAllSubcells(): SubcellState[][]
Returns the entire 20×40 grid for rendering.

---

## Layer 2: Effect Dispatcher

### Purpose
Listens to engine events and translates them into visual effects. Acts as a mapping layer between game logic events and HIVIZ animations.

### File Location
`src/renderer/subcellLayer/EffectDispatcher.ts`

### Configuration

#### EffectConfig
```typescript
interface EffectConfig {
  duration: number;             // Ticks (60 ticks = 1 second at 60fps)
  easing?: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn';
  staggerDelay?: number;        // Ticks between sequential subcell animations
  params?: Record<string, number>;
  parallel?: boolean;           // true = all 4 subcells at once
                                // false = staggered per subcell
  speedrunMode?: boolean;       // true = instant (duration=1)
}
```

### Core Methods

#### Constructor
```typescript
constructor(subcellManager: SubcellStateManager) {
  this.subcellManager = subcellManager;
  this.effectRegistry = new Map();
  this.registerDefaultEffects();
}
```

#### handleEngineEvent(event: GameEvent)
```typescript
handleEngineEvent(event: GameEvent): void {
  switch (event.type) {
    case 'lineClear':
      this.triggerLineClearEffect(event.data);
      break;
    
    case 'pieceLocked':
      this.triggerPieceLockEffect(event.data);
      break;
    
    case 'hardDrop':
      this.triggerHardDropEffect(event.data);
      break;
    
    case 'gravityStep':
      // Optional: subtle shimmer or glow
      break;
    
    case 'multiplierDecay':
      // Optional: visual feedback on multiplier UI
      break;
    
    case 'pieceSpawn':
      this.triggerPieceSpawnEffect(event.data);
      break;
    
    case 'rotateCW' | 'rotateCCW':
      this.triggerRotationEffect(event.data);
      break;
  }
}
```

#### triggerLineClearEffect(data, config?)
```typescript
private triggerLineClearEffect(data: any, config?: EffectConfig): void {
  const rows: number[] = data.rows;
  const defaultConfig: EffectConfig = {
    duration: 30,
    easing: 'easeOut',
    staggerDelay: 2,  // 2 ticks between each subcell
    parallel: false,
  };
  const finalConfig = { ...defaultConfig, ...config };

  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < COLS; col++) {
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const delay = rowIndex * 10 + (sy * 2 + sx) * (finalConfig.staggerDelay || 0);
          
          setTimeout(() => {
            this.subcellManager.queueEffect(col, row, 'dissolve', {
              duration: finalConfig.duration,
              easing: finalConfig.easing,
            });
          }, delay * 16);  // 16ms per tick
        }
      }
    }
  });
}
```

**Effect:** Cells fade to transparency  
**Stagger Mode:** Sequential by subcell for smooth wave effect  
**Alternative:** Set `parallel: true` for instant vanish (speedrun mode)

#### triggerPieceLockEffect(data, config?)
```typescript
private triggerPieceLockEffect(data: any, config?: EffectConfig): void {
  // Get current piece from latest snapshot
  const piece = this.lastSnapshot.current;
  if (!piece) return;

  const defaultConfig: EffectConfig = {
    duration: 15,
    easing: 'easeInOut',
    params: { amplitude: 0.2 },
  };
  const finalConfig = { ...defaultConfig, ...config };

  // Find all cells occupied by the piece
  for (let row = 0; row < piece.matrix.length; row++) {
    for (let col = 0; col < piece.matrix[row].length; col++) {
      if (piece.matrix[row][col]) {
        const boardY = piece.y + row;
        const boardX = piece.x + col;
        
        this.subcellManager.queueEffect(boardX, boardY, 'pulse', finalConfig);
      }
    }
  }
}
```

**Effect:** Locked piece "bounces" with scale pulse  
**Use Case:** Satisfying feedback when piece lands

#### triggerHardDropEffect(data, config?)
```typescript
private triggerHardDropEffect(data: any, config?: EffectConfig): void {
  const { distance, type } = data;
  
  const defaultConfig: EffectConfig = {
    duration: 10,
    easing: 'linear',
    params: { amplitude: 5 },  // Fall distance per subcell
  };
  const finalConfig = { ...defaultConfig, ...config };

  // Impact is cell-wide; all subcells bounce/wave
  // Optional: physics simulation with gravity
  // Optional: particle burst from impact zone
}
```

**Effect:** Wave/ripple outward from impact point  
**Alternative:** Physics-based: apply velocity to subcells, let them settle

#### triggerPieceSpawnEffect(data, config?)
```typescript
private triggerPieceSpawnEffect(data: any, config?: EffectConfig): void {
  const { type } = data;
  
  const defaultConfig: EffectConfig = {
    duration: 8,
    easing: 'easeOut',
    params: { amplitude: 0.15 },
  };
  const finalConfig = { ...defaultConfig, ...config };

  // Piece appears with quick pulse
  // Or: fade in from above
}
```

**Effect:** Subtle entrance animation  
**Alternative:** Fade-in or scale-up from spawn point

#### triggerRotationEffect(data, config?)
```typescript
private triggerRotationEffect(data: any, config?: EffectConfig): void {
  // Optional: spin the piece's subcells during rotation
  // Purely decorative—engine already rotated
}
```

#### registerEffect(name: string, handler: EffectHandler)
```typescript
registerEffect(name: string, handler: EffectHandler): void {
  this.effectRegistry.set(name, handler);
}
```

**Purpose:** Extensibility point for custom effects  
**Example:**
```typescript
dispatcher.registerEffect('sparkle', (subcells, params) => {
  subcells.forEach(cell => {
    // Custom sparkle animation
  });
});
```

---

## Layer 3: Effect System

### Base Structure

Each effect is a configuration + animation behavior pair.

### Standard Effects

#### 1. Dissolve
**Use Case:** Line clear  
**Animation:** Opacity → 0 over duration  
**Config:**
```typescript
{
  type: 'dissolve',
  duration: 30,
  easing: 'easeOut',
}
```

#### 2. Pulse
**Use Case:** Piece lock, combo feedback  
**Animation:** Scale oscillates (1 → 1+amplitude → 1)  
**Config:**
```typescript
{
  type: 'pulse',
  duration: 15,
  easing: 'easeInOut',
  params: { amplitude: 0.3 },
}
```

#### 3. Spin
**Use Case:** Rotation feedback, showboating  
**Animation:** Rotation → full 360°  
**Config:**
```typescript
{
  type: 'spin',
  duration: 20,
  easing: 'linear',
  params: { speed: 360 },  // degrees
}
```

#### 4. Bounce
**Use Case:** Hard drop impact, piece landing  
**Animation:** OffsetY oscillates downward  
**Config:**
```typescript
{
  type: 'bounce',
  duration: 10,
  easing: 'easeOut',
  params: { height: 15 },  // pixels
}
```

#### 5. Wave
**Use Case:** Hard drop splash, propagating ripple  
**Animation:** OffsetY follows sine wave, staggered by subcell position  
**Config:**
```typescript
{
  type: 'wave',
  duration: 25,
  easing: 'linear',
  params: {
    amplitude: 8,      // wave height
    stagger: 0.05,    // delay factor per subcell
  },
}
```

**Stagger Calculation:**
```typescript
const stagger = (subcellX + subcellY * 2) * params.stagger;
const waveOffset = Math.sin((progress + stagger) * Math.PI * 2) * params.amplitude;
```

#### 6. Ripple
**Use Case:** Radial impact from piece lock/drop  
**Animation:** Opacity decreases, radiates outward from center  
**Config:**
```typescript
{
  type: 'ripple',
  duration: 40,
  easing: 'easeOut',
  params: {
    delayPerPixel: 0.01,  // how fast ripple propagates
    centerX: 5,           // relative to cell
    centerY: 10,
  },
}
```

#### 7. Particle
**Use Case:** Burst/explosion effect on line clear  
**Animation:** Velocity-based trajectory + fade out  
**Config:**
```typescript
{
  type: 'particle',
  duration: 30,
  easing: 'easeOut',
  params: {
    vx: 5,        // velocity x (pixels/tick)
    vy: -8,       // velocity y
  },
}
```

#### 8. Custom
**Use Case:** User-defined effects  
**Handler:** User-provided function  
**Config:**
```typescript
{
  type: 'custom',
  duration: 20,
  easing: 'linear',
  params: { /* custom params */ },
  handler: (subcells, progress, params) => {
    // Custom animation logic
  },
}
```

---

## Layer 4: Renderer Integration

### Purpose
Consumes HIVIZ subcell states and renders them with applied transforms.

### File Location
`src/renderer/pixiRenderer.ts` or `src/renderer/threeRenderer.ts` (renderer-agnostic)

### Integration Points

#### In Renderer Constructor
```typescript
class PixiRenderer {
  private subcellManager: SubcellStateManager;
  private effectDispatcher: EffectDispatcher;
  private engine: TetrisEngine;

  constructor(container: HTMLElement, managers: ManagerSet) {
    this.engine = new TetrisEngine(seed);
    this.subcellManager = new SubcellStateManager();
    this.effectDispatcher = new EffectDispatcher(this.subcellManager);
  }
}
```

#### In Main Render Loop
```typescript
private renderFrame(): void {
  // 1. Advance game logic
  const snapshot = this.engine.tick();

  // 2. Sync subcell grid from engine snapshot
  this.subcellManager.syncFromSnapshot(snapshot);

  // 3. Dispatch engine events as visual effects
  snapshot.events.forEach(event => {
    this.effectDispatcher.handleEngineEvent(event);
  });

  // 4. Update all animations
  const deltaTime = 16;  // 16ms per frame at 60fps
  this.subcellManager.update(deltaTime);

  // 5. Render each subcell
  const subcells = this.subcellManager.getAllSubcells();
  this.clearCanvas();
  
  subcells.forEach(row => {
    row.forEach(subcell => {
      if (subcell.opacity > 0) {
        this.renderSubcell(subcell);
      }
    });
  });

  requestAnimationFrame(() => this.renderFrame());
}
```

#### renderSubcell() Method
```typescript
private renderSubcell(subcell: SubcellState): void {
  // Calculate screen position
  const screenX = subcell.cellX * CELL_PIXEL_SIZE 
                + subcell.subcellX * SUBCELL_PIXEL_SIZE 
                + subcell.offsetX;
  const screenY = subcell.cellY * CELL_PIXEL_SIZE 
                + subcell.subcellY * SUBCELL_PIXEL_SIZE 
                + subcell.offsetY;

  // Resolve color
  const color = this.getPieceColor(subcell.colorIndex);

  // Apply transforms and render
  if (this.renderer === 'pixi') {
    this.renderSubcellPixi(screenX, screenY, subcell, color);
  } else if (this.renderer === 'three') {
    this.renderSubcellThree(screenX, screenY, subcell, color);
  } else if (this.renderer === 'canvas') {
    this.renderSubcellCanvas(screenX, screenY, subcell, color);
  }
}

private renderSubcellPixi(x, y, subcell, color): void {
  const graphics = new PIXI.Graphics();
  
  graphics.position.set(x, y);
  graphics.rotation = (subcell.rotation * Math.PI) / 180;
  graphics.scale.set(subcell.scale * subcell.scaleX, subcell.scale * subcell.scaleY);
  graphics.alpha = subcell.opacity;

  graphics.beginFill(color);
  graphics.drawRect(0, 0, SUBCELL_PIXEL_SIZE, SUBCELL_PIXEL_SIZE);
  graphics.endFill();

  this.stage.addChild(graphics);
}

private renderSubcellThree(x, y, subcell, color): void {
  const geometry = new THREE.BoxGeometry(SUBCELL_PIXEL_SIZE, SUBCELL_PIXEL_SIZE, 1);
  const material = new THREE.MeshStandardMaterial({ color });
  material.opacity = subcell.opacity;
  material.transparent = true;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, 0);
  mesh.rotation.z = (subcell.rotation * Math.PI) / 180;
  mesh.scale.set(
    subcell.scale * subcell.scaleX,
    subcell.scale * subcell.scaleY,
    1
  );

  this.scene.add(mesh);
}

private renderSubcellCanvas(x, y, subcell, color): void {
  const ctx = this.canvasContext;
  
  ctx.save();
  ctx.translate(x + SUBCELL_PIXEL_SIZE / 2, y + SUBCELL_PIXEL_SIZE / 2);
  ctx.rotate((subcell.rotation * Math.PI) / 180);
  ctx.scale(subcell.scale * subcell.scaleX, subcell.scale * subcell.scaleY);
  ctx.globalAlpha = subcell.opacity;
  
  ctx.fillStyle = color;
  ctx.fillRect(-SUBCELL_PIXEL_SIZE / 2, -SUBCELL_PIXEL_SIZE / 2, SUBCELL_PIXEL_SIZE, SUBCELL_PIXEL_SIZE);
  
  ctx.restore();
}
```

---

## Configuration & Constants

### Subcell Constants
Add to `src/logic/constants.ts`:

```typescript
// --- Subcell System ---
export const SUBCELL_GRID_ROWS = ROWS * 2;  // 40
export const SUBCELL_GRID_COLS = COLS * 2;  // 20
export const SUBCELL_PER_CELL = 4;          // 2×2

// Pixel sizes (for rendering)
export const SUBCELL_PIXEL_SIZE = BLOCK_SIZE / 2;  // 15px if BLOCK_SIZE=30
```

### Effect Presets
Create `src/renderer/subcellLayer/effectPresets.ts`:

```typescript
export const EFFECT_PRESETS = {
  lineClear: {
    standard: {
      duration: 30,
      easing: 'easeOut',
      staggerDelay: 2,
      parallel: false,
    },
    instant: {
      duration: 1,
      parallel: true,
    },
    dramatic: {
      duration: 50,
      easing: 'easeInCubic',
      staggerDelay: 3,
      parallel: false,
    },
  },
  pieceLock: {
    subtle: {
      duration: 10,
      params: { amplitude: 0.1 },
    },
    pronounced: {
      duration: 20,
      params: { amplitude: 0.5 },
    },
  },
  hardDrop: {
    wave: {
      type: 'wave',
      duration: 25,
      params: { amplitude: 8, stagger: 0.05 },
    },
    ripple: {
      type: 'ripple',
      duration: 40,
      params: { delayPerPixel: 0.01 },
    },
    particle: {
      type: 'particle',
      duration: 30,
      params: { vx: 5, vy: -8 },
    },
  },
};
```

---

## File Structure

```
src/
├── logic/
│   ├── constants.ts           (add SUBCELL_* constants)
│   ├── engine.ts              (UNCHANGED)
│   ├── rules.ts               (UNCHANGED)
│   ├── types.ts               (UNCHANGED)
│   └── ...
│
├── renderer/
│   ├── subcellLayer/
│   │   ├── SubcellStateManager.ts
│   │   ├── EffectDispatcher.ts
│   │   ├── effectPresets.ts
│   │   ├── effects/
│   │   │   ├── BaseEffect.ts         (interface/abstract)
│   │   │   ├── DissolveEffect.ts
│   │   │   ├── PulseEffect.ts
│   │   │   ├── WaveEffect.ts
│   │   │   ├── RippleEffect.ts
│   │   │   ├── ParticleEffect.ts
│   │   │   └── CustomEffect.ts
│   │   ├── physics/
│   │   │   └── SubcellPhysics.ts     (optional)
│   │   └── types.ts                  (SubcellState, EffectConfig, etc.)
│   │
│   ├── pixiRenderer.ts        (or threeRenderer.ts)
│   ├── renderAPI.ts
│   └── ...
│
├── ui/
│   ├── state.ts               (add HIVIZSettings?)
│   └── ...
│
└── main.ts
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Deliverable:** Subcells render, basic synchronization

- [ ] Create `SubcellStateManager` class
  - Grid initialization (20×40)
  - `syncFromSnapshot()` method
  - Basic `update()` loop (no animations yet)
- [ ] Create `EffectDispatcher` class
  - Event listener scaffolding
  - Placeholder handlers
- [ ] Create `types.ts` with interfaces
- [ ] Add subcell constants to `constants.ts`
- [ ] Integrate into renderer:
  - Create subcell grid on startup
  - Call `syncFromSnapshot()` each frame
  - Call `update()` each frame
  - Render each subcell (no transforms yet)
- [ ] **Test:** Verify 10×20 grid expands to 20×40 visually

### Phase 2: Core Effects (Week 2)
**Deliverable:** Dissolve, Pulse, Spin animations working

- [ ] Implement animation queue system
  - `queueEffect()` method
  - Animation job tracking
  - Finished job cleanup
- [ ] Implement easing functions
  - linear, easeIn, easeOut, easeInOut, cubic variants
- [ ] Implement effect handlers:
  - [ ] `dissolve` (opacity fade)
  - [ ] `pulse` (scale oscillation)
  - [ ] `spin` (rotation)
- [ ] Connect `triggerLineClearEffect()` to events
- [ ] Connect `triggerPieceLockEffect()` to events
- [ ] **Test:** Line clears dissolve, pieces pulse on lock

### Phase 3: Advanced Effects (Week 3)
**Deliverable:** Wave, Ripple, Particle, Physics

- [ ] Implement `bounce` effect
- [ ] Implement `wave` effect with stagger logic
- [ ] Implement `ripple` effect with radial propagation
- [ ] Implement `particle` effect with velocity-based motion
- [ ] (Optional) Implement `SubcellPhysics` system
  - Gravity simulation
  - Velocity/friction
  - Collision response
- [ ] Connect to `triggerHardDropEffect()`
- [ ] **Test:** Hard drops create satisfying ripple/wave/particle effects

### Phase 4: Configuration & Polish (Week 4)
**Deliverable:** Effect presets, UI controls, extensibility

- [ ] Create `effectPresets.ts` with standard configs
- [ ] Add UI toggle for speedrun mode (instant vs animated)
- [ ] Add UI dropdown for effect theme (dramatic, subtle, instant)
- [ ] Add custom effect registration system
  - `registerEffect()` API
  - Example: sparkle, screen shake, light burst
- [ ] Performance optimization:
  - Cull off-screen subcells
  - Batch render calls if using Pixi/Three.js
  - Profile frame rate
- [ ] Documentation & code cleanup
- [ ] **Test:** All effects, various configurations, performance targets

---

## Usage Examples

### Basic Setup
```typescript
// In main.ts or renderer initialization

import { SubcellStateManager } from './renderer/subcellLayer/SubcellStateManager';
import { EffectDispatcher } from './renderer/subcellLayer/EffectDispatcher';
import { EFFECT_PRESETS } from './renderer/subcellLayer/effectPresets';

const subcellManager = new SubcellStateManager();
const effectDispatcher = new EffectDispatcher(subcellManager);
const engine = new TetrisEngine(seed);

// Main loop
function gameLoop() {
  const snapshot = engine.tick();
  
  subcellManager.syncFromSnapshot(snapshot);
  
  snapshot.events.forEach(event => {
    effectDispatcher.handleEngineEvent(event);
  });
  
  subcellManager.update(16);  // deltaTime in ms
  
  render(subcellManager.getAllSubcells());
  
  requestAnimationFrame(gameLoop);
}
```

### Custom Effect
```typescript
effectDispatcher.registerEffect('sparkle', (subcells, params) => {
  subcells.forEach(cell => {
    cell.animationState = {
      type: 'custom',
      startTick: subcellManager.currentTick,
      duration: params.duration || 20,
      easing: 'easeOut',
    };
  });
});

// Trigger it
subcellManager.queueEffect(5, 10, 'custom', {
  handler: (subcells, progress) => {
    // Sparkle animation
  },
});
```

### Speedrun Mode
```typescript
// In UI settings
const isSpeedrun = true;

if (isSpeedrun) {
  effectDispatcher.lineClearConfig = EFFECT_PRESETS.lineClear.instant;
  effectDispatcher.pieceLockConfig = { duration: 1 };
  effectDispatcher.hardDropConfig = { duration: 1 };
}
```

### Effect Variation
```typescript
// User selects "dramatic" theme
const theme = 'dramatic';

effectDispatcher.setTheme(theme);
// Internally switches all configs to EFFECT_PRESETS[effect][theme]
```

---

## Testing Strategy

### Unit Tests
- SubcellStateManager grid initialization
- Animation easing functions
- Effect trigger logic

### Integration Tests
- Snapshot → subcell sync accuracy
- Event → effect triggering
- Animation timeline progression

### Visual Tests
- Render each effect in isolation
- Verify transform application (opacity, rotation, scale, offset)
- Check effect timing and sequencing
- Speedrun mode instant effects

### Performance Tests
- 60 FPS target maintained
- Memory usage (grid + animation queue)
- GPU utilization if using Three.js

---

## Extensibility & Future Work

### Potential Extensions

1. **Physics Simulation**
   - Gravity, collisions, friction
   - Enables debris particles, liquid dynamics

2. **Screen Shake**
   - Camera offset during line clear or hard drop
   - Amplitude based on multiplier

3. **Light & Particles**
   - Glow effects around locked pieces
   - Trail particles following falling pieces
   - Light bloom from line clear

4. **Shader Effects**
   - Distortion wave
   - Chromatic aberration
   - Scanline interference

5. **Audio-Visual Sync**
   - Subcell animations driven by audio (loudness, frequency)
   - Visualizer mode: board as drum sequencer

6. **Procedural Generation**
   - Effects generated by noise functions
   - Chaos/organic feel

7. **Theme System**
   - Presets: "Classic", "Dramatic", "Minimal", "Cyberpunk", "Nature"
   - Each overrides colors, effect choices, easing functions

### API Stability
HIVIZ is designed for extensibility without breaking changes:
- Custom effects don't require code changes
- Preset system allows new configs
- Physics is optional, never required
- Renderer agnostic (Pixi, Three.js, Canvas, WebGL)

---

## Design Principles

1. **Engine Independence**
   - Engine knows nothing about subcells
   - Engine emits events; HIVIZ consumes them
   - Completely decoupled and replaceable

2. **Determinism Preserved**
   - Subcell effects are purely visual
   - No effect alters game state
   - Replays unaffected

3. **Configurability**
   - Every effect has adjustable parameters
   - Speedrun vs aesthetic modes
   - Presets for quick setup

4. **Performance**
   - Animations run at 60 FPS
   - Culling for off-screen subcells
   - Optional physics (don't enable if unneeded)

5. **Renderer Agnostic**
   - Works with any renderer (Pixi, Three.js, Canvas, WebGL)
   - Transform data is renderer-independent
   - Each renderer applies transforms its own way

6. **Composability**
   - Multiple effects can run simultaneously
   - Staggering creates complex choreography from simple rules
   - Custom effects compose with standard ones

---

## Conclusion

HIVIZ provides a clean, extensible visualization layer that:

- **Preserves engine purity** — game logic untouched
- **Enables rich effects** — particle, physics, shader possibilities
- **Scales gracefully** — from "instant" speedrun to cinematic demoscene
- **Remains portable** — engine can be dropped into any context
- **Supports customization** — effects, themes, performance profiles

The architecture maps 10×20 game cells to 20×40 subcells, where each subcell can be individually animated with opacity, rotation, scale, and position offsets. Effects are data-driven, event-triggered, and fully configurable.

---

## References

- **Subcell State Manager:** Core animation state tracking
- **Effect Dispatcher:** Event-to-effect mapping
- **Effect System:** Individual animation implementations
- **Renderer Integration:** Transform application to visuals
- **Implementation Roadmap:** Week-by-week delivery plan
- **Code Examples:** Usage patterns and extension points
