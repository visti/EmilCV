const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const PAINT_DIR = process.env.PAINT_DIR || path.join(__dirname, 'paint');
const ARCHIVE_DIR = process.env.ARCHIVE_DIR || path.join(__dirname, 'paint-archive');
const ARCHIVE_KEY = process.env.ARCHIVE_KEY || '';
const MAX_BODY = 500 * 1024; // 500 KB
const MAX_PAINTINGS = 5;
const RATE_WINDOW = 30 * 1000; // 30 seconds
const RATE_MAX = 3;            // max uploads per window
const uploadTimes = new Map();  // IP → [timestamps]

// MIME types for static serving
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown',
};

// --- Notes manifest ---
function buildNotesManifest() {
  const notesDir = path.join(PUBLIC, 'notes');
  try {
    const files = fs.readdirSync(notesDir)
      .filter(f => f.endsWith('.md'))
      .sort();
    const manifest = JSON.stringify(files);
    fs.writeFileSync(path.join(notesDir, 'manifest.json'), manifest);
    console.log(`Notes manifest: ${files.length} file(s)`);
  } catch (e) {
    console.log('No notes directory found, skipping manifest');
  }
}

// --- Game manifest ---
function buildGameManifest() {
  const gameDir = path.join(PUBLIC, 'game');
  try {
    const files = fs.readdirSync(gameDir).filter(f => f.endsWith('.room')).sort();
    if (!files.length) { console.log('No room files found, skipping game manifest'); return; }
    const rooms = {};
    let startRoom = null;
    let winRoom = null;
    const treasures = new Set();

    function parseLook(val) {
      // Preferred: LOOK: key | description
      const pipe = val.match(/^(.+?)\s+\|\s+(.+)$/);
      if (pipe) return { key: pipe[1].trim().toLowerCase(), desc: pipe[2].trim() };
      // Quoted key: LOOK: "dusty shelves" description
      const quoted = val.match(/^"([^"]+)"\s+(.+)$/);
      if (quoted) return { key: quoted[1].trim().toLowerCase(), desc: quoted[2].trim() };
      // Backward compatible single-token key
      const [key, ...rest] = val.split(/\s+/);
      return { key: (key || '').toLowerCase(), desc: rest.join(' ').trim() };
    }

    function parseOnUse(val) {
      // Supports: ONUSE: item flag  | ONUSE: item -> flag
      const m = val.match(/^(\S+)\s*(?:->)?\s*(\S+)$/);
      if (!m) return null;
      return { item: m[1].toLowerCase(), flag: m[2] };
    }

    function parseHidden(val) {
      // Supports: HIDDEN: item NEEDFLAG flag  | HIDDEN: item flag
      const m1 = val.match(/^(\S+)\s+NEEDFLAG\s+(\S+)$/i);
      if (m1) return { item: m1[1].toLowerCase(), flag: m1[2] };
      const m2 = val.match(/^(\S+)\s+(\S+)$/);
      if (m2) return { item: m2[1].toLowerCase(), flag: m2[2] };
      return null;
    }

    function isTrue(val) {
      return /^(1|true|yes|on)$/i.test(val.trim());
    }

    for (const file of files) {
      const lines = fs.readFileSync(path.join(gameDir, file), 'utf8').split('\n');
      const room = { title: '', desc: '', exits: {}, items: {}, needs: {}, consumes: {}, looks: {}, uses: {}, flags: {}, needflags: {}, hidden: {} };
      let id = file.replace('.room', '');
      let roomIsStart = false;
      let roomIsWin = false;
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim().toUpperCase();
        const val = line.slice(colon + 1).trim();
        if (key === 'ROOM') { id = val; }
        else if (key === 'START') { roomIsStart = isTrue(val); }
        else if (key === 'WINROOM' || key === 'WIN') { roomIsWin = isTrue(val); }
        else if (key === 'TITLE') { room.title = val; }
        else if (key === 'DESC') { room.desc += (room.desc ? ' ' : '') + val; }
        else if (key === 'EXIT') { const [dir, ...rest] = val.split(/\s+/); room.exits[dir.toUpperCase()] = rest.join(' '); }
        else if (key === 'ITEM') { const [iid, ...rest] = val.split(/\s+/); room.items[iid.toLowerCase()] = rest.join(' '); }
        else if (key === 'TREASURE') { treasures.add(val.toLowerCase()); }
        else if (key === 'NEED') { const [dir, iid, ...rest] = val.split(/\s+/); room.needs[dir.toUpperCase()] = { item: iid.toLowerCase(), msg: rest.join(' ') }; }
        else if (key === 'CONSUME') { room.consumes[val.toUpperCase()] = true; }
        else if (key === 'LOOK') {
          const p = parseLook(val);
          if (p.key && p.desc) room.looks[p.key] = p.desc;
        }
        else if (key === 'USE') {
          // Supports quoted/multi-word item/target:
          // USE: item ON target message
          // USE: "item words" ON "target words" message
          const m = val.match(/^(?:"([^"]+)"|(\S+))\s+ON\s+(?:"([^"]+)"|(\S+))\s+(.+)$/i);
          if (m) {
            const item = (m[1] || m[2] || '').toLowerCase();
            const target = (m[3] || m[4] || '').toLowerCase();
            room.uses[item + ':' + target] = m[5];
          }
        }
        else if (key === 'ONUSE' || key === 'FLAG') {
          const p = parseOnUse(val);
          if (p) room.flags[p.item] = p.flag;
        }
        else if (key === 'NEEDFLAG') { const [dir, flag, ...rest] = val.split(/\s+/); room.needflags[dir.toUpperCase()] = { flag, msg: rest.join(' ') }; }
        else if (key === 'HIDDEN') {
          const p = parseHidden(val);
          if (p) room.hidden[p.item] = p.flag;
        }
      }
      rooms[id] = room;
      if (roomIsStart) startRoom = id;
      if (roomIsWin) winRoom = id;
      if (file === 'start.room' || !startRoom) startRoom = id;
      if (!winRoom && id === 'hall') winRoom = id;
    }
    const payload = { start: startRoom, rooms };
    if (winRoom) payload.winRoom = winRoom;
    if (treasures.size) payload.treasures = [...treasures];
    const manifest = JSON.stringify(payload, null, 2);
    fs.writeFileSync(path.join(gameDir, 'game.json'), manifest);
    console.log(`Game manifest: ${Object.keys(rooms).length} room(s)`);
  } catch (e) {
    console.log('No game directory found, skipping game manifest');
  }
}

