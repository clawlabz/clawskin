/**
 * Pet.js — Independent pet entity with autonomous AI behavior
 * Pets move freely around the office, interact with agents and other pets
 */
class Pet {
  constructor(config) {
    this.id = config.id || Math.random().toString(36).slice(2, 8);
    this.type = config.type || 'cat';         // 'cat' | 'dog' | 'robot' | 'bird' | 'hamster'
    this.moveType = config.moveType || 'walk'; // 'walk' | 'fly' | 'crawl'
    this.color = config.color || null;         // body color (null = random)
    this.x = config.x || 100;
    this.y = config.y || 200;
    this.scale = config.scale || 2.5;
    this.speed = config.speed || 0.04;
    this.facingLeft = false;

    // Pick random color if none given
    if (!this.color) {
      const palette = Pet.COLORS[this.type] || Pet.COLORS.cat;
      this.color = palette[Math.floor(Math.random() * palette.length)];
    }

    // Animation
    this.frame = 0;
    this.frameTimer = 0;
    this.frameInterval = 600; // ms per frame

    // AI behavior
    this.state = 'idle';   // 'idle' | 'moving' | 'sleeping' | 'interacting'
    this.target = null;    // { x, y }
    this.actionTimer = 0;
    this.nextActionTime = 3000 + Math.random() * 5000;
    this.interactLabel = null; // what we're interacting with

    // Flying pets: sine wave bob
    this._flyTime = Math.random() * 10000;
    this._flyBaseY = this.y;
    this._stuckTimer = 0;

    // Sprite generator (shared)
    this.generator = config.generator || new SpriteGenerator();
  }

  /** Pet type metadata */
  static TYPES = {
    cat:     { moveType: 'walk', speed: 0.04, scale: 2.5, sleepChance: 0.20 },
    dog:     { moveType: 'walk', speed: 0.05, scale: 2.5, sleepChance: 0.10 },
    robot:   { moveType: 'walk', speed: 0.03, scale: 2.5, sleepChance: 0.05 },
    bird:    { moveType: 'fly',  speed: 0.06, scale: 2.0, sleepChance: 0.10 },
    hamster: { moveType: 'crawl',speed: 0.02, scale: 2.0, sleepChance: 0.30 },
  };

  /** Color palettes per type */
  static COLORS = {
    cat:     ['#FF9900','#333333','#FFFFFF','#C0C0C0','#D2691E','#FFD700','#8B4513'],
    dog:     ['#D2956A','#8B4513','#F5DEB3','#FFD700','#333333','#FFFFFF','#A0522D'],
    robot:   ['#95A5A6','#3498DB','#E74C3C','#2ECC71','#F39C12','#9B59B6','#1ABC9C'],
    bird:    ['#4FC3F7','#E74C3C','#FFD700','#2ECC71','#FF9800','#9C27B0','#F48FB1'],
    hamster: ['#F5DEB3','#D2B48C','#FFFFFF','#FFD700','#C0C0C0','#DEB887','#FFDAB9'],
  };

  static create(type, generator, sceneBounds, color) {
    const meta = Pet.TYPES[type] || Pet.TYPES.cat;
    return new Pet({
      type,
      moveType: meta.moveType,
      speed: meta.speed,
      scale: meta.scale,
      color: color || null, // null → random in constructor
      x: 50 + Math.random() * ((sceneBounds?.w || 600) - 100),
      y: (sceneBounds?.floorY || 160) + 10 + Math.random() * ((sceneBounds?.h || 400) - (sceneBounds?.floorY || 160) - 40),
      generator,
    });
  }

  update(dt, agents, otherPets, sceneBounds, obstacles) {
    // Animation frame cycling
    this.frameTimer += dt;
    if (this.frameTimer > this.frameInterval) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % 2;
    }

    // Flying bob
    if (this.moveType === 'fly') {
      this._flyTime += dt;
    }

    // AI decision timer
    this.actionTimer += dt;
    if (this.actionTimer > this.nextActionTime) {
      this._decideAction(agents, otherPets, sceneBounds);
      this.actionTimer = 0;
      this.nextActionTime = 3000 + Math.random() * 8000;
    }

