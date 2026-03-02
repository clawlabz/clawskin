# ClawSkin Changelog

## [0.3.0] - 2026-03-02

### Agent Chat Panel + Weather System + Interactive Easter Eggs

---

### Added

- **Agent Chat Panel** (`app.html`, `GatewayClient.js`)
  - Chat panel below character editor for direct messaging with the selected agent
  - Supports send (`chat.send`) and history loading (`chat.history`)
  - Real-time streaming display (delta → typing indicator → final message)
  - Per-agent session isolation via independent sessionKey
  - Only visible in Live mode; auto-hidden in Demo mode

- **Weather Cycling System** (`OfficeScene.js`, `CafeScene.js`, `HackerScene.js`)
  - Click window / LED panel to cycle through weather states
  - Office: ☀️ Sunny → 🌙 Night (moon + stars) → 🌧️ Rain (lightning) → ❄️ Snow
  - Café: 🌧️ Rain → ☀️ Sunny → ❄️ Snow → 🌫️ Fog
  - Hacker Den: 💜 Neon → 🔴 Red Alert → 💚 Matrix → 🌑 Blackout
  - Weather affects global ambience (night darkening, lightning flash, snow on windowsill)

- **Pet Click Reactions** (`Pet.js`, `PetManager.js`)
  - Click a pet to trigger a random speech bubble (unique phrases per pet type)
  - Cat: "Purrr~", "💕", "(=^･ω･^=)" / Dog: "Woof!", "*tail wag*", "💖"
  - Robot: "BOOP", "⚡" / Bird: "Tweet!", "🎵" / Hamster: "Squeak!", "🥜"
  - Bubbles fade out smoothly; pets pause wandering during interaction

- **Treat Dropping** (`Pet.js`, `PetManager.js`)
  - Click empty floor to drop a random treat (🍖🦴🐟🥜🌾🍪)
  - Nearest pet within 200px walks over to eat it
  - Type-specific reactions: "TREAT!! 🦴", "*chomp*", "Yummy fish!"

- **Interactive Decoration Easter Eggs** (`app.html`)
  - Click clock → show current time
  - Click bookshelf → random programmer quote
  - Click whiteboard → random sprint note
  - Click arcade cabinet → "INSERT COIN", "HIGH SCORE: 99999", etc.
  - Click menu board → random café menu item
  - Click plant → wiggle reaction "🌱 *wiggle*", "🌵 Don't touch!"

### Improved

- **Editor panel layout** — RANDOM button moved to header bar, removed redundant SAVE button
- **Panel scroll behavior** — Panel itself non-scrollable; chat area fills remaining space with independent scroll
- **Panel width** 280px → 360px, chat font 5px → 8px for better readability
- **UI scale threshold** — No zoom below 2560px to prevent bloated HUD on normal screens

### Files Changed

| File | Change | Description |
|------|--------|-------------|
| `public/app.html` | Modified | Chat panel CSS/HTML/JS, weather/pet/decoration click handlers, UI scale fix |
| `public/js/app/GatewayClient.js` | Modified | Added `sendChat()` method |
| `public/js/pets/Pet.js` | Modified | Added hitTest, react, goToTreat, eatTreat, bubble rendering |
| `public/js/pets/PetManager.js` | Modified | Added handleClick, dropTreat, treat management |
| `public/js/scenes/OfficeScene.js` | Modified | 4 weather states + cycleWeather + getWindowRect |
| `public/js/scenes/CafeScene.js` | Modified | 4 weather states + cycleWeather + getWindowRect |
| `public/js/scenes/HackerScene.js` | Modified | 4 mood states + cycleWeather + getWindowRect |

---

## [0.2.0] - 2026-03-01

### 3/4 RPG Perspective + Movement Overhaul + Independent Pet System

Major update addressing three core issues: characters occluded by furniture, unnatural movement, and pets bound to characters.

---

### Added

