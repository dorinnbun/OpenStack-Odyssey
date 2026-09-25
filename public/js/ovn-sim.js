// A small simulation of an ML2/OVN deployment for the Labyrinth labs:
// NB/SB inspection, ovn-trace, OVS on each host, and a stale ovn-encap-ip
// fault on cmp-03 that breaks tunnels while the logical path looks perfect.

const LS = { id: 'neutron-7f21a9c4-2d0e-4b1c-9a55-0d3e1f2a4b6c', uuid: '3c1e5a70-9b2d-4e61-8f0a-1d2c3b4a5e6f', name: 'argo-net' };
const LR = { id: 'neutron-2b77e0c4-5a1d-4f3e-b0c9-8e7d6c5b4a39', uuid: '9a0d4c21-7e6f-4b8a-a1c2-3d4e5f6a7b8c', name: 'argo-rtr' };
const PORTS = [
  { id: '5d2c7a1e-8f33-4c1a-9e0b-7a1d2c3e4f50', vm: 'web-01', mac: 'fa:16:3e:21:7b:c4', ip: '10.10.0.11', host: 'cmp-01' },
  { id: 'a93e0b12-6c4d-4e8f-b1a2-c3d4e5f60718', vm: 'web-03', mac: 'fa:16:3e:48:1d:0a', ip: '10.10.0.13', host: 'cmp-03' },
  { id: 'c07f5e2a-1b3c-4d5e-8f60-718293a4b5c6', vm: 'db-01', mac: 'fa:16:3e:9a:00:3d', ip: '10.10.0.20', host: 'cmp-02' },
];
const REAL_IP = { 'ctl-01': '10.0.0.11', 'cmp-01': '10.0.1.21', 'cmp-02': '10.0.1.22', 'cmp-03': '10.0.1.23', 'gw-01': '10.0.1.41' };
const CHASSIS = ['cmp-01', 'cmp-02', 'cmp-03', 'gw-01'];
const LRP = 'lrp-6f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f';

export function initialOvn() {
  return { host: 'ctl-01', encap: { 'cmp-01': '10.0.1.21', 'cmp-02': '10.0.1.22', 'cmp-03': '10.0.9.23', 'gw-01': '10.0.1.41' } };
}
export const isOvnHost = (h) => Object.hasOwn(REAL_IP, String(h || '').replace(/^root@/, ''));
const err = (out) => ({ out, cls: 'err' });
const onController = (o) => o.host === 'ctl-01';
const needCtl = (cmd) => err(`${cmd}: unix:/var/run/ovn/${cmd.startsWith('ovn-nb') ? 'ovnnb' : 'ovnsb'}_db.sock: database connection failed (No such file or directory)\n(hint: the OVN databases run on the controllers. Type "exit" to return to ctl-01.)`);

function nbShow() {
  return `switch ${LS.uuid} (${LS.id}) (aka ${LS.name})
${PORTS.map((p) => `    port ${p.id}\n        addresses: ["${p.mac} ${p.ip}"]`).join('\n')}
    port provnet-physnet1
        type: localnet
        addresses: ["unknown"]
router ${LR.uuid} (${LR.id}) (aka ${LR.name})
    port ${LRP}
        mac: "fa:16:3e:0c:11:01"
        networks: ["10.10.0.1/24"]
    port lrp-gw-0e1d2c3b
        mac: "fa:16:3e:0c:11:02"
        networks: ["203.0.113.9/24"]
        gateway chassis: [gw-01]
    nat 1a2b3c4d
        external ip: "203.0.113.50"
        logical ip: "10.10.0.11"
        type: "dnat_and_snat"
    nat 5e6f7a8b
        external ip: "203.0.113.9"
        logical ip: "10.10.0.0/24"
        type: "snat"`;
}

function sbShow(o) {
  return CHASSIS.map((c) => `Chassis ${c}\n    hostname: ${c}\n    Encap geneve\n        ip: "${o.encap[c]}"\n        options: {csum="true"}${PORTS.filter((p) => p.host === c).map((p) => `\n    Port_Binding "${p.id}"`).join('')}${c === 'gw-01' ? '\n    Port_Binding cr-lrp-gw-0e1d2c3b' : ''}`).join('\n');
}

