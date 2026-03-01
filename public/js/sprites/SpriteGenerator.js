/**
 * SpriteGenerator.js — Programmatic pixel sprite generation
 * Generates 32x32 pixel characters and scene elements using Canvas 2D API
 * All art is code-generated, no external assets needed
 */
class SpriteGenerator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.cache = new Map();
  }

  // ── Color Palettes ────────────────────────────────────
  static SKIN_TONES = ['#FFDFC4','#F0C08A','#D2956A','#8D5524','#4A2912'];
  static HAIR_COLORS = ['#1A1A2E','#4A3728','#8B4513','#DAA520','#C41E3A','#2E8B57','#6A5ACD'];
  static OUTFIT_COLORS = {
    hoodie:  ['#4A90D9','#E74C3C','#2ECC71','#9B59B6','#F39C12'],
    shirt:   ['#ECF0F1','#3498DB','#1ABC9C','#E67E22','#8E44AD'],
    suit:    ['#2C3E50','#34495E','#1A1A2E','#4A4A4A','#192a56'],
    labcoat: ['#FFFFFF','#F5F5F5','#E8E8E8','#D4E6F1','#FDEBD0'],
    tshirt:  ['#E74C3C','#3498DB','#2ECC71','#F1C40F','#E91E63']
  };

  // ── Pixel Drawing Helpers ─────────────────────────────
  px(x, y, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, 1, 1);
  }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ── Darken/Lighten Color ──────────────────────────────
  static shadeColor(color, percent) {
    let r = parseInt(color.slice(1,3), 16);
    let g = parseInt(color.slice(3,5), 16);
    let b = parseInt(color.slice(5,7), 16);
    r = Math.min(255, Math.max(0, Math.floor(r * (1 + percent))));
    g = Math.min(255, Math.max(0, Math.floor(g * (1 + percent))));
    b = Math.min(255, Math.max(0, Math.floor(b * (1 + percent))));
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  // ══════════════════════════════════════════════════════
  // CHARACTER GENERATION
  // ══════════════════════════════════════════════════════

  /**
   * Generate a complete character sprite sheet
   * @param {Object} config - Character configuration
   * @returns {HTMLCanvasElement} Sprite sheet with all animation frames
   */
  generateCharacter(config) {
    const cacheKey = JSON.stringify(config);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const states = ['idle','idle2','typing','typing2','thinking','thinking2',
                    'walking','walking2','sleeping','error','waving','waving2',
                    'coffee','coffee2','browsing','browsing2'];
    const sheetW = 32 * states.length;
    const sheetH = 32;

    const sheet = document.createElement('canvas');
    sheet.width = sheetW;
    sheet.height = sheetH;
    const sctx = sheet.getContext('2d');

    states.forEach((state, i) => {
      this.canvas.width = 32;
      this.canvas.height = 32;
      this.clear();
      this._drawCharacterFrame(config, state);
      sctx.drawImage(this.canvas, i * 32, 0);
    });

    this.cache.set(cacheKey, sheet);
    return sheet;
  }

  _drawCharacterFrame(cfg, state) {
    const skin = cfg.skinColor || SpriteGenerator.SKIN_TONES[0];
    const skinDark = SpriteGenerator.shadeColor(skin, -0.15);
    const hairColor = cfg.hairColor || SpriteGenerator.HAIR_COLORS[0];
    const outfitType = cfg.outfitType || 'hoodie';
    const outfitIdx = cfg.outfitColorIdx || 0;
    const outfitColor = (SpriteGenerator.OUTFIT_COLORS[outfitType] || SpriteGenerator.OUTFIT_COLORS.hoodie)[outfitIdx];
    const outfitDark = SpriteGenerator.shadeColor(outfitColor, -0.2);

    // Base sitting position for most states
    const isSitting = !['walking','walking2','waving','waving2','executing'].includes(state);
    const isSleeping = state === 'sleeping';

    if (isSleeping) {
      this._drawSleepingCharacter(skin, skinDark, hairColor, outfitColor, outfitDark, cfg);
      return;
    }

    if (state.startsWith('walking')) {
      this._drawWalkingCharacter(skin, skinDark, hairColor, outfitColor, outfitDark, cfg, state);
      return;
    }

    // ── Shadow ──
    this.rect(10, 29, 12, 2, 'rgba(0,0,0,0.15)');

    // ── Legs (sitting) ──
    this.rect(12, 25, 3, 4, '#2C3E50'); // left leg
    this.rect(17, 25, 3, 4, '#2C3E50'); // right leg
    // Shoes
    this.rect(11, 28, 4, 2, '#1A1A2E');
    this.rect(17, 28, 4, 2, '#1A1A2E');

    // ── Body/Torso ──
    this.rect(11, 17, 10, 8, outfitColor);
    // Collar / neckline
    this.rect(14, 17, 4, 1, skinDark);
    // Outfit detail
    if (outfitType === 'hoodie') {
      this.rect(15, 18, 2, 3, outfitDark); // zipper
      this.rect(11, 17, 2, 2, outfitDark); // hood shadow
      this.rect(19, 17, 2, 2, outfitDark);
    } else if (outfitType === 'suit') {
      this.rect(15, 18, 2, 6, '#ECF0F1'); // shirt underneath
      this.px(15, 19, '#E74C3C'); // tie knot
      this.px(15, 20, '#E74C3C');
      this.px(15, 21, '#E74C3C');
    } else if (outfitType === 'labcoat') {
      this.rect(11, 17, 10, 8, '#FFFFFF');
      this.rect(14, 18, 4, 5, '#D4E6F1'); // inner shirt
      this.rect(11, 22, 4, 3, SpriteGenerator.shadeColor('#FFFFFF', -0.05));
      this.rect(17, 22, 4, 3, SpriteGenerator.shadeColor('#FFFFFF', -0.05));
    }

    // ── Arms ──
    const frame2 = state.endsWith('2');
    if (state.startsWith('typing')) {
      // Arms forward on desk
      const armY = frame2 ? 22 : 21;
      this.rect(8, 20, 3, 3, outfitColor);
      this.rect(7, armY, 2, 2, skin);
      this.rect(21, 20, 3, 3, outfitColor);
      this.rect(23, armY, 2, 2, skin);
    } else if (state.startsWith('waving')) {
      // Left arm normal, right arm up waving
      this.rect(8, 20, 3, 4, outfitColor);
      this.rect(8, 24, 2, 1, skin);
      const waveY = frame2 ? 11 : 13;
      this.rect(21, 17, 3, 3, outfitColor);
      this.rect(22, waveY, 2, 4, outfitColor);
      this.rect(22, waveY - 1, 2, 2, skin); // hand
    } else if (state.startsWith('coffee')) {
      // Left arm holds coffee
      this.rect(8, 19, 3, 4, outfitColor);
      this.rect(7, 20, 2, 2, skin);
      // Coffee cup in hand
      this.rect(5, 19, 3, 3, '#8B4513');
      this.rect(5, 18, 3, 1, '#D4A574');
      if (!frame2) this.px(6, 17, '#CCCCCC'); // steam
      if (frame2) { this.px(5, 16, '#CCCCCC'); this.px(7, 17, '#CCCCCC'); }
      // Right arm
      this.rect(21, 20, 3, 4, outfitColor);
      this.rect(22, 24, 2, 1, skin);
    } else {
      // Default arms at sides
      this.rect(8, 19, 3, 5, outfitColor);
      this.rect(8, 24, 2, 1, skin);
      this.rect(21, 19, 3, 5, outfitColor);
      this.rect(22, 24, 2, 1, skin);
    }

    // ── Head ──
    this.rect(12, 8, 8, 9, skin);
    // Ears
    this.rect(11, 11, 1, 3, skin);
    this.rect(20, 11, 1, 3, skin);
    // Neck
    this.rect(14, 16, 4, 2, skin);

    // ── Eyes ──
    if (state.startsWith('error')) {
      // X eyes
      this.px(14, 12, '#E74C3C'); this.px(15, 13, '#E74C3C');
      this.px(15, 12, '#E74C3C'); this.px(14, 13, '#E74C3C');
      this.px(17, 12, '#E74C3C'); this.px(18, 13, '#E74C3C');
      this.px(18, 12, '#E74C3C'); this.px(17, 13, '#E74C3C');
    } else if (state.startsWith('thinking')) {
      // Looking up
      this.rect(14, 11, 2, 2, '#1A1A2E');
      this.rect(17, 11, 2, 2, '#1A1A2E');
      this.px(14, 11, '#FFFFFF');
      this.px(17, 11, '#FFFFFF');
    } else {
      // Normal eyes
      this.rect(14, 12, 2, 2, '#FFFFFF');
      this.rect(17, 12, 2, 2, '#FFFFFF');
      this.px(15, 12, '#1A1A2E'); // pupil
      this.px(18, 12, '#1A1A2E');
      this.px(15, 13, '#1A1A2E');
      this.px(18, 13, '#1A1A2E');
    }

    // ── Mouth ──
    if (state.startsWith('error')) {
      this.rect(15, 15, 3, 1, '#E74C3C'); // frown
    } else if (state.startsWith('typing') || state.startsWith('browsing')) {
      this.px(16, 15, '#C0392B'); // focused dot
    } else {
      this.rect(15, 15, 2, 1, '#C0392B'); // normal smile
    }

    // ── Hair ──
    this._drawHair(cfg.hairType || 0, hairColor);

    // ── Accessory ──
    this._drawAccessory(cfg.accessory, skin);

    // ── State-specific overlays ──
    if (state.startsWith('thinking')) {
      // Thought bubble
      const bx = 22; const by = frame2 ? 3 : 5;
      this.rect(bx, by, 6, 4, '#FFFFFF');
      this.rect(bx+1, by-1, 4, 1, '#FFFFFF');
      this.rect(bx+1, by+4, 4, 1, '#FFFFFF');
      this.ctx.fillStyle = '#666';
      this.ctx.fillRect(bx+1, by+1, 1, 1);
      this.ctx.fillRect(bx+3, by+1, 1, 1);
      this.ctx.fillRect(bx+5, by+1, 1, 1);
      // dots leading to bubble
      this.px(21, by+4, '#FFFFFF');
      this.px(20, by+5, '#CCCCCC');
    }

    if (state.startsWith('error')) {
      // Red X above head
      const ex = 14; const ey = frame2 ? 1 : 2;
      this.px(ex, ey, '#E74C3C'); this.px(ex+4, ey, '#E74C3C');
      this.px(ex+1, ey+1, '#E74C3C'); this.px(ex+3, ey+1, '#E74C3C');
      this.px(ex+2, ey+2, '#E74C3C');
      this.px(ex+1, ey+3, '#E74C3C'); this.px(ex+3, ey+3, '#E74C3C');
      this.px(ex, ey+4, '#E74C3C'); this.px(ex+4, ey+4, '#E74C3C');
    }
  }

  _drawSleepingCharacter(skin, skinDark, hairColor, outfitColor, outfitDark, cfg) {
    // Character slumped on desk
    this.rect(6, 27, 20, 3, 'rgba(0,0,0,0.1)'); // shadow

    // Desk surface
    this.rect(4, 22, 24, 3, '#8B6914');
    this.rect(4, 25, 2, 5, '#6B4F12');
    this.rect(24, 25, 2, 5, '#6B4F12');

    // Body slumped forward
    this.rect(10, 18, 10, 5, outfitColor);
    // Arms on desk
    this.rect(7, 19, 4, 3, outfitColor);
    this.rect(6, 20, 2, 2, skin);
    this.rect(19, 19, 4, 3, outfitColor);
    this.rect(22, 20, 2, 2, skin);

    // Head on arms (rotated/tilted)
    this.rect(11, 13, 8, 6, skin);
    this.rect(10, 15, 1, 2, skin);

    // Closed eyes
    this.rect(13, 16, 2, 1, '#1A1A2E');
    this.rect(17, 16, 2, 1, '#1A1A2E');

    // Hair
    this.rect(11, 12, 8, 2, hairColor);
    this.rect(10, 13, 2, 3, hairColor);

    // ZZZ
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.font = '5px monospace';
    this.ctx.fillText('z', 22, 12);
    this.ctx.fillText('Z', 24, 8);
    this.ctx.fillText('Z', 26, 4);
  }

  _drawWalkingCharacter(skin, skinDark, hairColor, outfitColor, outfitDark, cfg, state) {
    const frame2 = state.endsWith('2');

    // Shadow
    this.rect(10, 30, 12, 1, 'rgba(0,0,0,0.15)');

    // Legs walking animation
    if (frame2) {
      this.rect(13, 25, 3, 4, '#2C3E50');
      this.rect(17, 23, 3, 4, '#2C3E50');
      this.rect(12, 29, 4, 2, '#1A1A2E');
      this.rect(17, 27, 4, 2, '#1A1A2E');
    } else {
      this.rect(13, 23, 3, 4, '#2C3E50');
      this.rect(17, 25, 3, 4, '#2C3E50');
      this.rect(13, 27, 4, 2, '#1A1A2E');
      this.rect(16, 29, 4, 2, '#1A1A2E');
    }

    // Body
    this.rect(11, 16, 10, 8, outfitColor);
    this.rect(14, 16, 4, 1, skinDark);

    // Arms swinging
    if (frame2) {
      this.rect(8, 17, 3, 6, outfitColor);
      this.rect(8, 23, 2, 1, skin);
      this.rect(21, 18, 3, 5, outfitColor);
      this.rect(22, 23, 2, 1, skin);
    } else {
      this.rect(8, 18, 3, 5, outfitColor);
      this.rect(8, 23, 2, 1, skin);
      this.rect(21, 17, 3, 6, outfitColor);
      this.rect(22, 23, 2, 1, skin);
    }

    // Head
    this.rect(12, 7, 8, 9, skin);
    this.rect(11, 10, 1, 3, skin);
    this.rect(20, 10, 1, 3, skin);
    this.rect(14, 15, 4, 2, skin);

    // Eyes
    this.rect(14, 11, 2, 2, '#FFFFFF');
    this.rect(17, 11, 2, 2, '#FFFFFF');
    this.px(15, 12, '#1A1A2E');
    this.px(18, 12, '#1A1A2E');

    // Mouth
    this.rect(15, 14, 2, 1, '#C0392B');

    // Hair
    this._drawHair(cfg.hairType || 0, hairColor, -1);

    // Accessory
    this._drawAccessory(cfg.accessory, skin);
  }

  _drawHair(type, color, yOffset = 0) {
    const y = 7 + yOffset;
    const dark = SpriteGenerator.shadeColor(color, -0.2);

    switch (type) {
      case 0: // Short messy
        this.rect(11, y, 10, 3, color);
        this.rect(10, y+1, 1, 2, color);
        this.rect(21, y+1, 1, 2, color);
        this.px(12, y-1, color);
        this.px(15, y-1, color);
        this.px(18, y-1, color);
        this.rect(11, y, 2, 1, dark);
        break;
      case 1: // Spiky
        this.rect(11, y, 10, 3, color);
        this.px(12, y-2, color); this.px(14, y-2, color);
        this.px(17, y-2, color); this.px(19, y-2, color);
        this.px(11, y-1, color); this.px(13, y-1, color);
        this.px(16, y-1, color); this.px(18, y-1, color); this.px(20, y-1, color);
        break;
      case 2: // Long
        this.rect(11, y, 10, 3, color);
        this.rect(10, y, 1, 8, color);
        this.rect(21, y, 1, 8, color);
        this.rect(10, y-1, 12, 1, color);
        this.px(9, y+2, color);
        this.px(22, y+2, color);
        break;
      case 3: // Curly
        this.rect(11, y, 10, 3, color);
        this.rect(10, y-1, 12, 2, color);
        this.px(9, y, color); this.px(22, y, color);
        this.px(10, y+3, color); this.px(21, y+3, color);
        this.px(11, y+4, color); this.px(20, y+4, color);
        this.rect(10, y, 1, 4, color);
        this.rect(21, y, 1, 4, color);
        break;
      case 4: // Bald / buzz cut
        this.rect(12, y, 8, 2, dark);
        this.rect(11, y+1, 1, 1, dark);
        this.rect(20, y+1, 1, 1, dark);
        break;
    }
  }

  _drawAccessory(type, skinColor) {
    switch (type) {
      case 'glasses':
        this.rect(13, 12, 3, 2, '#333');
        this.rect(16, 12, 1, 1, '#666');
        this.rect(17, 12, 3, 2, '#333');
        this.px(13, 12, '#87CEEB');
        this.px(17, 12, '#87CEEB');
        break;
      case 'hat':
        this.rect(10, 5, 12, 3, '#2C3E50');
        this.rect(8, 7, 16, 2, '#2C3E50');
        this.rect(12, 5, 8, 1, '#E74C3C'); // band
        break;
      case 'headphones':
        this.rect(10, 7, 2, 5, '#333');
        this.rect(20, 7, 2, 5, '#333');
        this.rect(10, 5, 12, 2, '#444');
        this.rect(9, 8, 2, 3, '#E74C3C');
        this.rect(21, 8, 2, 3, '#E74C3C');
        break;
      case 'cap':
        this.rect(10, 6, 12, 3, '#3498DB');
        this.rect(8, 8, 6, 2, '#3498DB');
        this.rect(11, 6, 3, 1, SpriteGenerator.shadeColor('#3498DB', -0.2));
        break;
    }
  }

  // ══════════════════════════════════════════════════════
  // PET GENERATION (16x16)
  // ══════════════════════════════════════════════════════

  generatePet(type, frame = 0, color = null) {
    const key = `pet_${type}_${frame}_${color || 'default'}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');

    if (type === 'cat') this._drawCat(ctx, frame, color);
    else if (type === 'dog') this._drawDog(ctx, frame, color);
    else if (type === 'robot') this._drawRobotPet(ctx, frame, color);
    else if (type === 'bird') this._drawBird(ctx, frame, color);
    else if (type === 'hamster') this._drawHamster(ctx, frame, color);

    this.cache.set(key, c);
    return c;
  }

  _drawCat(ctx, frame, baseColor) {
    const f = (x,y,w,h,c) => { ctx.fillStyle = c; ctx.fillRect(x,y,w,h); };
    const color = baseColor || '#FF9900';
    const dark = SpriteGenerator.shadeColor(color, -0.25);
    // Body
    f(4, 8, 8, 5, color);
    // Head
    f(3, 3, 8, 6, color);
    // Ears
    f(3, 1, 2, 3, color); f(9, 1, 2, 3, color);
    f(4, 2, 1, 1, '#FFB6C1');  f(9, 2, 1, 1, '#FFB6C1');
    // Eyes
    f(4, 5, 2, 2, '#2ECC71');
    f(8, 5, 2, 2, '#2ECC71');
    f(5, 5, 1, 1, '#000'); f(9, 5, 1, 1, '#000');
    // Nose
    f(6, 7, 2, 1, '#FFB6C1');
    // Tail
    const ty = frame % 2 === 0 ? 6 : 7;
    f(12, ty, 2, 1, color); f(13, ty-1, 1, 2, color); f(14, ty-2, 1, 2, color);
    // Legs
    f(4, 13, 2, 2, dark); f(9, 13, 2, 2, dark);
    // Stripes
    f(5, 4, 1, 1, dark); f(8, 4, 1, 1, dark);
    f(5, 9, 1, 1, dark); f(7, 9, 1, 1, dark); f(9, 9, 1, 1, dark);
  }

  _drawDog(ctx, frame, baseColor) {
    const f = (x,y,w,h,c) => { ctx.fillStyle = c; ctx.fillRect(x,y,w,h); };
    const color = baseColor || '#D2956A';
    const dark = SpriteGenerator.shadeColor(color, -0.25);
    // Body
    f(4, 8, 8, 5, color);
    // Head
    f(3, 3, 8, 6, color);
    // Floppy ears
    f(2, 4, 2, 4, dark); f(10, 4, 2, 4, dark);
    // Eyes
    f(4, 5, 2, 2, '#000'); f(8, 5, 2, 2, '#000');
    f(4, 5, 1, 1, '#FFF'); f(8, 5, 1, 1, '#FFF');
    // Nose
    f(6, 7, 2, 1, '#000');
    // Tongue
    if (frame % 2 === 0) f(7, 8, 1, 2, '#FF6B8A');
    // Tail
    const ty = frame % 2 === 0 ? 5 : 7;
    f(12, ty, 1, 3, color); f(13, ty, 1, 2, dark);
    // Legs
    f(4, 13, 2, 2, dark); f(9, 13, 2, 2, dark);
    // Spots
    f(6, 4, 2, 1, '#FFF'); f(5, 9, 3, 2, '#FFF');
  }

  _drawRobotPet(ctx, frame, baseColor) {
    const f = (x,y,w,h,c) => { ctx.fillStyle = c; ctx.fillRect(x,y,w,h); };
    const bodyColor = baseColor || '#95A5A6';
    const headColor = SpriteGenerator.shadeColor(bodyColor, 0.15);
    const darkColor = SpriteGenerator.shadeColor(bodyColor, -0.15);
    // Body
    f(4, 7, 8, 6, bodyColor);
    f(5, 8, 6, 4, darkColor);
    // Head
    f(4, 2, 8, 6, headColor);
    f(5, 3, 6, 4, bodyColor);
    // Antenna
    f(7, 0, 2, 3, darkColor);
    f(6, 0, 4, 1, frame % 2 === 0 ? '#E74C3C' : '#2ECC71');
    // Eyes (LED)
    const eyeColor = frame % 2 === 0 ? '#00FF00' : '#00CC00';
    f(5, 4, 2, 2, eyeColor); f(9, 4, 2, 2, eyeColor);
    // Mouth grid
    f(6, 6, 4, 1, '#555');
    f(6, 6, 1, 1, eyeColor); f(8, 6, 1, 1, eyeColor);
    // Legs
    f(5, 13, 2, 2, darkColor); f(9, 13, 2, 2, darkColor);
    // Bolts
    f(4, 9, 1, 1, '#F1C40F'); f(11, 9, 1, 1, '#F1C40F');
  }

  _drawBird(ctx, frame, baseColor) {
    const f = (x,y,w,h,c) => { ctx.fillStyle = c; ctx.fillRect(x,y,w,h); };
    const body = baseColor || '#4FC3F7';
    const dark = SpriteGenerator.shadeColor(body, -0.35);
    const belly = SpriteGenerator.shadeColor(body, 0.40);
    // Body (centered)
    f(5, 6, 6, 5, body);
    f(6, 7, 4, 3, belly);
    // Head (left side — bird faces LEFT like all other pets)
    f(5, 3, 5, 4, body);
    // Eye
    f(6, 4, 2, 2, '#FFF');
    f(6, 4, 1, 1, '#000');
    // Beak (left side)
    f(3, 5, 2, 1, '#FF9800');
    f(4, 6, 1, 1, '#FF9800');
    // Wings (animated)
    if (frame % 2 === 0) {
      // Wings up
      f(10, 4, 2, 3, dark);
      f(4, 4, 1, 3, dark);
    } else {
      // Wings down
      f(10, 7, 2, 3, dark);
      f(4, 7, 1, 3, dark);
    }
    // Tail feathers (right side)
    f(11, 7, 2, 2, dark);
    f(12, 6, 2, 1, dark);
    // Legs (tiny)
    f(6, 11, 1, 2, '#FF9800');
    f(8, 11, 1, 2, '#FF9800');
    // Feet
    f(5, 13, 2, 1, '#FF9800');
    f(8, 13, 2, 1, '#FF9800');
  }

  _drawHamster(ctx, frame, baseColor) {
    const f = (x,y,w,h,c) => { ctx.fillStyle = c; ctx.fillRect(x,y,w,h); };
    const body = baseColor || '#F5DEB3';
    const dark = SpriteGenerator.shadeColor(body, -0.15);
    const cheek = '#FFB6C1';
    // Body (round)
    f(4, 7, 8, 6, body);
    f(3, 8, 1, 4, body);
    f(12, 8, 1, 4, body);
    // Head
    f(4, 3, 8, 5, body);
    f(3, 4, 1, 3, body);
    f(12, 4, 1, 3, body);
    // Ears (round)
    f(4, 1, 2, 3, body);
    f(10, 1, 2, 3, body);
    f(5, 2, 1, 1, cheek);
    f(10, 2, 1, 1, cheek);
    // Eyes (beady)
    f(5, 5, 2, 2, '#000');
    f(9, 5, 2, 2, '#000');
    f(5, 5, 1, 1, '#FFF');
    f(9, 5, 1, 1, '#FFF');
    // Nose
    f(7, 6, 2, 1, '#FF9999');
    // Cheeks (puffy)
    f(3, 6, 2, 2, cheek);
    f(11, 6, 2, 2, cheek);
    // Whiskers
    f(2, 6, 1, 1, '#AAA');
    f(13, 6, 1, 1, '#AAA');
    // Legs
    f(5, 13, 2, 2, dark);
    f(9, 13, 2, 2, dark);
    // Belly stripe
    f(6, 9, 4, 3, '#FFF5E6');
    // Tail (tiny)
    const ty = frame % 2 === 0 ? 10 : 11;
    f(12, ty, 2, 1, dark);
    f(13, ty - 1, 1, 1, dark);
  }

  // ══════════════════════════════════════════════════════
  // FURNITURE & SCENE ELEMENTS
  // ══════════════════════════════════════════════════════

  generateFurniture(type) {
    const key = `furn_${type}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const f = (x,y,w,h,color) => { ctx.fillStyle = color; ctx.fillRect(x,y,w,h); };

    switch(type) {
      case 'desk':
        // 3/4 top-down view desk — top surface visible + front face
        c.width = 48; c.height = 20;
        // Top surface (visible from above) — light wood
        f(2, 0, 44, 8, '#D4A56A');
        f(0, 2, 2, 4, '#D4A56A');   // left bevel
        f(46, 2, 2, 4, '#D4A56A');  // right bevel
        // Surface edge highlight
        f(2, 0, 44, 1, '#E0B878');
        // Front face — darker wood
        f(2, 8, 44, 10, '#8B5E3C');
        f(0, 8, 2, 8, '#7A5232');   // left side face
        f(46, 8, 2, 8, '#7A5232');  // right side face
        // Front face shadow/detail
        f(2, 16, 44, 2, '#6B4422');
        // Legs visible at bottom
        f(4, 18, 3, 2, '#6B4422');
        f(41, 18, 3, 2, '#6B4422');
        // Wood grain on top
        f(8, 2, 12, 1, 'rgba(0,0,0,0.06)');
        f(24, 4, 16, 1, 'rgba(0,0,0,0.06)');
        break;

      case 'monitor':
      case 'laptop':
        // iMac BACK view — screen faces character (away from viewer)
        // We see: silver aluminum back, Apple logo, thin edge, stand + base
        c.width = 20; c.height = 20;
        // Main back panel — silver aluminum
        f(2, 0, 16, 13, '#C8CDD3');
        // Slight edge shading
        f(2, 0, 1, 13, '#B8BEC5');   // left edge
        f(17, 0, 1, 13, '#D4D8DD');  // right edge highlight
        f(2, 0, 16, 1, '#D8DDE2');   // top edge highlight
        // Bottom edge (slightly curved/tapered)
        f(3, 12, 14, 1, '#B0B6BD');
        // Apple logo — centered on back (glowing white-ish)
        f(9, 4, 2, 1, '#E8ECF0');   // apple top
        f(8, 5, 4, 3, '#E8ECF0');   // apple body
        f(9, 8, 2, 1, '#E8ECF0');   // apple bottom
        f(10, 3, 1, 1, '#E8ECF0');  // stem
        f(11, 3, 1, 1, '#E8ECF0');  // leaf
        // Subtle surface texture lines
        f(4, 3, 3, 1, 'rgba(0,0,0,0.03)');
        f(13, 6, 3, 1, 'rgba(0,0,0,0.03)');
        f(5, 10, 4, 1, 'rgba(0,0,0,0.03)');
        // Stand neck
        f(9, 13, 2, 3, '#A8AEB5');
        f(8, 13, 1, 2, '#9EA5AC');
        f(11, 13, 1, 2, '#B0B6BD');
        // Stand base (ellipse)
        f(5, 16, 10, 2, '#B8BEC5');
        f(4, 17, 12, 2, '#A8AEB5');
        f(6, 16, 8, 1, '#D0D4D8');  // highlight
        break;

      case 'monitor_active':
      case 'laptop_active':
        // iMac BACK view — active (Apple logo glows brighter, subtle screen light spill)
        c.width = 20; c.height = 20;
        // Main back panel
        f(2, 0, 16, 13, '#C8CDD3');
        f(2, 0, 1, 13, '#B8BEC5');
        f(17, 0, 1, 13, '#D4D8DD');
        f(2, 0, 16, 1, '#D8DDE2');
        f(3, 12, 14, 1, '#B0B6BD');
        // Apple logo — glowing brighter when active
        f(9, 4, 2, 1, '#FFFFFF');
        f(8, 5, 4, 3, '#FFFFFF');
        f(9, 8, 2, 1, '#FFFFFF');
        f(10, 3, 1, 1, '#FFFFFF');
        f(11, 3, 1, 1, '#FFFFFF');
        // Logo glow aura
        f(7, 4, 1, 4, 'rgba(255,255,255,0.3)');
        f(12, 4, 1, 4, 'rgba(255,255,255,0.3)');
        f(8, 3, 4, 1, 'rgba(255,255,255,0.2)');
        f(8, 9, 4, 1, 'rgba(255,255,255,0.2)');
        // Screen light spilling from front edge (bottom glow)
        f(3, 13, 14, 1, 'rgba(100,200,255,0.15)');
        f(4, 12, 12, 1, 'rgba(100,200,255,0.08)');
        // Surface texture
        f(4, 3, 3, 1, 'rgba(0,0,0,0.03)');
        f(13, 6, 3, 1, 'rgba(0,0,0,0.03)');
        // Stand
        f(9, 13, 2, 3, '#A8AEB5');
        f(8, 13, 1, 2, '#9EA5AC');
        f(11, 13, 1, 2, '#B0B6BD');
        // Base
        f(5, 16, 10, 2, '#B8BEC5');
        f(4, 17, 12, 2, '#A8AEB5');
        f(6, 16, 8, 1, '#D0D4D8');
        break;

      case 'chair':
        // 3/4 view chair — seat visible from above + backrest
        c.width = 16; c.height = 18;
        // Backrest (behind, visible top)
        f(3, 0, 10, 3, '#8B4513');
        f(2, 1, 1, 2, '#7A3A10');
        f(13, 1, 1, 2, '#7A3A10');
        // Seat (visible from above — ellipse-ish)
        f(2, 5, 12, 6, '#A0522D');
        f(1, 6, 1, 4, '#8B4513');
        f(14, 6, 1, 4, '#8B4513');
        // Seat cushion highlight
        f(4, 6, 8, 3, '#B0623D');
        // Legs (visible below seat)
        f(3, 11, 2, 5, '#6B3410');
        f(11, 11, 2, 5, '#6B3410');
        // Wheel dots at bottom
        f(2, 16, 2, 2, '#555');
        f(12, 16, 2, 2, '#555');
        f(7, 17, 2, 1, '#555');
        break;

      case 'coffee_cup':
        c.width = 8; c.height = 10;
        f(1, 3, 5, 6, '#FFFFFF');
        f(1, 3, 5, 1, '#D4A574');
        f(6, 5, 2, 2, '#FFFFFF');
        f(0, 9, 7, 1, '#CCCCCC');
        // Steam
        f(2, 1, 1, 2, 'rgba(200,200,200,0.5)');
        f(4, 0, 1, 3, 'rgba(200,200,200,0.5)');
        break;

      case 'plant':
        c.width = 12; c.height = 16;
        f(4, 10, 4, 6, '#8B4513'); // pot
        f(3, 10, 6, 2, '#A0522D');
        f(5, 4, 2, 6, '#228B22'); // stem
        f(2, 2, 3, 4, '#32CD32'); // leaves
        f(7, 3, 3, 3, '#2ECC71');
        f(4, 1, 4, 2, '#3CB371');
        f(1, 4, 2, 2, '#228B22');
        f(9, 2, 2, 2, '#228B22');
        break;

      case 'server_rack':
        c.width = 20; c.height = 32;
        f(0, 0, 20, 32, '#2C3E50');
        f(1, 1, 18, 30, '#1A1A2E');
        for (let i = 0; i < 6; i++) {
          f(2, 2 + i*5, 16, 4, '#34495E');
          f(3, 3 + i*5, 2, 2, i % 2 === 0 ? '#2ECC71' : '#3498DB');
          f(14, 3 + i*5, 3, 1, '#555');
          f(14, 4 + i*5, 3, 1, '#555');
        }
        break;

      case 'bookshelf':
        c.width = 24; c.height = 32;
        f(0, 0, 24, 32, '#5D3D1A');
        f(0, 7, 24, 2, '#6B4F12');
        f(0, 15, 24, 2, '#6B4F12');
        f(0, 23, 24, 2, '#6B4F12');
        // Books
        const bookColors = ['#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6','#1ABC9C','#E67E22'];
        for (let shelf = 0; shelf < 3; shelf++) {
          let bx = 1;
          for (let b = 0; b < 5; b++) {
            const bw = 2 + Math.floor(Math.random() * 2);
            const bh = 5 + Math.floor(Math.random() * 2);
            const by = (shelf * 8) + (7 - bh);
            f(bx, by, bw, bh, bookColors[(shelf*5+b) % bookColors.length]);
            bx += bw + 1;
          }
        }
        break;

      case 'lamp':
        c.width = 10; c.height = 16;
        f(4, 12, 3, 4, '#8B4513');
        f(3, 12, 5, 1, '#A0522D');
        f(5, 4, 1, 8, '#666');
        f(2, 1, 7, 4, '#F39C12');
        f(3, 0, 5, 1, '#F1C40F');
        f(3, 2, 5, 2, '#FFE082');
        break;
    }

    this.cache.set(key, c);
    return c;
  }

  // ══════════════════════════════════════════════════════
  // SCENE BACKGROUND GENERATION
  // ══════════════════════════════════════════════════════

  generateSceneBg(type, width, height) {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d');
    const f = (x,y,w,h,color) => { ctx.fillStyle = color; ctx.fillRect(x,y,w,h); };

    switch(type) {
      case 'office': {
        const floorY = Math.round(height * 0.40);
        const floorH = height - floorY;
        // Wall — subtle vertical gradient for depth
        const wallGrad = ctx.createLinearGradient(0, 0, 0, floorY);
        wallGrad.addColorStop(0, '#F0E6D4');
        wallGrad.addColorStop(1, '#E2D4BE');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, width, floorY);
        // Wall subtle texture — faint horizontal lines
        for (let y = 20; y < floorY; y += 40) {
          f(0, y, width, 1, 'rgba(0,0,0,0.02)');
        }
        // Baseboard / 踢脚线
        f(0, floorY - 6, width, 6, '#8B7355');
        f(0, floorY - 7, width, 1, '#9C8465');
        // Floor — gradient for perspective depth
        const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
        floorGrad.addColorStop(0, '#C4A56E');
        floorGrad.addColorStop(0.5, '#B89860');
        floorGrad.addColorStop(1, '#A88B52');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorY, width, floorH);
        // Floor line
        f(0, floorY, width, 2, '#A08050');
        // Floor wood planks — horizontal boards
        for (let y = floorY + 28; y < height; y += 28) {
          f(0, y, width, 1, 'rgba(0,0,0,0.06)');
        }
        // Floor vertical grain lines
        for (let x = 0; x < width; x += 32) {
          f(x, floorY, 1, floorH, 'rgba(0,0,0,0.03)');
        }
        // Subtle floor highlight near wall
        ctx.fillStyle = 'rgba(255,255,220,0.06)';
        ctx.fillRect(0, floorY, width, 20);
      }
        // Window — pushed down to avoid UI overlay
        const ww = 80; const wh = 70; const wx = (width - ww) / 2;
        const wy = Math.round(height * 0.08);
        f(wx-2, wy, ww+4, wh+4, '#5D3D1A');
        f(wx, wy+2, ww, wh, '#87CEEB');
        f(wx + ww/2 - 1, wy+2, 2, wh, '#5D3D1A'); // divider
        f(wx, wy+2 + wh/2 - 1, ww, 2, '#5D3D1A');
        // Clouds
        f(wx + 10, wy+15, 20, 8, '#FFFFFF');
        f(wx + 14, wy+12, 12, 5, '#FFFFFF');
        f(wx + 55, wy+25, 15, 6, '#F0F0F0');
        f(wx + 58, wy+22, 9, 4, '#F0F0F0');
        // Sun
        f(wx + ww - 20, wy+8, 8, 8, '#F1C40F');
        f(wx + ww - 18, wy+6, 4, 2, '#F39C12');
        f(wx + ww - 22, wy+10, 2, 4, '#F39C12');
        break;

      case 'hacker':
        // Dark room
        f(0, 0, width, height, '#0D0D1A');
        // Floor
        f(0, height * 0.65, width, height * 0.35, '#151525');
        // Grid lines on floor (perspective)
        ctx.strokeStyle = 'rgba(0,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, height * 0.65);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        // Ambient glow
        const grad = ctx.createRadialGradient(width/2, height * 0.5, 10, width/2, height * 0.5, width * 0.6);
        grad.addColorStop(0, 'rgba(100, 0, 200, 0.1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        // Neon strip lights
        f(0, height * 0.65 - 1, width, 1, '#00FFFF');
        ctx.fillStyle = 'rgba(0, 255, 255, 0.03)';
        ctx.fillRect(0, height * 0.55, width, height * 0.15);
        break;

      case 'cafe':
        // Warm interior wall
        f(0, 0, width, height * 0.55, '#8B6D5C');
        f(0, 0, width, height * 0.55, 'rgba(255,200,100,0.1)');
        // Wainscoting
        f(0, height * 0.35, width, height * 0.2, '#6B4D3C');
        // Floor
        f(0, height * 0.55, width, height * 0.45, '#654321');
        // Floor boards
        for (let x = 0; x < width; x += 24) {
          f(x, height * 0.55, 1, height * 0.45, 'rgba(0,0,0,0.1)');
        }
        // Large window
        const cww = 120; const cwh = 70; const cwx = width - cww - 30;
        f(cwx-3, 15, cww+6, cwh+6, '#5D3D1A');
        f(cwx, 18, cww, cwh, '#4A6885');
        // Rain outside
        ctx.fillStyle = 'rgba(150,180,200,0.3)';
        for (let i = 0; i < 30; i++) {
          const rx = cwx + Math.random() * cww;
          const ry = 18 + Math.random() * cwh;
          ctx.fillRect(rx, ry, 1, 3);
        }
        // Warm light glow
        const warmGrad = ctx.createRadialGradient(width * 0.3, height * 0.3, 5, width * 0.3, height * 0.3, 150);
        warmGrad.addColorStop(0, 'rgba(255, 200, 100, 0.15)');
        warmGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = warmGrad;
        ctx.fillRect(0, 0, width, height);
        break;
    }

    return c;
  }
}

// Export for use
if (typeof window !== 'undefined') window.SpriteGenerator = SpriteGenerator;
