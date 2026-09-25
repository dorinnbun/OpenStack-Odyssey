// A small, stateful simulation of a Ceph (Tentacle 20.2) cluster for the
// Argonautica labs: ceph status/health, OSD tree, pools, RBD images, cephx
// users, and a failed-disk drill with recovery and replacement.

const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const key = () => `AQ${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(28)))).replace(/=+$/, '')}==`;
const HOSTS = [['ceph-01', '10.0.0.11'], ['ceph-02', '10.0.0.12'], ['ceph-03', '10.0.0.13']];
const OSD_GIB = 1000;

export function initialCeph() {
  return {
    fsid: `${hex(4)}-${hex(2)}-11f0-${hex(2)}-${hex(6)}`,
    osds: Array.from({ length: 9 }, (_, i) => ({ id: i, host: HOSTS[Math.floor(i / 3)][0], dev: `/dev/sd${'bcd'[i % 3]}`, up: true, in: true, destroyed: false, usedGiB: 14 + (i % 3) })),
    pools: [{ id: 1, name: '.mgr', size: 3, min_size: 2, pg_num: 1, app: 'mgr', type: 'replicated', autoscale: 'on', storedGiB: 0 }],
    nextPoolId: 2,
    images: [],
    auth: { 'client.admin': { key: key(), caps: { mds: 'allow *', mgr: 'allow *', mon: 'allow *', osd: 'allow *' } } },
    flags: [],
    recoverUntil: 0,
    failureSeen: false,
  };
}

const err = (out) => ({ out, cls: 'err' });
const fmtGiB = (g) => (g >= 1024 ? `${(g / 1024).toFixed(1)} TiB` : `${Math.round(g)} GiB`);
const pgsTotal = (c) => c.pools.reduce((t, p) => t + p.pg_num, 0);
const findPool = (c, name) => c.pools.find((p) => p.name === name);

function health(c) {
  const checks = [];
  const now = Date.now();
  // Like Ceph's OSD_DOWN check: only OSDs that are down but still "in" count.
  const down = c.osds.filter((o) => !o.up && o.in && !o.destroyed);
  if (down.length) checks.push(['OSD_DOWN', `${down.length} osds down`, down.map((o) => `osd.${o.id} (root=default,host=${o.host}) is down`)]);
  const degradedIn = down.some((o) => o.in);
  if (degradedIn || now < c.recoverUntil) {
    const pgs = Math.max(4, Math.round(pgsTotal(c) / 9));
    checks.push(['PG_DEGRADED', `Degraded data redundancy: ${degradedIn ? '1204/36123 objects degraded (3.333%)' : '402/36123 objects degraded (1.113%)'}, ${pgs} pgs degraded${degradedIn ? ', ' + pgs + ' pgs undersized' : ''}`,
      [degradedIn ? `pg states: ${pgs} active+undersized+degraded` : `recovery in progress: ${pgs} pgs active+recovering+degraded`]]);
  }
  if (c.flags.includes('noout')) checks.push(['OSDMAP_FLAGS', 'noout flag(s) set', ['remember: ceph osd unset noout when maintenance is over']]);
  const noApp = c.pools.filter((p) => !p.app);
  if (noApp.length) checks.push(['POOL_APP_NOT_ENABLED', `application not enabled on ${noApp.length} pool(s)`, noApp.map((p) => `application not enabled on pool '${p.name}'`).concat(["use 'ceph osd pool application enable <pool-name> <app-name>', where <app-name> is 'cephfs', 'rbd', 'rgw', or freeform for custom applications."])]);
  const small = c.pools.filter((p) => p.size < 3 && p.name !== '.mgr');
  if (small.length) checks.push(['POOL_NO_REDUNDANCY_RISK', `${small.length} pool(s) with fewer than 3 replicas`, small.map((p) => `pool '${p.name}' has size ${p.size}: one more failure could lose data`)]);
  const status = !checks.length ? 'HEALTH_OK' : 'HEALTH_WARN';
  return { status, checks };
}

function pgLine(c) {
  const total = pgsTotal(c);
  const down = c.osds.some((o) => !o.up && !o.destroyed && o.in);
  const rec = Date.now() < c.recoverUntil;
  if (!down && !rec) return `${total} active+clean`;
  const bad = Math.max(4, Math.round(total / 9));
  return `${bad} ${down ? 'active+undersized+degraded' : 'active+recovering+degraded'}\n             ${Math.max(total - bad, 0)} active+clean`;
}

