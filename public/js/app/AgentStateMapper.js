/**
 * AgentStateMapper.js — Maps OpenClaw Gateway events to ClawSkin character states
 * Listens to real-time WS events and drives the pixel character animations
 */
class AgentStateMapper {
  constructor(character, options = {}) {
    this.character = character;
    this.currentState = 'idle';
    this.lastActivityTime = Date.now();
    this.idleTimeout = options.idleTimeout || 30 * 60 * 1000; // 30min → sleeping
    this.sleepCheckInterval = null;
    this.activeRunId = null;
    this.agentId = options.agentId || 'main';
    this.sessionKeys = new Set(options.sessionKeys || ['main']);
    this.onStateChange = options.onStateChange || null;

    // Tool name → state mapping
    this.toolStateMap = {
      'exec': 'executing',
      'write': 'typing',
      'edit': 'typing',
      'read': 'browsing',
      'web_fetch': 'browsing',
      'web_search': 'browsing',
      'browser': 'browsing',
      'image': 'browsing',
      'message': 'typing',
      'tts': 'typing',
    };

    this._startIdleCheck();
  }

  /**
   * Process a Gateway event and update character state
   */
  handleEvent(event) {
    if (!event || !event.event) return;

    switch (event.event) {
      case 'chat':
        this._handleChatEvent(event.payload);
        break;
      case 'agent':
        this._handleAgentEvent(event.payload);
        break;
      case 'presence':
        // Could show connected instances
        break;
    }
  }

  _handleChatEvent(payload) {
    if (!payload) return;

    // Accept events from any session belonging to this agent
    // (Events are pre-routed by agentId in ClawSkinApp, so this is a safety check)

    switch (payload.state) {
      case 'delta':
        // Agent is streaming a response
        this._setCharState('typing', this._extractStreamText(payload));
        this.activeRunId = payload.runId || null;
        break;

      case 'final':
        // Agent finished responding
        this.activeRunId = null;
        this._setCharState('idle');
        // Show a snippet of the response as speech bubble
        const text = this._extractFinalText(payload);
        if (text) {
          this.character.showBubble(
            text.length > 60 ? text.slice(0, 57) + '...' : text,
            'speech', 4000
          );
        }
        break;

      case 'aborted':
        this.activeRunId = null;
        this._setCharState('idle');
        break;

      case 'error':
        this.activeRunId = null;
        this._setCharState('error');
        this.character.showBubble('Something went wrong...', 'speech', 3000);
        // Return to idle after 3s
        setTimeout(() => {
          if (this.currentState === 'error') this._setCharState('idle');
        }, 3000);
        break;
    }
  }

  _handleAgentEvent(payload) {
    if (!payload) return;

    // Tool stream events
    if (payload.stream === 'tool') {
      const data = payload.data || {};
      const toolName = data.name || '';
      const phase = data.phase || '';

      if (phase === 'start') {
        const mappedState = this.toolStateMap[toolName] || 'executing';
        const bubble = this._getToolBubble(toolName, data.args);
        this._setCharState(mappedState, bubble);
      } else if (phase === 'result') {
        // Tool finished, back to thinking (model will process result)
        this._setCharState('thinking');
      }
      return;
    }

    // Lifecycle events (model fallback, etc.)
    if (payload.stream === 'lifecycle' || payload.stream === 'fallback') {
      this._setCharState('thinking');
      this.character.showBubble('Switching approach...', 'thought', 2000);
      return;
    }

    // Compaction events
    if (payload.stream === 'compaction') {
      const phase = payload.data?.phase;
      if (phase === 'start') {
        this._setCharState('thinking');
        this.character.showBubble('Organizing thoughts...', 'thought', 3000);
      }
    }
  }

  _setCharState(state, bubbleText) {
    if (state === this.currentState && !bubbleText) return;
    this.currentState = state;
    this.lastActivityTime = Date.now();
    this.character.setState(state);

    if (bubbleText) {
      const type = state === 'thinking' ? 'thought' : 'speech';
      this.character.showBubble(bubbleText, type, 4000);
    }

    if (this.onStateChange) this.onStateChange(state);
  }

  _extractStreamText(payload) {
    // During streaming, show a thinking bubble
    if (!this.character.bubbleManager?.activeBubble) {
      return 'Writing...';
    }
    return null;
  }

  _extractFinalText(payload) {
    if (!payload?.message) return null;
    const msg = payload.message;
    if (typeof msg.text === 'string') return msg.text;
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          return block.text;
        }
      }
    }
    return null;
  }

  _getToolBubble(toolName, args) {
    switch (toolName) {
      case 'exec': return args?.command ? `$ ${args.command.slice(0, 40)}` : 'Running command...';
      case 'write': return args?.path ? `Writing ${this._basename(args.path)}` : 'Writing file...';
      case 'edit': return args?.path ? `Editing ${this._basename(args.path)}` : 'Editing...';
      case 'read': return args?.path ? `Reading ${this._basename(args.path)}` : 'Reading file...';
      case 'web_fetch': return 'Fetching page...';
      case 'web_search': return 'Searching web...';
      case 'browser': return 'Using browser...';
      case 'image': return 'Analyzing image...';
      case 'message': return 'Sending message...';
      default: return `Using ${toolName}...`;
    }
  }

  _basename(path) {
    return (path || '').split('/').pop() || path;
  }

  _startIdleCheck() {
    this.sleepCheckInterval = setInterval(() => {
      if (this.currentState === 'idle' || this.currentState === 'sleeping') {
        const elapsed = Date.now() - this.lastActivityTime;
        if (elapsed > this.idleTimeout && this.currentState !== 'sleeping') {
          this._setCharState('sleeping');
          this.character.showBubble('zzZ...', 'thought', 5000);
        }
      }
    }, 60000);
  }

  destroy() {
    if (this.sleepCheckInterval) {
      clearInterval(this.sleepCheckInterval);
      this.sleepCheckInterval = null;
    }
  }

  addSessionKey(key) {
    this.sessionKeys.add(key);
  }
}

if (typeof window !== 'undefined') window.AgentStateMapper = AgentStateMapper;
