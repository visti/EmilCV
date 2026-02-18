import { escapeHtml, syncInputWidth } from './utils.js';
import { sizeWindowBody, registerWindow, guruMeditation } from './windows.js';

// --- Output helpers ---
function _basAppend(node) {
  const el = document.getElementById('basic-output');
  if (!el) return;
  el.appendChild(node);
  const body = el.closest('#basic-body');
  if (body) body.scrollTop = body.scrollHeight;
}

function basOut(s) {
  _basAppend(document.createTextNode(s + '\n'));
}

function basOutRaw(s) {
  _basAppend(document.createTextNode(s));
}

function basOutHtml(html) {
  const line = document.createElement('div');
  line.className = 'output-text';
  line.innerHTML = html;
  _basAppend(line);
}

function basOutMarked(s) {
  const re = /\[\[(.+?)\]\]/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    out += escapeHtml(s.slice(last, m.index));
    out += `<span class="highlight">${escapeHtml(m[1])}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(s.slice(last));
  basOutHtml(out);
}

function basCls() {
  const el = document.getElementById('basic-output');
  if (el) el.textContent = '';
}

// --- BASIC interpreter state ---
export const bas = {
  prog: {}, vars: {}, running: false, pc: 0,
  lines: [], callStack: [], forStack: [], whileStack: [],
  data: [], dataPtr: 0, inputResolve: null,
};

// --- Audio ---
let basAudioCtx = null;
function basBeep() {
  try {
    if (!basAudioCtx) basAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = basAudioCtx.createOscillator();
    const g = basAudioCtx.createGain();
    o.connect(g); g.connect(basAudioCtx.destination);
    o.frequency.value = 440; g.gain.value = 0.1;
    o.start(); o.stop(basAudioCtx.currentTime + 0.15);
  } catch {}
}

// --- Tokenizer ---
function basTok(src) {
  src = src.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  const t = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] === ' ' || src[i] === '\t') { i++; continue; }
    if (src[i] === '"') {
      let s = ''; i++;
      while (i < src.length && src[i] !== '"') s += src[i++];
      if (i < src.length) i++;
      t.push(['S', s]); continue;
    }
    if (/\d/.test(src[i]) || (src[i] === '.' && /\d/.test(src[i+1]||''))) {
      let n = '';
      while (i < src.length && /[\d.]/.test(src[i])) n += src[i++];
      t.push(['N', parseFloat(n)]); continue;
    }
    if (src[i] === "'" ) { break; } // comment
    const tw = src.slice(i, i+2);
    if (['<>', '<=', '>='].includes(tw)) { t.push(['O', tw]); i += 2; continue; }
    if ('+-*/^=<>(),;:'.includes(src[i])) { t.push(['O', src[i]]); i++; continue; }
    if (/[a-zA-Z]/.test(src[i])) {
      let id = '';
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) id += src[i++];
      if (i < src.length && (src[i] === '$' || src[i] === '%')) id += src[i++];
      t.push(['I', id.toUpperCase()]); continue;
    }
    i++;
  }
  return t;
}

// --- Expression Parser ---
class BasP {
  constructor(t) { this.t = t; this.p = 0; }
  pk() { return this.t[this.p] || null; }
  nx() { return this.t[this.p++] || null; }
  is(ty, v) { const t = this.pk(); return t && t[0] === ty && (v === undefined || t[1] === v); }
  eat(ty, v) { if (this.is(ty, v)) { this.p++; return true; } return false; }
  need(ty, v) { if (!this.eat(ty, v)) throw new Error('Expected ' + (v || ty)); }

  expr() { return this.bor(); }
  bor() {
    let l = this.band();
    while (this.is('I','OR')) { this.nx(); const r = this.band(); l = (l||r) ? -1 : 0; }
    return l;
  }
  band() {
    let l = this.bnot();
    while (this.is('I','AND')) { this.nx(); const r = this.bnot(); l = (l&&r) ? -1 : 0; }
    return l;
  }
  bnot() { if (this.eat('I','NOT')) return this.bnot() ? 0 : -1; return this.cmp(); }
  cmp() {
    let l = this.add();
    const ops = {'=':0,'<>':0,'<':0,'>':0,'<=':0,'>=':0};
    if (this.pk() && this.pk()[0]==='O' && this.pk()[1] in ops) {
      const op = this.nx()[1]; const r = this.add();
      if (op==='=') return l===r?-1:0; if (op==='<>') return l!==r?-1:0;
      if (op==='<') return l<r?-1:0;   if (op==='>') return l>r?-1:0;
      if (op==='<=') return l<=r?-1:0;  return l>=r?-1:0;
    }
    return l;
  }
  add() {
    let l = this.mul();
    while (this.is('O','+') || this.is('O','-')) {
      const op = this.nx()[1]; const r = this.mul();
      l = op==='+' ? (typeof l==='string'||typeof r==='string' ? String(l)+String(r) : l+r) : l-r;
    }
    return l;
  }
  mul() {
    let l = this.pw();
    while (this.is('O','*') || this.is('O','/') || this.is('I','MOD')) {
      const op = this.nx()[1]; const r = this.pw();
      if (op==='*') l=l*r; else if (op==='/') { if(r===0) throw new Error('Division by zero'); l=l/r; } else l=l%r;
    }
    return l;
  }
  pw() { let l = this.un(); if (this.eat('O','^')) l = Math.pow(l, this.un()); return l; }
  un() { if (this.eat('O','-')) return -this.un(); if (this.eat('O','+')) return this.un(); return this.at(); }
  at() {
    const t = this.pk();
    if (!t) throw new Error('Unexpected end');
    if (t[0]==='N') { this.nx(); return t[1]; }
    if (t[0]==='S') { this.nx(); return t[1]; }
    if (this.eat('O','(')) { const v = this.expr(); this.need('O',')'); return v; }
    if (t[0]==='I') {
      this.nx(); const n = t[1];
      if (this.eat('O','(')) {
        const a = [];
        if (!this.is('O',')')) { a.push(this.expr()); while (this.eat('O',',')) a.push(this.expr()); }
        this.need('O',')');
        return this.fn(n, a);
      }
      if (n==='RND') return Math.random();
      if (n==='TIMER') return Math.floor(Date.now()/1000);
      if (n==='PI') return Math.PI;
      return bas.vars[n] !== undefined ? bas.vars[n] : (n.endsWith('$') ? '' : 0);
    }
    throw new Error('Syntax error');
  }
  fn(n, a) {
    const f = {
      INT:()=>Math.floor(a[0]), ABS:()=>Math.abs(a[0]), SQR:()=>Math.sqrt(a[0]),
      SIN:()=>Math.sin(a[0]), COS:()=>Math.cos(a[0]), TAN:()=>Math.tan(a[0]),
      ATN:()=>Math.atan(a[0]), LOG:()=>Math.log(a[0]), EXP:()=>Math.exp(a[0]),
      SGN:()=>Math.sign(a[0]), RND:()=>Math.random()*(a[0]||1),
      LEN:()=>String(a[0]).length,
      'LEFT$':()=>String(a[0]).slice(0,a[1]),
      'RIGHT$':()=>String(a[0]).slice(-(a[1]||0)),
      'MID$':()=>String(a[0]).slice((a[1]||1)-1, a[2]?(a[1]||1)-1+a[2]:undefined),
      'CHR$':()=>String.fromCharCode(a[0]),
      ASC:()=>String(a[0]).charCodeAt(0)||0,
      'STR$':()=>String(a[0]),
      VAL:()=>parseFloat(a[0])||0,
      TAB:()=>' '.repeat(Math.max(0,Math.floor(a[0]))),
      PEEK:()=>Math.floor(Math.random()*256),
      'UCASE$':()=>String(a[0]).toUpperCase(),
      'LCASE$':()=>String(a[0]).toLowerCase(),
    };
    if (f[n]) return f[n]();
    throw new Error('Unknown function: ' + n);
  }
}

function basEval(toks, pos) {
  const p = new BasP(toks.slice(pos));
  const v = p.expr();
  return [v, pos + p.p];
}

// --- Block-level skip helpers ---
function basSkipIf(findElse) {
  let depth = 0;
  while (bas.pc < bas.lines.length) {
    const u = bas.prog[bas.lines[bas.pc]].trim().toUpperCase();
    if (/^IF\b/.test(u) && /\bTHEN\s*$/.test(u)) depth++;
    else if (/^ELSE\b/.test(u) && depth === 0 && findElse) { bas.pc++; return; }
    else if (/^END\s*IF\b/.test(u)) { if (depth === 0) { bas.pc++; return; } depth--; }
    bas.pc++;
  }
}

function basSkipWend() {
  let depth = 0;
  while (bas.pc < bas.lines.length) {
    const u = bas.prog[bas.lines[bas.pc]].trim().toUpperCase();
    if (/^WHILE\b/.test(u)) depth++;
    else if (/^WEND\b/.test(u)) { if (depth === 0) { bas.pc++; return; } depth--; }
    bas.pc++;
  }
}

// --- Statement execution ---
async function basExecStmt(toks, pos) {
  if (pos >= toks.length) return pos;
  const t = toks[pos];

  if (t[0] === 'I' && t[1] === 'REM') return toks.length;

  // PRINT
  if (t[0] === 'I' && t[1] === 'PRINT') {
    pos++;
    let out = '', nl = true;
    while (pos < toks.length && !(toks[pos][0]==='O' && toks[pos][1]===':')) {
      if (toks[pos][0]==='O' && toks[pos][1]===';') { nl = false; pos++; continue; }
      if (toks[pos][0]==='O' && toks[pos][1]===',') { out += '\t'; nl = false; pos++; continue; }
      const [v, np] = basEval(toks, pos); pos = np;
      out += (v == null) ? '' : String(v);
      nl = true;
    }
    if (nl) basOut(out); else basOutRaw(out);
    return pos;
  }

  // INPUT
  if (t[0] === 'I' && t[1] === 'INPUT') {
    pos++;
    let prompt = '';
    if (toks[pos] && toks[pos][0] === 'S') {
      prompt = toks[pos][1]; pos++;
      if (toks[pos] && toks[pos][0] === 'O' && (toks[pos][1]===';'||toks[pos][1]===',')) pos++;
    }
    if (!toks[pos] || toks[pos][0] !== 'I') throw new Error('Expected variable');
    const vn = toks[pos][1]; pos++;
    basOutRaw(prompt + '? ');
    const val = await new Promise(r => { bas.inputResolve = r; });
    bas.vars[vn] = vn.endsWith('$') ? val : (parseFloat(val) || 0);
    return pos;
  }

  // LET
  if (t[0] === 'I' && t[1] === 'LET') {
    pos++;
    if (!toks[pos] || toks[pos][0] !== 'I') throw new Error('Expected variable');
    const vn = toks[pos][1]; pos++;
    if (!toks[pos] || toks[pos][1] !== '=') throw new Error('Expected =');
    pos++;
    const [v, np] = basEval(toks, pos);
    bas.vars[vn] = v;
    return np;
  }

  // Single-line IF: IF expr THEN stmt [ELSE stmt]
  if (t[0] === 'I' && t[1] === 'IF') {
    pos++;
    let thenPos = -1;
    for (let i = pos; i < toks.length; i++) {
      if (toks[i][0] === 'I' && toks[i][1] === 'THEN') { thenPos = i; break; }
    }
    if (thenPos === -1) throw new Error('IF without THEN');
    const condToks = toks.slice(pos, thenPos);
    const cond = new BasP(condToks).expr();
    pos = thenPos + 1;
    if (pos >= toks.length) return pos; // multi-line handled at block level

    // Check if after THEN is a line number (GOTO shorthand)
    if (toks[pos][0] === 'N') {
      if (cond) {
        const ln = toks[pos][1];
        const idx = bas.lines.indexOf(ln);
        if (idx === -1) throw new Error('Undefined line ' + ln);
        bas.pc = idx;
      }
      return toks.length;
    }

    // Find ELSE at same nesting level
    let elsePos = -1;
    for (let i = pos; i < toks.length; i++) {
      if (toks[i][0] === 'I' && toks[i][1] === 'ELSE') { elsePos = i; break; }
    }

    if (cond) {
      const end = elsePos !== -1 ? elsePos : toks.length;
      while (pos < end) {
        if (toks[pos][0]==='O' && toks[pos][1]===':') { pos++; continue; }
        pos = await basExecStmt(toks, pos);
      }
    } else if (elsePos !== -1) {
      pos = elsePos + 1;
      while (pos < toks.length) {
        if (toks[pos][0]==='O' && toks[pos][1]===':') { pos++; continue; }
        pos = await basExecStmt(toks, pos);
      }
    }
    return toks.length;
  }

  // FOR var = start TO end [STEP step]
  if (t[0] === 'I' && t[1] === 'FOR') {
    pos++;
    if (!toks[pos] || toks[pos][0] !== 'I') throw new Error('Expected variable');
    const vn = toks[pos][1]; pos++;
    if (!toks[pos] || toks[pos][1] !== '=') throw new Error('Expected =');
    pos++;
    const [sv, np1] = basEval(toks, pos); pos = np1;
    if (!toks[pos] || toks[pos][1] !== 'TO') throw new Error('Expected TO');
    pos++;
    const [ev, np2] = basEval(toks, pos); pos = np2;
    let step = 1;
    if (toks[pos] && toks[pos][0]==='I' && toks[pos][1]==='STEP') {
      pos++;
      const [stv, np3] = basEval(toks, pos); step = stv; pos = np3;
    }
    bas.vars[vn] = sv;
    bas.forStack.push({ v: vn, end: ev, step, line: bas.pc });
    return pos;
  }

  // NEXT
  if (t[0] === 'I' && t[1] === 'NEXT') {
    pos++;
    if (toks[pos] && toks[pos][0]==='I') pos++; // skip optional var name
    if (bas.forStack.length === 0) throw new Error('NEXT without FOR');
    const f = bas.forStack[bas.forStack.length - 1];
    bas.vars[f.v] += f.step;
    const done = f.step > 0 ? bas.vars[f.v] > f.end : bas.vars[f.v] < f.end;
    if (!done) { bas.pc = f.line; } else { bas.forStack.pop(); }
    return pos;
  }

  // GOTO
  if (t[0] === 'I' && t[1] === 'GOTO') {
    pos++;
    const [ln] = basEval(toks, pos);
    const idx = bas.lines.indexOf(ln);
    if (idx === -1) throw new Error('Undefined line ' + ln);
    bas.pc = idx;
    return toks.length;
  }

  // GOSUB
  if (t[0] === 'I' && t[1] === 'GOSUB') {
    pos++;
    const [ln] = basEval(toks, pos);
    const idx = bas.lines.indexOf(ln);
    if (idx === -1) throw new Error('Undefined line ' + ln);
    bas.callStack.push(bas.pc);
    bas.pc = idx;
    return toks.length;
  }

  // RETURN
  if (t[0]==='I' && t[1]==='RETURN') {
    if (bas.callStack.length === 0) throw new Error('RETURN without GOSUB');
    bas.pc = bas.callStack.pop();
    return toks.length;
  }

  // END / STOP
  if (t[0]==='I' && (t[1]==='END'||t[1]==='STOP')) { bas.running = false; return toks.length; }

  // CLS
  if (t[0]==='I' && t[1]==='CLS') { basCls(); return pos + 1; }

  // BEEP
  if (t[0]==='I' && t[1]==='BEEP') { basBeep(); return pos + 1; }

  // SLEEP
  if (t[0]==='I' && t[1]==='SLEEP') {
    pos++;
    const [s] = basEval(toks, pos);
    await new Promise(r => setTimeout(r, Math.min(s * 1000, 10000)));
    return toks.length;
  }

  // DIM / DATA — no-op at runtime
  if (t[0]==='I' && (t[1]==='DIM'||t[1]==='DATA')) return toks.length;

  // READ var [, var...]
  if (t[0]==='I' && t[1]==='READ') {
    pos++;
    while (pos < toks.length) {
      if (!toks[pos] || toks[pos][0] !== 'I') break;
      const vn = toks[pos][1]; pos++;
      if (bas.dataPtr >= bas.data.length) throw new Error('Out of DATA');
      bas.vars[vn] = bas.data[bas.dataPtr++];
      if (toks[pos] && toks[pos][0]==='O' && toks[pos][1]===',') pos++;
      else break;
    }
    return pos;
  }

  // RESTORE
  if (t[0]==='I' && t[1]==='RESTORE') { bas.dataPtr = 0; return pos + 1; }

  // POKE — no-op
  if (t[0]==='I' && t[1]==='POKE') return toks.length;

  // Assignment: var = expr
  if (t[0]==='I' && pos+1 < toks.length && toks[pos+1][0]==='O' && toks[pos+1][1]==='=') {
    const vn = t[1]; pos += 2;
    const [v, np] = basEval(toks, pos);
    bas.vars[vn] = v;
    return np;
  }

  throw new Error('Syntax error');
}

async function basExecLine(src) {
  const toks = basTok(src);
  let pos = 0;
  while (pos < toks.length) {
    if (toks[pos][0]==='O' && toks[pos][1]===':') { pos++; continue; }
    pos = await basExecStmt(toks, pos);
  }
}

// --- Data collection ---
function basCollectData() {
  bas.data = []; bas.dataPtr = 0;
  for (const ln of bas.lines) {
    const src = bas.prog[ln].trim();
    if (/^DATA\b/i.test(src)) {
      src.slice(4).split(',').forEach(v => {
        v = v.trim();
        if (v.startsWith('"') && v.endsWith('"')) bas.data.push(v.slice(1,-1));
        else bas.data.push(isNaN(v) ? v : parseFloat(v));
      });
    }
  }
}

// --- Program run ---
async function basRun() {
  bas.lines = Object.keys(bas.prog).map(Number).sort((a,b) => a-b);
  bas.pc = 0; bas.running = true;
  bas.callStack = []; bas.forStack = []; bas.whileStack = [];
  bas.vars = {};
  basCollectData();
  let cycles = 0;

  while (bas.running && bas.pc < bas.lines.length) {
    const lineNum = bas.lines[bas.pc];
    const src = bas.prog[lineNum].trim();
    const upper = src.toUpperCase();
    bas.pc++;

    try {
      // Block-level: multi-line IF
      if (/^IF\b/.test(upper) && /\bTHEN\s*$/.test(upper)) {
        const condSrc = src.substring(
          src.search(/^if\b/i) + 2,
          src.search(/\bthen\s*$/i)
        ).trim();
        const cond = new BasP(basTok(condSrc)).expr();
        if (!cond) basSkipIf(true);
        continue;
      }
      if (/^ELSE\b/.test(upper)) { basSkipIf(false); continue; }
      if (/^END\s*IF\b/.test(upper)) continue;

      // Block-level: WHILE/WEND
      if (/^WHILE\b/.test(upper)) {
        const condSrc = src.slice(5).trim();
        const cond = new BasP(basTok(condSrc)).expr();
        const idx = bas.pc - 1;
        if (cond) {
          if (!bas.whileStack.length || bas.whileStack[bas.whileStack.length-1] !== idx)
            bas.whileStack.push(idx);
        } else {
          if (bas.whileStack.length && bas.whileStack[bas.whileStack.length-1] === idx)
            bas.whileStack.pop();
          basSkipWend();
        }
        continue;
      }
      if (/^WEND\b/.test(upper)) {
        if (!bas.whileStack.length) throw new Error('WEND without WHILE');
        bas.pc = bas.whileStack[bas.whileStack.length-1];
        continue;
      }

      // Regular statement
      await basExecLine(src);

    } catch(e) {
      basOut('?' + e.message + ' in ' + lineNum);
      bas.running = false;
    }

    if (++cycles % 100 === 0) await new Promise(r => setTimeout(r, 0));
    if (cycles > 3000) {
      basOut('?Out of memory in ' + bas.lines[bas.pc - 1]);
      bas.running = false;
      guruMeditation();
    }
  }
  bas.running = false;
}

// --- Input handler ---
export async function basHandleInput(text) {
  if (bas.inputResolve) {
    basOut(text);
    const r = bas.inputResolve;
    bas.inputResolve = null;
    r(text);
    return;
  }

  // Adventure engine intercept
  if (adv.active) { advHandleInput(text); return; }

  const trimmed = text.trim();
  if (!trimmed) { basOut('Ok'); return; }

  basOut(text);
  const m = trimmed.match(/^(\d+)\s*(.*)/);
  if (m) {
    const num = parseInt(m[1]);
    if (m[2] === '') delete bas.prog[num];
    else bas.prog[num] = m[2];
    basOut('Ok');
    return;
  }

  const upper = trimmed.toUpperCase();

  if (upper === 'RUN') { await basRun(); basOut('Ok'); return; }

  if (upper.startsWith('LIST')) {
    const lines = Object.keys(bas.prog).map(Number).sort((a,b) => a-b);
    lines.forEach(n => basOut(n + ' ' + bas.prog[n]));
    basOut('Ok'); return;
  }

  if (upper === 'NEW') { bas.prog = {}; bas.vars = {}; basOut('Ok'); return; }

  if (upper === 'HELP') {
    basOutMarked('Commands: PRINT, LET, INPUT, IF/THEN/ELSE/END IF');
    basOutMarked('FOR/NEXT, WHILE/WEND, GOTO, GOSUB/RETURN');
    basOutMarked('CLS, BEEP, SLEEP, READ, DATA, DIM');
    basOutMarked('RUN, LIST, NEW, REM, END, SKILLS, [[QUEST]]');
    basOut('');
    basOutMarked('Type line numbers to store a program:');
    basOutMarked('  [[10 PRINT "Hello, World!"]]');
    basOutMarked('  [[20 GOTO 10]]');
    basOutMarked('  [[RUN]]');
    basOut('Ok'); return;
  }

  if (upper === 'SKILLS') {
    basOut('=== Skills ===');
    basOutMarked('Languages:  [[SQL]], [[Python]], [[Bash]], [[Lua]]');
    basOutMarked('Tools:      [[SSMS]], [[Access]], [[Navision]], [[Excel]], [[PowerBI]]');
    basOutMarked('Data:       [[Pandas]], [[Matplotlib]], [[visualization]]');
    basOutMarked('Systems:    [[Unix]] & [[Windows]] sysadmin');
    basOutMarked('Creative:   [[Photoshop]], [[Premiere]], [[Ableton]]');
    basOutMarked('Other:      [[Metadata standards]], [[digitization]]');
    basOutMarked('            [[Studio technician]] (music)');
    basOut('Speaks:     Danish, English');
    basOut('Ok'); return;
  }

  if (upper === 'QUEST') {
    advStart(); return;
  }

  try {
    await basExecLine(trimmed);
    basOut('Ok');
  } catch(e) {
    basOut('?' + e.message);
    basOut('Ok');
  }
}

// --- Adventure Engine ---
export const adv = {
  active: false,
  data: null,
  room: null,
  inventory: [],
  flags: new Set(),
  visited: new Set()
};

function escRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightLookTargets(text, looks) {
  let html = escapeHtml(text);
  const keys = Object.keys(looks || {}).sort((a, b) => b.length - a.length);
  keys.forEach((k) => {
    const re = new RegExp(`\\b${escRe(k)}\\b`, 'gi');
    html = html.replace(re, (m) => `<span class="adv-look">${escapeHtml(m)}</span>`);
  });
  return html;
}

function advLookOut(text) {
  basOutHtml(`<span class="adv-look-output">${escapeHtml(text)}</span>`);
}

const advMusic = new Audio('/music/music.mp3');
advMusic.loop = true;
advMusic.volume = 0.4;

function advMusicStart() {
  advMusic.currentTime = 0;
  advMusic.play().catch(() => {});
}

export function advMusicStop() {
  advMusic.pause();
  advMusic.currentTime = 0;
}

async function advStart() {
  try {
    const res = await fetch('/game/game.json');
    if (!res.ok) { basOut('?Game data not found'); return; }
    adv.data = await res.json();
    adv.inventory = [];
    adv.flags = new Set();
    adv.visited = new Set();
    adv.room = adv.data.start;
    adv.active = true;
    basCls();
    basOut('=== ADVENTURE ===');
    basOut('Type HELP for commands.');
    basOut('');
    advLook();
    advMusicStart();
  } catch(e) { basOut('?Failed to load adventure'); }
}

function advLook() {
  const rm = adv.data.rooms[adv.room];
  if (!rm) { basOut('?Room not found: ' + adv.room); return; }
  basOutHtml(`<span class="adv-room">--- ${escapeHtml(rm.title)} ---</span>`);
  basOutHtml(highlightLookTargets(rm.desc, rm.looks));
  // Show visible items (not hidden or already taken)
  const visible = Object.keys(rm.items).filter(id => {
    if (adv.inventory.includes(id)) return false;
    if (rm.hidden && rm.hidden[id] && !adv.flags.has(rm.hidden[id])) return false;
    return true;
  });
  if (visible.length) {
    basOutHtml('You see: ' + visible.map(id => `<span class="adv-item">${escapeHtml(id.toUpperCase())}</span>`).join(', '));
  }
  const lookTargets = Object.keys(rm.looks || {});
  if (lookTargets.length) {
    basOutHtml('Look at: ' + lookTargets.map(id => `<span class="adv-look">${escapeHtml(id.toUpperCase())}</span>`).join(', '));
  }
  const exits = Object.keys(rm.exits);
  if (exits.length) {
    basOutHtml('Exits: ' + exits.map(d => `<span class="adv-dir">${escapeHtml(d)}</span>`).join(', '));
  }
  adv.visited.add(adv.room);
}

function advHandleInput(text) {
  const raw = text.trim();
  if (!raw) return;
  basOut(raw);
  const parts = raw.toUpperCase().split(/\s+/);
  let verb = parts[0];
  let noun = parts.slice(1).join(' ');

  const dirMap = { N:'NORTH', S:'SOUTH', E:'EAST', W:'WEST', U:'UP', D:'DOWN' };
  const dirs = ['NORTH','SOUTH','EAST','WEST','UP','DOWN'];

  // Direction shortcuts
  if (dirMap[verb]) verb = dirMap[verb];
  if (dirs.includes(verb) && !noun) { noun = verb; verb = 'GO'; }
  if (verb === 'GO' && dirMap[noun]) noun = dirMap[noun];

  const rm = adv.data.rooms[adv.room];

  if (verb === 'EXAMINE' || verb === 'X') verb = 'LOOK';

  if (verb === 'HELP') {
    basOut('Commands: LOOK, GO, GET, DROP, USE, INVENTORY, SCORE');
    basOut('LOOK AT <thing> also works (or EXAMINE <thing>).');
    basOut('Directions: NORTH/S/E/W/UP/DOWN (or N/S/E/W/U/D)');
    basOut('SAVE, RESTORE, QUIT');
    return;
  }

  if (verb === 'QUIT' || verb === 'EXIT') {
    adv.active = false;
    advMusicStop();
    basOut('Returning to BASIC...');
    basOut('Ok');
    return;
  }

  if (verb === 'LOOK' || verb === 'L') {
    if (!noun) { advLook(); return; }
    const nLower = noun.replace(/^AT\s+/i, '').toLowerCase();
    if (rm.looks && rm.looks[nLower]) { advLookOut(rm.looks[nLower]); return; }
    if (rm.items[nLower] && !adv.inventory.includes(nLower)) { advLookOut(rm.items[nLower]); return; }
    if (adv.inventory.includes(nLower)) {
      for (const r of Object.values(adv.data.rooms)) {
        if (r.items[nLower]) { advLookOut(r.items[nLower]); return; }
      }
      basOut('You have it.'); return;
    }
    basOut("You don't see that here."); return;
  }

  if (verb === 'GO') {
    if (!noun || !dirs.includes(noun)) { basOut('Go where?'); return; }
    if (!rm.exits[noun]) { basOut("You can't go that way."); return; }
    if (rm.needflags && rm.needflags[noun]) {
      if (!adv.flags.has(rm.needflags[noun].flag)) { basOut(rm.needflags[noun].msg); return; }
    }
    if (rm.needs && rm.needs[noun]) {
      const need = rm.needs[noun];
      if (!adv.inventory.includes(need.item)) { basOut(need.msg); return; }
      if (rm.consumes && rm.consumes[noun]) {
        adv.inventory = adv.inventory.filter(i => i !== need.item);
        basOut('(Used ' + need.item + ')');
      }
    }
    adv.room = rm.exits[noun];
    advLook();
    return;
  }

  if (verb === 'GET' || verb === 'TAKE') {
    if (!noun) { basOut('Get what?'); return; }
    const nLower = noun.toLowerCase();
    if (adv.inventory.includes(nLower)) { basOut('You already have it.'); return; }
    if (!rm.items[nLower]) { basOut("You don't see that here."); return; }
    if (rm.hidden && rm.hidden[nLower] && !adv.flags.has(rm.hidden[nLower])) { basOut("You don't see that here."); return; }
    adv.inventory.push(nLower);
    basOut('Taken.');
    return;
  }

  if (verb === 'DROP') {
    if (!noun) { basOut('Drop what?'); return; }
    const nLower = noun.toLowerCase();
    if (!adv.inventory.includes(nLower)) { basOut("You don't have that."); return; }
    adv.inventory = adv.inventory.filter(i => i !== nLower);
    if (!rm.items[nLower]) {
      for (const r of Object.values(adv.data.rooms)) {
        if (r.items[nLower]) { rm.items[nLower] = r.items[nLower]; break; }
      }
    }
    basOut('Dropped.');
    return;
  }

  if (verb === 'USE') {
    if (!noun) { basOut('Use what?'); return; }
    const onIdx = noun.indexOf(' ON ');
    let item, target;
    if (onIdx !== -1) {
      item = noun.slice(0, onIdx).toLowerCase();
      target = noun.slice(onIdx + 4).toLowerCase();
    } else {
      item = noun.toLowerCase();
      target = null;
    }
    if (!adv.inventory.includes(item)) { basOut("You don't have that."); return; }
    if (target && rm.uses && rm.uses[item + ':' + target]) {
      basOut(rm.uses[item + ':' + target]);
      if (rm.flags && rm.flags[item]) adv.flags.add(rm.flags[item]);
      return;
    }
    if (rm.flags && rm.flags[item]) {
      adv.flags.add(rm.flags[item]);
      basOut('Used ' + item + '.');
      return;
    }
    basOut("You can't use that here.");
    return;
  }

  if (verb === 'INVENTORY' || verb === 'I') {
    if (!adv.inventory.length) { basOut('You are empty-handed.'); return; }
    basOut('You are carrying:');
    adv.inventory.forEach(i => basOut('  ' + i));
    return;
  }

  if (verb === 'SCORE') {
    const winRoom = adv.data.winRoom || 'hall';
    const treasures = new Set(adv.data.treasures || []);
    const treasureCount = adv.inventory.filter(i => treasures.has(i)).length;
    const visitPoints = adv.visited.size * 5;
    const flagPoints = adv.flags.size * 10;
    const treasurePoints = treasureCount * 20;
    const winBonus = adv.visited.has(winRoom) ? 50 : 0;
    const score = visitPoints + flagPoints + treasurePoints + winBonus;
    basOut('Score: ' + score);
    basOut('  Rooms explored: ' + adv.visited.size + ' (' + visitPoints + ')');
    basOut('  Puzzles solved: ' + adv.flags.size + ' (' + flagPoints + ')');
    basOut('  Treasures carried: ' + treasureCount + ' (' + treasurePoints + ')');
    if (winBonus) basOut('  Victory bonus: ' + winBonus);
    return;
  }

  if (verb === 'SAVE') {
    const state = { room: adv.room, inv: adv.inventory, flags: [...adv.flags], visited: [...adv.visited] };
    const code = btoa(JSON.stringify(state));
    basOut('Save code: ' + code);
    return;
  }

  if (verb === 'RESTORE') {
    if (!noun) { basOut('RESTORE <code>'); return; }
    try {
      const state = JSON.parse(atob(parts.slice(1).join('')));
      adv.room = state.room;
      adv.inventory = state.inv || [];
      adv.flags = new Set(state.flags || []);
      adv.visited = new Set(state.visited || []);
      basOut('Restored.');
      advLook();
    } catch(e) { basOut('?Invalid save code'); }
    return;
  }

  basOut("I don't understand that. Type HELP for commands.");
}

// --- BASIC UI ---
export function basInit() {
  const input = document.getElementById('basic-input');
  if (!input) return;
  basOut('AmigaBASIC v3.4');
  basOut('(c) 2026 Workbench Edition');
  basOut('32768 bytes free');
  basOutMarked('Use [[HELP]] for a list of commands');
  basOut('Ok');

  input.addEventListener('input', () => syncInputWidth(input));
  input.addEventListener('keydown', (e) => {
    if ((e.key === 'c' && (e.ctrlKey || e.metaKey)) || e.key === 'Escape') {
      if (bas.running) {
        e.preventDefault();
        bas.running = false;
        basOut('Break');
        basOut('Ok');
        return;
      }
    }
    if (e.key === 'Enter') {
      const text = input.value;
      input.value = '';
      syncInputWidth(input);
      basHandleInput(text);
    }
  });
  document.getElementById('basic-body')?.addEventListener('click', () => input.focus());
}

export function sizeBasicBody() {
  const win = document.getElementById('basic-window');
  if (win?.style.display === 'none') return;
  sizeWindowBody('basic-window', 'basic-body', 4, 100);
}

export const toggleBasicWindow = registerWindow('basic-window', 'basic-icon', 'basic-close', 480, 380, () => {
  document.getElementById('basic-input')?.focus();
});

// Stop adventure music when basic window is closed
document.getElementById('basic-close')?.addEventListener('click', () => {
  if (adv.active) { adv.active = false; advMusicStop(); }
});
