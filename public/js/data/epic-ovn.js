import { term, note, lens, fig } from './helpers.js';

// The Labyrinth: OVN (Open Virtual Network) from networking basics to running
// Neutron's default SDN in production.
const OVN = 'https://docs.ovn.org/en/latest';
const NEU = 'https://docs.openstack.org/neutron/latest/admin/ovn';

const stackSvg = `<svg viewBox="0 0 760 300" role="img" aria-label="OVN architecture">
  <style>.b{fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.a{stroke:var(--accent-text);stroke-width:2;fill:none;marker-end:url(#ovnar)}</style>
  <defs><marker id="ovnar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent-text)"/></marker></defs>
  <rect x="20" y="16" width="220" height="52" class="b"/><text x="34" y="38" class="t">neutron-server</text><text x="34" y="57" class="s">ML2/OVN mechanism driver</text>
  <path d="M240 42H298" class="a"/>
  <rect x="300" y="16" width="200" height="52" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="314" y="38" class="t">Northbound DB</text><text x="314" y="57" class="s">what you want (logical)</text>
  <path d="M400 68V98" class="a"/>
  <rect x="300" y="100" width="200" height="46" class="b"/><text x="314" y="122" class="t">ovn-northd</text><text x="314" y="139" class="s">the translator</text>
  <path d="M400 146V176" class="a"/>
  <rect x="300" y="178" width="200" height="52" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="314" y="200" class="t">Southbound DB</text><text x="314" y="219" class="s">logical flows + where things are</text>
  <path d="M340 230L150 258 M400 230V258 M460 230L650 258" class="a"/>
  <rect x="20" y="260" width="230" height="34" class="b"/><text x="34" y="282" class="t">ovn-controller → OVS (cmp-01)</text>
  <rect x="265" y="260" width="230" height="34" class="b"/><text x="279" y="282" class="t">ovn-controller → OVS (cmp-02)</text>
  <rect x="510" y="260" width="230" height="34" class="b"/><text x="524" y="282" class="t">ovn-controller → OVS (gateway)</text>
  <text x="530" y="120" class="s">NB and SB are clustered</text><text x="530" y="138" class="s">(RAFT, 3 members)</text>
</svg>`;