function status(sim) {
  const c = sim.s.ceph; const h = health(c);
  const live = c.osds.filter((o) => !o.destroyed);
  const up = live.filter((o) => o.up).length; const inn = live.filter((o) => o.in).length;
  const used = c.osds.reduce((t, o) => t + (o.destroyed ? 0 : o.usedGiB), 0) + c.pools.reduce((t, p) => t + p.storedGiB * p.size, 0);
  const total = live.length * OSD_GIB;
  const objects = c.images.length * 3 + 2;
  sim.mark('ceph-status');
  if (h.status === 'HEALTH_OK' && c.failureSeen) sim.mark('ceph-healed');
  const hl = h.checks.map(([, msg]) => `            ${msg}`).join('\n');
  return { out: `  cluster:
    id:     ${c.fsid}
    health: ${h.status}${hl ? `\n${hl}` : ''}

  services:
    mon: 3 daemons, quorum ceph-01,ceph-02,ceph-03 (age 2h)
    mgr: ceph-01.xkqfle(active, since 2h), standbys: ceph-02.pmrwta
    osd: ${live.length} osds: ${up} up (since ${up === live.length ? '2h' : '4m'}), ${inn} in (since ${inn === live.length ? '2h' : '1m'})

  data:
    pools:   ${c.pools.length} pools, ${pgsTotal(c)} pgs
    objects: ${objects} objects, ${fmtGiB(c.pools.reduce((t, p) => t + p.storedGiB, 0))}
    usage:   ${fmtGiB(used)} used, ${fmtGiB(total - used)} / ${fmtGiB(total)} avail
    pgs:     ${pgLine(c)}${Date.now() < c.recoverUntil ? '\n\n  io:\n    recovery: 412 MiB/s, 103 objects/s' : ''}`, cls: h.status === 'HEALTH_OK' ? 'ok' : '' };
}

function healthCmd(sim, detail) {
  const c = sim.s.ceph; const h = health(c);
  if (!detail) return h.status === 'HEALTH_OK' ? 'HEALTH_OK' : `HEALTH_WARN ${h.checks.map(([, m]) => m).join('; ')}`;
  sim.mark('ceph-health-detail');
  if (h.status === 'HEALTH_OK') return 'HEALTH_OK';
  return `HEALTH_WARN ${h.checks.map(([, m]) => m).join('; ')}\n${h.checks.map(([id, m, lines]) => `[WRN] ${id}: ${m}\n${lines.map((l) => `    ${l}`).join('\n')}`).join('\n')}`;
}

function tree(sim, filterDown) {
  const c = sim.s.ceph;
  if (c.osds.some((o) => !o.up && !o.destroyed)) { sim.mark('ceph-tree-down'); c.failureSeen = true; }
  sim.mark('ceph-tree');
  const rows = ['ID   CLASS  WEIGHT   TYPE NAME         STATUS     REWEIGHT  PRI-AFF', `-1          ${(c.osds.filter((o) => !o.destroyed).length * 0.97659).toFixed(5)}  root default`];
  HOSTS.forEach(([h], hi) => {
    const osds = c.osds.filter((o) => o.host === h && (!filterDown || (!o.up)));
    if (filterDown && !osds.length) return;
    rows.push(`${String(-(hi * 2 + 3)).padEnd(4)}         ${(c.osds.filter((o) => o.host === h && !o.destroyed).length * 0.97659).toFixed(5)}      host ${h}`);
    osds.forEach((o) => rows.push(` ${String(o.id).padEnd(3)}   ssd  0.97659          osd.${o.id}     ${(o.destroyed ? 'destroyed' : o.up ? 'up' : 'down').padEnd(9)}  ${o.in ? '1.00000' : '      0'}  1.00000`));
  });
  return rows.join('\n');
}

