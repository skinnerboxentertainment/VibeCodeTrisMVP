// src/main.ts
import { PixiRenderer } from './renderer/pixiRenderer';
import { InputManager } from './ui/input/InputManager';
import { UIStateManager, UIState, VisualSettings, SettingsSection } from './ui/state';
import { AccessibilityManager } from './ui/accessibility';
import { AudioEngine } from './audio/AudioEngine';
import { AudioConfig } from './audio/types';
import { AnimationManager } from './renderer/animations/AnimationManager';
import { ToneJammerManager } from './ui/tone-jammer';
import { NotificationManager } from './ui/NotificationManager';
import { initializeControlsPanel } from './ui/controls';

// Force :active styles to work on touch devices
document.addEventListener('touchstart', () => {}, { passive: true });

function validateUIElements(elements: { [key: string]: HTMLElement | null }): void {
    for (const key in elements) {
        if (!elements[key]) {
            throw new Error(`UI element not found: ${key}`);
        }
    }
}

function initializeSettingsTabs(uiManager: UIStateManager) {
    const tabs = document.querySelectorAll<HTMLButtonElement>('#settings-form .control-tab');
    const sections = {
        gameplay: document.getElementById('gameplay-settings-section'),
        visuals: document.getElementById('visuals-settings-section'),
        audio: document.getElementById('audio-settings-section'),
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const setting = tab.dataset.settings;

            // Update tab active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide sections
            for (const key in sections) {
                const section = sections[key as keyof typeof sections];
                if (section) {
                    section.classList.toggle('hidden', key !== setting);
                }
            }

            // Update the UIStateManager
            if (setting === 'gameplay') {
                uiManager.setCurrentSettingsSection(SettingsSection.Gameplay);
            } else if (setting === 'visuals') {
                uiManager.setCurrentSettingsSection(SettingsSection.Visuals);
            } else if (setting === 'audio') {
                uiManager.setCurrentSettingsSection(SettingsSection.Audio);
            }
        });
    });
}

