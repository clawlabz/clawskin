/**
 * BubbleManager.js — Speech/thought bubble with typewriter effect
 */
class BubbleManager {
  constructor() {
    this.active = false;
    this.text = '';
    this.displayText = '';
    this.charIndex = 0;
    this.timer = 0;
    this.displayDuration = 0;
    this.maxDuration = 5000;
    this.typeSpeed = 50; // ms per char
    this.bubbleType = 'speech'; // speech | thought | status
    this.queue = [];
  }

  show(text, type = 'speech', duration = 5000) {
    if (this.active) {
      this.queue.push({ text, type, duration });
      return;
    }
    this.active = true;
    this.text = text.slice(0, 60); // max 60 chars
    this.displayText = '';
    this.charIndex = 0;
    this.timer = 0;
    this.displayDuration = 0;
    this.maxDuration = duration;
    this.bubbleType = type;
  }

  update(dt) {
    if (!this.active) return;

    if (this.charIndex < this.text.length) {
      this.timer += dt;
      if (this.timer >= this.typeSpeed) {
        this.timer = 0;
        this.charIndex++;
        this.displayText = this.text.slice(0, this.charIndex);
      }
    } else {
      this.displayDuration += dt;
      if (this.displayDuration >= this.maxDuration) {
        this.active = false;
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          this.show(next.text, next.type, next.duration);
        }
      }
    }
  }

  render(ctx, x, y) {
    if (!this.active || !this.displayText) return;

    ctx.save();
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';

    const lines = this._wrapText(ctx, this.displayText, 120);
    const lineHeight = 13;
    const padding = 6;
    const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    const bw = maxWidth + padding * 2;
    const bh = lines.length * lineHeight + padding * 2;
    const bx = x - bw / 2;
    const by = y - bh - 12;

    // Bubble background
    ctx.fillStyle = this.bubbleType === 'thought' ? '#F0F0F0' : '#FFFFFF';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    // Rounded rect
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail
    if (this.bubbleType === 'thought') {
      ctx.fillStyle = '#F0F0F0';
      ctx.beginPath();
      ctx.arc(x - 4, by + bh + 5, 3, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 2, by + bh + 10, 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x - 5, by + bh);
      ctx.lineTo(x, by + bh + 8);
      ctx.lineTo(x + 5, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(x - 5, by + bh);
      ctx.lineTo(x, by + bh + 8);
      ctx.lineTo(x + 5, by + bh);
      ctx.stroke();
      // Cover top of tail
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 4, by + bh - 1, 9, 2);
    }

    // Text
    ctx.fillStyle = '#333';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + padding, by + padding + i * lineHeight);
    });

    // Cursor blink when typing
    if (this.charIndex < this.text.length) {
      const lastLine = lines[lines.length - 1];
      const lw = ctx.measureText(lastLine).width;
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = '#333';
        ctx.fillRect(bx + padding + lw + 1, by + padding + (lines.length - 1) * lineHeight, 6, 10);
      }
    }

    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }
}

if (typeof window !== 'undefined') window.BubbleManager = BubbleManager;
