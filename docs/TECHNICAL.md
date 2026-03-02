# ClawSkin Technical Documentation

## Architecture

```
clawSkin/
├── public/
│   ├── index.html              # Landing page (demo + customization)
│   ├── app.html                # Full-screen app (main product)
│   └── js/
│       ├── app/                # ClawSkinApp, GatewayClient, Settings
│       ├── scenes/             # Office / Hacker / Café scenes
│       ├── character/          # Sprite rendering + animations
│       ├── sprites/            # Procedural sprite generator
│       ├── pets/               # Pet entity + manager
│       ├── state/              # Agent state sync + demo mode
│       └── ui/                 # Character editor + scene picker
├── serve.cjs                   # Zero-dependency HTTP server
└── docs/
    └── TECHNICAL.md            # This file
```

## Character Layer System

```
Layer 5: Accessory  — glasses / hat / headphones
Layer 4: Hair       — 5 styles with color variants
Layer 3: Outfit     — hoodie / suit / lab coat / ...
Layer 2: Expression — happy / thinking / confused / sleepy
Layer 1: Body       — base 32×32 pixel humanoid + skin tone
Layer 0: Shadow
```

## Agent State Mapping

| Agent State | Pixel Character Behavior |
|-------------|-------------------------|
| `idle`      | Sitting, drinking coffee, petting cat |
| `thinking`  | Thought bubble "..." |
| `writing`   | Fast typing, screen flickers |
| `executing` | Walks to server rack |
| `browsing`  | Staring at screen, occasional clicks |
| `error`     | ❌ above head, frustrated expression |
| `heartbeat` | Waves at window |
| `sleeping`  | Head on desk 💤 |

## Render Pipeline

Three-phase rendering with painter's algorithm (back to front):

1. **Scene Background** — walls, floor, windows, ambient weather effects, decorations
2. **Workstation Layer** (per agent, Y-sorted):
   - Chairs (behind character)
   - Characters (depth-sorted by Y)
   - Desks + laptops + cups (in front of character)
3. **Overlay Layer**:
   - Pets (independent wander, Y-sorted)
   - Name tags + speech bubbles (always on top)

## Weather System

Each scene supports weather cycling via window/panel click:

| Scene | States |
|-------|--------|
| Office | Sunny → Night (moon + stars) → Rain (lightning) → Snow |
| Café | Rain → Sunny → Snow → Fog |
| Hacker Den | Neon Purple → Red Alert → Matrix Green → Blackout |

Weather affects: window content, global ambient overlay, particle systems.

## Pet AI Behavior

Decision cycle runs every 3–11 seconds:

| Roll | Action |
|------|--------|
| < 0.25 | Walk toward a random agent (rub legs) |
| < 0.40 | Walk toward another pet |
| < 0.60 | Random walk within floor bounds |
| < 0.60 + sleepChance | Sleep in place |
| else | Idle |

Pet types: Cat (walk), Dog (walk), Robot (walk), Bird (fly + sine bob), Hamster (crawl + speed bursts)

Collision detection against desk obstacles with axis-aligned sliding.

## Gateway Protocol

ClawSkin connects to OpenClaw Gateway via WebSocket (protocol v3).

### Connection Flow
1. Open WebSocket → receive `connect.challenge` event
2. Send `connect` RPC with client info + auth token
3. On success → discover agents via `sessions.list`
4. Route incoming events by `sessionKey` pattern: `agent:<agentId>:<platform>:...`

### Key RPC Methods
- `connect` — authenticate and establish session
- `sessions.list` — discover active agent sessions
- `chat.send` — send message to agent (requires `idempotencyKey`)
- `chat.history` — fetch conversation history
- `agent.identity.get` — get agent metadata
- `status` / `health` — server status

### Event Types
- `chat` (states: `delta`, `final`, `aborted`, `error`) — streaming chat responses
- `agent` (streams: `tool`, `lifecycle`, `compaction`) — agent activity events
- `presence` — connection status

## Security

### Local Server (`serve.cjs`)
- Binds to `127.0.0.1` by default — only accessible from your machine
- `/api/config` returns Gateway URL from `~/.openclaw/openclaw.json` (tokens never served)
- Security headers: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy

### Browser Storage
- Settings persisted in `localStorage` (Gateway URL, scene, character config)
- Gateway auth token stored in `localStorage` after manual entry
- Ed25519 device identity keypair for Gateway pairing (base64url in localStorage)

### WebSocket
- Requests read-only scopes (`operator.read`, `operator.events`)
- Use `wss://` for remote connections (e.g. via Tailscale Serve)

## CLI Options

```bash
npm start                    # Default: localhost:3000, opens browser
npm start -- --no-open       # Don't open browser
npm start -- --port 8080     # Custom port
npm start -- --host 0.0.0.0  # Expose to network
```
