import { safeUrl, safeId, escapeHtml } from './utils.js';
import { mobileWindowPos, bringToFront, winShow, winHide, registerWindow } from './windows.js';
import { playWinOpen, playWinClose } from './sound.js';

let _picoAbort = null;
let _picoListCache = null;

export function loadPico8() {
  const body = document.getElementById('pico8-body');
  if (!body) return;
  if (_picoListCache) renderPico8(body, _picoListCache);

  if (_picoAbort) _picoAbort.abort();
  _picoAbort = new AbortController();

  fetch('./pico8/manifest.json', { signal: _picoAbort.signal })
    .then((res) => (res.ok ? res.json() : []))
    .then((list) => {
      if (!Array.isArray(list)) list = [];
      _picoListCache = list;
      renderPico8(body, list);
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      body.innerHTML = '<div class="pic-empty">Could not load PICO-8 carts</div>';
    });
}

function renderPico8(body, list) {
  body.innerHTML = '';
  if (!Array.isArray(list) || list.length === 0) {
    body.innerHTML = '<div class="pic-empty">No PICO-8 carts yet</div>';
    return;
  }

  list.forEach((cart) => {
    const a = document.createElement('a');
    a.className = 'pic-thumb pico-thumb';
    a.href = '#';
    a.dataset.cartId = cart.id || cart.title || 'cart';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openPico8Window(cart);
    });

    const thumb = safeUrl(cart.thumb_url || '');
    if (thumb !== '#') {
      const img = document.createElement('img');
      img.src = thumb;
      img.alt = cart.title || 'PICO-8 Cart';
      a.appendChild(img);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'pico-thumb-fallback';
      fallback.textContent = 'PICO-8';
      a.appendChild(fallback);
    }

    const title = document.createElement('span');
    title.textContent = cart.title || 'Untitled Cart';
    a.appendChild(title);

    body.appendChild(a);
  });
}

export const togglePico8Window = registerWindow(
  'pico8-window',
  'pico8-icon',
  'pico8-close',
  520,
  null,
  () => loadPico8()
);

export function openPico8Window(cart) {
  const uid = cart.id || cart.title || cart.embed_url || 'cart';
  const viewerId = 'pico8-viewer-' + safeId(uid);
  const existing = document.getElementById(viewerId);
  if (existing) {
    bringToFront(existing);
    return;
  }

  const embedUrl = safeUrl(cart.embed_url || '');
  if (embedUrl === '#') return;

  const win = document.createElement('div');
  win.className = 'window';
  win.id = viewerId;
  mobileWindowPos(win, 680, 640);

  const title = document.createElement('div');
  title.className = 'window-title';

  const close = document.createElement('div');
  close.className = 'close-gadget';

  const titleText = document.createElement('span');
  titleText.className = 'title-text';
  titleText.textContent = cart.title || 'PICO-8';

  title.appendChild(close);
  title.appendChild(titleText);

  const body = document.createElement('div');
  body.className = 'window-body pico8-viewer';

  const frameWrap = document.createElement('div');
  frameWrap.className = 'pico8-frame-wrap';
  const frame = document.createElement('iframe');
  frame.className = 'pico8-frame';
  frame.src = embedUrl;
  frame.allowFullscreen = true;
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';

  const meta = document.createElement('div');
  meta.className = 'pico8-meta';
  const safeTitle = escapeHtml(cart.title || 'Untitled Cart');
  const safeDescription = escapeHtml(cart.description || 'No description added yet.');
  meta.innerHTML =
    `<div class="pico8-meta-title">${safeTitle}</div>` +
    `<div class="pico8-meta-desc">${safeDescription}</div>`;

  frameWrap.appendChild(frame);
  body.appendChild(frameWrap);
  body.appendChild(meta);

  win.appendChild(title);
  win.appendChild(body);

  close.addEventListener('click', (e) => {
    e.stopPropagation();
    frame.src = 'about:blank';
    playWinClose();
    if (win._picoResizeObserver) win._picoResizeObserver.disconnect();
    winHide(win, () => win.remove());
  });

  document.body.appendChild(win);
  sizePico8ViewerBody(win, body);
  attachPico8Resize(win, body);
  bringToFront(win);
  playWinOpen();
  winShow(win);
}

function sizePico8ViewerBody(win, bodyEl) {
  const title = win.querySelector('.window-title');
  const inner = win.clientHeight - (title ? title.offsetHeight : 0) - 8;
  bodyEl.style.height = Math.max(inner, 180) + 'px';
}

function attachPico8Resize(win, bodyEl) {
  if (!('ResizeObserver' in window)) return;
  let raf = 0;
  const ro = new ResizeObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      sizePico8ViewerBody(win, bodyEl);
    });
  });
  ro.observe(win);
  win._picoResizeObserver = ro;
}
