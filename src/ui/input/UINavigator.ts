// src/ui/input/UINavigator.ts
import { UIState, UIStateManager, SettingsSection } from '../state';

export class UINavigator {
    private focusableElements: HTMLElement[] = [];
    private currentFocusIndex = -1;
    private currentlyFocusedElement: HTMLElement | null = null;
    private uiManager: UIStateManager;

    // Settings-specific state
    private settingTabs: HTMLElement[] = [];
    private activeTabIndex = -1;

    constructor(uiManager: UIStateManager) {
        this.uiManager = uiManager;
        this.uiManager.subscribeToStateChanges(this.onStateChange.bind(this));
        this.onStateChange(this.uiManager.getCurrentState()); // Initial setup
    }

    private onStateChange(newState: UIState): void {
        // Clean up focus from the previous screen
        if (this.currentlyFocusedElement) {
            this.currentlyFocusedElement.classList.remove('focused');
            this.currentlyFocusedElement = null;
        }

        this.settingTabs = [];
        this.activeTabIndex = -1;
        
        if (newState === UIState.Settings) {
            this.activeTabIndex = this.uiManager.getCurrentSettingsSection();
        }

        this.updateFocusableElements();

        if (this.focusableElements.length > 0) {
            // In settings or controls, focus the first tab by default
            if (newState === UIState.Settings && this.settingTabs.length > 0) {
                this.setFocus(this.activeTabIndex);
            } else if (newState === UIState.Controls && this.settingTabs.length > 0) {
                this.activeTabIndex = 0;
                this.setFocus(0);
            } else {
                this.setFocus(0);
            }
        } else {
            this.currentFocusIndex = -1;
        }
    }

    private updateFocusableElements(): void {
        const currentState = this.uiManager.getCurrentState();
        let container: HTMLElement | null = null;

        switch (currentState) {
            case UIState.MainMenu:
                container = document.getElementById('main-menu');
                break;
            case UIState.Settings:
                container = document.getElementById('settings-form');
                break;
            case UIState.Paused:
                container = document.getElementById('pause-overlay');
                break;
            case UIState.GameOver:
                container = document.getElementById('game-over-screen');
                break;
            case UIState.Controls:
                container = document.getElementById('controls-modal');
                break;
        }

        if (!container) {
            this.focusableElements = [];
            return;
        }

        if (currentState === UIState.Settings) {
            this.settingTabs = Array.from(container.querySelectorAll('.control-tab[data-settings]'));
            
            if (this.activeTabIndex === -1) {
                this.activeTabIndex = this.uiManager.getCurrentSettingsSection();
            }

            const activeTab = this.settingTabs[this.activeTabIndex];
            const sectionName = activeTab.dataset.settings;
            const activeSection = document.getElementById(`${sectionName}-settings-section`);
            const backButton = document.getElementById('back-button-settings');

            let sectionElements: HTMLElement[] = [];
            if (activeSection) {
                sectionElements = Array.from(activeSection.querySelectorAll<HTMLElement>('[data-focusable="true"]'));
            }

            this.focusableElements = [...this.settingTabs, ...sectionElements];
            if (backButton) {
                this.focusableElements.push(backButton);
            }
        } else if (currentState === UIState.Controls) {
            this.settingTabs = Array.from(container.querySelectorAll('.control-tab'));
            const closeButton = document.getElementById('btn-close-controls');
            const backButton = document.getElementById('back-button-controls');
            this.focusableElements = [...this.settingTabs];
            if (backButton) {
                this.focusableElements.push(backButton);
            }
            if (closeButton) {
                this.focusableElements.push(closeButton);
            }
        } else {
            this.focusableElements = Array.from(container.querySelectorAll('[data-focusable="true"]'));
        }
    }

