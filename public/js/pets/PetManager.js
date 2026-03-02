/**
 * PetManager.js — Manages all independent pets in the scene
 * Handles creation, update loop, rendering, and configuration persistence
 */
class PetManager {
  constructor(generator) {
    this.pets = [];
    this.generator = generator;
    this._sceneBounds = { w: 640, h: 400, floorY: 160 };
    this._treats = [];
  }

  /** Set scene dimensions for pet movement boundaries */
  setSceneBounds(w, h) {
    this._sceneBounds = { w, h, floorY: Math.round(h * 0.40) };
  }

  /** Add a pet by type, optionally with a specific color */
  addPet(type, color) {
    const pet = Pet.create(type, this.generator, this._sceneBounds, color || null);
    this.pets.push(pet);
    this._saveConfig();
    return pet;
  }

  /** Change a pet's color */
  setPetColor(id, color) {
    const pet = this.pets.find(p => p.id === id);
    if (pet) {
      pet.color = color;
      this._saveConfig();
    }
  }

  /** Remove a pet by id */
  removePet(id) {
    this.pets = this.pets.filter(p => p.id !== id);
    this._saveConfig();
  }

  /** Remove all pets */
  clearPets() {
    this.pets = [];
    this._saveConfig();
  }

  /** Update all pets */
  update(dt, agents, obstacles) {
    for (const pet of this.pets) {
      const otherPets = this.pets.filter(p => p !== pet);
      pet.update(dt, agents, otherPets, this._sceneBounds, obstacles);
    }
    this._updateTreats(dt);
  }

  /** Render all pets (caller should handle depth sorting if needed) */
  render(ctx) {
    // Render treats first (under pets)
    for (const t of this._treats) {
      ctx.globalAlpha = t.eaten ? 0.4 : 0.9;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(t.emoji, t.x - 5, t.y + 5);
      ctx.globalAlpha = 1;
    }

    // Sort pets by Y for back-to-front rendering
    const sorted = [...this.pets].sort((a, b) => a.sortY - b.sortY);
    for (const pet of sorted) {
      pet.render(ctx);
    }
  }

  /** Handle click — returns true if a pet was hit */
  handleClick(mx, my) {
    // Check back-to-front (top-rendered = last)
    const sorted = [...this.pets].sort((a, b) => a.sortY - b.sortY);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].hitTest(mx, my)) {
        sorted[i].react();
        return true;
      }
    }
    return false;
  }

  /** Drop a treat at position — nearby pets will come eat it */
  dropTreat(x, y) {
    const emojis = ['🍖', '🦴', '🐟', '🥜', '🌾', '🍪'];
    const treat = { x, y, emoji: emojis[Math.floor(Math.random() * emojis.length)], eaten: false, timer: 0 };
    this._treats.push(treat);

    // Find closest pet within range 200px
    let closest = null, minDist = 200;
    for (const pet of this.pets) {
      if (pet.state === 'interacting') continue;
      const cx = pet.x + 8 * pet.scale;
      const cy = pet.y + 8 * pet.scale;
      const d = Math.hypot(cx - x, cy - y);
      if (d < minDist) { minDist = d; closest = pet; }
    }
    if (closest) {
      closest.goToTreat(x, y);
    }
    return treat;
  }

  /** Update treats — check if pets reached them */
  _updateTreats(dt) {
    for (const treat of this._treats) {
      treat.timer += dt;
      if (treat.eaten && treat.timer > 2000) {
        treat._remove = true;
        continue;
      }
      if (treat.eaten) continue;
      // Check if any pet reached the treat
      for (const pet of this.pets) {
        if (pet._treatTarget && Math.abs(pet.x - treat.x) < 20 && Math.abs(pet.y - treat.y) < 20 && pet.state !== 'interacting') {
          treat.eaten = true;
          treat.timer = 0;
          pet.eatTreat();
          break;
        }
      }
    }
    this._treats = this._treats.filter(t => !t._remove);
  }

  /** Load pet configuration from localStorage */
  loadConfig() {
    try {
      const data = JSON.parse(localStorage.getItem('clawskin_pets') || '[]');
      if (Array.isArray(data) && data.length > 0) {
        this.pets = [];
        for (const petData of data) {
          if (petData.type && Pet.TYPES[petData.type]) {
            this.addPet(petData.type, petData.color || null);
          }
        }
      }
    } catch {}
  }

  /** Save pet configuration to localStorage */
  _saveConfig() {
    try {
      const data = this.pets.map(p => ({ type: p.type, color: p.color }));
      localStorage.setItem('clawskin_pets', JSON.stringify(data));
    } catch {}
  }

  /** Initialize with some default pets if no saved config */
  initDefaults() {
    this.loadConfig();
    if (this.pets.length === 0) {
      // Start with a cat and a dog by default
      this.addPet('cat');
      this.addPet('dog');
    }
  }

  /** Get all available pet types */
  static getAvailableTypes() {
    return Object.keys(Pet.TYPES);
  }
}

if (typeof window !== 'undefined') window.PetManager = PetManager;
