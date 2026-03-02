/**
 * GatewayClient.js — OpenClaw Gateway WebSocket protocol client
 * Handles connection, authentication, RPC calls, and real-time events
 */
class GatewayClient {
  constructor(options = {}) {
    this.url = options.url || null;
    this.token = options.token || null;
    // OpenClaw Gateway validates client.id against an allowlist.
    // Allowed values: webchat-ui, webchat, openclaw-control-ui, cli,
    // gateway-client, openclaw-macos, openclaw-ios, openclaw-android,
    // node-host, test, fingerprint, openclaw-probe
    // Default to "webchat" — lightweight client that doesn't require
    // device identity signing (unlike webchat-ui / control-ui which need Ed25519).
    // Users on custom Gateway builds can override this.
    this.clientId = options.clientId || 'webchat';
    this.clientMode = options.clientMode || 'webchat';
    this.clientVersion = options.clientVersion || '1.0.0';
    this.ws = null;
    this.connected = false;
    this.connecting = false;
    this.pending = new Map();
    this.backoffMs = 800;
    this.maxBackoff = 15000;
    this.connectNonce = null;
    this.connectSent = false;
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectTimer = null;
    this.seqCounter = 0;

    this.lastError = null;

    // Callbacks
    this.onConnected = options.onConnected || null;
    this.onDisconnected = options.onDisconnected || null;
    this.onEvent = options.onEvent || null;
    this.onError = options.onError || null;
    this.onStateChange = options.onStateChange || null; // 'connecting'|'connected'|'disconnected'|'error'
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  _setState(state, detail) {
    if (state === 'error') {
      this.lastError = detail || 'Unknown error';
      console.warn('[GatewayClient]', state, detail || '');
    } else if (state === 'connected') {
      this.lastError = null;
      console.log('[GatewayClient] connected');
    } else {
      console.log('[GatewayClient]', state, detail || '');
    }
    if (this.onStateChange) this.onStateChange(state, detail);
  }

  connect(url, token) {
    if (url) this.url = url;
    if (token !== undefined) this.token = token;
    if (!this.url) {
      this._setState('error', 'No Gateway URL provided');
      return;
    }

    this.disconnect(false);
    this.connecting = true;
    this.lastError = null;
    this._setState('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      this.connecting = false;
      this._setState('error', `Invalid URL: ${e.message}`);
      return;
    }

    this.ws.addEventListener('open', () => {
      // Wait for connect.challenge event from Gateway
    });

    this.ws.addEventListener('message', (e) => {
      this._handleMessage(e.data);
    });

    this.ws.addEventListener('close', (e) => {
      const wasConnected = this.connected;
      this.connected = false;
      this.connecting = false;
      this.connectSent = false;
      this.connectNonce = null;
      this._flushPending(new Error(`Connection closed (${e.code})`));

      if (wasConnected && this.onDisconnected) {
        this.onDisconnected({ code: e.code, reason: e.reason });
      }

      // Don't overwrite error state — keep the auth/pairing error visible
      if (!this.lastError) {
        this._setState('disconnected', e.reason || `Code ${e.code}`);
      }

      if (this.autoReconnect && wasConnected) {
        this._scheduleReconnect();
      }
    });

    this.ws.addEventListener('error', () => {
      if (!this.connected) {
        this.connecting = false;
        this._setState('error', 'Connection failed');
      }
    });
  }

  disconnect(permanent = true) {
    if (permanent) this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connecting = false;
    this.connectSent = false;
    this.lastError = null;
    this._flushPending(new Error('Disconnected'));
    this._setState('disconnected');
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 1.7, this.maxBackoff);
    this._setState('connecting', `Reconnecting in ${Math.round(delay/1000)}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  _handleMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'event') {
      // Handle connect challenge
      if (msg.event === 'connect.challenge') {
        const nonce = msg.payload?.nonce;
        if (nonce) this.connectNonce = nonce;
        this._sendConnect();
        return;
      }
      // Forward all other events
      if (this.onEvent) {
        try { this.onEvent(msg); } catch (e) {
          console.error('[GatewayClient] event handler error:', e);
        }
      }
      return;
    }

    if (msg.type === 'res') {
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      if (msg.ok) {
        pending.resolve(msg.payload);
      } else {
        pending.reject(new Error(msg.error?.message || 'Request failed'));
      }
    }
  }

  async _sendConnect() {
    if (this.connectSent) return;
    this.connectSent = true;

    const role = 'operator';
    const scopes = ['operator.admin'];

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: this.clientId,
        version: this.clientVersion,
        platform: navigator.platform || 'web',
        mode: this.clientMode,
      },
      role,
      scopes,
      caps: [],
      auth: {},
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };

    if (this.token) {
      params.auth.token = this.token;
    }

    // Device identity — only needed for clients that require Ed25519 pairing
    // (e.g. webchat-ui, control-ui). The 'webchat' client type works without it.
    if (typeof DeviceIdentity !== 'undefined' && this.clientId !== 'webchat') {
      try {
        const identity = await DeviceIdentity.getOrCreate();
        const device = await DeviceIdentity.sign(identity, {
          clientId: this.clientId,
          clientMode: this.clientMode,
          role,
          scopes,
          token: this.token || null,
          nonce: this.connectNonce || '',
        });
        params.device = device;
      } catch (e) {
        console.warn('[GatewayClient] device identity failed:', e.message);
      }
    }

    try {
      const result = await this.request('connect', params);
      this.connected = true;
      this.connecting = false;
      this.backoffMs = 800;
      this._setState('connected');
      if (this.onConnected) this.onConnected(result);
    } catch (e) {
      this.connecting = false;
      const code = e.message || '';
      if (code.includes('AUTH') || code.includes('auth') || code.includes('token')) {
        this._setState('error', 'Authentication failed — check your token');
      } else if (code.includes('PAIRING') || code.includes('pairing')) {
        this._setState('error', 'Device pairing required — approve in Gateway dashboard');
      } else if (code.includes('device identity') || code.includes('DEVICE_IDENTITY')) {
        this._setState('error', 'Device identity required — your browser may not support Ed25519');
      } else {
        this._setState('error', e.message || 'Connection failed');
      }
      if (this.ws) this.ws.close();
    }
  }

  request(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Not connected'));
    }
    const id = this._uuid();
    const msg = { type: 'req', id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(msg));
      // Timeout after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  _flushPending(error) {
    for (const [, p] of this.pending) p.reject(error);
    this.pending.clear();
  }

  // Convenience methods
  async getStatus() { return this.request('status', {}); }
  async getHealth() { return this.request('health', {}); }
  async getAgentIdentity(agentId) {
    return this.request('agent.identity.get', agentId ? { agentId } : {});
  }
  async getChatHistory(sessionKey, limit = 50) {
    return this.request('chat.history', { sessionKey, limit });
  }
  async sendChat(sessionKey, message) {
    return this.request('chat.send', { sessionKey, message, idempotencyKey: this._uuid() });
  }
  async getSessionsList(opts = {}) {
    return this.request('sessions.list', { activeMinutes: 120, ...opts });
  }
}

if (typeof window !== 'undefined') window.GatewayClient = GatewayClient;
