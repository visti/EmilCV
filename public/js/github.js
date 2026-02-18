import { GITHUB_USER, fallback, fallbackRepos } from './config.js';
import { pad, makeBar } from './utils.js';

export async function fetchGitHub() {
  const sig = AbortSignal.timeout(5000);
  try {
    const [userRes, reposRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`, { signal: sig }),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`, { signal: sig }),
      fetch(`https://api.github.com/search/commits?q=author:${GITHUB_USER}`, {
        headers: { 'Accept': 'application/vnd.github.cloak-preview+json' }, signal: sig
      })
    ]);
    if (!userRes.ok || !reposRes.ok) throw new Error('API error');
    const user = await userRes.json();
    const repos = await reposRes.json();
    const commits = commitsRes.ok ? await commitsRes.json() : null;
    user.total_commits = commits ? commits.total_count : null;
    return { user, repos };
  } catch {
    return { user: fallback, repos: fallbackRepos };
  }
}

export function buildLines(user, repos) {
  const hideRepos = ['claudeprojects', 'detectivestory', 'gamejam', 'visti.github.io'];
  const ownRepos = repos.filter(r => !r.fork && !hideRepos.includes(r.name.toLowerCase()));
  const year = new Date(user.created_at).getFullYear();

  const langCount = {};
  ownRepos.forEach(r => {
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  });
  const langSorted = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
  const maxLang = langSorted.length ? langSorted[0][1] : 1;

  const lines = [];

  // Boot
  lines.push({ type: 'boot', html: '<span class="dim-text">VistiOS Kickstart ROM v1.0</span>' });
  lines.push({ type: 'boot', html: '<span class="dim-text">68030 CPU @ 25MHz  -  2MB Chip RAM  -  8MB Fast RAM</span>' });
  lines.push({ type: 'boot', html: '<span class="dim-text">Loading Workbench...</span>' });
  lines.push({ type: 'blank' });

  // Prompt: whoami
  const parts = [user.name, user.location, user.company].filter(Boolean);
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">whoami</span>` });
  lines.push({ type: 'out', html: `<span class="output-text">${parts.join(' - ')}</span>` });
  lines.push({ type: 'blank' });

  // GitHub stats
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">type DH0:github_stats</span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Username:     <span class="highlight">${GITHUB_USER}</span></span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Repos:        <span class="highlight">${user.public_repos}</span></span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Commits:      <span class="highlight">${user.total_commits != null ? user.total_commits : '...'}</span></span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Member since: <span class="highlight">${year}</span></span>` });
  lines.push({ type: 'blank' });

  // Experience
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">type DH0:experience.log</span>` });
  lines.push({ type: 'out', html: `<span class="highlight">  Gramex, Copenhagen ......................... 2017-now</span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Data Specialist</span>` });
  lines.push({ type: 'out', html: `<span class="dim-text">  <span class="highlight">SQL</span> / <span class="highlight">Python</span> / <span class="highlight">Excel</span> / <span class="highlight">Access</span> / <span class="highlight">Navision</span> / <span class="highlight">SSMS</span></span>` });
  lines.push({ type: 'out', html: `<span class="dim-text">  <span class="highlight">PowerBI</span> / <span class="highlight">Matplotlib</span> / <span class="highlight">Pandas</span> / <span class="highlight">Python automation</span>` });
  lines.push({ type: 'out', html: `<span class="dim-text">  Processing 350k+ plays/month for royalty payouts</span>` });
  lines.push({ type: 'out', html: `<span class="dim-text">  to artists and labels across Denmark</span>` });
  lines.push({ type: 'out', html: `<span class="dim-text">  Reports for public display, legal & internal use</span>` });
  lines.push({ type: 'blank' });
  lines.push({ type: 'out', html: `<span class="highlight">  Sandrew Metronome, Aalborg ................. 2014-2016</span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Metadata Expert</span>` });
  lines.push({ type: 'blank' });
  lines.push({ type: 'out', html: `<span class="highlight">  Big Beard Productions, Aalborg ............. 2012-2014</span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Asst. Producer - Video/Music/Graphics</span>` });
  lines.push({ type: 'blank' });
  lines.push({ type: 'out', html: `<span class="highlight">  Rotation.dk ................................ 2012-2015</span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  Writer - SEO, Articles, Podcasts</span>` });
  lines.push({ type: 'blank' });
  lines.push({ type: 'out', html: `<span class="highlight">  ORA (Org. af Rytmiske Amatormusikere) ...... 2011-2012</span>` });
  lines.push({ type: 'out', html: `<span class="output-text">  PR Associate</span>` });
  lines.push({ type: 'blank' });

  // Education
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">type DH0:education</span>` });
  lines.push({ type: 'out', html: '<span class="output-text">  Librarian DB (IVA Aalborg) ............. 2014-2015</span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  BSc Information Science (IVA Aalborg) .. 2008-2014</span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  Gymnasium (Dronninglund) .............. 2003-2006</span>' });
  lines.push({ type: 'blank' });

  // Skills
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">type DH0:skills.cfg</span>` });
  lines.push({ type: 'out', html: '<span class="output-text">  <span class="highlight">SQL</span> / <span class="highlight">Python</span> / <span class="highlight">Bash</span> / <span class="highlight">Lua</span></span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  <span class="highlight">SSMS</span> / <span class="highlight">Access</span> / <span class="highlight">Navision</span> / <span class="highlight">Excel</span> / <span class="highlight">PowerBI</span></span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  <span class="highlight">Pandas</span> / <span class="highlight">Matplotlib</span> / data visualization</span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  Unix & Windows sysadmin</span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  <span class="highlight">Photoshop</span> / <span class="highlight">Premiere</span> / <span class="highlight">Ableton</span></span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  Metadata standards & digitization</span>' });
  lines.push({ type: 'out', html: '<span class="output-text">  Studio technician (music)</span>' });
  lines.push({ type: 'out', html: '<span class="dim-text">  Languages: Danish, English</span>' });
  lines.push({ type: 'blank' });

  // Projects
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">list DH0:projects/</span>` });
  ownRepos.forEach(r => {
    const name = pad(r.name, 24);
    const lang = r.language ? `<span class="highlight">${pad(r.language, 10)}</span>` : pad('-', 10);
    const star = r.stargazers_count > 0 ? `<span class="highlight">\u2605 ${r.stargazers_count}</span>  ` : '     ';
    const desc = r.description || '';
    lines.push({ type: 'out', html: `<span class="output-text">  ${name}${lang}${star}<span class="dim-text">${desc}</span></span>` });
  });
  lines.push({ type: 'blank' });

  // Languages
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">type DH0:languages.dat</span>` });
  langSorted.forEach(([lang, count]) => {
    const label = pad(lang, 12);
    const bar = makeBar(count, maxLang);
    const num = count === 1 ? '1 repo' : `${count} repos`;
    lines.push({ type: 'out', html: `<span class="output-text">  ${label}<span class="highlight">${bar}</span> ${num}</span>` });
  });
  lines.push({ type: 'blank' });

  // Links
  lines.push({ type: 'cmd', html: `<span class="prompt-text">1.SYS:&gt;</span> <span class="cmd-text">type DH0:links</span>` });
  lines.push({ type: 'out', html: `  <a href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener noreferrer">github.com/${GITHUB_USER}</a>` });
  lines.push({ type: 'blank' });

  // Final prompt
  lines.push({ type: 'final' });

  return lines;
}
