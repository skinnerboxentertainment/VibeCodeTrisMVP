// src/renderer/animations/AnimationManager.ts
import { Animation, LineClearAnimation } from './types';
import { CenterOutWipeAnimation } from './CenterOutWipeAnimation';
import { FlickerFadeAnimation } from './FlickerFadeAnimation';

export class AnimationManager {
    private lineClearAnimations: Map<string, LineClearAnimation> = new Map();
    private activeLineClearAnimation: LineClearAnimation;
    private activeAnimations: Animation[] = [];

    constructor() {
        this.register(new CenterOutWipeAnimation());
        this.register(new FlickerFadeAnimation());
        this.activeLineClearAnimation = this.lineClearAnimations.values().next().value; // Set default
    }

    private register(animation: LineClearAnimation): void {
        this.lineClearAnimations.set(animation.name, animation);
    }

    public setAnimation(name: string): void {
        const newAnimation = this.lineClearAnimations.get(name);
        if (newAnimation) {
            this.activeLineClearAnimation = newAnimation;
            console.log(`Line clear animation set to: ${name}`);
        } else {
            console.warn(`Animation "${name}" not found. Keeping current animation.`);
        }
    }
    
    public getActiveAnimation(): LineClearAnimation {
        return this.activeLineClearAnimation;
    }

    public getAnimationNames(): string[] {
        return Array.from(this.lineClearAnimations.keys());
    }

    public add(animation: Animation): void {
        this.activeAnimations.push(animation);
    }

    public update(delta: number): void {
        for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
            const animation = this.activeAnimations[i];
            animation.update(delta);
            if (animation.finished) {
                this.activeAnimations.splice(i, 1);
            }
        }
    }
}