function df(sim) {
  const c = sim.s.ceph; sim.mark('ceph-df');
  const live = c.osds.filter((o) => !o.destroyed);
  const total = live.length * OSD_GIB;
  const used = live.reduce((t, o) => t + o.usedGiB, 0) + c.pools.reduce((t, p) => t + p.storedGiB * p.size, 0);
  const maxAvail = (total - used) * 0.95 / 3;
  const pools = c.pools.map((p) => `${p.name.padEnd(9)} ${String(p.id).padStart(2)}  ${String(p.pg_num).padStart(3)}  ${fmtGiB(p.storedGiB).padStart(8)}  ${String(c.images.filter((i) => i.pool === p.name).length * 3 + (p.name === '.mgr' ? 2 : 0)).padStart(7)}  ${fmtGiB(p.storedGiB * p.size).padStart(8)}  ${((p.storedGiB * p.size / total) * 100).toFixed(2).padStart(5)}  ${fmtGiB(maxAvail).padStart(9)}`);
  return `--- RAW STORAGE ---
CLASS     SIZE    AVAIL     USED  RAW USED  %RAW USED
ssd    ${fmtGiB(total).padStart(7)}  ${fmtGiB(total - used).padStart(7)}  ${fmtGiB(used).padStart(7)}   ${fmtGiB(used).padStart(7)}  ${((used / total) * 100).toFixed(2).padStart(9)}
TOTAL  ${fmtGiB(total).padStart(7)}  ${fmtGiB(total - used).padStart(7)}  ${fmtGiB(used).padStart(7)}   ${fmtGiB(used).padStart(7)}  ${((used / total) * 100).toFixed(2).padStart(9)}

--- POOLS ---
POOL      ID  PGS    STORED  OBJECTS      USED  %USED  MAX AVAIL
${pools.join('\n')}
(MAX AVAIL already accounts for 3 copies: usable space is about one third of raw.)`;
}

function parseSize(v) {
  const m = /^(\d+(?:\.\d+)?)([MGT]?)i?B?$/i.exec(String(v || ''));
  if (!m) return null;
  const n = Number(m[1]); const u = (m[2] || 'M').toUpperCase();
  return u === 'T' ? n * 1024 * 1024 : u === 'G' ? n * 1024 : n;
}

function splitSpec(spec) {
  const m = /^([^/]+)\/([^@]+)(?:@(.+))?$/.exec(spec || '');
  return m ? { pool: m[1], name: m[2], snap: m[3] } : null;
}

function capsOf(args) {
  const caps = {};
  for (let i = 0; i < args.length - 1; i += 2) if (['mon', 'osd', 'mgr', 'mds'].includes(args[i])) caps[args[i]] = args[i + 1];
  return caps;
}
const keyring = (name, a, withCaps) => `[${name}]\n\tkey = ${a.key}${withCaps ? Object.entries(a.caps).map(([k, v]) => `\n\tcaps ${k} = "${v}"`).join('') : ''}`;

