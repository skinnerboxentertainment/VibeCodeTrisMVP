// src/renderer/pixiRenderer.ts
import * as PIXI from 'pixi.js';
import { renderAPI } from './renderAPI';
import { COLS, ROWS, BLOCK_SIZE, BOARD_WIDTH, BOARD_HEIGHT, LINE_CLEAR_DELAY_TICKS, MULTIPLIER_DECAY_DELAY_TICKS } from '../logic/constants';
import { GameEvent, Snapshot, GameStatus } from '../logic/types';
import { UIStateManager, UIState, VisualSettings } from '../ui/state';
import { AccessibilityManager } from '../ui/accessibility';
import { AudioEngine } from '../audio/AudioEngine';
import { AnimationManager } from './animations/AnimationManager';
import { LineClearTextAnimation } from './animations/LineClearTextAnimation';
import { LineClearScoreAnimation } from './animations/LineClearScoreAnimation'; // New import
import { MultiplierAnimation } from './animations/MultiplierAnimation';
import { PieceScoreAnimation } from './animations/PieceScoreAnimation';
import { PIECE_TYPES, PIECE_SHAPES } from '../logic/engine'; // Import PIECE_TYPES and PIECE_SHAPES
import { PIXEL_FONT, PIXEL_FONT_GEOMETRY, PixelFontCharGeometry } from './pixel-font-geometry';
import { calculateScore } from '../logic/rules'; // New import
import { IMultiplierEffect } from './animations/multiplier/types';
import { DefaultMultiplierEffect } from
    './animations/multiplier/DefaultMultiplierEffect';
import { ScanlineMultiplierEffect } from
    './animations/multiplier/ScanlineMultiplierEffect';
import { NoneMultiplierEffect } from
    './animations/multiplier/NoneMultiplierEffect';
import { ScanlineTerminalMultiplierEffect } from './animations/multiplier/ScanlineTerminalMultiplierEffect';
import { VhsGlitchMultiplierEffect } from './animations/multiplier/VhsGlitchMultiplierEffect';

const BORDER_WIDTH = 2;
const TEXT_VERTICAL_OFFSET = 5; // Pixels to shift UI text down
const TEXT_HORIZONTAL_OFFSET = 5; // Pixels to shift level right and lines left

const THEMES = {
    default: [
        0x1a1a1a, 0x00FFFF, 0x0000FF, 0xFFA500, 0xFFFF00, 0x00FF00, 0x800080, 0xFF0000,
    ],
    // Paul Tol's vibrant color scheme
    deuteranopia: [
        0x1a1a1a, 0x4477AA, 0xEE6677, 0x228833, 0xCCBB44, 0x66CCEE, 0xAA3377, 0xBBBBBB,
    ],
    protanopia: [
        0x1a1a1a, 0x4477AA, 0xEE6677, 0x228833, 0xCCBB44, 0x66CCEE, 0xAA3377, 0xBBBBBB,
    ],
    // Okabe-Ito color scheme
    tritanopia: [
        0x1a1a1a, 0x0072B2, 0xD55E00, 0x009E73, 0xF0E442, 0x56B4E9, 0xE69F00, 0xCC79A7,
    ],
};

export class PixiRenderer {
    public app: PIXI.Application;
    public boardBlocks: PIXI.Graphics[] = [];
    private backgroundWellContainer: PIXI.Container;
    private backgroundWellSprites: PIXI.Graphics[] = [];
    private foregroundWellContainer: PIXI.Container;
    private foregroundWellSprites: PIXI.Graphics[] = [];
    private _multiplierEffectContainer: PIXI.Container;
    public patternSprites: PIXI.Sprite[] = [];
    private boardContainer: PIXI.Container;
    private pieceOutlineContainer: PIXI.Graphics;
    private lineClearContainer: PIXI.Graphics;
    private uiManager: UIStateManager;
    private accessibilityManager: AccessibilityManager;
    private audioEngine: AudioEngine; // Added AudioEngine
    private animationManager: AnimationManager;
    private lastAnnouncedLevel: number = 1;
    private lastMultiplier: number = 1;
    private visualSettings: VisualSettings;
    private patternTextures: PIXI.Texture[] = [];
    private lastSnapshot: Snapshot | null = null;
    private prevClearedLines: number[] | null = null;
    private uiTextContainer: PIXI.Container;
    private scoreText: PIXI.Text;
    private levelText: PIXI.Text;
    private linesText: PIXI.Text;
    private scoreLabel: PIXI.Text;
    private levelLabel: PIXI.Text;
    private linesLabel: PIXI.Text;
    private multiplierText: PIXI.Text;
    private pauseButton: PIXI.Text;
    private _stateChangeCallback: ((newState: UIState, oldState: UIState) => void) | null = null;
    private _displayScore = 0;
    private _currentMultiplierEffect: IMultiplierEffect | null = null;
    private _lastMultiplierEffectType: 'default' | 'scanline' | 'none' = 'default';

