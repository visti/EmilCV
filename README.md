# Amiga Workbench 3.1 — Personal CV Site

A retro-themed personal CV website styled after the Commodore Amiga Workbench 3.1 operating system.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS & JavaScript — GSAP, Howler.js, Marked.js via CDN
- **Backend:** Node.js (zero dependencies) — static file serving + paint API + notes manifest
- **Hosting:** [Fly.io](https://fly.io) with persistent volume storage
- **CI/CD:** GitHub Actions — auto-deploys on push to `master`

## Features

### Desktop & Shell
- **Amiga boot sequence** — animated startup visible from first paint (no flash), with disk-insert hand GIF, memory check counter, and chipset/drive messages
- **Typewriter terminal** — CV content rendered line-by-line in an AmigaShell-styled window with GitHub API integration (live repo stats, commit counts, language breakdowns; hardcoded fallbacks if API is unavailable); skill keywords highlighted in amber
- **Draggable windows** — full desktop-like window management: drag, collapse/expand, z-ordering via depth gadgets; GSAP spring animations on open/close
- **Hidden terminal** — slide the Workbench down to reveal a green-on-black CLI underneath, toggled via a depth gadget; supports a custom command set
- **Retro aesthetics** — custom Amiga-orange cursor, Silkscreen pixel font, authentic Amiga color palette, CRT scanline + vignette overlay, Amiga-orange text selection, Guru Meditation easter egg

### Apps (icon row)
| Icon | App | Description |
|------|-----|-------------|
| CV | AmigaShell | Main typewriter CV terminal |
| GitHub | External link | Opens github.com/visti |
| SoundCloud | External link | Opens soundcloud.com/visti-1 |
| Reboot | Reboot | Replays the boot sequence |
| DemoScene | Demoscene | 3D starfield + rainbow sine-wave scroller on `<canvas>` |
| Deluxe Paint | Pixel editor | Full pixel art editor (see below) |
| File Manager | Disk info | Language pie chart + defrag grid of GitHub repos |
| Pictures | Gallery | Browse and view saved paintings |
| AmigaBASIC | BASIC shell | Interactive interpreter (see below) |
| Mail | Contact form | Send email via mailto link |
| Timeline | Timeline Map | Visual career + education history grid |
| Print CV | PDF | Opens `Emil_Visti_CV.pdf` |
| Notes | Markdown viewer | One icon per note file (auto-generated) |

### Deluxe Paint
Full pixel art editor inspired by the classic Amiga app:
- Tools: pencil, line, rectangle, circle, flood fill, eraser, eyedropper
- Filled/outline toggle for shapes
- Foreground / background color system with swatch indicator
- 32-color Amiga palette
- FG/BG swap button
- Save painting to server (Ctrl+S) — stored on the Fly.io persistent volume
- Clear canvas button

### Pictures Gallery
- Thumbnail grid of all saved server-side paintings
- Click a thumbnail to open the painting in a Workbench-style viewer window
- Drag anything to the trashcan to trigger the Guru Meditation easter egg

### AmigaBASIC Interpreter
Interactive BASIC shell with:
- `PRINT`, `INPUT`, `LET`, `IF/THEN/ELSE`
- `FOR/NEXT`, `WHILE/WEND`
- `GOTO`, `GOSUB/RETURN`
- `DATA/READ/RESTORE`
- `DIM` arrays, `REM` comments
- `END`, `STOP`, `CLS`, `BEEP`
- CV shortcut commands: `CV`, `SKILLS`, `PROJECTS`, `CONTACT`
- `ADVENTURE` — launches the text adventure game inside the BASIC window
- Blinking block cursor

### Text Adventure
A multi-room fantasy adventure game (`/game/game.json` + individual `.room` files):
- 12 rooms: Courtyard, Archway, Well, Archive, Scriptorium, Vault, Inner Keep, Chapel, Crypt, Crystal Cavern, Moonlit Gate, Hall of Legends
- Item pickup, inventory, and USE mechanics
- Locked exits requiring specific items (consumed on use)
- Flag-based puzzle gates (e.g. chapel altar must be lit before crypt stair opens)
- Hidden items revealed by puzzle flags
- LOOK at named objects for descriptions
- Win condition: reach the Hall of Legends with all four treasures
- Ambient music plays during the adventure

### Notes System
- Markdown notes served from `/notes/` with auto-generated `manifest.json`
- Rendered via Marked.js (GFM, safe links)
- Each note gets its own desktop icon and opens in a draggable viewer window

### File Manager / Disk Info
- Animated pie chart of GitHub repo languages
- Defrag-style grid visualising repos as coloured blocks (language-coloured, forks dimmed)
- Hover a block to see the repo name and description

### Timeline
- Visual grid of career experience (amber) and education (blue) blocks spanning 2012–present
- Hover any block to read role, organisation, and date range

## Project Structure

```
├── server.js               # Node.js server (static files + paint API + notes manifest)
├── package.json            # Minimal, zero dependencies
├── Dockerfile              # node:20-alpine
├── fly.toml                # Fly.io config with volume mount for paint storage
├── .github/workflows/
│   └── fly-deploy.yml      # GitHub Actions CI/CD
└── public/
    ├── index.html           # Entire site in a single HTML file
    ├── boot-hand.gif        # Disk-insert animation for boot screen
    ├── files/
    │   ├── Emil_Visti_CV.pdf
    │   └── audio/           # UI sound effects (load.wav, deload.wav)
    ├── game/
    │   ├── game.json        # Room graph, items, flags, win condition
    │   └── *.room           # Individual room data files
    ├── music/
    │   └── music.mp3        # Ambient music for the adventure game
    └── notes/
        ├── manifest.json    # Auto-generated note index
        └── *.md             # Markdown note files
```

## Running Locally

```bash
node server.js
```

Then open `http://localhost:3000`.
