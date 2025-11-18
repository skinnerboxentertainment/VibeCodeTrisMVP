// src/ui/input/gamepad.ts
import { GameAction } from './actions';
import { NotificationManager } from '../NotificationManager';

// Standard Gamepad button mapping
const buttonMap: { [key: number]: GameAction } = {
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

const AXIS_DEAD_ZONE = 0.5;
let animationFrameId: number | null = null;
const previousButtonState: { [key: number]: boolean } = {};
const previousAxisState: { [key: number]: number } = {};

/**
 * Polls for gamepad input and sends actions.
 */
function pollGamepads(actionHandler: (action: GameAction) => void) {
    const gamepads = navigator.getGamepads();
    
    // Always keep polling to detect gamepads that connect after a button press
    animationFrameId = requestAnimationFrame(() => pollGamepads(actionHandler));

    if (gamepads.length === 0 || !gamepads[0]) {
        return;
    }

    const gamepad = gamepads[0]; // Use the first connected gamepad

    // --- Handle Buttons ---
    gamepad.buttons.forEach((button, index) => {
        const isPressed = button.pressed;
        const wasPressed = previousButtonState[index] || false;

        if (isPressed && !wasPressed) {
            const action = buttonMap[index];
            if (action) {
                actionHandler(action);
            }
        } else if (!isPressed && wasPressed) {
            const action = buttonMap[index];
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
        const gamepadId = e.gamepad.id;
        if (!hasNotified) {
            notificationManager.showToast(`Gamepad Connected: ${gamepadId}`);
            hasNotified = true;
        }
        console.log(
            "Gamepad connected at index %d: %s. %d buttons, %d axes.",
            e.gamepad.index,
            gamepadId,
            e.gamepad.buttons.length,
            e.gamepad.axes.length
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
