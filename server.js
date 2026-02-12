const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const PAINT_DIR = process.env.PAINT_DIR || path.join(__dirname, 'paint');
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

// --- Paint directory ---
fs.mkdirSync(PAINT_DIR, { recursive: true });

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
  // files are newest-first, so delete from the end
  while (files.length > MAX_PAINTINGS) {
    const oldest = files.pop();
    try {
      fs.unlinkSync(path.join(PAINT_DIR, oldest));
      console.log(`Deleted oldest painting: ${oldest}`);
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Paint dir: ${PAINT_DIR}`);
});