- **Independent Pet System** (`js/pets/Pet.js`, `js/pets/PetManager.js`)
  - Pets are no longer bound to agents; they have their own AI behavior loop
  - 5 pet types: Cat (walk), Dog (walk), Robot (walk), Bird (fly), Hamster (crawl)
  - Autonomous movement: random walk, rub against agents, interact with other pets, nap in place
  - Bird flight with sine-wave bobbing + wing-flap animation
  - Hamster occasional speed bursts
  - Pet config persisted to localStorage; defaults to cat + dog

- **POI Wandering System** (`AgentSlot.js`)
  - Idle agents have 25% chance to visit POIs (water cooler, bookshelf, window, plant)
  - 15% chance to walk to a colleague's desk for social interaction
  - Emoji bubbles on POI arrival (☕ 🌤️ 📖 👋 🌿)
  - Expanded roaming range to full canvas area

- **New Pet Sprites** (`SpriteGenerator.js`)
  - `_drawBird()`: Blue body, orange beak/claws, 2-frame wing-flap animation
  - `_drawHamster()`: Wheat-colored, pink cheek pouches, round ears, 2-frame tail wiggle

### Improved

- **3/4 Top-Down Perspective** — Classic RPG view (Stardew Valley / Pokémon style)
  - Characters stand behind desks (lower Y = further back visually)
  - Desks in front of characters (higher Y = closer to viewer)
  - Upper body fully visible, no longer occluded by furniture

- **Furniture Sprite Redraw** (`SpriteGenerator.js`)
  - Desk: 3/4 view with visible top surface + front face, wood grain detail, 48×20px
  - Monitor → Laptop: keyboard base + tilted screen, Apple-style logo, 20×16px
  - Chair: visible seat cushion + backrest + casters, 16×18px

- **Three-Phase Render Pipeline** (`ClawSkinApp.js`)
  - Phase 1: Render all chairs (always visible)
  - Phase 2: Y-sorted character rendering (depth sort)
  - Phase 3: Render all desks + laptops + cups (always visible)
  - Phase 4: Render independent pets

- **Smooth Movement** (`AgentSlot.js`)
  - All movement uses linear interpolation (lerp), no more teleporting
  - Returning to desk is also a smooth walk
  - Movement speed increased: 0.06–0.08 (from 0.04–0.06)
  - Natural sine-wave sway while walking

### Fixed

- Fixed desks/chairs disappearing when agents wander — furniture now always renders
- Fixed pets teleporting with agents — pets fully decoupled
- Fixed agents snapping back to desk — now smooth walk-back
- Fixed character occlusion in multi-agent scenes — introduced Y-sort depth sorting

### Files Changed

| File | Change | Description |
|------|--------|-------------|
| `js/sprites/SpriteGenerator.js` | Modified | Redrawn furniture sprites (3/4 view), added bird/hamster sprites |
| `js/scenes/OfficeScene.js` | Modified | Recalculated workstation coords, adjusted renderDesk order |
| `js/app/ClawSkinApp.js` | Modified | Three-phase render pipeline, PetManager integration |
| `js/app/AgentSlot.js` | Rewritten | Lerp smooth movement, POI wandering, social behavior |
| `js/character/CharacterSprite.js` | Modified | Removed pet rendering code |
| `js/pets/Pet.js` | **New** | Independent pet entity class |
| `js/pets/PetManager.js` | **New** | Pet collection manager |
| `app.html` | Modified | Added Pet/PetManager script tags |
| `index.html` | Modified | Added Pet/PetManager script tags |

---

## [0.1.0] - 2026-02-28

### Initial Release

- Pure Canvas 2D rendering, zero external dependencies
- 32×32 pixel character procedural generation (16-frame animation)
- 5 skin tones × 7 hair colors × 5 hairstyles × 5 outfit types
- 4 accessories: glasses, hat, headphones, cap
- 3 pets: cat, dog, robot
- 3 scenes: Office, Hacker Den, Cozy Café
- 8 state animations: idle, typing, thinking, executing, browsing, error, sleeping, waving
- Dialogue bubble system with typewriter effect
- Character editor UI
- Demo mode (simulated state cycling)
- Multi-agent support (auto workstation layout)
- Gateway WebSocket connection (OpenClaw protocol)
- Click agent to open editor
- localStorage config persistence
- Embeddable iframe page
