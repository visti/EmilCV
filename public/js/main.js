import { runBootSequence } from './boot.js';
import { fetchGitHub, buildLines } from './github.js';
import { fetchNotes, renderNotes } from './notes.js';
import { sizeDemoCanvas, startStarfield, startScroller } from './demo.js';
import { sizeDiskCanvas } from './disk.js';
import { sizeFileMgrCanvas } from './filemanager.js';
import { sizeDPaintCanvas, dpaintSave } from './dpaint.js';
import { bas, basInit, sizeBasicBody } from './basic.js';
import { htermState, htermToggle, htermInit } from './terminal.js';
import {
  registerWindow, guruMeditation, applyIconGsap,
  observeResize, sizeMainWindowBody, sizeWindowsToContent,
  applyInitialLayout, applyNoteLayout, winHide
} from './windows.js';
import { playWinClose } from './sound.js';

// Hidden message for fellow devs
const easterEgg = String.raw`
 ____________________________________________________
|                                                    |
|     ___          _  __   _   ___  __  ___          |
|    | __|_ __ _ _| | \\ \\ / (_)__| _||_(  )         |
|    | _|| '  \\ | | |  \\ V /| (_-<  | _/ |          |
|    |___|_|_|_|___|_|   \\_/ |_/__/  |_| _|          |
|                                                    |
|   ╔══════════════════════════════════════════════╗  |
|   ║  This site was built with love & nostalgia   ║  |
|   ║  on a rainy day in Copenhagen.               ║  |
|   ║                                              ║  |
|   ║  Stack: HTML + inline CSS/JS + GitHub API    ║  |
|   ║  Host:  Fly.io (node:20-alpine)               ║  |
|   ║  Aesthetic: VistiOS Workbench              ║  |
|   ║                                              ║  |
|   ║  > github.com/visti                          ║  |
|   ║  > soundcloud.com/visti-1                    ║  |
|   ╚══════════════════════════════════════════════╝  |
|                                                    |
|   "Computers in the future may weigh no more       |
|    than 1.5 tons." — Popular Mechanics, 1949       |
|____________________________________________________|`;
console.log(
  `%c${easterEgg}`,
  'color: #ffaa00; font-family: monospace; font-size: 12px; background: #0055aa; padding: 8px;'
);

async function main() {
  const terminal = document.getElementById('terminal');
  const [{ user, repos }, notes] = await Promise.all([fetchGitHub(), fetchNotes()]);
  const lines = buildLines(user, repos);

  const elements = lines.map(line => {
    const div = document.createElement('div');
    div.classList.add('line');

    if (line.type === 'blank') {
      div.innerHTML = '&nbsp;';
    } else if (line.type === 'final') {
      div.innerHTML = `<span class="prompt-text">1.SYS:&gt;</span> <span class="cursor"></span>`;
    } else {
      div.innerHTML = line.html;
    }

    terminal.appendChild(div);
    return { el: div, line };
  });

  renderNotes(notes);
  applyInitialLayout();
  applyNoteLayout(notes);
  if (document.documentElement.clientWidth < 600) {
    document.getElementById('demo-window').style.display = 'none';
    const mw = document.getElementById('main-window');
    if (mw) mw.style.height = Math.round(document.documentElement.clientHeight * 0.7) + 'px';
  }
  sizeWindowsToContent();
  sizeMainWindowBody();
  sizeDemoCanvas();
  startStarfield();
  startScroller();

  return function startTypewriter() {
    let i = 0;
    function showNext() {
      if (i >= elements.length) return;
      const { el, line } = elements[i];
      el.classList.add('visible');
      i++;

      const delays = {
        'boot': 120,
        'cmd': 200,
        'blank': 50,
        'out': 35,
        'final': 0,
      };
      const delay = delays[line.type] ?? 40;
      if (line.type !== 'final') {
        setTimeout(showNext, delay);
      }
    }
    setTimeout(showNext, 300);
  };
}

(async () => {
  const [, startTypewriter] = await Promise.all([
    runBootSequence(),
    main()
  ]);
  if (startTypewriter) startTypewriter();
})();

// Reboot icon
const reboot = document.getElementById('reboot-icon');
if (reboot) {
  reboot.addEventListener('click', async (e) => {
    e.preventDefault();
    await runBootSequence();
  });
}

// Trash icon
const trash = document.getElementById('trash-icon');
if (trash) {
  trash.addEventListener('click', (e) => {
    e.preventDefault();
    guruMeditation();
  });
}

// === Mail window ===
registerWindow('mail-window', 'mail-icon', 'mail-close', 420, null);
document.getElementById('mail-send-btn')?.addEventListener('click', () => {
  const subjectRaw = document.getElementById('mail-subject')?.value || '';
  const bodyRaw = document.getElementById('mail-msg')?.value || '';
  if (!subjectRaw.trim() && !bodyRaw.trim()) return;
  const subject = encodeURIComponent(subjectRaw);
  const body = encodeURIComponent(bodyRaw);
  window.location.href = 'mailto:emilvisti@gmail.com?subject=' + subject + '&body=' + body;
});

