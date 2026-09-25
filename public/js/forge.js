// The Forge of Hephaestus: sizing calculator + proposal and diagram generator.
import { esc } from './data/helpers.js';

const KEY = 'odyssey.forge.v1';

const PRESETS = {
  enterprise: { label: 'Enterprise general purpose', vms: 800, vcpu: 4, ram: 12, disk: 80, growth: 30, bigVcpu: 32, bigRam: 256, cpuRatio: 4, ramRatio: 1, ha: 'n1', cores: 64, ram_host: 768, reserved: 32, gpu: 0, azs: 3, gw: 'dedicated', repl: 'r3', fill: 75, osdRaw: 92, objTB: 50, tool: 'Kolla-Ansible', nic: '2 × 25 GbE' },
  starter: { label: 'Starter / edge site', vms: 80, vcpu: 2, ram: 8, disk: 60, growth: 20, bigVcpu: 8, bigRam: 64, cpuRatio: 4, ramRatio: 1, ha: 'n1', cores: 32, ram_host: 384, reserved: 48, gpu: 0, azs: 1, gw: 'compute', repl: 'r3', fill: 70, osdRaw: 30, objTB: 0, tool: 'Kolla-Ansible', nic: '2 × 25 GbE' },
  ai: { label: 'AI / GPU platform', vms: 150, vcpu: 16, ram: 128, disk: 500, growth: 50, bigVcpu: 64, bigRam: 1024, cpuRatio: 2, ramRatio: 1, ha: 'n1', cores: 96, ram_host: 1536, reserved: 64, gpu: 16, azs: 1, gw: 'dedicated', repl: 'r3', fill: 75, osdRaw: 184, objTB: 500, tool: 'Kayobe (Kolla-Ansible)', nic: '2 × 100 GbE' },
  telco: { label: 'Telco / NFV site', vms: 300, vcpu: 8, ram: 16, disk: 40, growth: 20, bigVcpu: 24, bigRam: 64, cpuRatio: 1, ramRatio: 1, ha: 'n2', cores: 64, ram_host: 512, reserved: 48, gpu: 0, azs: 1, gw: 'dedicated', repl: 'r3', fill: 70, osdRaw: 61, objTB: 0, tool: 'OpenStack-Ansible', nic: '2 × 25 GbE + SR-IOV 2 × 100 GbE' },
};

const FIELDS = [
  ['Customer & scope', [
    ['customer', 'Customer / project name', 'text', 'Ithaca Cloud'],
  ]],
  ['Workload demand', [
    ['vms', 'Number of VMs (today)', 'number'],
    ['vcpu', 'Average vCPU per VM', 'number'],
    ['ram', 'Average RAM per VM (GB)', 'number'],
    ['disk', 'Average disk per VM (GB)', 'number'],
    ['growth', 'Growth over planning horizon (%)', 'number'],
    ['bigVcpu', 'Largest flavor vCPU', 'number'],
    ['bigRam', 'Largest flavor RAM (GB)', 'number'],
    ['gpu', 'GPU hosts (separate pool, 0 = none)', 'number'],
  ]],
  ['Capacity policy', [
    ['cpuRatio', 'CPU allocation ratio (vCPU : thread)', 'number', null, 'Common: 4 general, 2 AI, 1 pinned/NFV'],
    ['ramRatio', 'RAM allocation ratio', 'number', null, 'Keep 1.0 in production'],
    ['ha', 'Compute HA headroom', 'select', [['n1', 'N+1'], ['n2', 'N+2'], ['az', 'Survive loss of one AZ']]],
  ]],
  ['Compute host profile', [
    ['cores', 'Physical cores per host (HT doubles threads)', 'number'],
    ['ram_host', 'RAM per host (GB)', 'number'],
    ['reserved', 'Reserved RAM for host/OVS/agents (GB)', 'number'],
    ['nic', 'NICs per host', 'text'],
  ]],
  ['Topology & storage', [
    ['azs', 'Availability zones', 'select', [['1', '1'], ['3', '3']]],
    ['gw', 'OVN gateways', 'select', [['dedicated', 'Dedicated gateway nodes'], ['compute', 'Computes act as gateways']]],
    ['repl', 'Ceph data protection', 'select', [['r3', '3× replication'], ['ec42', 'Erasure coding 4+2 (objects)']]],
    ['fill', 'Ceph fill target (%)', 'number'],
    ['osdRaw', 'Raw TB per Ceph storage node', 'number'],
    ['objTB', 'Additional object storage (TB usable)', 'number'],
    ['tool', 'Deployment tool', 'select', [['Kolla-Ansible', 'Kolla-Ansible'], ['Kayobe (Kolla-Ansible)', 'Kayobe'], ['OpenStack-Ansible', 'OpenStack-Ansible'], ['OpenStack-Helm', 'OpenStack-Helm'], ['Canonical Sunbeam', 'Canonical Sunbeam']]],
  ]],
];

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v) return { ...PRESETS.enterprise, customer: 'Ithaca Cloud', ...v }; } catch { /* ignore */ }
  return { ...PRESETS.enterprise, customer: 'Ithaca Cloud' };
}
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }

