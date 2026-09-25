// A stateful, in-browser simulation of the openstack CLI for safe practice.
// It models just enough of Keystone, Nova, Neutron, Glance and Cinder to teach
// real workflows and real failure modes.

const STORE_KEY = 'odyssey.sim.v1';

const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const uuid = () => { const h = hex(16); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };

export function table(headers, rows) {
  const cells = [headers, ...rows].map((r) => r.map((c) => String(c ?? '').split('\n')));
  const w = headers.map((_, i) => Math.max(...cells.map((r) => Math.max(...r[i].map((l) => l.length)))));
  const line = `+${w.map((n) => '-'.repeat(n + 2)).join('+')}+`;
  const fmt = (r) => {
    const h = Math.max(...r.map((c) => c.length));
    return Array.from({ length: h }, (_, j) => `| ${r.map((c, i) => (c[j] || '').padEnd(w[i])).join(' | ')} |`).join('\n');
  };
  return [line, fmt(cells[0]), line, ...cells.slice(1).map(fmt), line].join('\n');
}

function initialState() {
  return {
    auth: null,
    flavors: [
      { id: '1', name: 'm1.tiny', vcpus: 1, ram: 512, disk: 1 },
      { id: '2', name: 'm1.small', vcpus: 1, ram: 2048, disk: 20 },
      { id: '3', name: 'm1.medium', vcpus: 2, ram: 4096, disk: 40 },
      { id: '4', name: 'm1.large', vcpus: 4, ram: 8192, disk: 80 },
      { id: '5', name: 'm1.xlarge', vcpus: 8, ram: 32768, disk: 160 },
      { id: '9', name: 'm1.titan', vcpus: 96, ram: 786432, disk: 500 },
    ],
    images: [
      { id: uuid(), name: 'cirros-0.6.3', format: 'qcow2', size: 21233664, user: 'cirros' },
      { id: uuid(), name: 'ubuntu-24.04', format: 'raw', size: 3758096384, user: 'ubuntu' },
    ],
    networks: [{ id: uuid(), name: 'public', external: true, shared: false, mtu: 1500, subnets: [] }],
    subnets: [],
    routers: [],
    sgs: [{ id: uuid(), name: 'default', rules: [
      { id: uuid(), dir: 'egress', proto: null, port: null, remote: null, ethertype: 'IPv4' },
      { id: uuid(), dir: 'egress', proto: null, port: null, remote: null, ethertype: 'IPv6' },
      { id: uuid(), dir: 'ingress', proto: null, port: null, remote: 'default', ethertype: 'IPv4' },
      { id: uuid(), dir: 'ingress', proto: null, port: null, remote: 'default', ethertype: 'IPv6' },
    ] }],
    keypairs: [],
    servers: [],
    volumes: [],
    fips: [],
    nextFip: 50,
    events: [],
  };
}
// public subnet created lazily so ids are stable
function seed(s) {
  if (!s.subnets.find((x) => x.name === 'public-subnet')) {
    const pub = s.networks.find((n) => n.name === 'public');
    const sub = { id: uuid(), name: 'public-subnet', network: pub.id, cidr: '203.0.113.0/24', gateway: '203.0.113.1', dns: [], next: 10 };
    s.subnets.push(sub); pub.subnets.push(sub.id);
  }
  return s;
}

const BOOL = new Set(['--wait', '--public', '--private', '--share', '--external', '--long', '--all-projects', '--force', '--ingress', '--egress', '--names', '--hard', '--soft', '--help', '-h', '--debug', '--config-drive']);

function tokenize(line) {
  const out = []; let cur = ''; let q = null; let has = false;
  for (const ch of line) {
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; has = true; continue; }
    if (/\s/.test(ch)) { if (cur || has) out.push(cur); cur = ''; has = false; continue; }
    cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}

function parseArgs(tokens) {
  const pos = []; const opts = {};
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('-') && t.length > 1 && !/^-\d/.test(t)) {
      let key = t; let val;
      if (t.includes('=') && t.startsWith('--')) { [key, val] = [t.slice(0, t.indexOf('=')), t.slice(t.indexOf('=') + 1)]; }
      else if (BOOL.has(t)) val = true;
      else val = tokens[++i];
      (opts[key] ||= []).push(val);
    } else pos.push(t);
  }
  return { pos, opts, get: (k) => opts[k]?.at(-1), all: (k) => opts[k] || [] };
}

class CLIError extends Error {}
const fail = (m) => { throw new CLIError(m); };

