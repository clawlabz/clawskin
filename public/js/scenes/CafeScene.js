/**
 * CafeScene.js — Warm coffee shop with rain outside, cozy lighting
 * Architecture matches OfficeScene: getWorkstations, renderChair, renderDesk
 *
 * Render order (back to front):
 *   1. Background wall + rain + warm glow + decorations
 *   2. Per agent: café chair → character → round table (hides legs) → laptop + latte
 *   3. Name tags + bubbles on top
 */
class CafeScene {
  constructor(canvas, ctx, spriteGen) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gen = spriteGen;
    this.bgCanvas = null;
    this.rainDrops = [];
    this.steamParticles = [];
    this.warmGlow = 0;
    this.screenFlicker = 0;
    this.name = 'cafe';
    this.label = '☕ Cozy Café';
    this.workstations = [];
    this.poiList = [];

    // Weather cycling
    this.weather = 'rain';
    this.weatherStates = ['rain', 'sunny', 'snow', 'fog'];
    this.cafeSnow = [];
    for (let i = 0; i < 25; i++) this.cafeSnow.push({ x: Math.random() * 120, y: Math.random() * 70, speed: 0.02 + Math.random() * 0.02, drift: Math.random() * Math.PI * 2 });
  }

  cycleWeather() {
    const idx = this.weatherStates.indexOf(this.weather);
    this.weather = this.weatherStates[(idx + 1) % this.weatherStates.length];
    return this.weather;
  }

  getWindowRect() {
    const w = this.canvas.width;
    return { x: w - 150, y: 18, w: 120, h: 70 };
  }

  init() {
    this.bgCanvas = this.gen.generateSceneBg('cafe', this.canvas.width, this.canvas.height);
    this.rainDrops = [];
    for (let i = 0; i < 50; i++) {
      this.rainDrops.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.5,
        speed: 2 + Math.random() * 3,
        length: 4 + Math.random() * 8,
        opacity: 0.2 + Math.random() * 0.4,
      });
    }
    this.steamParticles = [];
    for (let i = 0; i < 8; i++) {
      this.steamParticles.push({
        x: 0, y: 0, life: Math.random() * 100, maxLife: 100,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.3 - Math.random() * 0.3,
      });
    }
  }

  getCharacterPosition() {
    return { x: this.canvas.width / 2 - 48, y: this.canvas.height * 0.38 };
  }

  /**
   * Calculate workstation layout for N agents.
   * Café tables: round wooden tables with comfy chairs.
   */
  getWorkstations(count) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const floorY = Math.round(h * 0.40);
    const stations = [];

    const cs = 2.5;
    const charH = Math.round(32 * cs);
    const charW = Math.round(32 * cs);

    // Café tables are smaller and rounder-looking
    const deskW = 110, deskH = 38;
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
      { x: 80,      y: floorY + 20,             label: 'bookshelf' },
      { x: w - 90,  y: floorY + 20,             label: 'counter' },
      { x: w / 2,   y: 30,                      label: 'window' },
      { x: 80,      y: floorY + floorH * 0.55,  label: 'sofa' },
      { x: w - 90,  y: floorY + floorH * 0.45,  label: 'pastry_case' },
      { x: w - 90,  y: floorY + floorH * 0.28,  label: 'coffee_bar' },
      { x: 80,      y: floorY + floorH * 0.30,  label: 'plant' },
      { x: w - 90,  y: floorY + floorH * 0.68,  label: 'magazine_rack' },
    ];

    // Collision obstacles
    this.obstacles = [
      ...stations.map(s => ({ x: s.deskX - 5, y: s.deskY - 5, w: s.deskW + 10, h: s.deskH + 10, deskIndex: s.index })),
      { x: 0,    y: floorY + 5,             w: 30, h: 80 },   // left bookshelf
      { x: 0,    y: floorY + floorH * 0.46, w: 45, h: 55 },   // left sofa
      { x: w-28, y: floorY + 3,             w: 28, h: 55 },    // right counter
      { x: w-30, y: floorY + floorH * 0.23, w: 30, h: 80 },   // right bar + pastry
    ];

    this.workstations = stations;
    return stations;
  }

  update(dt) {
    this.warmGlow += dt * 0.002;
    this.screenFlicker += dt;
    if (this.weather === 'rain') {
      this.rainDrops.forEach(d => {
        d.y += d.speed;
        d.x += 0.5;
        if (d.y > this.canvas.height * 0.55) {
          d.y = -d.length;
          d.x = Math.random() * this.canvas.width;
        }
      });
    }
    if (this.weather === 'snow') {
      for (const s of this.cafeSnow) {
        s.y += s.speed * dt;
        s.drift += dt * 0.002;
        s.x += Math.sin(s.drift) * 0.03;
        if (s.y > 70) { s.y = -3; s.x = Math.random() * 120; }
      }
    }
    this.steamParticles.forEach(p => {
      p.life += dt * 0.05;
      if (p.life > p.maxLife) {
        p.life = 0;
        p.x = 0; p.y = 0;
      }
      p.x += p.vx;
      p.y += p.vy;
    });
  }

  /** Render background + static decorations */
  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0);

    // ── Window weather rendering ──
    const cwx = w - 150, cwy = 18, cww = 120, cwh = 70;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cwx, cwy, cww, cwh);
    ctx.clip();

    if (this.weather === 'rain') {
      // Rain on window
      ctx.strokeStyle = 'rgba(180, 200, 220, 0.5)';
      ctx.lineWidth = 1;
      this.rainDrops.forEach(d => {
        if (d.x > cwx && d.x < cwx + cww) {
          ctx.globalAlpha = d.opacity;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + 1, d.y + d.length);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    } else if (this.weather === 'sunny') {
      // Warm sunny day — amber sky, sun
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(cwx, cwy, cww, cwh);
      // Sun
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(cwx + 30, cwy + 25, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF8DC';
      ctx.beginPath(); ctx.arc(cwx + 30, cwy + 25, 9, 0, Math.PI * 2); ctx.fill();
      // Soft clouds
      ctx.fillStyle = '#FFF';
      ctx.fillRect(cwx + 60, cwy + 20, 20, 6); ctx.fillRect(cwx + 63, cwy + 17, 14, 4);
      ctx.fillRect(cwx + 85, cwy + 35, 15, 5); ctx.fillRect(cwx + 87, cwy + 32, 10, 4);
    } else if (this.weather === 'snow') {
      // Snowy — grey sky + snowflakes
      ctx.fillStyle = '#8899AA';
      ctx.fillRect(cwx, cwy, cww, cwh);
      ctx.fillStyle = '#FFF';
      for (const s of this.cafeSnow) {
        ctx.globalAlpha = 0.6 + Math.sin(s.drift) * 0.3;
        ctx.beginPath(); ctx.arc(cwx + s.x, cwy + s.y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Snow on sill
      ctx.fillStyle = '#E8EEF4';
      ctx.fillRect(cwx, cwy + cwh - 5, cww, 5);
    } else if (this.weather === 'fog') {
      // Foggy — milky white layers
      ctx.fillStyle = '#C8CDD5';
      ctx.fillRect(cwx, cwy, cww, cwh);
      for (let i = 0; i < 4; i++) {
        const fy = cwy + 10 + i * 15;
        const alpha = 0.15 + Math.sin(this.warmGlow + i) * 0.08;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(cwx, fy, cww, 10);
      }
    }
    ctx.restore();

    // Rain streaks on window glass (only when raining)
    if (this.weather === 'rain') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cwx, cwy, cww, cwh);
      ctx.clip();
      ctx.strokeStyle = 'rgba(200, 220, 240, 0.15)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const sx = cwx + 10 + i * 25;
        ctx.beginPath();
        ctx.moveTo(sx, cwy);
        for (let j = 0; j < 8; j++) {
          ctx.lineTo(sx + Math.sin(j + i) * 3, cwy + j * 10);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Warm ambient light ──
    const glowIntensity = 0.08 + Math.sin(this.warmGlow) * 0.02;
    const warmGrad = ctx.createRadialGradient(w * 0.35, h * 0.35, 10, w * 0.35, h * 0.35, 200);
    warmGrad.addColorStop(0, `rgba(255, 200, 100, ${glowIntensity})`);
    warmGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warmGrad;
    ctx.fillRect(0, 0, w, h);

    const floorY = Math.round(h * 0.40);
    const floorH = h - floorY;
    const wallSafe = Math.round(h * 0.12);

    // ── Wall decorations ──
    this._drawHangingLamp(ctx, w * 0.30, 0);
    this._drawHangingLamp(ctx, w * 0.70, 0);
    this._drawMenuBoard(ctx, 25, wallSafe, 65, 44);
    this._drawCafeArt(ctx, w * 0.55, wallSafe + 2, 50, 36);
    this._drawClock(ctx, w - 40, wallSafe + 8);

    // ── LEFT WALL: bookshelf + sofa ──
    this._drawSideBookshelf(ctx, 0, floorY + 8, 22, 78, 'left');
    this._drawSideSofa(ctx, 0, floorY + floorH * 0.46, 42, 50, 'left');
    ctx.drawImage(this.gen.generateFurniture('plant'), 3, floorY + floorH * 0.28, 22, 30);

    // ── RIGHT WALL: coffee counter + pastry case ──
    this._drawSideCoffeeCounter(ctx, w - 25, floorY + 5, 25, 52, 'right');
    this._drawSidePastryCase(ctx, w - 25, floorY + floorH * 0.25, 25, 75, 'right');
    ctx.drawImage(this.gen.generateFurniture('plant'), w - 22, floorY + floorH * 0.68, 22, 30);
  }

  /** Render café chair (behind character) */
  renderChair(ctx, s) {
    const x = s.chairX, y = s.chairY, cw = s.chairW, ch = s.chairH;
    // Wooden café chair with cushion
    // Back rest — rounded wooden frame
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(x + 4, y, cw - 8, ch * 0.45);
    // Cross bar on back
    ctx.fillStyle = '#7A4E2C';
    ctx.fillRect(x + 6, y + 4, cw - 12, 2);
    ctx.fillRect(x + 6, y + Math.floor(ch * 0.25), cw - 12, 2);
    // Side posts
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(x + 4, y, 3, ch * 0.65);
    ctx.fillRect(x + cw - 7, y, 3, ch * 0.65);
    // Seat — warm cushion
    ctx.fillStyle = '#CD853F';
    ctx.fillRect(x + 2, y + ch * 0.40, cw - 4, ch * 0.30);
    // Cushion highlight
    ctx.fillStyle = '#D4946A';
    ctx.fillRect(x + 4, y + ch * 0.42, cw - 8, ch * 0.12);
    // Cushion stitch
    ctx.fillStyle = '#B8734A';
    ctx.fillRect(x + cw / 2 - 1, y + ch * 0.44, 2, ch * 0.20);
    // Legs
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(x + 4, y + ch * 0.70, 3, ch * 0.30);
    ctx.fillRect(x + cw - 7, y + ch * 0.70, 3, ch * 0.30);
    // Front legs
    ctx.fillStyle = '#7A4E2C';
    ctx.fillRect(x + 6, y + ch - 4, 3, 4);
    ctx.fillRect(x + cw - 9, y + ch - 4, 3, 4);
  }

  /** Render café table + laptop + latte (in front of character) */
  renderDesk(ctx, s, agentState) {
    const isWorking = ['typing', 'executing', 'browsing'].includes(agentState);

    // ── Café table — warm wood with rounded feel ──
    // Top surface
    ctx.fillStyle = '#D4A56A';
    ctx.fillRect(s.deskX, s.deskY, s.deskW, 7);
    // Top highlight
    ctx.fillStyle = '#E0B878';
    ctx.fillRect(s.deskX + 2, s.deskY, s.deskW - 4, 2);
    // Front face
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(s.deskX, s.deskY + 7, s.deskW, s.deskH - 7);
    // Apron trim
    ctx.fillStyle = '#7A4E2C';
    ctx.fillRect(s.deskX, s.deskY + 7, s.deskW, 3);
    // Side edges
    ctx.fillStyle = '#7A4E2C';
    ctx.fillRect(s.deskX, s.deskY + 10, 2, s.deskH - 12);
    ctx.fillRect(s.deskX + s.deskW - 2, s.deskY + 10, 2, s.deskH - 12);
    // Bottom trim
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(s.deskX + 2, s.deskY + s.deskH - 2, s.deskW - 4, 2);
    // Legs — tapered wooden
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(s.deskX + 8, s.deskY + s.deskH, 4, 5);
    ctx.fillRect(s.deskX + s.deskW - 12, s.deskY + s.deskH, 4, 5);
    // Wood grain hints
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(s.deskX + 10, s.deskY + 2, 20, 1);
    ctx.fillRect(s.deskX + 40, s.deskY + 4, 25, 1);

    // ── Laptop on table ──
    const monType = isWorking && Math.floor(this.screenFlicker / 400) % 2 === 0 ? 'laptop_active' : 'laptop';
    ctx.drawImage(this.gen.generateFurniture(monType), s.monX, s.monY, s.monW, s.monH);

    // Screen glow when working
    if (isWorking) {
      ctx.fillStyle = 'rgba(100,200,255,0.04)';
      ctx.fillRect(s.monX - 6, s.monY - 3, s.monW + 12, s.monH + 6);
    }

    // ── Latte with art ──
    const lx = s.cupX, ly = s.cupY;
    // Saucer
    ctx.fillStyle = '#ECE5D8';
    ctx.fillRect(lx - 3, ly + s.cupH - 2, s.cupW + 4, 4);
    // Cup body — wider, shorter
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(lx, ly + 2, s.cupW - 2, s.cupH - 2);
    // Latte art (top)
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(lx, ly + 2, s.cupW - 2, 4);
    // Heart latte art
    ctx.fillStyle = '#F5E6D3';
    ctx.fillRect(lx + 3, ly + 3, 3, 2);
    ctx.fillRect(lx + 8, ly + 3, 3, 2);
    ctx.fillRect(lx + 4, ly + 5, 6, 1);
    // Handle
    ctx.fillStyle = '#DDD';
    ctx.fillRect(lx + s.cupW - 2, ly + 6, 3, 5);
    ctx.fillRect(lx + s.cupW, ly + 5, 2, 1);
    ctx.fillRect(lx + s.cupW, ly + 11, 2, 1);

    // ── Steam from latte ──
    this.steamParticles.forEach(p => {
      const px = lx + s.cupW / 2 + p.x;
      const py = ly + p.y * 15;
      const alpha = Math.max(0, 1 - p.life / p.maxLife) * 0.35;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 2 + p.life * 0.02, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Small pastry plate ──
    const ppX = s.deskX + s.deskW / 2 + 8;
    const ppY = s.deskY - 10;
    // Plate
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(ppX, ppY + 6, 16, 4);
    // Croissant
    ctx.fillStyle = '#D4A056';
    ctx.fillRect(ppX + 2, ppY + 2, 12, 5);
    ctx.fillStyle = '#C4903E';
    ctx.fillRect(ppX + 4, ppY + 3, 8, 3);
    ctx.fillStyle = '#E0B878';
    ctx.fillRect(ppX + 5, ppY + 2, 4, 1);
  }

  // ── Wall decorations ──

  _drawHangingLamp(ctx, x, y) {
    // Warm pendant lamp
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 1, y, 2, 28);
    // Shade
    ctx.fillStyle = '#F39C12';
    ctx.beginPath();
    ctx.moveTo(x - 12, 28);
    ctx.lineTo(x + 12, 28);
    ctx.lineTo(x + 6, 40);
    ctx.lineTo(x - 6, 40);
    ctx.closePath();
    ctx.fill();
    // Warm glow
    const lampGlow = ctx.createRadialGradient(x, 40, 2, x, 40, 55);
    lampGlow.addColorStop(0, 'rgba(255, 220, 130, 0.18)');
    lampGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(x - 55, 28, 110, 80);
  }

  _drawMenuBoard(ctx, x, y, w, h) {
    // Chalkboard menu
    ctx.fillStyle = '#5D3D1A';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#2C3E2C';
    ctx.fillRect(x, y, w, h);
    // Chalk text
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '6px monospace';
    ctx.fillText('MENU', x + 20, y + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '5px monospace';
    ctx.fillText('Latte    $4', x + 4, y + 20);
    ctx.fillText('Mocha    $5', x + 4, y + 28);
    ctx.fillText('Espresso $3', x + 4, y + 36);
    // Chalk doodle
    ctx.fillStyle = 'rgba(255,200,100,0.5)';
    ctx.fillRect(x + 48, y + 18, 8, 8);
    ctx.fillStyle = 'rgba(255,150,50,0.4)';
    ctx.fillRect(x + 50, y + 20, 4, 4);
  }

  _drawCafeArt(ctx, x, y, w, h) {
    // Framed art print — coffee cup illustration
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#FFF8E8';
    ctx.fillRect(x, y, w, h);
    // Simple coffee cup illustration
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(x + 15, y + 10, 20, 16);
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(x + 15, y + 10, 20, 3);
    ctx.fillStyle = '#ECE5D8';
    ctx.fillRect(x + 12, y + 26, 26, 3);
    // Steam swirls
    ctx.fillStyle = 'rgba(180,160,140,0.4)';
    ctx.fillRect(x + 20, y + 5, 2, 5);
    ctx.fillRect(x + 25, y + 6, 2, 4);
    ctx.fillRect(x + 29, y + 5, 2, 5);
  }

  _drawClock(ctx, x, y) {
    // Vintage round clock
    ctx.fillStyle = '#5D3D1A';
    ctx.beginPath(); ctx.arc(x, y + 10, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF8E8';
    ctx.beginPath(); ctx.arc(x, y + 10, 10, 0, Math.PI * 2); ctx.fill();
    // Hour marks
    ctx.fillStyle = '#8B5E3C';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ctx.fillRect(x + Math.cos(a) * 8 - 0.5, y + 10 + Math.sin(a) * 8 - 0.5, 1, 1);
    }
    const now = new Date(), hr = now.getHours() % 12, mn = now.getMinutes();
    ctx.strokeStyle = '#5D3D1A'; ctx.lineWidth = 1.5;
    const ha = (hr + mn / 60) * Math.PI / 6 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + Math.cos(ha) * 5, y + 10 + Math.sin(ha) * 5); ctx.stroke();
    ctx.lineWidth = 1;
    const ma = mn * Math.PI / 30 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + Math.cos(ma) * 7, y + 10 + Math.sin(ma) * 7); ctx.stroke();
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath(); ctx.arc(x, y + 10, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── Side-view floor furniture ──

  _drawSideBookshelf(ctx, x, y, depth, h, side) {
    const frameColor = '#6B4226', backColor = '#8B5E3C', shelfColor = '#5D3A1A';
    const bookColors = ['#C0392B', '#2980B9', '#27AE60', '#F39C12', '#8E44AD', '#16A085', '#D35400'];
    ctx.fillStyle = frameColor; ctx.fillRect(x, y, depth, h);
    ctx.fillStyle = backColor; ctx.fillRect(x + 2, y + 2, depth - 4, h - 4);
    const edgeX = side === 'left' ? x + depth - 3 : x;
    ctx.fillStyle = shelfColor; ctx.fillRect(edgeX, y, 3, h);
    const shelfCount = 4;
    const shelfGap = Math.floor((h - 6) / shelfCount);
    for (let i = 0; i < shelfCount; i++) {
      const sy = y + 4 + i * shelfGap;
      ctx.fillStyle = shelfColor; ctx.fillRect(x + 2, sy, depth - 4, 2);
      for (let b = 0; b < 3; b++) {
        const bh = shelfGap - 6;
        const bw = 2 + (b % 2);
        const bx = x + 4 + b * (bw + 1);
        ctx.fillStyle = bookColors[(i * 3 + b) % bookColors.length];
        ctx.fillRect(bx, sy - bh, bw, bh);
      }
    }
    ctx.fillStyle = shelfColor;
    ctx.fillRect(x - 1, y - 2, depth + 2, 3);
    ctx.fillRect(x - 1, y + h - 1, depth + 2, 3);
  }

  _drawSideSofa(ctx, x, y, depth, h, side) {
    // Warm leather sofa
    const sofaColor = '#A0522D', sofaDark = '#8B4513', sofaLight = '#B8623D';
    ctx.fillStyle = sofaDark; ctx.fillRect(x, y, depth, h);
    ctx.fillStyle = sofaColor; ctx.fillRect(x + 3, y + 6, depth - 6, h - 10);
    // Back rest
    ctx.fillStyle = sofaDark; ctx.fillRect(x + 2, y, depth - 4, 10);
    ctx.fillStyle = sofaLight; ctx.fillRect(x + 4, y + 2, depth - 8, 6);
    // Seat cushion
    ctx.fillStyle = sofaLight; ctx.fillRect(x + 5, y + 14, depth - 10, h - 22);
    // Seams
    ctx.fillStyle = sofaDark;
    ctx.fillRect(x + 5, y + Math.floor(h * 0.45), depth - 10, 1);
    ctx.fillRect(x + 5, y + Math.floor(h * 0.65), depth - 10, 1);
    // Legs
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x + 4, y + h - 2, 4, 4);
    ctx.fillRect(x + depth - 8, y + h - 2, 4, 4);
    // Throw pillow
    ctx.fillStyle = '#E8D4B8';
    const px = side === 'left' ? x + depth - 12 : x + 4;
    ctx.fillRect(px, y + 4, 8, 12);
    ctx.fillStyle = '#D4C0A4'; ctx.fillRect(px + 1, y + 5, 6, 10);
  }

  _drawSideCoffeeCounter(ctx, x, y, depth, h, side) {
    // Wooden coffee counter / bar
    const woodColor = '#7B5B3A', woodDark = '#5D3A1A', woodLight = '#9B7B5A';
    ctx.fillStyle = woodLight; ctx.fillRect(x, y, depth, 4);
    ctx.fillStyle = woodColor; ctx.fillRect(x, y + 4, depth, h - 4);
    // Wood grain
    ctx.fillStyle = woodDark;
    for (let ly = y + 12; ly < y + h; ly += 10) {
      ctx.fillRect(x + 2, ly, depth - 4, 1);
    }
    // Front edge
    const edgeX = side === 'right' ? x : x + depth - 3;
    ctx.fillStyle = woodDark; ctx.fillRect(edgeX, y, 3, h);
    // Top highlight
    ctx.fillStyle = woodLight; ctx.fillRect(x, y, depth, 2);
    // Coffee machine on top
    ctx.fillStyle = '#708090'; ctx.fillRect(x + 3, y - 22, 14, 22);
    ctx.fillStyle = '#5A6A7A'; ctx.fillRect(x + 5, y - 20, 10, 8);
    // Power LED
    ctx.fillStyle = '#2ECC71'; ctx.fillRect(x + 7, y - 15, 2, 2);
    // Group head / drip area
    ctx.fillStyle = '#555'; ctx.fillRect(x + 5, y - 10, 10, 8);
    ctx.fillStyle = '#444'; ctx.fillRect(x + 7, y - 8, 6, 4);
    // Tiny cup
    ctx.fillStyle = '#FFF'; ctx.fillRect(x + 7, y - 4, 4, 3);
    ctx.fillStyle = '#8B4513'; ctx.fillRect(x + 8, y - 3, 2, 1);
    // Steam
    ctx.fillStyle = 'rgba(200,200,200,0.4)';
    ctx.fillRect(x + 8, y - 7, 1, 3);
    ctx.fillRect(x + 11, y - 8, 1, 3);
  }

  _drawSidePastryCase(ctx, x, y, depth, h, side) {
    // Glass pastry display case
    // Frame
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(x, y, depth, h);
    // Glass panel (translucent)
    ctx.fillStyle = 'rgba(200, 220, 240, 0.25)';
    ctx.fillRect(x + 2, y + 2, depth - 4, h - 4);
    // Front edge
    const edgeX = side === 'right' ? x : x + depth - 3;
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(edgeX, y, 3, h);
    // Shelves
    ctx.fillStyle = '#7A4E2C';
    ctx.fillRect(x + 2, y + Math.floor(h * 0.33), depth - 4, 2);
    ctx.fillRect(x + 2, y + Math.floor(h * 0.66), depth - 4, 2);
    // Pastries on each shelf
    // Top shelf — muffins
    ctx.fillStyle = '#D4A056';
    ctx.fillRect(x + 5, y + 8, 6, 6);
    ctx.fillRect(x + 13, y + 9, 5, 5);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 5, y + 12, 6, 2);
    // Middle shelf — croissants
    const midY = y + Math.floor(h * 0.33) + 4;
    ctx.fillStyle = '#E0B878';
    ctx.fillRect(x + 4, midY, 8, 5);
    ctx.fillRect(x + 14, midY + 1, 7, 4);
    ctx.fillStyle = '#C4903E';
    ctx.fillRect(x + 5, midY + 2, 6, 2);
    // Bottom shelf — cookies
    const botY = y + Math.floor(h * 0.66) + 4;
    ctx.fillStyle = '#C49250';
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(x + 4 + c * 7, botY, 5, 5);
    }
    // Chocolate chips
    ctx.fillStyle = '#5D3A1A';
    ctx.fillRect(x + 5, botY + 2, 2, 2);
    ctx.fillRect(x + 13, botY + 1, 2, 2);
    // Top surface
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(x - 1, y - 2, depth + 2, 3);
    // Small vase on top
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(x + 8, y - 10, 6, 8);
    ctx.fillStyle = '#27AE60';
    ctx.fillRect(x + 9, y - 14, 2, 5);
    ctx.fillRect(x + 12, y - 13, 2, 4);
  }
}

if (typeof window !== 'undefined') window.CafeScene = CafeScene;