    private constructor(uiManager: UIStateManager, accessibilityManager: AccessibilityManager, initialSettings: VisualSettings, audioEngine: AudioEngine) {
        this.app = new PIXI.Application();
        this.boardContainer = new PIXI.Container();
        this.pieceOutlineContainer = new PIXI.Graphics();
        this.lineClearContainer = new PIXI.Graphics();
        this.uiManager = uiManager;
        this.accessibilityManager = accessibilityManager;
        this.visualSettings = initialSettings;
        this.audioEngine = audioEngine; // Assign AudioEngine
        this.animationManager = new AnimationManager();
        this.uiTextContainer = new PIXI.Container();
        
        const textStyle = new PIXI.TextStyle({
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 20,
            fill: 'white',
            align: 'center',
        });

        const multiplierStyle = new PIXI.TextStyle({
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 16,
            fill: 'white',
            align: 'center',
        });

        const pieceScoreStyle = new PIXI.TextStyle({
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 14,
            fill: '#FFD700', // Gold color for piece score
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
        });

        const labelStyle = new PIXI.TextStyle({
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 12, // Smaller font size for labels
            fill: '#CCCCCC', // Lighter gray color
            align: 'center',
        });

        this.scoreText = new PIXI.Text({ text: '0', style: textStyle });
        this.levelText = new PIXI.Text({ text: '1', style: textStyle });
        this.linesText = new PIXI.Text({ text: '0', style: textStyle });
        this.scoreLabel = new PIXI.Text({ text: 'SCORE', style: labelStyle });
        this.levelLabel = new PIXI.Text({ text: 'LEVEL', style: labelStyle });
        this.linesLabel = new PIXI.Text({ text: 'LINES', style: labelStyle });
        this.multiplierText = new PIXI.Text({ text: 'x1', style: multiplierStyle });
        this.pauseButton = new PIXI.Text({ text: 'PAUSE', style: textStyle });
    }


    public static async create(
        container: HTMLElement, 
        uiManager: UIStateManager, 
        accessibilityManager: AccessibilityManager,
        audioEngine: AudioEngine // Added AudioEngine to create method
    ): Promise<PixiRenderer> {
        const initialSettings = uiManager.getVisualSettings();
        const renderer = new PixiRenderer(uiManager, accessibilityManager, initialSettings, audioEngine);
        await renderer.app.init({
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            backgroundColor: 0x000000,
            antialias: true,
        });
        container.appendChild(renderer.app.canvas);
        
        renderer.initBoard();
        renderer.initBackgroundWell();
        renderer.initForegroundWell();
        renderer.initText();

        renderer.app.stage.addChild(
            renderer.backgroundWellContainer, 
            renderer.boardContainer, 
            renderer.foregroundWellContainer,
            renderer.uiTextContainer
        );
        
        // Initialize the default multiplier effect after containers are ready
        renderer._currentMultiplierEffect = new DefaultMultiplierEffect();
        renderer._currentMultiplierEffect.init(renderer._multiplierEffectContainer);

        renderer.setupSubscriptions();
        
        // Subscribe to visual settings changes
        uiManager.subscribeToVisualSettings(settings => {
            renderer.onVisualSettingsChanged(settings);
        });
        
        return renderer;
    }

