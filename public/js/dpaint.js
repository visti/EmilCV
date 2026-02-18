import { sizeWindowBody, bringToFront, touchXY, registerWindow } from './windows.js';

export const dpaint = {
  currentTool: 'pencil',
  brushSize: 1,
  filled: false,
  fgColor: '#000000',
  bgColor: '#a0a0a0',
  isDrawing: false,
  startX: 0, startY: 0,
  lastX: 0, lastY: 0,
  canvas: null, ctx: null,
  overlay: null, octx: null,
  canvasW: 320, canvasH: 256,
  touchUseBg: false,
  drawingIsRight: false,
  palette: [
    '#000000','#a0a0a0','#ec0000','#a80000',
    '#dc8800','#fcec00','#88fc00','#008800',
    '#00b864','#00dcdc','#00a8fc','#0074cc',
    '#0000fc','#7400fc','#cc00ec','#cc0088',
    '#642000','#ec5420','#a85420','#fccca8',
    '#303030','#444444','#545454','#646464',
    '#747474','#888888','#989898','#a8a8a8',
    '#cccccc','#dcdcdc','#ececec','#fcfcfc'
  ]
};

export function sizeDPaintCanvas() {
  const win = document.getElementById('dpaint-window');
  if (win?.style.display === 'none') return;
  sizeWindowBody('dpaint-window', 'dpaint-body', 4, 200);
}

export function initDPaint() {
  const canvas = document.getElementById('dpaint-canvas');
  const overlay = document.getElementById('dpaint-overlay');
  if (!canvas || !overlay) return;
  dpaint.canvas = canvas;
  dpaint.ctx = canvas.getContext('2d');
  dpaint.overlay = overlay;
  dpaint.octx = overlay.getContext('2d');
  canvas.width = dpaint.canvasW;
  canvas.height = dpaint.canvasH;
  overlay.width = dpaint.canvasW;
  overlay.height = dpaint.canvasH;
  dpaint.ctx.fillStyle = dpaint.bgColor;
  dpaint.ctx.fillRect(0, 0, dpaint.canvasW, dpaint.canvasH);

  buildDPaintPalette();
  attachDPaintCanvasEvents();
  attachDPaintToolbarEvents();
}

function dpaintCoords(e) {
  const rect = dpaint.canvas.getBoundingClientRect();
  const scaleX = dpaint.canvasW / rect.width;
  const scaleY = dpaint.canvasH / rect.height;
  return {
    x: Math.floor((e.clientX - rect.left) * scaleX),
    y: Math.floor((e.clientY - rect.top) * scaleY)
  };
}

function dpaintDrawPixel(x, y, color) {
  const ctx = dpaint.ctx;
  ctx.fillStyle = color;
  const s = dpaint.brushSize;
  const off = Math.floor(s / 2);
  ctx.fillRect(x - off, y - off, s, s);
}

function dpaintBresenham(x0, y0, x1, y1, color) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    dpaintDrawPixel(x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function dpaintDrawShape(tgt, x0, y0, x1, y1, color) {
  tgt.strokeStyle = color;
  tgt.fillStyle = color;
  tgt.lineWidth = dpaint.brushSize;
  if (dpaint.currentTool === 'line') {
    tgt.beginPath();
    tgt.moveTo(x0 + 0.5, y0 + 0.5);
    tgt.lineTo(x1 + 0.5, y1 + 0.5);
    tgt.stroke();
  } else if (dpaint.currentTool === 'rect') {
    const rx = Math.min(x0, x1), ry = Math.min(y0, y1);
    const rw = Math.abs(x1 - x0), rh = Math.abs(y1 - y0);
    if (dpaint.filled) {
      tgt.fillRect(rx, ry, rw, rh);
    } else {
      tgt.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
    }
  } else if (dpaint.currentTool === 'circle') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    if (rx < 1 && ry < 1) return;
    tgt.beginPath();
    tgt.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    if (dpaint.filled) tgt.fill();
    else tgt.stroke();
  }
}