export class Simulator {
  constructor() {
    this.s = this.load();
    this.done = new Set(this.s.events);
  }
  load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return seed(JSON.parse(raw)); } catch { /* ignore */ }
    return seed(initialState());
  }
  save() {
    this.s.events = [...this.done];
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.s)); } catch { /* ignore */ }
  }
  reset() { this.s = seed(initialState()); this.done = new Set(); this.save(); }
  mark(e) { this.done.add(e); }

  // ------------------------------------------------------------ helpers
  find(list, ref, kind) {
    const x = list.find((o) => o.name === ref || o.id === ref || (o.address && o.address === ref));
    if (!x) fail(`No ${kind} found for ${ref}`);
    return x;
  }
  tick() {
    const now = Date.now();
    for (const sv of this.s.servers) {
      if (sv.status === 'BUILD' && now - sv.created > 2500) { sv.status = sv.pendingError ? 'ERROR' : 'ACTIVE'; }
    }
  }
  sgAllows(server, proto, port) {
    const portOk = (r) => {
      if (proto === 'icmp' || r.port === null) return true;
      const [lo, hi] = String(r.port).split(':').map(Number);
      return port >= lo && port <= (hi || lo);
    };
    return server.sgs.some((sgid) => {
      const sg = this.s.sgs.find((g) => g.id === sgid);
      return sg && sg.rules.some((r) => r.dir === 'ingress' && r.remote !== 'default' && r.remote !== 'group' &&
        (r.proto === null || r.proto === proto) && portOk(r));
    });
  }
  routerFor(subnetId) {
    return this.s.routers.find((r) => r.interfaces.includes(subnetId));
  }
  output(obj, a, kind = 'show') {
    const fmt = a.get('-f') || a.get('--format') || 'table';
    const cols = a.all('-c').concat(a.all('--column'));
    if (kind === 'show') {
      let entries = Object.entries(obj);
      if (cols.length) entries = entries.filter(([k]) => cols.includes(k));
      if (fmt === 'json') return JSON.stringify(Object.fromEntries(entries), null, 2);
      if (fmt === 'value') return entries.map(([, v]) => v).join('\n');
      if (fmt === 'yaml') return entries.map(([k, v]) => `${k}: ${v}`).join('\n');
      return table(['Field', 'Value'], entries);
    }
    // list: obj = { headers, rows }
    let { headers, rows } = obj;
    if (cols.length) {
      const idx = cols.map((c) => headers.indexOf(c)).filter((i) => i >= 0);
      headers = idx.map((i) => headers[i]); rows = rows.map((r) => idx.map((i) => r[i]));
    }
    if (fmt === 'json') return JSON.stringify(rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))), null, 2);
    if (fmt === 'value') return rows.map((r) => r.join(' ')).join('\n');
    if (fmt === 'csv') return [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    return table(headers, rows);
  }
  serverAddr(sv) {
    const net = this.s.networks.find((n) => n.id === sv.network);
    const ips = [sv.ip, ...this.s.fips.filter((f) => f.server === sv.id).map((f) => f.address)].filter(Boolean);
    return net && ips.length ? `${net.name}=${ips.join(', ')}` : '';
  }

  // ------------------------------------------------------------ entry
  exec(line) {
    const trimmed = line.trim();
    if (!trimmed) return { out: '' };
    try {
      const res = this.shell(trimmed);
      this.save();
      return typeof res === 'string' ? { out: res } : res;
    } catch (e) {
      this.save();
      if (e instanceof CLIError) return { out: e.message, cls: 'err' };
      console.error(e);
      return { out: `Unexpected simulator error: ${e.message}`, cls: 'err' };
    }
  }

  shell(line) {
    this.tick();
    const tokens = tokenize(line);
    const [cmd, ...rest] = tokens;
    switch (cmd) {
      case 'help': return HELP;
      case 'ls': return 'argonauts-openrc.sh  admin-openrc.sh  cloud-init.yaml  .ssh/';
      case 'cat':
        if (rest[0]?.includes('openrc')) return OPENRC;
        if (rest[0]?.includes('cloud-init')) return '#cloud-config\npackages: [nginx]\nruncmd:\n  - systemctl enable --now nginx';
        fail(`cat: ${rest[0] || ''}: No such file or directory`);
        break;
      case 'source': case '.':
        if (!rest[0]) fail('source: filename argument required');
        if (!/openrc/.test(rest[0])) fail(`bash: ${rest[0]}: No such file or directory`);
        this.s.auth = { user: rest[0].startsWith('admin') ? 'admin' : 'alice', project: rest[0].startsWith('admin') ? 'admin' : 'argonauts' };
        this.mark('auth');
        return { out: `Credentials loaded for ${this.s.auth.user}@${this.s.auth.project}. Try: openstack token issue`, cls: 'ok' };
      case 'export': {
        const m = /^OS_CLOUD=(.+)$/.exec(rest[0] || '');
        if (m) { this.s.auth = { user: 'alice', project: m[1] }; this.mark('auth'); return { out: `Using cloud "${m[1]}" from clouds.yaml`, cls: 'ok' }; }
        return '';
      }
      case 'env': return this.s.auth ? `OS_AUTH_URL=https://keystone.odyssey.example:5000/v3\nOS_USERNAME=${this.s.auth.user}\nOS_PROJECT_NAME=${this.s.auth.project}\nOS_REGION_NAME=RegionOne` : '';
      case 'whoami': return 'voyager';
      case 'ping': return this.ping(parseArgs(rest));
      case 'ssh': return this.ssh(parseArgs(rest));
      case 'reset-lab': this.reset(); return { out: 'The seas are calm again: simulator state reset.', cls: 'ok' };
      case 'openstack': return this.openstack(rest);
      case 'nova': case 'neutron': case 'cinder': case 'glance':
        return { out: `The legacy "${cmd}" client is deprecated for most tasks. Use the unified client: openstack …`, cls: 'err' };
      case 'sudo': return { out: 'This lab is an OpenStack user shell. Admin host commands are shown in lessons and the Oracle.', cls: 'err' };
      default:
        fail(`${cmd}: command not found. Type "help".`);
    }
    return '';
  }

  openstack(tokens) {
    const a = parseArgs(tokens);
    if (!a.pos.length || a.get('--help') || a.get('-h')) return HELP;
    if (!this.s.auth) fail('Missing value auth-url required for auth plugin password\n(hint: source argonauts-openrc.sh  or  export OS_CLOUD=argonauts)');
    for (let n = Math.min(5, a.pos.length); n > 0; n--) {
      const key = a.pos.slice(0, n).join(' ');
      if (this.cmds[key]) {
        a.args = a.pos.slice(n);
        return this.cmds[key].call(this, a);
      }
    }
    fail(`openstack: '${a.pos.join(' ')}' is not an openstack command. See 'openstack --help'.`);
    return '';
  }

  // ------------------------------------------------------------ network tests from "your laptop"
  ping(a) {
    const ip = a.pos.at(-1);
    if (!ip) fail('ping: usage error: Destination address required');
    const n = Number(a.get('-c') || 3);
    const fip = this.s.fips.find((f) => f.address === ip);
    const fixed = this.s.servers.find((sv) => sv.ip === ip);
    const lost = () => `PING ${ip} (${ip}) 56(84) bytes of data.\n\n--- ${ip} ping statistics ---\n${n} packets transmitted, 0 received, 100% packet loss, time ${n * 1000 - 1}ms`;
    if (fixed && !fip) return { out: `${lost()}\n(hint: ${ip} is a private fixed IP. From outside you need a floating IP.)`, cls: 'err' };
    if (!fip) return { out: lost(), cls: 'err' };
    const sv = this.s.servers.find((x) => x.id === fip.server);
    if (!sv || sv.status !== 'ACTIVE') return { out: lost(), cls: 'err' };
    if (!this.sgAllows(sv, 'icmp')) return { out: `${lost()}\n(hint: the Oracle whispers "security group" — is ICMP allowed in?)`, cls: 'err' };
    this.mark('ping-ok');
    const lines = Array.from({ length: n }, (_, i) => `64 bytes from ${ip}: icmp_seq=${i + 1} ttl=62 time=${(0.6 + Math.random()).toFixed(2)} ms`);
    return { out: `PING ${ip} (${ip}) 56(84) bytes of data.\n${lines.join('\n')}\n\n--- ${ip} ping statistics ---\n${n} packets transmitted, ${n} received, 0% packet loss`, cls: 'ok' };
  }
  ssh(a) {
    const target = a.pos[0];
    if (!target) fail('usage: ssh [-i identity_file] user@host');
    const [user, host] = target.includes('@') ? target.split('@') : ['voyager', target];
    const fip = this.s.fips.find((f) => f.address === host);
    const sv = fip && this.s.servers.find((x) => x.id === fip.server);
    if (!sv || sv.status !== 'ACTIVE') return { out: `ssh: connect to host ${host} port 22: No route to host`, cls: 'err' };
    if (!this.sgAllows(sv, 'tcp', 22)) return { out: `ssh: connect to host ${host} port 22: Connection timed out\n(hint: is TCP 22 allowed by a security group on the server?)`, cls: 'err' };
    const img = this.s.images.find((i) => i.id === sv.image);
    if (!sv.key) return { out: `${user}@${host}: Permission denied (publickey).\n(hint: the server was booted without --key-name)`, cls: 'err' };
    if (img && user !== img.user) return { out: `${user}@${host}: Permission denied (publickey).\n(hint: the default user for ${img.name} is "${img.user}")`, cls: 'err' };
    this.mark('ssh-ok');
    return { out: `Welcome to ${img?.name || 'Linux'} on ${sv.name}!\n\n${user}@${sv.name}:~$ hostname && ip -br addr | grep -v lo\n${sv.name}\neth0  UP  ${sv.ip}/24\n${user}@${sv.name}:~$ exit\nConnection to ${host} closed.\n\n⚓ You reached your server across the wine-dark sea.`, cls: 'ok' };
  }
}

