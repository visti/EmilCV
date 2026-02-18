import { sizeWindowBody } from './windows.js';

export const demoAnim = { starfield: 0, scroller: 0 };

export function sizeDemoCanvas() {
  const body = sizeWindowBody('demo-window', 'demo-body', 12, 120);
  if (!body) return;
  const canvas = document.getElementById('demo-canvas');
  const scroller = document.getElementById('scroller');
  if (!canvas) return;
  const rect = body.getBoundingClientRect();
  const w = Math.max(120, Math.floor(rect.width - 12));
  const h = Math.max(90, Math.floor(rect.height - 12));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  if (scroller) {
    const pad = 2;
    scroller.style.left = (canvas.offsetLeft + pad) + 'px';
    scroller.style.top = (canvas.offsetTop + pad) + 'px';
    scroller.style.width = Math.max(0, canvas.clientWidth - pad * 2) + 'px';
    scroller.style.height = Math.max(0, canvas.clientHeight - pad * 2) + 'px';
  }
}

export function startStarfield() {
  cancelAnimationFrame(demoAnim.starfield);
  const canvas = document.getElementById('demo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const stars = Array.from({ length: 140 }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: Math.random(),
    v: 0.004 + Math.random() * 0.012
  }));

  function render() {
    const win = document.getElementById('demo-window');
    if (win && win.style.display === 'none') { demoAnim.starfield = requestAnimationFrame(render); return; }
    sizeDemoCanvas();
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#001a44';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.6;
    for (const s of stars) {
      s.z -= s.v;
      if (s.z <= 0.02) {
        s.x = Math.random() * 2 - 1;
        s.y = Math.random() * 2 - 1;
        s.z = 1;
        s.v = 0.004 + Math.random() * 0.012;
      }
      const x = cx + (s.x / s.z) * scale;
      const y = cy + (s.y / s.z) * scale;
      if (x < 0 || x > w || y < 0 || y > h) continue;
      const size = Math.max(1, Math.floor((1 - s.z) * 2.5));
      const shade = Math.floor(160 + (1 - s.z) * 95);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.fillRect(x, y, size, size);
    }
    demoAnim.starfield = requestAnimationFrame(render);
  }

  demoAnim.starfield = requestAnimationFrame(render);
}

export function startScroller() {
  const text = 'Emil Visti curriculum vitae 2026  ';
  const scroller = document.getElementById('scroller');
  if (!scroller) return;
  scroller.innerHTML = '';
  const inner = document.createElement('div');
  inner.style.whiteSpace = 'nowrap';
  inner.style.display = 'inline-block';
  scroller.appendChild(inner);

  function addText() {
    return text.split('').map((ch) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      inner.appendChild(span);
      return span;
    });
  }

  const chars = addText().concat(addText());
  const palette = [
    '#ffcc33', '#ff9933', '#ff6633', '#ff3333',
    '#ff33aa', '#ff66ff', '#cc66ff', '#9966ff',
    '#6699ff', '#33ccff', '#33ffcc', '#66ff66',
    '#ccff66', '#ffff66', '#ffcc33', '#ff9933'
  ];
  let t = 0;
  let offset = 0;

  function render() {
    const canvas = document.getElementById('demo-canvas');
    if (!canvas) return;
    const win = document.getElementById('demo-window');
    if (win && win.style.display === 'none') { demoAnim.scroller = requestAnimationFrame(render); return; }
    const speed = 1.6;
    const loopWidth = inner.scrollWidth / 2 || 1;
    offset = (offset - speed) % loopWidth;
    const fontSize = parseFloat(getComputedStyle(scroller).fontSize) || 0;
    const baseY = (canvas.clientHeight * 0.5) - (fontSize * 0.5);
    chars.forEach((span, i) => {
      const wave = Math.sin((i * 0.32) + t) * 56;
      span.style.color = palette[(i + Math.floor(t * 12)) % palette.length];
      span.style.transform = `translate(${offset}px, ${wave + baseY}px)`;
    });
    t += 0.08;
    demoAnim.scroller = requestAnimationFrame(render);
  }

  demoAnim.scroller = requestAnimationFrame(render);
}
