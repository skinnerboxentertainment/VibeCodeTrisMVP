import { UIStateManager, UIState } from './state';

interface ControlMapping {
    action: string;
    icon: string;
}

interface ControlCategory {
    [key: string]: ControlMapping[];
}

const controlMappings: ControlCategory = {
    keyboard: [
        { action: 'Move Left', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_left.svg' },
        { action: 'Move Right', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_right.svg' },
        { action: 'Soft Drop', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_down.svg' },
        { action: 'Hard Drop', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_space.svg' },
        { action: 'Rotate CW', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_x.svg' },
        { action: 'Rotate CCW', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_z.svg' },
        { action: 'Pause', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_escape.svg' },
    ],
    gamepad: [
        { action: 'Move Left', icon: '/assets/icons/Xbox Series/Vector/xbox_dpad_left.svg' },
        { action: 'Move Right', icon: '/assets/icons/Xbox Series/Vector/xbox_dpad_right.svg' },
        { action: 'Soft Drop', icon: '/assets/icons/Xbox Series/Vector/xbox_dpad_down.svg' },
        { action: 'Hard Drop', icon: '/assets/icons/Xbox Series/Vector/xbox_button_a.svg' },
        { action: 'Rotate CW', icon: '/assets/icons/Xbox Series/Vector/xbox_button_b.svg' },
        { action: 'Rotate CCW', icon: '/assets/icons/Xbox Series/Vector/xbox_button_x.svg' },
        { action: 'Pause', icon: '/assets/icons/Xbox Series/Vector/xbox_button_start.svg' },
    ],
    touch: [
        { action: 'Move Left', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_left.svg' },
        { action: 'Move Right', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_right.svg' },
        { action: 'Soft Drop', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_arrow_down.svg' },
        { action: 'Hard Drop', icon: '/assets/icons/Keyboard & Mouse/Vector/keyboard_capslock_icon_down.svg' },
        { action: 'Rotate CW', icon: '/assets/icons/Flairs/Vector/flair_arrow_3.svg' },
        { action: 'Rotate CCW', icon: '/assets/icons/Flairs/Vector/flair_arrow_3_reverse.svg' },
    ],
};

export function initializeControlsPanel(uiManager: UIStateManager, pauseControlsButtonId?: string) {
    const btnControls = document.getElementById('btn-controls');
    const btnCloseControls = document.getElementById('btn-close-controls');
    const btnBackControls = document.getElementById('back-button-controls');
    const controlsModal = document.getElementById('controls-modal');

    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.control-tab');
    const controlSections = {
        keyboard: document.getElementById('keyboard-controls-section'),
        gamepad: document.getElementById('gamepad-controls-section'),
        touch: document.getElementById('touch-controls-section'),
    };

    if (!btnCloseControls || !btnBackControls || !controlsModal || !tabButtons.length || !controlSections.keyboard || !controlSections.gamepad || !controlSections.touch) {
        console.error('Controls panel elements (close button, back button, modal, tabs, or sections) not found!');
        return;
    }

    // Make buttons focusable
    btnCloseControls.setAttribute('data-focusable', 'true');
    btnBackControls.setAttribute('data-focusable', 'true');
    tabButtons.forEach(button => button.setAttribute('data-focusable', 'true'));

    const showControlsTab = (tabName: string) => {
        tabButtons.forEach(button => {
            if (button.dataset.controls === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        for (const key in controlSections) {
            const section = controlSections[key as keyof typeof controlSections];
            if (section) {
                if (key === tabName) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            }
        }
        renderControls(tabName);
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.controls;
            if (tabName) {
                showControlsTab(tabName);
            }
        });
    });

    const openControlsModal = () => {
        uiManager.changeState(UIState.Controls);
        showControlsTab('keyboard'); // Default to keyboard tab
    };

    if (btnControls) {
        btnControls.addEventListener('click', openControlsModal);
    }

    if (pauseControlsButtonId) {
        const pauseControlsButton = document.getElementById(pauseControlsButtonId);
        if (pauseControlsButton) {
            pauseControlsButton.addEventListener('click', openControlsModal);
        } else {
            console.error(`Pause controls button with ID ${pauseControlsButtonId} not found!`);
        }
    }

    const closeControlsModal = () => {
        uiManager.changeState(uiManager.getPreviousState());
    };

    btnCloseControls.addEventListener('click', closeControlsModal);
    btnBackControls.addEventListener('click', closeControlsModal);
    controlsModal.addEventListener('click', (event) => {
        if (event.target === controlsModal) {
            closeControlsModal();
        }
    });

    function renderControls(activeTab: string) {
        const keyboardContainer = document.getElementById('keyboard-controls-container');
        const gamepadContainer = document.getElementById('gamepad-controls-container');
        const touchContainer = document.getElementById('touch-controls-container');

        if (activeTab === 'keyboard' && keyboardContainer) {
            keyboardContainer.innerHTML = '';
            controlMappings.keyboard.forEach(mapping => {
                keyboardContainer.appendChild(createControlRow(mapping));
            });
        } else if (activeTab === 'gamepad' && gamepadContainer) {
            gamepadContainer.innerHTML = '';
            controlMappings.gamepad.forEach(mapping => {
                gamepadContainer.appendChild(createControlRow(mapping));
            });
        } else if (activeTab === 'touch' && touchContainer) {
            touchContainer.innerHTML = '';
            controlMappings.touch.forEach(mapping => {
                touchContainer.appendChild(createControlRow(mapping));
            });
        }
    }

    function createControlRow(mapping: ControlMapping): HTMLDivElement {
        const row = document.createElement('div');
        row.classList.add('control-row');

        const actionSpan = document.createElement('span');
        actionSpan.classList.add('control-action');
        actionSpan.textContent = mapping.action;

        const iconImg = document.createElement('img');
        iconImg.classList.add('control-icon');
        iconImg.src = mapping.icon;
        iconImg.alt = mapping.action;

        row.appendChild(actionSpan);
        row.appendChild(iconImg);

        return row;
    }
}
