// src/ui/input/UINavigator.ts
import { UIState, UIStateManager } from '../state';

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
        this.updateFocusableElements();

        if (this.focusableElements.length > 0) {
            // In settings, focus the first tab by default
            if (newState === UIState.Settings && this.settingTabs.length > 0) {
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
        }

        if (!container) {
            this.focusableElements = [];
            return;
        }

        if (currentState === UIState.Settings) {
            this.settingTabs = Array.from(container.querySelectorAll('.control-tab[data-settings]'));
            
            if (this.activeTabIndex === -1) this.activeTabIndex = 0; // Default to first tab

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

        if (this.uiManager.getCurrentState() === UIState.Settings) {
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
        } else {
            const newIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
            this.setFocus(newIndex);
        }
    }

    public navigateUp(): void {
        if (this.focusableElements.length === 0) return;

        if (this.uiManager.getCurrentState() === UIState.Settings) {
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
        } else {
            const newIndex = (this.currentFocusIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
            this.setFocus(newIndex);
        }
    }

    public navigate(direction: 'left' | 'right'): void {
        if (this.uiManager.getCurrentState() !== UIState.Settings) return;

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