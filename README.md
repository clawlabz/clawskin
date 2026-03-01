# 🎨 ClawSkin

**Pixel Agent Skin Engine** — Give your AI assistant a face, an office, and a daily life.

A pixel character engine that visualizes AI agent states in real-time. Pure Canvas 2D, zero dependencies, zero build tools.

<p align="center">
  <img src="https://img.shields.io/badge/Canvas_2D-Procedural-blue" alt="Canvas 2D">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript&logoColor=white" alt="JavaScript">
  <img src="https://img.shields.io/badge/Dependencies-0-brightgreen" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/Build-None-brightgreen" alt="Zero Build">
  <img src="https://img.shields.io/github/license/clawlabz/clawskin" alt="License">
</p>

## ✨ Features

- 🧑‍🎨 **Character Customization** — 5 skin tones × 5 hairstyles × 5 outfits × 4 accessories × 5 pets = 2,500+ combinations
- 🏠 **3 Scenes** — Office, Hacker Den, Cozy Café (each with ambient animations and particles)
- 🎬 **8 State Animations** — idle, thinking, typing, executing, browsing, error, wave, sleeping
- 💬 **Dialogue Bubbles** — Typewriter effect with emoji support
- 👥 **Multi-Agent** — Display multiple AI agents simultaneously with independent states
- 🐾 **Pixel Pets** — Cats, dogs, robots, birds, hamsters with autonomous AI behavior
- 🎮 **Demo Mode** — Runs standalone without any backend connection
- 📦 **Zero Dependencies** — Pure static files, just Node.js to serve

## 🚀 Quick Start

```bash
git clone https://github.com/clawlabz/clawskin.git
cd clawskin
npm start
# → http://localhost:3000
```

Opens the ClawSkin app and auto-connects to your local OpenClaw Gateway (`ws://localhost:18789`).

> **Why `npm start` instead of opening the HTML directly?**
> Browsers block WebSocket connections from `file://` pages due to origin restrictions.
> The built-in server runs on `http://localhost` which Gateway accepts. Zero dependencies — just Node.js.

### CLI Options

```bash
npm start                    # Default: localhost:3000, opens browser
npm start -- --no-open       # Don't open browser
npm start -- --port 8080     # Custom port
npm start -- --host 0.0.0.0  # Expose to network (see Security below)
```

## 🏗️ Architecture

```
clawSkin/
├── public/
│   ├── index.html              # Landing page (demo + customization)
│   ├── app.html                # Full-screen app (main product)
│   ├── css/
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
    └── ARCHITECTURE.md         # Detailed architecture doc
```

### Character Layer System

```
Layer 5: Accessory  — glasses / hat / headphones
Layer 4: Hair       — 5 styles with color variants
Layer 3: Outfit     — hoodie / suit / lab coat / ...
Layer 2: Expression — happy / thinking / confused / sleepy
Layer 1: Body       — base 32×32 pixel humanoid + skin tone
Layer 0: Shadow
```

### Agent State Mapping

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

## 🔒 Security

ClawSkin is designed to run locally as a companion UI. Here are the security considerations:

### Local server (`serve.cjs`)

- **Binds to `127.0.0.1` by default** — only accessible from your machine. Use `--host 0.0.0.0` explicitly if you need network access.
- **`/api/config` endpoint** — returns the Gateway URL detected from `~/.openclaw/openclaw.json` for auto-connect convenience. **Auth tokens are never served** by this endpoint; users must enter tokens manually in the UI.
- **Security headers** — CSP, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy are set on all responses.

### Browser storage

- **Settings** (Gateway URL, scene choice, character config) are persisted in `localStorage`.
- **Gateway auth token** is stored in `localStorage` after the user enters it manually. This is standard browser behavior (same as any web app with "remember me"). The token never leaves the browser.
- **Device identity** — An Ed25519 keypair is generated and stored in `localStorage` for Gateway device pairing. The private key is stored as base64url in plaintext. This is a known tradeoff: `localStorage` is accessible to any JavaScript on the same origin. For a locally-run pixel companion, this is acceptable. If you need stronger protection, use the browser in a dedicated profile.

### WebSocket connection

- ClawSkin requests **read-only scopes** (`operator.read`, `operator.events`) from the Gateway — it does not request admin privileges.
- For remote connections, use `wss://` (e.g. via Tailscale Serve) to encrypt traffic.

## 🔗 Part of the Claw Ecosystem

```
ClawSkin (you are here)  →  ClawArena  →  ClawGenesis
   Free / visual hook        Light game      Deep simulation
```

ClawSkin characters can be reused as avatars in [ClawArena](https://github.com/clawlabz/clawarena) spectating scenes.

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Ideas for contributions:
- 🎨 New scenes (bedroom, spaceship, garden...)
- 👕 New outfit/hairstyle/accessory sprites
- 🐾 New pet companions
- 🌐 i18n support

## 📄 License

[MIT](LICENSE) © 2026 ClawLabz
