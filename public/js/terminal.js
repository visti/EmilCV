import { syncInputWidth } from './utils.js';
import { playSlide } from './sound.js';
import { guruMeditation } from './windows.js';

// gsap is a CDN global

export const htermState = {
  open: false,
  history: [],
  histIdx: -1,
  pageLoad: Date.now(),
  timers: [],
  raf: 0
};

export const htermOutput = document.getElementById('hterm-output');
export const htermInput = document.getElementById('hterm-input');
export const wbContainer = document.getElementById('wb-container');
export const htermScreen = document.getElementById('hterm-screen');

function htermPrint(text, cls = 'hterm-info') {
  const div = document.createElement('div');
  div.className = 'hterm-line';
  if (cls) div.innerHTML = `<span class="${cls}">${text}</span>`;
  else div.innerHTML = text;
  htermOutput.appendChild(div);
  htermOutput.scrollTop = htermOutput.scrollHeight;
}

function htermClear() {
  htermOutput.innerHTML = '';
}

function htermCancelTimers() {
  htermState.timers.forEach(t => clearTimeout(t));
  htermState.timers = [];
  if (htermState.raf) { cancelAnimationFrame(htermState.raf); htermState.raf = 0; }
}

export function htermToggle() {
  htermState.open = !htermState.open;
  playSlide();
  if (htermState.open) {
    htermScreen.classList.remove('behind');
    htermScreen.classList.add('visible');
    wbContainer.classList.add('slid-down');
    gsap.to(wbContainer, {
      y: window.innerHeight - 24,
      duration: 0.9,
      ease: 'back.out(3)',
      onComplete: () => htermInput.focus()
    });
  } else {
    htermScreen.classList.add('behind');
    wbContainer.classList.remove('slid-down');
    gsap.to(wbContainer, {
      y: 0,
      duration: 0.65,
      ease: 'back.in(2)',
      onComplete: () => {
        htermScreen.classList.remove('visible', 'behind');
      }
    });
    htermCancelTimers();
  }
}

// Depth gadget listeners
document.getElementById('wb-depth-back')?.addEventListener('click', htermToggle);
document.getElementById('hterm-depth-front')?.addEventListener('click', htermToggle);
document.getElementById('hterm-depth-back')?.addEventListener('click', htermToggle);
// Click the visible sliver of workbench bar to pull it back up
document.querySelector('.wb-screen-bar')?.addEventListener('click', (e) => {
  if (htermState.open && !e.target.closest('.gadget')) htermToggle();
});

const htermFortunes = [
  '"There are only two hard things in CS: cache invalidation, naming things, and off-by-one errors."',
  '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke',
  '"It works on my machine." — Every developer ever',
  '"The best code is no code at all." — Jeff Atwood',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"Premature optimization is the root of all evil." — Donald Knuth',
  '"Programming is the art of telling another human what one wants the computer to do." — Donald Knuth',
  '"The most disastrous thing that you can ever learn is your first programming language." — Alan Kay',
  '"In theory, there is no difference between theory and practice. In practice, there is." — Yogi Berra',
];

