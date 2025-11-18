// src/logic/constants.ts

// --- Core Gameplay ---
export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;
export const BOARD_WIDTH = COLS * BLOCK_SIZE;
export const BOARD_HEIGHT = ROWS * BLOCK_SIZE;
export const TICK_MS = 1000 / 60; // 60 ticks per second

// --- Timing (in Ticks) ---
export const DAS = 10; // Delayed Auto Shift
export const ARR = 2;  // Auto Repeat Rate
export const LOCK_DELAY = 30; // Ticks before a piece locks down
export const GRAVITY_START_DELAY = 60; // Ticks before gravity starts
export const LINE_CLEAR_DELAY_TICKS = 28; // Must match engine value

// --- Multiplier System ---
export const MULTIPLIER_MAX_CAP = 10; // Maximum multiplier allowed
export const MULTIPLIER_DECAY_DELAY_TICKS = 180; // 3 seconds at 60fps
export const MULTIPLIER_DECAY_RATE_TICKS = 60; // Decay by 1 per second at 60fps

// --- Versioning ---
export const PROTOCOL_VERSION = 1;
export const CURRENT_ENGINE_VERSION = "0.1.0";
export const SNAPSHOT_SCHEMA_VERSION = 1;
