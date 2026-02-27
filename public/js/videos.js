import { safeUrl, safeId, escapeHtml } from './utils.js';
import { mobileWindowPos, bringToFront, winShow, winHide, registerWindow } from './windows.js';
import { playWinOpen, playWinClose } from './sound.js';

let _videosAbort = null;

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function loadVideos() {
  const body = document.getElementById('videos-body');
  if (!body) return;

  if (_videosAbort) _videosAbort.abort();
  _videosAbort = new AbortController();

  fetch('./videos/manifest.json', { signal: _videosAbort.signal })
    .then((res) => (res.ok ? res.json() : []))
    .then((list) => {
      body.innerHTML = '';
      if (!Array.isArray(list) || list.length === 0) {
        body.innerHTML = '<div class="pic-empty">No videos yet</div>';
        return;
      }

      list.forEach((item) => {
        const thumb = safeUrl(item.thumb_url || '');
        const itemId = item.id || item.video_url || item.title || 'video';

        const a = document.createElement('a');
        a.className = 'pic-thumb';
        a.href = '#';
        a.dataset.videoId = itemId;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          openVideoWindow(item);
        });

        const img = document.createElement('img');
        img.src = thumb;
        img.alt = item.title || 'Video';

        const name = document.createElement('span');
        name.textContent = item.title || 'Untitled';

        const dur = formatDuration(item.duration);
        if (dur) {
          const meta = document.createElement('span');
          meta.className = 'dim-text';
          meta.textContent = dur;
          a.appendChild(meta);
        }

        a.prepend(name);
        a.prepend(img);
        body.appendChild(a);
      });
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      body.innerHTML = '<div class="pic-empty">Could not load videos</div>';
    });
}

export const toggleVideosWindow = registerWindow(
  'videos-window',
  'videos-icon',
  'videos-close',
  520,
  null,
  () => loadVideos()
);

export function openVideoWindow(item) {
  const uid = item.id || item.video_url || item.title || 'video';
  const viewerId = 'video-viewer-' + safeId(uid);
  const existing = document.getElementById(viewerId);
  if (existing) {
    bringToFront(existing);
    return;
  }

  const videoSrc = safeUrl(item.video_url || '');
  if (videoSrc === '#') return;

  const win = document.createElement('div');
  win.className = 'window';
  win.id = viewerId;
  mobileWindowPos(win, 560, 420);

  const title = document.createElement('div');
  title.className = 'window-title';

  const close = document.createElement('div');
  close.className = 'close-gadget';

  const titleText = document.createElement('span');
  titleText.className = 'title-text';
  titleText.textContent = item.title || 'Video';

  title.appendChild(close);
  title.appendChild(titleText);

  const body = document.createElement('div');
  body.className = 'window-body video-viewer';

  const video = document.createElement('video');
  video.className = 'video-player';
  video.controls = true;
  video.preload = 'metadata';
  video.src = videoSrc;

  const meta = document.createElement('div');
  meta.className = 'video-meta';
  const safeTitle = escapeHtml(item.title || 'Untitled');
  const safeDescription = escapeHtml(item.description || 'No description added yet.');
  meta.innerHTML =
    `<div class="video-meta-title">${safeTitle}</div>` +
    `<div class="video-meta-desc">${safeDescription}</div>`;

  body.appendChild(video);
  body.appendChild(meta);

  win.appendChild(title);
  win.appendChild(body);

  close.addEventListener('click', (e) => {
    e.stopPropagation();
    video.pause();
    playWinClose();
    if (win._videosResizeObserver) win._videosResizeObserver.disconnect();
    winHide(win, () => win.remove());
  });

  document.body.appendChild(win);
  fitVideoWindowToContent(win, title, video, meta);
  attachVideoWindowResize(win, title, video, meta);
  video.addEventListener('loadedmetadata', () => {
    fitVideoWindowToContent(win, title, video, meta);
  }, { once: true });
  bringToFront(win);
  playWinOpen();
  winShow(win);
}

