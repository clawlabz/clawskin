/**
 * DemoMode.js — Automatic state cycling for demo/preview
 * Simulates a real Agent's work day with random state changes and bubbles
 */
class DemoMode {
  constructor(characterSprite) {
    this.character = characterSprite;
    this.active = false;
    this.timer = 0;
    this.nextChange = 3000;
    this.stateIndex = 0;

    this.stateSequence = [
      { state: 'idle',      duration: [4000, 8000],  bubbles: ['Just chilling...', 'Waiting for tasks', 'Hmm, what to do...', '☕ Coffee time soon'] },
      { state: 'thinking',  duration: [3000, 5000],  bubbles: ['Processing request...', 'Let me think...', 'Analyzing data...', 'Hmm, interesting...'] },
      { state: 'typing',    duration: [5000, 10000], bubbles: ['Writing response...', 'Almost done...', 'def solve(x): ...', 'Drafting email...', 'Fixing that bug...'] },
      { state: 'executing', duration: [3000, 5000],  bubbles: ['Running command...', 'npm install...', 'Deploying...', 'git push origin main'] },
      { state: 'browsing',  duration: [4000, 7000],  bubbles: ['Searching docs...', 'Reading Stack Overflow', 'Checking GitHub...', 'Interesting article!'] },
      { state: 'coffee',    duration: [3000, 5000],  bubbles: ['Ah, fresh coffee!', 'Need more caffeine', 'Perfect brew ☕', 'Break time!'] },
      { state: 'error',     duration: [2000, 3000],  bubbles: ['Oops! Error 404', 'Something broke...', 'Null pointer?!', 'Let me fix that...'] },
      { state: 'waving',    duration: [2000, 3000],  bubbles: ['Hey there! 👋', 'Hello world!', 'Hi boss!', 'Wave check!'] },
      { state: 'sleeping',  duration: [4000, 6000],  bubbles: ['zzZ...', 'Dreaming of code...', 'Recharging...'] },
    ];
  }

  start() {
    this.active = true;
    this.timer = 0;
    this._triggerNext();
  }

  stop() {
    this.active = false;
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;
    if (this.timer >= this.nextChange) {
      this.timer = 0;
      this._triggerNext();
    }
  }

  _triggerNext() {
    const entry = this.stateSequence[this.stateIndex % this.stateSequence.length];
    this.stateIndex++;

    this.character.setState(entry.state);

    const [min, max] = entry.duration;
    this.nextChange = min + Math.random() * (max - min);

    // Show bubble with 70% probability
    if (Math.random() < 0.7 && entry.bubbles.length > 0) {
      const text = entry.bubbles[Math.floor(Math.random() * entry.bubbles.length)];
      const type = entry.state === 'thinking' ? 'thought' : 'speech';
      setTimeout(() => {
        this.character.showBubble(text, type, this.nextChange * 0.6);
      }, 500);
    }
  }
}

if (typeof window !== 'undefined') window.DemoMode = DemoMode;
