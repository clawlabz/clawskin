# ClawSkin Product Roadmap

**Created**: 2026-03-01
**Status**: In Development

## Vision

ClawSkin is a real-time pixel character visualization for OpenClaw AI agents.
Two modes of use:
1. **Local Mode** — Download and open locally, auto-connects to `localhost:18789`
2. **Online Mode** — Visit clawskin.io/app, enter Gateway URL + Token, connect remotely

## Gateway WS Protocol (Reverse-Engineered from OpenClaw Source)

### Connection Flow
```
1. Browser opens WebSocket to Gateway URL (ws://host:18789 or wss://...)
2. Gateway sends: { type: "event", event: "connect.challenge", payload: { nonce } }
3. Client sends RPC: { type: "req", id: uuid, method: "connect", params: { auth: { token }, ... } }
4. Gateway responds: { type: "res", id: uuid, ok: true, payload: { snapshot: {...} } }
5. Gateway pushes events: { type: "event", event: "chat"|"agent"|"presence", payload: {...} }
```

### RPC Format
```json
// Request
{ "type": "req", "id": "uuid", "method": "method.name", "params": {} }

// Response
{ "type": "res", "id": "uuid", "ok": true, "payload": {} }
```

### Key Methods
| Method | Purpose |
|--------|---------|
| `connect` | Auth + handshake |
| `status` | Gateway status (uptime, health) |
| `health` | Health check |
| `chat.history` | Get chat message history |
| `chat.send` | Send a message |
| `sessions.list` | List active sessions |
| `agent.identity.get` | Get agent name/avatar |

### Real-Time Events
| Event | Data | Maps To |
|-------|------|---------|
| `chat` (state=delta) | Streaming text | → `typing` animation |
| `chat` (state=final) | Completed response | → `idle` animation |
| `agent` (stream=tool, phase=start) | Tool call starting | → `executing` animation |
| `agent` (stream=tool, phase=result) | Tool call done | → `idle` animation |
| `agent` (stream=lifecycle) | Fallback/model switch | → `thinking` animation |

### Agent State Mapping
```
Gateway Event                          → ClawSkin State
─────────────────────────────────────────────────────
No active run, idle                    → idle (sitting, coffee, petting cat)
chat.send received, waiting            → thinking (thought bubble "...")
chat delta streaming                   → typing (fast keyboard animation)
tool phase=start (exec/browser/etc)    → executing (walks to server rack)
tool phase=start (web_fetch/search)    → browsing (staring at screen)
tool phase=result with error           → error (❌ above head)
chat state=final                       → idle (back to relaxed)
No activity for 30min+                 → sleeping (head on desk 💤)
Heartbeat event                        → waving (waves at window)
```

## Architecture

```
clawSkin/
├── index.html              # Marketing/landing page (existing)
├── app.html                # ★ Product app page
├── css/
│   ├── style.css           # Landing page styles (existing)
│   └── app.css             # ★ App-specific styles
├── js/
│   ├── app/
│   │   ├── ClawSkinApp.js      # ★ Main app controller
│   │   ├── GatewayClient.js    # ★ OpenClaw WS protocol client
│   │   ├── ConnectionPanel.js  # ★ Connect UI (URL/Token input)
│   │   ├── AgentStateMapper.js # ★ Gateway events → character states
│   │   └── SettingsManager.js  # ★ localStorage persistence
│   ├── character/          # (existing) sprite/animation system
│   ├── scenes/             # (existing) office/hacker/cafe
│   ├── sprites/            # (existing) procedural generation
│   ├── state/              # (existing, refactor DemoMode)
│   └── ui/                 # (existing) editor/picker
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md          # This file
│   └── PROGRESS.md
└── package.json
```

## Development Phases

### Phase 1: Gateway Connection (Current)
- [x] Reverse-engineer OpenClaw WS protocol
- [ ] Build GatewayClient.js (WS connect, auth, RPC, event handling)
- [ ] Build AgentStateMapper.js (event → character state)
- [ ] Build ConnectionPanel.js (URL/Token input + auto-detect)
- [ ] Build app.html (product page)
- [ ] Local auto-detection (try localhost:18789 on load)
- [ ] localStorage persistence (connection settings + character config)

### Phase 2: Polish & UX
- [ ] Connection status indicator (connected/disconnected/reconnecting)
- [ ] Agent identity display (name + avatar from Gateway)
- [ ] Chat activity indicator (show what agent is working on)
- [ ] Smooth state transitions (don't jump between states)
- [ ] Mobile responsive app page
- [ ] HTTPS/WSS guidance for remote connections

### Phase 3: Distribution
- [ ] Package as OpenClaw Skill (`clawhub install clawskin`)
- [ ] Deploy landing page to clawskin.io
- [ ] npm package (`npx clawskin` to run locally)
- [ ] GitHub Pages for online mode

## Technical Constraints

### HTTPS → WS Security
- HTTPS pages can only connect to `wss://` (not `ws://`)
- Exception: `ws://localhost` is allowed from HTTPS (browser whitelist)
- Remote users need Tailscale Serve (`wss://machine.ts.net`)
- Local mode (`file://` or local HTTP) has no restrictions

---
*Last updated: 2026-03-01*
