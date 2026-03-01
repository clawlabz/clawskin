/**
 * AgentStateSync.js — Connects to OpenClaw Gateway for real-time Agent status
 * Falls back to demo mode when no connection is available
 */
class AgentStateSync {
  constructor(characterSprite, options = {}) {
    this.character = characterSprite;
    this.gatewayUrl = options.gatewayUrl || null;
    this.agentId = options.agentId || 'default';
    this.connected = false;
    this.ws = null;
    this.demoMode = new DemoMode(characterSprite);
    this.onStateChange = options.onStateChange || null;
  }

  async connect() {
    if (!this.gatewayUrl) {
      console.log('[AgentStateSync] No gateway URL, starting demo mode');
      this.demoMode.start();
      return;
    }

    try {
      const wsUrl = this.gatewayUrl.replace(/^http/, 'ws') + `/ws/agent/${this.agentId}/events`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[AgentStateSync] Connected to Gateway');
        this.connected = true;
        this.demoMode.stop();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleEvent(data);
        } catch (e) {
          console.warn('[AgentStateSync] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[AgentStateSync] Disconnected, falling back to demo');
        this.connected = false;
        this.demoMode.start();
        // Reconnect after 5s
        setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = () => {
        this.connected = false;
        this.demoMode.start();
      };
    } catch (e) {
      console.warn('[AgentStateSync] Connection failed, using demo mode');
      this.demoMode.start();
    }
  }

  _handleEvent(data) {
    const stateMap = {
      'idle': 'idle', 'thinking': 'thinking', 'writing': 'typing',
      'executing': 'executing', 'browsing': 'browsing', 'error': 'error',
      'heartbeat': 'waving', 'sleeping': 'sleeping'
    };

    if (data.type === 'state_change') {
      const mapped = stateMap[data.state] || 'idle';
      this.character.setState(mapped);
      if (data.message) {
        this.character.showBubble(data.message, 'speech', 4000);
      }
      if (this.onStateChange) this.onStateChange(mapped, data);
    }
  }

  update(dt) {
    if (!this.connected) {
      this.demoMode.update(dt);
    }
  }

  disconnect() {
    if (this.ws) this.ws.close();
    this.demoMode.stop();
  }
}

if (typeof window !== 'undefined') window.AgentStateSync = AgentStateSync;
