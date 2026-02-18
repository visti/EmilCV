import { playWinOpen, playWinClose } from './sound.js';

// gsap is a CDN global

// --- Touch support ---
export function touchXY(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

// --- Z-index management ---
let topZ = 10;

export function bringToFront(win) {
  topZ++;
  win.style.zIndex = topZ;
}

// --- Window positioning ---
export function mobileWindowPos(win, desiredW, desiredH) {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  win.classList.add('is-absolute');
  if (vw < 600) {
    win.style.left = '4px';
    win.style.top = '32px';
    win.style.width = (vw - 8) + 'px';
    if (desiredH) win.style.height = Math.min(desiredH, vh - 40) + 'px';
  } else {
    win.style.left = Math.max(20, Math.round((vw - desiredW) / 2)) + 'px';
    win.style.top = Math.max(40, Math.round((vh - (desiredH || 300)) / 2)) + 'px';
    win.style.width = desiredW + 'px';
    if (desiredH) win.style.height = desiredH + 'px';
  }
}

// --- GSAP window animations ---
export function winShow(win) {
  gsap.killTweensOf(win);
  gsap.fromTo(win,
    { scale: 0.88, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.18, ease: 'back.out(1.5)', clearProps: 'scale,opacity' }
  );
}

export function winHide(win, onDone) {
  gsap.killTweensOf(win);
  gsap.to(win, { scale: 0.88, opacity: 0, duration: 0.12, ease: 'power2.in', onComplete: () => {
    win.style.display = 'none';
    gsap.set(win, { clearProps: 'scale,opacity' });
    if (onDone) onDone();
  }});
}

// --- Window open/close factory ---
export function registerWindow(winId, iconId, closeId, w, h, onOpen) {
  const toggle = () => {
    const win = document.getElementById(winId);
    if (!win) return;
    if (win.style.display === 'none') {
      win.style.display = '';
      if (!win.classList.contains('open')) {
        win.classList.add('open');
        if (win.dataset.prevHeight) {
          win.style.height = win.dataset.prevHeight;
          delete win.dataset.prevHeight;
        } else {
          win.style.height = '';
        }
      }
      if (!win.classList.contains('is-absolute')) mobileWindowPos(win, w, h);
      bringToFront(win);
      playWinOpen();
      winShow(win);
      if (onOpen) onOpen(win);
    } else {
      playWinClose();
      winHide(win);
    }
  };
  document.getElementById(iconId)?.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
  document.getElementById(closeId)?.addEventListener('click', (e) => {
    e.stopPropagation();
    const win = document.getElementById(winId);
    playWinClose();
    winHide(win);
  });
  return toggle;
}

// --- Guru Meditation ---
export function guruMeditation() {
  const guru = document.createElement('div');
  guru.className = 'guru-screen';
  guru.innerHTML =
    '<div class="guru-box">' +
      '<div>Software Failure.  Press left mouse button to continue.</div>' +
      '<div>Guru Meditation #00000004.0000AAC0</div>' +
    '</div>';
  document.body.appendChild(guru);
  gsap.fromTo(guru, { x: -10 }, { x: 10, duration: 0.05, repeat: 8, yoyo: true, ease: 'none', onComplete: () => gsap.set(guru, { x: 0 }) });
  guru.addEventListener('click', () => guru.remove());
}

// --- GSAP icon interactions ---
export function applyIconGsap(icon) {
  const box = icon.querySelector('.icon-box');
  if (!box) return;
  const base = icon.closest('#note-icons') ? 0.8 : 1;
  gsap.set(box, { scale: base });
  let hovered = false;
  icon.addEventListener('mouseenter', () => {
    hovered = true;
    gsap.to(box, { scale: base * 1.08, duration: 0.15, ease: 'power2.out' });
  });
  icon.addEventListener('mouseleave', () => {
    hovered = false;
    gsap.to(box, { scale: base, duration: 0.12, ease: 'power2.out' });
  });
  icon.addEventListener('mousedown', () => {
    gsap.to(box, { scale: base * 0.88, duration: 0.06, ease: 'power3.in' });
  });
  icon.addEventListener('mouseup', () => {
    gsap.to(box, { scale: hovered ? base * 1.08 : base, duration: 0.2, ease: 'back.out(2)' });
  });
}

// --- Rec-window collapse/expand ---
export function toggleRec(id) {
  const win = document.getElementById(id);
  if (!win) return;
  const title = win.querySelector('.window-title');
  const wasOpen = win.classList.contains('open');
  if (title && wasOpen) {
    // Capture height BEFORE removing .open (which hides .rec-body)
    const prev = win.style.height || win.getBoundingClientRect().height + 'px';
    win.dataset.prevHeight = prev;
    win.classList.remove('open');
    win.style.height = (title.offsetHeight + 4) + 'px';
  } else if (title && !wasOpen) {
    win.classList.add('open');
    if (win.dataset.prevHeight) {
      win.style.height = win.dataset.prevHeight;
      delete win.dataset.prevHeight;
    } else {
      win.style.height = '';
    }
  } else {
    win.classList.toggle('open');
  }
  sizeWindowsToContent();
  sizeMainWindowBody();
}

// --- Window sizing utilities ---
export function sizeWindowBody(winId, bodyId, padding, minH) {
  const win = document.getElementById(winId);
  if (!win) return null;
  const body = bodyId ? document.getElementById(bodyId) : win.querySelector('.window-body');
  if (!body) return null;
  const title = win.querySelector('.window-title');
  const inner = win.clientHeight - (title ? title.offsetHeight : 0) - padding;
  body.style.height = Math.max(inner, minH) + 'px';
  return body;
}

export function observeResize(el, fn) {
  if (el && 'ResizeObserver' in window) new ResizeObserver(fn).observe(el);
}

export function sizeMainWindowBody() {
  sizeWindowBody('main-window', null, 4, 140);
}

export function sizeWindowsToContent() {
  const wins = document.querySelectorAll('.window');
  const viewportMax = document.documentElement.clientWidth - 8;
  wins.forEach((win) => {
    if (win.id === 'demo-window' || win.id === 'dpaint-window' || win.id === 'mail-window' || win.id === 'disk-window' || win.id === 'filemgr-window') return;
    if (win.style.width) return; // already sized, don't ratchet
    const title = win.querySelector('.window-title');
    const body = win.querySelector('.window-body');
    let w = 0;
    if (title) w = Math.max(w, title.scrollWidth);
    if (body) w = Math.max(w, body.scrollWidth);
    w += 8;
    const target = Math.min(w, viewportMax);
    win.style.width = target + 'px';
  });
}

export function applyInitialLayout() {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  if (vw < 900 || vh < 700) return;

  const starts = {
    'main-window': { x: 40, y: 120, w: 560, h: Math.round(vh * 0.625) },
    'demo-window': { x: Math.max(40, vw - 520), y: 120, w: 480, h: 260 },
    'disk-window': { x: Math.max(40, vw - 520), y: 420, w: 420, h: 300 },
    'filemgr-window': { x: Math.max(40, vw - 640), y: 140, w: 600, h: 340 },
  };

  Object.entries(starts).forEach(([id, pos]) => {
    const win = document.getElementById(id);
    if (!win) return;
    win.classList.add('is-absolute');
    win.style.left = Math.min(pos.x, vw - 260) + 'px';
    win.style.top = Math.min(pos.y, vh - 140) + 'px';
    win.style.width = Math.min(pos.w, vw - 16) + 'px';
    if (pos.h) {
      win.style.height = Math.min(pos.h, vh - 40) + 'px';
    }
  });
}

export function applyNoteLayout(notes) {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  if (vw < 900 || vh < 700) return;

  notes.forEach((note, i) => {
    if (!note.open) return;
    const win = document.getElementById(note.id);
    if (!win) return;
    win.classList.add('is-absolute');
    win.style.left = Math.min(760, vw - 260) + 'px';
    win.style.top = Math.min(330 + i * 210, vh - 140) + 'px';
    win.style.width = Math.min(360, vw - 16) + 'px';
  });
}

// --- Draggable windows ---
let dragState = null;

document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.close-gadget')) return;
  const titleBar = e.target.closest('.window-title');
  if (!titleBar) {
    // Click on window body still brings to front
    const win = e.target.closest('.window');
    if (win) bringToFront(win);
    return;
  }
  const win = titleBar.closest('.window');
  if (!win) return;

  bringToFront(win);
  const rect = win.getBoundingClientRect();

  dragState = {
    win,
    titleBar,
    startX: e.clientX,
    startY: e.clientY,
    origLeft: rect.left,
    origTop: rect.top + window.scrollY,
    origWidth: rect.width,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    moved: false
  };
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    dragState.moved = true;
    const w = dragState.win;
    if (!w.classList.contains('is-absolute')) {
      w.classList.add('is-absolute');
      w.style.left = dragState.origLeft + 'px';
      w.style.top = dragState.origTop + 'px';
      w.style.width = dragState.origWidth + 'px';
    }
    w.classList.add('is-dragging');
  }

  if (dragState.moved) {
    dragState.win.style.left = (e.clientX - dragState.offsetX) + 'px';
    dragState.win.style.top = (e.clientY - dragState.offsetY + window.scrollY) + 'px';
  }
});