function ovsShow(o) {
  const h = o.host;
  if (h === 'ctl-01') return '(ctl-01 is a controller: it runs the OVN databases and ovn-northd but no Open vSwitch in this lab.\n Use "ssh cmp-01" to look at a compute node.)';
  const peers = CHASSIS.filter((c) => c !== h);
  const taps = PORTS.filter((p) => p.host === h);
  return `${hexId(h)}
    Bridge br-int
        fail_mode: secure
        datapath_type: system
${taps.map((p) => `        Port tap${p.id.slice(0, 11)}\n            Interface tap${p.id.slice(0, 11)}`).join('\n')}${taps.length ? '\n' : ''}${peers.map((c) => `        Port ovn-${c}-0\n            Interface ovn-${c}-0\n                type: geneve\n                options: {csum="true", key=flow, remote_ip="${o.encap[c]}"}`).join('\n')}
        Port br-int
            Interface br-int
                type: internal${h === 'gw-01' ? '\n    Bridge br-ex\n        Port bond0\n            Interface bond0\n        Port patch-provnet-physnet1-to-br-int\n            Interface patch-provnet-physnet1-to-br-int\n                type: patch' : ''}
    ovs_version: "3.5.1"`;
}
const hexId = (h) => `${[...h].reduce((a, c) => ((a * 31 + c.charCodeAt(0)) >>> 0), 7).toString(16).padStart(8, '0')}-4d2c-4e1a-9b0c-${h.length}a1b2c3d4e5f`;

function extIds(o) {
  const h = o.host;
  if (h === 'ctl-01') return '{hostname=ctl-01, rundir="/var/run/openvswitch", system-id=ctl-01}';
  return `{hostname=${h}, ovn-bridge=br-int${h === 'gw-01' ? ', ovn-bridge-mappings="physnet1:br-ex", ovn-cms-options=enable-chassis-as-gw' : ''}, ovn-encap-ip="${o.encap[h]}", ovn-encap-type=geneve, ovn-remote="tcp:10.0.0.11:6642,tcp:10.0.0.12:6642,tcp:10.0.0.13:6642", system-id=${h}}`;
}

function trace(sim, args) {
  const o = sim.s.ovn;
  const text = args.filter((a) => !a.startsWith('--')).join(' ');
  const dp = args.find((a) => !a.startsWith('--'));
  const flow = args.filter((a) => !a.startsWith('--')).slice(1).join(' ');
  if (!dp || !flow) return err('usage: ovn-trace [--summary|--detailed] DATAPATH MICROFLOW\n(example: ovn-trace --summary argo-net \'inport == "<port-id>" && eth.src == … && ip4.src == … && ip4.dst == … && ip.ttl == 64\')');
  if (![LS.id, LS.name, LS.uuid].includes(dp)) return err(`ovn-trace: unknown datapath "${dp}" (in this lab: ${LS.name} or ${LS.id})`);
  const inport = /inport\s*==\s*"([^"]+)"/.exec(flow)?.[1];
  const dst = /ip4\.dst\s*==\s*([\d.]+)/.exec(flow)?.[1];
  const tcp = /tcp\.dst\s*==\s*(\d+)/.exec(flow)?.[1];
  const src = PORTS.find((p) => p.id === inport || p.id.startsWith(inport || '#'));
  if (!src) return err(`ovn-trace: ${text.includes('inport') ? `unknown logical port "${inport}"` : 'microflow needs inport == "<logical port name>"'}\n(hint: logical port names are Neutron port IDs; see "ovn-nbctl show")`);
  if (!/eth\.src/.test(flow) || !/ip4\.src/.test(flow) || !dst) return err('ovn-trace: describe the packet fully: eth.src, eth.dst, ip4.src, ip4.dst and ip.ttl (port security checks the source MAC and IP)');
  const target = PORTS.find((p) => p.ip === dst);
  const head = `# ${flow}\ningress(dp="${LS.name}", inport="${src.id}")\n    ls_in_check_port_sec: passed (eth.src ${src.mac}, ip4.src ${src.ip})`;
  if (!target) return { out: `${head}\n    ls_in_l2_lkup: no logical port owns ${dst} on this switch → sent to the router port\n    (outside this lab’s topology)` };
  if (target.vm === 'db-01' && tcp && tcp !== '22') {
    sim.mark('ovn-trace-drop');
    return { out: `${head}\n    ls_in_acl_eval: no security group rule allows tcp/${tcp} to ${target.vm}\n    drop;  /* default deny by port group ACLs */`, cls: 'err' };
  }
  sim.mark('ovn-trace-ok');
  return { out: `${head}\n    ls_in_acl_eval: allowed by security group (conntrack commit)\n    ls_in_l2_lkup: outport = "${target.id}" (${target.vm})\negress(dp="${LS.name}", inport="${src.id}", outport="${target.id}")\n    ls_out_acl_eval: allowed\n    output("${target.id}");\n\nThe LOGICAL path is fine: OVN will deliver this packet.\nIf it still does not arrive, the problem is physical (tunnels, encap IPs, MTU, fabric).`, cls: 'ok' };
}