export function cephExec(sim, cmd, t) {
  const c = sim.s.ceph;
  const w = t.join(' ');
  if (cmd === 'rbd') return rbdExec(sim, t);
  if (!t.length || t[0] === '-h' || t[0] === '--help') return CEPH_HELP;
  if (w === '-s' || w === 'status' || w === '-s --format plain') return status(sim);
  if (w === 'health') return healthCmd(sim, false);
  if (w === 'health detail') return healthCmd(sim, true);
  if (w === 'versions') { sim.mark('ceph-versions'); return '{\n    "mon": { "ceph version 20.2.3 (…) tentacle (stable)": 3 },\n    "mgr": { "ceph version 20.2.3 (…) tentacle (stable)": 2 },\n    "osd": { "ceph version 20.2.3 (…) tentacle (stable)": 9 },\n    "overall": { "ceph version 20.2.3 (…) tentacle (stable)": 14 }\n}'; }
  if (w === 'mon stat') return 'e3: 3 mons at {ceph-01=[v2:10.0.0.11:3300/0,v1:10.0.0.11:6789/0],ceph-02=[…],ceph-03=[…]} removed_ranks: {} disallowed_leaders: {}, election epoch 12, leader 0 ceph-01, quorum 0,1,2 ceph-01,ceph-02,ceph-03';
  if (w === 'osd tree') return tree(sim, false);
  if (w === 'osd tree down') return tree(sim, true);
  if (w === 'df' || w === 'df detail') return df(sim);
  if (w === 'balancer status') return '{\n    "active": true,\n    "mode": "upmap",\n    "optimize_result": "Unable to find further optimization, or pool(s) pg_num is decreasing, or distribution is already perfect"\n}';
  if (t[0] === 'osd' && (t[1] === 'set' || t[1] === 'unset') && t[2]) {
    if (!['noout', 'norebalance', 'nobackfill', 'norecover'].includes(t[2])) return err(`Error EINVAL: unrecognised flag '${t[2]}' (in this lab: noout, norebalance, nobackfill, norecover)`);
    c.flags = c.flags.filter((f) => f !== t[2]); if (t[1] === 'set') c.flags.push(t[2]);
    sim.mark(`flag-${t[1]}-${t[2]}`);
    return `${t[2]} is ${t[1]}`;
  }
  if (t[0] === 'osd' && (t[1] === 'out' || t[1] === 'in') && t[2] !== undefined) {
    const o = c.osds.find((x) => x.id === Number(String(t[2]).replace('osd.', '')));
    if (!o || o.destroyed) return err(`Error ENOENT: osd.${t[2]} does not exist`);
    const was = o.in; o.in = t[1] === 'in';
    if (was !== o.in) c.recoverUntil = Date.now() + (o.up ? 4000 : 6000);
    sim.mark(`osd-${t[1]}-${o.id}`);
    return `marked ${t[1]} osd.${o.id}. `;
  }
  // ---- pools
  if (t[0] === 'osd' && t[1] === 'pool') {
    const sub = t[2];
    if (sub === 'ls') return t[3] === 'detail'
      ? c.pools.map((p) => `pool ${p.id} '${p.name}' ${p.type} size ${p.size} min_size ${p.min_size} crush_rule 0 object_hash rjenkins pg_num ${p.pg_num} pgp_num ${p.pg_num} autoscale_mode ${p.autoscale}${p.app ? ` application ${p.app}` : ''}`).join('\n')
      : c.pools.map((p) => p.name).join('\n');
    if (sub === 'create') {
      const name = t[3]; if (!name) return err('Invalid command: missing required parameter pool(<poolname>)');
      if (findPool(c, name)) return `pool '${name}' already exists`;
      const erasure = t.includes('erasure');
      const pg = Number(t.find((x, i) => i > 3 && /^\d+$/.test(x))) || 32;
      c.pools.push({ id: c.nextPoolId++, name, size: erasure ? 6 : 3, min_size: erasure ? 5 : 2, pg_num: pg, app: '', type: erasure ? 'erasure' : 'replicated', autoscale: 'on', storedGiB: 0 });
      sim.mark(`pool-${name}`);
      return `pool '${name}' created`;
    }
    if (sub === 'set' || sub === 'get') {
      const p = findPool(c, t[3]); if (!p) return err(`Error ENOENT: unrecognized pool '${t[3]}'`);
      const k = t[4];
      if (sub === 'get') return k === 'size' ? `size: ${p.size}` : k === 'min_size' ? `min_size: ${p.min_size}` : k === 'pg_num' ? `pg_num: ${p.pg_num}` : k === 'pg_autoscale_mode' ? `pg_autoscale_mode: ${p.autoscale}` : err(`Error EINVAL: this lab supports size, min_size, pg_num, pg_autoscale_mode`);
      const v = t[5]; if (v === undefined) return err('Invalid command: missing value');
      if (k === 'size') {
        const n = Number(v); if (!(n >= 1 && n <= 5)) return err('Error EINVAL: pool size must be between 1 and 5 in this lab');
        if (n === 1 && !t.includes('--yes-i-really-mean-it')) return err('Error EPERM: configuring pool size as 1 is disabled by default.');
        p.size = n; if (p.min_size > n) p.min_size = Math.max(1, n - 1);
        return { out: `set pool ${p.id} size to ${n}${n < 3 ? '\n(Beware: fewer than 3 copies. One more failure while a copy is missing could lose data.)' : ''}`, cls: n < 3 ? 'err' : '' };
      }
      if (k === 'min_size') { const n = Number(v); if (!(n >= 1 && n <= p.size)) return err('Error EINVAL: min_size must be between 1 and size'); p.min_size = n; return `set pool ${p.id} min_size to ${n}${n === 1 ? '\n(Beware: min_size 1 accepts writes with a single copy.)' : ''}`; }
      if (k === 'pg_num') { p.pg_num = Number(v) || p.pg_num; return `set pool ${p.id} pg_num to ${p.pg_num}`; }
      if (k === 'pg_autoscale_mode') { if (!['on', 'off', 'warn'].includes(v)) return err('Error EINVAL: mode must be on, off or warn'); p.autoscale = v; return `set pool ${p.id} pg_autoscale_mode to ${v}`; }
      return err('Error EINVAL: this lab supports size, min_size, pg_num, pg_autoscale_mode');
    }
    if (sub === 'application' && t[3] === 'enable') {
      const p = findPool(c, t[4]); if (!p) return err(`Error ENOENT: unrecognized pool '${t[4]}'`);
      if (!t[5]) return err('Invalid command: missing application name');
      p.app = t[5]; sim.mark(`app-${p.name}-${t[5]}`);
      return `enabled application '${t[5]}' on pool '${p.name}'`;
    }
    if (sub === 'autoscale-status') return `POOL      SIZE  TARGET SIZE  RATE  RAW CAPACITY   RATIO  TARGET RATIO  EFFECTIVE RATIO  BIAS  PG_NUM  NEW PG_NUM  AUTOSCALE\n${c.pools.map((p) => `${p.name.padEnd(9)} ${fmtGiB(p.storedGiB).padStart(5)}               ${p.size}.0   ${fmtGiB(9 * OSD_GIB).padStart(11)}  0.0000                                  1.0  ${String(p.pg_num).padStart(6)}              ${p.autoscale}`).join('\n')}`;
    if (sub === 'rm' || sub === 'delete') return err('Error EPERM: pool deletion is disabled; you must first set the mon_allow_pool_delete config option to true before you can destroy a pool (and in this lab, you may not).');
    return err(`Invalid command: 'ceph osd pool ${sub || ''}' is not supported in this lab`);
  }
  if (w === 'osd pool autoscale-status') return cephExec(sim, 'ceph', ['osd', 'pool', 'autoscale-status']);
  // ---- auth
  if (t[0] === 'auth') {
    if (t[1] === 'ls' || t[1] === 'list') return Object.entries(c.auth).map(([n, a]) => `${n}\n\tkey: ${a.key}\n${Object.entries(a.caps).map(([k, v]) => `\tcaps: [${k}] ${v}`).join('\n')}`).join('\n');
    if (t[1] === 'get') { const a = c.auth[t[2]]; if (!a) return err(`Error ENOENT: failed to find ${t[2]} in keyring`); sim.mark(`auth-get-${t[2]}`); return keyring(t[2], a, true); }
    if (t[1] === 'get-or-create' || t[1] === 'add') {
      const name = t[2]; if (!/^client\.[\w.-]+$/.test(name || '')) return err('Error EINVAL: entity name must look like client.<name>');
      const caps = capsOf(t.slice(3));
      if (c.auth[name]) {
        const same = JSON.stringify(c.auth[name].caps) === JSON.stringify(caps) || !Object.keys(caps).length;
        if (!same) return err(`Error EINVAL: key for ${name} exists but cap ${Object.keys(caps)[0]} does not match\n(hint: to change capabilities use: ceph auth caps ${name} mon '…' osd '…' mgr '…')`);
        return keyring(name, c.auth[name]);
      }
      c.auth[name] = { key: key(), caps }; sim.mark(`auth-${name}`);
      return keyring(name, c.auth[name]);
    }
    if (t[1] === 'caps') { const a = c.auth[t[2]]; if (!a) return err(`Error ENOENT: failed to find ${t[2]}`); a.caps = capsOf(t.slice(3)); return `updated caps for ${t[2]}`; }
    if (t[1] === 'del' || t[1] === 'rm') { if (t[2] === 'client.admin') return err('Error EPERM: refusing to delete client.admin in this lab'); delete c.auth[t[2]]; return `updated`; }
    return err('Invalid command: this lab supports auth ls, get, get-or-create, caps, del');
  }
  // ---- orchestrator
  if (t[0] === 'orch') {
    if (w === 'orch host ls') return `HOST     ADDR       LABELS  STATUS\n${HOSTS.map(([h, a], i) => `${h.padEnd(8)} ${a}  ${i < 2 ? '_admin' : ''}`).join('\n')}\n3 hosts in cluster`;
    if (w === 'orch ps' || w === 'orch ps --daemon-type osd') return `NAME            HOST     STATUS\n${w.endsWith('osd') ? '' : 'mon.ceph-01     ceph-01  running (2h)\nmon.ceph-02     ceph-02  running (2h)\nmon.ceph-03     ceph-03  running (2h)\nmgr.ceph-01.xkq ceph-01  running (2h)\nmgr.ceph-02.pmr ceph-02  running (2h)\n'}${c.osds.map((o) => `osd.${o.id}           ${o.host}  ${o.destroyed ? 'destroyed' : o.up ? 'running (2h)' : 'error'}`).join('\n')}`;
    if (w === 'orch device ls') return `HOST     PATH      TYPE  SIZE   AVAILABLE  REJECT REASONS\n${c.osds.map((o) => `${o.host}  ${o.dev.padEnd(8)}  ssd   1000G  ${o.destroyed ? 'Yes      ' : 'No       '}  ${o.destroyed ? '' : 'LVM detected, locked'}`).join('\n')}`;
    if (t[1] === 'osd' && t[2] === 'rm' && t[3] === 'status') { const d = c.osds.filter((o) => o.destroyed); return d.length ? `OSD  HOST     STATE      PGS  REPLACE\n${d.map((o) => `${o.id}    ${o.host}  done, waiting for new disk  0    True`).join('\n')}` : 'No OSD remove/replace operations reported'; }
    if (t[1] === 'osd' && t[2] === 'rm' && t[3] !== undefined) {
      const o = c.osds.find((x) => x.id === Number(t[3])); if (!o) return err(`Error EINVAL: Unable to find OSDs: ['${t[3]}']`);
      if (!t.includes('--replace')) return err('In this lab, use --replace so the new disk keeps the same OSD id: ceph orch osd rm <id> --replace');
      if (o.in) return err(`osd.${o.id} is still "in", so part of the data it held is not yet rebuilt elsewhere.\nMark it out first (ceph osd out ${o.id}), wait until ceph -s shows HEALTH_OK, then remove it.`);
      if (Date.now() < c.recoverUntil) return err('Recovery is still running. Wait until ceph -s shows all PGs active+clean before removing the OSD.');
      o.destroyed = true; o.up = false; o.in = false; sim.mark(`osd-rm-${o.id}`);
      return `Scheduled OSD(s) for replacement\n(Now physically swap the disk, then let the orchestrator recreate the OSD.)`;
    }
    if (w.startsWith('orch apply osd') && w.includes('--all-available-devices') || (t[1] === 'daemon' && t[2] === 'add' && t[3] === 'osd')) {
      const d = c.osds.filter((o) => o.destroyed);
      if (!d.length) return 'Scheduled osd.all-available-devices update...\n(no new empty disks found)';
      d.forEach((o) => { o.destroyed = false; o.up = true; o.in = true; o.usedGiB = 2; sim.mark(`osd-replaced-${o.id}`); });
      c.recoverUntil = Date.now() + 5000;
      return `Scheduled osd.all-available-devices update...\nCreated osd(s) ${d.map((o) => o.id).join(',')} on host '${d[0].host}' (backfilling data onto the new disk)`;
    }
    if (t[1] === 'upgrade') return 'In this lab the cluster already runs 20.2.3 (Tentacle). See lesson "Maintenance, upgrades and capacity" for the real workflow.';
    return err('Invalid command: this lab supports orch host ls, orch ps, orch device ls, orch osd rm <id> --replace, orch osd rm status, orch apply osd --all-available-devices');
  }
  return err(`Invalid command: 'ceph ${w}' is not supported in this lab. Type "ceph --help".`);
}