// === Timeline window ===
const timelineEntries = [
  { type: 'experience', title: 'Data Specialist', org: 'Gramex', start: 2017, end: null },
  { type: 'experience', title: 'Metadata Expert', org: 'Sandrew Metronome', start: 2014, end: 2016 },
  { type: 'experience', title: 'Asst. Producer \u2014 Video / Music / Graphics', org: 'Big Beard Productions', start: 2012, end: 2014 },
  { type: 'experience', title: 'Writer \u2014 SEO, Articles, Podcasts', org: 'Rotation.dk', start: 2012, end: 2015 },
  { type: 'experience', title: 'PR Associate', org: 'ORA', start: 2011, end: 2012 },
  { type: 'education', title: 'Librarian DB', org: 'IVA Aalborg', start: 2014, end: 2015 },
  { type: 'education', title: 'BSc Information Science', org: 'IVA Aalborg', start: 2008, end: 2014 },
  { type: 'education', title: 'Gymnasium', org: 'Dronninglund', start: 2003, end: 2006 }
];

function buildTimelineMap() {
  const grid = document.getElementById('timeline-grid');
  const detail = document.getElementById('timeline-detail');
  if (!grid || !detail) return;

  const nowYear = new Date().getFullYear();
  const normalized = timelineEntries.map((e) => ({
    ...e,
    end: e.end || nowYear,
    openEnd: e.end == null
  }));
  const minYear = Math.min(...normalized.map(e => e.start));
  const maxYear = Math.max(...normalized.map(e => e.end));
  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `90px repeat(${years.length}, 14px)`;

  const header = document.createElement('div');
  header.className = 'timeline-label';
  header.textContent = 'Year';
  grid.appendChild(header);

  years.forEach((y) => {
    const cell = document.createElement('div');
    cell.className = 'timeline-year';
    cell.textContent = String(y).slice(2);
    grid.appendChild(cell);
  });

  function setDetail(year, type, entries) {
    detail.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'highlight';
    title.textContent = `${year} \u2014 ${type === 'experience' ? 'Experience' : 'Education'}`;
    detail.appendChild(title);

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No entries';
      detail.appendChild(empty);
      return;
    }

    entries.forEach((e) => {
      const line = document.createElement('div');
      const endLabel = e.openEnd ? 'Present' : e.end;
      line.textContent = `${e.title} \u2014 ${e.org} (${e.start}\u2013${endLabel})`;
      detail.appendChild(line);
    });
  }

  function addRow(label, type) {
    const rowLabel = document.createElement('div');
    rowLabel.className = 'timeline-label';
    rowLabel.textContent = label;
    grid.appendChild(rowLabel);

    years.forEach((y) => {
      const entries = normalized.filter(e => e.type === type && y >= e.start && y <= e.end);
      const cell = document.createElement('div');
      cell.className = 'timeline-cell';
      if (entries.length) {
        cell.classList.add(type === 'experience' ? 'active-exp' : 'active-edu');
        if (entries.length > 1) cell.classList.add('multi');
      }
      cell.addEventListener('mouseenter', () => setDetail(y, type, entries));
      cell.addEventListener('click', () => setDetail(y, type, entries));
      grid.appendChild(cell);
    });
  }

  addRow('Experience', 'experience');
  addRow('Education', 'education');

  grid.onmouseleave = () => {
    detail.textContent = 'Hover a block to see details.';
  };
}

registerWindow('timeline-window', 'timeline-icon', 'timeline-close', 520, 360, () => buildTimelineMap());

// === Main (CV) window ===
registerWindow('main-window', 'cv-icon', 'main-close', 560, null, (win) => {
  win.classList.add('open');
  sizeMainWindowBody();
});

// === Demo window ===
registerWindow('demo-window', 'demo-icon', 'demo-close', 480, 260, () => sizeDemoCanvas());

// === Escape: close topmost window or terminal ===
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (bas.running) return;
  if (htermState.open) { htermToggle(); return; }
  const wins = [...document.querySelectorAll('.window')].filter(w => w.style.display !== 'none');
  if (!wins.length) return;
  const top = wins.reduce((a, b) => (parseInt(b.style.zIndex || 0) > parseInt(a.style.zIndex || 0) ? b : a));
  playWinClose();
  winHide(top);
});

// === Ctrl+S: save DPaint canvas ===
document.addEventListener('keydown', (e) => {
  if (htermState.open) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    const win = document.getElementById('dpaint-window');
    if (win && win.style.display !== 'none') {
      e.preventDefault();
      dpaintSave();
    }
  }
});

// === Window resize handler ===
let resizeRaf = 0;
window.addEventListener('resize', () => {
  if (resizeRaf) return;
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    sizeWindowsToContent();
    sizeMainWindowBody();
    sizeDemoCanvas();
    sizeDiskCanvas();
    sizeFileMgrCanvas();
    sizeDPaintCanvas();
    sizeBasicBody();
  });
});

// === ResizeObserver hooks ===
observeResize(document.getElementById('main-window'), () => sizeMainWindowBody());
observeResize(document.getElementById('demo-window'), () => sizeDemoCanvas());
observeResize(document.getElementById('disk-window'), () => sizeDiskCanvas());
observeResize(document.getElementById('filemgr-window'), () => sizeFileMgrCanvas());
observeResize(document.getElementById('dpaint-window'), () => sizeDPaintCanvas());
observeResize(document.getElementById('basic-window'), () => sizeBasicBody());

// === GSAP hover effects for static desktop icons ===
document.querySelectorAll('.wb-icon').forEach(applyIconGsap);

// === Initialise subsystems ===
htermInit();
basInit();
