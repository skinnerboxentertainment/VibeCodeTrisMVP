// src/ui/input/gamepad.ts
import { GameAction, InputType } from './actions';
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
const AXIS_DEAD_ZONE = 0.5;
let animationFrameId: number | null = null;
const previousButtonState: { [key: number]: boolean } = {};
const previousAxisState: { [key: number]: number } = {};

/**
 * Detects the gamepad type from its ID and updates the active button map.
 */
function updateGamepadType(gamepad: Gamepad | null): void {
    if (!gamepad) return;

    const gamepadIdLower = gamepad.id.toLowerCase();

    if (
        gamepadIdLower.includes('xbox') ||
        gamepadIdLower.includes('xinput') ||
        gamepadIdLower.includes('x-box')
    ) {
        if (activeButtonMap !== xInputButtonMap) {
            console.log(`XInput detected: "${gamepad.id}"`);
            activeButtonMap = xInputButtonMap;
        }
    } else {
        if (activeButtonMap !== dInputButtonMap) {
            console.log(`DInput detected: "${gamepad.id}"`);
            activeButtonMap = dInputButtonMap;
        }
    }
}


/**
 * Polls for gamepad input and sends actions.
 */
function pollGamepads(actionHandler: (action: GameAction, inputType: InputType) => void) {
    const gamepads = navigator.getGamepads();
    let activeGamepad: Gamepad | null = null;

    for (const gamepad of gamepads) {
        if (gamepad) {
            activeGamepad = gamepad;
            break;
        }
    }

    if (activeGamepad) {
        updateGamepadType(activeGamepad);

        // --- Handle Buttons ---
        activeGamepad.buttons.forEach((button, index) => {
            const isPressed = button.pressed;
            const wasPressed = previousButtonState[index] || false;

            if (isPressed && !wasPressed) {
                const action = activeButtonMap[index];
                if (action) {
                    actionHandler(action, 'gamepad');
                }
            } else if (!isPressed && wasPressed) {
                const action = activeButtonMap[index];
                if (action && (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop')) {
                    actionHandler(`${action}_release` as GameAction, 'gamepad');
                }
            }
            previousButtonState[index] = isPressed;
        });

        // --- Handle Axes (Left Stick) ---
        const yAxis = activeGamepad.axes[1];
        const xAxis = activeGamepad.axes[0];
        const prevY = previousAxisState[1] || 0;
        const prevX = previousAxisState[0] || 0;

        // Vertical movement
        if (yAxis < -AXIS_DEAD_ZONE && prevY >= -AXIS_DEAD_ZONE) {
            actionHandler('rotateCW', 'gamepad'); // Up for menu navigation
        } else if (yAxis > AXIS_DEAD_ZONE && prevY <= AXIS_DEAD_ZONE) {
            actionHandler('softDrop', 'gamepad');
        } else if (yAxis > -AXIS_DEAD_ZONE && yAxis < AXIS_DEAD_ZONE && prevY > AXIS_DEAD_ZONE) {
            actionHandler('softDrop_release', 'gamepad');
        }

        // Horizontal movement
        if (xAxis < -AXIS_DEAD_ZONE && prevX >= -AXIS_DEAD_ZONE) {
            actionHandler('moveLeft', 'gamepad');
        } else if (xAxis > AXIS_DEAD_ZONE && prevX <= AXIS_DEAD_ZONE) {
            actionHandler('moveRight', 'gamepad');
        } else if (xAxis > -AXIS_DEAD_ZONE && xAxis < AXIS_DEAD_ZONE) {
            if (prevX < -AXIS_DEAD_ZONE) {
                actionHandler('moveLeft_release', 'gamepad');
            } else if (prevX > AXIS_DEAD_ZONE) {
                actionHandler('moveRight_release', 'gamepad');
            }
        }
        previousAxisState[1] = yAxis;
        previousAxisState[0] = xAxis;
    }

    animationFrameId = requestAnimationFrame(() => pollGamepads(actionHandler));
}

function stopPolling() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/**
 * Sets up gamepad controls and returns a cleanup function.
 */
export function setupGamepadControls(
    actionHandler: (action: GameAction, inputType: InputType) => void,
    notificationManager: NotificationManager
): () => void {
    const onGamepadConnected = (e: GamepadEvent) => {
        const gamepad = e.gamepad;
        notificationManager.showToast(`Gamepad Connected: ${gamepad.id}`);
        console.log("Gamepad connected:", gamepad.id);

        if (!animationFrameId) {
            pollGamepads(actionHandler);
        }
    };

    const onGamepadDisconnected = (e: GamepadEvent) => {
        notificationManager.showToast(`Gamepad Disconnected: ${e.gamepad.id}`);
        console.log("Gamepad disconnected:", e.gamepad.id);

        const gamepads = navigator.getGamepads();
        const isAnyGamepadConnected = gamepads.some(g => g !== null);

        if (!isAnyGamepadConnected) {
            stopPolling();
        }
    };
    
    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    if (gamepads.some(g => g)) {
        if (!animationFrameId) {
            pollGamepads(actionHandler);
        }
    }

    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    const cleanup = () => {
        window.removeEventListener("gamepadconnected", onGamepadConnected);
        window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
        stopPolling();
        console.log("Gamepad controls disabled.");
    };

    console.log("Gamepad controls enabled.");
    return cleanup;
}
