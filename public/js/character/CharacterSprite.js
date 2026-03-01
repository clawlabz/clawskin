/**
 * CharacterSprite.js — Manages character rendering in a scene
 * Composites sprite frames from SpriteGenerator and handles positioning
 */
class CharacterSprite {
  constructor(config, x, y, scale = 3) {
    this.config = config || CharacterSprite.defaultConfig();
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.spriteSheet = null;
    this.animManager = new AnimationManager();
    this.bubbleManager = new BubbleManager();
    this.generator = new SpriteGenerator();
    this.petCanvas = null;
    this.petFrame = 0;
    this.petTimer = 0;
    this.regenerate();
  }

  static defaultConfig() {
    return {
      skinColor: SpriteGenerator.SKIN_TONES[0],
      hairType: 0,
      hairColor: SpriteGenerator.HAIR_COLORS[0],
      outfitType: 'hoodie',
      outfitColorIdx: 0,
      accessory: null,
      pet: null
    };
  }

  static randomConfig() {
    const outfitTypes = Object.keys(SpriteGenerator.OUTFIT_COLORS);
    const accessories = [null, 'glasses', 'hat', 'headphones', 'cap'];
    const pets = [null, 'cat', 'dog', 'robot'];
    return {
      skinColor: SpriteGenerator.SKIN_TONES[Math.floor(Math.random() * 5)],
      hairType: Math.floor(Math.random() * 5),
      hairColor: SpriteGenerator.HAIR_COLORS[Math.floor(Math.random() * 7)],
      outfitType: outfitTypes[Math.floor(Math.random() * outfitTypes.length)],
      outfitColorIdx: Math.floor(Math.random() * 5),
      accessory: accessories[Math.floor(Math.random() * accessories.length)],
      pet: pets[Math.floor(Math.random() * pets.length)]
    };
  }

  regenerate() {
    this.generator.cache.clear();
    this.spriteSheet = this.generator.generateCharacter(this.config);
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.regenerate();
  }

  setState(state) {
    this.animManager.setState(state);
  }

  showBubble(text, type, duration) {
    this.bubbleManager.show(text, type, duration);
  }

  update(dt) {
    this.animManager.update(dt);
    this.bubbleManager.update(dt);
  }

  render(ctx) {
    if (!this.spriteSheet) return;

    const frame = this.animManager.getCurrentFrame();
    const sx = frame * 32;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Draw character only — pets are now independent entities managed by PetManager
    ctx.drawImage(
      this.spriteSheet,
      sx, 0, 32, 32,
      this.x, this.y, 32 * this.scale, 32 * this.scale
    );

    ctx.restore();

    // Draw bubble (not pixel-scaled)
    this.bubbleManager.render(
      ctx,
      this.x + (32 * this.scale) / 2,
      this.y
    );
  }
}

if (typeof window !== 'undefined') window.CharacterSprite = CharacterSprite;
