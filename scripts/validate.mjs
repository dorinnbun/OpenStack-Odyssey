// Content integrity checks: run with `npm run check`.
import { LEVELS_1 } from '../public/js/data/levels-1.js';
import { LEVELS_2 } from '../public/js/data/levels-2.js';
import { LEVELS_3 } from '../public/js/data/levels-3.js';
import { SCENARIOS } from '../public/js/data/scenarios.js';
import { LABS } from '../public/js/terminal.js';
import { LIBRARY } from '../public/js/data/library.js';
import { EPICS } from '../public/js/data/epics.js';
import { ROLES } from '../public/js/data/helpers.js';

const MAIN = [...LEVELS_1, ...LEVELS_2, ...LEVELS_3];
const VOYAGES = [{ id: 'odyssey', levels: MAIN }, ...EPICS];
const LEVELS = VOYAGES.flatMap((v) => v.levels);
const errors = [];
const ids = new Set();
EPICS.forEach((v) => {
  if (v.map.length !== v.levels.length || v.short.length !== v.levels.length) errors.push(`epic ${v.id}: map/short must have one entry per level`);
  ['id', 'title', 'greekTitle', 'project', 'honour', 'glyph', 'tagline'].forEach((k) => { if (!v[k]) errors.push(`epic ${v.id}: missing ${k}`); });
});
VOYAGES.forEach((v) => v.levels.forEach((lv, i) => { if (lv.n !== i + 1) errors.push(`${v.id}/${lv.id}: n=${lv.n}, expected ${i + 1}`); }));
LEVELS.forEach((lv) => {
  if (ids.has(lv.id)) errors.push(`duplicate level id ${lv.id}`); ids.add(lv.id);
  if (!lv.lessons.length) errors.push(`${lv.id}: no lessons`);
  lv.quiz.forEach((q, qi) => { if (!(q.c >= 0 && q.c < q.a.length)) errors.push(`${lv.id} q${qi + 1}: bad answer index`); });
  (lv.oracle || []).forEach((o) => { if (!SCENARIOS.find((s) => s.id === o)) errors.push(`${lv.id}: unknown oracle ${o}`); });
  if (lv.lab && !LABS.find((l) => l.id === lv.lab)) errors.push(`${lv.id}: unknown lab ${lv.lab}`);
});
SCENARIOS.forEach((s) => {
  if (!s.nodes[s.start]) errors.push(`${s.id}: missing start node`);
  let ends = 0;
  Object.entries(s.nodes).forEach(([k, n]) => {
    if (n.end) { ends++; return; }
    if (!n.choices.some((c) => c.go)) errors.push(`${s.id}/${k}: no correct path`);
    n.choices.forEach((c) => { if (c.go && !s.nodes[c.go]) errors.push(`${s.id}/${k}: dangling ${c.go}`); });
  });
  if (!ends) errors.push(`${s.id}: no end node`);
});
const KINDS = new Set(['Official', 'Foundation', 'Upstream', 'Community', 'Vendor']);
const GLYPHS = new Set(['owl', 'amphora', 'column', 'helmet', 'lyre', 'scroll', 'lamp', 'laurel', 'trident']);
LIBRARY.forEach((t) => {
  if (!GLYPHS.has(t.glyph)) errors.push(`library ${t.id}: unknown glyph ${t.glyph}`);
  t.levels.forEach((id) => { if (!ids.has(id)) errors.push(`library ${t.id}: unknown level ${id}`); });
  t.roles.forEach((r) => { if (!ROLES[r]) errors.push(`library ${t.id}: unknown role ${r}`); });
  t.links.forEach(([title, url, kind]) => {
    if (!/^https:\/\//.test(url)) errors.push(`library ${t.id}: non-https link ${url}`);
    if (!KINDS.has(kind)) errors.push(`library ${t.id}: unknown kind ${kind} for ${title}`);
  });
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${VOYAGES.length} voyages, ${LEVELS.length} levels, ${LEVELS.reduce((t, l) => t + l.lessons.length, 0)} lessons, ${LEVELS.reduce((t, l) => t + l.quiz.length, 0)} questions, ${SCENARIOS.length} oracle trials, ${LABS.length} labs, ${LIBRARY.length} library topics / ${LIBRARY.reduce((t, x) => t + x.links.length, 0)} sources`);
