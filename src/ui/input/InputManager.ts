// src/ui/input/InputManager.ts
import { renderAPI } from '../../renderer/renderAPI';
import { GameAction, InputType } from './actions';
import { setupKeyboardControls } from './keyboard';
import { setupTouchControls } from './touch';
import { setupGamepadControls } from './gamepad';
import { NotificationManager } from '../NotificationManager';
import { UIStateManager, UIState } from '../state';
import { UINavigator } from './UINavigator';

/**
 * Manages all user input sources (keyboard, gamepad, touch) and funnels
 * them into a single stream of actions for the game engine or UI navigator.
 */
export class InputManager {
    private cleanupKeyboard: () => void;
    private cleanupTouch: () => void;
    private cleanupGamepad: () => void;
    private notificationManager: NotificationManager;
    private uiManager: UIStateManager;
    private uiNavigator: UINavigator;
    private lastInputType: InputType | null = null;

    constructor(notificationManager: NotificationManager, uiManager: UIStateManager) {
        this.notificationManager = notificationManager;
        this.uiManager = uiManager;
        this.uiNavigator = new UINavigator(this.uiManager);

        /**
         * The central handler that receives an action from any input source
         * and forwards it to the game engine or UI navigator.
         */
        const actionHandler = (action: GameAction, inputType: InputType) => {
            this.lastInputType = inputType;
            if (inputType === 'gamepad') {
                document.body.classList.add('gamepad-active');
            } else {
                document.body.classList.remove('gamepad-active');
            }

            const state = this.uiManager.getCurrentState();

            if (action === 'pause') {
                if (state === UIState.InGame) {
                    this.uiManager.changeState(UIState.Paused);
                } else if (state === UIState.Paused) {
                    this.uiManager.changeState(UIState.InGame);
                }
                return; // Pause action is fully handled
            }

            if (action === 'back') {
                if (state === UIState.Settings || state === UIState.Controls) {
                    this.uiManager.changeState(this.uiManager.getPreviousState());
                } else if (state === UIState.Paused) {
                    this.uiManager.changeState(UIState.InGame);
                }
                return; // Back action is fully handled in these contexts
            }

            const isMenuState = state === UIState.MainMenu ||
                                state === UIState.Paused ||
                                state === UIState.Settings ||
                                state === UIState.GameOver ||
                                state === UIState.Controls;

            if (isMenuState) {
                let navAction = true; // Assume it's a nav action by default
                switch (action) {
                    case 'rotateCW': // up
                        this.uiNavigator.navigateUp();
                        break;
                    case 'softDrop': // down
                        this.uiNavigator.navigateDown();
                        break;
                    case 'moveLeft':
                        this.uiNavigator.navigate('left');
                        break;
                    case 'moveRight':
                        this.uiNavigator.navigate('right');
                        break;
                    case 'hardDrop': // select
                        this.uiNavigator.select();
                        break;
                    default:
                        navAction = false; // Not a navigation action
                        break;
                }
                
                // If it wasn't a navigation action, it might be a game action
                // (e.g. moving left/right on a slider in settings).
                // We'll let it pass through. The game engine should know to ignore
                // piece movements if it's not in the InGame state.
                if (!navAction) {
                    renderAPI.sendInput(action);
                }
            } else {
                 // If not in a menu state, all actions go to the game.
                 renderAPI.sendInput(action);
            }
        };

        const keyboardActionHandler = (action: GameAction, inputType: InputType) => {
            actionHandler(action, 'keyboard');
        };
        const touchActionHandler = (action: GameAction, inputType: InputType) => {
            actionHandler(action, 'touch');
        };
        const gamepadActionHandler = (action: GameAction, inputType: InputType) => {
            actionHandler(action, 'gamepad');
        };


        this.cleanupKeyboard = setupKeyboardControls(keyboardActionHandler);
        
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            this.cleanupTouch = setupTouchControls(touchActionHandler);
        } else {
            this.cleanupTouch = () => {}; // No-op cleanup
        }

        this.cleanupGamepad = setupGamepadControls(gamepadActionHandler, this.notificationManager);

        const detectedInputs: string[] = [];
        if (this.cleanupKeyboard) detectedInputs.push('Keyboard');
        if (isTouchDevice) detectedInputs.push('Touch');
        const gamepads = navigator.getGamepads();
        if (gamepads.some(g => g)) {
            detectedInputs.push('Gamepad');
        }

        // Show initial notification
        this.notificationManager.showToast(`Inputs: ${detectedInputs.join(', ')}`, 4000);
    }
}

