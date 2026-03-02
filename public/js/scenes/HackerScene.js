/**
 * HackerScene.js — Dark hacker den with dual monitors, code rain, neon glow
 * Architecture matches OfficeScene: getWorkstations, renderChair, renderDesk
 *
 * Render order (back to front):
 *   1. Background wall + code rain + neon pulse + decorations
 *   2. Per agent: gaming chair → character → dark desk (hides legs) → monitors + energy drink
 *   3. Name tags + bubbles on top
 */
class HackerScene {
  constructor(canvas, ctx, spriteGen) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gen = spriteGen;
    this.bgCanvas = null;
    this.codeRainDrops = [];
    this.neonPulse = 0;
    this.screenGlitch = 0;
    this.name = 'hacker';
    this.label = '💻 Hacker Den';
    this.workstations = [];
    this.poiList = [];

    // Mood cycling (no window — cycle the neon ambience)
    this.weather = 'purple';
    this.weatherStates = ['purple', 'red_alert', 'matrix', 'blackout'];
    this.moodColors = {
      purple:    { r: 155, g: 89,  b: 182 },
      red_alert: { r: 231, g: 76,  b: 60  },
      matrix:    { r: 0,   g: 255, b: 65  },
      blackout:  { r: 10,  g: 10,  b: 30  },
    };
  }

  cycleWeather() {
    const idx = this.weatherStates.indexOf(this.weather);
    this.weather = this.weatherStates[(idx + 1) % this.weatherStates.length];
    return this.weather;
  }

  getWindowRect() {
    const w = this.canvas.width, h = this.canvas.height;
    return { x: w - 95, y: Math.round(h * 0.12), w: 60, h: 35 }; // LED panel
  }

  init() {
    this.bgCanvas = this.gen.generateSceneBg('hacker', this.canvas.width, this.canvas.height);
    this.codeRainDrops = [];
    for (let i = 0; i < 40; i++) {
      this.codeRainDrops.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 0.5 + Math.random() * 2,
        char: String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)),
        opacity: 0.1 + Math.random() * 0.3,
        size: 8 + Math.floor(Math.random() * 4),
      });
    }
  }

  getCharacterPosition() {
    return { x: this.canvas.width / 2 - 48, y: this.canvas.height * 0.38 };
  }

  /**
   * Calculate workstation layout for N agents.
   * Hacker desks: wide dark desks with dual monitors.
   */
  getWorkstations(count) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const floorY = Math.round(h * 0.40);
    const stations = [];

    const cs = 2.5;
    const charH = Math.round(32 * cs);
    const charW = Math.round(32 * cs);

    const deskW = 130, deskH = 42;
    const monW = 44,  monH = 44;
    const chairW = 36, chairH = 40;
    const cupW = 16,  cupH = 20;

    const deskSurfaceY = floorY + 50;

    if (count <= 0) return stations;

    const positions = [];
    if (count === 1) {
      positions.push(w / 2);
    } else if (count <= 4) {
      for (let i = 0; i < count; i++) {
        positions.push((w / (count + 1)) * (i + 1));
      }
    } else {
      const topN = Math.ceil(count / 2);
      const botN = count - topN;
      for (let i = 0; i < topN; i++) positions.push((w / (topN + 1)) * (i + 1));
      for (let i = 0; i < botN; i++) positions.push((w / (botN + 1)) * (i + 1));
    }

    for (let i = 0; i < count; i++) {
      const cx = Math.round(positions[i]);
      const isBackRow = count > 4 && i >= Math.ceil(count / 2);
      const rowDeskY = isBackRow ? deskSurfaceY + 70 : deskSurfaceY;

      const charY = rowDeskY - charH + 10;
      const deskY = rowDeskY;

      stations.push({
        charX: cx - charW / 2,
        charY,
        charScale: cs,

        chairX: cx - chairW / 2,
        chairY: charY + charH * 0.3,
        chairW, chairH,

        deskX: cx - deskW / 2,
        deskY,
        deskW, deskH,

        monX: cx - deskW / 2 + 6,
        monY: deskY - monH + 10,
        monW, monH,

        cupX: cx + deskW / 2 - cupW - 12,
        cupY: deskY - cupH + 8,
        cupW, cupH,

        cx, cy: rowDeskY,
        index: i,
      });
    }

    // Points of interest for agent wandering
    const floorH = h - floorY;
    this.poiList = [
      { x: 80,      y: floorY + 20,             label: 'server_rack' },
      { x: w - 90,  y: floorY + 20,             label: 'server_rack' },
      { x: w / 2,   y: 30,                      label: 'led_wall' },
      { x: 80,      y: floorY + floorH * 0.55,  label: 'bean_bag' },
      { x: w - 90,  y: floorY + floorH * 0.45,  label: 'mini_fridge' },
      { x: w / 2,   y: floorY + floorH * 0.70,  label: 'corner' },
      { x: 90,      y: floorY + floorH * 0.30,  label: 'cable_corner' },
      { x: w - 90,  y: floorY + floorH * 0.68,  label: 'arcade' },
    ];

    // Collision obstacles
    this.obstacles = [
      ...stations.map(s => ({ x: s.deskX - 5, y: s.deskY - 5, w: s.deskW + 10, h: s.deskH + 10, deskIndex: s.index })),
      { x: 0,    y: floorY + 5,             w: 30, h: 90 },   // left server rack
      { x: 0,    y: floorY + floorH * 0.46, w: 45, h: 45 },   // left bean bag
      { x: w-28, y: floorY + 5,             w: 28, h: 55 },    // right fridge
      { x: w-30, y: floorY + floorH * 0.30, w: 30, h: 70 },   // right arcade
    ];

    this.workstations = stations;
    return stations;
  }

  update(dt) {
    this.neonPulse += dt * 0.003;
    this.screenGlitch += dt;
    this.codeRainDrops.forEach(d => {
      d.y += d.speed;
      if (d.y > this.canvas.height) {
        d.y = -10;
        d.x = Math.random() * this.canvas.width;
        d.char = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
      }
    });
  }

  /** Render background + static decorations */
  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0);

    // ── Code rain (behind everything) ──
    ctx.save();
    ctx.globalAlpha = 0.5;
    this.codeRainDrops.forEach(d => {
      ctx.fillStyle = `rgba(0, 255, 65, ${d.opacity})`;
      ctx.font = `${d.size}px monospace`;
      ctx.fillText(d.char, d.x, d.y);
    });
    ctx.restore();

    // ── Neon ambient pulse — mood-dependent ──
    const mc = this.moodColors[this.weather] || this.moodColors.purple;
    const pulse = Math.sin(this.neonPulse) * 0.03 + 0.05;
    ctx.fillStyle = `rgba(${mc.r}, ${mc.g}, ${mc.b}, ${pulse})`;
    ctx.fillRect(0, 0, w, h);
    // Blackout extra darkening
    if (this.weather === 'blackout') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, w, h);
    }

    const floorY = Math.round(h * 0.40);
    const floorH = h - floorY;
    const wallSafe = Math.round(h * 0.12);

    // ── Wall decorations ──
    this._drawHexDisplay(ctx, 25, wallSafe, 65, 38);
    this._drawNeonSign(ctx, w / 2 - 30, wallSafe - 5);
    this._drawLEDPanel(ctx, w - 95, wallSafe, 60, 35);
    this._drawClock(ctx, w - 30, wallSafe + 8);

    // ── LEFT WALL: server rack + bean bag ──
    this._drawSideServerRack(ctx, 0, floorY + 8, 25, 88, 'left');
    this._drawSideBeanBag(ctx, 0, floorY + floorH * 0.48, 40, 38, 'left');

    // ── RIGHT WALL: mini fridge + arcade cabinet ──
    this._drawSideMiniFridge(ctx, w - 22, floorY + 5, 22, 52, 'right');
    this._drawSideArcade(ctx, w - 28, floorY + floorH * 0.30, 28, 68, 'right');
  }

  /** Render gaming chair (behind character) */
  renderChair(ctx, s) {
    const x = s.chairX, y = s.chairY, cw = s.chairW, ch = s.chairH;
    // Gaming chair — black with cyan accent stripe
    // Seat base
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 2, y + ch * 0.35, cw - 4, ch * 0.45);
    // Back rest (tall)
    ctx.fillStyle = '#111128';
    ctx.fillRect(x + 4, y, cw - 8, ch * 0.55);
    // Top of back rest — rounded
    ctx.fillStyle = '#111128';
    ctx.fillRect(x + 6, y - 4, cw - 12, 6);
    // Cyan racing stripe
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x + cw / 2 - 2, y + 2, 4, ch * 0.50);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x + cw / 2 - 4, y + 2, 8, ch * 0.50);
    ctx.globalAlpha = 1;
    // Arm rests
    ctx.fillStyle = '#222240';
    ctx.fillRect(x, y + ch * 0.35, 4, ch * 0.25);
    ctx.fillRect(x + cw - 4, y + ch * 0.35, 4, ch * 0.25);
    // Wheel base
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 4, y + ch - 4, cw - 8, 4);
    // Wheels
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 2, y + ch - 2, 4, 3);
    ctx.fillRect(x + cw - 6, y + ch - 2, 4, 3);
    ctx.fillRect(x + cw / 2 - 2, y + ch - 1, 4, 2);
  }

  /** Render dark desk + dual monitors + RGB keyboard + energy drink */
  renderDesk(ctx, s, agentState) {
    const isWorking = ['typing', 'executing', 'browsing'].includes(agentState);

    // ── Dark desk ──
    // Top surface (carbon fiber look)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(s.deskX, s.deskY, s.deskW, 8);
    // Highlight strip on top edge
    ctx.fillStyle = '#252545';
    ctx.fillRect(s.deskX, s.deskY, s.deskW, 2);
    // Front face
    ctx.fillStyle = '#111125';
    ctx.fillRect(s.deskX, s.deskY + 8, s.deskW, s.deskH - 8);
    // Side edges
    ctx.fillStyle = '#0d0d1e';
    ctx.fillRect(s.deskX, s.deskY + 8, 2, s.deskH - 8);
    ctx.fillRect(s.deskX + s.deskW - 2, s.deskY + 8, 2, s.deskH - 8);
    // Bottom edge
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(s.deskX + 2, s.deskY + s.deskH - 2, s.deskW - 4, 2);
    // Legs
    ctx.fillStyle = '#0d0d1e';
    ctx.fillRect(s.deskX + 6, s.deskY + s.deskH, 4, 4);
    ctx.fillRect(s.deskX + s.deskW - 10, s.deskY + s.deskH, 4, 4);

    // ── Neon underglow ──
    const neonAlpha = 0.35 + Math.sin(this.neonPulse) * 0.2;
    ctx.fillStyle = `rgba(0, 229, 255, ${neonAlpha})`;
    ctx.fillRect(s.deskX + 4, s.deskY + s.deskH - 1, s.deskW - 8, 1);
    // Underglow reflection on floor
    ctx.fillStyle = `rgba(0, 229, 255, ${neonAlpha * 0.15})`;
    ctx.fillRect(s.deskX + 10, s.deskY + s.deskH + 2, s.deskW - 20, 6);

    // ── Dual monitors ──
    const monType = isWorking && Math.floor(this.screenGlitch / 400) % 2 === 0 ? 'laptop_active' : 'laptop';
    // Left monitor
    ctx.drawImage(this.gen.generateFurniture(monType), s.monX, s.monY, s.monW, s.monH);
    // Right monitor
    const mon2X = s.monX + 50;
    ctx.drawImage(this.gen.generateFurniture(monType), mon2X, s.monY, s.monW, s.monH);

    // Screen glow when working
    if (isWorking) {
      ctx.fillStyle = 'rgba(0,255,100,0.04)';
      ctx.fillRect(s.monX - 6, s.monY - 3, s.monW + 60, s.monH + 6);
    }

    // ── RGB keyboard between monitors ──
    const kbX = s.deskX + s.deskW / 2 - 22;
    const kbY = s.deskY - 8;
    ctx.fillStyle = '#111';
    ctx.fillRect(kbX, kbY, 44, 10);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(kbX + 1, kbY + 1, 42, 8);
    // Rainbow key LEDs
    for (let k = 0; k < 9; k++) {
      const hue = (this.neonPulse * 50 + k * 40) % 360;
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      ctx.fillRect(kbX + 3 + k * 4.5, kbY + 3, 3, 2);
      ctx.fillRect(kbX + 3 + k * 4.5, kbY + 6, 3, 2);
    }

    // ── Energy drink (instead of coffee) ──
    const edX = s.cupX, edY = s.cupY;
    // Can body
    ctx.fillStyle = '#111';
    ctx.fillRect(edX, edY, s.cupW - 2, s.cupH);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(edX + 1, edY + 3, s.cupW - 4, s.cupH - 6);
    // Label
    ctx.fillStyle = '#004d40';
    ctx.fillRect(edX + 2, edY + 5, s.cupW - 6, 4);
    // Lightning bolt
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(edX + 5, edY + 4, 2, 3);
    ctx.fillRect(edX + 4, edY + 7, 2, 3);
    ctx.fillRect(edX + 6, edY + 6, 2, 2);
    // Can top
    ctx.fillStyle = '#333';
    ctx.fillRect(edX + 1, edY, s.cupW - 4, 3);
    ctx.fillStyle = '#555';
    ctx.fillRect(edX + 3, edY + 1, 4, 1);
  }

  // ── Wall decorations ──

  _drawHexDisplay(ctx, x, y, w, h) {
    // Dark monitor showing hex code on wall
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(x, y, w, h);
    // Hex lines
    ctx.font = '5px monospace';
    const colors = ['#0f0', '#0a0', '#080', '#0d0'];
    for (let line = 0; line < 6; line++) {
      ctx.fillStyle = colors[line % colors.length];
      let txt = '';
      for (let c = 0; c < 8; c++) {
        txt += Math.floor(Math.random() * 16).toString(16).toUpperCase();
      }
      ctx.fillText(txt, x + 3, y + 7 + line * 5);
    }
    // Scanline
    const scanY = y + ((this.screenGlitch * 0.02) % h);
    ctx.fillStyle = 'rgba(0,255,0,0.08)';
    ctx.fillRect(x, scanY, w, 2);
  }

  _drawNeonSign(ctx, x, y) {
    // Glowing neon "< / >" sign
    const glow = 0.6 + Math.sin(this.neonPulse * 2) * 0.3;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ff00ff';
    ctx.fillText('< / >', x, y + 14);
    // Glow effect
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 8;
    ctx.fillText('< / >', x, y + 14);
    ctx.restore();
  }

  _drawLEDPanel(ctx, x, y, w, h) {
    // LED dot matrix panel on wall
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, w, h);
    // LED dots — scrolling pattern
    const dotSize = 3;
    const cols = Math.floor(w / (dotSize + 1));
    const rows = Math.floor(h / (dotSize + 1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = (this.screenGlitch * 0.01 + c * 0.3 + r * 0.2) % 6;
        const on = Math.sin(offset) > 0.3;
        if (on) {
          const hue = (c * 20 + r * 30 + this.neonPulse * 30) % 360;
          ctx.fillStyle = `hsla(${hue}, 90%, 55%, 0.7)`;
        } else {
          ctx.fillStyle = 'rgba(50,50,80,0.3)';
        }
        ctx.fillRect(x + 2 + c * (dotSize + 1), y + 2 + r * (dotSize + 1), dotSize, dotSize);
      }
    }
  }

  _drawClock(ctx, x, y) {
    // Digital clock (hacker style)
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 14, y, 28, 14);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(x - 13, y + 1, 26, 12);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ctx.font = '7px monospace';
    ctx.fillStyle = '#0f0';
    ctx.fillText(timeStr, x - 11, y + 10);
  }

  // ── Side-view floor furniture ──

  _drawSideServerRack(ctx, x, y, depth, h, side) {
    // Server rack against wall
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, depth, h);
    ctx.fillStyle = '#111125';
    ctx.fillRect(x + 2, y + 2, depth - 4, h - 4);
    // Front edge
    const edgeX = side === 'left' ? x + depth - 3 : x;
    ctx.fillStyle = '#0d0d1e';
    ctx.fillRect(edgeX, y, 3, h);
    // Server units with LEDs
    for (let i = 0; i < 6; i++) {
      const uy = y + 4 + i * 14;
      ctx.fillStyle = '#252545';
      ctx.fillRect(x + 3, uy, depth - 6, 11);
      // Blinking LED
      const ledOn = Math.floor(this.screenGlitch / (300 + i * 100)) % 2 === 0;
      ctx.fillStyle = ledOn ? ['#0f0', '#0ff', '#f0f', '#ff0', '#0f0', '#0ff'][i] : '#222';
      ctx.fillRect(x + 5, uy + 4, 3, 3);
      // Ventilation lines
      ctx.fillStyle = '#1a1a30';
      ctx.fillRect(x + 10, uy + 2, depth - 14, 1);
      ctx.fillRect(x + 10, uy + 5, depth - 14, 1);
      ctx.fillRect(x + 10, uy + 8, depth - 14, 1);
    }
    // Top/bottom trim
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 1, y - 1, depth + 2, 2);
    ctx.fillRect(x - 1, y + h - 1, depth + 2, 2);
  }

  _drawSideBeanBag(ctx, x, y, depth, h, side) {
    // Bean bag chair — blob shape
    ctx.fillStyle = '#2d1b4e';
    ctx.fillRect(x + 4, y + 6, depth - 8, h - 8);
    ctx.fillStyle = '#3a2463';
    ctx.fillRect(x + 2, y + 4, depth - 4, h - 6);
    // Round top
    ctx.fillStyle = '#3a2463';
    ctx.fillRect(x + 6, y, depth - 12, 8);
    // Highlight
    ctx.fillStyle = '#4a3478';
    ctx.fillRect(x + 6, y + 6, depth - 14, h * 0.4);
    // Crease
    ctx.fillStyle = '#2d1b4e';
    ctx.fillRect(x + 8, y + Math.floor(h * 0.5), depth - 16, 1);
    // Small glow sticker
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x + depth - 10, y + 8, 4, 4);
  }

  _drawSideMiniFridge(ctx, x, y, depth, h, side) {
    // Black mini-fridge with stickers
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, depth, h);
    ctx.fillStyle = '#222240';
    ctx.fillRect(x + 2, y + 2, depth - 4, h - 4);
    // Door edge
    const edgeX = side === 'right' ? x : x + depth - 3;
    ctx.fillStyle = '#111128';
    ctx.fillRect(edgeX, y, 3, h);
    // Handle
    ctx.fillStyle = '#555';
    ctx.fillRect(edgeX + 1, y + Math.floor(h * 0.3), 1, 8);
    // Top
    ctx.fillStyle = '#252545';
    ctx.fillRect(x, y - 2, depth, 3);
    // Stickers
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x + 5, y + 8, 5, 5);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x + 5, y + 18, 6, 4);
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(x + 12, y + 12, 4, 4);
    // Energy drinks on top
    ctx.fillStyle = '#00e676';
    ctx.fillRect(x + 4, y - 10, 5, 8);
    ctx.fillStyle = '#004d40';
    ctx.fillRect(x + 4, y - 8, 5, 3);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(x + 12, y - 8, 5, 6);
  }

  _drawSideArcade(ctx, x, y, depth, h, side) {
    // Retro arcade cabinet — side view
    // Cabinet body
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, depth, h);
    ctx.fillStyle = '#222240';
    ctx.fillRect(x + 2, y + 2, depth - 4, h - 4);
    // Front edge
    const edgeX = side === 'right' ? x : x + depth - 3;
    ctx.fillStyle = '#0d0d1e';
    ctx.fillRect(edgeX, y, 3, h);
    // Screen area (visible from side as a bright strip)
    const screenY = y + 8;
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 3, screenY, depth - 6, 22);
    // Screen glow (cycling colors)
    const screenHue = (this.neonPulse * 40) % 360;
    ctx.fillStyle = `hsla(${screenHue}, 80%, 40%, 0.6)`;
    ctx.fillRect(x + 4, screenY + 1, depth - 8, 20);
    // Pixel art on screen
    ctx.fillStyle = `hsla(${screenHue + 120}, 80%, 60%, 0.8)`;
    ctx.fillRect(x + 6, screenY + 5, 4, 4);
    ctx.fillRect(x + 12, screenY + 8, 3, 6);
    ctx.fillRect(x + 8, screenY + 14, 5, 3);
    // Control panel area
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 3, y + 34, depth - 6, 12);
    // Joystick
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x + 8, y + 36, 4, 8);
    ctx.fillRect(x + 7, y + 35, 6, 3);
    // Buttons
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 16, y + 38, 4, 4);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x + 16, y + 44, 4, 4);
    // Marquee on top
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x + 2, y, depth - 4, 6);
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(x + 4, y + 1, depth - 8, 4);
    // Coin slot
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 8, y + 50, 6, 2);
    // Base/legs
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 2, y + h - 4, depth - 4, 4);
  }
}

if (typeof window !== 'undefined') window.HackerScene = HackerScene;
