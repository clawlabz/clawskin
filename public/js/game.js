/**
 * game.js — ClawSkin main entry point
 * Initializes the pixel engine, scenes, character, and UI
 */
class ClawSkinGame {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = options.width || 480;
    this.height = options.height || 320;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.spriteGen = new SpriteGenerator();
    this.scenes = [];
    this.currentScene = null;
    this.character = null;
    this.stateSync = null;
    this.lastTime = 0;
    this.running = false;

    // Status display
    this.statusEl = options.statusEl ? document.getElementById(options.statusEl) : null;
  }

  init(characterConfig = null) {
    // Load saved config or use provided/default
    const savedConfig = CharacterEditor.loadSaved();
    const cfg = characterConfig || savedConfig || CharacterSprite.defaultConfig();

    // Create scenes
    this.scenes = [
      new OfficeScene(this.canvas, this.ctx, this.spriteGen),
      new HackerScene(this.canvas, this.ctx, this.spriteGen),
      new CafeScene(this.canvas, this.ctx, this.spriteGen),
    ];

    // Init all scenes
    this.scenes.forEach(s => s.init());

    // Set initial scene
    this.currentScene = this.scenes[0];

    // Create character
    const pos = this.currentScene.getCharacterPosition();
    this.character = new CharacterSprite(cfg, pos.x, pos.y);

    // State sync (demo mode by default)
    this.stateSync = new AgentStateSync(this.character, {
      gatewayUrl: null, // Will use demo mode
      onStateChange: (state) => {
        if (this.statusEl) {
          this.statusEl.textContent = this.character.animManager.getLabel();
        }
      }
    });
    this.stateSync.connect();

    return this;
  }

  setScene(index) {
    if (index < 0 || index >= this.scenes.length) return;
    this.currentScene = this.scenes[index];
    this.currentScene.init();
    const pos = this.currentScene.getCharacterPosition();
    this.character.x = pos.x;
    this.character.y = pos.y;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this._update(dt);
    this._render();

    requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    if (this.currentScene) this.currentScene.update(dt);
    if (this.character) this.character.update(dt);
    if (this.stateSync) this.stateSync.update(dt);

    // Update status display
    if (this.statusEl && this.character) {
      this.statusEl.textContent = this.character.animManager.getLabel();
    }
  }

  _render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.imageSmoothingEnabled = false;

    // Render scene background + furniture
    if (this.currentScene) this.currentScene.render(this.ctx);

    // Render character on top
    if (this.character) this.character.render(this.ctx);
  }
}

if (typeof window !== 'undefined') window.ClawSkinGame = ClawSkinGame;