async function main() {
    const uiManager = new UIStateManager();
    const notificationManager = new NotificationManager();
    const inputManager = new InputManager(notificationManager, uiManager);
    const accessibilityManager = new AccessibilityManager(document.body);
    const animationManager = new AnimationManager(); // Initialize AnimationManager

    // Placeholder Audio Configuration (from VibeCodeTris_Procedural_Audio_Spec.md)
    const audioConfig: AudioConfig = {
        meta: { name: "VibeCodeTris_Audio", tempo: 100, timeSignature: "4/4" as any },
        scales: {
            default: { root: 60, pattern: "majorPent" }, // C3 Major Pentatonic
        },
        instruments: [
            { id: "pieceSpawnSynth", type: "synth", preset: { harmonicity: 1.5, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } } as any, maxVoices: 6, gain: 0.6 },
            { id: "pieceLockSynth", type: "synth", preset: { pitchDecay: 0.05, octaves: 10, oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 } } as any, maxVoices: 6, gain: 0.7 },
            { id: "lineClearSynth", type: "synth", preset: { harmonicity: 1.2, modulationIndex: 10, envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.8 } } as any, maxVoices: 4, gain: 0.8, effects: { sendReverb: 0.4 } },
            { id: "gameOverSynth", type: "synth", preset: { oscillator: { type: "triangle" }, envelope: { attack: 0.05, decay: 0.8, sustain: 0.2, release: 1.0 } } as any, maxVoices: 1, gain: 0.5, effects: { sendReverb: 0.4 } },
            // New synth for the Piece Melody system, designed for a short, percussive "pluck" sound.
            { id: "pieceMovementSynth", type: "synth", preset: { oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 } } as any, maxVoices: 8, gain: 0.5 },
        ],
        rules: {
            pieceSpawn: {
                id: "pieceSpawn",
                instrumentId: "pieceSpawnSynth",
                description: "Plays when a new piece spawns",
                pitchSource: { type: "mapIndex", mapKey: "type" },
                rhythm: { mode: "onEvent" },
                probability: 1,
                velocity: { min: 0.6, max: 0.9 },
                duration: "16n",
            },
            pieceLock: {
                id: "pieceLock",
                instrumentId: "pieceLockSynth",
                description: "Plays when a piece locks",
                pitchSource: { type: "random", maxIndex: 3 },
                rhythm: { mode: "onEvent" },
                probability: 1,
                velocity: { min: 0.7, max: 1.0 },
                duration: "8n",
            },
            lineClear: {
                id: "lineClear",
                instrumentId: "lineClearSynth",
                description: "Plays when lines are cleared",
                pitchSource: { type: "random", maxIndex: 5 }, 
                rhythm: { mode: "onEvent" },
                probability: 1,
                velocity: { min: 0.8, max: 1.0 },
                duration: "4n",
            },
            gameOver: {
                id: "gameOver",
                instrumentId: "gameOverSynth",
                description: "Plays when game is over",
                pitchSource: { type: "mapIndex", mapKey: "level" },
                rhythm: { mode: "onEvent" },
                probability: 1,
                velocity: { min: 0.9, max: 1.0 },
                duration: "1n",
            },
        },
    };

    const gameSeed = Math.floor(Math.random() * 1_000_000_000); // Use a consistent seed for audio
    const audioEngine = new AudioEngine(gameSeed, audioConfig);
    let renderer: PixiRenderer | null = null;
    const gameContainer = document.getElementById('game-container');
    const appContainer = document.getElementById('app-container');
    const touchControls = document.getElementById('touch-controls');

    if (!gameContainer || !appContainer || !touchControls) {
        throw new Error('Core container elements not found');
    }

    let isAudioInitialized = false;
    const initializeAudio = async () => {
        if (!isAudioInitialized) {
            await audioEngine.initializeAudioContext();
            isAudioInitialized = true;
        }
    };

    const handleResize = () => {
        // Fix mobile viewport height issue
        document.body.style.height = `${window.innerHeight}px`;

        if (!renderer) return;

        // Let CSS handle the layout. Read the size directly from the container.
        let newWidth = gameContainer.clientWidth;
        let newHeight = gameContainer.clientHeight;

        // On mobile portrait, if height seems compressed, calculate based on viewport
        const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
        const touchControlsHeight = touchControls.offsetHeight || 0;
        const minGameHeight = 300; // Minimum reasonable game area height

        if (isMobilePortrait && newHeight < minGameHeight) {
            // Use viewport height minus touch controls and padding
            const availableHeight = window.innerHeight - touchControlsHeight - 20;
            newHeight = Math.max(availableHeight, minGameHeight);
        }

        const scale = window.devicePixelRatio;
        
        renderer.resize(newWidth * scale, newHeight * scale);
        if (renderer.app.view.style) {
            renderer.app.view.style.width = `${newWidth}px`;
            renderer.app.view.style.height = `${newHeight}px`;
        }
    };

    const startGame = async () => {
        await initializeAudio();
        if (renderer) {
            renderer.destroy();
            renderer = null;
        }
        
        uiManager.changeState(UIState.InGame);
        
        while (gameContainer.firstChild) {
            gameContainer.removeChild(gameContainer.firstChild);
        }

        renderer = await PixiRenderer.create(gameContainer, uiManager, accessibilityManager, audioEngine);
        
        setTimeout(() => {
            handleResize();
            if (renderer) {
                renderer.start();
            }
            accessibilityManager.announce('Game started.');
        }, 50);
    };

    // --- Get UI Elements ---
    const uiElements = {
        playButton: document.getElementById('play-button'),
        settingsButton: document.getElementById('settings-button'),
        settingsButtonPause: document.getElementById('settings-button-pause'),
        soundboardButton: document.getElementById('soundboard-button'),
        toneJammerButton: document.getElementById('tone-jammer-button'),
        backButtonSettings: document.getElementById('back-button-settings'),
        backButtonSoundboard: document.getElementById('back-button-soundboard'),
        backButtonToneJammer: document.getElementById('back-button-tone-jammer'),
        playAgainButton: document.getElementById('play-again-button'),
        mainMenuButton: document.getElementById('main-menu-button'),
        resumeButton: document.getElementById('resume-button'),
        quitButton: document.getElementById('quit-button'),
        aboutButton: document.getElementById('about-button'),
        aboutPanel: document.getElementById('about-panel'),
        backButtonAbout: document.getElementById('back-button-about'),
        githubButton: document.getElementById('github-button'),
        dasSlider: document.getElementById('das-slider'),
        arrSlider: document.getElementById('arr-slider'),
        dasValue: document.getElementById('das-value'),
        arrValue: document.getElementById('arr-value'),
        colorPaletteSelect: document.getElementById('color-palette-select'),
        blockStyleSelect: document.getElementById('block-style-select'),
        highContrastCheckbox: document.getElementById('high-contrast-checkbox'),
        distinctPatternsCheckbox: document.getElementById('distinct-patterns-checkbox'),
        pieceOutlineCheckbox: document.getElementById('piece-outline-checkbox'),
        solidPiecesCheckbox: document.getElementById('solid-pieces-checkbox'),
        ghostPieceCheckbox: document.getElementById('ghost-piece-checkbox'),
        animatedLineClearCheckbox: document.getElementById('animated-line-clear-checkbox'),
        lineClearAnimationSelect: document.getElementById('line-clear-animation-select'),
        lineClearTextCheckbox: document.getElementById('line-clear-text-checkbox'),
        multiplierEffectSelect: document.getElementById('multiplier-effect-select'),
        testSpawnSynthButton: document.getElementById('test-spawn-synth'),
        testLockSynthButton: document.getElementById('test-lock-synth'),
        testClearSynthButton: document.getElementById('test-clear-synth'),
        testMovementSynthButton: document.getElementById('test-movement-synth'),
        testGameOverSynthButton: document.getElementById('test-gameover-synth'),
    };

    // Tone Jammer UI Elements
    const jammerElements = {
        loadPreset: document.getElementById('jammer-load-preset'),
        livePreview: document.getElementById('jammer-live-preview'),
        previewPitch: document.getElementById('jammer-preview-pitch'),
        play: document.getElementById('jammer-play'),
        randomizeAll: document.getElementById('jammer-randomize-all'),
        copy: document.getElementById('jammer-copy'),
        update: document.getElementById('jammer-update'),
        id: document.getElementById('jammer-id'),
        gain: document.getElementById('jammer-gain'),
        maxVoices: document.getElementById('jammer-max-voices'),
        reverb: document.getElementById('jammer-reverb'),
        waveform: document.getElementById('jammer-waveform'),
        envAttack: document.getElementById('jammer-env-attack'),
        envDecay: document.getElementById('jammer-env-decay'),
        envSustain: document.getElementById('jammer-env-sustain'),
        envRelease: document.getElementById('jammer-env-release'),
    };

    validateUIElements(uiElements);
    validateUIElements(jammerElements);

    const toneJammerManager = new ToneJammerManager(audioConfig, audioEngine, jammerElements as any);

    initializeControlsPanel(uiManager, 'controls-button-pause');
    initializeSettingsTabs(uiManager);

    // Populate line clear animation dropdown
    animationManager.getAnimationNames().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        (uiElements.lineClearAnimationSelect as HTMLSelectElement).appendChild(option);
    });

    // Set initial settings values
    const initialSettings = uiManager.getVisualSettings();
    (uiElements.colorPaletteSelect as HTMLSelectElement).value = initialSettings.colorPalette;
    (uiElements.blockStyleSelect as HTMLSelectElement).value = initialSettings.blockStyle;
    (uiElements.highContrastCheckbox as HTMLInputElement).checked = initialSettings.highContrast;
    (uiElements.distinctPatternsCheckbox as HTMLInputElement).checked = initialSettings.distinctPatterns;
    (uiElements.pieceOutlineCheckbox as HTMLInputElement).checked = initialSettings.pieceOutline;
    (uiElements.solidPiecesCheckbox as HTMLInputElement).checked = initialSettings.solidPieces;
    (uiElements.ghostPieceCheckbox as HTMLInputElement).checked = initialSettings.isGhostPieceEnabled;
    (uiElements.animatedLineClearCheckbox as HTMLInputElement).checked = initialSettings.isLineClearAnimationEnabled;
    (uiElements.lineClearAnimationSelect as HTMLSelectElement).value = initialSettings.lineClearAnimation;
    (uiElements.multiplierEffectSelect as HTMLSelectElement).value = initialSettings.multiplierEffect;

    // --- Event Listeners ---
    let previousState: UIState = UIState.MainMenu;

    uiElements.playButton!.addEventListener('click', async () => {
        try {
            await initializeAudio(); // Initialize audio on first user interaction
            await startGame();
        } catch (error: any) {
            console.error("Failed to start game:", error);
            notificationManager.show(`Error starting game: ${error.message}`);
            alert(`Error starting game: ${error.message}`); // Force error visibility
        }
    });
    uiElements.playAgainButton!.addEventListener('click', async () => {
        try {
            await startGame();
        } catch (error: any) {
            console.error("Failed to start game:", error);
            notificationManager.show(`Error starting game: ${error.message}`);
            alert(`Error starting game: ${error.message}`); // Force error visibility
        }
    });
    uiElements.mainMenuButton!.addEventListener('click', () => {
        if (renderer) {
            renderer.destroy();
            renderer = null;
        }
        uiManager.changeState(UIState.MainMenu);
        accessibilityManager.announce('Game over. Main menu.');
    });
    uiElements.settingsButton!.addEventListener('click', async () => {
        await initializeAudio();
        previousState = uiManager.getCurrentState();
        uiManager.changeState(UIState.Settings);
        accessibilityManager.announce('Settings menu.');
    });
    uiElements.settingsButtonPause!.addEventListener('click', async () => {
        await initializeAudio();
        previousState = uiManager.getCurrentState();
        uiManager.changeState(UIState.Settings);
        accessibilityManager.announce('Settings menu.');
    });
    uiElements.soundboardButton!.addEventListener('click', async () => {
        await initializeAudio();
        uiManager.changeState(UIState.Soundboard);
        accessibilityManager.announce('Soundboard menu.');
    });
    uiElements.toneJammerButton!.addEventListener('click', async () => {
        await initializeAudio();
        uiManager.changeState(UIState.ToneJammer);
        accessibilityManager.announce('Tone Jammer menu.');
    });
    uiElements.backButtonSettings!.addEventListener('click', () => {
        uiManager.changeState(previousState);
        accessibilityManager.announce('Main menu.');
    });
    uiElements.backButtonSoundboard!.addEventListener('click', () => {
        uiManager.changeState(UIState.MainMenu);
        accessibilityManager.announce('Main menu.');
    });
    uiElements.backButtonToneJammer!.addEventListener('click', () => {
        uiManager.changeState(UIState.MainMenu);
        accessibilityManager.announce('Main menu.');
    });
    uiElements.resumeButton!.addEventListener('click', () => {
        uiManager.changeState(UIState.InGame);
        accessibilityManager.announce('Game resumed.');
    });
    uiElements.quitButton!.addEventListener('click', () => {
        uiManager.changeState(UIState.MainMenu);
        accessibilityManager.announce('Quitting to main menu.');
    });
    uiElements.aboutButton!.addEventListener('click', () => {
        uiElements.aboutPanel?.classList.remove('hidden');
        accessibilityManager.announce('About panel opened.');
    });

    uiElements.backButtonAbout!.addEventListener('click', () => {
        uiElements.aboutPanel?.classList.add('hidden');
        accessibilityManager.announce('About panel closed.');
    });

    uiElements.githubButton!.addEventListener('click', () => {
        window.open('https://github.com/skinnerboxentertainment/VibeCodeTrisMVP', '_blank');
        accessibilityManager.announce('Opening GitHub repository in a new tab.');
    });

    // Tone Jammer Listeners
    (jammerElements.loadPreset as HTMLSelectElement).addEventListener('change', (e) => {
        const presetId = (e.target as HTMLSelectElement).value;
        if (presetId) {
            toneJammerManager.loadPreset(presetId);
        }
    });

    // Soundboard listeners
    uiElements.testSpawnSynthButton!.addEventListener('click', () => audioEngine.playSpawnSound());
    uiElements.testLockSynthButton!.addEventListener('click', () => audioEngine.playLockSound());
    uiElements.testClearSynthButton!.addEventListener('click', () => audioEngine.playClearSound());
    uiElements.testMovementSynthButton!.addEventListener('click', () => audioEngine.playMovementSound());
    uiElements.testGameOverSynthButton!.addEventListener('click', () => audioEngine.playGameOverSound());
    document.getElementById('test-music-box-synth')?.addEventListener('click', () => audioEngine.playMusicBoxTest());
    document.getElementById('test-dream-celesta-synth')?.addEventListener('click', () => audioEngine.playDreamCelestaTest());
    document.getElementById('test-dream-celesta-spawn-synth')?.addEventListener('click', () => audioEngine.playDreamCelestaSpawnSound());
    document.getElementById('test-toy-piano-synth')?.addEventListener('click', () => audioEngine.playToyPianoTest());

    const updateTimings = () => {
        const das = parseInt((uiElements.dasSlider as HTMLInputElement).value, 10);
        const arr = parseInt((uiElements.arrSlider as HTMLInputElement).value, 10);
        uiElements.dasValue!.textContent = das.toString();
        uiElements.arrValue!.textContent = arr.toString();
        inputManager.updateTimings(das, arr); 
    };

    uiElements.dasSlider!.addEventListener('input', updateTimings);
    uiElements.arrSlider!.addEventListener('input', updateTimings);

    (uiElements.colorPaletteSelect as HTMLSelectElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ colorPalette: (uiElements.colorPaletteSelect as HTMLSelectElement).value as VisualSettings['colorPalette'] });
    });

    (uiElements.blockStyleSelect as HTMLSelectElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ blockStyle: (uiElements.blockStyleSelect as HTMLSelectElement).value as VisualSettings['blockStyle'] });
    });

    (uiElements.highContrastCheckbox as HTMLInputElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ highContrast: (uiElements.highContrastCheckbox as HTMLInputElement).checked });
    });

    (uiElements.distinctPatternsCheckbox as HTMLInputElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ distinctPatterns: (uiElements.distinctPatternsCheckbox as HTMLInputElement).checked });
    });

    (uiElements.pieceOutlineCheckbox as HTMLInputElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ pieceOutline: (uiElements.pieceOutlineCheckbox as HTMLInputElement).checked });
    });

    (uiElements.solidPiecesCheckbox as HTMLInputElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ solidPieces: (uiElements.solidPiecesCheckbox as HTMLInputElement).checked });
    });

    (uiElements.ghostPieceCheckbox as HTMLInputElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ isGhostPieceEnabled: (uiElements.ghostPieceCheckbox as HTMLInputElement).checked });
    });

    (uiElements.animatedLineClearCheckbox as HTMLInputElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ isLineClearAnimationEnabled: (uiElements.animatedLineClearCheckbox as HTMLInputElement).checked });
    });

    (uiElements.lineClearTextCheckbox as HTMLInputElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ lineClearText: (uiElements.lineClearTextCheckbox as HTMLInputElement).checked });
    });

    (uiElements.multiplierEffectSelect as HTMLSelectElement).addEventListener('change', () => {
        uiManager.updateVisualSettings({ multiplierEffect: (uiElements.multiplierEffectSelect as HTMLSelectElement).value as VisualSettings['multiplierEffect'] });
    });
}

main().catch(error => {
    console.error("Unhandled error in main:", error);
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.textContent = `Fatal Error: ${error.message}. Please refresh the page.`;
        errorContainer.style.display = 'block';
    }
});