const P = Simulator.prototype;
P.cmds = {
  // ---------------- identity
  'token issue'(a) {
    this.mark('token');
    const exp = new Date(Date.now() + 12 * 3600e3).toISOString().replace(/\.\d+Z/, '+0000');
    return this.output({ expires: exp, id: `gAAAAAB${hex(24)}`, project_id: hex(16), user_id: hex(16) }, a);
  },
  'catalog list'(a) {
    this.mark('catalog');
    const e = (svc, port, path = '') => `RegionOne\n  public: https://api.odyssey.example:${port}${path}\nRegionOne\n  internal: http://10.0.0.250:${port}${path}`;
    return this.output({ headers: ['Name', 'Type', 'Endpoints'], rows: [
      ['keystone', 'identity', e('keystone', 5000, '/v3')], ['nova', 'compute', e('nova', 8774, '/v2.1')],
      ['neutron', 'network', e('neutron', 9696)], ['glance', 'image', e('glance', 9292)],
      ['cinderv3', 'volumev3', e('cinder', 8776, '/v3/…')], ['placement', 'placement', e('placement', 8780)],
    ] }, a, 'list');
  },
  'service list'(a) {
    return this.output({ headers: ['ID', 'Name', 'Type'], rows: [['1c0e…', 'keystone', 'identity'], ['5b7a…', 'nova', 'compute'], ['7f21…', 'neutron', 'network'], ['8a9c…', 'glance', 'image'], ['a3d4…', 'cinderv3', 'volumev3'], ['c61e…', 'placement', 'placement']] }, a, 'list');
  },
  'endpoint list'(a) { return P.cmds['catalog list'].call(this, a); },
  'project list'(a) { return this.output({ headers: ['ID', 'Name'], rows: [[hex(16), this.s.auth.project]] }, a, 'list'); },
  'role assignment list'(a) { return this.output({ headers: ['Role', 'User', 'Project'], rows: [[this.s.auth.user === 'admin' ? 'admin' : 'member', `${this.s.auth.user}@Default`, `${this.s.auth.project}@Default`]] }, a, 'list'); },
  'quota show'(a) {
    return this.output({ cores: 40, instances: 10, ram: 102400, volumes: 10, gigabytes: 1000, 'floating-ips': 5, networks: 10, routers: 5, 'secgroup-rules': 100, 'used instances': this.s.servers.length }, a);
  },
  // ---------------- compute
  'flavor list'(a) {
    this.mark('flavors');
    return this.output({ headers: ['ID', 'Name', 'RAM', 'Disk', 'Ephemeral', 'VCPUs', 'Is Public'], rows: this.s.flavors.map((f) => [f.id, f.name, f.ram, f.disk, 0, f.vcpus, 'True']) }, a, 'list');
  },
  'flavor show'(a) { const f = this.find(this.s.flavors, a.args[0], 'flavor'); return this.output({ id: f.id, name: f.name, vcpus: f.vcpus, ram: f.ram, disk: f.disk, properties: '' }, a); },
  'image list'(a) {
    this.mark('images');
    return this.output({ headers: ['ID', 'Name', 'Status'], rows: this.s.images.map((i) => [i.id, i.name, 'active']) }, a, 'list');
  },
  'image show'(a) { const i = this.find(this.s.images, a.args[0], 'image'); return this.output({ id: i.id, name: i.name, disk_format: i.format, container_format: 'bare', size: i.size, status: 'active', visibility: 'public' }, a); },
  'keypair create'(a) {
    const name = a.args[0]; if (!name) fail('keypair create: name required');
    if (this.s.keypairs.find((k) => k.name === name)) fail(`Key pair '${name}' already exists. (HTTP 409)`);
    const fp = Array.from({ length: 16 }, () => hex(1)).join(':');
    this.s.keypairs.push({ name, fp, type: 'ssh' });
    this.mark('keypair');
    if (a.get('--public-key')) return this.output({ created_at: new Date().toISOString(), fingerprint: fp, name, type: 'ssh', user_id: hex(16) }, a);
    return `-----BEGIN OPENSSH PRIVATE KEY-----\n${hex(30)}\n… (private key, save it: this is the only time it is shown) …\n-----END OPENSSH PRIVATE KEY-----`;
  },
  'keypair list'(a) { return this.output({ headers: ['Name', 'Fingerprint', 'Type'], rows: this.s.keypairs.map((k) => [k.name, k.fp, k.type]) }, a, 'list'); },
  'keypair delete'(a) { this.s.keypairs = this.s.keypairs.filter((k) => k.name !== a.args[0]); return ''; },

  'server create'(a) {
    const name = a.args[0]; if (!name) fail('server create: the following arguments are required: <server-name>');
    if (!a.get('--flavor')) fail('server create: error: the following arguments are required: --flavor');
    if (!a.get('--image') && !a.get('--volume')) fail('server create: error: one of the arguments --image --volume --snapshot is required');
    const fl = this.find(this.s.flavors, a.get('--flavor'), 'flavor');
    const img = this.find(this.s.images, a.get('--image'), 'image');
    const tenantNets = this.s.networks.filter((n) => !n.external);
    let net;
    if (a.get('--network')) net = this.find(this.s.networks, a.get('--network'), 'network');
    else if (a.get('--nic')) net = this.find(this.s.networks, String(a.get('--nic')).replace(/^net-id=/, ''), 'network');
    else if (tenantNets.length === 1) net = tenantNets[0];
    else if (tenantNets.length > 1) fail('Multiple possible networks found, use a Network ID to be more specific. (HTTP 409)');
    else fail('No network available to attach. Create a network and subnet first, then pass --network <name>.\n(hint: openstack network create argo-net)');
    if (net.external) fail(`It is not allowed to create an interface on external network ${net.id} (HTTP 403)\n(hint: boot on a tenant network and attach a floating IP instead)`);
    const key = a.get('--key-name');
    if (key && !this.s.keypairs.find((k) => k.name === key)) fail(`Invalid key_name provided. (HTTP 400)`);
    const sgs = (a.all('--security-group').length ? a.all('--security-group') : ['default']).map((g) => this.find(this.s.sgs, g, 'security group').id);
    if (this.s.servers.length >= 10) fail('Quota exceeded for instances: Requested 1, but already used 10 of 10 instances (HTTP 403)');
    const sv = { id: uuid(), name, flavor: fl.id, image: img.id, network: net.id, key, sgs, status: 'BUILD', created: Date.now(), ip: null, fault: null, pendingError: false, volumes: [] };
    const sub = this.s.subnets.find((x) => x.network === net.id);
    if (!sub) { sv.pendingError = true; sv.fault = `Network ${net.id} requires a subnet in order to boot instances on.`; }
    else if (fl.ram > 262144) { sv.pendingError = true; sv.fault = 'No valid host was found. There are not enough hosts available.'; }
    else if (fl.disk < 1 || (img.size > fl.disk * 1024 ** 3)) { sv.pendingError = true; sv.fault = 'Flavor\'s disk is too small for requested image.'; }
    else { sv.ip = sub.cidr.replace(/\d+\/\d+$/, String(sub.next++)); }
    this.s.servers.push(sv);
    this.mark('server-create');
    return this.output({ id: sv.id, name, status: 'BUILD', flavor: `${fl.name} (${fl.id})`, image: `${img.name} (${img.id})`, key_name: key || 'None', security_groups: sgs.map((id) => `name='${this.s.sgs.find((g) => g.id === id).name}'`).join(', '), adminPass: hex(6) }, a);
  },
  'server list'(a) {
    const rows = this.s.servers.map((sv) => {
      const fl = this.s.flavors.find((f) => f.id === sv.flavor); const img = this.s.images.find((i) => i.id === sv.image);
      return [sv.id, sv.name, sv.status, this.serverAddr(sv), img?.name, fl?.name];
    });
    if (this.s.servers.some((sv) => sv.status === 'ACTIVE')) this.mark('server-active');
    return this.output({ headers: ['ID', 'Name', 'Status', 'Networks', 'Image', 'Flavor'], rows }, a, 'list');
  },
  'server show'(a) {
    const sv = this.find(this.s.servers, a.args[0], 'server');
    if (sv.status === 'ACTIVE') this.mark('server-active');
    const fl = this.s.flavors.find((f) => f.id === sv.flavor);
    const o = { id: sv.id, name: sv.name, status: sv.status, 'OS-EXT-STS:task_state': sv.status === 'BUILD' ? 'spawning' : 'None', addresses: this.serverAddr(sv), flavor: fl?.name, key_name: sv.key || 'None', security_groups: sv.sgs.map((id) => `name='${this.s.sgs.find((g) => g.id === id)?.name}'`).join(', '), volumes_attached: sv.volumes.map((v) => `id='${v}'`).join(', ') };
    if (sv.status === 'ERROR') o.fault = `{'code': 500, 'message': '${sv.fault}'}`;
    return this.output(o, a);
  },
  'server delete'(a) {
    for (const ref of a.args) {
      const sv = this.find(this.s.servers, ref, 'server');
      this.s.fips.filter((f) => f.server === sv.id).forEach((f) => { f.server = null; f.fixed = null; });
      this.s.volumes.filter((v) => v.server === sv.id).forEach((v) => { v.server = null; v.status = 'available'; });
      this.s.servers = this.s.servers.filter((x) => x !== sv);
    }
    return '';
  },
  'server stop'(a) { const sv = this.find(this.s.servers, a.args[0], 'server'); if (sv.status !== 'ACTIVE') fail(`Cannot 'stop' instance ${sv.id} while it is in vm_state ${sv.status.toLowerCase()} (HTTP 409)`); sv.status = 'SHUTOFF'; return ''; },
  'server start'(a) { const sv = this.find(this.s.servers, a.args[0], 'server'); if (sv.status !== 'SHUTOFF') fail(`Cannot 'start' instance ${sv.id} while it is in vm_state ${sv.status.toLowerCase()} (HTTP 409)`); sv.status = 'ACTIVE'; return ''; },
  'server reboot'(a) { const sv = this.find(this.s.servers, a.args[0], 'server'); if (sv.status === 'ERROR' && !a.get('--hard')) fail('Cannot reboot an instance in ERROR state; try --hard, but fix the fault first.'); if (sv.status === 'ERROR') fail(`The fault must be fixed first: ${sv.fault}\nDelete this server and create a new one.`); return ''; },
  'server event list'(a) { const sv = this.find(this.s.servers, a.args[0], 'server'); return this.output({ headers: ['Request ID', 'Server ID', 'Action', 'Start Time'], rows: [[`req-${uuid()}`, sv.id, 'create', new Date(sv.created).toISOString()]] }, a, 'list'); },
  'console log show'(a) {
    const sv = this.find(this.s.servers, a.args[0], 'server');
    this.mark('console');
    if (sv.status === 'ERROR') return { out: `(no console output — instance never started)\nfault: ${sv.fault}`, cls: 'err' };
    if (sv.status === 'BUILD') return '(instance is still building — try again in a few seconds)';
    const img = this.s.images.find((i) => i.id === sv.image);
    return `[    0.000000] Linux version 6.8.0-45-generic\n[    2.114230] virtio_net virtio1 eth0: renamed from eth0\nci-info: +++++++++++++++++Net device info++++++++++++++++++\nci-info: | eth0 | True | ${sv.ip} | 255.255.255.0 | fa:16:3e:${hex(1)}:${hex(1)}:${hex(1)} |\ncloud-init[612]: Cloud-init v. 24.4 finished. Datasource DataSourceOpenStackLocal.\n${sv.key ? `ci-info: Authorized keys from /home/${img.user}/.ssh/authorized_keys for user ${img.user}` : 'ci-info: no authorized SSH keys fingerprints found for user'}\n\n${sv.name} login:`;
  },
  'compute service list'(a) {
    if (this.s.auth.user !== 'admin') fail('Policy doesn\'t allow os_compute_api:os-services:list to be performed. (HTTP 403)\n(hint: this needs an admin/system-scoped token: source admin-openrc.sh)');
    return this.output({ headers: ['ID', 'Binary', 'Host', 'Zone', 'Status', 'State'], rows: [[1, 'nova-scheduler', 'ctl-01', 'internal', 'enabled', 'up'], [2, 'nova-conductor', 'ctl-01', 'internal', 'enabled', 'up'], [5, 'nova-compute', 'cmp-01', 'nova', 'enabled', 'up'], [6, 'nova-compute', 'cmp-02', 'nova', 'enabled', 'up']] }, a, 'list');
  },
  'hypervisor list'(a) {
    if (this.s.auth.user !== 'admin') fail('Policy doesn\'t allow os_compute_api:os-hypervisors:list to be performed. (HTTP 403)');
    return this.output({ headers: ['ID', 'Hypervisor Hostname', 'Hypervisor Type', 'Host IP', 'State'], rows: [[1, 'cmp-01', 'QEMU', '10.0.0.21', 'up'], [2, 'cmp-02', 'QEMU', '10.0.0.22', 'up']] }, a, 'list');
  },
  'availability zone list'(a) { return this.output({ headers: ['Zone Name', 'Zone Status'], rows: [['nova', 'available']] }, a, 'list'); },

  // ---------------- network
  'network create'(a) {
    const name = a.args[0]; if (!name) fail('network create: name required');
    if (a.get('--external') && this.s.auth.user !== 'admin') fail('(rule:create_network and rule:create_network:router:external) is disallowed by policy (HTTP 403)');
    const mtu = Number(a.get('--mtu') || 1442);
    const n = { id: uuid(), name, external: !!a.get('--external'), shared: !!a.get('--share'), mtu, subnets: [] };
    this.s.networks.push(n);
    this.mark('network');
    return this.output({ id: n.id, name, mtu, 'provider:network_type': 'geneve', 'router:external': n.external ? 'External' : 'Internal', shared: n.shared, status: 'ACTIVE', subnets: '' }, a);
  },
  'network list'(a) { return this.output({ headers: ['ID', 'Name', 'Subnets'], rows: this.s.networks.map((n) => [n.id, n.name, n.subnets.join(', ')]) }, a, 'list'); },
  'network show'(a) { const n = this.find(this.s.networks, a.args[0], 'network'); return this.output({ id: n.id, name: n.name, mtu: n.mtu, 'router:external': n.external ? 'External' : 'Internal', subnets: n.subnets.join(', '), status: 'ACTIVE' }, a); },
  'network delete'(a) {
    const n = this.find(this.s.networks, a.args[0], 'network');
    if (this.s.servers.some((sv) => sv.network === n.id)) fail(`Unable to complete operation on network ${n.id}. There are one or more ports still in use on the network. (HTTP 409)`);
    this.s.networks = this.s.networks.filter((x) => x !== n); this.s.subnets = this.s.subnets.filter((x) => x.network !== n.id);
    return '';
  },
  'subnet create'(a) {
    const name = a.args[0]; if (!name) fail('subnet create: name required');
    const net = this.find(this.s.networks, a.get('--network') || fail('subnet create: error: the following arguments are required: --network'), 'network');
    const cidr = a.get('--subnet-range') || fail('subnet create: --subnet-range is required (or use --subnet-pool)');
    if (!/^\d+\.\d+\.\d+\.0\/(1[6-9]|2[0-8])$/.test(cidr)) fail(`Invalid input for subnet-range "${cidr}" (use a /16–/28 network address like 10.10.0.0/24)`);
    if (this.s.subnets.some((x) => x.network === net.id && x.cidr === cidr)) fail('Requested subnet overlaps with another subnet on this network (HTTP 400)');
    const gw = cidr.replace(/0\/\d+$/, '1');
    const sub = { id: uuid(), name, network: net.id, cidr, gateway: gw, dns: a.all('--dns-nameserver'), next: 10 };
    this.s.subnets.push(sub); net.subnets.push(sub.id);
    this.mark('subnet');
    return this.output({ id: sub.id, name, network_id: net.id, cidr, gateway_ip: gw, enable_dhcp: 'True', dns_nameservers: sub.dns.join(', '), allocation_pools: `${cidr.replace(/0\/\d+$/, '2')}-${cidr.replace(/0\/\d+$/, '254')}` }, a);
  },
  'subnet list'(a) { return this.output({ headers: ['ID', 'Name', 'Network', 'Subnet'], rows: this.s.subnets.map((x) => [x.id, x.name, x.network, x.cidr]) }, a, 'list'); },
  'subnet show'(a) { const x = this.find(this.s.subnets, a.args[0], 'subnet'); return this.output({ id: x.id, name: x.name, cidr: x.cidr, gateway_ip: x.gateway, network_id: x.network }, a); },
  'router create'(a) {
    const name = a.args[0]; if (!name) fail('router create: name required');
    const r = { id: uuid(), name, gateway: null, interfaces: [] };
    this.s.routers.push(r); this.mark('router');
    return this.output({ id: r.id, name, status: 'ACTIVE', external_gateway_info: 'null', admin_state_up: 'UP' }, a);
  },
  'router list'(a) { return this.output({ headers: ['ID', 'Name', 'Status', 'State'], rows: this.s.routers.map((r) => [r.id, r.name, 'ACTIVE', 'UP']) }, a, 'list'); },
  'router show'(a) {
    const r = this.find(this.s.routers, a.args[0], 'router');
    const gw = r.gateway ? `{"network_id": "${r.gateway}", "enable_snat": true}` : 'null';
    return this.output({ id: r.id, name: r.name, external_gateway_info: gw, interfaces_info: r.interfaces.map((s) => this.s.subnets.find((x) => x.id === s)?.cidr).join(', ') }, a);
  },
  'router set'(a) {
    const r = this.find(this.s.routers, a.args[0], 'router');
    const g = a.get('--external-gateway');
    if (g) {
      const n = this.find(this.s.networks, g, 'network');
      if (!n.external) fail(`Bad router request: Network ${n.id} is not an external network. (HTTP 400)`);
      r.gateway = n.id; this.mark('gateway');
    }
    return '';
  },
  'router add subnet'(a) {
    const r = this.find(this.s.routers, a.args[0], 'router');
    const sub = this.find(this.s.subnets, a.args[1], 'subnet');
    if (r.interfaces.includes(sub.id)) fail(`Router already has a port on subnet ${sub.id}. (HTTP 400)`);
    if (this.s.networks.find((n) => n.id === sub.network)?.external) fail('Use --external-gateway to connect a router to an external network.');
    r.interfaces.push(sub.id); this.mark('router-iface');
    return '';
  },
  'security group create'(a) {
    const name = a.args[0]; if (!name) fail('security group create: name required');
    const g = { id: uuid(), name, rules: [
      { id: uuid(), dir: 'egress', proto: null, port: null, remote: null, ethertype: 'IPv4' },
      { id: uuid(), dir: 'egress', proto: null, port: null, remote: null, ethertype: 'IPv6' }] };
    this.s.sgs.push(g); this.mark('sg');
    return this.output({ id: g.id, name, description: name, rules: 'direction=egress, ethertype=IPv4\ndirection=egress, ethertype=IPv6' }, a);
  },
  'security group list'(a) { return this.output({ headers: ['ID', 'Name', 'Description'], rows: this.s.sgs.map((g) => [g.id, g.name, g.name === 'default' ? 'Default security group' : g.name]) }, a, 'list'); },
  'security group rule create'(a) {
    const g = this.find(this.s.sgs, a.args[0], 'security group');
    const proto = a.get('--protocol') || null;
    if (proto && !['tcp', 'udp', 'icmp', 'any'].includes(proto)) fail(`Security group rule protocol ${proto} not supported in this lab (tcp, udp, icmp).`);
    const port = a.get('--dst-port') || null;
    if (port && proto === 'icmp') fail('ICMP rules do not take --dst-port.');
    const r = { id: uuid(), dir: a.get('--egress') ? 'egress' : 'ingress', proto: proto === 'any' ? null : proto, port, remote: a.get('--remote-group') ? 'group' : (a.get('--remote-ip') || '0.0.0.0/0'), ethertype: 'IPv4' };
    if (g.rules.some((x) => x.dir === r.dir && x.proto === r.proto && x.port === r.port && x.remote === r.remote)) fail('Security group rule already exists. (HTTP 409)');
    g.rules.push(r);
    if (r.dir === 'ingress' && r.proto === 'icmp') this.mark('rule-icmp');
    if (r.dir === 'ingress' && r.proto === 'tcp' && port) {
      const [lo, hi] = String(port).split(':').map(Number);
      if (lo <= 22 && (hi || lo) >= 22) this.mark('rule-ssh');
    }
    return this.output({ id: r.id, direction: r.dir, ethertype: 'IPv4', protocol: r.proto || 'None', port_range_min: port ? String(port).split(':')[0] : 'None', port_range_max: port ? (String(port).split(':')[1] || port) : 'None', remote_ip_prefix: r.remote, security_group_id: g.id }, a);
  },
  'security group rule list'(a) {
    const groups = a.args[0] ? [this.find(this.s.sgs, a.args[0], 'security group')] : this.s.sgs;
    const rows = groups.flatMap((g) => g.rules.map((r) => [r.id, r.proto || 'None', r.ethertype, r.remote && r.remote !== 'default' ? r.remote : (r.dir === 'egress' ? '0.0.0.0/0' : 'None'), r.port || '', r.dir, r.remote === 'default' ? 'default' : 'None']));
    return this.output({ headers: ['ID', 'IP Protocol', 'Ethertype', 'IP Range', 'Port Range', 'Direction', 'Remote Security Group'], rows }, a, 'list');
  },
  'server add security group'(a) {
    const sv = this.find(this.s.servers, a.args[0], 'server'); const g = this.find(this.s.sgs, a.args[1], 'security group');
    if (!sv.sgs.includes(g.id)) sv.sgs.push(g.id);
    return '';
  },
  'port list'(a) {
    let svs = this.s.servers.filter((sv) => sv.ip);
    if (a.get('--server')) { const sv = this.find(this.s.servers, a.get('--server'), 'server'); svs = [sv]; }
    return this.output({ headers: ['ID', 'Name', 'MAC Address', 'Fixed IP Addresses', 'Status'], rows: svs.map((sv) => [sv.id.replace(/^.{4}/, 'a1b2'), '', `fa:16:3e:${sv.id.slice(0, 2)}:${sv.id.slice(2, 4)}:${sv.id.slice(4, 6)}`, `ip_address='${sv.ip}'`, sv.status === 'ACTIVE' ? 'ACTIVE' : 'DOWN']) }, a, 'list');
  },
  'floating ip create'(a) {
    const n = this.find(this.s.networks, a.args[0] || fail('floating ip create: <network> required (e.g. public)'), 'network');
    if (!n.external) fail(`Network ${n.id} is not a valid external network (HTTP 400)`);
    if (this.s.fips.length >= 5) fail('Quota exceeded for resources: [\'floatingip\']. (HTTP 409)');
    const f = { id: uuid(), address: `203.0.113.${this.s.nextFip++}`, server: null, fixed: null };
    this.s.fips.push(f); this.mark('fip');
    return this.output({ id: f.id, floating_ip_address: f.address, floating_network_id: n.id, fixed_ip_address: 'None', port_id: 'None', status: 'DOWN' }, a);
  },
  'floating ip list'(a) { return this.output({ headers: ['ID', 'Floating IP Address', 'Fixed IP Address', 'Port'], rows: this.s.fips.map((f) => [f.id, f.address, f.fixed || 'None', f.server ? 'port-of-server' : 'None']) }, a, 'list'); },
  'floating ip delete'(a) { const f = this.find(this.s.fips, a.args[0], 'floating IP'); this.s.fips = this.s.fips.filter((x) => x !== f); return ''; },
  'server add floating ip'(a) {
    const sv = this.find(this.s.servers, a.args[0], 'server');
    const f = this.find(this.s.fips, a.args[1] || fail('usage: openstack server add floating ip <server> <ip-address>'), 'floating IP');
    if (!sv.ip) fail(`Server ${sv.name} has no fixed IP (status ${sv.status}).`);
    const sub = this.s.subnets.find((x) => x.network === sv.network);
    const r = this.routerFor(sub.id);
    if (!r || !r.gateway) fail(`External network ${this.s.networks.find((n) => n.external).id} is not reachable from subnet ${sub.id}. Therefore, cannot associate Port with a Floating IP. (HTTP 404)\n(hint: create a router, set its --external-gateway public, and add the subnet to it)`);
    f.server = sv.id; f.fixed = sv.ip; this.mark('fip-assoc');
    return '';
  },
  'network agent list'(a) {
    if (this.s.auth.user !== 'admin') fail('rule:get_agent is disallowed by policy (HTTP 403)');
    return this.output({ headers: ['ID', 'Agent Type', 'Host', 'Alive', 'State', 'Binary'], rows: [['2c3d…', 'OVN Controller Gateway agent', 'ctl-01', ':-)', 'UP', 'ovn-controller'], ['7a1e…', 'OVN Controller agent', 'cmp-01', ':-)', 'UP', 'ovn-controller'], ['9f0b…', 'OVN Metadata agent', 'cmp-01', ':-)', 'UP', 'neutron-ovn-metadata-agent'], ['7a1f…', 'OVN Controller agent', 'cmp-02', ':-)', 'UP', 'ovn-controller'], ['9f0c…', 'OVN Metadata agent', 'cmp-02', ':-)', 'UP', 'neutron-ovn-metadata-agent']] }, a, 'list');
  },
  // ---------------- storage
  'volume create'(a) {
    const name = a.args[0]; if (!name) fail('volume create: name required');
    const size = Number(a.get('--size')); if (!size) fail('volume create: --size <GB> is required');
    if (this.s.volumes.reduce((t, v) => t + v.size, 0) + size > 1000) fail('VolumeSizeExceedsAvailableQuota: Requested volume or snapshot exceeds allowed gigabytes quota. (HTTP 413)');
    const v = { id: uuid(), name, size, status: 'available', server: null, type: a.get('--type') || '__DEFAULT__' };
    this.s.volumes.push(v); this.mark('volume');
    return this.output({ id: v.id, name, size, status: 'creating', type: v.type, bootable: 'false', availability_zone: 'nova' }, a);
  },
  'volume list'(a) {
    if (this.s.volumes.some((v) => v.status === 'in-use')) this.mark('volume-inuse-seen');
    return this.output({ headers: ['ID', 'Name', 'Status', 'Size', 'Attached to'], rows: this.s.volumes.map((v) => [v.id, v.name, v.status, v.size, v.server ? `Attached to ${this.s.servers.find((s) => s.id === v.server)?.name} on /dev/vdb` : '']) }, a, 'list');
  },
  'volume show'(a) { const v = this.find(this.s.volumes, a.args[0], 'volume'); return this.output({ id: v.id, name: v.name, size: v.size, status: v.status, type: v.type, attachments: v.server ? `server_id='${v.server}', device='/dev/vdb'` : '[]' }, a); },
  'volume delete'(a) { const v = this.find(this.s.volumes, a.args[0], 'volume'); if (v.status === 'in-use') fail(`Invalid volume: Volume status must be available or error or error_restoring or error_extending or error_managing and must not be migrating, attached, belong to a group, have snapshots or be disassociated from snapshots after volume transfer. (HTTP 400)`); this.s.volumes = this.s.volumes.filter((x) => x !== v); return ''; },
  'server add volume'(a) {
    const sv = this.find(this.s.servers, a.args[0], 'server'); const v = this.find(this.s.volumes, a.args[1], 'volume');
    if (sv.status !== 'ACTIVE' && sv.status !== 'SHUTOFF') fail(`Cannot 'attach_volume' instance ${sv.id} while it is in vm_state ${sv.status.toLowerCase()} (HTTP 409)`);
    if (v.status !== 'available') fail(`Invalid volume: volume ${v.id} status must be available, but current status is: ${v.status} (HTTP 400)`);
    v.status = 'in-use'; v.server = sv.id; sv.volumes.push(v.id); this.mark('volume-attach');
    return this.output({ ID: v.id, Server: sv.id, Volume: v.id, Device: '/dev/vdb' }, a);
  },
  'server remove volume'(a) {
    const sv = this.find(this.s.servers, a.args[0], 'server'); const v = this.find(this.s.volumes, a.args[1], 'volume');
    v.status = 'available'; v.server = null; sv.volumes = sv.volumes.filter((x) => x !== v.id); return '';
  },
};

