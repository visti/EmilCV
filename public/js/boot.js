import { playStatic } from './sound.js';

export async function runBootSequence() {
  const screen  = document.getElementById('boot-screen');
  const canvas  = document.getElementById('boot-canvas');
  const post    = document.getElementById('boot-post');
  const mem     = document.getElementById('boot-mem');
  const scan    = document.getElementById('boot-scan');
  const chipset = document.getElementById('boot-chipset');
  const drives  = document.getElementById('boot-drives');
  const load    = document.getElementById('boot-load');
  if (!screen || !canvas) return;

  // Reset
  screen.style.opacity = '';
  screen.style.background = '#000';
  canvas.style.display = 'block';
  post.style.display = 'none';
  [scan, chipset, drives, load].forEach(el => { if (el) el.style.visibility = 'hidden'; });
  screen.classList.add('active');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const wait = ms => new Promise(r => setTimeout(r, ms));
  function anim(ms, fn) {
    return new Promise(resolve => {
      const t0 = performance.now();
      let af;
      function tick(now) {
        const t = Math.min((now - t0) / ms, 1);
        fn(t);
        if (t < 1) af = requestAnimationFrame(tick);
        else resolve();
      }
      af = requestAnimationFrame(tick);
    });
  }

  // ── PHASE B: CRT POWER-ON ──────────────────────────────────────────────
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  await wait(280);

  // Horizontal line expands from center with phosphor glow
  await anim(900, t => {
    const e = 1 - Math.pow(1 - t, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const lh = Math.max(2, H * e);
    const ly = (H - lh) / 2;
    ctx.save();
    ctx.filter = `blur(${Math.round(28 * (1 - e) + 2)}px)`;
    ctx.fillStyle = `rgba(210,225,255,${0.45 - 0.25 * e})`;
    ctx.fillRect(0, ly - 24, W, lh + 48);
    ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.2 * e})`;
    ctx.fillRect(0, ly, W, lh);
  });

  // Bright flash as screen "snaps" on — play static as line fully expands
  playStatic();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, 0, W, H);
  await wait(55);

  // Pixel noise burst
  const NC = 4;
  const NW = Math.ceil(W / NC), NH = Math.ceil(H / NC);
  const nCvs = document.createElement('canvas');
  nCvs.width = NW; nCvs.height = NH;
  const nCtx = nCvs.getContext('2d');
  await anim(420, t => {
    const alpha = Math.sin(t * Math.PI);
    const img = nCtx.createImageData(NW, NH);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 200 + 55) | 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = 255;
    }
    nCtx.putImageData(img, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(nCvs, 0, 0, W, H);
    ctx.restore();
  });

  // Fade to dark navy
  await anim(450, t => {
    ctx.fillStyle = `rgba(0,0,26,${t})`;
    ctx.fillRect(0, 0, W, H);
  });
  ctx.fillStyle = '#00001a';
  ctx.fillRect(0, 0, W, H);

  // ── PHASE C: KICKSTART ROM SCREEN ──────────────────────────────────────
  const logoSz = Math.min(W * 0.14, 112);
  const logoY  = H * 0.4;

  // "VistiOS" with rainbow vertical gradient
  ctx.save();
  ctx.font = `italic bold ${logoSz}px Palatino, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rg = ctx.createLinearGradient(0, logoY - logoSz * 0.55, 0, logoY + logoSz * 0.55);
  rg.addColorStop(0.00, '#ff2222'); rg.addColorStop(0.20, '#ff8800');
  rg.addColorStop(0.40, '#ffee00'); rg.addColorStop(0.60, '#22cc44');
  rg.addColorStop(0.80, '#2255ff'); rg.addColorStop(1.00, '#8822ff');
  ctx.fillStyle = rg;
  ctx.fillText('VistiOS', W / 2, logoY);
  ctx.restore();

  // Rainbow underline bar
  const barY = logoY + logoSz * 0.66;
  const barW = logoSz * 2.9;
  const barG = ctx.createLinearGradient(W/2 - barW/2, 0, W/2 + barW/2, 0);
  barG.addColorStop(0.0, 'rgba(255,34,34,0)');    barG.addColorStop(0.1, '#ff2222');
  barG.addColorStop(0.3, '#ffee00');               barG.addColorStop(0.5, '#22cc44');
  barG.addColorStop(0.7, '#2255ff');               barG.addColorStop(0.9, '#8822ff');
  barG.addColorStop(1.0, 'rgba(136,34,255,0)');
  ctx.fillStyle = barG;
  ctx.fillRect(W/2 - barW/2, barY, barW, 4);

  await wait(420);

  // Version + copyright text
  const infoSz = Math.max(11, Math.round(W * 0.016));
  ctx.font = `${infoSz}px 'Silkscreen', 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6677aa';
  const infoY = barY + 48;
  ctx.fillText('VistiOS Release 1.0, Revision 2026', W / 2, infoY);
  await wait(300);
  ctx.fillText('\u00A9 2026 Emil Visti. All Rights Reserved', W / 2, infoY + infoSz + 10);
  await wait(560);

  // Cursor + insert-disk prompt
  const promptY  = infoY + infoSz + 64;
  const cursorPath = new Path2D('M0 0L0 14L4 10L7 15L9 14L6 9L11 9Z');
  const CS   = 3; // cursor scale
  const curW = 11 * CS;
  const curH = 15 * CS;
  const curX = W / 2 - 180;

  function drawPrompt(yOff) {
    ctx.fillStyle = '#00001a';
    ctx.fillRect(curX - 2, promptY - 4, W - curX, curH + 14);
    ctx.save();
    ctx.translate(curX, promptY + yOff);
    ctx.scale(CS, CS);
    ctx.fillStyle = '#ff8800';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.6;
    ctx.fill(cursorPath);
    ctx.stroke(cursorPath);
    ctx.restore();
    ctx.font = `${Math.max(12, infoSz)}px 'Silkscreen', 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Insert Workbench disk in any drive', curX + curW + 14, promptY + Math.round(curH / 2) + yOff + 4);
  }

  let phase = 0, rafId = null;
  (function bobLoop() {
    phase += 0.065;
    drawPrompt(Math.round(Math.sin(phase) * 3));
    rafId = requestAnimationFrame(bobLoop);
  })();

  await wait(2100);
  cancelAnimationFrame(rafId);

  // Fade canvas out to match POST background
  await anim(380, t => {
    ctx.fillStyle = `rgba(0,18,68,${t})`;
    ctx.fillRect(0, 0, W, H);
  });
  canvas.style.display = 'none';

  // ── PHASE POST: hardware checks ────────────────────────────────────────
  screen.style.background = '#001244';
  post.style.display = 'block';

  let kb = 0;
  while (kb <= 8192) {
    if (mem) mem.innerHTML = `Memory check: <span class="highlight">${kb} KB</span>`;
    await wait(38);
    kb += 256;
  }
  if (scan)    { scan.style.visibility    = 'visible'; await wait(240); }
  if (chipset) { chipset.style.visibility = 'visible'; await wait(240); }
  if (drives)  { drives.style.visibility  = 'visible'; await wait(280); }
  if (load)    { load.style.visibility    = 'visible'; await wait(880); }

  await anim(420, t => { screen.style.opacity = String(1 - t); });
  screen.classList.remove('active');
  screen.style.opacity = '';
  canvas.style.display = 'block'; // reset for next reboot
}