// --- Paint & archive directories ---
fs.mkdirSync(PAINT_DIR, { recursive: true });
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

// --- Helpers ---
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        reject(new Error('Body too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on('error', (err) => { if (!done) { done = true; reject(err); } });
  });
}

function jsonResponse(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  if (stat.isDirectory()) {
    // Try index.html inside directory
    const index = path.join(filePath, 'index.html');
    try {
      fs.statSync(index);
      serveFile(res, index);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
    return;
  }

  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
  });
  fs.createReadStream(filePath).pipe(res);
}

// --- Paint API ---
function getPaintings() {
  try {
    return fs.readdirSync(PAINT_DIR)
      .filter(f => f.startsWith('painting-') && f.endsWith('.png'))
      .sort()
      .reverse(); // newest first
  } catch {
    return [];
  }
}

function enforcePaintLimit() {
  const files = getPaintings();
  // files are newest-first, so archive from the end
  while (files.length > MAX_PAINTINGS) {
    const oldest = files.pop();
    try {
      fs.renameSync(path.join(PAINT_DIR, oldest), path.join(ARCHIVE_DIR, oldest));
      console.log(`Archived painting: ${oldest}`);
    } catch {}
  }
}

function isRateLimited(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  const now = Date.now();
  let times = uploadTimes.get(ip);
  if (!times) { times = []; uploadTimes.set(ip, times); }
  // Remove old entries
  while (times.length && times[0] <= now - RATE_WINDOW) times.shift();
  if (times.length >= RATE_MAX) return true;
  times.push(now);
  return false;
}

