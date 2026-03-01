/**
 * AgentSlot.js — One agent in the multi-agent office
 * Handles: unique appearance, workstation binding, smooth idle wandering with POI system, click-to-customize
 */
class AgentSlot {
  constructor(options = {}) {
    this.agentId = options.agentId || 'main';
    this.sessionKeys = options.sessionKeys || ['main'];
    this.label = options.label || options.agentId || 'Agent';
    this.name = options.name || this.label;

    // Seeded random config per agent — deterministic per agentId
    const savedConfigs = AgentSlot._loadConfigs();
    let charConfig = savedConfigs[this.agentId];
    if (!charConfig) {
      charConfig = CharacterSprite.randomConfig();
      savedConfigs[this.agentId] = charConfig;
      AgentSlot._saveConfigs(savedConfigs);
    }

    this.character = new CharacterSprite(charConfig, options.x || 0, options.y || 0);
    this.stateMapper = new AgentStateMapper(this.character, {
      agentId: this.agentId,
      sessionKeys: this.sessionKeys,
    });

    // Workstation reference (set by ClawSkinApp)
    this.station = null;
    this._scene = null; // reference to current scene (for POI list)
    this.showNameTag = options.showNameTag !== false;

    // ── Smooth movement system ──
    this.isWandering = false;
    this._isReturning = false;        // walking back to desk (smooth)
    this._wanderTimer = Math.random() * 20000 + 15000; // first wander 15-35s
    this._wanderTarget = null;
    this._wanderSpeed = 0.06 + Math.random() * 0.02; // faster than before
    this._wanderReturnTimer = 0;
    this._wobbleTime = Math.random() * 10000;
    this._breatheTime = Math.random() * 10000;
    this._manualY = false;
    this._poiAction = null;           // current POI interaction label
    this._poiStayTimer = 0;           // time spent at POI
    this._returnWaypoints = null;     // waypoint queue for desk return path
    this._stuckTimer = 0;             // detect stuck against obstacles
    this._outsideOwnDesk = false;     // true once agent has left own desk hitbox

    // Reference to other agents (set by ClawSkinApp for social wandering)
    this._otherAgents = null;
  }

