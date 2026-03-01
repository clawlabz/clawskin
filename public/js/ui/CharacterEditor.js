/**
 * CharacterEditor.js — Character customization UI (HTML overlay)
 * Provides real-time preview as user adjusts appearance options
 */
class CharacterEditor {
  constructor(characterSprite, containerId) {
    this.character = characterSprite;
    this.container = document.getElementById(containerId);
    this.visible = false;
    this.onChange = null;
  }

  show() {
    this.visible = true;
    this._render();
    this.container.style.display = 'block';
  }

  hide() {
    this.visible = false;
    this.container.style.display = 'none';
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  _render() {
    const cfg = this.character.config;
    const skinTones = SpriteGenerator.SKIN_TONES;
    const hairColors = SpriteGenerator.HAIR_COLORS;
    const outfitTypes = Object.keys(SpriteGenerator.OUTFIT_COLORS);
    const hairNames = ['Short Messy', 'Spiky', 'Long', 'Curly', 'Buzz Cut'];
    const outfitNames = { hoodie: 'Hoodie', shirt: 'Shirt', suit: 'Suit', labcoat: 'Lab Coat', tshirt: 'T-Shirt' };
    const accessoryNames = { '': 'None', glasses: 'Glasses 🤓', hat: 'Hat 🎩', headphones: 'Headphones 🎧', cap: 'Cap 🧢' };

    this.container.innerHTML = `
      <div class="editor-panel">
        <div class="editor-header">
          <span>🎨 Character Creator</span>
          <button onclick="window._charEditor.hide()" class="editor-close">✕</button>
        </div>
        <div class="editor-body">
          <div class="editor-row">
            <label>Skin Tone</label>
            <div class="color-swatches" id="ed-skin">
              ${skinTones.map((c, i) => `<div class="swatch ${cfg.skinColor === c ? 'active' : ''}" style="background:${c}" data-val="${c}" onclick="window._charEditor._set('skinColor','${c}')"></div>`).join('')}
            </div>
          </div>
          <div class="editor-row">
            <label>Hair Style</label>
            <div class="btn-group" id="ed-hair">
              ${hairNames.map((n, i) => `<button class="ed-btn ${cfg.hairType === i ? 'active' : ''}" onclick="window._charEditor._set('hairType',${i})">${n}</button>`).join('')}
            </div>
          </div>
          <div class="editor-row">
            <label>Hair Color</label>
            <div class="color-swatches" id="ed-haircolor">
              ${hairColors.map(c => `<div class="swatch ${cfg.hairColor === c ? 'active' : ''}" style="background:${c}" onclick="window._charEditor._set('hairColor','${c}')"></div>`).join('')}
            </div>
          </div>
          <div class="editor-row">
            <label>Outfit</label>
            <div class="btn-group">
              ${outfitTypes.map(t => `<button class="ed-btn ${cfg.outfitType === t ? 'active' : ''}" onclick="window._charEditor._set('outfitType','${t}')">${outfitNames[t]}</button>`).join('')}
            </div>
          </div>
          <div class="editor-row">
            <label>Outfit Color</label>
            <div class="color-swatches">
              ${[0,1,2,3,4].map(i => {
                const ot = cfg.outfitType || 'hoodie';
                const c = (SpriteGenerator.OUTFIT_COLORS[ot] || SpriteGenerator.OUTFIT_COLORS.hoodie)[i];
                return `<div class="swatch ${cfg.outfitColorIdx === i ? 'active' : ''}" style="background:${c}" onclick="window._charEditor._set('outfitColorIdx',${i})"></div>`;
              }).join('')}
            </div>
          </div>
          <div class="editor-row">
            <label>Accessory</label>
            <div class="btn-group">
              ${Object.entries(accessoryNames).map(([k, v]) => `<button class="ed-btn ${(cfg.accessory || '') === k ? 'active' : ''}" onclick="window._charEditor._set('accessory','${k || ''}')">${v}</button>`).join('')}
            </div>
          </div>
          <div class="editor-actions">
            <button class="ed-action-btn" onclick="window._charEditor._randomize()">🎲 Random</button>
            <button class="ed-action-btn" onclick="window._charEditor._save()">💾 Save</button>
            <button class="ed-action-btn" onclick="window._charEditor._export()">📋 Export JSON</button>
          </div>
        </div>
      </div>
    `;
  }

  _set(key, value) {
    if (key === 'accessory' && value === '') value = null;
    if (key === 'pet' && value === '') value = null;
    this.character.updateConfig({ [key]: value });
    this._render();
    if (this.onChange) this.onChange(this.character.config);
  }

  _randomize() {
    const cfg = CharacterSprite.randomConfig();
    this.character.updateConfig(cfg);
    this._render();
    if (this.onChange) this.onChange(cfg);
  }

  _save() {
    const config = this.character.config;
    localStorage.setItem('clawskin_character', JSON.stringify(config));
    // Also persist to SettingsManager so ClawSkinApp.init() picks it up
    if (window._app && window._app.settings) {
      window._app.settings.update({ character: config });
    }
    this._showToast('Character saved! ✅');
  }

  _export() {
    const json = JSON.stringify(this.character.config, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      this._showToast('Config copied to clipboard! 📋');
    }).catch(() => {
      prompt('Copy this config:', json);
    });
  }

  _showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'editor-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
  }

  static loadSaved() {
    try {
      const saved = localStorage.getItem('clawskin_character');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }
}

if (typeof window !== 'undefined') window.CharacterEditor = CharacterEditor;