export const LABS = [
  {
    id: 'first-light', title: 'First Light at Ithaca', level: 'Levels 1–3',
    intro: 'Authenticate, get a token and explore what the cloud offers.',
    goals: [
      ['Load your credentials', 'source argonauts-openrc.sh', (d) => d.has('auth')],
      ['Obtain a token from Keystone', 'openstack token issue', (d) => d.has('token')],
      ['Read the service catalog', 'openstack catalog list', (d) => d.has('catalog')],
      ['Survey the flavors', 'openstack flavor list', (d) => d.has('flavors')],
      ['Survey the images', 'openstack image list -c Name -c Status', (d) => d.has('images')],
    ],
  },
  {
    id: 'forge-vessel', title: 'Forge Your First Vessel', level: 'Levels 4–5',
    intro: 'Boot a server the right way: keypair, network, flavor, image.',
    goals: [
      ['Create a keypair', 'openstack keypair create --public-key ~/.ssh/id_ed25519.pub voyager', (d) => d.has('keypair')],
      ['Create a tenant network', 'openstack network create argo-net', (d) => d.has('network')],
      ['Give it a subnet', 'openstack subnet create argo-subnet --network argo-net --subnet-range 10.10.0.0/24', (d) => d.has('subnet')],
      ['Boot a server with your key', 'openstack server create --flavor m1.small --image cirros-0.6.3 --network argo-net --key-name voyager ship-01', (d, s) => s.servers.some((x) => x.key && !x.pendingError)],
      ['See it become ACTIVE', 'openstack server list', (d) => d.has('server-active')],
      ['Read its console log', 'openstack console log show ship-01', (d) => d.has('console')],
    ],
  },
  {
    id: 'chart-seas', title: 'Chart the Seas', level: 'Level 6',
    intro: 'Build the full self-service topology with a router and a security group.',
    goals: [
      ['Create a router', 'openstack router create argo-rtr', (d) => d.has('router')],
      ['Connect it to the external network', 'openstack router set argo-rtr --external-gateway public', (d) => d.has('gateway')],
      ['Attach your subnet to the router', 'openstack router add subnet argo-rtr argo-subnet', (d) => d.has('router-iface')],
      ['Create a security group', 'openstack security group create ssh-icmp', (d) => d.has('sg')],
      ['Allow ICMP (ping) in', 'openstack security group rule create ssh-icmp --protocol icmp', (d) => d.has('rule-icmp')],
      ['Allow SSH (TCP 22)', 'openstack security group rule create ssh-icmp --protocol tcp --dst-port 22', (d) => d.has('rule-ssh')],
    ],
  },
  {
    id: 'full-voyage', title: 'The Full Voyage', level: 'Levels 6–8',
    intro: 'Reach a server from outside: floating IP, security group, key. Expect to troubleshoot!',
    goals: [
      ['Allocate a floating IP', 'openstack floating ip create public', (d) => d.has('fip')],
      ['Associate it with a server', 'openstack server add floating ip ship-01 203.0.113.50', (d) => d.has('fip-assoc')],
      ['Put the server in your security group', 'openstack server add security group ship-01 ssh-icmp', (d, s) => s.servers.some((x) => x.sgs.some((g) => s.sgs.find((y) => y.id === g && y.name !== 'default')))],
      ['Ping the floating IP successfully', 'ping -c 3 203.0.113.50', (d) => d.has('ping-ok')],
      ['SSH into the server', 'ssh cirros@203.0.113.50', (d) => d.has('ssh-ok')],
    ],
  },
  {
    id: 'amphora', title: 'Fill the Amphora', level: 'Level 7',
    intro: 'Create persistent block storage and attach it to a server.',
    goals: [
      ['Create a 10 GB volume', 'openstack volume create --size 10 treasure', (d) => d.has('volume')],
      ['Attach it to a running server', 'openstack server add volume ship-01 treasure', (d) => d.has('volume-attach')],
      ['Confirm it is in-use', 'openstack volume list', (d) => d.has('volume-inuse-seen')],
    ],
  },
];

