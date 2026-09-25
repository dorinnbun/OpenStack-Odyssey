// A small simulation of a Prometheus + Alertmanager monitoring stack for the
// Argus labs: a handful of PromQL queries over a fixed "night of incidents",
// and amtool for alerts and silences.

const err = (out) => ({ out, cls: 'err' });
const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b, i) => ([4, 6, 8, 10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')).join('');

export function initialObs() { return { silences: [] }; }

const HOSTS = ['ctl-01', 'ctl-02', 'ctl-03', 'cmp-01', 'cmp-02', 'cmp-07'];
const ALERTS = [
  { labels: { alertname: 'NodeDown', instance: 'cmp-07:9100', job: 'node', severity: 'critical' }, since: '02:41', summary: 'Host cmp-07 is not responding to scrapes' },
  { labels: { alertname: 'NovaComputeDown', hostname: 'cmp-07', severity: 'critical' }, since: '02:46', summary: 'nova-compute down on cmp-07' },
  { labels: { alertname: 'DiskWillFillIn24h', instance: 'ctl-02:9100', mountpoint: '/var/lib/docker', severity: 'warning' }, since: '01:15', summary: '/var/lib/docker on ctl-02 will be full in about 19h' },
  { labels: { alertname: 'CephHealthWarning', severity: 'warning' }, since: '02:44', summary: 'Ceph HEALTH_WARN: 3 osds down (host cmp-07)' },
  { labels: { alertname: 'Watchdog', severity: 'none' }, since: '00:00', summary: 'Always firing: proves the alerting pipeline works' },
];

const table = (rows) => rows.join('\n');
const norm = (q) => q.replace(/\s+/g, '');

function matches(sil, labels) {
  return sil.matchers.every(({ name, op, value }) => {
    const v = labels[name] ?? '';
    if (op === '=') return v === value;
    if (op === '!=') return v !== value;
    const re = new RegExp(`^(?:${value})$`);
    return op === '=~' ? re.test(v) : !re.test(v);
  });
}
const silencedBy = (obs, a) => obs.silences.find((s) => !s.expired && matches(s, a.labels));

function promql(sim, q) {
  const n = norm(q);
  if (!n) return err('usage: promql \'<PromQL expression>\'   (example: promql \'up == 0\')');
  if (/^up(\{[^}]*\})?==0$/.test(n)) {
    sim.mark('q-up');
    return table(['up{instance="cmp-07:9100", job="node"} 0', 'up{instance="cmp-07:9177", job="libvirt"} 0']);
  }
  if (/^up(\{[^}]*\})?$/.test(n)) return table([...HOSTS.map((h) => `up{instance="${h}:9100", job="node"} ${h === 'cmp-07' ? 0 : 1}`), 'up{instance="ctl-01:9198", job="openstack-exporter"} 1', 'up{instance="ctl-01:9283", job="ceph"} 1']);
  if (n.includes('openstack_nova_agent_state')) {
    if (n.endsWith('==0')) { sim.mark('q-nova'); return 'openstack_nova_agent_state{adminState="enabled", hostname="cmp-07", service="nova-compute", zone="nova"} 0'; }
    return table(['cmp-01', 'cmp-02', 'cmp-07'].map((h) => `openstack_nova_agent_state{adminState="enabled", hostname="${h}", service="nova-compute", zone="nova"} ${h === 'cmp-07' ? 0 : 1}`));
  }
  if (n.includes('openstack_neutron_agent_state')) return table(['cmp-01', 'cmp-02', 'cmp-07'].map((h) => `openstack_neutron_agent_state{adminState="up", hostname="${h}", service="ovn-controller"} ${h === 'cmp-07' ? 0 : 1}`));
  if (n.includes('predict_linear') && n.includes('node_filesystem_avail_bytes')) {
    sim.mark('q-predict');
    return n.includes('<0') ? '{device="/dev/sdb1", fstype="xfs", instance="ctl-02:9100", mountpoint="/var/lib/docker"} -1.93e+10\n(negative = the disk runs out before the horizon: about 19 hours at the current trend)'
      : table(HOSTS.filter((h) => h !== 'cmp-07').map((h) => `{instance="${h}:9100", mountpoint="/var/lib/docker"} ${h === 'ctl-02' ? '-1.93e+10' : '4.1e+11'}`));
  }
  if (n.includes('node_filesystem_avail_bytes')) return table(HOSTS.filter((h) => h !== 'cmp-07').map((h) => `node_filesystem_avail_bytes{instance="${h}:9100", mountpoint="/var/lib/docker"} ${h === 'ctl-02' ? '8.2e+09' : '4.1e+11'}`));
  if (n.includes('rate(node_cpu_seconds_total')) return table(HOSTS.filter((h) => h !== 'cmp-07').map((h, i) => `{instance="${h}:9100"} ${[31.2, 44.8, 28.1, 71.5, 66.0][i]}`));
  if (/^node_load1/.test(n)) return table(HOSTS.filter((h) => h !== 'cmp-07').map((h, i) => `node_load1{instance="${h}:9100"} ${[2.1, 3.4, 1.9, 11.2, 9.8][i]}`));
  if (n.includes('ceph_health_status')) { sim.mark('q-ceph'); return 'ceph_health_status{instance="ctl-01:9283", job="ceph"} 1\n(0 = HEALTH_OK, 1 = HEALTH_WARN, 2 = HEALTH_ERR)'; }
  if (n.includes('prometheus_tsdb_head_series')) return 'prometheus_tsdb_head_series{instance="monitor-01:9090"} 1.02e+06';
  if (n.startsWith('absent(')) return '(empty result: the series exists. absent() only returns 1 when a series is missing, which is how you alert on a dead exporter.)';
  if (n.startsWith('ALERTS')) return table(ALERTS.map((a) => `ALERTS{alertname="${a.labels.alertname}", alertstate="firing", severity="${a.labels.severity}"} 1`));
  if (n.includes('rabbitmq_queue_messages')) return 'rabbitmq_queue_messages{queue="conductor"} 0\nrabbitmq_queue_messages{queue="notifications.info"} 1.2e+04\n(notifications piling up: is anything consuming them?)';
  return { out: 'no data\n(in this lab these metrics exist: up, node_load1, node_cpu_seconds_total, node_filesystem_avail_bytes,\n openstack_nova_agent_state, openstack_neutron_agent_state, ceph_health_status, rabbitmq_queue_messages,\n prometheus_tsdb_head_series, ALERTS; functions: rate, predict_linear, absent)', cls: 'err' };
}