function rbdExec(sim, t) {
  const c = sim.s.ceph;
  const sizeIdx = t.findIndex((x) => x === '--size' || x === '-s');
  const size = sizeIdx >= 0 ? parseSize(t[sizeIdx + 1]) : null;
  const pos = t.filter((x, i) => !(x.startsWith('-') || (sizeIdx >= 0 && i === sizeIdx + 1)));
  const [sub, a1] = pos;
  const noPool = (p) => err(`rbd: error opening pool '${p}': (2) No such file or directory`);
  if (!sub || sub === 'help') return RBD_HELP;
  if (sub === 'pool' && a1 === 'init') {
    const p = findPool(c, pos[2]); if (!p) return noPool(pos[2]);
    p.app = 'rbd'; sim.mark(`app-${p.name}-rbd`); return '';
  }
  if (sub === 'ls' || sub === 'list') {
    const pool = a1 || 'rbd'; if (!findPool(c, pool)) return noPool(pool);
    sim.mark(`rbd-ls-${pool}`);
    return c.images.filter((i) => i.pool === pool).map((i) => i.name).join('\n');
  }
  const spec = splitSpec(a1);
  if (['create', 'info', 'rm', 'remove'].includes(sub) && !spec) return err(`rbd: image name was not specified (use <pool>/<image>)`);
  if (sub === 'create') {
    const p = findPool(c, spec.pool); if (!p) return noPool(spec.pool);
    if (!size) return err('rbd: must specify --size <M/G/T>');
    if (c.images.some((i) => i.pool === spec.pool && i.name === spec.name)) return err(`rbd: create error: (17) File exists`);
    c.images.push({ pool: spec.pool, name: spec.name, sizeMB: size, id: hex(5), snaps: [], created: new Date().toUTCString() });
    p.storedGiB += 0.01; sim.mark(`rbd-create-${spec.pool}`);
    return p.app === 'rbd' ? '' : { out: `(warning: pool '${spec.pool}' is not initialised for rbd; run: rbd pool init ${spec.pool})`, cls: 'err' };
  }
  const img = spec && c.images.find((i) => i.pool === spec.pool && i.name === spec.name);
  if (sub === 'info') {
    if (!img) return err(`rbd: error opening image ${spec.name}: (2) No such file or directory`);
    sim.mark('rbd-info');
    return `rbd image '${img.name}':\n\tsize ${img.sizeMB >= 1024 ? `${img.sizeMB / 1024} GiB` : `${img.sizeMB} MiB`} in ${Math.ceil(img.sizeMB / 4)} objects\n\torder 22 (4 MiB objects)\n\tsnapshot_count: ${img.snaps.length}\n\tid: ${img.id}\n\tblock_name_prefix: rbd_data.${img.id}\n\tformat: 2\n\tfeatures: layering, exclusive-lock, object-map, fast-diff, deep-flatten\n\top_features:\n\tflags:\n\tcreate_timestamp: ${img.created}`;
  }
  if (sub === 'rm' || sub === 'remove') {
    if (!img) return err(`rbd: error opening image ${spec.name}: (2) No such file or directory`);
    if (img.snaps.length) return err('rbd: image has snapshots - these must be deleted with \'rbd snap purge\' before the image can be removed.');
    c.images = c.images.filter((i) => i !== img); return 'Removing image: 100% complete...done.';
  }
  if (sub === 'snap') {
    const sspec = splitSpec(pos[2]);
    const simg = sspec && c.images.find((i) => i.pool === sspec.pool && i.name === sspec.name);
    if (!simg) return err('rbd: error opening image: (2) No such file or directory');
    if (a1 === 'create') { if (!sspec.snap) return err('rbd: snapshot name was not specified (use <pool>/<image>@<snap>)'); simg.snaps.push(sspec.snap); sim.mark('rbd-snap'); return 'Creating snap: 100% complete...done.'; }
    if (a1 === 'ls') return `SNAPID  NAME\n${simg.snaps.map((s, i) => `${String(i + 4).padStart(6)}  ${s}`).join('\n')}`;
    if (a1 === 'purge') { simg.snaps = []; return 'Removing all snapshots: 100% complete...done.'; }
  }
  return err(`rbd: unknown or unsupported command '${sub}' in this lab. Type "rbd help".`);
}

