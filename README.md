# Amiga Workbench 3.1 — Personal CV Site

A retro-themed personal CV website styled after the Commodore Amiga Workbench 3.1 operating system.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS & JavaScript — no frameworks or build tools
- **Hosting:** [Fly.io](https://fly.io) with `nginx:alpine` Docker image
- **CI/CD:** GitHub Actions — auto-deploys on push to `main`

## Features

- **Amiga boot sequence** — animated startup with memory check counter, persisted per session via `localStorage`
- **Typewriter terminal** — lines render one-by-one in a styled AmigaShell window
- **Draggable windows** — desktop-like window management with collapse/expand
- **Demoscene canvas** — 3D starfield and rainbow sine-wave scroller rendered on `<canvas>`
- **GitHub API integration** — fetches live repo stats, commit counts, and language breakdowns with hardcoded fallbacks
- **Retro aesthetics** — custom cursor, Silkscreen pixel font, authentic Amiga color palette, blinking text cursor

## Project Structure

```
├── Dockerfile              # nginx:alpine serving static files
├── fly.toml                # Fly.io deployment config
├── .github/workflows/
│   └── fly-deploy.yml      # GitHub Actions CI/CD
└── public/
    └── index.html          # Entire site in a single file
```

## Running Locally

```bash
docker build -t cv . && docker run -p 8080:80 cv
```

Then open `http://localhost:8080`.