function hexToRGBA(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
    a: 255
  };
}

function dpaintFloodFill(sx, sy, fillColor) {
  const ctx = dpaint.ctx;
  const w = dpaint.canvasW, h = dpaint.canvasH;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const idx = (sy * w + sx) * 4;
  const tR = data[idx], tG = data[idx + 1], tB = data[idx + 2], tA = data[idx + 3];
  const fill = hexToRGBA(fillColor);
  if (tR === fill.r && tG === fill.g && tB === fill.b && tA === fill.a) return;
  const stack = [sx, sy];
  const visited = new Uint8Array(w * h);
  while (stack.length > 0) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const pos = y * w + x;
    if (visited[pos]) continue;
    const i = pos * 4;
    if (data[i] !== tR || data[i + 1] !== tG || data[i + 2] !== tB || data[i + 3] !== tA) continue;
    visited[pos] = 1;
    data[i] = fill.r; data[i + 1] = fill.g; data[i + 2] = fill.b; data[i + 3] = fill.a;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  ctx.putImageData(imageData, 0, 0);
}

function dpaintPickColor(x, y, isRight) {
  const pixel = dpaint.ctx.getImageData(x, y, 1, 1).data;
  const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  if (isRight) {
    dpaint.bgColor = hex;
    document.getElementById('dp-bg-swatch').style.background = hex;
  } else {
    dpaint.fgColor = hex;
    document.getElementById('dp-fg-swatch').style.background = hex;
  }
  updateDPaintPaletteSelection();
}