function fitVideoWindowToContent(win, titleBar, video, meta) {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const margin = 8;
  const maxWindowW = Math.max(280, vw - margin * 2);
  const maxWindowH = Math.max(220, vh - margin * 2);

  const naturalW = video.videoWidth || 560;
  const naturalH = video.videoHeight || 315;
  const body = win.querySelector('.window-body');
  if (!body) return;
  const bodyStyle = getComputedStyle(body);
  const padX = (parseFloat(bodyStyle.paddingLeft) || 0) + (parseFloat(bodyStyle.paddingRight) || 0);
  const padY = (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0);
  const gap = parseFloat(bodyStyle.gap) || 8;

  // Keep windows compact: cap longest video edge to 400px.
  const longestEdgeCap = 400;
  const edgeScale = longestEdgeCap / Math.max(naturalW, naturalH);

  // Also respect viewport bounds.
  const hardMaxVideoW = Math.min(
    Math.max(220, maxWindowW - padX - 4),
    Math.floor(vw * 0.62)
  );
  const hardMaxVideoH = Math.max(160, Math.floor(vh * 0.56));

  // Start from natural size, cap by 400px longest edge, then viewport.
  let scale = Math.min(1, edgeScale, hardMaxVideoW / naturalW, hardMaxVideoH / naturalH);
  let targetVideoW = Math.max(220, Math.round(naturalW * scale));
  let targetVideoH = Math.max(124, Math.round(naturalH * scale));

  video.style.width = targetVideoW + 'px';
  video.style.height = targetVideoH + 'px';
  meta.style.maxHeight = '';
  meta.style.overflow = 'visible';

  const titleH = Math.ceil(titleBar.getBoundingClientRect().height || 20);
  let metaH = Math.ceil(meta.scrollHeight + 4);

  // If content is still too tall, scale video down again so full text can remain visible.
  const chromeH = titleH + padY + gap + metaH + 4;
  const fitVideoH = maxWindowH - chromeH;
  if (fitVideoH > 120 && targetVideoH > fitVideoH) {
    scale = Math.min(scale, fitVideoH / naturalH);
    targetVideoW = Math.max(220, Math.round(naturalW * scale));
    targetVideoH = Math.max(124, Math.round(naturalH * scale));
    video.style.width = targetVideoW + 'px';
    video.style.height = targetVideoH + 'px';
    metaH = Math.ceil(meta.scrollHeight + 4);
  }

  let targetWinW = Math.ceil(targetVideoW + padX + 4);
  let targetWinH = Math.ceil(titleH + padY + targetVideoH + gap + metaH + 4);

  targetWinW = Math.min(targetWinW, maxWindowW);
  if (targetWinH > maxWindowH) {
    const availableMeta = Math.max(80, maxWindowH - titleH - padY - targetVideoH - gap - 4);
    meta.style.maxHeight = availableMeta + 'px';
    meta.style.overflow = 'auto';
    targetWinH = maxWindowH;
  }

  win.classList.add('is-absolute');
  win.style.width = targetWinW + 'px';
  win.style.height = targetWinH + 'px';
  win.style.left = Math.max(margin, Math.round((vw - targetWinW) / 2)) + 'px';
  win.style.top = Math.max(32, Math.round((vh - targetWinH) / 2)) + 'px';
  updateMetaHeightForWindow(win, titleBar, video, meta);
}

function updateMetaHeightForWindow(win, titleBar, video, meta) {
  const body = win.querySelector('.window-body');
  if (!body) return;
  const style = getComputedStyle(body);
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const gap = parseFloat(style.gap) || 8;
  const titleH = Math.ceil(titleBar.getBoundingClientRect().height || 20);
  const videoH = Math.ceil(video.getBoundingClientRect().height || parseFloat(video.style.height) || 0);
  const available = Math.floor(win.clientHeight - titleH - padY - gap - videoH - 6);
  const safe = Math.max(80, available);
  if (meta.scrollHeight + 4 <= safe) {
    meta.style.maxHeight = '';
    meta.style.overflow = 'visible';
  } else {
    meta.style.maxHeight = safe + 'px';
    meta.style.overflow = 'auto';
  }
}

function attachVideoWindowResize(win, titleBar, video, meta) {
  if (!('ResizeObserver' in window)) return;
  let raf = 0;
  const ro = new ResizeObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      updateMetaHeightForWindow(win, titleBar, video, meta);
    });
  });
  ro.observe(win);
  win._videosResizeObserver = ro;
}
