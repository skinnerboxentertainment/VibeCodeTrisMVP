// src/ui/state.ts

export enum UIState {
    MainMenu,
    InGame,
    Paused,
    Settings,
    GameOver,
    Soundboard,
    ToneJammer,
}

export interface VisualSettings {
    colorPalette: 'default' | 'deuteranopia' | 'protanopia' | 'tritanopia';
    blockStyle: 'modern' | 'classic' | 'nes' | 'faceted-gem';
    highContrast: boolean;
    distinctPatterns: boolean;
    pieceOutline: boolean;
    solidPieces: boolean;
    isGhostPieceEnabled: boolean;
    isLineClearAnimationEnabled: boolean;
    lineClearAnimation: string;
    lineClearText: boolean;
    multiplierEffect: 'default' | 'scanline' | 'none' | 'scanline_terminal' | 'vhs_glitch';
}

export class UIStateManager {
    private currentState: UIState;
    private viewElements: Map<UIState, HTMLElement>;
    private visualSettings: VisualSettings = {
        colorPalette: 'default',
        blockStyle: 'modern',
        highContrast: false,
        distinctPatterns: false,
        pieceOutline: false,
        solidPieces: false,
        isGhostPieceEnabled: true,
        isLineClearAnimationEnabled: true,
        lineClearAnimation: 'Center-Out Wipe', // Default animation
        lineClearText: true,
        multiplierEffect: 'default',
    };
    private subscribers: ((settings: VisualSettings) => void)[] = [];
    private stateSubscribers: Set<(newState: UIState, oldState: UIState) => void> = new Set();
    private previousState: UIState;

    constructor() {
        this.currentState = UIState.MainMenu;
        this.previousState = UIState.MainMenu;
        this.viewElements = new Map();

        // Get all the view containers from the DOM
        const mainMenu = document.getElementById('main-menu');
        const inGame = document.getElementById('in-game');
        const settings = document.getElementById('settings-screen');
        const gameOver = document.getElementById('game-over-screen');
        const soundboard = document.getElementById('soundboard-screen');
        const toneJammer = document.getElementById('tone-jammer-screen');
        const pauseOverlay = document.getElementById('pause-overlay');

        if (!mainMenu || !inGame || !settings || !gameOver || !soundboard || !toneJammer || !pauseOverlay) {
            throw new Error('One or more UI view elements are missing from the DOM.');
        }

        this.viewElements.set(UIState.MainMenu, mainMenu);
        this.viewElements.set(UIState.InGame, inGame);
        this.viewElements.set(UIState.Settings, settings);
        this.viewElements.set(UIState.GameOver, gameOver);
        this.viewElements.set(UIState.Soundboard, soundboard);
        this.viewElements.set(UIState.ToneJammer, toneJammer);
        this.viewElements.set(UIState.Paused, pauseOverlay);


        // Set the initial state visibility
        this.updateVisibility();
    }

    public changeState(newState: UIState): void {
        console.log(`Changing UI state to: ${UIState[newState]}`);
        if (this.currentState === newState) {
            return; // No change
        }
        
        this.previousState = this.currentState;
        this.currentState = newState;
        this.updateVisibility();
        this.stateSubscribers.forEach(cb => cb(newState, this.previousState));
    }



    public getCurrentState(): UIState {
        return this.currentState;
    }

    public getPreviousState(): UIState {
        return this.previousState;
    }

    private updateVisibility(): void {
        for (const [state, element] of this.viewElements.entries()) {
            let isVisible = false;
    
            if (this.currentState === UIState.Paused) {
                isVisible = (state === UIState.InGame || state === UIState.Paused);
            } else if (this.currentState === UIState.Settings && this.previousState === UIState.Paused) {
                isVisible = (state === UIState.InGame || state === UIState.Settings);
            } else {
                isVisible = (state === this.currentState);
            }
    
            if (isVisible) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    }

    public getVisualSettings(): VisualSettings {
        return this.visualSettings;
    }

    public updateVisualSettings(newSettings: Partial<VisualSettings>): void {
        this.visualSettings = { ...this.visualSettings, ...newSettings };
        this.subscribers.forEach(cb => cb(this.visualSettings));
    }

    public subscribeToVisualSettings(callback: (settings: VisualSettings) => void): void {
        this.subscribers.push(callback);
        callback(this.visualSettings); // Immediately notify with current state
    }

    public subscribeToStateChanges(callback: (newState: UIState, oldState: UIState) => void): void {
        this.stateSubscribers.add(callback);
    }

    public unsubscribeFromStateChanges(callback: (newState: UIState, oldState: UIState) => void): void {
        this.stateSubscribers.delete(callback);
    }
}
