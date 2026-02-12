# Amiga Workbench 3.1 — Personal CV Site

A retro-themed personal CV website styled after the Commodore Amiga Workbench 3.1 operating system.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS & JavaScript — no frameworks or build tools
- **Backend:** Node.js (zero dependencies) — static file serving + paint API
- **Hosting:** [Fly.io](https://fly.io) with persistent volume storage
- **CI/CD:** GitHub Actions — auto-deploys on push to `main`

## Features

- **Amiga boot sequence** — animated startup with memory check counter, persisted per session via `localStorage`
- **Typewriter terminal** — lines render one-by-one in a styled AmigaShell window
- **Draggable windows** — desktop-like window management with collapse/expand and z-ordering
- **Demoscene canvas** — 3D starfield and rainbow sine-wave scroller rendered on `<canvas>`
- **GitHub API integration** — fetches live repo stats, commit counts, and language breakdowns with hardcoded fallbacks
- **Deluxe Paint** — pixel art editor with pencil, line, rect, circle, fill, eraser, eyedropper, color palette, and save-to-server
- **Pictures gallery** — browse saved paintings as thumbnails, open in Workbench-style viewer windows, drag to trashcan to delete
- **AmigaBASIC interpreter** — interactive BASIC shell with support for PRINT, INPUT, IF/THEN/ELSE, FOR/NEXT, WHILE/WEND, GOTO, GOSUB, DATA/READ, and more
- **Notes system** — markdown notes served from `/notes/` with auto-generated manifest
- **Retro aesthetics** — custom cursor, Silkscreen pixel font, authentic Amiga color palette, Guru Meditation easter egg

## Project Structure

```
├── server.js               # Node.js server (static files + paint API + notes manifest)
├── package.json            # Minimal, zero dependencies
├── Dockerfile              # node:20-alpine
├── fly.toml                # Fly.io config with volume mount for paint storage
├── .github/workflows/
│   └── fly-deploy.yml      # GitHub Actions CI/CD
└── public/
    ├── index.html           # Entire site in a single file
    └── notes/               # Markdown notes directory
```

## Running Locally

```bash
node server.js
```

Then open `http://localhost:3000`.