  update(dt) {
    this.character.update(dt);
    this._breatheTime += dt;

    const state = this.stateMapper.currentState;
    const isWorking = ['typing', 'executing', 'browsing', 'thinking', 'error'].includes(state);

    if (isWorking) {
      // Working — return to desk if wandering, cancel wander
      if (this.isWandering || this._isReturning) this._snapToDesk();
      this._wanderTimer = 8000 + Math.random() * 12000;
      this._manualY = false;
    } else if (state === 'sleeping') {
      if (this.isWandering || this._isReturning) this._snapToDesk();
      this._manualY = false;
    } else {
      // Idle — maybe wander
      this._wanderTimer -= dt;

      if (this._isReturning) {
        this._updateMovement(dt);
      } else if (this.isWandering) {
        this._updateWander(dt);
      } else if (this._wanderTimer <= 0 && this.station) {
        this._startWander();
      } else if (this.station && !this._isReturning) {
        // Subtle breathing wobble at desk
        const wobble = Math.sin(this._breatheTime * 0.0015) * 0.8;
        this.character.y = this.station.charY + wobble;
        this._manualY = true;
      }
    }

    // ── Agent-to-agent repulsion — push apart when overlapping ──
    if (this._otherAgents && (this.isWandering || this._isReturning)) {
      const cs = this.character.scale || 2.5;
      const myW = 32 * cs;
      const myCx = this.character.x + myW / 2;
      const myCy = this.character.y + myW / 2;
      const minDist = 50; // minimum distance between agent centers

      for (const other of this._otherAgents) {
        if (other === this) continue;
        const ocs = other.character.scale || 2.5;
        const oW = 32 * ocs;
        const oCx = other.character.x + oW / 2;
        const oCy = other.character.y + oW / 2;

        const dx = myCx - oCx;
        const dy = myCy - oCy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist && dist > 0.1) {
          // Push this agent away from the other
          const pushStrength = (minDist - dist) * 0.03;
          this.character.x += (dx / dist) * pushStrength;
          this.character.y += (dy / dist) * pushStrength;
          this._manualY = true;
        }
      }
    }
  }

  // ── Wandering with POI system ──

  /** Corridor Y — a safe horizontal lane below all desks where agents walk freely */
  _getCorridorY() {
    const h = this._scene?.canvas?.height || 400;
    const floorY = h * 0.40;
    // deskSurfaceY = floorY + 50, deskH = 42, so desk bottom ≈ floorY + 92
    return Math.round(floorY + 110);
  }

  /**
   * Plan a waypoint path from current position to (toX, toY).
   * Uses a corridor below the desks for horizontal travel.
   *
   * When starting from behind a desk:
   *   1. Sidestep LEFT or RIGHT out of desk range
   *   2. Drop down to corridor
   *   3. Walk horizontally
   *   4. Rise up to target (sidestep in if target is behind a desk)
   */
  _planPath(toX, toY) {
    const cx = this.character.x;
    const cy = this.character.y;
    const corridorY = this._getCorridorY();
    const waypoints = [];

    const needsHorizontal = Math.abs(toX - cx) > 30;
    const targetAboveCorridor = toY < corridorY - 10;
    const currentAboveCorridor = cy < corridorY - 10;

    if (needsHorizontal && (targetAboveCorridor || currentAboveCorridor)) {
      // ── Step 1: Leave current desk area (if behind a desk) ──
      let exitX = cx;
      if (currentAboveCorridor && this.station) {
        const s = this.station;
        // Obstacles extend from deskX-5 to deskX+deskW+5
        // Foot hitbox is 24px wide, centered at character.x + 40 (charPxW/2)
        // So character.x must be < obs.x - 52 (left) or > obs.x+obs.w - 28 (right)
        // Use generous margins to fully clear
        const margin = 80;  // fully clear 80px-wide character + desk obstacle padding
        const deskL = s.deskX - margin;
        const deskR = s.deskX + s.deskW + margin;
        // If currently inside desk's horizontal range, sidestep out first
        if (cx > deskL && cx < deskR) {
          // Pick the closer side
          exitX = (cx - deskL < deskR - cx) ? deskL : deskR;
          waypoints.push({ x: exitX, y: cy });       // sidestep out
        }
        waypoints.push({ x: exitX, y: corridorY });  // drop to corridor
      } else if (currentAboveCorridor) {
        waypoints.push({ x: cx, y: corridorY });     // drop to corridor
      }

      // ── Step 2: Horizontal travel in corridor ──
      // Determine entry X for target — if target is behind a desk, approach from the side
      let entryX = toX;
      if (targetAboveCorridor) {
        // Check if target is inside any desk's horizontal range
        const obstacles = this._scene?.obstacles || [];
        for (const obs of obstacles) {
          if (obs.deskIndex == null) continue;
          const obsL = obs.x - 80;
          const obsR = obs.x + obs.w + 80;
          if (toX > obsL && toX < obsR && toY < obs.y + obs.h) {
            // Target is behind this desk — approach from the closer side
            entryX = (toX - obsL < obsR - toX) ? obsL : obsR;
            break;
          }
        }
      }

      waypoints.push({ x: entryX, y: corridorY });   // walk horizontally

      // ── Step 3: Rise up to target ──
      if (targetAboveCorridor) {
        if (Math.abs(entryX - toX) > 5) {
          waypoints.push({ x: entryX, y: toY });     // rise up at the side
          waypoints.push({ x: toX, y: toY });        // slide into position
        } else {
          waypoints.push({ x: toX, y: toY });        // rise directly
        }
      }
    } else {
      // Short horizontal or both below corridor — direct path is fine
      waypoints.push({ x: toX, y: toY });
    }

    return waypoints;
  }

  _startWander() {
    if (!this.station) return;
    this.isWandering = true;
    this._poiAction = null;
    this._stuckTimer = 0;
    this.character.setState('walking');

    const roll = Math.random();
    const poiList = this._scene?.poiList;
    const canvasW = this._scene?.canvas?.width || 640;
    const floorY = (this._scene?.canvas?.height || 400) * 0.40;

    let targetX, targetY;

    if (roll < 0.25 && poiList?.length) {
      const poi = poiList[Math.floor(Math.random() * poiList.length)];
      targetX = poi.x; targetY = poi.y;
      this._poiAction = poi.label;
      this._wanderReturnTimer = 5000 + Math.random() * 8000;
    } else if (roll < 0.40 && this._otherAgents?.length) {
      const others = this._otherAgents.filter(a => a !== this && !a.isWandering);
      if (others.length > 0) {
        const other = others[Math.floor(Math.random() * others.length)];
        targetX = other.character.x + 40;
        targetY = other.character.y + 10;
        this._poiAction = 'colleague';
        this._wanderReturnTimer = 4000 + Math.random() * 5000;
      } else {
        this._setRandomTarget(canvasW, floorY);
        return;
      }
    } else {
      this._setRandomTarget(canvasW, floorY);
      return;
    }

    // Plan waypoint path to target
    this._returnWaypoints = this._planPath(targetX, targetY);
    this._wanderTarget = this._returnWaypoints.shift();
  }

  _setRandomTarget(canvasW, floorY) {
    const canvasH = this._scene?.canvas?.height || 400;
    const floorH = canvasH - floorY;
    const targetX = 40 + Math.random() * (canvasW - 80);
    const targetY = floorY + 10 + Math.random() * (floorH - 50);
    this._returnWaypoints = this._planPath(targetX, targetY);
    this._wanderTarget = this._returnWaypoints.shift();
    this._wanderReturnTimer = 3000 + Math.random() * 4000;
  }

  _updateWander(dt) {
    if (!this._wanderTarget) { this._returnToDesk(); return; }

    const arrived = this._moveToward(dt);

    if (arrived) {
      // Check if there are more waypoints in the path
      if (this._returnWaypoints && this._returnWaypoints.length > 0) {
        this._wanderTarget = this._returnWaypoints.shift();
        return;
      }
      // Fully arrived at final destination — do POI action
      if (this._poiAction) {
        this._doPOIAction();
      }
      // Stay for remaining time, then return
      this._poiStayTimer += dt;
      if (this._poiStayTimer > 2000) {
        this._returnToDesk();
        this._poiStayTimer = 0;
      }
      return;
    }

    this._wanderReturnTimer -= dt;
    if (this._wanderReturnTimer <= 0) {
      this._returnToDesk();
    }
  }

  _doPOIAction() {
    switch (this._poiAction) {
      case 'cooler':
        this.character.setState('idle');
        this.character.showBubble('💧', 'speech', 2000);
        break;
      case 'window':
        this.character.setState('idle');
        this.character.showBubble('🌤️', 'speech', 2000);
        break;
      case 'bookshelf':
        this.character.setState('idle');
        this.character.showBubble('📖', 'speech', 2000);
        break;
      case 'colleague':
        this.character.setState('idle');
        this.character.showBubble('👋', 'speech', 1500);
        break;
      case 'plant':
        this.character.setState('idle');
        this.character.showBubble('🌿', 'speech', 1500);
        break;
      case 'sofa':
        this.character.setState('idle');
        this.character.showBubble('😌', 'speech', 2500);
        break;
      case 'bar':
        this.character.setState('idle');
        this.character.showBubble('🍺', 'speech', 2000);
        break;
      case 'coffee_machine':
        this.character.setState('idle');
        this.character.showBubble('☕', 'speech', 2000);
        break;
      case 'fridge':
        this.character.setState('idle');
        this.character.showBubble('🧃', 'speech', 1500);
        break;
    }
    this._poiAction = null; // only trigger once
  }

  /** Smooth return to desk — use corridor path planning */
  _returnToDesk() {
    if (!this.station) { this._snapToDesk(); return; }
    this.isWandering = false;
    this._isReturning = true;
    this._poiAction = null;
    this._poiStayTimer = 0;
    this._stuckTimer = 0;
    this.character.setState('walking');

    // Use the same corridor-based path planning
    this._returnWaypoints = this._planPath(this.station.charX, this.station.charY);
    this._wanderTarget = this._returnWaypoints.shift();
  }

  /** Move smoothly toward _wanderTarget with collision avoidance. Returns true if arrived. */
  _moveToward(dt) {
    if (!this._wanderTarget) return true;

    const dx = this._wanderTarget.x - this.character.x;
    const dy = this._wanderTarget.y - this.character.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 3) {
      this.character.x = this._wanderTarget.x;
      this.character.y = this._wanderTarget.y;
      this._manualY = true;
      return true;
    }

    // Walking wobble
    this._wobbleTime += dt;
    const wobbleY = Math.sin(this._wobbleTime * 0.008) * 1.5;

    const prevX = this.character.x;
    const prevY = this.character.y;
    const moveX = (dx / dist) * this._wanderSpeed * dt;
    const moveY = (dy / dist) * this._wanderSpeed * dt + wobbleY * 0.05;
    let newX = this.character.x + moveX;
    let newY = this.character.y + moveY;

    // ── Collision detection against scene obstacles ──
    const obstacles = this._scene?.obstacles;
    if (obstacles) {
      const cs = this.character.scale || 2.5;
      const charPxW = 32 * cs;
      const charPxH = 32 * cs;
      // Foot hitbox — small rect at character's feet (bottom-center)
      const footW = 24, footH = 12;
      const getFootRect = (cx, cy) => ({
        x: cx + charPxW / 2 - footW / 2,
        y: cy + charPxH - footH,
        w: footW,
        h: footH,
      });

      const ownDeskIdx = this.station?.index;

      for (const obs of obstacles) {
        // Own desk: 3-state logic
        // 1. Sitting → leaving: _outsideOwnDesk=false, allow moving OUT (skip collision)
        // 2. Wandering: _outsideOwnDesk=true, collide normally (can't walk through)
        // 3. Returning to sit: _isReturning, skip collision for entire return journey
        if (obs.deskIndex != null && obs.deskIndex === ownDeskIdx) {
          if (this._isReturning) {
            continue; // returning to own desk — skip own desk for entire path
          }
          if (!this._outsideOwnDesk) {
            continue; // still leaving own desk — let agent walk out
          }
          // otherwise: wandering, collide with own desk normally
        }

        const foot = getFootRect(newX, newY);
        const hit = foot.x < obs.x + obs.w && foot.x + foot.w > obs.x
                 && foot.y < obs.y + obs.h && foot.y + foot.h > obs.y;

        if (hit) {
          // Try X-only movement (slide vertically along obstacle)
          const footXOnly = getFootRect(newX, this.character.y);
          const xHit = footXOnly.x < obs.x + obs.w && footXOnly.x + footXOnly.w > obs.x
                    && footXOnly.y < obs.y + obs.h && footXOnly.y + footXOnly.h > obs.y;

          // Try Y-only movement (slide horizontally along obstacle)
          const footYOnly = getFootRect(this.character.x, newY);
          const yHit = footYOnly.x < obs.x + obs.w && footYOnly.x + footYOnly.w > obs.x
                    && footYOnly.y < obs.y + obs.h && footYOnly.y + footYOnly.h > obs.y;

          if (xHit && yHit) {
            newX = this.character.x;
            newY = this.character.y;
          } else if (xHit) {
            newX = this.character.x; // blocked in X, slide Y
          } else if (yHit) {
            newY = this.character.y; // blocked in Y, slide X
          }
        }
      }

      // ── Track whether agent has left own desk area ──
      if (!this._outsideOwnDesk) {
        const ownObs = obstacles.find(o => o.deskIndex != null && o.deskIndex === ownDeskIdx);
        if (ownObs) {
          const foot = getFootRect(newX, newY);
          const stillInside = foot.x < ownObs.x + ownObs.w && foot.x + foot.w > ownObs.x
                           && foot.y < ownObs.y + ownObs.h && foot.y + foot.h > ownObs.y;
          if (!stillInside) {
            this._outsideOwnDesk = true; // left the desk — now it becomes a wall
          }
        }
      }
    }

    this.character.x = newX;
    this.character.y = newY;
    this._manualY = true;

    // ── Anti-stuck: if position barely changed, agent is stuck ──
    const moved = Math.abs(newX - prevX) + Math.abs(newY - prevY);
    if (moved < 0.1) {
      this._stuckTimer += dt;
      if (this._stuckTimer > 1500) {
        // Stuck for 1.5s — give up on current target and go back to desk
        this._stuckTimer = 0;
        this._returnToDesk();
      }
    } else {
      this._stuckTimer = 0;
    }

    return false;
  }

  /** Update during return-to-desk walk (with waypoints) */
  _updateMovement(dt) {
    const arrived = this._moveToward(dt);
    if (arrived) {
      // Check if there are more waypoints
      if (this._returnWaypoints && this._returnWaypoints.length > 0) {
        this._wanderTarget = this._returnWaypoints.shift();
        return; // keep walking to next waypoint
      }
      this._isReturning = false;
      this._manualY = false;
      this._returnWaypoints = null;
      this._outsideOwnDesk = false;  // back at desk — reset for next departure
      this.character.setState('idle');
      this._wanderTimer = 15000 + Math.random() * 25000;
      this._wanderTarget = null;
    }
  }

  /** Emergency snap — for when work starts mid-wander */
  _snapToDesk() {
    this.isWandering = false;
    this._isReturning = false;
    this._manualY = false;
    this._poiAction = null;
    this._poiStayTimer = 0;
    this._wanderTarget = null;
    this._returnWaypoints = null;
    this.character.setState('idle');
    if (this.station) {
      this.character.x = this.station.charX;
      this.character.y = this.station.charY;
    }
    this._wanderTimer = 15000 + Math.random() * 25000;
  }

  // ── Rendering ──

  render(ctx) {
    this.character.render(ctx);
  }

  /** Render name tag — called in a separate top-layer phase */
  renderNameTag(ctx) {
    if (this.showNameTag) this._renderNameTag(ctx);
  }

  _renderNameTag(ctx) {
    const cs = this.character.scale;
    const charW = 32 * cs;
    const cx = this.character.x + charW / 2;
    // Position tag well above character head — clear of any bubbles
    const tagBottom = this.character.y - 6;
    const displayName = this.name.length > 10 ? this.name.slice(0, 8) + '..' : this.name;

    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';

    const stateColors = {
      idle: '#00ff88', thinking: '#ffcc00', typing: '#00f0ff',
      executing: '#b44aff', browsing: '#00f0ff', error: '#ff4466',
      sleeping: '#555', walking: '#00ff88', waving: '#00ff88'
    };
    const dotColor = stateColors[this.stateMapper.currentState] || '#888';

    // Measure for accurate centering
    const textW = ctx.measureText(displayName).width;
    const dotR = 2.5;
    const dotGap = 5;
    const padX = 7;
    const ph = 14;
    const pw = padX + dotR * 2 + dotGap + textW + padX;

    const pillX = cx - pw / 2;
    const pillY = tagBottom - ph;

    // Pill background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pw, ph, 3);
    else ctx.rect(pillX, pillY, pw, ph);
    ctx.fill();

    // State dot
    const dotCx = pillX + padX + dotR;
    const dotCy = pillY + ph / 2;
    ctx.fillStyle = dotColor;
    ctx.shadowColor = dotColor;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Name
    ctx.fillStyle = '#e0e0f0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, dotCx + dotR + dotGap, dotCy + 0.5);
    ctx.restore();
  }

  hitTest(clickX, clickY) {
    const cs = this.character.scale;
    const cw = 32 * cs;
    const ch = 32 * cs;
    // Generous hit area (include name tag space)
    return (
      clickX >= this.character.x - 10 &&
      clickX <= this.character.x + cw + 10 &&
      clickY >= this.character.y - 20 &&
      clickY <= this.character.y + ch + 10
    );
  }

  updateConfig(cfg) {
    this.character.updateConfig(cfg);
    const saved = AgentSlot._loadConfigs();
    saved[this.agentId] = this.character.config;
    AgentSlot._saveConfigs(saved);
  }

  handleEvent(event) { this.stateMapper.handleEvent(event); }
  destroy() { this.stateMapper.destroy(); }

  static _loadConfigs() {
    try { return JSON.parse(localStorage.getItem('clawskin_agent_configs') || '{}'); }
    catch { return {}; }
  }
  static _saveConfigs(configs) {
    try { localStorage.setItem('clawskin_agent_configs', JSON.stringify(configs)); }
    catch {}
  }
}

if (typeof window !== 'undefined') window.AgentSlot = AgentSlot;
