// Small authoring helpers so curriculum content stays readable.

export const DOCS = 'https://docs.openstack.org';
export const SERIES = '2026.1';
export const doc = (project, path = '') => `${DOCS}/${project}/${SERIES}/${path}`;
export const guide = (path = '') => `${DOCS}/${SERIES}/${path}`;

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Static terminal block. Lines beginning with "$ " are commands, "# " are
 * comments, everything else is output.
 */
export function term(title, text) {
  const lines = text.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
  const cmds = [];
  let cont = false; // previous command line ended with a backslash
  const html = lines.map((l) => {
    if (cont) { cmds[cmds.length - 1] += `\n${l}`; cont = l.endsWith('\\'); return esc(l); }
    if (l.startsWith('$ ')) {
      cmds.push(l.slice(2)); cont = l.endsWith('\\');
      return `<span class="p">$ </span>${esc(l.slice(2))}`;
    }
    if (l.startsWith('# ')) return `<span class="c">${esc(l)}</span>`;
    return `<span class="o">${esc(l)}</span>`;
  }).join('\n');
  const data = esc(cmds.join('\n'));
  return `<div class="term"><div class="term-head"><i></i><i></i><i></i><span>${esc(title)}</span>` +
    (cmds.length ? `<button type="button" data-copy="${data}">copy</button>` : '') +
    `</div><pre>${html}</pre></div>`;
}

const CALLOUT = {
  oracle: 'The Oracle speaks',
  prod: 'In production',
  warn: 'Beware',
  myth: 'From the epic',
  plain: 'In plain words',
};
export const note = (type, html, title) =>
  `<div class="callout ${type}"><b>${title || CALLOUT[type] || 'Note'}</b>${html}</div>`;

export const ROLES = {
  sys: 'System Engineer',
  net: 'Network Engineer',
  pre: 'Presales',
  sa: 'Solution Architect',
  pa: 'Principal Architect',
  lead: 'Engineering Lead',
};

/** Role lens: the same topic seen through each job role. */
export function lens(map) {
  const keys = Object.keys(map);
  const tabs = keys.map((k, i) =>
    `<button type="button" role="tab" data-lens="${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${ROLES[k]}</button>`).join('');
  const bodies = keys.map((k, i) =>
    `<div class="lens-body" data-lens-body="${k}"${i ? ' hidden' : ''}>${map[k]}</div>`).join('');
  return `<div class="lens" data-lens-group><div class="lens-title">Role lens — what this means for you</div>` +
    `<div class="lens-tabs" role="tablist">${tabs}</div>${bodies}</div>`;
}

export const fig = (svg, caption) => `<figure>${svg}<figcaption>${caption}</figcaption></figure>`;
