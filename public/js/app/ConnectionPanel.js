/**
 * ConnectionPanel.js — Gateway connection UI
 * Renders URL/Token input, connect button, status indicator
 */
class ConnectionPanel {
  /** Escape HTML to prevent XSS from untrusted Gateway data */
  static esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onConnect = options.onConnect || null;
    this.onDisconnect = options.onDisconnect || null;
    this.state = 'disconnected'; // disconnected|connecting|connected|error
    this.errorMessage = null;
    this.agentName = null;
    this.agentId = null;
    this.settings = options.settings || {};
    this.expanded = !this.settings.gatewayUrl;
  }

  render(settings) {
    if (settings) this.settings = settings;
    const s = this.settings;
    const isConnected = this.state === 'connected';
    const isConnecting = this.state === 'connecting';
    const isError = this.state === 'error';

    // Status dot color
    const dotClass = isConnected ? 'dot-connected' :
                     isConnecting ? 'dot-connecting' :
                     isError ? 'dot-error' : 'dot-disconnected';

    const esc = ConnectionPanel.esc;
    const statusText = isConnected ? `Connected${this.agentName ? ' — ' + esc(this.agentName) : ''}` :
                       isConnecting ? 'Connecting...' :
                       isError ? esc(this.errorMessage || 'Connection failed') :
                       'Not connected';

    this.container.innerHTML = `
      <div class="conn-panel ${this.expanded ? 'expanded' : 'collapsed'}">
        <div class="conn-status-bar" onclick="window._connPanel.toggleExpand()">
          <div class="conn-status-left">
            <div class="conn-dot ${dotClass}"></div>
            <span class="conn-status-text">${statusText}</span>
          </div>
          <div class="conn-toggle">${this.expanded ? '▲' : '▼'}</div>
        </div>

        ${this.expanded ? `
        <div class="conn-form">
          <div class="conn-field">
            <label>Gateway URL</label>
            <input type="text" id="conn-url" value="${s.gatewayUrl || ''}"
                   placeholder="wss://your-gateway.example.com"
                   ${isConnected ? 'disabled' : ''} />
            <div class="conn-hint">
              Local: <code>ws://localhost:18789</code> · Remote: <code>wss://your-machine.ts.net</code>
            </div>
          </div>
          <div class="conn-field">
            <label>Token <span class="conn-optional">(if auth enabled)</span></label>
            <input type="password" id="conn-token" value="${s.token || ''}"
                   placeholder="Gateway auth token"
                   ${isConnected ? 'disabled' : ''} />
          </div>
          <div class="conn-field">
            <label>Session Key</label>
            <input type="text" id="conn-session" value="${s.sessionKey || 'main'}"
                   placeholder="main"
                   ${isConnected ? 'disabled' : ''} />
            <div class="conn-hint">Which agent session to visualize</div>
          </div>
          <div class="conn-actions">
            ${isConnected ? `
              <button class="conn-btn conn-btn-disconnect" onclick="window._connPanel._disconnect()">
                Disconnect
              </button>
            ` : `
              <button class="conn-btn conn-btn-connect" onclick="window._connPanel._connect()"
                      ${isConnecting ? 'disabled' : ''}>
                ${isConnecting ? '⏳ Connecting...' : '🔌 Connect'}
              </button>
            `}
            <label class="conn-auto-label">
              <input type="checkbox" id="conn-auto" ${s.autoConnect ? 'checked' : ''} />
              Auto-connect on load
            </label>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  setState(state, detail) {
    this.state = state;
    if (state === 'error') this.errorMessage = detail;
    else if (state === 'connected') this.errorMessage = null;
    this.render();
  }

  setAgentInfo(name, id) {
    this.agentName = name;
    this.agentId = id;
    if (this.state === 'connected') {
      this.expanded = false;
    }
    this.render();
  }

  toggleExpand() {
    this.expanded = !this.expanded;
    this.render();
  }

  _getFormValues() {
    return {
      gatewayUrl: (document.getElementById('conn-url')?.value || '').trim(),
      token: (document.getElementById('conn-token')?.value || '').trim(),
      sessionKey: (document.getElementById('conn-session')?.value || 'main').trim(),
      autoConnect: document.getElementById('conn-auto')?.checked ?? true,
    };
  }

  _connect() {
    const vals = this._getFormValues();
    if (!vals.gatewayUrl) {
      this.setState('error', 'Please enter a Gateway URL');
      return;
    }
    if (this.onConnect) this.onConnect(vals);
  }

  _disconnect() {
    if (this.onDisconnect) this.onDisconnect();
  }
}

if (typeof window !== 'undefined') window.ConnectionPanel = ConnectionPanel;
