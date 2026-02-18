export function pad(str, len) { return String(str).padEnd(len); }

export function makeBar(count, max) {
  const width = Math.max(1, Math.round((count / max) * 16));
  return '\u2588'.repeat(width);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeUrl(url) {
  const raw = String(url || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return '#';
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return '#';
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('./') ||
    lower.startsWith('../') ||
    lower.startsWith('/') ||
    lower.startsWith('#')
  ) {
    return raw;
  }
  return '#';
}

export function safeId(str) {
  const cleaned = String(str || '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return cleaned || 'file';
}

export function syncInputWidth(el) {
  el.style.width = Math.max(1, el.value.length) + 'ch';
}

// Configure marked: secure links, GFM, line breaks
// marked is a CDN global
marked.use({
  gfm: true,
  breaks: true,
  walkTokens(token) {
    if (token.type === 'link') token.href = safeUrl(token.href || '');
  }
});
