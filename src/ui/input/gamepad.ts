// src/ui/input/gamepad.ts
import { GameAction } from './actions';
import { NotificationManager } from '../NotificationManager';

// Standard Gamepad button mapping (DInput)
const dInputButtonMap: { [key: number]: GameAction } = {
    0: 'hardDrop',      // A / Cross (Select in menus)
    1: 'rotateCW',      // B / Circle (Navigate Up in menus)
    2: 'rotateCCW',     // X / Square
    3: 'hold',          // Y / Triangle
    9: 'pause',         // Start button
    12: 'rotateCW',     // D-Pad Up (Navigate Up in menus)
    13: 'softDrop',     // D-Pad Down (Navigate Down in menus)
    14: 'moveLeft',     // D-Pad Left
    15: 'moveRight',    // D-Pad Right
};

// XInput button mapping (Xbox controllers)
const xInputButtonMap: { [key: number]: GameAction } = {
    0: 'hardDrop',      // A
    1: 'rotateCW',      // B
    2: 'rotateCCW',     // X
    3: 'hold',          // Y
    8: 'pause',         // Menu button (Start)
    9: 'pause',         // View button (Select)
    12: 'rotateCW',     // D-Pad Up
    13: 'softDrop',     // D-Pad Down
    14: 'moveLeft',     // D-Pad Left
    15: 'moveRight',    // D-Pad Right
};

let activeButtonMap = dInputButtonMap; // Default to DInput
let lastDetectedGamepadId: string | null = null; // Track last gamepad to detect changes
let isXInput = false; // Track current controller type

const AXIS_DEAD_ZONE = 0.5;
let animationFrameId: number | null = null;
const previousButtonState: { [key: number]: boolean } = {};
const previousAxisState: { [key: number]: number } = {};

/**
 * Detects the gamepad type from its ID and updates the active button map.
 * This is called every frame to ensure consistent detection regardless of 
 * whether gamepadconnected events fire.
 */
function updateGamepadType(gamepadId: string, gamepad: Gamepad): void {
    // Only update if the gamepad changed
    if (gamepadId === lastDetectedGamepadId) {
        return;
    }

    lastDetectedGamepadId = gamepadId;
    const gamepadIdLower = gamepadId.toLowerCase();

    // Check for XInput controller - covers Xbox 360, Xbox One, Xbox Series X/S, and compatible controllers
    if (
        gamepadIdLower.includes('xbox') ||
        gamepadIdLower.includes('xinput') ||
        gamepadIdLower.includes('360') ||
        gamepadIdLower.includes('x-box')
    ) {
        activeButtonMap = xInputButtonMap;
        isXInput = true;
        console.log(`XInput detected: "${gamepadId}"`);
    } else {
        activeButtonMap = dInputButtonMap;
        isXInput = false;
        console.log(`DInput detected: "${gamepadId}"`);
    }
}

/**
 * Polls for gamepad input and sends actions.
 */
function pollGamepads(actionHandler: (action: GameAction) => void) {
    const gamepads = navigator.getGamepads();
    
    // Always keep polling to detect gamepads that connect after a button press
    animationFrameId = requestAnimationFrame(() => pollGamepads(actionHandler));

    if (gamepads.length === 0) {
        return;
    }

    // Find the first connected gamepad (could be at any index)
    let activeGamepad: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            activeGamepad = gamepads[i];
            break;
        }
    }

    if (!activeGamepad) {
        return;
    }

    const gamepad = activeGamepad; // Use the first connected gamepad (regardless of index)

    // Update gamepad type detection on every poll to ensure consistent mapping
    // even if gamepadconnected events don't fire
    updateGamepadType(gamepad.id, gamepad);

    // --- Handle Buttons ---
    gamepad.buttons.forEach((button, index) => {
        const isPressed = button.pressed;
        const wasPressed = previousButtonState[index] || false;

        if (isPressed && !wasPressed) {
            const action = activeButtonMap[index];
            if (action) {
                actionHandler(action);
            }
        } else if (!isPressed && wasPressed) {
            const action = activeButtonMap[index];
            if (action && (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop')) {
                actionHandler(`${action}_release` as GameAction);
            }
        }
        previousButtonState[index] = isPressed;
    });

    // --- Handle Axes (Left Stick) ---
    const yAxis = gamepad.axes[1];
    const xAxis = gamepad.axes[0];
    const prevY = previousAxisState[1] || 0;
    const prevX = previousAxisState[0] || 0;

    // Vertical movement
    if (yAxis < -AXIS_DEAD_ZONE && prevY >= -AXIS_DEAD_ZONE) {
        actionHandler('rotateCW'); // Up for menu navigation
    } else if (yAxis > AXIS_DEAD_ZONE && prevY <= AXIS_DEAD_ZONE) {
        actionHandler('softDrop');
    } else if (yAxis > -AXIS_DEAD_ZONE && yAxis < AXIS_DEAD_ZONE && prevY > AXIS_DEAD_ZONE) {
        actionHandler('softDrop_release');
    }

    // Horizontal movement
    if (xAxis < -AXIS_DEAD_ZONE && prevX >= -AXIS_DEAD_ZONE) {
        actionHandler('moveLeft');
    } else if (xAxis > AXIS_DEAD_ZONE && prevX <= AXIS_DEAD_ZONE) {
        actionHandler('moveRight');
    } else if (xAxis > -AXIS_DEAD_ZONE && xAxis < AXIS_DEAD_ZONE) {
        if (prevX < -AXIS_DEAD_ZONE) {
            actionHandler('moveLeft_release');
        } else if (prevX > AXIS_DEAD_ZONE) {
            actionHandler('moveRight_release');
        }
    }

    previousAxisState[1] = yAxis;
    previousAxisState[0] = xAxis;
}

/**
 * Sets up gamepad controls and returns a cleanup function.
 */
export function setupGamepadControls(
    actionHandler: (action: GameAction) => void,
    notificationManager: NotificationManager
): () => void {
    let hasNotified = false;

    const onGamepadConnected = (e: GamepadEvent) => {
        const gamepad = e.gamepad;
        
        // Use the same detection logic as in pollGamepads
        updateGamepadType(gamepad.id, gamepad);

        if (!hasNotified) {
            notificationManager.showToast(`Gamepad Connected: ${gamepad.id}`);
            hasNotified = true;
        }
        console.log(
            "Gamepad connected at index %d: %s. %d buttons, %d axes.",
            gamepad.index,
            gamepad.id,
            gamepad.buttons.length,
            gamepad.axes.length
        );
    };

    const onGamepadDisconnected = (e: GamepadEvent) => {
        notificationManager.showToast(`Gamepad Disconnected: ${e.gamepad.id}`);
        console.log("Gamepad disconnected from index %d: %s", e.gamepad.index, e.gamepad.id);
        hasNotified = false; // Allow notification for next connection
    };

    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    // Start polling immediately and continuously.
    // This handles cases where gamepads are already connected or connect later without firing an event until a button is pressed.
    if (!animationFrameId) {
        pollGamepads(actionHandler);
    }

    const cleanup = () => {
        window.removeEventListener("gamepadconnected", onGamepadConnected);
        window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        console.log("Gamepad controls disabled.");
    };

    console.log("Gamepad controls enabled.");
    return cleanup;
}