function attachDPaintCanvasEvents() {
  const canvas = dpaint.canvas;
  const win = canvas.closest('.window');

  canvas.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    bringToFront(win);
    const pos = dpaintCoords(e);
    const isRight = e.button === 2;
    const color = isRight ? dpaint.bgColor : dpaint.fgColor;
    dpaint.isDrawing = true;
    dpaint.startX = pos.x; dpaint.startY = pos.y;
    dpaint.lastX = pos.x; dpaint.lastY = pos.y;

    if (dpaint.currentTool === 'pencil') {
      dpaintDrawPixel(pos.x, pos.y, color);
    } else if (dpaint.currentTool === 'eraser') {
      dpaintDrawPixel(pos.x, pos.y, dpaint.bgColor);
    } else if (dpaint.currentTool === 'eyedropper') {
      dpaintPickColor(pos.x, pos.y, isRight);
      dpaint.isDrawing = false;
    } else if (dpaint.currentTool === 'fill') {
      dpaintFloodFill(pos.x, pos.y, color);
      dpaint.isDrawing = false;
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('mousemove', (e) => {
    if (!dpaint.isDrawing) return;
    const pos = dpaintCoords(e);
    const color = e.buttons === 2 ? dpaint.bgColor : dpaint.fgColor;
    if (dpaint.currentTool === 'pencil') {
      dpaintBresenham(dpaint.lastX, dpaint.lastY, pos.x, pos.y, color);
      dpaint.lastX = pos.x; dpaint.lastY = pos.y;
    } else if (dpaint.currentTool === 'eraser') {
      dpaintBresenham(dpaint.lastX, dpaint.lastY, pos.x, pos.y, dpaint.bgColor);
      dpaint.lastX = pos.x; dpaint.lastY = pos.y;
    } else if (dpaint.currentTool === 'line' || dpaint.currentTool === 'rect' || dpaint.currentTool === 'circle') {
      dpaint.octx.clearRect(0, 0, dpaint.canvasW, dpaint.canvasH);
      dpaintDrawShape(dpaint.octx, dpaint.startX, dpaint.startY, pos.x, pos.y, color);
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (!dpaint.isDrawing) return;
    const pos = dpaintCoords(e);
    const color = e.button === 2 ? dpaint.bgColor : dpaint.fgColor;
    if (dpaint.currentTool === 'line' || dpaint.currentTool === 'rect' || dpaint.currentTool === 'circle') {
      dpaintDrawShape(dpaint.ctx, dpaint.startX, dpaint.startY, pos.x, pos.y, color);
    }
    dpaint.octx.clearRect(0, 0, dpaint.canvasW, dpaint.canvasH);
    dpaint.isDrawing = false;
  });

  // --- DPaint canvas: touch events ---
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(win);
    const pt = touchXY(e);
    const pos = dpaintCoords(pt);
    const isRight = dpaint.touchUseBg;
    dpaint.drawingIsRight = isRight;
    const color = isRight ? dpaint.bgColor : dpaint.fgColor;
    dpaint.isDrawing = true;
    dpaint.startX = pos.x; dpaint.startY = pos.y;
    dpaint.lastX = pos.x; dpaint.lastY = pos.y;
    if (dpaint.currentTool === 'pencil') {
      dpaintDrawPixel(pos.x, pos.y, color);
    } else if (dpaint.currentTool === 'eraser') {
      dpaintDrawPixel(pos.x, pos.y, dpaint.bgColor);
    } else if (dpaint.currentTool === 'eyedropper') {
      dpaintPickColor(pos.x, pos.y, isRight);
      dpaint.isDrawing = false;
    } else if (dpaint.currentTool === 'fill') {
      dpaintFloodFill(pos.x, pos.y, color);
      dpaint.isDrawing = false;
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!dpaint.isDrawing) return;
    const pt = touchXY(e);
    const pos = dpaintCoords(pt);
    const color = dpaint.drawingIsRight ? dpaint.bgColor : dpaint.fgColor;
    if (dpaint.currentTool === 'pencil') {
      dpaintBresenham(dpaint.lastX, dpaint.lastY, pos.x, pos.y, color);
      dpaint.lastX = pos.x; dpaint.lastY = pos.y;
    } else if (dpaint.currentTool === 'eraser') {
      dpaintBresenham(dpaint.lastX, dpaint.lastY, pos.x, pos.y, dpaint.bgColor);
      dpaint.lastX = pos.x; dpaint.lastY = pos.y;
    } else if (dpaint.currentTool === 'line' || dpaint.currentTool === 'rect' || dpaint.currentTool === 'circle') {
      dpaint.octx.clearRect(0, 0, dpaint.canvasW, dpaint.canvasH);
      dpaintDrawShape(dpaint.octx, dpaint.startX, dpaint.startY, pos.x, pos.y, color);
    }
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!dpaint.isDrawing) return;
    const pt = touchXY(e);
    const pos = dpaintCoords(pt);
    const color = dpaint.drawingIsRight ? dpaint.bgColor : dpaint.fgColor;
    if (dpaint.currentTool === 'line' || dpaint.currentTool === 'rect' || dpaint.currentTool === 'circle') {
      dpaintDrawShape(dpaint.ctx, dpaint.startX, dpaint.startY, pos.x, pos.y, color);
    }
    dpaint.octx.clearRect(0, 0, dpaint.canvasW, dpaint.canvasH);
    dpaint.isDrawing = false;
  });
}

function buildDPaintPalette() {
  const container = document.getElementById('dp-palette');
  if (!container) return;
  dpaint.palette.forEach((color) => {
    const cell = document.createElement('div');
    cell.className = 'dp-color';
    cell.style.background = color;
    cell.dataset.color = color;
    cell.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 2) {
        dpaint.bgColor = color;
        document.getElementById('dp-bg-swatch').style.background = color;
      } else {
        dpaint.fgColor = color;
        document.getElementById('dp-fg-swatch').style.background = color;
      }
      updateDPaintPaletteSelection();
    });
    cell.addEventListener('contextmenu', (e) => e.preventDefault());
    cell.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dpaint.touchUseBg) {
        dpaint.bgColor = color;
        document.getElementById('dp-bg-swatch').style.background = color;
      } else {
        dpaint.fgColor = color;
        document.getElementById('dp-fg-swatch').style.background = color;
      }
      updateDPaintPaletteSelection();
    }, { passive: false });
    container.appendChild(cell);
  });
  updateDPaintPaletteSelection();
}