export function htermExec(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  htermState.history.push(trimmed);
  htermState.histIdx = htermState.history.length;

  // Echo the command
  htermPrint(`<span class="hterm-prompt-echo">guest@vistios:~$</span> <span class="hterm-cmd">${trimmed}</span>`, null);

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (cmd) {
    case 'help': {
      const helpSections = [
        ['ABOUT', [
          ['whoami',     'Who are you?'],
          ['neofetch',   'System specs'],
          ['uname',      'System information'],
        ]],
        ['FILES', [
          ['ls',         'List files'],
          ['cat &lt;file&gt;', 'Read a file'],
          ['pwd',        'Working directory'],
          ['cd &lt;dir&gt;',  'Change directory'],
        ]],
        ['SYSTEM', [
          ['date',       'Current date &amp; time'],
          ['uptime',     'Time since page load'],
          ['top',        'Process list'],
          ['history',    'Command history'],
          ['clear',      'Clear screen'],
          ['exit',       'Return to Workbench'],
        ]],
        ['TOOLS', [
          ['echo &lt;text&gt;','Echo text back'],
          ['ping &lt;host&gt;','Ping a host'],
          ['curl &lt;url&gt;', 'Fetch a URL'],
          ['man &lt;cmd&gt;', 'Manual page'],
          ['sudo &lt;cmd&gt;','Run as root'],
        ]],
        ['FUN', [
          ['fortune',    'Random quote'],
          ['cowsay &lt;msg&gt;','Cow says...'],
          ['hack',       'Hack the Gibson'],
          ['matrix',     'Follow the white rabbit'],
          ['rm -rf /',   'Don\'t do it'],
        ]],
      ];
      htermPrint('<span class="hterm-accent">╔══════════════════════════════════════╗</span>', null);
      htermPrint('<span class="hterm-accent">║</span>     VistiOS CLI — Help Menu          <span class="hterm-accent">║</span>', null);
      htermPrint('<span class="hterm-accent">╚══════════════════════════════════════╝</span>', null);
      htermPrint('');
      helpSections.forEach(([title, cmds]) => {
        htermPrint(`<span class="hterm-accent">── ${title} ${'─'.repeat(33 - title.length)}</span>`, null);
        cmds.forEach(([c, d]) => {
          const padded = c.padEnd(16);
          htermPrint(`  <span class="hterm-cmd">${padded}</span><span class="hterm-info">${d}</span>`, null);
        });
        htermPrint('');
      });
      break;
    }

    case 'whoami':
      htermPrint('Emil Visti');
      htermPrint('Data Specialist @ Gramex, Copenhagen');
      htermPrint('Turning data into something useful since 2017.');
      break;

    case 'ls':
      htermPrint('readme.txt    about.txt    skills.dat', 'hterm-accent');
      htermPrint('secrets/      .hidden_message', 'hterm-accent');
      break;

    case 'cat':
      if (!args) { htermPrint('cat: missing file operand', 'hterm-error'); break; }
      switch (args.toLowerCase()) {
        case 'readme.txt':
          htermPrint('=== README ===', 'hterm-accent');
          htermPrint('This site is a love letter to the Commodore Amiga.');
          htermPrint('Built with HTML, CSS, and vanilla JS.');
          htermPrint('No frameworks were harmed in the making of this page.');
          htermPrint('The VistiOS Workbench aesthetic is recreated from memory');
          htermPrint('and screenshots — every pixel placed with care.');
          break;
        case 'about.txt':
          htermPrint('=== ABOUT ===', 'hterm-accent');
          htermPrint('Emil Visti — Data Specialist at Gramex');
          htermPrint('Working with SQL, Python, and data pipelines.');
          htermPrint('Making sense of media metadata and broadcast data.');
          htermPrint('Also: music production, retro computing, game dev.');
          break;
        case 'skills.dat':
          htermPrint('RECORD FORMAT: FIXED RECL=80', 'hterm-accent');
          htermPrint('-----------------------------------');
          htermPrint('FIELD  SKILL              LEVEL');
          htermPrint('-----------------------------------');
          htermPrint('001    SQL                ████████████████ 95');
          htermPrint('002    Python             ██████████████   85');
          htermPrint('003    Bash               ████████████     75');
          htermPrint('004    Data Viz           █████████████    80');
          htermPrint('005    Excel/PowerBI      ██████████████   85');
          htermPrint('006    Lua                ████████         50');
          htermPrint('007    Photoshop          ███████████      70');
          htermPrint('008    Music Production   █████████████    80');
          htermPrint('-----------------------------------');
          htermPrint('END OF RECORD');
          break;
        case '.hidden_message':
          htermPrint('"Two possibilities exist: either we are alone in the', 'hterm-accent');
          htermPrint(' Universe or we are not. Both are equally terrifying."', 'hterm-accent');
          htermPrint(' — Arthur C. Clarke');
          htermPrint('');
          htermPrint('You have good instincts. Keep exploring.');
          break;
        default:
          htermPrint(`cat: ${args}: No such file or directory`, 'hterm-error');
      }
      break;

    case 'pwd':
      htermPrint('/home/guest/workbench');
      break;

    case 'cd':
      if (args.toLowerCase().includes('secret')) {
        htermPrint('cd: secrets/: Permission denied', 'hterm-error');
      } else {
        htermPrint(`cd: ${args || '~'}: Not a real filesystem, sorry!`, 'hterm-error');
      }
      break;

    case 'date':
      htermPrint(new Date().toString());
      break;

    case 'uptime': {
      const since = new Date('1993-01-01T00:00:00Z');
      const now = new Date();
      let yrs = now.getFullYear() - since.getFullYear();
      let mos = now.getMonth() - since.getMonth();
      let days = now.getDate() - since.getDate();
      if (days < 0) { mos--; days += 30; }
      if (mos < 0) { yrs--; mos += 12; }
      htermPrint(`up ${yrs} years, ${mos} months, ${days} days`);
      htermPrint('1 user, load average: 0.68, 0.42, 0.13');
      htermPrint('online since January 1, 1993. no reboots.');
      break;
    }

    case 'uname':
      htermPrint('VistiOS 3.1  68030 @ 25MHz  A1200  Kickstart 40.68');
      break;

    case 'neofetch': {
      const r = '#ff0000', o = '#ff8800', y = '#ffcc00', g = '#33cc33', b = '#0088ff', p = '#8833cc';
      const neoArt = [
        `                <span style="color:${r}">██</span>`,
        `               <span style="color:${r}">██</span><span style="color:${o}">██</span>`,
        `              <span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span>`,
        `             <span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span><span style="color:${g}">██</span>`,
        `            <span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span><span style="color:${g}">██</span>`,
        `           <span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span><span style="color:${g}">██</span>`,
        `  <span style="color:${g}">██</span>      <span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span><span style="color:${g}">██</span>`,
        `  <span style="color:${g}">██</span><span style="color:${b}">██</span>   <span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span><span style="color:${g}">██</span>`,
        `  <span style="color:${g}">██</span><span style="color:${b}">██</span><span style="color:${p}">██</span><span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span><span style="color:${g}">██</span>`,
        `   <span style="color:${b}">██</span><span style="color:${p}">██</span><span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span><span style="color:${g}">██</span>`,
        `    <span style="color:${p}">██</span><span style="color:${r}">██</span><span style="color:${o}">██</span><span style="color:${y}">██</span>`,
        `     <span style="color:${r}">██</span><span style="color:${o}">██</span>`,
      ];
      const neoInfo = [
        '<span class="hterm-accent">guest</span>@<span class="hterm-accent">vistios</span>',
        '─────────────',
        `<span class="hterm-accent">OS:</span> VistiOS 3.1`,
        `<span class="hterm-accent">Host:</span> Commodore A1200`,
        `<span class="hterm-accent">Kernel:</span> Kickstart 40.68`,
        `<span class="hterm-accent">CPU:</span> MC68030 @ 25MHz`,
        `<span class="hterm-accent">RAM:</span> 2MB Chip + 8MB Fast`,
        `<span class="hterm-accent">GPU:</span> AGA (HAM8)`,
        `<span class="hterm-accent">Shell:</span> CLI 1.0`,
        `<span class="hterm-accent">Uptime:</span> ${new Date().getFullYear() - 1993} years`,
        '',
        '<span style="color:#ff0000">███</span><span style="color:#ff8800">███</span><span style="color:#ffcc00">███</span><span style="color:#33cc33">███</span><span style="color:#0088ff">███</span><span style="color:#8833cc">███</span>',
      ];
      for (let i = 0; i < Math.max(neoArt.length, neoInfo.length); i++) {
        const art = (neoArt[i] || '').padEnd(40);
        const info = neoInfo[i] || '';
        htermPrint(`${art} ${info}`, null);
      }
      break;
    }

    case 'echo':
      htermPrint(args || '');
      break;

    case 'history':
      htermState.history.forEach((h, i) => htermPrint(`  ${i + 1}  ${h}`));
      break;

    case 'fortune':
      htermPrint(htermFortunes[Math.floor(Math.random() * htermFortunes.length)]);
      break;

    case 'cowsay': {
      const msg = args || 'Moo!';
      const border = '─'.repeat(msg.length + 2);
      htermPrint(` ┌${border}┐`);
      htermPrint(` │ ${msg} │`);
      htermPrint(` └${border}┘`);
      htermPrint('        \\   ^__^');
      htermPrint('         \\  (oo)\\_______');
      htermPrint('            (__)\\       )\\/\\');
      htermPrint('                ||----w |');
      htermPrint('                ||     ||');
      break;
    }

    case 'ping': {
      const host = args || 'localhost';
      htermPrint(`PING ${host} (127.0.0.1): 56 data bytes`);
      for (let i = 0; i < 4; i++) {
        htermState.timers.push(setTimeout(() => {
          const ms = (Math.random() * 30 + 5).toFixed(1);
          htermPrint(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${ms} ms`);
          if (i === 3) {
            htermPrint('');
            htermPrint(`--- ${host} ping statistics ---`);
            htermPrint('4 packets transmitted, 4 received, 0% packet loss');
          }
        }, (i + 1) * 800));
      }
      break;
    }

    case 'top':
      htermPrint('  PID  USER     CPU%  MEM%  COMMAND', 'hterm-accent');
      htermPrint('─────────────────────────────────────────');
      htermPrint('    1  system    2.1   4.0  Kickstart');
      htermPrint('   12  system    1.5   3.2  Workbench');
      htermPrint('   23  guest     8.4  12.1  VistiShell');
      htermPrint('   34  guest    15.2  18.5  DPaint');
      htermPrint('   45  guest     4.7   8.3  Demoscene');
      htermPrint('   56  guest     0.8   2.1  Trashcan');
      htermPrint('   67  guest     3.2   5.4  CLI');
      htermPrint('   78  system    0.1   1.0  clock.device');
      break;

    case 'curl': {
      const url = args || 'http://example.com';
      htermPrint(`  Trying ${url}...`);
      htermState.timers.push(setTimeout(() => {
        htermPrint('  Connected.', 'hterm-accent');
        htermPrint('  HTTP/1.1 200 OK');
        htermPrint('  Content-Type: text/html; charset=UTF-8');
        htermPrint('  Server: VistiHTTPd/1.0');
        htermPrint('  X-Powered-By: MC68030');
        htermPrint('');
        htermPrint('  &lt;html&gt;&lt;body&gt;Nothing to see here. Go back to Workbench.&lt;/body&gt;&lt;/html&gt;');
      }, 600));
      break;
    }

    case 'man':
      htermPrint(`What? No manual entry for ${args || '...'}`);
      htermPrint('Who reads man pages anyway? Just try it and see what happens.');
      break;

    case 'sudo':
      htermPrint(`${trimmed}: you are not in the sudoers file.`, 'hterm-error');
      htermPrint('This incident will be reported.', 'hterm-error');
      break;

    case 'rm':
      if (trimmed.includes('-rf') && trimmed.includes('/')) {
        htermPrint('rm: cannot remove \'/\': Permission denied', 'hterm-error');
        htermPrint('Just kidding...', 'hterm-error');
        htermState.timers.push(setTimeout(() => {
          htermPrint('');
          htermPrint('🔥 SYSTEM FAILURE 🔥', 'hterm-error');
          htermState.timers.push(setTimeout(() => {
            htermToggle();
            guruMeditation();
          }, 1500));
        }, 1000));
      } else {
        htermPrint(`rm: ${args}: Permission denied`, 'hterm-error');
      }
      break;

    case 'hack': {
      htermClear();
      const hkWrap = document.createElement('div');
      hkWrap.style.cssText = 'position:relative;width:100%;height:' + htermOutput.clientHeight + 'px;';
      const hkCanvas = document.createElement('canvas');
      hkCanvas.style.cssText = 'width:100%;height:100%;display:block;';
      hkWrap.appendChild(hkCanvas);
      const hkStatus = document.createElement('div');
      hkStatus.style.cssText = 'position:absolute;bottom:46px;left:12px;right:12px;font-size:13px;color:#33ff33;text-shadow:0 0 6px #33ff33;line-height:1.8;';
      hkWrap.appendChild(hkStatus);
      htermOutput.appendChild(hkWrap);

      const hkCtx = hkCanvas.getContext('2d');
      let hkW, hkH;
      function hkResize() { hkW = hkCanvas.width = hkCanvas.offsetWidth; hkH = hkCanvas.height = hkCanvas.offsetHeight; }
      hkResize();

      const hkStart = performance.now();
      let hkRaf = 0;

      const codeSnippets = [
        'gibson.connect("Ellingson Mineral");', 'gibson.root(uid=0, gid=0);',
        'if (auth.bypass(0x4F)) {', '  memcpy(buf, payload, 0xFF);',
        '  exec(shell, "--root");', '  return ACCESS_GRANTED;', '}',
        'usr: AcidBurn  >> ACCESS LVL 9', 'usr: ZeroCool  >> TRACE BLOCKED',
        'usr: CerealKiller >> PORT 23 OK', 'usr: Phantom >> STEALTH MODE',
        '// It\'s a UNIX system! I know this!', 'ls /usr/share/3d_file_mgr/',
        'ssh hiro@metaverse.snowcrash.net', 'katana.load("reason.so");',
        'hiro.deliverPizza(30, "min");', 'metaverse.avatar.jack_in();',
        'snow_crash.nam_shub(target);', 'babel.infocalypse.init();',
        'WOPR.login("Joshua");', '> SHALL WE PLAY A GAME?',
        'WOPR.play("GLOBAL THERMONUCLEAR WAR");', 'launch.code = "CPE1704TKS";',
        'for (i=0; i<nodes.length; i++) {', '  ssh_brute(nodes[i], dict);',
        '  if (cracked) exploit(nodes[i]);', '}',
        'void* ptr = malloc(4096);', 'decrypt(aes256, key, blob);',
        'socket.connect(target, 443);', 'inject(sql, "DROP TABLE");',
        'while (!root) { escalate(); }', 'chmod 777 /etc/shadow',
        'nmap -sS -O 192.168.1.0/24', 'hydra -l admin -P list ssh://',
        'SELECT * FROM credentials;', 'UPDATE users SET role="admin";',
        'kernel.exploit(CVE_2024_0001);', 'firewall.rule(DROP, ALL);',
        'tunnel.open(tor, 9050);', 'proxy.chain(socks5, 3);',
      ];
      const codeCols = [];
      for (let c = 0; c < 3; c++) {
        const lines = [];
        for (let i = 0; i < 30; i++) lines.push(codeSnippets[Math.floor(Math.random() * codeSnippets.length)]);
        codeCols.push({ lines, scrollY: 0, speed: 0.4 + Math.random() * 0.6 });
      }

      const graphData = [[], []];
      for (let g = 0; g < 2; g++) {
        for (let i = 0; i < 80; i++) graphData[g].push(Math.random());
      }

      const hexRows = [];
      for (let i = 0; i < 12; i++) {
        let addr = (0xDEAD0000 + i * 16).toString(16).toUpperCase();
        let hex = '';
        for (let b = 0; b < 16; b++) hex += Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase() + ' ';
        hexRows.push(`0x${addr}  ${hex}`);
      }

      const netNodes = [];
      for (let i = 0; i < 10; i++) {
        netNodes.push({ x: Math.random(), y: Math.random(), r: 3 + Math.random() * 4, pulse: Math.random() * Math.PI * 2 });
      }
      const netEdges = [];
      for (let i = 0; i < netNodes.length; i++) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let c = 0; c < count; c++) {
          const j = (i + 1 + Math.floor(Math.random() * (netNodes.length - 1))) % netNodes.length;
          netEdges.push([i, j]);
        }
      }

      function hkDraw() {
        hkResize();
        const t = (performance.now() - hkStart) / 1000;
        hkCtx.fillStyle = '#0a0a0a';
        hkCtx.fillRect(0, 0, hkW, hkH);

        const pad = 6;
        const topH = hkH * 0.52;
        const botH = hkH * 0.35;
        const botY = topH + pad * 2;
        const colW = (hkW - pad * 4) / 3;

        hkCtx.strokeStyle = '#1a5a1a';
        hkCtx.lineWidth = 1;

        for (let c = 0; c < 3; c++) {
          const x = pad + c * (colW + pad);
          hkCtx.strokeRect(x, pad, colW, topH);
          hkCtx.fillStyle = '#0d2a0d';
          hkCtx.fillRect(x, pad, colW, 14);
          hkCtx.fillStyle = '#33ff33';
          hkCtx.font = '10px monospace';
          const headers = ['GIBSON MAINFRAME', 'WOPR ACCESS LOG', 'METAVERSE UPLINK'];
          hkCtx.fillText(headers[c], x + 4, pad + 11);

          hkCtx.save();
          hkCtx.beginPath();
          hkCtx.rect(x + 2, pad + 16, colW - 4, topH - 18);
          hkCtx.clip();
          const col = codeCols[c];
          col.scrollY += col.speed;
          if (col.scrollY > 14) {
            col.scrollY -= 14;
            col.lines.push(codeSnippets[Math.floor(Math.random() * codeSnippets.length)]);
            if (col.lines.length > 60) col.lines.shift();
          }
          hkCtx.font = '11px monospace';
          const lineH = 14;
          for (let i = 0; i < col.lines.length; i++) {
            const ly = pad + 16 + i * lineH - col.scrollY;
            if (ly < pad + 14 || ly > pad + topH) continue;
            const age = (col.lines.length - i) / col.lines.length;
            hkCtx.fillStyle = age < 0.15 ? '#33ff33' : age < 0.4 ? '#1a8a1a' : '#0d4a0d';
            hkCtx.fillText(col.lines[i], x + 6, ly);
          }
          hkCtx.restore();
        }

        const blW = (hkW - pad * 3) * 0.5;
        hkCtx.strokeStyle = '#1a5a1a';
        hkCtx.strokeRect(pad, botY, blW, botH);
        hkCtx.fillStyle = '#0d2a0d';
        hkCtx.fillRect(pad, botY, blW, 14);
        hkCtx.fillStyle = '#33ff33';
        hkCtx.font = '10px monospace';
        hkCtx.fillText('WOPR DEFENSE NETWORK', pad + 4, botY + 11);

        const gH = (botH - 20) / 2;
        for (let g = 0; g < 2; g++) {
          const gy = botY + 18 + g * (gH + 2);
          graphData[g].shift();
          graphData[g].push(Math.random() * 0.6 + (g === 0 ? Math.sin(t * 2) * 0.2 + 0.4 : Math.cos(t * 1.5) * 0.3 + 0.3));
          hkCtx.strokeStyle = '#0d2a0d';
          hkCtx.lineWidth = 0.5;
          for (let i = 0; i < 4; i++) {
            const yy = gy + (gH / 4) * i;
            hkCtx.beginPath(); hkCtx.moveTo(pad + 2, yy); hkCtx.lineTo(pad + blW - 2, yy); hkCtx.stroke();
          }
          hkCtx.strokeStyle = g === 0 ? '#33ff33' : '#00ccff';
          hkCtx.shadowColor = g === 0 ? '#33ff33' : '#00ccff';
          hkCtx.shadowBlur = 4;
          hkCtx.lineWidth = 1.5;
          hkCtx.beginPath();
          const pts = graphData[g];
          for (let i = 0; i < pts.length; i++) {
            const px = pad + 4 + (i / pts.length) * (blW - 8);
            const py = gy + gH - pts[i] * gH;
            i === 0 ? hkCtx.moveTo(px, py) : hkCtx.lineTo(px, py);
          }
          hkCtx.stroke();
          hkCtx.shadowBlur = 0;
        }

        const brX = pad * 2 + blW;
        const brW = hkW - brX - pad;
        hkCtx.strokeStyle = '#1a5a1a';
        hkCtx.lineWidth = 1;
        hkCtx.strokeRect(brX, botY, brW, botH);
        hkCtx.fillStyle = '#0d2a0d';
        hkCtx.fillRect(brX, botY, brW, 14);
        hkCtx.fillStyle = '#33ff33';
        hkCtx.font = '10px monospace';
        hkCtx.fillText('ELLINGSON MINERAL CO.', brX + 4, botY + 11);

        hkCtx.strokeStyle = '#1a5a1a';
        hkCtx.lineWidth = 0.8;
        netEdges.forEach(([a, b]) => {
          const ax = brX + 10 + netNodes[a].x * (brW - 20);
          const ay = botY + 22 + netNodes[a].y * (botH - 30);
          const bx = brX + 10 + netNodes[b].x * (brW - 20);
          const by = botY + 22 + netNodes[b].y * (botH - 30);
          hkCtx.beginPath(); hkCtx.moveTo(ax, ay); hkCtx.lineTo(bx, by); hkCtx.stroke();
          const pkt = (t * 0.4 + a * 0.1) % 1;
          const px = ax + (bx - ax) * pkt;
          const py = ay + (by - ay) * pkt;
          hkCtx.fillStyle = '#33ff33';
          hkCtx.fillRect(px - 1.5, py - 1.5, 3, 3);
        });

        netNodes.forEach((n, i) => {
          const nx = brX + 10 + n.x * (brW - 20);
          const ny = botY + 22 + n.y * (botH - 30);
          const pulse = 1 + Math.sin(t * 3 + n.pulse) * 0.3;
          hkCtx.beginPath();
          hkCtx.arc(nx, ny, n.r * pulse, 0, Math.PI * 2);
          hkCtx.fillStyle = i === 0 ? '#ff4444' : '#33ff33';
          hkCtx.shadowColor = i === 0 ? '#ff4444' : '#33ff33';
          hkCtx.shadowBlur = 6;
          hkCtx.fill();
          hkCtx.shadowBlur = 0;
        });

        const prgY = hkH - 30;
        const progress = Math.min(1, t / 9);
        hkCtx.fillStyle = '#0d2a0d';
        hkCtx.fillRect(pad, prgY, hkW - pad * 2, 12);
        hkCtx.fillStyle = progress < 0.5 ? '#33ff33' : progress < 0.8 ? '#ffaa00' : '#ff4444';
        hkCtx.shadowColor = hkCtx.fillStyle;
        hkCtx.shadowBlur = 4;
        hkCtx.fillRect(pad + 1, prgY + 1, (hkW - pad * 2 - 2) * progress, 10);
        hkCtx.shadowBlur = 0;
        hkCtx.fillStyle = '#33ff33';
        hkCtx.font = '10px monospace';
        hkCtx.fillText(`GIBSON BREACH: ${Math.floor(progress * 100)}%`, pad + 4, prgY + 10);

        hkRaf = requestAnimationFrame(hkDraw);
        htermState.raf = hkRaf;
      }
      hkRaf = requestAnimationFrame(hkDraw);
      htermState.raf = hkRaf;

      const hackLines = [
        [0, '> Hacking the Gibson...'],
        [1200, '> ZeroCool logged in. AcidBurn on standby.'],
        [2500, '> It\'s a UNIX system! I know this!'],
        [4000, '> WOPR: "Shall we play a game?"'],
        [5500, '> Hiro Protagonist jacked into the Metaverse.'],
        [7000, '> Download complete: recipe_for_grandmas_cookies.txt'],
        [8200, '> ...wait, this isn\'t the Gibson.'],
      ];
      hackLines.forEach(([delay, text]) => {
        htermState.timers.push(setTimeout(() => {
          const line = document.createElement('div');
          line.textContent = text;
          line.style.color = text.includes('ACCESS') ? '#ffaa00' : '#33ff33';
          hkStatus.appendChild(line);
          while (hkStatus.children.length > 4) hkStatus.removeChild(hkStatus.firstChild);
        }, delay));
      });

      htermState.timers.push(setTimeout(() => {
        cancelAnimationFrame(hkRaf);
        htermState.raf = 0;
        hkWrap.remove();
        htermPrint('Connection closed by remote host.', 'hterm-accent');
      }, 9500));
      break;
    }

    case 'matrix': {
      htermClear();
      const mxWrap = document.createElement('div');
      mxWrap.style.cssText = 'position:relative;width:100%;height:' + (htermOutput.clientHeight) + 'px;';
      const mxCanvas = document.createElement('canvas');
      mxCanvas.style.cssText = 'width:100%;height:100%;display:block;';
      mxWrap.appendChild(mxCanvas);
      const mxText = document.createElement('div');
      mxText.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;font-size:15px;color:#33ff33;text-align:center;line-height:2.2;text-shadow:0 0 8px #33ff33;';
      mxWrap.appendChild(mxText);
      htermOutput.appendChild(mxWrap);

      const mxCtx = mxCanvas.getContext('2d');
      let mxW, mxH;
      function mxResize() {
        mxW = mxCanvas.width = mxCanvas.offsetWidth;
        mxH = mxCanvas.height = mxCanvas.offsetHeight;
      }
      mxResize();

      const verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

      let mxAngle = 0;
      let mxRaf = 0;
      const mxStart = performance.now();

      function mxDraw() {
        mxResize();
        mxCtx.clearRect(0, 0, mxW, mxH);

        const t = (performance.now() - mxStart) / 1000;
        mxCtx.font = '12px monospace';
        mxCtx.globalAlpha = 0.07;
        mxCtx.fillStyle = '#33ff33';
        const cols = Math.floor(mxW / 14);
        for (let c = 0; c < cols; c++) {
          const speed = 40 + (c * 7) % 60;
          const y = ((t * speed + c * 37) % (mxH + 200)) - 100;
          for (let r = 0; r < 8; r++) {
            const ch = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
            mxCtx.fillText(ch, c * 14, y - r * 16);
          }
        }
        mxCtx.globalAlpha = 1;

        mxAngle += 0.015;
        const cosA = Math.cos(mxAngle), sinA = Math.sin(mxAngle);
        const cosB = Math.cos(mxAngle * 0.7), sinB = Math.sin(mxAngle * 0.7);
        const scale = Math.min(mxW, mxH) * 0.22;
        const cx = mxW / 2, cy = mxH / 2;

        const proj = verts.map(([x, y, z]) => {
          let x1 = x * cosA - z * sinA;
          let z1 = x * sinA + z * cosA;
          let y1 = y * cosB - z1 * sinB;
          let z2 = y * sinB + z1 * cosB;
          const f = 3 / (3 + z2);
          return [cx + x1 * scale * f, cy + y1 * scale * f, z2];
        });

        mxCtx.strokeStyle = '#33ff33';
        mxCtx.shadowColor = '#33ff33';
        mxCtx.shadowBlur = 6;
        mxCtx.lineWidth = 1.5;
        edges.forEach(([a, b]) => {
          const alpha = 0.35 + 0.65 * ((proj[a][2] + proj[b][2]) / 2 + 1.5) / 3;
          mxCtx.globalAlpha = Math.max(0.2, Math.min(1, alpha));
          mxCtx.beginPath();
          mxCtx.moveTo(proj[a][0], proj[a][1]);
          mxCtx.lineTo(proj[b][0], proj[b][1]);
          mxCtx.stroke();
        });

        mxCtx.globalAlpha = 1;
        mxCtx.fillStyle = '#33ff33';
        proj.forEach(([px, py]) => {
          mxCtx.beginPath();
          mxCtx.arc(px, py, 2.5, 0, Math.PI * 2);
          mxCtx.fill();
        });

        mxCtx.shadowBlur = 0;
        mxRaf = requestAnimationFrame(mxDraw);
        htermState.raf = mxRaf;
      }
      mxRaf = requestAnimationFrame(mxDraw);
      htermState.raf = mxRaf;

      const mxLines = [
        [500, 'Wake up, Neo...'],
        [2500, 'The Matrix has you...'],
        [5000, 'Follow the white rabbit.'],
        [7500, 'Knock, knock, Neo.'],
      ];
      mxLines.forEach(([delay, text]) => {
        htermState.timers.push(setTimeout(() => {
          const line = document.createElement('div');
          line.textContent = text;
          mxText.appendChild(line);
        }, delay));
      });

      htermState.timers.push(setTimeout(() => {
        cancelAnimationFrame(mxRaf);
        htermState.raf = 0;
        mxWrap.remove();
        htermPrint('Just kidding. This is VistiOS, not the Matrix.', 'hterm-accent');
        htermPrint('Type "help" to see what else is here.', 'hterm-accent');
      }, 10500));
      break;
    }

    case 'clear':
      htermClear();
      break;

    case 'exit':
      htermToggle();
      break;

    default:
      htermPrint(`${cmd}: command not found. Type 'help' for available commands.`, 'hterm-error');
  }
}

export function htermInit() {
  htermPrint('VistiOS CLI v3.1', 'hterm-accent');
  htermPrint('MC68030 @ 25MHz  |  2MB Chip + 8MB Fast RAM');
  htermPrint('');
  htermPrint('Type "help" for available commands.');
  htermPrint('');
}

// Input event listeners
htermInput.addEventListener('input', () => syncInputWidth(htermInput));

htermInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    htermExec(htermInput.value);
    htermInput.value = '';
    syncInputWidth(htermInput);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (htermState.histIdx > 0) {
      htermState.histIdx--;
      htermInput.value = htermState.history[htermState.histIdx];
      syncInputWidth(htermInput);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (htermState.histIdx < htermState.history.length - 1) {
      htermState.histIdx++;
      htermInput.value = htermState.history[htermState.histIdx];
      syncInputWidth(htermInput);
    } else {
      htermState.histIdx = htermState.history.length;
      htermInput.value = '';
      syncInputWidth(htermInput);
    }
  }
});

htermOutput.addEventListener('click', () => {
  if (htermState.open) htermInput.focus();
});