    private onVisualSettingsChanged(settings: VisualSettings) {
        const shouldGenerateTextures = settings.distinctPatterns && this.patternTextures.length === 0;
        const multiplierEffectChanged = this._lastMultiplierEffectType !== settings.multiplierEffect;
        this.visualSettings = settings;

        if (multiplierEffectChanged) {
            this._lastMultiplierEffectType = settings.multiplierEffect;

            if (this._currentMultiplierEffect) {
                this._currentMultiplierEffect.destroy();
            }

            switch (settings.multiplierEffect) {
                case 'scanline':
                    this._currentMultiplierEffect = new ScanlineMultiplierEffect();
                    break;
                case 'scanline_terminal':
                    this._currentMultiplierEffect = new ScanlineTerminalMultiplierEffect();
                    break;
                case 'vhs_glitch':
                    this._currentMultiplierEffect = new VhsGlitchMultiplierEffect();
                    break;
                case 'none':
                    this._currentMultiplierEffect = new NoneMultiplierEffect();
                    break;
                case 'default':
                default:
                    this._currentMultiplierEffect = new DefaultMultiplierEffect();
                    break;
            }
            this._currentMultiplierEffect.init(this._multiplierEffectContainer);
        }
        
        if (settings.lineClearAnimation) {
            this.animationManager.setAnimation(settings.lineClearAnimation);
        }
        
        if (shouldGenerateTextures) {
            this.generatePatternTextures();
        }
        
        // Force a redraw with the latest snapshot if available
        if (this.lastSnapshot) {
            this.drawBoard(this.lastSnapshot);
        }

        // Send the updated settings to the worker
        renderAPI.updateSettings(settings);
    }

    private generatePatternTextures() {
        this.patternTextures = []; // Clear existing textures
        const patterns = [
            null, // 0: Background
            (g: PIXI.Graphics) => { // I: Hollow Square
                g.rect(5, 5, BLOCK_SIZE - 10, BLOCK_SIZE - 10).stroke({ width: 3, color: 0xffffff });
            },
            (g: PIXI.Graphics) => { // J: Large Circle
                g.circle(BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 3).fill(0xffffff);
            },
            (g: PIXI.Graphics) => { // L: Upward Triangle
                const size = BLOCK_SIZE * 0.6;
                const x = BLOCK_SIZE / 2;
                const y = BLOCK_SIZE / 2;
                g.moveTo(x, y - size / 2)
                 .lineTo(x + size / 2, y + size / 2)
                 .lineTo(x - size / 2, y + size / 2)
                 .closePath()
                 .fill(0xffffff);
            },
            (g: PIXI.Graphics) => { // O: Plus Sign
                const barWidth = BLOCK_SIZE * 0.15;
                const barLength = BLOCK_SIZE * 0.7;
                const offset = (BLOCK_SIZE - barLength) / 2;
                g.rect(offset, (BLOCK_SIZE - barWidth) / 2, barLength, barWidth).fill(0xffffff);
                g.rect((BLOCK_SIZE - barWidth) / 2, offset, barWidth, barLength).fill(0xffffff);
            },
            (g: PIXI.Graphics) => { // S: Two Horizontal Circles
                const radius = BLOCK_SIZE / 6;
                g.circle(BLOCK_SIZE / 3, BLOCK_SIZE / 2, radius).fill(0xffffff);
                g.circle(BLOCK_SIZE * 2 / 3, BLOCK_SIZE / 2, radius).fill(0xffffff);
            },
            (g: PIXI.Graphics) => { // T: Hollow Diamond
                const size = BLOCK_SIZE / 2;
                const center = BLOCK_SIZE / 2;
                g.moveTo(center, center - size / 2)
                 .lineTo(center + size / 2, center)
                 .lineTo(center, center + size / 2)
                 .lineTo(center - size / 2, center)
                 .closePath()
                 .stroke({ width: 3, color: 0xffffff });
            },
            (g: PIXI.Graphics) => { // Z: Two Vertical Circles
                const radius = BLOCK_SIZE / 6;
                g.circle(BLOCK_SIZE / 2, BLOCK_SIZE / 3, radius).fill(0xffffff);
                g.circle(BLOCK_SIZE / 2, BLOCK_SIZE * 2 / 3, radius).fill(0xffffff);
            },
        ];

        patterns.forEach((p, index) => {
            if (index === 0 || !p) {
                this.patternTextures.push(PIXI.Texture.EMPTY);
                return;
            }
            const g = new PIXI.Graphics();
            g.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill({ color: 0xffffff, alpha: 0 });
            p(g);
            const texture = this.app.renderer.generateTexture(g);
            this.patternTextures.push(texture);
            g.destroy();
        });
    }

