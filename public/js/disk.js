import { sizeWindowBody, bringToFront, registerWindow } from './windows.js';

export const diskSlices = [
  { value: 38, color: '#ffaa00' },
  { value: 22, color: '#66ccff' },
  { value: 16, color: '#ff6699' },
  { value: 12, color: '#66ff66' },
  { value: 7, color: '#ffcc33' },
  { value: 5, color: '#cc66ff' }
];

export const diskAnim = { running: false, start: 0, duration: 1100 };

export function sizeDiskCanvas() {
  const win = document.getElementById('disk-window');
  if (win?.style.display === 'none') return;
  const body = sizeWindowBody('disk-window', 'disk-body', 12, 160);
  if (!body) return;
  const canvas = document.getElementById('disk-canvas');
  if (!canvas) return;
  const rect = body.getBoundingClientRect();
  const w = Math.max(160, Math.floor(rect.width - 12));
  const h = Math.max(160, Math.floor(rect.height - 12));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export function drawPie(canvasId, t, slices, baseColor, showLabels) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#001244';
  ctx.fillRect(0, 0, w, h);

  // Base solid disk (fade out as slices expand)
  const baseAlpha = Math.max(0, 1 - t * 1.2);
  if (baseAlpha > 0) {
    ctx.globalAlpha = baseAlpha;
    ctx.fillStyle = baseColor || '#ffaa00';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const total = slices.reduce((s, a) => s + a.value, 0);
  let start = -Math.PI / 2;
  slices.forEach((s) => {
    const fullSweep = (s.value / total) * Math.PI * 2;
    const sweep = fullSweep * t;
    if (sweep <= 0.001) return;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + sweep);
    ctx.closePath();
    ctx.fill();
    if (showLabels && t > 0.9 && s.label && fullSweep > 0.25) {
      const mid = start + fullSweep / 2;
      const lr = r * 0.68;
      const lx = cx + Math.cos(mid) * lr;
      const ly = cy + Math.sin(mid) * lr;
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, lx, ly);
    }
    start += fullSweep;
  });

  // Center hub
  ctx.fillStyle = '#003366';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

export function animateDiskPie() {
  if (diskAnim.running) return;
  diskAnim.running = true;
  diskAnim.start = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - diskAnim.start) / diskAnim.duration);
    drawPie('disk-canvas', t, diskSlices, '#ffaa00', false);
    if (t < 1 && diskAnim.running) {
      requestAnimationFrame(step);
    } else {
      diskAnim.running = false;
    }
  };
  requestAnimationFrame(step);
}

export const toggleDiskWindow = registerWindow('disk-window', 'disk-icon', 'disk-close', 420, 320, () => { sizeDiskCanvas(); animateDiskPie(); });

export function showDiskWindow() {
  const win = document.getElementById('disk-window');
  if (!win) return;
  if (win.style.display === 'none') {
    toggleDiskWindow();
  } else {
    bringToFront(win);
  }
}
