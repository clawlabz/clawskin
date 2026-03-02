/**
 * ClawSkinApp.js — Main application controller for ClawSkin product mode
 * Supports multiple agents displayed simultaneously in one scene
 */
class ClawSkinApp {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = options.width || 640;
    this.height = options.height || 400;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.settings = new SettingsManager();
    this.gateway = null;
    this.demoMode = null;
    this.spriteGen = new SpriteGenerator();
    this.scenes = [];
    this.currentScene = null;
    this.running = false;
    this.lastTime = 0;
    this.mode = 'demo'; // 'demo' | 'live'

    // Multi-agent support
    this.agents = [];          // AgentSlot[]
    this.demoCharacter = null; // Single character for demo mode
    this.petManager = null;    // Independent pet system

    // UI elements
    this.statusEl = options.statusEl ? document.getElementById(options.statusEl) : null;
    this.modeEl = options.modeEl ? document.getElementById(options.modeEl) : null;
    this.agentListEl = options.agentListEl ? document.getElementById(options.agentListEl) : null;
  }

  init() {
    const config = this.settings.load();
    const charConfig = config.character || CharacterEditor.loadSaved() || CharacterSprite.defaultConfig();

    // Scenes
    this.scenes = [
      new OfficeScene(this.canvas, this.ctx, this.spriteGen),
      new HackerScene(this.canvas, this.ctx, this.spriteGen),
      new CafeScene(this.canvas, this.ctx, this.spriteGen),
    ];
    this.scenes.forEach(s => s.init());

    const sceneIdx = config.scene || 0;
    this.currentScene = this.scenes[sceneIdx] || this.scenes[0];

    // Demo character (used when not connected)
    const pos = this.currentScene.getCharacterPosition();
    this.demoCharacter = new CharacterSprite(charConfig, pos.x, pos.y);
    this.demoMode = new DemoMode(this.demoCharacter);

    // Gateway client
    this.gateway = new GatewayClient({
      autoReconnect: true,
      onConnected: (hello) => this._onGatewayConnected(hello),
      onDisconnected: (info) => this._onGatewayDisconnected(info),
      onEvent: (event) => this._onGatewayEvent(event),
      onStateChange: (state, detail) => this._onConnectionStateChange(state, detail),
    });

    // Independent pet system
    this.petManager = new PetManager(this.spriteGen);
    this.petManager.setSceneBounds(this.width, this.height);
    this.petManager.initDefaults();

    // Click-to-customize: click an agent to open their character editor
    this.canvas.addEventListener('click', (e) => this._handleCanvasClick(e));
    this.selectedAgent = null;

    return this;
  }

  _handleCanvasClick(e) {
    if (this.mode !== 'live') return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    for (const slot of this.agents) {
      if (slot.hitTest(clickX, clickY)) {
        this.selectedAgent = slot;
        // Update CharacterEditor to edit this agent
        if (window._charEditor) {
          window._charEditor.character = slot.character;
          window._charEditor.onChange = (cfg) => {
            slot.updateConfig(cfg);
          };
          // Show editor and scroll to it
          const editorEl = document.getElementById('char-editor');
          if (editorEl) {
            editorEl.style.display = 'block';
            window._charEditor.visible = true;
            window._charEditor.render();
            editorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          // Update header to show which agent is being edited
          const header = document.querySelector('.editor-header span, .editor-header');
          if (header) {
            header.textContent = '🎨 Editing: ' + slot.name;
          }
        }
        // Visual feedback — show a brief highlight
        slot.character.showBubble('✨', 'speech', 1000);
        return;
      }
    }
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();

    const config = this.settings.load();

    if (config.autoConnect && config.gatewayUrl) {
      this.connectToGateway(config.gatewayUrl, config.token);
    } else {
      this._startDemoMode();
      this._tryAutoDetect();
    }

    this._loop();
  }

  // ──── Gateway Connection ────

  connectToGateway(url, token) {
    this.settings.update({
      gatewayUrl: url,
      token: token || '',
      lastConnected: Date.now(),
    });

    this.gateway.connect(url, token);
  }

  disconnectGateway() {
    this.gateway.disconnect(true);
    this._clearAgents();
    this._startDemoMode();
    this.settings.update({ autoConnect: false });
  }

  async _tryAutoDetect() {
    // On remote deployments (not localhost/file), skip local probing entirely.
    // Users on remote hosts should connect via the UI panel.
    const origin = window.location.origin || '';
    const isLocal = !origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('file:');

    if (!isLocal) {
      // Remote deployment — show connection panel immediately
      if (window._connPanel) {
        window._connPanel.expanded = true;
        window._connPanel.render();
      }
      return;
    }

    // Local mode — try auto-detect

    // Step 1: Try fetching local config from serve.cjs (/api/config)
    try {
      const res = await fetch('/api/config', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const config = await res.json();
        if (config?.gatewayUrl) {
          const saved = this.settings.load();
          this.settings.update({
            gatewayUrl: config.gatewayUrl,
            autoConnect: true,
          });
          if (window._connPanel) {
            window._connPanel.render(this.settings.load());
          }
          // Use token from local config, fall back to previously saved token
          const token = config.token || saved.token || '';
          this.gateway.connect(config.gatewayUrl, token);
          return;
        }
      }
    } catch {}

    // Step 2: Fallback — probe ws://localhost:18789 directly
    const localUrl = 'ws://localhost:18789';
    try {
      const ws = new WebSocket(localUrl);
      const timeout = setTimeout(() => { ws.close(); }, 3000);
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        this.settings.update({ gatewayUrl: localUrl });
        this.gateway.connect(localUrl, '');
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        if (window._connPanel) {
          window._connPanel.expanded = true;
          window._connPanel.render();
        }
      };
    } catch {}
  }

  async _onGatewayConnected(hello) {
    this.mode = 'live';
    this.demoMode.stop();
    this._updateModeDisplay();

    // Discover all active sessions from Gateway
    await this._discoverAgents();
    this._renderAgentList();
    this._updateStatusDisplay();
  }

  _onGatewayDisconnected(info) {
    this.mode = 'demo';
    this._clearAgents();
    this._startDemoMode();
    this._updateModeDisplay();
    this._renderAgentList();
  }

  _onGatewayEvent(event) {
    if (!event || !event.event) return;

    // Route events to matching agent slots
    const payload = event.payload;
    const sessionKey = payload?.sessionKey;

    if (sessionKey) {
      // Parse agentId from sessionKey (e.g. "agent:ifig:discord:..." → "ifig")
      const match = sessionKey.match(/^agent:([^:]+):/);
      const agentId = match ? match[1] : 'main';

      // Route to matching agent
      const slot = this.agents.find(a => a.agentId === agentId);
      if (slot) {
        slot.handleEvent(event);
      }
    } else {
      // Broadcast to all agents
      for (const slot of this.agents) {
        slot.handleEvent(event);
      }
    }

    this._updateStatusDisplay();
  }

  _onConnectionStateChange(state, detail) {
    if (window._connPanel) {
      window._connPanel.setState(state, detail);
      if (state === 'error' && detail && (detail.includes('auth') || detail.includes('token') || detail.includes('pairing'))) {
        window._connPanel.expanded = true;
        window._connPanel.render();
      }
    }
    this._updateStatusDisplay();
  }

  // ──── Multi-Agent Management ────

  async _discoverAgents() {
    try {
      const result = await this.gateway.getSessionsList({ activeMinutes: 1440 });
      const sessions = result?.sessions || result || [];

      if (!Array.isArray(sessions) || sessions.length === 0) {
        this._addAgent({ agentId: 'main', label: 'Main Agent', sessionKeys: ['main'] });
        return;
      }

      // Group sessions by agentId
      // Session keys look like: "agent:main:main", "agent:ifig:discord:channel:123", "agent:xhs:main"
      // The agentId is either session.agentId or extracted from the key pattern "agent:<agentId>:..."
      const agentMap = new Map();

      for (const session of sessions) {
        const key = session.key || session.sessionKey;
        if (!key) continue;

        // Determine agentId: prefer session.agentId, else parse from key
        let agentId = session.agentId || null;
        if (!agentId) {
          const match = key.match(/^agent:([^:]+):/);
          agentId = match ? match[1] : 'main';
        }

        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            agentId,
            label: session.label || agentId,
            sessionKeys: [],
          });
        }
        agentMap.get(agentId).sessionKeys.push(key);
      }

      // Create one AgentSlot per unique agentId
      for (const [agentId, info] of agentMap) {
        this._addAgent({
          agentId,
          label: info.label,
          sessionKeys: info.sessionKeys,
        });
      }

      if (this.agents.length === 0) {
        this._addAgent({ agentId: 'main', label: 'Main Agent', sessionKeys: ['main'] });
      }
    } catch (e) {
      console.warn('[ClawSkinApp] session discovery failed:', e);
      this._addAgent({ agentId: 'main', label: 'Main Agent', sessionKeys: ['main'] });
    }

    // Fetch identity (name) for each agent
    for (const slot of this.agents) {
      this._fetchAgentIdentity(slot);
    }
  }

  _addAgent(options) {
    // Don't duplicate by agentId
    if (this.agents.find(a => a.agentId === options.agentId)) return;

    const index = this.agents.length;

    const slot = new AgentSlot({
      ...options,
      index,
      x: 0,
      y: 0,
      showNameTag: true,
    });

    this.agents.push(slot);

    // Give all agents cross-references for social wandering
    for (const a of this.agents) {
      a._otherAgents = this.agents;
    }

    this._repositionAgents();
  }

  _clearAgents() {
    for (const slot of this.agents) slot.destroy();
    this.agents = [];
    this._renderAgentList();
  }

  _repositionAgents() {
    // Positions are now determined by workstations in _render()
    // No manual positioning needed
  }

  async _fetchAgentIdentity(slot) {
    try {
      const identity = await this.gateway.getAgentIdentity(slot.agentId);
      if (identity?.name) {
        slot.name = identity.name;
        slot.agentId = identity.agentId || slot.agentId;
        this._renderAgentList();
      }
    } catch {}
  }

  // ──── Demo Mode ────

  _startDemoMode() {
    this.mode = 'demo';
    const pos = this.currentScene.getCharacterPosition();
    this.demoCharacter.x = pos.x;
    this.demoCharacter.y = pos.y;
    this.demoMode.start();
    this._updateModeDisplay();
    this._updateStatusDisplay();
  }

  // ──── Scene Management ────

  setScene(index) {
    if (index < 0 || index >= this.scenes.length) return;
    this.currentScene = this.scenes[index];
    this.currentScene.init();

    if (this.mode === 'demo') {
      const pos = this.currentScene.getCharacterPosition();
      this.demoCharacter.x = pos.x;
      this.demoCharacter.y = pos.y;
    } else {
      this._repositionAgents();
    }
    this.settings.update({ scene: index });
  }

  // ──── Render Loop ────

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

    if (this.mode === 'demo') {
      this.demoMode.update(dt);
      this.demoCharacter.update(dt);
    } else {
      for (const slot of this.agents) slot.update(dt);
    }

    // Update independent pets
    if (this.petManager) {
      const obstacles = this.currentScene?.obstacles || [];
      this.petManager.update(dt, this.agents, obstacles);
    }
  }

  _render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.imageSmoothingEnabled = false;

    // Layer 0: Background wall + static decorations
    if (this.currentScene) this.currentScene.render(this.ctx);

    const scene = this.currentScene;

    if (this.mode === 'demo') {
      const stations = scene?.getWorkstations?.(1) || [];
      const s = stations[0];
      if (s) {
        this.demoCharacter.x = s.charX;
        this.demoCharacter.y = s.charY;
        if (s.charScale) this.demoCharacter.scale = s.charScale;

        // Back-to-front: chair → character → desk+monitor
        scene.renderChair(this.ctx, s);
        this.demoCharacter.render(this.ctx);
        scene.renderDesk(this.ctx, s, this.demoCharacter.animManager?.currentState || 'idle');
      } else {
        this.demoCharacter.render(this.ctx);
      }
    } else {
      // Live mode — 3-phase rendering with Y-sort depth ordering
      const stations = scene?.getWorkstations?.(this.agents.length) || [];

      // Assign stations to agents
      for (let i = 0; i < this.agents.length; i++) {
        const s = stations[i];
        if (!s) continue;
        const slot = this.agents[i];
        slot.station = s;
        slot._scene = scene;
        if (s.charScale) slot.character.scale = s.charScale;

        // If not wandering and not manually positioned, snap to station
        if (!slot.isWandering && !slot._isReturning) {
          slot.character.x = s.charX;
          if (!slot._manualY) slot.character.y = s.charY;
        }
      }

      // Phase 1: Render ALL chairs (furniture is always visible)
      for (let i = 0; i < stations.length; i++) {
        scene.renderChair(this.ctx, stations[i]);
      }

      // Phase 2: Render characters sorted by Y (back-to-front depth sort)
      const sortedAgents = [...this.agents].sort((a, b) => a.character.y - b.character.y);
      for (const slot of sortedAgents) {
        slot.render(this.ctx);
      }

      // Phase 3: Render ALL desks + laptops + cups (always visible, in front of characters)
      for (let i = 0; i < stations.length; i++) {
        const state = this.agents[i]?.stateMapper.currentState || 'idle';
        scene.renderDesk(this.ctx, stations[i], state);
      }

      // Phase 4: Render pets (independent of agents)
      if (this.petManager) {
        this.petManager.render(this.ctx);
      }

      // Phase 5: Render ALL name tags on top of everything
      for (const slot of this.agents) {
        slot.renderNameTag(this.ctx);
      }
    }
  }

  // ──── UI Updates ────

  _updateStatusDisplay() {
    if (!this.statusEl) return;
    if (this.mode === 'demo') {
      this.statusEl.textContent = '🎮 Demo Mode';
      return;
    }
    const active = this.agents.filter(a =>
      a.stateMapper.currentState !== 'idle' && a.stateMapper.currentState !== 'sleeping'
    );
    if (active.length > 0) {
      this.statusEl.textContent = `⚡ ${active.length} active / ${this.agents.length} agents`;
    } else {
      this.statusEl.textContent = `💤 ${this.agents.length} agent${this.agents.length > 1 ? 's' : ''} idle`;
    }
  }

  _updateModeDisplay() {
    if (!this.modeEl) return;
    if (this.mode === 'live') {
      this.modeEl.textContent = '🟢 Live';
      this.modeEl.className = 'mode-badge mode-live';
    } else {
      this.modeEl.textContent = '🎮 Demo';
      this.modeEl.className = 'mode-badge mode-demo';
    }
  }

  _renderAgentList() {
    if (!this.agentListEl) return;
    if (this.agents.length === 0) {
      this.agentListEl.innerHTML = '';
      return;
    }
    const stateIcons = {
      idle: '💤', thinking: '🤔', typing: '⌨️', executing: '⚙️',
      browsing: '🔍', error: '❌', sleeping: '😴', waving: '👋'
    };
    const esc = ConnectionPanel.esc;
    this.agentListEl.innerHTML = this.agents.map(a => {
      const icon = stateIcons[a.stateMapper.currentState] || '💤';
      return `<span class="agent-badge" title="${esc(a.sessionKey)}">${icon} ${esc(a.name)}</span>`;
    }).join('');
  }
}

if (typeof window !== 'undefined') window.ClawSkinApp = ClawSkinApp;