    // Movement
    if (this.state === 'moving' && this.target) {
      this._updateMovement(dt, sceneBounds, obstacles);
    }
  }

  _decideAction(agents, otherPets, bounds) {
    const roll = Math.random();
    const sleepChance = (Pet.TYPES[this.type] || {}).sleepChance || 0.15;

    if (roll < 0.25 && agents && agents.length > 0) {
      // Go to an agent — rub against their legs
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const charW = 32 * (agent.character?.scale || 2.5);
      this.target = {
        x: agent.character.x + charW * 0.3 + Math.random() * 20,
        y: agent.character.y + 32 * (agent.character?.scale || 2.5) - 10,
      };
      this.state = 'moving';
      this.interactLabel = 'agent';
    } else if (roll < 0.40 && otherPets && otherPets.length > 0) {
      // Go to another pet
      const candidates = otherPets.filter(p => p !== this);
      if (candidates.length > 0) {
        const other = candidates[Math.floor(Math.random() * candidates.length)];
        this.target = { x: other.x + 15, y: other.y };
        this.state = 'moving';
        this.interactLabel = 'pet';
      } else {
        this._randomWalk(bounds);
      }
    } else if (roll < 0.60) {
      // Random walk
      this._randomWalk(bounds);
    } else if (roll < 0.60 + sleepChance) {
      // Sleep
      this.state = 'sleeping';
      this.target = null;
    } else {
      // Idle — stay put
      this.state = 'idle';
      this.target = null;
    }
  }

  _randomWalk(bounds) {
    const w = bounds?.w || 640;
    const h = bounds?.h || 400;
    const floorY = bounds?.floorY || 160;
    const floorH = h - floorY;
    this.target = {
      x: 30 + Math.random() * (w - 60),
      y: floorY + 5 + Math.random() * (floorH - 30),  // roam entire floor area
    };
    this.state = 'moving';
    this.interactLabel = null;
  }

  _updateMovement(dt, bounds, obstacles) {
    if (!this.target) { this.state = 'idle'; return; }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 3) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.state = 'idle';
      this.target = null;
      return;
    }

    // Hamster: occasional speed burst
    let speed = this.speed;
    if (this.type === 'hamster' && Math.random() < 0.01) {
      speed = 0.08; // sprint!
    }

    // Update facing direction
    if (dx < -1) this.facingLeft = true;
    else if (dx > 1) this.facingLeft = false;

    let newX = this.x + (dx / dist) * speed * dt;
    let newY = this.y + (dy / dist) * speed * dt;
    const prevX = this.x;
    const prevY = this.y;

    // ── Collision detection against obstacles ──
    if (obstacles && obstacles.length > 0) {
      const petW = 16 * this.scale;
      const petH = 16 * this.scale;
      // Pet hitbox — small rect at pet center-bottom
      const hw = 10, hh = 8;
      const getHitbox = (px, py) => ({
        x: px + petW / 2 - hw / 2,
        y: py + petH - hh,
        w: hw,
        h: hh,
      });

      for (const obs of obstacles) {
        const hb = getHitbox(newX, newY);
        const hit = hb.x < obs.x + obs.w && hb.x + hb.w > obs.x
                 && hb.y < obs.y + obs.h && hb.y + hb.h > obs.y;

        if (hit) {
          // Try sliding: X-only or Y-only
          const hbX = getHitbox(newX, this.y);
          const xHit = hbX.x < obs.x + obs.w && hbX.x + hbX.w > obs.x
                    && hbX.y < obs.y + obs.h && hbX.y + hbX.h > obs.y;
          const hbY = getHitbox(this.x, newY);
          const yHit = hbY.x < obs.x + obs.w && hbY.x + hbY.w > obs.x
                    && hbY.y < obs.y + obs.h && hbY.y + hbY.h > obs.y;

          if (xHit && yHit) {
            newX = this.x; newY = this.y;
          } else if (xHit) {
            newX = this.x;
          } else if (yHit) {
            newY = this.y;
          }
        }
      }
    }

    this.x = newX;
    this.y = newY;

    // Clamp within scene bounds — roam entire floor area
    const w = bounds?.w || 640;
    const bh = bounds?.h || 400;
    const floorY = bounds?.floorY || Math.round(bh * 0.40);
    this.x = Math.max(10, Math.min(w - 30, this.x));
    this.y = Math.max(floorY + 5, Math.min(bh - 20, this.y));

    // Anti-stuck: if barely moved, give up and pick a new target
    const moved = Math.abs(this.x - prevX) + Math.abs(this.y - prevY);
    if (moved < 0.05) {
      this._stuckTimer += dt;
      if (this._stuckTimer > 1200) {
        this._stuckTimer = 0;
        this.state = 'idle';
        this.target = null;
      }
    } else {
      this._stuckTimer = 0;
    }
  }

  render(ctx) {
    const petCanvas = this.generator.generatePet(this.type, this.frame, this.color);
    if (!petCanvas) return;

    const drawW = 16 * this.scale;
    const drawH = 16 * this.scale;

    // Flying pets bob up and down
    let drawY = this.y;
    if (this.moveType === 'fly') {
      drawY = this.y - 20 + Math.sin(this._flyTime * 0.003) * 8;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Flip horizontally if facing right (default sprite faces left)
    if (!this.facingLeft) {
      ctx.translate(this.x + drawW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(petCanvas, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(petCanvas, this.x, drawY, drawW, drawH);
    }

    // Shadow on ground
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000';
    const shadowY = this.y + drawH - 2;
    const shadowW = drawW * 0.7;
    ctx.beginPath();
    ctx.ellipse(
      this.facingLeft ? this.x + drawW * 0.35 : this.x + drawW * 0.35,
      shadowY,
      shadowW / 2, 3, 0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.globalAlpha = 1;

    // Sleeping ZZZ
    if (this.state === 'sleeping') {
      ctx.font = '6px monospace';
      ctx.fillStyle = '#87CEEB';
      ctx.fillText('z', this.x + drawW, drawY - 2);
      ctx.fillText('Z', this.x + drawW + 4, drawY - 8);
    }

    ctx.restore();
  }

  /** Y value for depth sorting */
  get sortY() {
    return this.y;
  }
}

if (typeof window !== 'undefined') window.Pet = Pet;