    private setFocus(index: number): void {
        if (this.currentlyFocusedElement) {
            this.currentlyFocusedElement.classList.remove('focused');
        }

        this.currentFocusIndex = index;

        if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableElements.length) {
            const newElement = this.focusableElements[this.currentFocusIndex];
            newElement.classList.add('focused');
            newElement.focus(); // For native focus handling on inputs/selects
            this.currentlyFocusedElement = newElement;
        } else {
            this.currentlyFocusedElement = null;
        }
    }

    public navigateDown(): void {
        if (this.focusableElements.length === 0) return;
        const currentState = this.uiManager.getCurrentState();
    
        if (currentState === UIState.Settings) {
            // If a tab is focused, move to the first item in its section
            const isTabFocused = this.currentFocusIndex >= 0 && this.currentFocusIndex < this.settingTabs.length;
            if (isTabFocused) {
                // The first actual setting is right after the last tab
                const firstSettingIndex = this.settingTabs.length;
                if (firstSettingIndex < this.focusableElements.length) {
                    this.setFocus(firstSettingIndex);
                }
            } else {
                // Cycle through settings or wrap around
                const newIndex = (this.currentFocusIndex + 1);
                if (newIndex >= this.focusableElements.length) {
                    this.setFocus(this.activeTabIndex); // Wrap back to the active tab
                } else {
                    this.setFocus(newIndex);
                }
            }
        } else if (currentState === UIState.Controls) {
            const tabCount = this.settingTabs.length;
            const backButtonIndex = tabCount;
            const closeButtonIndex = tabCount + 1;
            const isTabFocused = this.currentFocusIndex >= 0 && this.currentFocusIndex < tabCount;

            if (isTabFocused) {
                this.setFocus(backButtonIndex); // From tab to Back button
            } else if (this.currentFocusIndex === backButtonIndex) {
                this.setFocus(closeButtonIndex); // From Back to Close button
            } else {
                this.setFocus(this.activeTabIndex); // From Close button to active tab
            }
        } else {
            const newIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
            this.setFocus(newIndex);
        }
    }
    
    public navigateUp(): void {
        if (this.focusableElements.length === 0) return;
        const currentState = this.uiManager.getCurrentState();
    
        if (currentState === UIState.Settings) {
            const isTabFocused = this.currentFocusIndex >= 0 && this.currentFocusIndex < this.settingTabs.length;
            if (!isTabFocused) {
                 // If we are on the first setting, go back to the active tab
                const firstSettingIndex = this.settingTabs.length;
                if (this.currentFocusIndex === firstSettingIndex) {
                    this.setFocus(this.activeTabIndex);
                } else {
                    // Cycle backwards through settings
                    const newIndex = (this.currentFocusIndex - 1);
                    this.setFocus(newIndex);
                }
            }
        } else if (currentState === UIState.Controls) {
            const tabCount = this.settingTabs.length;
            const backButtonIndex = tabCount;
            const closeButtonIndex = tabCount + 1;
            const isTabFocused = this.currentFocusIndex >= 0 && this.currentFocusIndex < tabCount;

            if (isTabFocused) {
                this.setFocus(closeButtonIndex); // From tab to Close button
            } else if (this.currentFocusIndex === closeButtonIndex) {
                this.setFocus(backButtonIndex); // From Close to Back button
            } else {
                this.setFocus(this.activeTabIndex); // From Back button to active tab
            }
        } else {
            const newIndex = (this.currentFocusIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
            this.setFocus(newIndex);
        }
    }

    public navigate(direction: 'left' | 'right'): void {
        if (this.currentlyFocusedElement instanceof HTMLSelectElement) {
            const select = this.currentlyFocusedElement;
            let newIndex = select.selectedIndex;
            if (direction === 'left') {
                newIndex = Math.max(0, select.selectedIndex - 1);
            } else { // 'right'
                newIndex = Math.min(select.options.length - 1, select.selectedIndex + 1);
            }
            if (newIndex !== select.selectedIndex) {
                select.selectedIndex = newIndex;
                select.dispatchEvent(new Event('change'));
            }
            return;
        }

        if (this.currentlyFocusedElement instanceof HTMLInputElement && this.currentlyFocusedElement.type === 'range') {
             const slider = this.currentlyFocusedElement;
             const step = slider.step ? parseFloat(slider.step) : 1;
             let value = parseFloat(slider.value);
             if (direction === 'left') {
                 value = Math.max(parseFloat(slider.min), value - step);
             } else { // 'right'
                 value = Math.min(parseFloat(slider.max), value + step);
             }
             if (value !== parseFloat(slider.value)) {
                 slider.value = String(value);
                 slider.dispatchEvent(new Event('input')); // Use 'input' for live updates
             }
             return;
        }

        if (this.uiManager.getCurrentState() !== UIState.Settings && this.uiManager.getCurrentState() !== UIState.Controls) return;

        const isTabFocused = this.currentFocusIndex >= 0 && this.currentFocusIndex < this.settingTabs.length;
        if (isTabFocused) {
            let newTabIndex = this.activeTabIndex;
            if (direction === 'left') {
                newTabIndex = (this.activeTabIndex - 1 + this.settingTabs.length) % this.settingTabs.length;
            } else {
                newTabIndex = (this.activeTabIndex + 1) % this.settingTabs.length;
            }

            // Simulate a click on the new tab to trigger the visual change
            this.settingTabs[newTabIndex].click(); 
            this.activeTabIndex = newTabIndex;
            
            // After tab switch, rebuild focusable elements and focus the new active tab
            this.updateFocusableElements();
            this.setFocus(this.activeTabIndex);
        }
    }

    public select(): void {
        if (this.currentlyFocusedElement) {
            this.currentlyFocusedElement.click();
        }
    }
}