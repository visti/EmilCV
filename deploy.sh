#!/bin/bash
set -e

BASE="https://emilcv.fly.dev"
BACKUP_DIR="./paint-backup"

echo "==> Backing up paintings from $BASE..."
mkdir -p "$BACKUP_DIR"

node -e "
const https = require('https');
const fs   = require('fs');
const path = require('path');

const BASE = '$BASE';
const DIR  = '$BACKUP_DIR';

https.get(BASE + '/paint/', res => {
  let raw = '';
  res.on('data', d => raw += d);
  res.on('end', () => {
    let list;
    try { list = JSON.parse(raw); } catch { list = []; }
    if (!list.length) { console.log('    No paintings on server.'); return; }
    let pending = list.length;
    list.forEach(item => {
      const dest = path.join(DIR, item.filename);
      const file = fs.createWriteStream(dest);
      https.get(BASE + item.url, r => {
        r.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('    Saved: ' + item.filename);
          if (--pending === 0)
            console.log('    Done — ' + list.length + ' file(s) → ' + DIR);
        });
      }).on('error', err => {
        console.error('    Failed: ' + item.filename + ' (' + err.message + ')');
        if (--pending === 0) console.log('    Done (with errors)');
      });
    });
  });
}).on('error', err => {
  console.error('    Could not reach server: ' + err.message);
  console.error('    Skipping backup...');
});
"

echo "==> Committing backup to git..."
git add paint-backup/
if git diff --cached --quiet; then
  echo "    No changes to paintings — skipping commit."
else
  git commit -m "chore: back up paintings before deploy [$(date +%Y-%m-%d\ %H:%M)]"
fi

echo "==> Deploying..."
fly deploy