export function ovnExec(sim, cmd, t) {
  const o = sim.s.ovn;
  const w = t.join(' ');
  switch (cmd) {
    case 'ovn-nbctl': {
      if (!onController(o)) return needCtl(cmd);
      if (!t.length || w === 'show') { sim.mark('ovn-nb-show'); return nbShow(); }
      if (w === 'ls-list') return `${LS.uuid} (${LS.id})`;
      if (w === 'lr-list') return `${LR.uuid} (${LR.id})`;
      if (t[0] === 'lr-nat-list') {
        if (![LR.id, LR.uuid, LR.name].includes(t[1])) return err(`ovn-nbctl: ${t[1] || '(missing)'}: router name not found (use ${LR.id})`);
        sim.mark('ovn-nat');
        return 'TYPE             GATEWAY_PORT          EXTERNAL_IP        EXTERNAL_PORT    LOGICAL_IP          EXTERNAL_MAC         LOGICAL_PORT\ndnat_and_snat                          203.0.113.50                        10.10.0.11\nsnat                                   203.0.113.9                         10.10.0.0/24';
      }
      if (t[0] === 'lrp-get-gateway-chassis') return t[1] ? 'lrp-gw-0e1d2c3b_gw-01     1' : err('ovn-nbctl: missing router port name');
      if (t[0] === 'acl-list') return `from-lport  1002 (inport == @pg_web && ip4) allow-related\n  to-lport  1002 (outport == @pg_web && ip4 && tcp.dst == 443) allow-related\n  to-lport  1002 (outport == @pg_web && ip4 && tcp.dst == 80) allow-related\n  to-lport  1002 (outport == @pg_web && ip4 && ip4.src == 198.51.100.0/24 && tcp.dst == 22) allow-related\n  to-lport  1001 (outport == @neutron_pg_drop && ip) drop`;
      return err(`ovn-nbctl: "${w}" is not supported in this lab (show, ls-list, lr-list, lr-nat-list <router>, lrp-get-gateway-chassis <port>, acl-list <group>)`);
    }
    case 'ovn-sbctl': {
      if (!onController(o)) return needCtl(cmd);
      if (!t.length || w === 'show') { sim.mark('ovn-sb-show'); return sbShow(o); }
      if (w === 'list chassis' || w === 'list Chassis') { sim.mark('ovn-chassis'); return CHASSIS.map((c) => `_uuid               : ${hexId(c)}\nencaps              : [geneve ${o.encap[c]}]\nhostname            : ${c}\nname                : ${c}\n`).join('\n'); }
      if (t[0] === 'lflow-list') return `Datapath: "${LS.id}" (aka "${LS.name}")  Pipeline: ingress\n  table=0 (ls_in_check_port_sec), priority=100, match=(eth.src[40]), action=(drop;)\n  table=0 (ls_in_check_port_sec), priority=50, match=(inport == "${PORTS[0].id}"), action=(reg0[15] = check_in_port_sec(); next;)\n  …\n  table=27 (ls_in_l2_lkup), priority=50, match=(eth.dst == ${PORTS[1].mac}), action=(outport = "${PORTS[1].id}"; output;)\n(truncated: a real switch has hundreds of logical flows)`;
      return err(`ovn-sbctl: "${w}" is not supported in this lab (show, list chassis, lflow-list)`);
    }
    case 'ovn-trace': if (!onController(o)) return needCtl('ovn-sbctl'); return trace(sim, t);
    case 'ovn-appctl': {
      if (!onController(o)) return err('ovn-appctl: cannot connect to "/var/run/ovn/…ctl" (No such file or directory)');
      const db = /ovnsb/.test(w) ? 'OVN_Southbound' : /ovnnb/.test(w) ? 'OVN_Northbound' : null;
      if (/cluster\/status/.test(w) && db) {
        sim.mark('ovn-cluster');
        return `Name: ${db}\nCluster ID: 8a1f (8a1f6c2e-…)\nServer ID: 3c2b (3c2b9e10-…)\nAddress: tcp:10.0.0.11:${db === 'OVN_Northbound' ? 6643 : 6644}\nStatus: cluster member\nRole: leader\nTerm: 42\nLeader: self\nServers:\n    3c2b (3c2b at tcp:10.0.0.11) (self)\n    9d10 (9d10 at tcp:10.0.0.12) last msg 312 ms ago\n    e47a (e47a at tcp:10.0.0.13) last msg 298 ms ago`;
      }
      if (/ovn-northd/.test(w) && /status/.test(w)) return 'Status: active';
      return err('ovn-appctl: this lab supports: -t /var/run/ovn/ovnnb_db.ctl cluster/status OVN_Northbound, -t /var/run/ovn/ovnsb_db.ctl cluster/status OVN_Southbound, -t ovn-northd status');
    }
    case 'ovs-vsctl': {
      if (w === 'show') { sim.mark(`ovs-show-${o.host}`); if (o.host === 'cmp-01' && o.encap['cmp-03'] === REAL_IP['cmp-03']) sim.mark('tunnel-fixed-seen'); return ovsShow(o); }
      if (w === 'get open . external-ids' || w === 'get Open_vSwitch . external_ids' || w === 'get open . external_ids') { sim.mark('ovs-ids'); return extIds(o); }
      const m = /^set open(?:_vswitch)? \. external[-_]ids:ovn-encap-ip=("?)([\d.]+)\1$/i.exec(w);
      if (m) {
        if (o.host === 'ctl-01') return err('ovs-vsctl: ctl-01 has no Open vSwitch in this lab. Log in to the compute node that needs fixing.');
        o.encap[o.host] = m[2]; sim.mark(`encap-set-${o.host}`);
        return { out: `(ovn-controller on ${o.host} re-registers the chassis with encap IP ${m[2]}; other hosts rebuild their tunnels within seconds)`, cls: 'ok' };
      }
      return err('ovs-vsctl: this lab supports: show, get open . external-ids, set open . external-ids:ovn-encap-ip=<ip>');
    }
    case 'ip':
      if (/^(-br )?(a|addr|address)( show)?$/.test(w)) { sim.mark(`ip-${o.host}`); return `lo               UNKNOWN        127.0.0.1/8 ::1/128\nbond0.20         UP             ${REAL_IP[o.host]}/24   # host (tunnel) network\nbond0.10         UP             ${REAL_IP[o.host].replace(/^10\.0\.\d+/, '10.0.10')}/24   # management`; }
      return err('ip: this lab supports: ip -br addr');
    case 'hostname': return o.host;
    case 'tcpdump':
      if (o.host === 'ctl-01') return err('tcpdump: genev_sys_6081: No such device exists (controllers carry no tenant traffic here)');
      if (o.host === 'cmp-01') return o.encap['cmp-03'] === REAL_IP['cmp-03']
        ? 'IP 10.0.1.21.52011 > 10.0.1.23.6081: Geneve, vni 0x3 … IP 10.10.0.11 > 10.10.0.13: ICMP echo request\nIP 10.0.1.23.40214 > 10.0.1.21.6081: Geneve, vni 0x3 … IP 10.10.0.13 > 10.10.0.11: ICMP echo reply'
        : 'IP 10.0.1.21.52011 > 10.0.9.23.6081: Geneve, vni 0x3 … IP 10.10.0.11 > 10.10.0.13: ICMP echo request\nIP 10.0.1.21.52011 > 10.0.9.23.6081: Geneve, vni 0x3 … IP 10.10.0.11 > 10.10.0.13: ICMP echo request\n(no replies: packets are sent to 10.0.9.23. Is that really cmp-03’s address?)';
      return '(listening on genev_sys_6081 … no packets captured in 5 seconds)';
    case 'ssh': {
      const h = String(t[0] || '').replace(/^root@/, '');
      if (!isOvnHost(h)) return err(`ssh: Could not resolve hostname ${h}`);
      o.host = h; sim.mark(`ssh-${h}`);
      return `Last login: ${new Date().toUTCString()} from 10.0.0.11\n(now on ${h}; type "exit" to go back to ctl-01)`;
    }
    case 'exit':
      if (o.host === 'ctl-01') return '(already on ctl-01)';
      o.host = 'ctl-01'; return 'logout\nConnection to host closed.';
    case 'ping': {
      const ip = t.find((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x));
      if (!ip) return err('usage: ping [-c N] <ipv4 address>');
      const ok = Object.values(REAL_IP).includes(ip);
      return ok ? { out: `PING ${ip}: 3 packets transmitted, 3 received, 0% packet loss`, cls: 'ok' } : err(`PING ${ip}: 3 packets transmitted, 0 received, 100% packet loss\n(no host answers on ${ip})`);
    }
    default: return err(`${cmd}: not supported in this lab`);
  }
}

const PFX = { ovn: 'OVN (the Labyrinth labs): ovn-nbctl show · ovn-sbctl show · ovn-sbctl list chassis · ovn-trace … · ovn-appctl -t … cluster/status\n  on hosts: ssh cmp-01 · ovs-vsctl show · ovs-vsctl get open . external-ids · ip -br addr · tcpdump -ni genev_sys_6081 · exit' };
export const OVN_HELP = PFX.ovn;

const TRACE_HINT = `ovn-trace --summary argo-net 'inport == "${PORTS[0].id}" && eth.src == ${PORTS[0].mac} && eth.dst == ${PORTS[1].mac} && ip4.src == ${PORTS[0].ip} && ip4.dst == ${PORTS[1].ip} && ip.ttl == 64'`;

export const OVN_LABS = [
  {
    id: 'ovn-explore', dynamicPrompt: 'ovn', title: 'Walk the Labyrinth', level: 'Labyrinth, islands Β–Γ',
    intro: 'Read a live ML2/OVN deployment: the logical view, the physical view, the database cluster and one compute host.',
    banner: ['OVN 26.03 · 3 controllers · cmp-01..03 · gw-01 · you are on ctl-01 (controller)', 'Type "help" for commands. Start with:  ovn-nbctl show'],
    goals: [
      ['See the logical network (Northbound)', 'ovn-nbctl show', (d) => d.has('ovn-nb-show')],
      ['See chassis and port bindings (Southbound)', 'ovn-sbctl show', (d) => d.has('ovn-sb-show')],
      ['Find the router’s NAT rules (floating IP and SNAT)', `ovn-nbctl lr-nat-list ${LR.id}`, (d) => d.has('ovn-nat')],
      ['Check the Northbound RAFT cluster', 'ovn-appctl -t /var/run/ovn/ovnnb_db.ctl cluster/status OVN_Northbound', (d) => d.has('ovn-cluster')],
      ['Log in to a compute node and read its bridges', 'ssh cmp-01 && ovs-vsctl show', (d) => d.has('ovs-show-cmp-01')],
      ['Read its OVN settings (external-ids)', 'ovs-vsctl get open . external-ids', (d) => d.has('ovs-ids')],
    ],
  },
  {
    id: 'ovn-thread', dynamicPrompt: 'ovn', title: 'Ariadne’s Thread', level: 'Labyrinth, island Δ',
    intro: 'Ticket: “web-01 (on cmp-01) cannot reach web-03 (on cmp-03) since the rack move last night.” Follow the thread from logic to wire.',
    banner: ['OVN 26.03 · you are on ctl-01 · ticket OPS-1204: web-01 → web-03 unreachable', 'Start by asking OVN whether the logical path is correct (ovn-trace).'],
    alert: '⚠ OPS-1204 opened: web-01 cannot reach web-03 since cmp-03 moved racks.',
    setup(s) { s.ovn.host = 'ctl-01'; s.ovn.encap['cmp-03'] = '10.0.9.23'; },
    goals: [
      ['Trace web-01 → web-03 through the logical network', TRACE_HINT, (d) => d.has('ovn-trace-ok')],
      ['Compare each chassis’s tunnel (encap) IP', 'ovn-sbctl list chassis', (d) => d.has('ovn-chassis')],
      ['Log in to cmp-03 and check its real address', 'ssh cmp-03 && ip -br addr', (d) => d.has('ip-cmp-03')],
      ['Fix cmp-03’s ovn-encap-ip', 'ovs-vsctl set open . external-ids:ovn-encap-ip=10.0.1.23', (d, s) => s.ovn?.encap['cmp-03'] === '10.0.1.23'],
      ['Confirm the tunnel from cmp-01 now points to the right IP', 'exit && ssh cmp-01 && ovs-vsctl show', (d) => d.has('tunnel-fixed-seen')],
    ],
  },
];

export const OVN_COMPLETIONS = ['ovn-nbctl show', 'ovn-nbctl lr-nat-list', 'ovn-nbctl acl-list', 'ovn-sbctl show', 'ovn-sbctl list chassis', 'ovn-sbctl lflow-list',
  'ovn-trace --summary argo-net', 'ovn-appctl -t /var/run/ovn/ovnnb_db.ctl cluster/status OVN_Northbound', 'ovn-appctl -t /var/run/ovn/ovnsb_db.ctl cluster/status OVN_Southbound',
  'ovs-vsctl show', 'ovs-vsctl get open . external-ids', 'ovs-vsctl set open . external-ids:ovn-encap-ip=', 'ip -br addr', 'tcpdump -ni genev_sys_6081'];