document.addEventListener('mouseup', (e) => {
  if (!dragState) return;
  dragState.win.classList.remove('is-dragging');

  if (!dragState.moved) {
    // Was a click, not a drag — toggle collapse
    const toggle = dragState.titleBar.closest('.rec-toggle');
    if (toggle) {
      const id = toggle.dataset.toggle;
      if (id) toggleRec(id);
    }
  }
  dragState = null;
});

// --- Window dragging: touch events ---
document.addEventListener('touchstart', (e) => {
  if (e.target.closest('.close-gadget')) return;
  const titleBar = e.target.closest('.window-title');
  if (!titleBar) {
    const win = e.target.closest('.window');
    if (win) bringToFront(win);
    return;
  }
  const win = titleBar.closest('.window');
  if (!win) return;
  bringToFront(win);
  const pt = touchXY(e);
  const rect = win.getBoundingClientRect();
  dragState = {
    win,
    titleBar,
    startX: pt.clientX,
    startY: pt.clientY,
    origLeft: rect.left,
    origTop: rect.top + window.scrollY,
    origWidth: rect.width,
    offsetX: pt.clientX - rect.left,
    offsetY: pt.clientY - rect.top,
    moved: false
  };
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!dragState) return;
  e.preventDefault();
  const pt = touchXY(e);
  const dx = pt.clientX - dragState.startX;
  const dy = pt.clientY - dragState.startY;
  if (!dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    dragState.moved = true;
    const w = dragState.win;
    if (!w.classList.contains('is-absolute')) {
      w.classList.add('is-absolute');
      w.style.left = dragState.origLeft + 'px';
      w.style.top = dragState.origTop + 'px';
      w.style.width = dragState.origWidth + 'px';
    }
    w.classList.add('is-dragging');
  }
  if (dragState.moved) {
    dragState.win.style.left = (pt.clientX - dragState.offsetX) + 'px';
    dragState.win.style.top = (pt.clientY - dragState.offsetY + window.scrollY) + 'px';
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (!dragState) return;
  dragState.win.classList.remove('is-dragging');
  if (!dragState.moved) {
    const toggle = dragState.titleBar.closest('.rec-toggle');
    if (toggle) {
      const id = toggle.dataset.toggle;
      if (id) toggleRec(id);
    }
  }
  dragState = null;
});
