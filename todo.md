# EmilCV — Feature Ideas

## Interactive

- [x] **File Manager window** — Implemented as a language pie chart + defrag-style repo grid
- [ ] **Preferences window** — Let visitors toggle CRT scanlines, change Workbench palette (1.x blue/orange, 2.x grey, 3.x magic), adjust typewriter speed
- [ ] **Clock gadget** — Amiga-style digital clock in the screen title bar (right side)
- [ ] **Disk activity LED** — Blinking indicator during GitHub API fetches and painting saves
- [ ] **Drag icons to reorder** — Let users rearrange desktop icons, persist in localStorage
- [ ] **Window snap/tile** — Double-click title bar to maximize, Shift+drag to snap to half-screen

## AmigaBASIC

- [ ] **More CV commands** — `EXPERIENCE`, `EDUCATION`, `LINKS`, `ABOUT` (echo respective CV sections)
- [ ] **PLAY command** — Play MOD-style chip melodies via Web Audio (e.g. `PLAY "O4 C D E F G"`)
- [ ] **PLOT / LINE / CIRCLE** — Graphics output to a small canvas inside the BASIC window
- [ ] **COLOR command** — Change output text color
- [ ] **SAVE / LOAD** — Persist BASIC programs to localStorage
- [ ] **Example programs menu** — Pre-loaded demos (Fibonacci, Mandelbrot, Conway's Game of Life)

## Creative

- [ ] **DPaint layers** — Simple 2-layer system (foreground + background)
- [ ] **DPaint undo/redo** — Ctrl+Z / Ctrl+Y with a small history stack
- [ ] **DPaint text tool** — Type pixel text onto the canvas
- [ ] **DPaint sprite stamps** — Amiga-themed stamp brushes (Boing ball, checkmark, floppy)
- [ ] **ProTracker window** — Simple 4-channel step sequencer / tracker with chip samples

## Content & CV

- [x] **Timeline view** — Visual grid of experience (amber) and education (blue) blocks with hover details
- [ ] **Project detail windows** — Click a repo in the shell listing to open a dedicated window with README preview
- [ ] **Achievements / badges** — Fun stats window ("Lines of SQL written: many", "Cups of coffee: ∞")
- [x] **Blog / journal notes** — Markdown notes served from /notes/ with auto-generated manifest and per-note desktop icons

## Polish & UX

- [ ] **Sound effects** — Floppy drive click on window open, beep on error, disk insert on boot
- [ ] **CRT shader overlay** — Optional scanline + subtle screen curvature CSS filter
- [ ] **Startup-sequence animation** — Show actual Amiga startup-sequence text before the shell prompt
- [ ] **Smooth window resize** — Auto-resize BASIC and Mail window bodies on manual resize (ResizeObserver)
- [ ] **Mobile hamburger menu** — Collapse icon row into a pullout drawer on small screens
- [ ] **Keyboard navigation** — Tab through icons, Enter to open, Escape to close topmost window
- [ ] **Loading skeleton** — Show Workbench chrome immediately, populate terminal after API returns

## Infrastructure

- [ ] **Service worker / offline** — Cache static assets for offline viewing
- [ ] **Open Graph / social cards** — Meta tags + preview image for link sharing
- [ ] **Analytics** — Lightweight privacy-friendly hit counter (no cookies)
- [x] **CI/CD** — GitHub Actions: deploy to Fly.io on push
