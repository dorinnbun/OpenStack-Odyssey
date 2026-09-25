import { LEVELS_1 } from './data/levels-1.js';
import { LEVELS_2 } from './data/levels-2.js';
import { LEVELS_3 } from './data/levels-3.js';
import { SCENARIOS } from './data/scenarios.js';
import { SERVICES, LOGMAP, GLOSSARY, SOURCES } from './data/codex.js';
import { CHEAT, PORTS, STATES, CONFIG, SYMPTOMS } from './data/cheatsheet.js';
import { esc, ROLES, doc } from './data/helpers.js';
import { Simulator, LABS, COMPLETIONS } from './terminal.js';
import { renderForge } from './forge.js';

const LEVELS = [...LEVELS_1, ...LEVELS_2, ...LEVELS_3];
const $ = (sel, el = document) => el.querySelector(sel);
const app = $('#app');

// ------------------------------------------------------------------ progress
const XP = { lesson: 25, trial: 100, perfect: 50, oracle: 60, lab: 80 };
const RANKS = [
  [0, 'Mortal'], [150, 'Deckhand'], [400, 'Sailor'], [800, 'Helmsman'], [1300, 'Hero'],
  [2000, 'Champion'], [2800, 'Demigod'], [3800, 'Olympian'],
];
const PKEY = 'odyssey.progress.v1';
const blank = () => ({ name: '', role: '', xp: 0, lessons: {}, trials: {}, oracle: {}, labs: {}, freeRoam: false });
let P = (() => { try { return { ...blank(), ...JSON.parse(localStorage.getItem(PKEY)) }; } catch { return blank(); } })();
const persist = () => { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch { /* storage unavailable */ } updateXpBox(); };

