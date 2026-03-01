/**
 * ScenePicker.js — Scene selection UI
 */
class ScenePicker {
  constructor(scenes, onSelect) {
    this.scenes = scenes;
    this.currentIndex = 0;
    this.onSelect = onSelect;
  }

  render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = this.scenes.map((s, i) => `
      <button class="scene-btn ${i === this.currentIndex ? 'active' : ''}"
              onclick="window._scenePicker.select(${i})">
        ${s.label}
      </button>
    `).join('');
  }

  select(index) {
    this.currentIndex = index;
    if (this.onSelect) this.onSelect(this.scenes[index], index);
    this.render('scene-picker');
  }
}

if (typeof window !== 'undefined') window.ScenePicker = ScenePicker;