function parseMatchers(args) {
  const out = [];
  for (const a of args) {
    const m = /^([a-zA-Z_][\w]*)(=~|!~|!=|=)"?([^"]*)"?$/.exec(a);
    if (m) out.push({ name: m[1], op: m[2], value: m[3] });
  }
  return out;
}
const opt = (t, name) => {
  const i = t.findIndex((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (i < 0) return null;
  return t[i].includes('=') ? t[i].slice(t[i].indexOf('=') + 1) : t[i + 1];
};

function amtool(sim, t) {
  const obs = sim.s.obs;
  const w = t.join(' ');
  if (w === 'alert' || w === 'alert query' || w.startsWith('alert query')) {
    const all = t.includes('--silenced') || t.includes('-s');
    const rows = ALERTS.filter((a) => all || !silencedBy(obs, a));
    sim.mark('am-query'); if (obs.silences.some((s) => !s.expired)) sim.mark('am-query-after-silence');
    const lbl = (a) => Object.entries(a.labels).filter(([k]) => !['alertname', 'severity'].includes(k)).map(([k, v]) => `${k}=${v}`).join(' ');
    return ['Alertname          Starts At  Labels                                      Summary',
      ...rows.map((a) => `${a.labels.alertname.padEnd(18)} ${a.since}      ${[lbl(a), `severity=${a.labels.severity}`].filter(Boolean).join(' ').padEnd(43)} ${a.summary}${silencedBy(obs, a) ? '  [silenced]' : ''}`),
      ...(all ? [] : [`(${ALERTS.length - rows.length} silenced alert(s) hidden; add --silenced to show them)`])].join('\n');
  }
  if (t[0] === 'silence' && (t[1] === 'add' || t[1] === 'a')) {
    const rest = t.slice(2);
    const plain = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--comment' || rest[i] === '--duration') { i++; continue; }
      if (!rest[i].startsWith('--')) plain.push(rest[i]);
    }
    const matchers = parseMatchers(plain);
    const comment = opt(t, 'comment'); const duration = opt(t, 'duration') || '1h';
    if (!matchers.length) return err('amtool: error: no matchers given (example: alertname=NodeDown instance=~"cmp-07.*")');
    if (!comment) return err('amtool: error: comment required by config (--comment="why, and the ticket number")');
    const id = uid();
    obs.silences.push({ id, matchers, comment, duration, expired: false });
    const warn = matchers.length === 1 && matchers[0].name === 'alertname' ? '\n(Beware: this silences that alert for EVERY host. Add instance=… to silence only the one you are working on.)' : '';
    return { out: `${id}${warn}`, cls: warn ? 'err' : 'ok' };
  }
  if (t[0] === 'silence' && (t.length === 1 || t[1] === 'query' || t[1] === 'q')) {
    const active = obs.silences.filter((s) => !s.expired);
    return active.length ? ['ID                                    Matchers                                   Ends In  Comment',
      ...active.map((s) => `${s.id}  ${s.matchers.map((m) => `${m.name}${m.op}"${m.value}"`).join(' ').padEnd(42)} ${s.duration.padEnd(8)} ${s.comment}`)].join('\n') : '(no active silences)';
  }
  if (t[0] === 'silence' && t[1] === 'expire') {
    const s = obs.silences.find((x) => x.id === t[2]); if (!s) return err('amtool: error: silence not found');
    s.expired = true; return '';
  }
  return err('amtool: this lab supports: alert query [--silenced] · silence add <matchers> --comment=… --duration=2h · silence query · silence expire <id>');
}

export function argusExec(sim, cmd, t) {
  if (cmd === 'promql') return promql(sim, t.join(' '));
  if (cmd === 'amtool') return amtool(sim, t);
  if (cmd === 'promtool') return /^check rules/.test(t.join(' ')) ? 'Checking alerts.yml\n  SUCCESS: 2 rules found' : err('promtool: this lab supports: check rules <file>');
  if (cmd === 'curl') return /-\/healthy/.test(t.join(' ')) ? 'Prometheus Server is Healthy.' : err('curl: in this lab try: curl -s localhost:9090/-/healthy');
  return err(`${cmd}: not supported`);
}

export const ARGUS_HELP = 'Monitoring (the Argus labs): promql \'<query>\' · amtool alert query [--silenced] · amtool silence add … · amtool silence query · promtool check rules alerts.yml';

export const ARGUS_LABS = [
  {
    id: 'argus-eyes', prompt: 'ops@monitor-01:~$', title: 'The Night Watch', level: 'Argus, islands Β and Δ',
    intro: 'You start your on-call shift at 03:00. Use PromQL and Alertmanager to understand what broke overnight, then silence only what you are about to repair.',
    banner: ['Prometheus 3.14 · Alertmanager · you are on monitor-01, the start of your on-call shift', 'Type "help" for commands. Start with:  promql \'up == 0\''],
    alert: '⚠ Pager: 5 alerts firing since 02:41.',
    setup(s) { s.obs.silences = []; },
    goals: [
      ['Find which scrape targets are down', "promql 'up == 0'", (d) => d.has('q-up')],
      ['Confirm which nova-compute service is down', 'promql \'openstack_nova_agent_state{service="nova-compute"} == 0\'', (d) => d.has('q-nova')],
      ['Find the disk that will fill within 24 hours', 'promql \'predict_linear(node_filesystem_avail_bytes{mountpoint="/var/lib/docker"}[6h], 24*3600) < 0\'', (d) => d.has('q-predict')],
      ['List the firing alerts', 'amtool alert query', (d) => d.has('am-query')],
      ['Silence NodeDown for cmp-07 only, with a reason, for 2 hours', 'amtool silence add alertname=NodeDown instance=~"cmp-07.*" --comment="PSU replacement OPS-812" --duration=2h',
        (d, s) => s.obs?.silences.some((x) => !x.expired && x.matchers.some((m) => m.name === 'alertname' && m.value === 'NodeDown') && x.matchers.some((m) => m.name === 'instance' && /cmp-07/.test(m.value)))],
      ['Check that the other alerts still fire', 'amtool alert query', (d) => d.has('am-query-after-silence')],
    ],
  },
];

export const ARGUS_COMPLETIONS = ["promql 'up == 0'", 'promql \'openstack_nova_agent_state{service="nova-compute"} == 0\'', 'promql \'predict_linear(node_filesystem_avail_bytes{mountpoint="/var/lib/docker"}[6h], 24*3600) < 0\'',
  "promql 'ceph_health_status'", 'amtool alert query', 'amtool alert query --silenced', 'amtool silence add', 'amtool silence query', 'promtool check rules alerts.yml'];
