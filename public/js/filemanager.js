import { sizeWindowBody, registerWindow } from './windows.js';

export const defragSets = {
  disk: {
    title: 'Disk (DH0:)',
    base: '#ffaa00',
    slices: [
      { value: 38, color: '#ffaa00' },
      { value: 22, color: '#66ccff' },
      { value: 16, color: '#ff6699' },
      { value: 12, color: '#66ff66' },
      { value: 7, color: '#ffcc33' },
      { value: 5, color: '#cc66ff' }
    ]
  },
  experience: {
    title: 'Experience',
    base: '#ffcc33',
    slices: [
      { value: 40, color: '#ffaa00', label: 'Gramex' },
      { value: 25, color: '#ff9933', label: 'Sandrew' },
      { value: 20, color: '#ff6633', label: 'Big Beard' },
      { value: 10, color: '#ff3366', label: 'Rotation' },
      { value: 5, color: '#ffdd44', label: 'ORA' }
    ]
  },
  education: {
    title: 'Education',
    base: '#66ccff',
    slices: [
      { value: 50, color: '#66ccff', label: 'BSc' },
      { value: 25, color: '#33aaff', label: 'Librarian' },
      { value: 25, color: '#99ddff', label: 'Gymnasium' }
    ]
  },
  skills: {
    title: 'Skills',
    base: '#66ff66',
    slices: [
      { value: 30, color: '#66ff66', label: 'Data' },
      { value: 25, color: '#aaff66', label: 'Tools' },
      { value: 20, color: '#33cc66', label: 'Systems' },
      { value: 15, color: '#88ff88', label: 'Creative' },
      { value: 10, color: '#44aa44', label: 'Other' }
    ]
  },
  languages: {
    title: 'Languages',
    base: '#cc66ff',
    slices: [
      { value: 55, color: '#cc66ff', label: 'Danish' },
      { value: 45, color: '#9966ff', label: 'English' }
    ]
  },
  links: {
    title: 'Links',
    base: '#66ffff',
    slices: [
      { value: 60, color: '#66ffff', label: 'GitHub' },
      { value: 40, color: '#33ccff', label: 'SoundCloud' }
    ]
  },
  recommendations: {
    title: 'Recommendations',
    base: '#ff6699',
    slices: [
      { value: 40, color: '#ff6699', label: 'Gramex' },
      { value: 30, color: '#ff99bb', label: 'Sandrew' },
      { value: 30, color: '#ff3366', label: 'ORA' }
    ]
  }
};

export const fileMgrItems = [
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'languages', label: 'Languages' },
  { id: 'recommendations', label: 'Recommendations' }
];

export function allocateBlocks(values, totalBlocks) {
  const sum = values.reduce((a, b) => a + b, 0) || 1;
  const raw = values.map(v => (v / sum) * totalBlocks);
  const blocks = raw.map(v => Math.max(1, Math.floor(v)));
  let used = blocks.reduce((a, b) => a + b, 0);
  while (used < totalBlocks) {
    let best = 0;
    let bestFrac = -1;
    raw.forEach((v, i) => {
      const frac = v - Math.floor(v);
      if (frac > bestFrac) { bestFrac = frac; best = i; }
    });
    blocks[best] += 1;
    used += 1;
  }
  while (used > totalBlocks) {
    let idx = blocks.findIndex(b => b > 1);
    if (idx === -1) break;
    blocks[idx] -= 1;
    used -= 1;
  }
  return blocks;
}

export function drawDefragGrid(canvasId, t, slices) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#001244';
  ctx.fillRect(0, 0, w, h);

  const labelW = 80;
  const gridW = Math.max(120, w - labelW - 12);
  const cell = Math.max(8, Math.min(12, Math.floor(gridW / 24)));
  const cols = Math.max(16, Math.floor(gridW / cell));
  const gap = 2;
  const rows = slices.length;
  const totalBlocks = cols;
  const blocks = allocateBlocks(slices.map(s => s.value), totalBlocks);

  const rowH = cell + 6;
  const startY = Math.max(8, Math.floor((h - rows * rowH) / 2));

  ctx.font = '10px Silkscreen, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  slices.forEach((s, row) => {
    const y = startY + row * rowH;
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(s.label || '', 6, y + cell / 2);

    const rowProgress = Math.min(1, Math.max(0, (t - row * 0.08) / 0.7));
    const fillCount = Math.floor(blocks[row] * rowProgress);
    for (let i = 0; i < cols; i++) {
      const x = labelW + i * cell;
      ctx.fillStyle = '#003366';
      ctx.fillRect(x, y, cell - gap, cell - gap);
      if (i < fillCount) {
        ctx.fillStyle = s.color;
        ctx.fillRect(x, y, cell - gap, cell - gap);
      }
    }
  });
}

export function drawDefrag(id) {
  const set = defragSets[id] || defragSets.experience;
  const title = document.getElementById('filemgr-title');
  if (title) title.textContent = `Defrag View — ${set.title}`;
  let t = 0;
  const start = performance.now();
  const duration = 900;
  const step = (now) => {
    t = Math.min(1, (now - start) / duration);
    drawDefragGrid('filemgr-canvas', t, set.slices);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function sizeFileMgrCanvas() {
  const win = document.getElementById('filemgr-window');
  if (win?.style.display === 'none') return;
  const body = sizeWindowBody('filemgr-window', 'filemgr-body', 12, 200);
  if (!body) return;
  const canvas = document.getElementById('filemgr-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(200, Math.floor(rect.width));
  const h = Math.max(180, Math.floor(rect.height));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export function renderFileMgrList(activeId) {
  const list = document.getElementById('filemgr-list');
  if (!list) return;
  list.innerHTML = '';
  fileMgrItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'fm-item' + (item.id === activeId ? ' active' : '');
    row.dataset.id = item.id;
    const icon = document.createElement('div');
    icon.className = 'fm-folder';
    const label = document.createElement('span');
    label.textContent = item.label;
    row.appendChild(icon);
    row.appendChild(label);
    row.addEventListener('click', () => {
      renderFileMgrList(item.id);
      drawDefrag(item.id);
    });
    list.appendChild(row);
  });
}

export const toggleFileMgrWindow = registerWindow('filemgr-window', 'filemgr-icon', 'filemgr-close', 600, 360, () => {
  sizeFileMgrCanvas(); renderFileMgrList('disk'); drawDefrag('disk');
});
