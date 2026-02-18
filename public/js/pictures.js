import { safeUrl, safeId, escapeHtml } from './utils.js';
import { mobileWindowPos, bringToFront, winShow, winHide, registerWindow, guruMeditation } from './windows.js';
import { playWinOpen, playWinClose } from './sound.js';

let _picturesAbort = null;

export function loadPictures() {
  const body = document.getElementById('pictures-body');
  if (!body) return;
  if (_picturesAbort) { _picturesAbort.abort(); }
  _picturesAbort = new AbortController();
  const signal = _picturesAbort.signal;
  fetch('./paint/', { signal })
    .then(res => res.ok ? res.json() : [])
    .then(list => {
      body.innerHTML = '';
      if (list.length === 0) {
        body.innerHTML = '<div class="pic-empty">No paintings saved yet</div>';
        return;
      }
      list.forEach(item => {
        const a = document.createElement('a');
        a.className = 'pic-thumb';
        a.href = item.url;
        a.draggable = true;
        a.dataset.filename = item.filename;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          openPaintingWindow(item.filename, item.url);
        });
        a.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', item.filename);
          e.dataTransfer.effectAllowed = 'move';
          a.classList.add('dragging');
        });
        a.addEventListener('dragend', () => {
          a.classList.remove('dragging');
        });
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.filename;
        a.appendChild(img);
        // Extract date from filename: painting-{timestamp}.png
        const ts = parseInt(item.filename.replace('painting-', '').replace('.png', ''), 10);
        if (ts) {
          const d = new Date(ts);
          const label = document.createElement('span');
          label.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          a.appendChild(label);
        }
        body.appendChild(a);
      });
    })
    .catch(err => {
      if (err.name === 'AbortError') return;
      body.innerHTML = '<div class="pic-empty">Could not load paintings</div>';
    });
}

export const togglePicturesWindow = registerWindow('pictures-window', 'pictures-icon', 'pictures-close', 420, null, () => loadPictures());

export function openPaintingWindow(filename, url) {
  const viewerId = 'viewer-' + safeId(filename);
  const safeSrc = safeUrl(url);
  // Remove existing viewer for same file
  const existing = document.getElementById(viewerId);
  if (existing) { bringToFront(existing); return; }

  const win = document.createElement('div');
  win.className = 'window';
  win.id = viewerId;
  mobileWindowPos(win, 360, null);
  if (document.documentElement.clientWidth >= 600) {
    const off = Math.round(Math.random() * 40 - 20);
    win.style.left = (parseInt(win.style.left) + off) + 'px';
    win.style.top = (parseInt(win.style.top) + off) + 'px';
  }
  const title = document.createElement('div');
  title.className = 'window-title';
  const close = document.createElement('div');
  close.className = 'close-gadget';
  const titleText = document.createElement('span');
  titleText.className = 'title-text';
  titleText.textContent = filename;
  title.appendChild(close);
  title.appendChild(titleText);

  const body = document.createElement('div');
  body.className = 'window-body painting-viewer';
  const img = document.createElement('img');
  img.src = safeSrc;
  img.alt = filename;
  body.appendChild(img);

  win.appendChild(title);
  win.appendChild(body);

  close.addEventListener('click', (e) => {
    e.stopPropagation();
    playWinClose();
    winHide(win, () => win.remove());
  });

  document.body.appendChild(win);
  bringToFront(win);
  playWinOpen();
  winShow(win);
}

// Drag pictures to trashcan to delete
const trashEl = document.getElementById('trash-icon');
if (trashEl) {
  trashEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    trashEl.classList.add('drag-over');
  });
  trashEl.addEventListener('dragleave', () => {
    trashEl.classList.remove('drag-over');
  });
  trashEl.addEventListener('drop', (e) => {
    e.preventDefault();
    trashEl.classList.remove('drag-over');
    guruMeditation();
  });
}
