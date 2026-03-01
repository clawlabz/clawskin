/**
 * PetManager.js — Manages all independent pets in the scene
 * Handles creation, update loop, rendering, and configuration persistence
 */
class PetManager {
  constructor(generator) {
    this.pets = [];
    this.generator = generator;
    this._sceneBounds = { w: 640, h: 400, floorY: 160 };
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
  }

  /** Render all pets (caller should handle depth sorting if needed) */
  render(ctx) {
    // Sort pets by Y for back-to-front rendering
    const sorted = [...this.pets].sort((a, b) => a.sortY - b.sortY);
    for (const pet of sorted) {
      pet.render(ctx);
    }
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