const CEPH_HELP = `ceph commands in this lab (you are on ceph-01 with the admin keyring):
  ceph -s | status · health [detail] · versions · mon stat · df · balancer status
  ceph osd tree [down] · osd out|in <id> · osd set|unset noout
  ceph osd pool ls [detail] · create <name> [pg] [erasure] · set|get <pool> size|min_size|pg_num|pg_autoscale_mode <v>
  ceph osd pool application enable <pool> <rbd|rgw|cephfs> · osd pool autoscale-status
  ceph auth ls · get <client.x> · get-or-create <client.x> mon '<caps>' osd '<caps>' mgr '<caps>' · caps · del
  ceph orch host ls · ps · device ls · osd rm <id> --replace · osd rm status · apply osd --all-available-devices`;
const RBD_HELP = `rbd commands in this lab:
  rbd pool init <pool> · ls [pool] · create <pool>/<image> --size 10G · info <pool>/<image> · rm <pool>/<image>
  rbd snap create <pool>/<image>@<snap> · snap ls <pool>/<image> · snap purge <pool>/<image>`;

const auth = (s, name) => s.ceph?.auth[name]?.caps || {};
const poolReady = (s, name) => s.ceph?.pools.some((p) => p.name === name && p.app === 'rbd');

const CEPH_BANNER = ['Ceph Tentacle 20.2.3 · 3 hosts · 9 OSDs · you are inside "cephadm shell" on ceph-01', 'Type "ceph --help" or "rbd help". Start with:  ceph -s'];