function updateDPaintPaletteSelection() {
  document.querySelectorAll('.dp-color').forEach(cell => {
    cell.classList.toggle('fg-selected', cell.dataset.color === dpaint.fgColor);
    cell.classList.toggle('bg-selected', cell.dataset.color === dpaint.bgColor);
  });
}

function attachDPaintToolbarEvents() {
  document.querySelectorAll('#dpaint-toolbar .dp-tool[data-tool]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('#dpaint-toolbar .dp-tool[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dpaint.currentTool = btn.dataset.tool;
    });
  });
  document.querySelectorAll('#dpaint-toolbar .dp-size').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dp-size').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dpaint.brushSize = parseInt(btn.dataset.size, 10);
    });
  });
  const filledBtn = document.getElementById('dp-filled-toggle');
  if (filledBtn) {
    filledBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dpaint.filled = !dpaint.filled;
      filledBtn.classList.toggle('active', dpaint.filled);
    });
  }
  const clearBtn = document.getElementById('dp-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dpaint.ctx.fillStyle = dpaint.bgColor;
      dpaint.ctx.fillRect(0, 0, dpaint.canvasW, dpaint.canvasH);
    });
  }
  const colorToggle = document.getElementById('dp-touch-color-toggle');
  if (colorToggle) {
    colorToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dpaint.touchUseBg = !dpaint.touchUseBg;
      colorToggle.textContent = dpaint.touchUseBg ? 'BG' : 'FG';
    });
  }
}

export function dpaintSave() {
  const btn = document.getElementById('dp-save');
  if (!btn || !dpaint.canvas) return;
  btn.classList.remove('saved', 'error');
  btn.classList.add('saving');
  btn.innerHTML = '...';

  dpaint.canvas.toBlob((blob) => {
    if (!blob) {
      btn.classList.remove('saving');
      btn.classList.add('error');
      btn.innerHTML = '!';
      setTimeout(() => resetSaveBtn(), 2000);
      return;
    }
    fetch('./paint/', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: blob
    })
    .then(res => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then(() => {
      btn.classList.remove('saving');
      btn.classList.add('saved');
      btn.innerHTML = '<svg viewBox="0 0 18 18"><path d="M4 9 L7 13 L14 5" stroke="#fff" stroke-width="2.5" fill="none"/></svg>';
      setTimeout(() => resetSaveBtn(), 2000);
    })
    .catch(() => {
      btn.classList.remove('saving');
      btn.classList.add('error');
      btn.innerHTML = '!';
      setTimeout(() => resetSaveBtn(), 2000);
    });
  }, 'image/png');
}

export function resetSaveBtn() {
  const btn = document.getElementById('dp-save');
  if (!btn) return;
  btn.classList.remove('saving', 'saved', 'error');
  btn.innerHTML = '<svg viewBox="0 0 18 18"><path d="M3 1h10l3 3v11a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2z" fill="none" stroke="#fff" stroke-width="1.5"/><rect x="5" y="1" width="7" height="5" rx="0.5" fill="#fff" opacity="0.7"/><rect x="5" y="10" width="8" height="6" rx="1" fill="#fff" opacity="0.5"/></svg>';
}

export const toggleDPaintWindow = registerWindow('dpaint-window', 'dpaint-icon', 'dpaint-close', 560, 480, () => sizeDPaintCanvas());

// Save button
document.getElementById('dp-save')?.addEventListener('click', (e) => {
  e.stopPropagation();
  dpaintSave();
});

// Initialize
initDPaint();