export function compute(v) {
  const n = (k) => Number(v[k]) || 0;
  const g = 1 + n('growth') / 100;
  const demandVcpu = Math.ceil(n('vms') * n('vcpu') * g);
  const demandRam = Math.ceil(n('vms') * n('ram') * g);
  const demandDisk = Math.ceil(n('vms') * n('disk') * g);
  const threads = n('cores') * 2;
  const vcpuHost = threads * n('cpuRatio');
  const ramHost = Math.max(0, (n('ram_host') - n('reserved')) * n('ramRatio'));
  const byCpu = vcpuHost ? Math.ceil(demandVcpu / vcpuHost) : 0;
  const byRam = ramHost ? Math.ceil(demandRam / ramHost) : 0;
  let base = Math.max(byCpu, byRam, 1);
  const azs = Number(v.azs) || 1;
  let ha = 1;
  if (v.ha === 'n2') ha = 2;
  let computes = base + ha;
  if (v.ha === 'az' && azs > 1) { computes = Math.ceil(base * azs / (azs - 1)); ha = computes - base; }
  if (azs > 1) computes = Math.ceil(computes / azs) * azs;
  const bound = byRam >= byCpu ? 'RAM' : 'CPU';
  const bigFits = n('bigVcpu') <= threads * Math.max(1, n('cpuRatio')) && n('bigRam') <= ramHost;
  const controllers = computes + n('gpu') > 200 ? 5 : 3;
  const gateways = v.gw === 'dedicated' ? (computes > 60 ? 3 : 2) : 0;

  const protection = v.repl === 'ec42' ? 1.5 : 3;
  const blockUsableTB = demandDisk / 1024;
  const rawTB = blockUsableTB * 3 / (n('fill') / 100) + (n('objTB') * protection) / (n('fill') / 100);
  const minOsd = v.repl === 'ec42' ? 7 : 4; // k+m+1 or replicas+1 for self-healing
  const cephNodes = Math.max(minOsd, n('osdRaw') ? Math.ceil(rawTB / n('osdRaw')) : minOsd);
  const monitoring = computes > 100 ? 3 : 1;
  const total = controllers + gateways + computes + n('gpu') + cephNodes + monitoring + 1;
  const racks = Math.max(azs, Math.ceil(total / 18));
  const usedVcpuPct = Math.round((demandVcpu / (computes * vcpuHost || 1)) * 100);
  const usedRamPct = Math.round((demandRam / (computes * ramHost || 1)) * 100);
  return { demandVcpu, demandRam, demandDisk, threads, vcpuHost, ramHost, byCpu, byRam, base, ha, computes, bound, bigFits, controllers, gateways, rawTB: Math.ceil(rawTB), blockUsableTB: Math.ceil(blockUsableTB), cephNodes, monitoring, total, racks, azs, usedVcpuPct, usedRamPct, protection };
}

