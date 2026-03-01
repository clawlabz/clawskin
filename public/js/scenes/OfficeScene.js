/**
 * OfficeScene.js — Pixel office with proper depth layering per workstation
 *
 * Render order (back to front):
 *   1. Background wall + decorations
 *   2. Per agent: chair → character → desk (hides legs) → monitor + cup on desk
 *   3. Name tags + bubbles on top
 *
 * Characters SIT behind desks — desk surface crosses at waist level.
 */
class OfficeScene {
  constructor(canvas, ctx, spriteGen) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gen = spriteGen;
    this.bgCanvas = null;
    this.cloudX = 0;
    this.sunbeamTimer = 0;
    this.screenFlicker = 0;
    this.name = 'office';
    this.label = '🏢 Office';
    this.workstations = [];

    // Wandering targets (shared locations agents can visit)
    this.poiList = []; // populated in getWorkstations
  }

  init() {
    this.bgCanvas = this.gen.generateSceneBg('office', this.canvas.width, this.canvas.height);
  }

  getCharacterPosition() {
    return { x: this.canvas.width / 2 - 48, y: this.canvas.height * 0.38 };
  }

  /**
   * Calculate workstation layout for N agents.
   * All coordinates are absolute canvas pixels.
   */
  getWorkstations(count) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const floorY = Math.round(h * 0.40); // floor line
    const stations = [];

    // Character scale
    const cs = 2.5;                       // slightly smaller for better proportions
    const charH = Math.round(32 * cs);    // 80px
    const charW = Math.round(32 * cs);    // 80px

    // Furniture sizes (display pixels) — 3/4 top-down view
    const deskW = 120, deskH = 42;        // desk (top surface + front face)
    const monW = 44,  monH = 44;          // iMac back view — square-ish, Apple logo visible
    const chairW = 36, chairH = 40;       // 3/4 chair
    const cupW = 16, cupH = 20;

    // Desk surface Y — pushed down into the floor area, away from wall
    const deskSurfaceY = floorY + 50;

    if (count <= 0) return stations;

    // Horizontal spacing
    const positions = [];
    if (count === 1) {
      positions.push(w / 2);
    } else if (count <= 4) {
      for (let i = 0; i < count; i++) {
        positions.push((w / (count + 1)) * (i + 1));
      }
    } else {
      // Two rows for 5+
      const topN = Math.ceil(count / 2);
      const botN = count - topN;
      for (let i = 0; i < topN; i++) positions.push((w / (topN + 1)) * (i + 1));
      for (let i = 0; i < botN; i++) positions.push((w / (botN + 1)) * (i + 1));
    }

    for (let i = 0; i < count; i++) {
      const cx = Math.round(positions[i]);
      const isBackRow = count > 4 && i >= Math.ceil(count / 2);
      const rowDeskY = isBackRow ? deskSurfaceY + 70 : deskSurfaceY;

      // 3/4 RPG view: character sits close to desk
      // Monitor is flat/tilted so it's very short — doesn't block upper body
      const charY = rowDeskY - charH + 10; // character close to desk, legs slightly behind desk
      const deskY = rowDeskY;

      stations.push({
        // Character: sitting at desk, upper body fully visible above the flat monitor
        charX: cx - charW / 2,
        charY: charY,
        charScale: cs,

        // Chair: behind character
        chairX: cx - chairW / 2,
        chairY: charY + charH * 0.3,
        chairW, chairH,

        // Desk: in front of character
        deskX: cx - deskW / 2,
        deskY: deskY,
        deskW, deskH,

        // iMac 45° angled: on desk LEFT side, away from character center
        monX: cx - deskW / 2 + 6,         // flush left on desk
        monY: deskY - monH + 10,          // base sits on desk surface
        monW, monH,

        // Coffee cup: on desk right side
        cupX: cx + deskW / 2 - cupW - 12,
        cupY: deskY - cupH + 8,
        cupW, cupH,

        // Center point (for returning from walks)
        cx, cy: rowDeskY,
        index: i,
      });
    }

    // Points of interest for wandering — far enough from walls for 80px-wide characters
    const floorH = h - floorY;
    this.poiList = [
      { x: w / 2,   y: 30,                     label: 'window' },
      { x: 80,      y: floorY + 30,            label: 'bookshelf' },
      { x: w - 90,  y: floorY + 20,            label: 'fridge' },
      { x: 90,      y: floorY + floorH * 0.55, label: 'sofa' },
      { x: w - 90,  y: floorY + floorH * 0.45, label: 'bar' },
      { x: w - 90,  y: floorY + floorH * 0.28, label: 'coffee_machine' },
      { x: 80,      y: floorY + floorH * 0.30, label: 'plant' },
      { x: w - 90,  y: floorY + floorH * 0.68, label: 'plant' },
    ];

    // Collision obstacles — solid rects that agents/pets must avoid
    this.obstacles = [
      ...stations.map(s => ({x: s.deskX - 5, y: s.deskY - 5, w: s.deskW + 10, h: s.deskH + 10, deskIndex: s.index})),
      {x: 0, y: floorY + 5, w: 30, h: 92},            // left bookshelf
      {x: 0, y: floorY + floorH * 0.46, w: 50, h: 62}, // left sofa
      {x: w - 28, y: floorY + 3, w: 28, h: 58},        // right fridge
      {x: w - 30, y: floorY + floorH * 0.23, w: 30, h: 85}, // right bar + coffee
    ];

    this.workstations = stations;
    return stations;
  }

  update(dt) {
    this.cloudX += dt * 0.003;
    this.sunbeamTimer += dt;
    this.screenFlicker += dt;
  }

  /** Render background wall + static decorations (called once per frame) */
  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0);

    // Animated clouds — inside window, pushed down to match new window position
    const wx = (w - 80) / 2;
    const wy = Math.round(h * 0.08);
    ctx.save();
    ctx.beginPath(); ctx.rect(wx, wy + 2, 80, 70); ctx.clip();
    ctx.fillStyle = '#FFF';
    const cx1 = wx + ((this.cloudX * 20) % 120) - 20;
    ctx.fillRect(cx1, wy + 20, 18, 6); ctx.fillRect(cx1 + 3, wy + 17, 11, 4);
    const cx2 = wx + ((this.cloudX * 12 + 60) % 130) - 10;
    ctx.fillRect(cx2, wy + 35, 14, 5); ctx.fillRect(cx2 + 2, wy + 32, 9, 4);
    ctx.restore();

    // Sunbeam
    const floorLine = h * 0.40;
    if (Math.sin(this.sunbeamTimer * 0.001) > 0) {
      ctx.fillStyle = 'rgba(255,255,200,0.04)';
      const bx = wx + 60;
      ctx.beginPath(); ctx.moveTo(bx, wy + 80); ctx.lineTo(bx+40, wy); ctx.lineTo(bx+55, wy); ctx.lineTo(bx+80, h*0.55); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,200,0.3)';
      for (let i = 0; i < 5; i++) {
        const px = bx + 20 + Math.sin(this.sunbeamTimer*0.0005+i*2)*25;
        const py = wy + 30 + ((this.sunbeamTimer*0.02+i*40)%(h*0.25));
        ctx.beginPath(); ctx.arc(px,py,1.5,0,Math.PI*2); ctx.fill();
      }
    }

    // Wall decorations — below top UI safe zone (~50px from top)
    const wallSafe = Math.round(h * 0.12);  // safe Y start below UI
    ctx.drawImage(this.gen.generateFurniture('bookshelf'), 15, wallSafe, 48, 64);
    ctx.drawImage(this.gen.generateFurniture('plant'), 75, floorLine - 36, 26, 36);
    ctx.drawImage(this.gen.generateFurniture('lamp'), 100, wallSafe + 5, 18, 32);
    ctx.drawImage(this.gen.generateFurniture('lamp'), w-110, wallSafe + 5, 18, 32);
    this._drawWhiteboard(ctx, w*0.15, wallSafe + 2, 70, 44);
    this._drawClock(ctx, w-45, wallSafe + 8);
    this._drawWaterCooler(ctx, w-80, floorLine - 30);

    // ── Floor decorations — side-view, pressed against left/right walls ──
    const floorH = h - floorLine;

    // LEFT WALL — furniture faces RIGHT (side-view: thin width = depth, height = visible front)
    this._drawSideBookshelf(ctx, 0, floorLine + 8, 22, 90, 'left');
    this._drawSideSofa(ctx, 0, floorLine + floorH * 0.46, 45, 55, 'left');
    ctx.drawImage(this.gen.generateFurniture('plant'), 3, floorLine + floorH * 0.28, 22, 30);

    // RIGHT WALL — furniture faces LEFT (mirrored side-view)
    this._drawSideFridge(ctx, w - 22, floorLine + 5, 22, 55, 'right');
    this._drawSideBar(ctx, w - 25, floorLine + floorH * 0.25, 25, 80, 'right');
    this._drawSideCoffeeMachine(ctx, w - 18, floorLine + floorH * 0.25 - 32, 18, 30, 'right');
    ctx.drawImage(this.gen.generateFurniture('plant'), w - 22, floorLine + floorH * 0.68, 22, 30);
  }

  /** Render chair (behind character) */
  renderChair(ctx, s) {
    ctx.drawImage(this.gen.generateFurniture('chair'), s.chairX, s.chairY, s.chairW, s.chairH);
  }

  /** Render desk + laptop + cup (in front of character in 3/4 view) */
  renderDesk(ctx, s, agentState) {
    const isWorking = ['typing','executing','browsing'].includes(agentState);

    // Desk surface first (3/4 view — top surface + front face)
    ctx.drawImage(this.gen.generateFurniture('desk'), s.deskX, s.deskY, s.deskW, s.deskH);

    // Laptop on desk surface
    const monType = isWorking && Math.floor(this.screenFlicker/400)%2===0 ? 'laptop_active' : 'laptop';
    ctx.drawImage(this.gen.generateFurniture(monType), s.monX, s.monY, s.monW, s.monH);

    // Laptop screen glow when working
    if (isWorking) {
      ctx.fillStyle = 'rgba(100,200,255,0.04)';
      ctx.fillRect(s.monX-6, s.monY-3, s.monW+12, s.monH+6);
    }

    // Coffee cup on desk
    ctx.drawImage(this.gen.generateFurniture('coffee_cup'), s.cupX, s.cupY, s.cupW, s.cupH);
  }

  _drawWaterCooler(ctx, x, y) {
    ctx.fillStyle='#B0C4DE'; ctx.fillRect(x,y,14,26);
    ctx.fillStyle='#87CEEB'; ctx.fillRect(x+2,y+2,10,10);
    ctx.fillStyle='#708090'; ctx.fillRect(x-2,y+24,18,3);
    ctx.fillStyle='#FFF'; ctx.fillRect(x+3,y+14,3,2);
    ctx.fillStyle='#E74C3C'; ctx.fillRect(x+8,y+14,3,2);
  }
  _drawWhiteboard(ctx, x, y, w, h) {
    ctx.fillStyle='#A0A0A0'; ctx.fillRect(x-2,y-2,w+4,h+4);
    ctx.fillStyle='#F8F8F8'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#4A90D9'; ctx.fillRect(x+4,y+7,22,2); ctx.fillRect(x+4,y+12,30,2);
    ctx.fillStyle='#E74C3C'; ctx.fillRect(x+40,y+7,12,12);
    ctx.fillStyle='#2ECC71'; ctx.fillRect(x+4,y+24,25,2); ctx.fillRect(x+4,y+30,35,2);
  }
  _drawClock(ctx, x, y) {
    ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(x,y+10,11,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#F8F8F8'; ctx.beginPath(); ctx.arc(x,y+10,9,0,Math.PI*2); ctx.fill();
    const now=new Date(), hr=now.getHours()%12, mn=now.getMinutes();
    ctx.strokeStyle='#333'; ctx.lineWidth=1.5;
    const ha=(hr+mn/60)*Math.PI/6-Math.PI/2;
    ctx.beginPath(); ctx.moveTo(x,y+10); ctx.lineTo(x+Math.cos(ha)*5,y+10+Math.sin(ha)*5); ctx.stroke();
    ctx.lineWidth=1; const ma=mn*Math.PI/30-Math.PI/2;
    ctx.beginPath(); ctx.moveTo(x,y+10); ctx.lineTo(x+Math.cos(ma)*7,y+10+Math.sin(ma)*7); ctx.stroke();
    ctx.fillStyle='#E74C3C'; ctx.beginPath(); ctx.arc(x,y+10,1.5,0,Math.PI*2); ctx.fill();
  }

  // ── Side-view floor decoration draw methods ──
  // Furniture is pressed flat against the left/right wall.
  // "depth" is the thin dimension going into the room; "h" is the tall front face.

  _drawSideBookshelf(ctx, x, y, depth, h, side) {
    // Side panel (visible depth going into room)
    const frameColor = '#6B4226', backColor = '#8B5E3C', shelfColor = '#5D3A1A';
    const bookColors = ['#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6','#1ABC9C','#E67E22'];
    // Outer frame
    ctx.fillStyle = frameColor; ctx.fillRect(x, y, depth, h);
    // Inner back
    ctx.fillStyle = backColor; ctx.fillRect(x + 2, y + 2, depth - 4, h - 4);
    // Front-facing edge (the side we see is the narrow depth)
    const edgeX = side === 'left' ? x + depth - 3 : x;
    ctx.fillStyle = shelfColor; ctx.fillRect(edgeX, y, 3, h);
    // Shelves — horizontal dividers
    const shelfCount = 5;
    const shelfGap = Math.floor((h - 6) / shelfCount);
    for (let i = 0; i < shelfCount; i++) {
      const sy = y + 4 + i * shelfGap;
      ctx.fillStyle = shelfColor; ctx.fillRect(x + 2, sy, depth - 4, 2);
      // Books — vertical spines visible from the side
      for (let b = 0; b < 3; b++) {
        const bh = shelfGap - 6;
        const bw = 2 + (b % 2);
        const bx = x + 4 + b * (bw + 1);
        ctx.fillStyle = bookColors[(i * 3 + b) % bookColors.length];
        ctx.fillRect(bx, sy - bh, bw, bh);
      }
    }
    // Top/bottom trim
    ctx.fillStyle = shelfColor;
    ctx.fillRect(x - 1, y - 2, depth + 2, 3);
    ctx.fillRect(x - 1, y + h - 1, depth + 2, 3);
  }

  _drawSideSofa(ctx, x, y, depth, h, side) {
    // Side-view sofa: we see the arm rest + cushion profile
    const sofaColor = '#5B7BA5', sofaDark = '#4A6A8E', sofaLight = '#6B8BB5';
    // Arm rest (the full side face)
    ctx.fillStyle = sofaDark; ctx.fillRect(x, y, depth, h);
    // Inner cushion area
    ctx.fillStyle = sofaColor; ctx.fillRect(x + 3, y + 6, depth - 6, h - 10);
    // Back rest (top portion)
    ctx.fillStyle = sofaDark; ctx.fillRect(x + 2, y, depth - 4, 10);
    ctx.fillStyle = sofaLight; ctx.fillRect(x + 4, y + 2, depth - 8, 6);
    // Seat cushion profile
    ctx.fillStyle = sofaLight; ctx.fillRect(x + 5, y + 14, depth - 10, h - 22);
    // Cushion seam — horizontal line
    ctx.fillStyle = sofaDark;
    ctx.fillRect(x + 5, y + Math.floor(h * 0.45), depth - 10, 1);
    ctx.fillRect(x + 5, y + Math.floor(h * 0.65), depth - 10, 1);
    // Legs
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x + 4, y + h - 2, 4, 4);
    ctx.fillRect(x + depth - 8, y + h - 2, 4, 4);
    // Pillow leaning against back
    ctx.fillStyle = '#E8D4B8';
    const px = side === 'left' ? x + depth - 12 : x + 4;
    ctx.fillRect(px, y + 4, 8, 12);
    ctx.fillStyle = '#D4C0A4'; ctx.fillRect(px + 1, y + 5, 6, 10);
  }

  _drawSideFridge(ctx, x, y, depth, h, side) {
    // Side-view fridge: we see the narrow side panel
    ctx.fillStyle = '#C8CDD3'; ctx.fillRect(x, y, depth, h);           // side panel
    ctx.fillStyle = '#D0D5DB'; ctx.fillRect(x + 2, y + 2, depth - 4, h - 4); // inset
    // Door edge line (front-facing edge)
    const edgeX = side === 'right' ? x : x + depth - 3;
    ctx.fillStyle = '#A0A8B0'; ctx.fillRect(edgeX, y, 3, h);
    // Door split line
    ctx.fillStyle = '#A0A8B0'; ctx.fillRect(x, y + Math.floor(h * 0.6), depth, 2);
    // Handle on front edge
    ctx.fillStyle = '#888';
    ctx.fillRect(edgeX + 1, y + Math.floor(h * 0.25), 1, 8);
    ctx.fillRect(edgeX + 1, y + Math.floor(h * 0.72), 1, 6);
    // Top surface
    ctx.fillStyle = '#E0E5EB'; ctx.fillRect(x, y - 2, depth, 3);
    // Brand sticker on side
    ctx.fillStyle = '#4A90D9'; ctx.fillRect(x + 6, y + 5, 8, 3);
    // Magnet
    ctx.fillStyle = '#E74C3C'; ctx.fillRect(x + 5, y + 14, 3, 3);
    ctx.fillStyle = '#F1C40F'; ctx.fillRect(x + 12, y + 12, 3, 3);
  }

  _drawSideBar(ctx, x, y, depth, h, side) {
    // Side-view bar counter: we see the narrow profile
    const woodColor = '#7B5B3A', woodDark = '#5D3A1A', woodLight = '#9B7B5A';
    // Counter top (narrow strip)
    ctx.fillStyle = woodLight; ctx.fillRect(x, y, depth, 4);
    ctx.fillStyle = woodColor; ctx.fillRect(x, y + 4, depth, h - 4);
    // Wood grain — horizontal lines on side panel
    ctx.fillStyle = woodDark;
    for (let ly = y + 12; ly < y + h; ly += 12) {
      ctx.fillRect(x + 2, ly, depth - 4, 1);
    }
    // Front-facing edge
    const edgeX = side === 'right' ? x : x + depth - 3;
    ctx.fillStyle = woodDark; ctx.fillRect(edgeX, y, 3, h);
    // Top highlight
    ctx.fillStyle = woodLight; ctx.fillRect(x, y, depth, 2);
    // Items on top of counter — bottles (seen from side)
    ctx.fillStyle = '#2ECC71'; ctx.fillRect(x + 4, y - 12, 4, 12);
    ctx.fillStyle = '#27AE60'; ctx.fillRect(x + 5, y - 14, 2, 3);
    ctx.fillStyle = '#E74C3C'; ctx.fillRect(x + 12, y - 10, 4, 10);
    ctx.fillStyle = '#C0392B'; ctx.fillRect(x + 13, y - 12, 2, 3);
    // Cup
    ctx.fillStyle = '#FFF'; ctx.fillRect(x + 8, y - 6, 3, 6);
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(x + 9, y - 4, 1, 3);
    // Bar stool in front (facing into room)
    const stoolX = side === 'right' ? x - 14 : x + depth + 4;
    this._drawSideBarStool(ctx, stoolX, y + h - 8);
    this._drawSideBarStool(ctx, stoolX, y + h - 38);
  }

  _drawSideBarStool(ctx, x, y) {
    ctx.fillStyle = '#4A4A4A'; ctx.fillRect(x + 3, y, 2, 12); // stem
    ctx.fillStyle = '#333'; ctx.fillRect(x, y - 3, 8, 4);      // seat top
    ctx.fillStyle = '#555'; ctx.fillRect(x + 1, y + 11, 6, 2); // base
  }

  _drawSideCoffeeMachine(ctx, x, y, depth, h, side) {
    // Side-view espresso machine sitting on the bar counter
    ctx.fillStyle = '#708090'; ctx.fillRect(x, y, depth, h);
    ctx.fillStyle = '#5A6A7A'; ctx.fillRect(x + 2, y + 2, depth - 4, 8);
    // Power LED
    ctx.fillStyle = '#2ECC71'; ctx.fillRect(x + 4, y + 5, 2, 2);
    // Drip area
    ctx.fillStyle = '#555'; ctx.fillRect(x + 3, y + 12, depth - 6, 10);
    ctx.fillStyle = '#444'; ctx.fillRect(x + 5, y + 14, depth - 10, 6);
    // Cup
    ctx.fillStyle = '#FFF'; ctx.fillRect(x + 5, y + 18, 5, 4);
    ctx.fillStyle = '#8B4513'; ctx.fillRect(x + 6, y + 19, 3, 2);
    // Steam wisps
    ctx.fillStyle = 'rgba(200,200,200,0.4)';
    ctx.fillRect(x + 6, y + 15, 1, 3);
    ctx.fillRect(x + 9, y + 14, 1, 3);
    // Base
    ctx.fillStyle = '#5A6A7A'; ctx.fillRect(x - 1, y + h - 2, depth + 2, 3);
  }
}

if (typeof window !== 'undefined') window.OfficeScene = OfficeScene;
