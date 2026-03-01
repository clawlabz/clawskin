/**
 * AnimationManager.js — Character animation state machine
 * Manages transitions between agent states and animation frames
 */
class AnimationManager {
  constructor() {
    this.currentState = 'idle';
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.transitionTimer = 0;

    // Animation frame indices in sprite sheet (pairs for 2-frame anims)
    this.stateFrames = {
      idle:      [0, 1],
      typing:    [2, 3],
      thinking:  [4, 5],
      walking:   [6, 7],
      sleeping:  [8, 8],
      error:     [9, 9],
      waving:    [10, 11],
      coffee:    [12, 13],
      browsing:  [14, 15],
      executing: [6, 7]  // reuse walking
    };

    // Frame durations (ms) per state
    this.frameSpeeds = {
      idle: 1200, typing: 200, thinking: 800, walking: 300,
      sleeping: 2000, error: 500, waving: 400, coffee: 1500,
      browsing: 1000, executing: 300
    };

    // State display names
    this.stateLabels = {
      idle: '💤 Idle', typing: '⌨️ Writing', thinking: '🤔 Thinking',
      walking: '🚶 Moving', sleeping: '😴 Sleeping', error: '❌ Error',
      waving: '👋 Waving', coffee: '☕ Coffee Break', browsing: '🌐 Browsing',
      executing: '⚡ Executing'
    };
  }

  setState(newState) {
    if (!this.stateFrames[newState] || newState === this.currentState) return;
    this.currentState = newState;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  update(dt) {
    this.frameTimer += dt;
    const speed = this.frameSpeeds[this.currentState] || 500;
    if (this.frameTimer >= speed) {
      this.frameTimer = 0;
      const frames = this.stateFrames[this.currentState];
      this.frameIndex = (this.frameIndex + 1) % frames.length;
    }
  }

  getCurrentFrame() {
    const frames = this.stateFrames[this.currentState];
    return frames[this.frameIndex];
  }

  getLabel() {
    return this.stateLabels[this.currentState] || this.currentState;
  }
}

if (typeof window !== 'undefined') window.AnimationManager = AnimationManager;