    private initBoard() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const block = new PIXI.Graphics();
                block.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE);
                this.boardContainer.addChild(block);
                this.boardBlocks.push(block);

                const patternSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
                patternSprite.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE);
                patternSprite.visible = false;
                this.boardContainer.addChild(patternSprite);
                this.patternSprites.push(patternSprite);
            }
        }
        this.boardContainer.addChild(this.pieceOutlineContainer);
        this.boardContainer.addChild(this.lineClearContainer);
    }

    private clearBackgroundWell(): void {
        for (const cell of this.backgroundWellSprites) {
            cell.clear();
            cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
            cell.fill({ color: 0x1a1a1a, alpha: 0.5 });
        }
    }

    private clearForegroundWell(): void {
        for (const cell of this.foregroundWellSprites) {
            cell.clear();
            cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
            cell.fill({ alpha: 0 });
        }
    }

    private initBackgroundWell(): void {
        this.backgroundWellContainer = new PIXI.Container();

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const cell = new PIXI.Graphics();
                // Explicitly set a uniform color to act as a reset, clearing any old patterns.
                const color = 0x1a1a1a; // A dark, near-black color
                const alpha = 0.5;
                cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
                cell.fill({ color, alpha });

                cell.x = x * BLOCK_SIZE;
                cell.y = y * BLOCK_SIZE;

                this.backgroundWellContainer.addChild(cell);
                this.backgroundWellSprites.push(cell);
            }
        }
    }

    private initForegroundWell(): void {
        this.foregroundWellContainer = new PIXI.Container();
        this._multiplierEffectContainer = new PIXI.Container();
        this.foregroundWellContainer.addChild(this._multiplierEffectContainer);

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const cell = new PIXI.Graphics();
                // Initially completely transparent
                cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill({ alpha: 0 });

                cell.x = x * BLOCK_SIZE;
                cell.y = y * BLOCK_SIZE;

                this.foregroundWellContainer.addChild(cell);
                this.foregroundWellSprites.push(cell);
            }
        }
    }

    private drawMultiplierOnWell(multiplier: number, multiplierDecayTimer: number, lastMultiplier: number): void {
        if (this._currentMultiplierEffect) {
            this._currentMultiplierEffect.draw(multiplier, multiplierDecayTimer, lastMultiplier);
        }
    }

    private initText() {
            this.uiTextContainer.addChild(
                this.scoreText, this.levelText, this.linesText, 
                this.scoreLabel, this.levelLabel, this.linesLabel, 
                this.multiplierText, this.pauseButton
            );
    
            this.levelText.anchor.set(0, 0);
            this.scoreText.anchor.set(0.5, 0);
            this.linesText.anchor.set(1, 0);
            this.levelLabel.anchor.set(0, 0);
            this.scoreLabel.anchor.set(0.5, 0);
            this.linesLabel.anchor.set(1, 0);
    
            this.multiplierText.anchor.set(0.5, 0);
            this.pauseButton.anchor.set(1, 0);
    
            this.pauseButton.alpha = 0.25;
            this.pauseButton.eventMode = 'static';
            this.pauseButton.on('pointerdown', this.onPauseButtonClick, this);
    }

    private onPauseButtonClick() {
        this.uiManager.changeState(UIState.Paused);
    }

    private _showLineClearText(clearedLineCount: number, clearedRowIndices: number[]): void {
        if (!this.visualSettings.lineClearText) {
            return;
        }

        let textString: string;
        switch (clearedLineCount) {
            case 1: textString = "Single!"; break;
            case 2: textString = "Double!!"; break;
            case 3: textString = "Triple!!!"; break;
            case 4: textString = "TETRIS!!!!"; break;
            default: return;
        }

        const animation = new LineClearTextAnimation(this.boardContainer, textString, clearedRowIndices);
        this.animationManager.add(animation);
    }

    private _processEvents(events: GameEvent[]): void {
        for (const event of events) {
            switch (event.type) {
                case 'lineClear':
                    const { count, rows } = event.data;
                    if (count === 1) this.accessibilityManager.announce('Single line clear.');
                    else if (count === 2) this.accessibilityManager.announce('Double line clear.');
                    else if (count === 3) this.accessibilityManager.announce('Triple line clear.');
                    else if (count >= 4) this.accessibilityManager.announce('Tetris!');
                    
                    // Note: The line clear animation itself is handled elsewhere.
                    // This just triggers the text animation.
                    this._showLineClearText(count, rows);

                    // Trigger the new line clear score animation
                    if (this.lastSnapshot) {
                        const score = calculateScore(count, this.lastSnapshot.level, false, false, this.lastSnapshot.multiplier);
                        const scoreAnimation = new LineClearScoreAnimation(this.boardContainer, score, rows);
                        this.animationManager.add(scoreAnimation);
                    }
                    break;
                case 'scoreUpdate':
                    if (event.data.level > this.lastAnnouncedLevel) {
                        this.lastAnnouncedLevel = event.data.level;
                        this.accessibilityManager.announce(`Level up to level ${this.lastAnnouncedLevel}.`);
                    }
                    break;
                case 'pieceLockedWithScore':
                    const { score, x, y, type } = event.data;
                    const pieceMatrix = PIECE_SHAPES[type as keyof typeof PIECE_SHAPES];
                    const pieceWidth = pieceMatrix[0].length;
                    const pieceHeight = pieceMatrix.length;
                    const animation = new PieceScoreAnimation(this.boardContainer, score, x, y, pieceWidth, pieceHeight);
                    this.animationManager.add(animation);
                    break;
            }
        }
    }

    private setupSubscriptions() {
        renderAPI.on('snapshot', (snapshot) => {
            this.lastSnapshot = snapshot;

            this.levelText.text = snapshot.level.toString();
            this.linesText.text = snapshot.lines.toString();
            this.multiplierText.text = `x${snapshot.multiplier}`;

            if (snapshot.multiplier > this.lastMultiplier) {
                this.animationManager.add(new MultiplierAnimation(this.multiplierText));
            }
            this.lastMultiplier = snapshot.multiplier;
            
            if (snapshot.status === GameStatus.GameOver) {
                if (this.uiManager.getCurrentState() !== UIState.GameOver) {
                    this.uiManager.changeState(UIState.GameOver);
                    const finalScoreEl = document.getElementById('final-score');
                    if (finalScoreEl) {
                        finalScoreEl.textContent = snapshot.score.toString();
                    }
                    this.audioEngine.handleSnapshot(snapshot);
                    this.app.ticker.stop();
                }
                return;
            }

            this.drawBoard(snapshot);
            this._processEvents(snapshot.events);
            this.audioEngine.handleSnapshot(snapshot);
        });

        renderAPI.on('log', (log) => {
            console.log(`[WORKER LOG ${log.level.toUpperCase()}]: ${log.msg}`);
        });

        renderAPI.on('fatal', (fatal) => {
            console.error(`[WORKER FATAL]: ${fatal.error}`);
            this.app.ticker.stop();
        });

        this._stateChangeCallback = (newState, oldState) => {
            if (newState === UIState.InGame) {
                this.app.ticker.start();
                renderAPI.resume();
            } else {
                this.app.ticker.stop();
                renderAPI.pause();
            }
        };
        this.uiManager.subscribeToStateChanges(this._stateChangeCallback);
    }

    private drawBlock(block: PIXI.Graphics, color: number, colorIndex: number, solid: boolean) {
        const { blockStyle, highContrast } = this.visualSettings;
        const strokeColor = highContrast ? 0xFFFFFF : 0x333333;

        block.clear();
        block.alpha = 1; // Reset alpha before drawing

        switch (blockStyle) {
            case 'classic':
                const darkColor = new PIXI.Color(color).multiply(0.6).toNumber();
                const lightColor = new PIXI.Color(color).multiply(1.4).toNumber();
                block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill(color);
                block.moveTo(0, BLOCK_SIZE).lineTo(0, 0).lineTo(BLOCK_SIZE, 0).stroke({ width: 3, color: lightColor });
                block.moveTo(BLOCK_SIZE, 0).lineTo(BLOCK_SIZE, BLOCK_SIZE).lineTo(0, BLOCK_SIZE).stroke({ width: 3, color: darkColor });
                break;
            
            case 'nes':
                block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill(color);
                if (colorIndex > 0) {
                    block.rect(4, 4, 6, 6).fill(0xFFFFFF);
                }
                block.stroke({ width: BORDER_WIDTH, color: 0x000000, alpha: 1 });
                break;

            case 'faceted-gem':
                if (colorIndex > 0) {
                    const r = (color >> 16) & 0xFF;
                    const g = (color >> 8) & 0xFF;
                    const b = color & 0xFF;
                    const clamp = (val: number) => Math.min(255, Math.floor(val));
                    const highlightColor = (clamp(r * 1.5) << 16) + (clamp(g * 1.5) << 8) + (clamp(b * 1.5));
                    const lightColor = (clamp(r * 1.2) << 16) + (clamp(g * 1.2) << 8) + (clamp(b * 1.2));
                    const midToneColor = (clamp(r * 0.9) << 16) + (clamp(g * 0.9) << 8) + (clamp(b * 0.9));
                    const shadowColor = (clamp(r * 0.6) << 16) + (clamp(g * 0.6) << 8) + (clamp(b * 0.6));
                    const borderColor = (clamp(r * 0.5) << 16) + (clamp(g * 0.5) << 8) + (clamp(b * 0.5));
                    const center = BLOCK_SIZE / 2;
                    block.moveTo(0, 0).lineTo(center, center).lineTo(0, BLOCK_SIZE).closePath().fill(highlightColor);
                    block.moveTo(0, 0).lineTo(BLOCK_SIZE, 0).lineTo(center, center).closePath().fill(lightColor);
                    block.moveTo(BLOCK_SIZE, 0).lineTo(BLOCK_SIZE, BLOCK_SIZE).lineTo(center, center).closePath().fill(midToneColor);
                    block.moveTo(0, BLOCK_SIZE).lineTo(center, center).lineTo(BLOCK_SIZE, BLOCK_SIZE).closePath().fill(shadowColor);
                    block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).stroke({ width: BORDER_WIDTH, color: borderColor, alpha: 1 });
                } else {
                    // Draw a light gray grid for empty blocks in faceted-gem style
                    block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).stroke({ width: BORDER_WIDTH, color: 0xCCCCCC, alpha: 0.5 });
                }
                break;

            case 'modern':
            default:
                block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
                // Use a transparent fill for empty blocks (colorIndex 0)
                block.fill({ color: color, alpha: colorIndex === 0 ? 0 : 1 });

                // Draw a stroke for empty blocks or if pieces are not solid
                if (!solid || colorIndex === 0) {
                    block.stroke({ width: BORDER_WIDTH, color: strokeColor, alpha: 0.5 });
                }
                break;
        }
    }

    private drawBoard(snapshot: Snapshot) {
        if (!this.app.renderer) return;

        this.clearBackgroundWell();
        this.clearForegroundWell();
        this.drawMultiplierOnWell(snapshot.multiplier, snapshot.multiplierDecayTimer, this.lastMultiplier);

        const { colorPalette, highContrast, distinctPatterns, pieceOutline, solidPieces, isGhostPieceEnabled } = this.visualSettings;
        const colors = THEMES[colorPalette] || THEMES.default;
        const bgColor = highContrast ? 0x000000 : colors[0];

        this.app.renderer.background.color = bgColor;
        this.pieceOutlineContainer.clear();
        this.lineClearContainer.clear();

        const board = new Uint8Array(snapshot.boardBuffer);

        // 1. Draw the entire board from the buffer, ensuring all blocks are visible initially.
        for (let i = 0; i < board.length; i++) {
            const colorIndex = board[i];
            const block = this.boardBlocks[i];
            const patternSprite = this.patternSprites[i];
            
            block.visible = true; // Ensure visibility before drawing
            this.drawBlock(block, colors[colorIndex], colorIndex, solidPieces);

            if (distinctPatterns && colorIndex > 0) {
                patternSprite.texture = this.patternTextures[colorIndex];
                patternSprite.visible = true;
            } else {
                patternSprite.visible = false;
            }
        }

        // 2. Handle LineClearAnimation state using the AnimationManager.
        const { isLineClearAnimationEnabled } = this.visualSettings;
        const animation = this.animationManager.getActiveAnimation();
        const currentClearedLines = snapshot.clearedLines;

        if (isLineClearAnimationEnabled) {
            // Check if we are starting a new animation
            if (currentClearedLines && !this.prevClearedLines) {
                if (animation.onStart) {
                    animation.onStart(currentClearedLines, this);
                }
            }

            // Check if an animation has just ended
            if (!currentClearedLines && this.prevClearedLines) {
                if (animation.onEnd) {
                    animation.onEnd(this.prevClearedLines, this);
                }
            }

            // If in animation, run the animation frame
            if (snapshot.status === GameStatus.LineClearAnimation && currentClearedLines) {
                const progress = 1 - (snapshot.lineClearDelay / LINE_CLEAR_DELAY_TICKS);
                animation.animate(progress, currentClearedLines, this);
            }
        }
        
        this.prevClearedLines = currentClearedLines || null;


        // 3. Draw the current piece and ghost piece over the board state.
        if (snapshot.current) {
            const piece = snapshot.current;
            const matrix = new Uint8Array(piece.matrix);
            const shapeSize = Math.sqrt(matrix.length);

            // Draw Ghost Piece
            if (isGhostPieceEnabled && piece.ghostY !== undefined && piece.ghostY > piece.y) {
                for (let r = 0; r < shapeSize; r++) {
                    for (let c = 0; c < shapeSize; c++) {
                        if (matrix[r * shapeSize + c]) {
                            const boardX = piece.x + c;
                            const boardY = piece.ghostY + r;
                            const blockIndex = boardY * COLS + boardX;

                            if (blockIndex >= 0 && blockIndex < this.boardBlocks.length && this.boardBlocks[blockIndex].visible) {
                                const block = this.boardBlocks[blockIndex];
                                block.clear();
                                block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill(colors[0]); // Opaque background fill
                                block.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE).fill({ color: colors[piece.colorIndex], alpha: 0.4 });
                                if (!solidPieces) {
                                    block.stroke({ width: BORDER_WIDTH, color: 0x333333, alpha: 0.2 });
                                }
                            }
                        }
                    }
                }
            }

            // Draw Current Piece
            for (let r = 0; r < shapeSize; r++) {
                for (let c = 0; c < shapeSize; c++) {
                    if (matrix[r * shapeSize + c]) {
                        const boardX = piece.x + c;
                        const boardY = piece.y + r;
                        const blockIndex = boardY * COLS + boardX;
                        
                        if (blockIndex >= 0 && blockIndex < this.boardBlocks.length) {
                            const block = this.boardBlocks[blockIndex];
                            const patternSprite = this.patternSprites[blockIndex];

                            block.visible = true;
                            this.drawBlock(block, colors[piece.colorIndex], piece.colorIndex, solidPieces);

                            if (distinctPatterns && piece.colorIndex > 0) {
                                patternSprite.texture = this.patternTextures[piece.colorIndex];
                                patternSprite.visible = true;
                            } else {
                                patternSprite.visible = false;
                            }
                        }
                    }
                }
            }

            // Draw Piece Outline
            if (pieceOutline) {
                this.pieceOutlineContainer.clear();
                this.pieceOutlineContainer.setStrokeStyle({ width: 3, color: 0xFFFFFF, alpha: 1 });

                for (let r = 0; r < shapeSize; r++) {
                    for (let c = 0; c < shapeSize; c++) {
                        if (matrix[r * shapeSize + c]) {
                            const boardX = piece.x + c;
                            const boardY = piece.y + r;
                            const screenX = boardX * BLOCK_SIZE;
                            const screenY = boardY * BLOCK_SIZE;

                            // Draw lines on the outer edges of the piece
                            if (r === 0 || !matrix[(r - 1) * shapeSize + c]) { // Top edge
                                this.pieceOutlineContainer.moveTo(screenX, screenY).lineTo(screenX + BLOCK_SIZE, screenY);
                            }
                            if (r === shapeSize - 1 || !matrix[(r + 1) * shapeSize + c]) { // Bottom edge
                                this.pieceOutlineContainer.moveTo(screenX, screenY + BLOCK_SIZE).lineTo(screenX + BLOCK_SIZE, screenY + BLOCK_SIZE);
                            }
                            if (c === 0 || !matrix[r * shapeSize + (c - 1)]) { // Left edge
                                this.pieceOutlineContainer.moveTo(screenX, screenY).lineTo(screenX, screenY + BLOCK_SIZE);
                            }
                            if (c === shapeSize - 1 || !matrix[r * shapeSize + (c + 1)]) { // Right edge
                                this.pieceOutlineContainer.moveTo(screenX + BLOCK_SIZE, screenY).lineTo(screenX + BLOCK_SIZE, screenY + BLOCK_SIZE);
                            }
                        }
                    }
                }
                this.pieceOutlineContainer.stroke();
            } else {
                this.pieceOutlineContainer.clear();
            }

        }
    }

    public start() {
        const seed = Math.floor(Math.random() * 1_000_000_000);
        const settings = this.uiManager.getVisualSettings();
        renderAPI.start(seed, settings);
        this.app.ticker.add((ticker) => {
            this.update(ticker.deltaTime);
            this.animationManager.update(ticker.deltaTime);
        });
        console.log(`Renderer started. Requesting engine start with seed: ${seed}`);
    }

    private update(deltaTime: number) {
        if (!this.lastSnapshot) return;
    
        const targetScore = this.lastSnapshot.score;
        if (this._displayScore < targetScore) {
            const difference = targetScore - this._displayScore;
            const increment = difference * 0.08;
    
            this._displayScore += Math.max(increment, 1);
    
            if (this._displayScore > targetScore) {
                this._displayScore = targetScore;
            }
        }
    
        this.scoreText.text = `${Math.floor(this._displayScore).toString().padStart(7, '0')}`;
    }

    public destroy() {
        if (this._stateChangeCallback) {
            this.uiManager.unsubscribeFromStateChanges(this._stateChangeCallback);
        }
        renderAPI.destroy();
        this.app.destroy(true, { children: true, texture: true });
    }

    public resize(width: number, height: number) {
        this.app.renderer.resize(width, height);

        const TEXT_AREA_HEIGHT = 60; // Increased height for the text area
        const scaleX = width / BOARD_WIDTH;
        const scaleY = height / (BOARD_HEIGHT + TEXT_AREA_HEIGHT);
        const scale = Math.min(scaleX, scaleY);

        this.boardContainer.scale.set(scale);
        this.backgroundWellContainer.scale.set(scale);
        this.foregroundWellContainer.scale.set(scale);
        this.uiTextContainer.scale.set(scale);

        const scaledBoardWidth = BOARD_WIDTH * scale;
        const scaledBoardHeight = BOARD_HEIGHT * scale;
        const topMargin = TEXT_AREA_HEIGHT * scale;
        const totalScaledHeight = scaledBoardHeight + topMargin;

        const horizontalMargin = (width - scaledBoardWidth) / 2;
        const verticalMargin = (height - totalScaledHeight) / 2;

        // Position containers
        this.boardContainer.x = horizontalMargin;
        this.backgroundWellContainer.x = horizontalMargin;
        this.foregroundWellContainer.x = horizontalMargin;
        this.uiTextContainer.x = horizontalMargin;

        this.uiTextContainer.y = verticalMargin + TEXT_VERTICAL_OFFSET;
        this.boardContainer.y = verticalMargin + topMargin;
        this.backgroundWellContainer.y = verticalMargin + topMargin;
        this.foregroundWellContainer.y = verticalMargin + topMargin;

        // Position text elements within the uiTextContainer
        const labelYOffset = -15; // Position labels above the values
        const valueY = 25;

        // Position LEVEL
        this.levelText.x = TEXT_HORIZONTAL_OFFSET;
        this.levelText.y = valueY;
        this.levelLabel.x = TEXT_HORIZONTAL_OFFSET;
        this.levelLabel.y = valueY + labelYOffset;

        // Position SCORE
        this.scoreText.x = BOARD_WIDTH / 2;
        this.scoreText.y = valueY;
        this.scoreLabel.x = BOARD_WIDTH / 2;
        this.scoreLabel.y = valueY + labelYOffset;

        // Position LINES
        this.linesText.x = BOARD_WIDTH - TEXT_HORIZONTAL_OFFSET;
        this.linesText.y = valueY;
        this.linesLabel.x = BOARD_WIDTH - TEXT_HORIZONTAL_OFFSET;
        this.linesLabel.y = valueY + labelYOffset;

        // Position MULTIPLIER
        this.multiplierText.x = BOARD_WIDTH / 2;
        this.multiplierText.y = this.scoreText.y + 22;

        // Position PAUSE button
        this.pauseButton.x = BOARD_WIDTH - TEXT_HORIZONTAL_OFFSET;
        this.pauseButton.y = this.multiplierText.y + 22;
    }

    public setWellCell(x: number, y: number, color: number, alpha: number, targetSprites: PIXI.Graphics[] = this.backgroundWellSprites): void {
        const index = y * COLS + x;
        if (targetSprites[index]) {
            const cell = targetSprites[index];
            cell.clear();
            cell.rect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
            cell.fill({ color, alpha });
        }
    }
}
