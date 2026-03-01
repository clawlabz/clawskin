/**
 * SettingsManager.js — Persistent settings via localStorage
 */
class SettingsManager {
  constructor(storageKey = 'clawskin_settings') {
    this.storageKey = storageKey;
    this.defaults = {
      gatewayUrl: '',
      token: '',
      sessionKey: 'main',
      autoConnect: true,
      scene: 0,
      character: null,
      lastConnected: null,
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { ...this.defaults };
      const saved = JSON.parse(raw);
      return { ...this.defaults, ...saved };
    } catch { return { ...this.defaults }; }
  }

  save(settings) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (e) {
      console.warn('[SettingsManager] save failed:', e);
    }
  }

  update(patch) {
    const current = this.load();
    const updated = { ...current, ...patch };
    this.save(updated);
    return updated;
  }

  clear() {
    try { localStorage.removeItem(this.storageKey); } catch {}
  }
}

if (typeof window !== 'undefined') window.SettingsManager = SettingsManager;