const OPENRC = `export OS_AUTH_URL=https://keystone.odyssey.example:5000/v3
export OS_PROJECT_NAME=argonauts
export OS_USER_DOMAIN_NAME=Default
export OS_PROJECT_DOMAIN_NAME=Default
export OS_USERNAME=alice
export OS_REGION_NAME=RegionOne
export OS_IDENTITY_API_VERSION=3`;

const HELP = `OpenStack Odyssey simulator — a safe sea to practise on.

Shell:    help · clear · ls · cat <file> · source argonauts-openrc.sh · source admin-openrc.sh
          export OS_CLOUD=argonauts · env · ping [-c N] <ip> · ssh <user>@<ip> · reset-lab
          ↑/↓ history · Tab completes openstack sub-commands

openstack (output options: -f table|json|value|yaml|csv, -c <column>):
  token issue · catalog list · service list · project list · role assignment list · quota show
  flavor list|show · image list|show · keypair create|list|delete
  server create|list|show|delete|stop|start|reboot · server event list · console log show
  server add floating ip · server add volume · server remove volume · server add security group
  network create|list|show|delete · subnet create|list|show · port list [--server S]
  router create|list|show|set --external-gateway|add subnet
  security group create|list · security group rule create|list
  floating ip create|list|delete · volume create|list|show|delete
  admin only: compute service list · hypervisor list · network agent list`;

export const COMPLETIONS = Object.keys(P.cmds).map((k) => `openstack ${k}`);