function handlePaintPost(req, res) {
  if (isRateLimited(req)) {
    jsonResponse(res, 429, { error: 'Too many uploads, try again later' });
    return;
  }

  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('image/png')) {
    jsonResponse(res, 400, { error: 'Content-Type must be image/png' });
    return;
  }

  readBody(req, MAX_BODY)
    .then((buf) => {
      const filename = `painting-${Date.now()}.png`;
      fs.writeFileSync(path.join(PAINT_DIR, filename), buf);
      enforcePaintLimit();
      jsonResponse(res, 201, { filename });
      console.log(`Saved painting: ${filename} (${buf.length} bytes)`);
    })
    .catch((err) => {
      if (err.message === 'Body too large') {
        jsonResponse(res, 413, { error: 'File too large (max 500KB)' });
      } else {
        jsonResponse(res, 500, { error: 'Upload failed' });
      }
    });
}

function handlePaintList(req, res) {
  const files = getPaintings();
  const list = files.map(f => ({ filename: f, url: `/paint/${f}` }));
  jsonResponse(res, 200, list);
}

function sanitizeFilename(filename) {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  return filename;
}

function handlePaintFile(res, filename) {
  if (!sanitizeFilename(filename)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  const filePath = path.join(PAINT_DIR, filename);
  try {
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

function handlePaintDelete(res, filename) {
  if (!sanitizeFilename(filename)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  const filePath = path.join(PAINT_DIR, filename);
  try {
    fs.unlinkSync(filePath);
    jsonResponse(res, 200, { deleted: filename });
    console.log(`Deleted painting: ${filename}`);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// --- Archive API (key-protected) ---
function checkArchiveKey(url, res) {
  if (url.searchParams.get('key') !== ARCHIVE_KEY) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return false;
  }
  return true;
}

function getArchivedPaintings() {
  try {
    return fs.readdirSync(ARCHIVE_DIR)
      .filter(f => f.startsWith('painting-') && f.endsWith('.png'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function handleArchiveList(req, res, url) {
  if (!checkArchiveKey(url, res)) return;
  const files = getArchivedPaintings();
  const key = url.searchParams.get('key');
  const list = files.map(f => ({ filename: f, url: `/paint/archive/${f}?key=${key}` }));
  jsonResponse(res, 200, list);
}

function handleArchiveFile(res, filename, url) {
  if (!checkArchiveKey(url, res)) return;
  if (!sanitizeFilename(filename)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }
  const filePath = path.join(ARCHIVE_DIR, filename);
  try {
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// --- Server ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // Paint API
  if (pathname === '/paint/' || pathname === '/paint') {
    if (req.method === 'POST') {
      handlePaintPost(req, res);
      return;
    }
    if (req.method === 'GET') {
      handlePaintList(req, res);
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Archive API (must match before general /paint/ routes)
  if (pathname === '/paint/archive' || pathname === '/paint/archive/') {
    if (req.method === 'GET') {
      handleArchiveList(req, res, url);
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  if (pathname.startsWith('/paint/archive/')) {
    const filename = pathname.slice('/paint/archive/'.length);
    if (req.method === 'GET') {
      handleArchiveFile(res, filename, url);
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  if (pathname.startsWith('/paint/')) {
    const filename = pathname.slice('/paint/'.length);
    if (req.method === 'GET') {
      handlePaintFile(res, filename);
      return;
    }
    if (req.method === 'DELETE') {
      handlePaintDelete(res, filename);
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Static files
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Resolve path safely
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC, safePath);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  serveFile(res, filePath);
});

// Start
buildNotesManifest();
buildGameManifest();
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Paint dir: ${PAINT_DIR}`);
  console.log(`Archive dir: ${ARCHIVE_DIR}`);
});
