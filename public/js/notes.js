import { escapeHtml } from './utils.js';
import { mobileWindowPos, bringToFront, winShow, winHide, applyIconGsap } from './windows.js';
import { playWinOpen, playWinClose } from './sound.js';

// marked is a CDN global (configured in utils.js)

export async function fetchNotes() {
  const sig = AbortSignal.timeout(5000);
  try {
    const res = await fetch('./notes/manifest.json', { signal: sig });
    if (!res.ok) throw new Error('manifest fetch failed');
    const filenames = await res.json();
    const notes = await Promise.all(filenames.map(async (name, index) => {
      const r = await fetch('./notes/' + name, { signal: sig });
      if (!r.ok) return null;
      const md = await r.text();
      return parseNote(md, index);
    }));
    return notes.filter(Boolean);
  } catch {
    return [];
  }
}

export function parseNote(md, index) {
  const text = md.replace(/\r\n/g, '\n');
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;
  const fmBlock = fmMatch[1];
  const body = fmMatch[2].trim();

  const meta = {};
  fmBlock.split('\n').forEach(line => {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) return;
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    meta[m[1]] = val;
  });

  const parsedDiv = document.createElement('div');
  parsedDiv.innerHTML = marked.parse(body);
  parsedDiv.querySelectorAll('a').forEach(a => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
  const bodyHtml = parsedDiv.innerHTML;

  return {
    title: meta.title || 'Note',
    filename: meta.filename || '',
    icon: (meta.icon || 'Note').replace(/\\n/g, '\n'),
    open: meta.open === true,
    bodyHtml,
    id: 'note-' + index
  };
}

export function renderNotes(notes) {
  const container = document.getElementById('note-windows');
  const iconContainer = document.getElementById('note-icons');
  if (!container || !iconContainer) return;

  const docSvg = `<img src="files/icons/note.svg" alt="">`;

  notes.forEach(note => {
    // Create window
    const win = document.createElement('div');
    win.className = 'window rec-window' + (note.open ? ' open' : '');
    win.id = note.id;
    if (!note.open) win.style.display = 'none';

    const safeTitle = escapeHtml(note.title);
    const safeFilename = escapeHtml(note.filename);
    const safeIcon = escapeHtml(note.icon);
    win.innerHTML =
      `<div class="window-title rec-toggle" data-toggle="${note.id}">` +
        `<div class="close-gadget note-close"></div>` +
        `<span class="title-text">${safeTitle}</span>` +
        `<span class="rec-hint">click to expand</span>` +
      `</div>` +
      `<div class="window-body rec-body">` +
        `<div class="dim-text">${safeFilename}</div><br>` +
        note.bodyHtml +
      `</div>`;

    container.appendChild(win);

    // Close gadget hides the window
    win.querySelector('.note-close').addEventListener('click', (e) => {
      e.stopPropagation();
      playWinClose();
      winHide(win);
    });

    // Create icon
    const icon = document.createElement('a');
    icon.className = 'wb-icon';
    icon.id = note.id + '-icon';
    icon.href = '#';
    icon.innerHTML =
      `<div class="icon-box">${docSvg}</div>` +
      `<span class="icon-label">${safeIcon}</span>`;

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      if (win.style.display === 'none') {
        win.style.display = '';
        win.classList.add('open');
        if (win.dataset.prevHeight) {
          win.style.height = win.dataset.prevHeight;
          delete win.dataset.prevHeight;
        } else {
          win.style.height = '';
        }
        if (!win.classList.contains('is-absolute')) mobileWindowPos(win, 380, null);
        bringToFront(win);
        playWinOpen();
        winShow(win);
      } else {
        playWinClose();
        winHide(win);
      }
    });
    applyIconGsap(icon);

    iconContainer.appendChild(icon);
  });
}