function rankOf(xp) {
  let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
  const [floor, name] = RANKS[i]; const next = RANKS[i + 1];
  return { name, floor, next: next?.[0], nextName: next?.[1], pct: next ? ((xp - floor) / (next[0] - floor)) * 100 : 100 };
}
function award(amount, msg) {
  const before = rankOf(P.xp).name;
  P.xp += amount; persist();
  const after = rankOf(P.xp).name;
  toast(after !== before ? `🏛️ Rank up! You are now a ${after}. (+${amount} XP)` : `${msg} +${amount} XP`);
}
function updateXpBox() {
  const r = rankOf(P.xp);
  $('[data-rank]').textContent = r.name;
  $('[data-xpfill]').style.width = `${r.pct}%`;
  $('[data-xpnum]').textContent = `${P.xp} XP`;
  $('[data-xpbox]').title = r.next ? `${r.next - P.xp} XP to ${r.nextName}` : 'The highest rank';
}
let toastTimer;
function toast(msg) {
  const t = $('[data-toast]'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

const lessonKey = (lv, ls) => `${lv.id}/${ls.id}`;
const levelDone = (lv) => lv.lessons.filter((ls) => P.lessons[lessonKey(lv, ls)]).length;
const trialPassed = (lv) => (P.trials[lv.id] || 0) >= 70;
const unlocked = (lv) => P.freeRoam || lv.n === 1 || trialPassed(LEVELS[lv.n - 2]);
const levelById = (id) => LEVELS.find((l) => l.id === id);
const totalLessons = LEVELS.reduce((t, l) => t + l.lessons.length, 0);
function nextStep() {
  for (const lv of LEVELS) {
    if (!unlocked(lv)) return { lv, href: `#/level/${lv.id}` };
    const ls = lv.lessons.find((x) => !P.lessons[lessonKey(lv, x)]);
    if (ls) return { lv, ls, href: `#/lesson/${lv.id}/${ls.id}` };
    if (!trialPassed(lv)) return { lv, href: `#/trial/${lv.id}`, trial: true };
  }
  return null;
}

// ------------------------------------------------------------------ router
const routes = {
  '': home, paths, level, lesson, trial, oracle, terminal, forge, codex, cheatsheet, profile,
};
function route() {
  const [, name = '', ...args] = location.hash.replace(/^#/, '').split('/');
  const fn = routes[name] || notFound;
  document.querySelectorAll('[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
  $('[data-nav]').classList.remove('open');
  if (cleanup) { cleanup(); cleanup = null; }
  fn(...args.map(decodeURIComponent));
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
let cleanup = null;
window.addEventListener('hashchange', route);

function notFound() {
  app.innerHTML = `<h1>Lost at sea</h1><p class="lede">This island is not on any chart.</p><a class="btn" href="#/">Return to the voyage</a>`;
}

// ------------------------------------------------------------------ home
const tierOf = (lv) => lv.tier;
function mapSvg() {
  const W = 1000; const H = 380;
  // Hand-placed route: west to east, winding like the voyage; labels above (-1) or below (1).
  const PTS = [[70, 250, 1], [150, 320, 1], [245, 280, 1], [320, 190, 1], [390, 110, -1], [480, 80, -1], [560, 150, 1],
    [540, 260, -1], [610, 330, 1], [700, 280, 1], [760, 190, 1], [720, 100, -1], [810, 60, -1], [880, 140, 1], [930, 260, 1]];
  const SHORT = ['Ithaca', 'Cicones', 'Lotus-Eaters', 'Cyclops', 'Aeolus', 'Laestrygonians', 'Aeaea', 'Underworld',
    'Sirens', 'Scylla & Charybdis', 'Thrinacia', 'Ogygia', 'Scheria', 'Court of Alcinous', 'Home to Ithaca'];
  const pts = PTS.map(([x, y]) => [x, y]);
  const path = pts.map(([x, y], i) => (i ? `S${(pts[i - 1][0] + x) / 2},${y} ${x},${y}` : `M${x},${y}`)).join(' ');
  const step = nextStep();
  const islands = LEVELS.map((lv, i) => {
    const [x, y] = pts[i];
    const done = trialPassed(lv); const open = unlocked(lv); const current = step && step.lv === lv;
    const fill = done ? 'var(--gold)' : current ? 'var(--terracotta)' : open ? 'var(--aegean)' : '#8a8f98';
    const labelY = y + (PTS[i][2] > 0 ? 44 : -32);
    return `<a href="#/level/${lv.id}" class="map-island${open ? '' : ' locked'}" aria-label="Level ${lv.n}: ${esc(lv.place)}${open ? '' : ' (locked)'}">
      <ellipse cx="${x}" cy="${y + 8}" rx="30" ry="10" fill="var(--olive)" opacity=".35"/>
      <circle class="isle" cx="${x}" cy="${y}" r="21" fill="${fill}" stroke="var(--surface)" stroke-width="3"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" class="map-num">${done ? '✓' : lv.n}</text>
      <text x="${x}" y="${labelY}" text-anchor="middle" class="map-label">${esc(SHORT[i])}</text>
      ${current ? `<text x="${x + 30}" y="${y - 14}" text-anchor="middle" font-size="22">⛵</text>` : ''}
    </a>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Voyage map of 15 islands">
    <defs><pattern id="waves" width="40" height="16" patternUnits="userSpaceOnUse"><path d="M0 8 Q10 0 20 8 T40 8" fill="none" stroke="var(--foam)" stroke-width="1" opacity=".35"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="var(--surface-2)"/><rect width="${W}" height="${H}" fill="url(#waves)"/>
    <text x="24" y="34" font-family="Cinzel,serif" font-size="16" fill="var(--terracotta)" letter-spacing="3">THE WINE-DARK SEA</text>
    <path d="${path}" fill="none" stroke="var(--terracotta)" stroke-width="2.5" stroke-dasharray="7 7" opacity=".7"/>
    ${islands}
  </svg>`;
}

function home() {
  const step = nextStep();
  const passed = LEVELS.filter(trialPassed).length;
  const lessonsDone = Object.keys(P.lessons).length;
  const tiers = [...new Set(LEVELS.map(tierOf))];
  app.innerHTML = `
  <section class="hero">
    <p class="eyebrow">Sing to me of the cloud, O Muse</p>
    <h1>${P.name ? `Welcome back, ${esc(P.name)}` : 'The OpenStack Odyssey'}</h1>
    <p class="lede">A fifteen-island voyage from your first token to troubleshooting the hardest production incidents and proposing cloud architectures. Built for system and network engineers, presales, solution and principal architects, and engineering leads.</p>
    <div class="row">
      ${step ? `<a class="btn gold" href="${step.href}">${lessonsDone ? 'Continue' : 'Begin'} the voyage → ${esc(step.ls ? step.ls.title : step.trial ? `Trial of ${step.lv.place}` : step.lv.place)}</a>` : '<a class="btn gold" href="#/oracle">You are home. Seek the Oracle\'s hardest trials →</a>'}
      <a class="btn ghost" href="#/paths">Choose a path for your role</a>
      <a class="btn ghost" href="#/cheatsheet">Cheat sheet</a>
    </div>
    <div class="stats">
      <div class="stat"><b>${passed}/${LEVELS.length}</b><span>islands conquered</span></div>
      <div class="stat"><b>${lessonsDone}/${totalLessons}</b><span>lessons learnt</span></div>
      <div class="stat"><b>${Object.keys(P.oracle).length}/${SCENARIOS.length}</b><span>Oracle trials</span></div>
      <div class="stat"><b>${Object.keys(P.labs).length}/${LABS.length}</b><span>terminal labs</span></div>
    </div>
  </section>
  <div class="mapwrap">${mapSvg()}</div>
  ${tiers.map((t) => `<h2>${t} <span class="muted small" style="font-family:var(--font-body)">${tierBlurb[t]}</span></h2>
  <div class="levels">${LEVELS.filter((l) => l.tier === t).map(levelCard).join('')}</div>`).join('')}
  <hr>
  <div class="grid cols-3">
    ${featureCard('🔮', 'The Oracle', 'Branching troubleshooting trials based on real production incidents.', '#/oracle')}
    ${featureCard('💻', 'Terminal labs', 'A simulated openstack CLI: build networks, boot servers, break and fix them.', '#/terminal')}
    ${featureCard('🔨', 'Architecture Forge', 'Size a cloud and generate a proposal and diagram for customers.', '#/forge')}
    ${featureCard('📜', 'Cheat sheet', 'Hundreds of commands, ports, states and config options — printable.', '#/cheatsheet')}
    ${featureCard('📚', 'Codex', 'Every service, the log map, a glossary and trusted sources.', '#/codex')}
    ${featureCard('🏅', 'Your hero', 'Relics, rank, progress export and free-roam mode for pros.', '#/profile')}
  </div>`;
}
const tierBlurb = {
  Mortal: '— foundations, identity and tools',
  Sailor: '— compute, images, networking and storage',
  Hero: '— troubleshooting, observability and high availability',
  Demigod: '— security, day-2 operations and advanced networking',
  Olympian: '— architecture, presales and expert incidents',
};
const featureCard = (icon, title, text, href) => `<a class="card level-card" href="${href}"><span style="font-size:1.8rem">${icon}</span><h3>${title}</h3><p class="muted small" style="margin:0">${text}</p></a>`;
function levelCard(lv) {
  const open = unlocked(lv); const done = levelDone(lv); const pct = (done / lv.lessons.length) * 100;
  return `<a class="level-card${open ? '' : ' locked'}" href="#/level/${lv.id}">
    <span class="seal" title="${esc(lv.relic.name)}">${trialPassed(lv) ? lv.relic.icon : open ? '' : '🔒'}</span>
    <span class="num">BOOK ${toRoman(lv.n)} · ${esc(lv.tier.toUpperCase())}</span>
    <h3>${esc(lv.title)}</h3>
    <span class="place">${esc(lv.place)}</span>
    <span class="small muted">${esc(lv.subtitle)}</span>
    <div class="progress" style="margin-top:6px"><div style="width:${pct}%"></div></div>
    <span class="small muted">${done}/${lv.lessons.length} lessons${P.trials[lv.id] != null ? ` · trial ${P.trials[lv.id]}%` : ''}</span>
  </a>`;
}
function toRoman(n) {
  const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = '';
  for (const [v, r] of m) while (n >= v) { s += r; n -= v; }
  return s;
}

// ------------------------------------------------------------------ paths
const PATHS = {
  sys: { levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15], oracle: SCENARIOS.map((s) => s.id), tools: ['terminal', 'cheatsheet'], why: 'Operate, fix and upgrade the platform end to end.' },
  net: { levels: [1, 2, 3, 6, 8, 10, 13, 15], oracle: ['dhcp-silence', 'floating-ip', 'mtu-hang', 'octavia-pending'], tools: ['terminal', 'cheatsheet'], why: 'Master Neutron, OVN, MTU, SR-IOV, BGP and fabric integration.' },
  pre: { levels: [1, 2, 4, 6, 7, 12, 14], oracle: ['no-valid-host', 'floating-ip'], tools: ['forge', 'codex'], why: 'Explain value credibly, qualify requirements and size solutions.' },
  sa: { levels: [1, 4, 6, 7, 10, 11, 13, 14], oracle: ['no-valid-host', 'noisy-neighbor', 'live-migration'], tools: ['forge', 'cheatsheet'], why: 'Turn requirements into designs, ADRs and bills of materials.' },
  pa: { levels: [1, 10, 11, 12, 13, 14, 15], oracle: ['noisy-neighbor', 'rabbit-partition', 'keystone-401'], tools: ['forge', 'codex'], why: 'Set principles, reference architectures and the platform strategy.' },
  lead: { levels: [1, 8, 9, 10, 12, 15], oracle: ['rabbit-partition', 'keystone-401', 'mtu-hang'], tools: ['oracle', 'forge'], why: 'Build a team that runs the cloud without heroes.' },
};
function paths(sel) {
  const role = sel || P.role || 'sys';
  const p = PATHS[role];
  const lvls = p.levels.map((n) => LEVELS[n - 1]);
  const done = lvls.filter(trialPassed).length;
  app.innerHTML = `
  <p class="eyebrow">Choose your ship</p><h1>Learning paths by role</h1>
  <p class="lede">Every role sails the same sea but visits different islands first. Your role also sets the default tab of every "role lens" in the lessons.</p>
  <div class="tags" style="margin:14px 0">${Object.entries(ROLES).map(([k, v]) => `<a class="pill${k === role ? ' tc' : ''}" href="#/paths/${k}">${v}</a>`).join('')}</div>
  <div class="card">
    <div class="row"><h2 style="margin:0">${ROLES[role]}</h2><span class="spacer"></span>
      ${P.role === role ? '<span class="pill ok">Your role</span>' : `<button class="btn" data-set-role="${role}">Make this my role</button>`}</div>
    <p>${p.why}</p>
    <div class="progress"><div style="width:${(done / lvls.length) * 100}%"></div></div>
    <p class="small muted">${done}/${lvls.length} islands on this path conquered</p>
    <h3>Islands</h3>
    <div class="levels">${lvls.map(levelCard).join('')}</div>
    <h3>Oracle trials</h3>
    <div class="tags">${p.oracle.map((id) => { const s = SCENARIOS.find((x) => x.id === id); return `<a class="pill${P.oracle[id] ? ' ok' : ''}" href="#/oracle/${id}">${P.oracle[id] ? '✓ ' : ''}${esc(s.title)}</a>`; }).join('')}</div>
    <h3>Tools</h3>
    <div class="tags">${p.tools.map((t) => `<a class="pill gold" href="#/${t}">${t[0].toUpperCase() + t.slice(1)}</a>`).join('')}</div>
  </div>`;
  app.querySelector('[data-set-role]')?.addEventListener('click', (e) => { P.role = e.target.dataset.setRole; persist(); toast(`Role set: ${ROLES[P.role]}`); paths(P.role); });
}

// ------------------------------------------------------------------ level
function level(id) {
  const lv = levelById(id); if (!lv) return notFound();
  const open = unlocked(lv);
  const labs = LABS.filter((l) => l.id === lv.lab);
  const oracles = (lv.oracle || []).map((o) => SCENARIOS.find((s) => s.id === o)).filter(Boolean);
  app.innerHTML = `
  <p class="breadcrumb"><a href="#/">Voyage</a> › Book ${toRoman(lv.n)}</p>
  <p class="eyebrow">Book ${toRoman(lv.n)} · ${esc(lv.place)} · ${esc(lv.tier)}</p>
  <h1>${esc(lv.title)}</h1>
  <p class="lede">${esc(lv.subtitle)}</p>
  <div class="prose"><div class="callout myth"><b>From the epic</b>${esc(lv.myth)}</div></div>
  ${open ? '' : `<div class="callout warn"><b>This island is still shrouded in mist</b>Pass the trial of <a href="#/level/${LEVELS[lv.n - 2].id}">${esc(LEVELS[lv.n - 2].place)}</a> first, or enable <a href="#/profile">free-roam mode</a> if you are an experienced voyager.</div>`}
  <div class="grid cols-2" style="margin-top:18px">
    <div class="card">
      <h3 style="margin-top:0">Lessons</h3>
      <ol class="objectives">${lv.lessons.map((ls) => `<li class="${P.lessons[lessonKey(lv, ls)] ? 'done' : ''}"><span>${P.lessons[lessonKey(lv, ls)] ? '✓' : '○'}</span>
        <span>${open ? `<a href="#/lesson/${lv.id}/${ls.id}">${esc(ls.title)}</a>` : esc(ls.title)} <span class="muted small">· ${ls.minutes} min</span></span></li>`).join('')}
        <li class="${trialPassed(lv) ? 'done' : ''}"><span>${trialPassed(lv) ? '✓' : '⚔'}</span><span>${open ? `<a href="#/trial/${lv.id}">The Trial of ${esc(lv.place)}</a>` : `The Trial of ${esc(lv.place)}`} <span class="muted small">· ${lv.quiz.length} questions${P.trials[lv.id] != null ? ` · best ${P.trials[lv.id]}%` : ''}</span></span></li>
      </ol>
      ${open ? `<div class="row" style="margin-top:14px"><a class="btn" href="#/lesson/${lv.id}/${(lv.lessons.find((x) => !P.lessons[lessonKey(lv, x)]) || lv.lessons[0]).id}">Set sail</a></div>` : ''}
    </div>
    <div class="card">
      <h3 style="margin-top:0">Relic of this island</h3>
      <div class="row"><span style="font-size:2.4rem;${trialPassed(lv) ? '' : 'filter:grayscale(1);opacity:.4'}">${lv.relic.icon}</span>
      <div><b>${esc(lv.relic.name)}</b><br><span class="muted small">${esc(lv.relic.desc)}</span></div></div>
      ${labs.length ? `<h3>Practice in the terminal</h3>${labs.map((l) => `<a class="pill gold" href="#/terminal/${l.id}">${P.labs[l.id] ? '✓ ' : '💻 '}${esc(l.title)}</a>`).join(' ')}` : ''}
      ${oracles.length ? `<h3>Consult the Oracle</h3><div class="tags">${oracles.map((s) => `<a class="pill${P.oracle[s.id] ? ' ok' : ''}" href="#/oracle/${s.id}">${P.oracle[s.id] ? '✓ ' : '🔮 '}${esc(s.title)}</a>`).join('')}</div>` : ''}
    </div>
  </div>
  <div class="row" style="margin-top:22px">
    ${lv.n > 1 ? `<a class="btn ghost" href="#/level/${LEVELS[lv.n - 2].id}">← ${esc(LEVELS[lv.n - 2].place)}</a>` : ''}<span class="spacer"></span>
    ${lv.n < LEVELS.length ? `<a class="btn ghost" href="#/level/${LEVELS[lv.n].id}">${esc(LEVELS[lv.n].place)} →</a>` : ''}
  </div>`;
}

// ------------------------------------------------------------------ lesson
function sidebar(lv, currentId) {
  return `<aside class="sidebar"><h4>Book ${toRoman(lv.n)} · ${esc(lv.place)}</h4><ol>
    ${lv.lessons.map((ls) => `<li><a href="#/lesson/${lv.id}/${ls.id}" class="${ls.id === currentId ? 'current' : ''}"><span class="tick">${P.lessons[lessonKey(lv, ls)] ? '✓' : '○'}</span>${esc(ls.title)}</a></li>`).join('')}
    <li><a href="#/trial/${lv.id}" class="${currentId === '__trial' ? 'current' : ''}"><span class="tick">${trialPassed(lv) ? '✓' : '⚔'}</span>Trial of ${esc(lv.place)}</a></li>
    </ol><hr style="margin:10px 0"><a class="small" href="#/level/${lv.id}">Island overview</a> · <a class="small" href="#/cheatsheet">Cheat sheet</a></aside>`;
}
function lesson(levelId, lessonId) {
  const lv = levelById(levelId); const ls = lv?.lessons.find((x) => x.id === lessonId);
  if (!ls) return notFound();
  if (!unlocked(lv)) { location.hash = `#/level/${lv.id}`; return; }
  const idx = lv.lessons.indexOf(ls); const next = lv.lessons[idx + 1];
  const done = !!P.lessons[lessonKey(lv, ls)];
  app.innerHTML = `<p class="breadcrumb"><a href="#/">Voyage</a> › <a href="#/level/${lv.id}">Book ${toRoman(lv.n)}</a> › Lesson ${idx + 1}</p>
  <div class="lesson-layout">${sidebar(lv, ls.id)}
    <article class="prose">
      <p class="eyebrow">Lesson ${idx + 1} of ${lv.lessons.length} · ${ls.minutes} min · +${XP.lesson} XP</p>
      <h1>${esc(ls.title)}</h1>
      ${ls.html}
      ${ls.sources?.length ? `<h3>Sources & further reading</h3><ul class="small">${ls.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>` : ''}
      <hr>
      <div class="row">
        ${idx > 0 ? `<a class="btn ghost" href="#/lesson/${lv.id}/${lv.lessons[idx - 1].id}">← Previous</a>` : ''}
        <span class="spacer"></span>
        <button class="btn gold" data-complete>${done ? 'Completed ✓ — continue' : 'Mark as learnt & continue'} →</button>
      </div>
    </article></div>`;
  applyRoleLens();
  $('[data-complete]').addEventListener('click', () => {
    if (!P.lessons[lessonKey(lv, ls)]) { P.lessons[lessonKey(lv, ls)] = Date.now(); award(XP.lesson, 'Lesson learnt.'); }
    location.hash = next ? `#/lesson/${lv.id}/${next.id}` : `#/trial/${lv.id}`;
  });
}
function applyRoleLens() {
  if (!P.role) return;
  document.querySelectorAll('[data-lens-group]').forEach((g) => {
    const tab = g.querySelector(`[data-lens="${P.role}"]`); if (tab) selectLens(g, P.role);
  });
}
function selectLens(group, key) {
  group.querySelectorAll('[data-lens]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.lens === key)));
  group.querySelectorAll('[data-lens-body]').forEach((b) => { b.hidden = b.dataset.lensBody !== key; });
}

// ------------------------------------------------------------------ trial (quiz)
function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function trial(levelId) {
  const lv = levelById(levelId); if (!lv) return notFound();
  if (!unlocked(lv)) { location.hash = `#/level/${lv.id}`; return; }
  const qs = lv.quiz.map((q) => ({ ...q, order: shuffle(q.a.map((_, i) => i)) }));
  let answered = 0; let right = 0;
  app.innerHTML = `<p class="breadcrumb"><a href="#/">Voyage</a> › <a href="#/level/${lv.id}">Book ${toRoman(lv.n)}</a> › Trial</p>
  <div class="lesson-layout">${sidebar(lv, '__trial')}
  <article class="prose">
    <p class="eyebrow">The Trial of ${esc(lv.place)}</p>
    <h1>Prove your worth</h1>
    <p class="lede">Answer ${qs.length} questions. Score 70% or more to claim the ${esc(lv.relic.name)} and open the way to the next island.</p>
    ${qs.map((q, qi) => `<div class="q card" data-q="${qi}"><h3>${qi + 1}. ${esc(q.q)}</h3><div class="opts">
      ${q.order.map((ai, k) => `<button class="opt" type="button" data-a="${ai}"><span class="k">${'ABCD'[k]}</span><span>${esc(q.a[ai])}</span></button>`).join('')}
    </div><div class="explain" hidden></div></div>`).join('')}
    <div class="card" data-result hidden></div>
  </article></div>`;
  app.querySelectorAll('.q').forEach((el) => el.addEventListener('click', (e) => {
    const btn = e.target.closest('.opt'); if (!btn || el.dataset.done) return;
    const q = qs[Number(el.dataset.q)]; const ok = Number(btn.dataset.a) === q.c;
    el.dataset.done = '1'; answered++; if (ok) right++;
    el.querySelectorAll('.opt').forEach((b) => { b.disabled = true; if (Number(b.dataset.a) === q.c) b.classList.add('right'); });
    if (!ok) btn.classList.add('wrong');
    const ex = el.querySelector('.explain'); ex.hidden = false; ex.innerHTML = `${ok ? '✅ Correct.' : '❌ Not quite.'} ${esc(q.e)}`;
    if (answered === qs.length) finish();
  }));
  function finish() {
    const pct = Math.round((right / qs.length) * 100);
    const best = P.trials[lv.id]; const firstPass = pct >= 70 && !(best >= 70);
    const firstPerfect = pct === 100 && best !== 100;
    P.trials[lv.id] = Math.max(best || 0, pct); persist();
    if (firstPass) award(XP.trial, `Trial passed! ${lv.relic.icon} ${lv.relic.name} claimed.`);
    if (firstPerfect) setTimeout(() => award(XP.perfect, 'Flawless trial!'), 1200);
    const nxt = LEVELS[lv.n];
    const r = $('[data-result]'); r.hidden = false;
    r.innerHTML = pct >= 70
      ? `<h2 style="margin-top:0">${lv.relic.icon} Victory — ${pct}%</h2><p>You claimed the <b>${esc(lv.relic.name)}</b>. ${esc(lv.relic.desc)}</p>
         <div class="row">${nxt ? `<a class="btn gold" href="#/level/${nxt.id}">Sail on to ${esc(nxt.place)} →</a>` : '<a class="btn gold" href="#/profile">You are home. See your relics →</a>'}<button class="btn ghost" data-retry>Retry</button></div>`
      : `<h2 style="margin-top:0">The sea turns you back — ${pct}%</h2><p>You need 70%. Review the explanations above and the lessons, then try again.</p><div class="row"><button class="btn" data-retry>Try again</button><a class="btn ghost" href="#/level/${lv.id}">Review lessons</a></div>`;
    r.querySelector('[data-retry]').addEventListener('click', () => trial(lv.id));
    r.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ------------------------------------------------------------------ oracle
function oracle(id) {
  if (!id) {
    app.innerHTML = `<p class="eyebrow">Delphi</p><h1>The Oracle of Troubleshooting</h1>
    <p class="lede">Each trial is a real-world incident. Read the evidence, choose your next move, and find the root cause. Wrong turns cost XP, but teach as much as right ones.</p>
    <div class="grid cols-3" style="margin-top:18px">${[...SCENARIOS].sort((a, b) => a.difficulty - b.difficulty).map((s) => `
      <a class="level-card" href="#/oracle/${s.id}">
        <span class="seal">${P.oracle[s.id] ? '✓' : '🔮'}</span>
        <span class="num">${'◆'.repeat(s.difficulty)}${'◇'.repeat(5 - s.difficulty)} · DIFFICULTY ${s.difficulty}</span>
        <h3>${esc(s.title)}</h3><span class="small muted">${esc(s.summary)}</span>
        <div class="tags">${s.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
      </a>`).join('')}</div>`;
    return;
  }
  const s = SCENARIOS.find((x) => x.id === id); if (!s) return notFound();
  let mistakes = 0; const trail = [];
  const render = (nodeId) => {
    const n = s.nodes[nodeId];
    const body = `<div class="card oracle-step">
      <p>${n.text}</p>
      ${n.out ? `<div class="term"><div class="term-head"><i></i><i></i><i></i><span>evidence</span></div><pre>${esc(n.out)}</pre></div>` : ''}
      ${n.end ? `<div class="callout oracle"><b>The Oracle's lesson</b>${esc(n.lesson)}</div>
        <div class="row"><a class="btn gold" href="#/oracle">More trials</a><button class="btn ghost" data-restart>Replay</button></div>`
        : `<div class="choices">${n.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.t)}</button>`).join('')}</div><div class="explain" data-fb hidden></div>`}
    </div>`;
    $('[data-stage]').innerHTML = body;
    $('[data-trail]').innerHTML = trail.length ? `<ol class="trail">${trail.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : '';
    if (n.end) {
      if (!P.oracle[s.id]) {
        P.oracle[s.id] = { mistakes, at: Date.now() };
        award(Math.max(20, XP.oracle - mistakes * 10), `Trial solved with ${mistakes} wrong turn${mistakes === 1 ? '' : 's'}.`);
      }
      $('[data-restart]').addEventListener('click', () => oracle(s.id));
      return;
    }
    $('[data-stage]').querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
      const c = n.choices[Number(b.dataset.i)];
      if (c.wrong) {
        mistakes++; b.disabled = true; b.style.opacity = '.55';
        const fb = $('[data-fb]'); fb.hidden = false; fb.innerHTML = `❌ ${esc(c.wrong)}`;
      } else { trail.push(c.t); render(c.go); }
    }));
  };
  app.innerHTML = `<p class="breadcrumb"><a href="#/oracle">Oracle</a> › ${esc(s.title)}</p>
  <p class="eyebrow">Difficulty ${s.difficulty}/5 · ${s.tags.map(esc).join(' · ')}</p><h1>${esc(s.title)}</h1>
  <p class="lede">${esc(s.summary)}</p><div data-trail></div><div data-stage></div>`;
  render(s.start);
}

// ------------------------------------------------------------------ terminal
let sim;
function terminal(labId) {
  sim ||= new Simulator();
  const lab = LABS.find((l) => l.id === labId) || LABS.find((l) => !P.labs[l.id]) || LABS[0];
  app.innerHTML = `<p class="eyebrow">The Helm</p><h1>Terminal labs</h1>
  <p class="lede">A safe, simulated OpenStack cloud in your browser. Commands, outputs and errors mirror the real <code>openstack</code> client. Type <code>help</code> to begin.</p>
  <div class="tags" style="margin:10px 0 16px">${LABS.map((l) => `<a class="pill${l.id === lab.id ? ' tc' : ''}${P.labs[l.id] ? ' ok' : ''}" href="#/terminal/${l.id}">${P.labs[l.id] ? '✓ ' : ''}${esc(l.title)}</a>`).join('')}</div>
  <div class="term-layout">
    <div class="shell" data-shell>
      <div class="shell-out" data-out aria-live="polite"></div>
      <form class="shell-in" data-form><label for="shell-input">voyager@ithaca:~$</label>
        <input id="shell-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command input"></form>
    </div>
    <div class="card">
      <p class="eyebrow">${esc(lab.level)}</p><h3 style="margin-top:4px">${esc(lab.title)}</h3>
      <p class="small">${esc(lab.intro)}</p>
      <ul class="objectives" data-goals></ul>
      <p class="small muted" style="margin-top:12px">Click a hint to paste it. State is saved in your browser; <code>reset-lab</code> starts over.</p>
    </div>
  </div>`;
  const out = $('[data-out]'); const input = $('#shell-input');
  const hist = []; let hi = 0;
  const print = (text, cls = '') => { const span = document.createElement('span'); if (cls) span.className = cls; span.textContent = `${text}\n`; out.appendChild(span); out.scrollTop = out.scrollHeight; };
  print('OpenStack Odyssey simulator — RegionOne · release 2026.1 "Gazpacho"', 'dim');
  print('Type "help" for commands. Start with:  source argonauts-openrc.sh\n', 'dim');
  const goals = () => {
    const el = $('[data-goals]'); if (!el) return;
    const st = lab.goals.map(([t, hint, check]) => ({ t, hint, ok: check(sim.done, sim.s) }));
    el.innerHTML = st.map((g) => `<li class="${g.ok ? 'done' : ''}"><span>${g.ok ? '✓' : '○'}</span><span>${esc(g.t)}<span class="hint"><a href="#" data-hint="${esc(g.hint)}">${esc(g.hint)}</a></span></span></li>`).join('');
    if (st.every((g) => g.ok) && !P.labs[lab.id]) { P.labs[lab.id] = Date.now(); award(XP.lab, `Lab complete: ${lab.title}!`); }
  };
  goals();
  $('[data-goals]').addEventListener('click', (e) => { const a = e.target.closest('[data-hint]'); if (!a) return; e.preventDefault(); input.value = a.dataset.hint; input.focus(); });
  $('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value; input.value = '';
    const pr = document.createElement('span'); pr.innerHTML = `<span class="pr">voyager@ithaca:~$ </span><span class="cmd">${esc(line)}</span>\n`; out.appendChild(pr);
    if (line.trim()) { hist.push(line); hi = hist.length; }
    if (line.trim() === 'clear') { out.textContent = ''; return; }
    if (line.trim() === 'history') { print(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n')); return; }
    const r = sim.exec(line);
    if (r.out) print(r.out, r.cls || '');
    goals();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length - 1) input.value = hist[++hi]; else { hi = hist.length; input.value = ''; } }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const m = COMPLETIONS.filter((c) => c.startsWith(input.value));
      if (m.length === 1) input.value = `${m[0]} `;
      else if (m.length > 1) {
        let pre = m[0]; for (const c of m) while (!c.startsWith(pre)) pre = pre.slice(0, -1);
        if (pre.length > input.value.length) input.value = pre; else print(m.join('   '), 'dim');
      }
    }
  });
  $('[data-shell]').addEventListener('click', () => { if (!window.getSelection().toString()) input.focus(); });
  input.focus();
  const iv = setInterval(goals, 1500); // BUILD → ACTIVE transitions happen over time
  cleanup = () => clearInterval(iv);
}

// ------------------------------------------------------------------ forge, codex, cheatsheet
function forge() { renderForge(app, { toast }); }

function codex() {
  app.innerHTML = `<p class="eyebrow">The Library of Alexandria</p><h1>Codex</h1>
  <p class="lede">The pantheon of OpenStack services, where to look when things break, a glossary and the sources this journey is built on.</p>
  <input class="codex-search" type="search" placeholder="Search services, logs, terms…" data-search aria-label="Search the codex">
  <h2>Services</h2>
  <div class="grid cols-3" data-filterable>${SERVICES.map(([code, name, cat, desc, proj]) => `
    <div class="card svc" data-text="${esc(`${code} ${name} ${cat} ${desc}`.toLowerCase())}">
      <span class="code">${esc(cat)}</span><h3>${esc(code)} <span class="muted small">· ${esc(name)}</span></h3>
      <span class="small">${esc(desc)}</span><a class="small" href="${doc(proj)}" target="_blank" rel="noopener">2026.1 docs →</a></div>`).join('')}</div>
  <h2>Where the shades speak: symptom → log</h2>
  <div class="prose" style="max-width:none"><table data-filterable><tr><th>Symptom</th><th>Service</th><th>Log (Kolla: /var/log/kolla/…)</th><th>Look for</th></tr>
  ${LOGMAP.map((r) => `<tr data-text="${esc(r.join(' ').toLowerCase())}">${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>
  <h2>Glossary</h2>
  <div class="grid cols-2" data-filterable>${GLOSSARY.map(([t, d]) => `<div class="card" data-text="${esc(`${t} ${d}`.toLowerCase())}"><b>${esc(t)}</b><br><span class="small">${esc(d)}</span></div>`).join('')}</div>
  <h2>Sources</h2>
  <ul>${SOURCES.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>`;
  bindSearch();
}
function bindSearch() {
  $('[data-search]').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    app.querySelectorAll('[data-text]').forEach((el) => { el.hidden = q && !el.dataset.text.includes(q); });
    app.querySelectorAll('[data-section]').forEach((sec) => { sec.hidden = q && !sec.querySelector('[data-text]:not([hidden])'); });
  });
}

function cheatsheet() {
  const copyBtn = (cmd) => `<button type="button" class="cs-copy" data-copy="${esc(cmd)}" title="Copy">⧉</button>`;
  app.innerHTML = `<p class="eyebrow">The Scroll of Palamedes</p><h1>OpenStack cheat sheet</h1>
  <p class="lede">The commands, ports, states and settings you reach for most — from a first token to a 3 a.m. incident. Search it, copy from it, print it.</p>
  <div class="row no-print"><input class="codex-search" style="flex:1;margin:0" type="search" placeholder="Filter: e.g. migrate, mtu, ceph, quota, 5672…" data-search aria-label="Filter the cheat sheet">
    <button class="btn ghost" type="button" data-print>Print / PDF</button></div>
  <nav class="tags no-print" style="margin:14px 0 6px">${CHEAT.map((s) => `<a class="pill" href="#/cheatsheet" data-jump="${s.id}">${s.icon} ${esc(s.title)}</a>`).join('')}
    <a class="pill" href="#/cheatsheet" data-jump="symptoms">🩺 Symptoms</a><a class="pill" href="#/cheatsheet" data-jump="ports">🔌 Ports</a>
    <a class="pill" href="#/cheatsheet" data-jump="states">🔁 States</a><a class="pill" href="#/cheatsheet" data-jump="config">⚙️ Config</a></nav>
  <div class="cheat">
  ${CHEAT.map((s) => `<section class="cheat-sec" id="cs-${s.id}" data-section><h2>${s.icon} ${esc(s.title)}</h2>
    <dl>${s.items.map(([c, d]) => `<div class="cs-row" data-text="${esc(`${c} ${d} ${s.title}`.toLowerCase())}"><dt><code>${esc(c)}</code>${copyBtn(c)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl></section>`).join('')}
  <section class="cheat-sec wide" id="cs-symptoms" data-section><h2>🩺 Symptom → cause → first check</h2>
    <div class="prose" style="max-width:none"><table><tr><th>Symptom</th><th>Usual causes</th><th>First check</th></tr>
    ${SYMPTOMS.map((r) => `<tr data-text="${esc(r.join(' ').toLowerCase())}"><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td><code>${esc(r[2])}</code></td></tr>`).join('')}</table></div></section>
  <section class="cheat-sec" id="cs-ports" data-section><h2>🔌 Default ports</h2>
    <div class="prose" style="max-width:none"><table><tr><th>Service</th><th>Port</th><th>Purpose</th></tr>
    ${PORTS.map((r) => `<tr data-text="${esc(r.join(' ').toLowerCase())}">${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div></section>
  <section class="cheat-sec" id="cs-states" data-section><h2>🔁 Resource states</h2>
    <dl>${STATES.map(([t, d]) => `<div class="cs-row" data-text="${esc(`${t} ${d}`.toLowerCase())}"><dt><b>${esc(t)}</b></dt><dd>${esc(d)}</dd></div>`).join('')}</dl></section>
  <section class="cheat-sec wide" id="cs-config" data-section><h2>⚙️ Config options that matter</h2>
    <div class="prose" style="max-width:none"><table><tr><th>File</th><th>Option</th><th>Why</th></tr>
    ${CONFIG.map((r) => `<tr data-text="${esc(r.join(' ').toLowerCase())}"><td><code>${esc(r[0])}</code></td><td><code>${esc(r[1])}</code></td><td>${esc(r[2])}</td></tr>`).join('')}</table></div></section>
  <section class="cheat-sec wide" data-section><h2>🧮 Formulas</h2><dl>
    <div class="cs-row" data-text="placement capacity allocation ratio"><dt><code>capacity = (total − reserved) × allocation_ratio − used</code></dt><dd>Placement free capacity per resource class, per host</dd></div>
    <div class="cs-row" data-text="compute hosts sizing"><dt><code>hosts = max(ΣvCPU ÷ (threads×cpu_ratio), ΣRAM ÷ ((RAM−reserved)×ram_ratio)) + HA</code></dt><dd>Compute sizing</dd></div>
    <div class="cs-row" data-text="ceph usable capacity raw replication"><dt><code>usable ≈ raw ÷ replicas × fill_target</code></dt><dd>Ceph: 1 PB raw, 3×, 75% ≈ 250 TB</dd></div>
    <div class="cs-row" data-text="mtu geneve vxlan overhead"><dt><code>tenant MTU = physical MTU − 58 (Geneve) | − 50 (VXLAN)</code></dt><dd>1500 → 1442 (Geneve IPv4)</dd></div>
    <div class="cs-row" data-text="quorum failures tolerated"><dt><code>failures tolerated = ⌊(members − 1) ÷ 2⌋</code></dt><dd>3 → 1, 5 → 2 (Galera, RabbitMQ quorum queues, OVN RAFT, Ceph MON)</dd></div>
    <div class="cs-row" data-text="erasure coding overhead"><dt><code>EC k+m overhead = (k+m) ÷ k</code></dt><dd>4+2 → 1.5× raw per usable</dd></div>
  </dl></section>
  </div>`;
  bindSearch();
  $('[data-print]').addEventListener('click', () => window.print());
  app.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById(`cs-${a.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth' }); }));
}

// ------------------------------------------------------------------ profile
function profile() {
  const r = rankOf(P.xp);
  const special = [
    ['🔮', 'Favourite of Delphi', 'Solve every Oracle trial', Object.keys(P.oracle).length === SCENARIOS.length],
    ['⚓', 'Master Mariner', 'Complete every terminal lab', Object.keys(P.labs).length === LABS.length],
    ['📖', 'Scholar of Alexandria', 'Learn every lesson', Object.keys(P.lessons).length >= totalLessons],
    ['🏆', 'Flawless Voyager', 'Score 100% on five trials', Object.values(P.trials).filter((x) => x === 100).length >= 5],
  ];
  app.innerHTML = `<p class="eyebrow">The Hero</p><h1>${esc(P.name || 'Nameless voyager')}</h1>
  <p class="lede">${r.name} · ${P.xp} XP${r.next ? ` · ${r.next - P.xp} XP to ${r.nextName}` : ''}</p>
  <div class="progress" style="max-width:520px"><div style="width:${r.pct}%"></div></div>
  <div class="grid cols-2" style="margin-top:20px">
    <div class="card"><h3 style="margin-top:0">Identity</h3>
      <div class="field"><label for="p-name">Your name</label><input id="p-name" type="text" value="${esc(P.name)}" maxlength="40"></div>
      <div class="field"><label for="p-role">Your role</label><select id="p-role"><option value="">— choose —</option>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}"${P.role === k ? ' selected' : ''}>${v}</option>`).join('')}</select><small>Sets your learning path and the default role lens in lessons.</small></div>
      <label class="row small"><input type="checkbox" id="p-free"${P.freeRoam ? ' checked' : ''}> Free-roam mode: unlock every island (for experienced voyagers)</label>
    </div>
    <div class="card"><h3 style="margin-top:0">Ship's log</h3>
      <p class="small">Progress lives in this browser only. Export it to move between devices.</p>
      <div class="row"><button class="btn ghost" data-export>Export progress</button>
      <label class="btn ghost" style="cursor:pointer">Import<input type="file" accept="application/json" data-import hidden></label>
      <button class="btn ghost" data-reset style="color:var(--bad)">Reset all</button></div>
    </div>
  </div>
  <h2>Relics of the islands</h2>
  <div class="badges">${LEVELS.map((lv) => `<div class="badge${trialPassed(lv) ? ' earned' : ''}"><div class="icon">${lv.relic.icon}</div><b>${esc(lv.relic.name)}</b><span>${esc(lv.place)}</span></div>`).join('')}</div>
  <h2>Honours</h2>
  <div class="badges">${special.map(([i, n, d, ok]) => `<div class="badge${ok ? ' earned' : ''}"><div class="icon">${i}</div><b>${n}</b><span>${d}</span></div>`).join('')}</div>`;
  $('#p-name').addEventListener('change', (e) => { P.name = e.target.value.trim(); persist(); toast('Name inscribed.'); });
  $('#p-role').addEventListener('change', (e) => { P.role = e.target.value; persist(); toast(P.role ? `Role set: ${ROLES[P.role]}` : 'Role cleared'); });
  $('#p-free').addEventListener('change', (e) => { P.freeRoam = e.target.checked; persist(); toast(P.freeRoam ? 'All islands revealed.' : 'The mists return.'); });
  $('[data-export]').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' }));
    a.download = 'openstack-odyssey-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('[data-import]').addEventListener('change', async (e) => {
    try { const data = JSON.parse(await e.target.files[0].text()); if (typeof data.xp !== 'number') throw new Error('bad file'); P = { ...blank(), ...data }; persist(); toast('Progress restored.'); profile(); }
    catch { toast('That scroll could not be read.'); }
  });
  $('[data-reset]').addEventListener('click', () => {
    if (!confirm('Erase all progress, XP and relics? This cannot be undone.')) return;
    P = blank(); persist(); sim?.reset(); toast('A new voyage begins.'); profile();
  });
}

// ------------------------------------------------------------------ global UI
document.addEventListener('click', async (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    try { await navigator.clipboard.writeText(copy.dataset.copy); toast('Copied to clipboard'); } catch { toast('Copy failed — select the text manually'); }
    return;
  }
  const tab = e.target.closest('[data-lens]');
  if (tab) selectLens(tab.closest('[data-lens-group]'), tab.dataset.lens);
});
$('[data-menu]').addEventListener('click', (e) => {
  const nav = $('[data-nav]'); nav.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(nav.classList.contains('open')));
});
const THEME_KEY = 'odyssey.theme';
function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
try { applyTheme(localStorage.getItem(THEME_KEY)); } catch { /* ignore */ }
$('[data-theme-toggle]').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const t = dark ? 'light' : 'dark'; applyTheme(t);
  try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
});

updateXpBox();
route();