export const CEPH_LABS = [
  {
    id: 'raise-argo', prompt: 'root@ceph-01:~#', banner: CEPH_BANNER, title: 'Raise the Argo', level: 'Argonautica, islands Β–Δ',
    intro: 'Read a live Ceph cluster, create your first RBD pool and a virtual disk.',
    goals: [
      ['Read the cluster status', 'ceph -s', (d) => d.has('ceph-status')],
      ['See hosts and OSDs in the CRUSH tree', 'ceph osd tree', (d) => d.has('ceph-tree')],
      ['Check raw and usable capacity', 'ceph df', (d) => d.has('ceph-df')],
      ['Create a pool called volumes', 'ceph osd pool create volumes', (d, s) => s.ceph?.pools.some((p) => p.name === 'volumes')],
      ['Initialise it for RBD', 'rbd pool init volumes', (d, s) => poolReady(s, 'volumes')],
      ['Create a 10 GB virtual disk', 'rbd create volumes/test-disk --size 10G', (d, s) => s.ceph?.images.some((i) => i.pool === 'volumes')],
      ['List and inspect it', 'rbd info volumes/test-disk', (d) => d.has('rbd-info')],
    ],
  },
  {
    id: 'golden-fleece', prompt: 'root@ceph-01:~#', banner: CEPH_BANNER, title: 'Seize the Golden Fleece', level: 'Argonautica, island Ε',
    intro: 'Prepare Ceph for OpenStack: pools for Glance, Cinder, Nova and backups, and least-privilege cephx users.',
    goals: [
      ['Create and initialise the images pool', 'ceph osd pool create images && rbd pool init images', (d, s) => poolReady(s, 'images')],
      ['Create and initialise the volumes pool', 'ceph osd pool create volumes && rbd pool init volumes', (d, s) => poolReady(s, 'volumes')],
      ['Create and initialise the vms pool', 'ceph osd pool create vms && rbd pool init vms', (d, s) => poolReady(s, 'vms')],
      ['Create and initialise the backups pool', 'ceph osd pool create backups && rbd pool init backups', (d, s) => poolReady(s, 'backups')],
      ['Create client.glance with access to images only', "ceph auth get-or-create client.glance mon 'profile rbd' osd 'profile rbd pool=images' mgr 'profile rbd pool=images'",
        (d, s) => /profile rbd pool=images/.test(auth(s, 'client.glance').osd || '')],
      ['Create client.cinder: write volumes and vms, read-only images', "ceph auth get-or-create client.cinder mon 'profile rbd' osd 'profile rbd pool=volumes, profile rbd pool=vms, profile rbd-read-only pool=images' mgr 'profile rbd pool=volumes, profile rbd pool=vms'",
        (d, s) => { const o = auth(s, 'client.cinder').osd || ''; return /pool=volumes/.test(o) && /pool=vms/.test(o) && /rbd-read-only pool=images/.test(o); }],
      ['Read back the Cinder keyring (it goes into Kolla’s config)', 'ceph auth get client.cinder', (d) => d.has('auth-get-client.cinder')],
    ],
  },
  {
    id: 'talos', prompt: 'root@ceph-01:~#', banner: CEPH_BANNER, alert: '⚠ Alert: a disk on ceph-02 has just failed. Investigate!', title: 'Talos Is Wounded', level: 'Argonautica, island Ζ',
    intro: 'A disk has just died on ceph-02. Find it, let Ceph heal, then replace the disk. (This lab injects the failure when you open it.)',
    setup(s) { const o = s.ceph.osds.find((x) => x.id === 4); o.up = false; o.in = true; o.destroyed = false; s.ceph.recoverUntil = 0; s.ceph.failureSeen = true; },
    goals: [
      ['Ask Ceph what is wrong', 'ceph health detail', (d) => d.has('ceph-health-detail')],
      ['Find the failed OSD in the tree', 'ceph osd tree down', (d) => d.has('ceph-tree-down')],
      ['Mark it out so its data is rebuilt elsewhere', 'ceph osd out 4', (d) => d.has('osd-out-4')],
      ['Wait until the cluster is healthy again', 'ceph -s', (d) => d.has('ceph-healed')],
      ['Remove it for replacement, keeping its ID', 'ceph orch osd rm 4 --replace', (d) => d.has('osd-rm-4')],
      ['Recreate the OSD on the new disk', 'ceph orch apply osd --all-available-devices', (d) => d.has('osd-replaced-4')],
    ],
  },
];

export const CEPH_COMPLETIONS = [
  'ceph -s', 'ceph health detail', 'ceph osd tree', 'ceph osd tree down', 'ceph df', 'ceph versions', 'ceph osd pool ls detail',
  'ceph osd pool create', 'ceph osd pool set', 'ceph osd pool application enable', 'ceph osd pool autoscale-status',
  'ceph auth ls', 'ceph auth get', 'ceph auth get-or-create', 'ceph osd out', 'ceph osd in', 'ceph osd set noout', 'ceph osd unset noout',
  'ceph orch host ls', 'ceph orch ps', 'ceph orch device ls', 'ceph orch osd rm', 'ceph orch apply osd --all-available-devices',
  'rbd pool init', 'rbd create', 'rbd ls', 'rbd info', 'rbd snap create', 'rbd snap ls',
];