function diagram(v, r) {
  const rows = [
    ['Control plane', r.controllers, 'controller', 'var(--gold)'],
    ['OVN gateways', r.gateways, 'gateway', 'var(--terracotta)'],
    ['Compute', r.computes, 'compute', 'var(--aegean)'],
    ['GPU compute', Number(v.gpu) || 0, 'gpu', 'var(--olive)'],
    ['Ceph storage', r.cephNodes, 'ceph', 'var(--sea-2)'],
    ['Ops & deploy', r.monitoring + 1, 'ops', 'var(--muted)'],
  ].filter((x) => x[1] > 0);
  const W = 760; const rowH = 58; const top = 70;
  const H = top + rows.length * rowH + 20;
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Physical architecture diagram">
  <style>.t{font:600 12px Inter,sans-serif;fill:var(--ink)}.s{font:11px Inter,sans-serif;fill:var(--muted)}</style>
  <rect x="200" y="8" width="360" height="26" rx="8" fill="var(--surface-2)" stroke="var(--line)"/>
  <text x="380" y="26" text-anchor="middle" class="t">Spine switches (L3, ECMP / EVPN)</text>
  <rect x="120" y="42" width="520" height="20" rx="6" fill="var(--surface-2)" stroke="var(--line)"/>
  <text x="380" y="56" text-anchor="middle" class="s">Leaf pairs per rack (MLAG/ESI) · ${esc(v.nic)} per server · MTU 9000</text>`;
  rows.forEach(([label, count, , color], i) => {
    const y = top + i * rowH;
    out += `<text x="10" y="${y + 22}" class="t">${esc(label)}</text><text x="10" y="${y + 38}" class="s">× ${count}</text>`;
    const shown = Math.min(count, 24);
    const bw = Math.min(40, (W - 200) / shown - 4);
    for (let k = 0; k < shown; k++) {
      out += `<rect x="${190 + k * (bw + 4)}" y="${y + 8}" width="${bw}" height="34" rx="5" fill="${color}" opacity=".85"/>`;
    }
    if (count > shown) out += `<text x="${190 + shown * (bw + 4) + 4}" y="${y + 30}" class="s">+${count - shown}</text>`;
  });
  return `${out}</svg>`;
}

function proposal(v, r) {
  const date = new Date().toISOString().slice(0, 10);
  const vlans = [
    ['Management / internal API', '10', 'Controllers, computes, internal VIP'],
    ['Public API', '20', 'External VIP, TLS'],
    ['Tenant overlay (Geneve)', '30', 'MTU 9000, UDP 6081 between all chassis'],
    ['Provider / external', '40+', 'Floating IP ranges, provider VLANs'],
    ['Storage public (Ceph)', '50', 'Client I/O, MTU 9000'],
    ['Storage cluster (Ceph)', '60', 'Replication and recovery, MTU 9000'],
    ['Octavia lb-mgmt', '70', 'Amphora ↔ health manager'],
    ['Out-of-band / BMC', '99', 'Redfish/IPMI, isolated'],
  ];
  return `# ${v.customer} — OpenStack Private Cloud Proposal (draft)
Date: ${date}   Release baseline: OpenStack 2026.1 "Gazpacho" (SLURP)
Deployment tooling: ${v.tool}

## 1. Executive summary
${v.customer} will run ~${v.vms} virtual machines (+${v.growth}% growth) on a self-service,
API-driven private cloud built on OpenStack 2026.1. The design uses ${r.total} servers in
~${r.racks} rack(s), ${r.azs} availability zone(s), highly available control plane, and Ceph
for images, volumes${Number(v.objTB) ? ' and S3/Swift object storage' : ''}.

## 2. Requirements & assumptions
- Demand incl. growth: ${r.demandVcpu} vCPU, ${r.demandRam} GB RAM, ${r.demandDisk} GB disk
- Overcommit: CPU ${v.cpuRatio}:1, RAM ${v.ramRatio}:1
- Largest flavor: ${v.bigVcpu} vCPU / ${v.bigRam} GB — ${r.bigFits ? 'fits on one host' : 'DOES NOT FIT on one host: review host profile'}
- Compute HA policy: ${({ n1: 'N+1', n2: 'N+2', az: 'survive loss of one AZ' })[v.ha]}
- Ceph fill target ${v.fill}% (headroom for self-healing after a node loss)
- ASSUMPTION: workload profile to be validated with metrics from the current platform

## 3. Sizing
| Pool              | Nodes | Basis |
|-------------------|------:|-------|
| Controllers       | ${String(r.controllers).padStart(5)} | Quorum for Galera, RabbitMQ (quorum queues), OVN RAFT |
| OVN gateways      | ${String(r.gateways).padStart(5)} | ${v.gw === 'dedicated' ? 'Dedicated north-south, SNAT/FIP' : 'Computes are gateway chassis'} |
| Compute           | ${String(r.computes).padStart(5)} | ${r.base} for demand (${r.bound}-bound) + ${r.ha} HA headroom |
| GPU compute       | ${String(Number(v.gpu) || 0).padStart(5)} | Separate aggregate/traits, PCI passthrough or vGPU |
| Ceph storage      | ${String(r.cephNodes).padStart(5)} | ~${r.rawTB} TB raw needed at ${v.osdRaw} TB/node |
| Monitoring/logging| ${String(r.monitoring).padStart(5)} | Prometheus, Grafana, OpenSearch |
| Deployment host   |     1 | CI-driven ${v.tool} runs |
| **Total**         | ${String(r.total).padStart(5)} | |

Per compute host: ${v.cores} cores / ${r.threads} threads → ${r.vcpuHost} vCPU; ${v.ram_host} GB RAM
(${v.reserved} GB reserved) → ${r.ramHost} GB schedulable.
Projected utilisation at full demand: vCPU ${r.usedVcpuPct}%, RAM ${r.usedRamPct}%.

## 4. Logical architecture
- Identity: Keystone with federation (OIDC/SAML) to the corporate IdP; secure RBAC roles
- Compute: Nova + Placement; flavors for general, memory-optimised${Number(v.gpu) ? ', GPU' : ''} pools
- Network: Neutron ML2/OVN, Geneve overlay, distributed routing, ${v.gw === 'dedicated' ? 'dedicated gateway chassis' : 'gateway chassis on computes'}
- Storage: Ceph RBD for Glance/Nova/Cinder (raw images, copy-on-write), ${v.repl === 'ec42' ? 'EC 4+2 pools for objects' : '3× replication'}
- Services: Octavia (LBaaS), Designate (DNS), Barbican (secrets/TLS), Horizon/Skyline
- Availability zones: ${r.azs}; server groups for anti-affinity; Masakari optional for instance HA

## 5. Network plan
| Network                     | VLAN | Notes |
|-----------------------------|------|-------|
${vlans.map(([a, b, c]) => `| ${a.padEnd(27)} | ${b.padEnd(4)} | ${c} |`).join('\n')}
Fabric: spine-leaf, ${v.nic} per server (LACP/MLAG), jumbo frames end-to-end.

## 6. Security
TLS on public and internal endpoints; Barbican for keys (HSM optional); security
domains separated in the fabric; CADF audit to SIEM; CIS-hardened host OS; image signing.

## 7. Operations
Everything as code (Git + CI) · Prometheus/Grafana + central logging · canary VM
checks · daily DB backups (mariabackup) · annual SLURP upgrades rehearsed in staging ·
runbooks per alert · quarterly game days.

## 8. Implementation plan
1. Discovery & design sign-off (2–3 weeks)
2. Hardware & fabric readiness (lead time dependent)
3. Staging deploy + acceptance tests (Tempest, Rally, failure drills)
4. Production deploy, pilot tenants, migration waves
5. Handover, training (OpenStack Odyssey levels 1–15), hypercare

## 9. Risks & mitigations
- Workload data unvalidated → metrics-based validation in discovery
- Skills gap → training plan + support partner for year one
- ${r.bigFits ? 'Capacity fragmentation → largest-free-slot monitoring' : 'Largest flavor exceeds a host → change host profile or flavor catalogue'}
- Ceph recovery impact → dedicated cluster network, mClock recovery profile
`;
}

export function renderForge(root, { toast }) {
  const v = load();
  const field = ([k, label, type, opt, hint]) => {
    const val = esc(v[k] ?? '');
    let input;
    if (type === 'select') input = `<select id="f-${k}" data-k="${k}">${opt.map(([o, t]) => `<option value="${o}"${String(v[k]) === o ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    else input = `<input id="f-${k}" data-k="${k}" type="${type}" value="${val}" ${type === 'number' ? 'min="0" step="any"' : ''}>`;
    return `<div class="field"><label for="f-${k}">${label}</label>${input}${hint ? `<small>${hint}</small>` : ''}</div>`;
  };
  root.innerHTML = `
  <p class="eyebrow">The Forge of Hephaestus</p>
  <h1>Architecture Forge</h1>
  <p class="lede">Size an OpenStack cloud, see the physical design and generate a draft proposal you can take to a customer or design review.</p>
  <div class="row" style="margin:10px 0 18px">
    <label for="preset" class="small muted">Start from a reference architecture:</label>
    <select id="preset"><option value="">— choose —</option>${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}</select>
  </div>
  <div class="forge">
    <form class="card" id="forge-form">
      ${FIELDS.map(([legend, fs]) => `<fieldset><legend>${legend}</legend>${fs.map(field).join('')}</fieldset>`).join('')}
    </form>
    <div>
      <div class="kpis" id="kpis"></div>
      <div class="card diagram" style="margin-top:14px" id="diagram"></div>
      <div class="card" style="margin-top:14px">
        <div class="row"><h3 style="margin:0">Draft proposal</h3><span class="spacer"></span>
          <button class="btn ghost" id="copy-prop" type="button">Copy</button>
          <button class="btn" id="dl-prop" type="button">Download .md</button></div>
        <p class="small muted">Markdown. Paste into your document template; review every assumption with the customer.</p>
        <div class="proposal" id="proposal"></div>
      </div>
    </div>
  </div>`;
  const update = () => {
    const r = compute(v);
    root.querySelector('#kpis').innerHTML = [
      [r.total, 'servers total'], [r.computes, `compute nodes (${r.bound}-bound)`], [r.controllers, 'controllers'],
      [r.cephNodes, `Ceph nodes (~${r.rawTB} TB raw)`], [r.gateways || '—', 'gateway nodes'], [r.racks, 'racks (est.)'],
      [`${r.usedVcpuPct}% / ${r.usedRamPct}%`, 'vCPU / RAM utilisation'], [r.bigFits ? 'Yes' : 'No!', 'largest flavor fits a host'],
    ].map(([b, s]) => `<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join('');
    root.querySelector('#diagram').innerHTML = diagram(v, r);
    root.querySelector('#proposal').textContent = proposal(v, r);
  };
  root.querySelector('#forge-form').addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('#forge-form').addEventListener('input', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    v[k] = e.target.value; save(v); update();
  });
  root.querySelector('#preset').addEventListener('change', (e) => {
    const p = PRESETS[e.target.value]; if (!p) return;
    Object.assign(v, p); save(v);
    renderForge(root, { toast }); toast(`Loaded reference: ${p.label}`);
  });
  root.querySelector('#copy-prop').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(root.querySelector('#proposal').textContent); toast('Proposal copied'); } catch { toast('Copy failed — select the text manually'); }
  });
  root.querySelector('#dl-prop').addEventListener('click', () => {
    const blob = new Blob([root.querySelector('#proposal').textContent], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${String(v.customer).replace(/\W+/g, '-').toLowerCase()}-openstack-proposal.md`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  update();
}