export const OVN_EPIC = {
  id: 'labyrinth',
  title: 'The Labyrinth of Daedalus',
  greekTitle: 'ΛΑΒΥΡΙΝΘΟΣ',
  project: 'OVN',
  honour: 'Slayer of the Minotaur',
  glyph: 'column',
  tagline: 'Networking and OVN from zero, following Ariadne’s thread to the Minotaur',
  myth: 'Daedalus built a labyrinth so tangled that no one who entered could find the way out. Theseus succeeded with Ariadne’s thread, tied at the entrance and unwound at every turn. Cloud networking is that labyrinth; ovn-trace is your thread. You start with what a switch does and end running Neutron’s default SDN in production.',
  rose: [575, 330],
  map: [[95, 250, 1], [250, 135, -1], [405, 262, 1], [560, 120, -1], [720, 255, 1], [890, 140, -1]],
  short: ['Athens', 'Workshop of Daedalus', 'Palace of Minos', 'Ariadne’s Thread', 'The Minotaur', 'Wings of Icarus'],
  levels: [
    // ------------------------------------------------------------ 1
    {
      id: 'ovn-athens', n: 1, place: 'Athens', title: 'Networking from Zero',
      subtitle: 'MAC, IP, switches, routers, VLANs and overlays in plain words',
      tier: 'Novice', relic: { name: 'Ball of Thread', desc: 'You know the ground rules of every network.' },
      myth: 'Before entering the labyrinth, Theseus learnt its purpose in Athens. Before OVN, learn what every network does: deliver a packet from one address to another, one hop at a time.',
      goals: ['Explain MAC addresses, IP addresses, ARP, switches and routers', 'Say what a VLAN is and why clouds use overlays', 'Calculate the MTU left after encapsulation'],
      lessons: [
        {
          id: 'l2-l3', title: 'Switches, routers and addresses', minutes: 10,
          html: `
${note('plain', 'A <b>MAC address</b> is like a person’s name inside one building; an <b>IP address</b> is like a postal address that works across cities. A <b>switch</b> delivers inside the building (layer 2) by name. A <b>router</b> carries letters between buildings (layer 3) by postal address.')}
<table><tr><th>Idea</th><th>What it is</th><th>In OpenStack</th></tr>
<tr><td>MAC address</td><td>Hardware address of a network card, e.g. <code>fa:16:3e:21:7b:c4</code></td><td>Every Neutron port has one</td></tr>
<tr><td>IP and subnet</td><td>Address plus the range it belongs to, e.g. <code>10.10.0.11/24</code></td><td>Neutron subnet</td></tr>
<tr><td>ARP</td><td>“Who has 10.10.0.1? Tell me your MAC”</td><td>Answered locally by OVN</td></tr>
<tr><td>Switch (L2)</td><td>Forwards frames by MAC within one network</td><td>Neutron network = OVN logical switch</td></tr>
<tr><td>Router (L3)</td><td>Forwards packets between subnets by IP</td><td>Neutron router = OVN logical router</td></tr>
<tr><td>NAT</td><td>Rewrites addresses at the edge</td><td>SNAT and floating IPs</td></tr></table>
${term('see it on any Linux machine', `
$ ip -br addr            # interfaces and IPs
$ ip route               # where packets go next
$ ip neigh               # the ARP table: IP → MAC`)}
${lens({
  sys: 'Most “the VM has no network” tickets end at one of these rows: wrong subnet, no ARP reply, no route, or missing NAT.',
  pre: 'You do not need to be a network engineer, but knowing L2 versus L3 lets you follow the network team in design workshops.',
})}`,
          sources: [['OVN architecture (introduction)', 'https://www.ovn.org/support/dist-docs/ovn-architecture.7.html'], ['Neutron: introduction to networking', 'https://docs.openstack.org/neutron/latest/admin/intro.html']],
        },
        {
          id: 'vlan-overlay', title: 'VLANs, overlays and MTU', minutes: 10,
          html: `
<p>A cloud has thousands of tenant networks but one physical fabric. Two ways to keep them apart:</p>
<table><tr><th></th><th>VLAN</th><th>Overlay (Geneve, VXLAN)</th></tr>
<tr><td>How</td><td>A 12-bit tag in the Ethernet frame</td><td>Wrap the tenant’s frame inside a UDP packet between hosts</td></tr>
<tr><td>How many</td><td>At most 4094 per fabric</td><td>Millions (24-bit IDs)</td></tr>
<tr><td>Fabric involvement</td><td>Every switch must know every VLAN</td><td>The fabric only sees host-to-host UDP</td></tr>
<tr><td>Used by OVN for</td><td>Provider networks</td><td>Tenant (self-service) networks, with <b>Geneve</b></td></tr></table>
${note('plain', 'An overlay is a letter inside an envelope. The fabric only reads the outer envelope (host A to host B); OVN opens it on arrival and delivers the inner letter to the right VM.')}
<h3>The envelope has a cost: MTU</h3>
<p>Geneve over IPv4 adds up to <b>58 bytes</b>. On a 1500-byte fabric, tenant networks get <b>1442</b>. Set the fabric to jumbo frames (9000) and Neutron’s <code>global_physnet_mtu = 9000</code> so tenants can keep 1500 or more.</p>
${lens({
  net: 'Geneve uses UDP port 6081 between every chassis. Allow it, and make MTU consistent end to end.',
  sa: 'Use VLAN provider networks where a workload must sit on an existing enterprise VLAN; use Geneve for self-service tenant networks.',
})}`,
          sources: [['Neutron MTU considerations', 'https://docs.openstack.org/neutron/latest/admin/config-mtu.html'], ['Geneve (RFC 8926)', 'https://www.rfc-editor.org/rfc/rfc8926']],
        },
      ],
      quiz: [
        { q: 'Which device forwards traffic between different subnets?', a: ['A switch', 'A router', 'A hub', 'A NIC'], c: 1, e: 'Routers work at layer 3, between subnets.' },
        { q: 'What does ARP do?', a: ['Encrypts traffic', 'Finds the MAC address for an IP address', 'Assigns IPs', 'Routes between sites'], c: 1, e: 'ARP maps IP to MAC on the local network.' },
        { q: 'Which encapsulation does OVN use for tenant networks?', a: ['GRE', 'VXLAN', 'Geneve', 'MPLS'], c: 2, e: 'OVN uses Geneve (UDP 6081).' },
        { q: 'Physical MTU 1500, Geneve over IPv4. Tenant MTU?', a: ['1500', '1450', '1442', '1400'], c: 2, e: '1500 − 58 = 1442.' },
      ],
    },
    // ------------------------------------------------------------ 2
    {
      id: 'ovn-workshop', n: 2, place: 'The Workshop of Daedalus', title: 'Open vSwitch, the Machine Inside',
      subtitle: 'Bridges, ports, patch ports, OpenFlow and bridge mappings',
      tier: 'Novice', relic: { name: 'Daedalus’ Plumb Line', desc: 'You can read an Open vSwitch host.' },
      myth: 'Daedalus built his marvels by hand in his workshop. OVN also needs a craftsman on every host: Open vSwitch, the programmable switch that actually moves the packets.',
      goals: ['Name the bridges on an OVN host and what each is for', 'Read ovs-vsctl show', 'Explain OpenFlow tables and bridge mappings'],
      lab: 'ovn-explore',
      lessons: [
        {
          id: 'ovs', title: 'Bridges and ports', minutes: 10,
          html: `
<p><b>Open vSwitch (OVS)</b> is a software switch inside Linux. On every compute and gateway node, OVN uses it through two main bridges:</p>
<table><tr><th>Bridge</th><th>Job</th></tr>
<tr><td><code>br-int</code></td><td>The integration bridge. Every VM’s <code>tap</code> port and every Geneve tunnel plugs in here. OVN owns it.</td></tr>
<tr><td><code>br-ex</code> (or another provider bridge)</td><td>Connected to a physical NIC for provider and external networks.</td></tr></table>
${term('read a host', `
$ ovs-vsctl show
    Bridge br-int
        Port tap5d2c7a1e-8f
            Interface tap5d2c7a1e-8f
        Port ovn-cmp-02-0
            Interface ovn-cmp-02-0
                type: geneve
                options: {csum="true", key=flow, remote_ip="10.0.1.22"}
        Port patch-br-int-to-provnet-7f21
            Interface patch-br-int-to-provnet-7f21
                type: patch
    Bridge br-ex
        Port bond0
        Port patch-provnet-7f21-to-br-int
$ ovs-vsctl get open . external-ids`)}
<ul>
<li><b>tap…</b> ports are VMs; the name contains the first characters of the Neutron port ID.</li>
<li><b>ovn-&lt;chassis&gt;-0</b> ports are Geneve tunnels to other hosts.</li>
<li><b>patch</b> ports join br-int to the provider bridge.</li>
</ul>
<h3>Bridge mappings</h3>
<p><code>ovn-bridge-mappings=physnet1:br-ex</code> (in OVS <code>external-ids</code>) says “Neutron’s physical network <i>physnet1</i> lives on bridge <i>br-ex</i>”. A missing or wrong mapping is the classic reason provider networks and floating IPs do not work on one host.</p>
${lens({
  sys: 'Keep <code>ovs-vsctl show</code> and <code>ovs-vsctl get open . external-ids</code> in your first-minute checklist for any network ticket on a host.',
  net: 'Bonds usually sit on br-ex; make sure LACP settings match the switch, or you will see flapping and drops.',
})}`,
          sources: [['Open vSwitch documentation', 'https://docs.openvswitch.org/en/latest/'], ['OVN architecture: chassis setup', 'https://www.ovn.org/support/dist-docs/ovn-architecture.7.html']],
        },
        {
          id: 'openflow', title: 'OpenFlow in one page', minutes: 8,
          html: `
<p>OVS decides what to do with each packet using <b>flow tables</b>: rules of the form “if the packet matches <i>this</i>, do <i>that</i>”. ovn-controller writes those rules for you, often tens of thousands per host.</p>
${term('peek at the flows (read-only)', `
$ ovs-ofctl -O OpenFlow15 dump-flows br-int | wc -l
38412
$ ovs-ofctl -O OpenFlow15 dump-flows br-int table=0 | head -3
 cookie=0x2b1c, table=0, priority=100,in_port=12 actions=load:0x3->NXM_NX_REG13[],…,resubmit(,8)`)}
${note('warn', 'Never edit OpenFlow rules by hand on an OVN host. ovn-controller will overwrite them, and manual rules hide real problems. Change Neutron objects instead, and use tracing tools to understand the result.')}
${lens({
  net: 'Physical flow tables are hard to read. The next islands teach logical flows and ovn-trace, which explain the same behaviour in Neutron terms.',
})}`,
          sources: [['ovs-ofctl manual', 'https://www.openvswitch.org/support/dist-docs/ovs-ofctl.8.txt']],
        },
      ],
      quiz: [
        { q: 'Which bridge do VM tap ports and Geneve tunnels plug into?', a: ['br-ex', 'br-int', 'br-tun', 'virbr0'], c: 1, e: 'br-int is OVN’s integration bridge.' },
        { q: 'What does ovn-bridge-mappings=physnet1:br-ex mean?', a: ['A VLAN range', 'Neutron’s physnet1 is reached through bridge br-ex', 'A tunnel key', 'An MTU'], c: 1, e: 'It maps a physical network name to a local bridge.' },
        { q: 'Should you add OpenFlow rules manually on an OVN host?', a: ['Yes, for performance', 'No: ovn-controller owns them and will overwrite them', 'Only on gateways', 'Only for IPv6'], c: 1, e: 'Change Neutron objects, not flows.' },
        { q: 'A port named ovn-cmp-02-0 of type geneve is…', a: ['A VM', 'A tunnel to chassis cmp-02', 'A patch to br-ex', 'The DHCP server'], c: 1, e: 'Tunnel ports are named after the remote chassis.' },
      ],
    },
    // ------------------------------------------------------------ 3
    {
      id: 'ovn-palace', n: 3, place: 'The Palace of Minos', title: 'The Architecture of OVN',
      subtitle: 'Northbound, ovn-northd, Southbound, ovn-controller and chassis',
      tier: 'Apprentice', relic: { name: 'Seal of Minos', desc: 'You know how OVN is built.' },
      myth: 'King Minos ruled from a palace of countless rooms, each with its purpose. OVN’s palace has just five kinds of rooms. Learn them and the whole building makes sense.',
      goals: ['Describe the path from a Neutron API call to flows on a host', 'Tell logical objects (NB) from physical bindings (SB)', 'Explain why the databases are clustered with RAFT'],
      lab: 'ovn-explore',
      lessons: [
        {
          id: 'components', title: 'From API call to packet', minutes: 12,
          html: `
${fig(stackSvg, 'Neutron writes intent; OVN compiles it; every host programs itself.')}
<ol>
<li><b>neutron-server</b> receives “create network”, and the OVN driver writes a <b>logical switch</b> into the <b>Northbound (NB) database</b>.</li>
<li><b>ovn-northd</b> reads NB and writes <b>logical flows</b> into the <b>Southbound (SB) database</b>.</li>
<li><b>ovn-controller</b> on each host (a <i>chassis</i>) reads SB, claims the ports of local VMs (<b>port bindings</b>) and programs its local OVS.</li>
</ol>
${term('the two databases, side by side', `
$ ovn-nbctl show            # logical: switches, routers, ports, NAT
switch 3c1e… (neutron-7f21a9c4-…) (aka argo-net)
    port 5d2c7a1e-…
        addresses: ["fa:16:3e:21:7b:c4 10.10.0.11"]
router 9a0d… (neutron-2b77…) (aka argo-rtr)
    port lrp-…
        networks: ["10.10.0.1/24"]
$ ovn-sbctl show            # physical: chassis, encaps, bindings
Chassis cmp-01
    hostname: cmp-01
    Encap geneve
        ip: "10.0.1.21"
    Port_Binding "5d2c7a1e-…"`)}
${note('plain', 'Northbound is the architect’s drawing (“this network, these ports”). Southbound is the construction plan per site (“port X is on host cmp-01, reach it through tunnel 10.0.1.21”). ovn-northd is the engineer who turns drawings into plans.')}
<h3>High availability</h3>
<p>NB and SB run as <b>clustered ovsdb-servers using RAFT</b>, usually 3 members on the controllers. Like Galera or RabbitMQ quorum queues, a majority must be alive. ovn-northd runs on several controllers but only one is <b>active</b>; the others wait on standby.</p>
${lens({
  sys: 'Neutron object names appear in NB as <code>neutron-&lt;uuid&gt;</code>, with the human name as “aka”. That is how you map a ticket to OVN objects.',
  sa: 'Keep NB/SB clusters on the controllers, three members, on fast disks. They are small but latency-sensitive.',
})}`,
          sources: [['OVN architecture', 'https://www.ovn.org/support/dist-docs/ovn-architecture.7.html'], ['Neutron OVN reference architecture', `${NEU}/refarch/refarch.html`]],
        },
        {
          id: 'logical-flows', title: 'Logical flows', minutes: 10,
          html: `
<p>ovn-northd compiles every logical switch and router into a <b>pipeline</b> of stages: port security, ACLs (security groups), ARP responder, DHCP, routing, NAT and so on. Each stage is a small table of logical flows.</p>
${term('list the logical flows of one switch', `
$ ovn-sbctl lflow-list neutron-7f21a9c4-… | head
Datapath: "neutron-7f21a9c4-…" (aka "argo-net")  Pipeline: ingress
  table=0 (ls_in_check_port_sec), priority=100, match=(eth.src[40]), action=(drop;)
  table=0 (ls_in_check_port_sec), priority=50, match=(inport == "5d2c7a1e-…"), action=(reg0[15] = check_in_port_sec(); next;)
  …
  table=9 (ls_in_acl_eval), priority=2002, match=(reg0[7] == 1 && (inport == @pg_… && ip4 && tcp.dst == 22)), action=(reg8[16] = 1; next;)`)}
<p>You rarely read these directly. The stage names, though, are exactly what <b>ovn-trace</b> prints when it follows a packet, so knowing them turns a trace into a story you can follow.</p>
${lens({
  net: 'Logical flows are the same on every host; physical flows differ per host. Debug logic with logical flows first, then check the physical layer.',
})}`,
          sources: [['ovn-sbctl manual', 'https://www.ovn.org/support/dist-docs/ovn-sbctl.8.html'], ['ovn-northd manual (pipeline stages)', 'https://www.ovn.org/support/dist-docs/ovn-northd.8.html']],
        },
      ],
      quiz: [
        { q: 'Which component turns Northbound intent into Southbound logical flows?', a: ['ovn-controller', 'ovn-northd', 'neutron-server', 'ovs-vswitchd'], c: 1, e: 'ovn-northd is the compiler.' },
        { q: 'Where do you see which host (chassis) a port is bound to?', a: ['Northbound DB', 'Southbound DB', 'Keystone', 'The VM'], c: 1, e: 'Port bindings live in the Southbound database.' },
        { q: 'How are the NB and SB databases made highly available?', a: ['Galera', 'Clustered ovsdb-server with RAFT', 'NFS', 'They are not'], c: 1, e: 'RAFT clusters, usually of 3 members.' },
        { q: 'A Neutron network appears in NB as…', a: ['A logical router', 'A logical switch named neutron-<uuid>', 'A chassis', 'A port group'], c: 1, e: 'With the Neutron name shown as "aka".' },
      ],
    },
    // ------------------------------------------------------------ 4
    {
      id: 'ovn-thread', n: 4, place: 'Ariadne’s Thread', title: 'Following a Packet',
      subtitle: 'ovn-trace, ofproto/trace and captures on tap and tunnel',
      tier: 'Apprentice', relic: { name: 'Ariadne’s Thread', desc: 'No packet can hide from you.' },
      myth: 'Ariadne gave Theseus a thread to unwind as he walked, so he could always retrace his steps. ovn-trace is that thread: it walks a packet through every logical stage and tells you exactly where it goes, or where it dies.',
      goals: ['Write an ovn-trace microflow for a real port', 'Read a trace and find the stage that drops a packet', 'Know when to leave logic and check the physical path'],
      lab: 'ovn-thread',
      oracle: ['ovn-gateway', 'dhcp-silence'],
      lessons: [
        {
          id: 'ovn-trace', title: 'ovn-trace step by step', minutes: 12,
          html: `
<p>To trace a packet you describe it as a <b>microflow</b>: which port it enters, and its addresses.</p>
${term('1. gather the facts from Neutron', `
$ openstack port list --server web-01 -c ID -c "MAC Address" -c "Fixed IP Addresses"
| 5d2c7a1e-… | fa:16:3e:21:7b:c4 | ip_address='10.10.0.11' |
$ openstack port list --server db-01 -c "MAC Address" -c "Fixed IP Addresses"
| fa:16:3e:9a:00:3d | ip_address='10.10.0.20' |`)}
${term('2. trace TCP 5432 from web-01 to db-01', `
$ ovn-trace --summary neutron-7f21a9c4-… 'inport == "5d2c7a1e-…" &&
    eth.src == fa:16:3e:21:7b:c4 && eth.dst == fa:16:3e:9a:00:3d &&
    ip4.src == 10.10.0.11 && ip4.dst == 10.10.0.20 && ip.ttl == 64 &&
    tcp.dst == 5432'
# reg0[7] = 1 …
ingress(dp="argo-net", inport="5d2c7a1e-…") {
    …
    /* no ACL allowed this packet: dropped by default-deny */
    drop;
};`)}
<p>The trace ends in <code>drop</code> at the ACL stage, so a <b>security group</b> is missing a rule (db-01 does not allow 5432 from web-01). Fix it in Neutron, not in OVN:</p>
${term('3. fix at the source, then trace again', `
$ openstack security group rule create db-sg --protocol tcp --dst-port 5432 --remote-group web-sg
$ ovn-trace --summary … (same microflow)
    output("<db-01 port>");`)}
${note('oracle', 'If ovn-trace says the packet is <b>delivered</b> but it still does not arrive, the logic is fine and the problem is physical: tunnels, encap IPs, MTU, bridge mappings or the fabric. That split saves hours.')}
${lens({
  sys: 'Save a template with placeholders for inport, MACs and IPs. Filling it in takes a minute.',
  net: 'Use <code>--detailed</code> for every stage, and <code>--summary</code> for a quick verdict.',
})}`,
          sources: [['ovn-trace manual', 'https://www.ovn.org/support/dist-docs/ovn-trace.8.html'], ['Neutron OVN troubleshooting', `${NEU}/troubleshooting.html`]],
        },
        {
          id: 'physical', title: 'When logic is right but packets vanish', minutes: 10,
          html: `
${term('follow the real packet', `
# on the source host: does the VM send it?
$ ovs-tcpdump -i tap5d2c7a1e-8f -nn host 10.10.0.20
# does it leave in a tunnel, and to which IP?
$ tcpdump -ni genev_sys_6081 -c 20
# which physical flows does OVS take?
$ ovs-appctl ofproto/trace br-int in_port=tap5d2c7a1e-8f,tcp,dl_src=fa:16:3e:21:7b:c4,…
# are the tunnel endpoints right?
$ ovn-sbctl list chassis | grep -E 'hostname|ip '`)}
<table><tr><th>Finding</th><th>Meaning</th></tr>
<tr><td>Packet on tap, never on the tunnel</td><td>Physical flows or port binding problem on the source host: check ovn-controller logs</td></tr>
<tr><td>Tunnel packets to the wrong IP</td><td>Stale <code>ovn-encap-ip</code> on the destination chassis</td></tr>
<tr><td>Small packets pass, large ones do not</td><td>MTU</td></tr>
<tr><td>Nothing arrives on the destination host</td><td>Fabric: ACLs blocking UDP 6081, routing between host networks</td></tr></table>
${lens({
  net: 'Keep a record of every chassis’s encap IP and MTU, and compare it with the Southbound DB after any re-addressing.',
})}`,
          sources: [['ovs-tcpdump and ofproto/trace (OVS docs)', 'https://docs.openvswitch.org/en/latest/topics/tracing/'], ['Neutron OVN troubleshooting', `${NEU}/troubleshooting.html`]],
        },
      ],
      quiz: [
        { q: 'An ovn-trace ends with "drop" at the ACL stage. What should you fix?', a: ['The MTU', 'A Neutron security group rule', 'The tunnel', 'Keystone'], c: 1, e: 'ACLs come from security groups; change them in Neutron.' },
        { q: 'ovn-trace says the packet is delivered, but it never arrives. Where do you look?', a: ['Security groups', 'The physical path: tunnels, encap IPs, MTU, fabric', 'Glance', 'Nowhere, it arrived'], c: 1, e: 'Logic is fine; the problem is physical.' },
        { q: 'Which interface shows Geneve tunnel traffic on a host?', a: ['br-ex', 'genev_sys_6081', 'lo', 'virbr0'], c: 1, e: 'The kernel Geneve device carries tunnel packets.' },
        { q: 'Why fix security issues in Neutron rather than editing OVN ACLs?', a: ['OVN is read-only', 'Neutron owns the NB objects and would overwrite manual changes', 'ACLs are slow', 'Licensing'], c: 1, e: 'Neutron re-syncs its objects into OVN.' },
      ],
    },
    // ------------------------------------------------------------ 5
    {
      id: 'ovn-minotaur', n: 5, place: 'The Minotaur', title: 'Neutron on OVN',
      subtitle: 'How every Neutron object maps to OVN, gateways, HA and BGP',
      tier: 'Adept', relic: { name: 'Horn of the Minotaur', desc: 'You can map any Neutron object to OVN and back.' },
      myth: 'At the centre of the labyrinth waited the Minotaur: half one thing, half another. Neutron on OVN is the same creature, half OpenStack API, half OVN database. Master both halves and nothing in the maze can surprise you.',
      goals: ['Map networks, routers, ports, security groups and floating IPs to OVN objects', 'Explain gateway chassis, HA chassis groups and distributed floating IPs', 'Know how Neutron and OVN stay in sync'],
      oracle: ['ovn-gateway', 'floating-ip', 'dhcp-silence'],
      lessons: [
        {
          id: 'mapping', title: 'The mapping table', minutes: 12,
          html: `
<table><tr><th>Neutron</th><th>OVN Northbound</th><th>Notes</th></tr>
<tr><td>Network</td><td>Logical switch <code>neutron-&lt;id&gt;</code></td><td>Provider networks get a <b>localnet</b> port to reach the physical network</td></tr>
<tr><td>Port</td><td>Logical switch port (named with the port ID)</td><td>Addresses and port security come from the Neutron port</td></tr>
<tr><td>Subnet DHCP</td><td>DHCP_Options</td><td>DHCP is answered by ovn-controller on the VM’s own host: no DHCP agent</td></tr>
<tr><td>Router</td><td>Logical router <code>neutron-&lt;id&gt;</code></td><td>Distributed east–west routing on every host</td></tr>
<tr><td>Router gateway / SNAT</td><td>Gateway router port + NAT (snat)</td><td>Runs on a gateway chassis, with priorities for failover</td></tr>
<tr><td>Floating IP</td><td>NAT (dnat_and_snat)</td><td>Distributed on the VM’s host when the deployment enables distributed floating IPs</td></tr>
<tr><td>Security group</td><td>Port group <code>pg_&lt;id&gt;</code> + ACLs</td><td>Stateful, using conntrack</td></tr>
<tr><td>Metadata</td><td>localport per network + ovn-metadata-agent</td><td>A haproxy per network on each compute node</td></tr></table>
${term('from Neutron to OVN in two commands', `
$ openstack router show argo-rtr -c id -f value
2b77e0c4-…
$ ovn-nbctl lr-nat-list neutron-2b77e0c4-…
TYPE             GATEWAY_PORT          EXTERNAL_IP        LOGICAL_IP       EXTERNAL_MAC
dnat_and_snat                          203.0.113.50       10.10.0.11       fa:16:3e:5a:…
snat                                   203.0.113.9        10.10.0.0/24`)}
<h3>Gateways and high availability</h3>
<p>North–south traffic without a distributed floating IP leaves through a <b>gateway chassis</b>: a node with <code>ovn-cms-options=enable-chassis-as-gw</code> and a bridge mapping to the external network. Each router gateway port is scheduled on several gateway chassis with priorities (an <b>HA chassis group</b>); BFD between them detects failures and moves traffic in seconds.</p>
${term('where is my router’s gateway?', `
$ ovn-nbctl lrp-get-gateway-chassis lrp-<gw-port-id>
lrp-…_gw-01    3
lrp-…_gw-02    2
lrp-…_gw-03    1
$ ovn-sbctl find Port_Binding type=chassisredirect | grep -E 'logical_port|chassis'`)}
<h3>Keeping Neutron and OVN in sync</h3>
<p>Neutron is the source of truth. If the NB database and Neutron ever disagree (after a restore, a crash or manual edits), <code>neutron-ovn-db-sync-util</code> can report the differences (<i>log</i> mode) or repair them (<i>repair</i> mode).</p>
<h3>BGP</h3>
<p>For large, routed designs, floating IPs and tenant networks can be advertised with BGP (Neutron’s OVN BGP support, or the ovn-bgp-agent with FRR on the nodes), removing the need for large stretched L2 networks.</p>
${lens({
  sys: 'Pair every Neutron object with its OVN name in your notes. Most investigations start with “which logical switch/router is this?”',
  net: 'Gateway chassis need the external VLAN or network on their uplinks. Computes do not, unless you enable distributed floating IPs there.',
  sa: 'Decide early: dedicated gateway nodes (simpler edge) or all computes as gateways (distributed, more uplinks to configure).',
  pa: 'BGP-based designs scale best and match modern EVPN fabrics. Plan them with the network team from day one.',
})}`,
          sources: [['Neutron OVN reference architecture', `${NEU}/refarch/refarch.html`], ['Neutron OVN: routing and gateways', `${NEU}/routing.html`], ['Neutron: BGP with OVN', `${NEU}/bgp.html`], ['OVN BGP agent', 'https://docs.openstack.org/ovn-bgp-agent/latest/']],
        },
      ],
      quiz: [
        { q: 'A Neutron security group becomes what in OVN?', a: ['A logical router', 'A port group with ACLs', 'A chassis', 'DHCP options'], c: 1, e: 'Port groups plus stateful ACLs.' },
        { q: 'Which OVN NAT type implements a floating IP?', a: ['snat', 'dnat_and_snat', 'masquerade', 'pat'], c: 1, e: 'A floating IP is 1:1 NAT in both directions.' },
        { q: 'Which option makes a node eligible to host router gateways?', a: ['enable-chassis-as-gw in ovn-cms-options', 'ovn-encap-type=vxlan', 'is_gateway=true in Nova', 'A floating IP'], c: 0, e: 'Set in the chassis’s OVS external-ids.' },
        { q: 'Which tool reports or repairs differences between Neutron and the OVN NB DB?', a: ['ovn-trace', 'neutron-ovn-db-sync-util', 'ovs-vsctl', 'nova-manage'], c: 1, e: 'Use log mode first, then repair.' },
        { q: 'Who answers DHCP for a VM on ML2/OVN?', a: ['A DHCP agent on the network node', 'ovn-controller on the VM’s own host', 'The physical router', 'The metadata agent'], c: 1, e: 'OVN implements native, distributed DHCP.' },
      ],
    },
    // ------------------------------------------------------------ 6
    {
      id: 'ovn-icarus', n: 6, place: 'The Wings of Icarus', title: 'Flying at Scale',
      subtitle: 'RAFT clusters, upgrades, scale limits and troubleshooting',
      tier: 'Expert', relic: { name: 'Wings of Daedalus', desc: 'You operate OVN at production scale.' },
      myth: 'Daedalus warned his son: fly neither too low, where the sea wets the feathers, nor too high, where the sun melts the wax. Icarus flew too high. OVN at scale has its own sun: database size, leader elections and probe timeouts.',
      goals: ['Check and recover OVN database clusters', 'Upgrade OVN in the right order', 'Diagnose the common production failures'],
      oracle: ['ovn-raft', 'ovn-gateway', 'mtu-hang'],
      lessons: [
        {
          id: 'raft-ops', title: 'Operating the databases', minutes: 11,
          html: `
${term('cluster health', `
$ ovn-appctl -t /var/run/ovn/ovnnb_db.ctl cluster/status OVN_Northbound
Name: OVN_Northbound
Cluster ID: 8a1f (8a1f…)
Server ID: 3c2b (3c2b…)
Address: tcp:10.0.0.11:6643
Status: cluster member
Role: leader
Term: 42
Leader: self
Servers:
    3c2b (3c2b at tcp:10.0.0.11:6643) (self)
    9d10 (9d10 at tcp:10.0.0.12:6643) last msg 312 ms ago
    e47a (e47a at tcp:10.0.0.13:6643) last msg 298 ms ago
$ ovn-appctl -t /var/run/ovn/ovnsb_db.ctl cluster/status OVN_Southbound | grep -E 'Role|Leader'`)}
<ul>
<li><b>Quorum</b>: 3 members tolerate 1 failure. With only 1 of 3 alive, the database is read-only for clients and Neutron writes fail.</li>
<li><b>Backups</b>: copy the database files regularly (or use your deployment tool’s backup). Neutron can rebuild NB with <code>neutron-ovn-db-sync-util</code> in repair mode if needed.</li>
<li><b>Compaction</b>: databases compact automatically; watch their size and memory on large clouds.</li>
</ul>
<h3>Upgrades</h3>
<p>The OVN upgrade guide describes the safe order: upgrade <b>ovn-controller on the hosts first</b>, then the central components (databases and ovn-northd), so older controllers never receive logical flows they cannot understand. Deployment tools such as Kolla-Ansible follow a tested order for you; read the release notes for your versions.</p>
${lens({
  sys: 'Alert on: no NB/SB leader, a cluster member not heard from for more than a few seconds, and ovn-controller disconnected from SB on any host.',
  lead: 'Rehearse losing one database member in staging; recovery steps should be a runbook, not a web search.',
})}`,
          sources: [['OVN upgrades', `${OVN}/intro/install/ovn-upgrades.html`], ['ovsdb clustered databases', 'https://docs.openvswitch.org/en/latest/ref/ovsdb.7/'], ['OVN 26.03 release', 'https://www.ovn.org/en/releases/26.03/']],
        },
        {
          id: 'field-guide', title: 'Field guide to OVN failures', minutes: 12,
          html: `
<table><tr><th>Symptom</th><th>Likely cause</th><th>First check</th></tr>
<tr><td>New ports stay DOWN on one host</td><td>ovn-controller down or disconnected from SB (TLS, probe timeout)</td><td><code>openstack network agent list --host</code>, ovn-controller log</td></tr>
<tr><td>Neutron API slow or erroring on port create</td><td>NB cluster has no leader or is overloaded</td><td><code>cluster/status OVN_Northbound</code></td></tr>
<tr><td>VMs on one host unreachable from others</td><td>Stale <code>ovn-encap-ip</code> or tunnels blocked</td><td><code>ovn-sbctl list chassis</code>, <code>ovs-vsctl show</code></td></tr>
<tr><td>Floating IPs work, SNAT does not (or the reverse)</td><td>Gateway chassis missing bridge mapping or not enabled as gateway</td><td><code>ovs-vsctl get open . external-ids</code> on gateways</td></tr>
<tr><td>Large transfers hang</td><td>MTU</td><td><code>ping -M do -s 1414</code> from a VM</td></tr>
<tr><td>High CPU in ovn-controller after big changes</td><td>Many flows recomputed; very large security groups</td><td>ovn-controller <code>coverage/show</code>, group sizes</td></tr></table>
${term('the OVN first minute', `
$ openstack network agent list | grep -v ':-)'
$ ovn-appctl -t /var/run/ovn/ovnnb_db.ctl cluster/status OVN_Northbound | grep -E 'Role|Leader'
$ ovn-appctl -t /var/run/ovn/ovnsb_db.ctl cluster/status OVN_Southbound | grep -E 'Role|Leader'
$ ovn-sbctl list chassis | grep -E 'hostname|ip '
$ ovn-appctl -t ovn-northd status`)}
${note('oracle', 'Split the problem in two every time: control plane (databases, northd, controllers connected?) versus data plane (tunnels, MTU, bridge mappings). Then follow the thread with ovn-trace.')}
${lens({
  net: 'Very large security groups referencing other groups multiply ACL work on every host. Prefer CIDR rules for huge groups.',
  pa: 'For thousands of hosts, test scale in staging and review OVN tuning with your distribution or the OVN community.',
})}`,
          sources: [['Neutron OVN troubleshooting', `${NEU}/troubleshooting.html`], ['OVN FAQ', `${OVN}/faq/index.html`]],
        },
      ],
      quiz: [
        { q: 'How many members of a 3-member NB cluster must be alive for writes?', a: ['1', '2', '3', '0'], c: 1, e: 'A majority: 2 of 3.' },
        { q: 'In which order does the OVN upgrade guide recommend upgrading?', a: ['Central components first', 'ovn-controller on hosts first, then central components', 'All at once', 'Order does not matter'], c: 1, e: 'Controllers first, so they understand what the new northd produces.' },
        { q: 'Floating IPs work but VMs without them cannot reach the internet. Likely area?', a: ['DHCP', 'Gateway chassis for SNAT: enable-chassis-as-gw or bridge mapping', 'Keystone', 'Glance'], c: 1, e: 'SNAT leaves through a gateway chassis.' },
        { q: 'Which command shows the RAFT role of an OVN database server?', a: ['ovn-nbctl show', 'ovn-appctl -t …/ovnnb_db.ctl cluster/status OVN_Northbound', 'ovs-vsctl show', 'ovn-trace'], c: 1, e: 'cluster/status shows role, leader and members.' },
      ],
    },
  ],
};
