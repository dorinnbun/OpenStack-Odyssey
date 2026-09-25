import { term, note, lens, fig, doc, guide } from './helpers.js';

const netSvg = `<svg viewBox="0 0 760 320" role="img" aria-label="Neutron self-service topology">
  <style>.b{fill:var(--surface-2);stroke:var(--line);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.l{stroke:var(--aegean);stroke-width:2.5}.x{stroke:var(--terracotta);stroke-width:2.5}</style>
  <rect x="20" y="20" width="720" height="44" rx="1" fill="var(--terracotta)" opacity=".15" stroke="var(--terracotta)"/>
  <text x="36" y="47" class="t">External / provider network "public"  203.0.113.0/24  (physnet1, flat or VLAN)</text>
  <line x1="380" y1="64" x2="380" y2="110" class="x"/>
  <rect x="300" y="110" width="160" height="56" rx="1" fill="var(--gold)" opacity=".3" stroke="var(--gold-2)"/>
  <text x="330" y="134" class="t">router argo-rtr</text><text x="322" y="152" class="s">SNAT + floating IP DNAT</text>
  <line x1="330" y1="166" x2="190" y2="214" class="l"/><line x1="430" y1="166" x2="570" y2="214" class="l"/>
  <rect x="40" y="214" width="300" height="40" rx="1" class="b"/><text x="56" y="239" class="t">argo-net  10.10.0.0/24  (Geneve)</text>
  <rect x="420" y="214" width="300" height="40" rx="1" class="b"/><text x="436" y="239" class="t">db-net  10.20.0.0/24  (Geneve)</text>
  <line x1="120" y1="254" x2="120" y2="276" class="l"/><line x1="240" y1="254" x2="240" y2="276" class="l"/><line x1="570" y1="254" x2="570" y2="276" class="l"/>
  <rect x="70" y="276" width="100" height="32" rx="1" class="b"/><text x="86" y="297" class="t">web-01</text>
  <rect x="190" y="276" width="100" height="32" rx="1" class="b"/><text x="206" y="297" class="t">web-02</text>
  <rect x="520" y="276" width="100" height="32" rx="1" class="b"/><text x="540" y="297" class="t">db-01</text>
  <text x="60" y="196" class="s">floating IP 203.0.113.50 → 10.10.0.11</text>
</svg>`;

const haSvg = `<svg viewBox="0 0 760 300" role="img" aria-label="Highly available control plane">
  <style>.b{fill:var(--surface-2);stroke:var(--line);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.a{stroke:var(--aegean);stroke-width:2}</style>
  <rect x="250" y="16" width="260" height="46" rx="1" fill="var(--gold)" opacity=".3" stroke="var(--gold-2)"/>
  <text x="274" y="37" class="t">VIP (keepalived/VRRP)</text><text x="274" y="53" class="s">api.example.com :443 → HAProxy</text>
  <line x1="380" y1="62" x2="130" y2="100" class="a"/><line x1="380" y1="62" x2="380" y2="100" class="a"/><line x1="380" y1="62" x2="630" y2="100" class="a"/>
  <g>
  <rect x="30" y="100" width="200" height="180" rx="1" class="b"/><text x="46" y="124" class="t">controller-1</text>
  <rect x="280" y="100" width="200" height="180" rx="1" class="b"/><text x="296" y="124" class="t">controller-2</text>
  <rect x="530" y="100" width="200" height="180" rx="1" class="b"/><text x="546" y="124" class="t">controller-3</text>
  </g>
  <g class="s">
  <text x="46" y="148">HAProxy · API services</text><text x="46" y="170">MariaDB Galera node</text><text x="46" y="192">RabbitMQ (quorum queues)</text><text x="46" y="214">Memcached · OVN NB/SB RAFT</text><text x="46" y="236">Schedulers · conductors</text>
  <text x="296" y="148">HAProxy · API services</text><text x="296" y="170">MariaDB Galera node</text><text x="296" y="192">RabbitMQ (quorum queues)</text><text x="296" y="214">Memcached · OVN NB/SB RAFT</text><text x="296" y="236">Schedulers · conductors</text>
  <text x="546" y="148">HAProxy · API services</text><text x="546" y="170">MariaDB Galera node</text><text x="546" y="192">RabbitMQ (quorum queues)</text><text x="546" y="214">Memcached · OVN NB/SB RAFT</text><text x="546" y="236">Schedulers · conductors</text>
  </g>
  <text x="30" y="298" class="s">Quorum systems (Galera, RabbitMQ quorum queues, OVN RAFT) need an odd number of members: 3 tolerates 1 failure, 5 tolerates 2.</text>
</svg>`;

export const LEVELS_2 = [
  // ------------------------------------------------------------------ 6
  {
    id: 'laestrygonians',
    n: 6,
    place: 'Harbour of the Laestrygonians',
    title: 'The Narrow Harbour of Networks',
    subtitle: 'Neutron: networks, routers, floating IPs, security groups, OVN',
    tier: 'Sailor',
    relic: { icon: '⚓', name: 'Anchor of Telepylos', desc: 'You chart virtual networks.' },
    myth: 'Eleven ships entered the narrow harbour and were destroyed; only Odysseus, who moored outside and understood the terrain, escaped. Networking destroys more OpenStack projects than anything else. Understand the terrain before you sail in.',
    lab: 'chart-seas',
    oracle: ['dhcp-silence', 'floating-ip', 'mtu-hang'],
    lessons: [
      {
        id: 'neutron-objects',
        title: 'Networks, subnets, ports and routers',
        minutes: 12,
        html: `
<p>Neutron exposes a small set of objects:</p>
<ul>
<li><b>Network</b> — an isolated L2 segment. Its <i>type</i> is <code>vlan</code>, <code>flat</code>, <code>geneve</code> (OVN) or <code>vxlan</code> (OVS).</li>
<li><b>Subnet</b> — an IPv4/IPv6 range, gateway, DHCP and DNS settings on a network.</li>
<li><b>Port</b> — a virtual switch port with MAC + fixed IPs. VMs, routers, DHCP servers and load balancers all consume ports.</li>
<li><b>Router</b> — L3 between subnets and to an external network, with SNAT for outbound traffic.</li>
<li><b>Floating IP</b> — a public address from the external network mapped 1:1 (DNAT) to a port's fixed IP.</li>
<li><b>Security group</b> — stateful, per-port firewall rules (default: deny ingress, allow egress).</li>
</ul>
${fig(netSvg, 'A classic self-service topology: tenant networks behind a router with SNAT and floating IPs.')}
<h3>Provider vs self-service networks</h3>
<table><tr><th></th><th>Provider network</th><th>Self-service (tenant) network</th></tr>
<tr><td>Created by</td><td>Admins</td><td>Users</td></tr>
<tr><td>Maps to</td><td>A real VLAN/flat segment on the physical network</td><td>An overlay (Geneve/VXLAN) segment</td></tr>
<tr><td>Routing</td><td>Physical router/firewall</td><td>Neutron router (distributed in OVN)</td></tr>
<tr><td>Typical use</td><td>Enterprise VLAN integration, high-throughput, NFV</td><td>Multi-tenant clouds, dev/test</td></tr></table>
${term('build a self-service network', `
$ openstack network create argo-net
$ openstack subnet create argo-subnet --network argo-net \\
    --subnet-range 10.10.0.0/24 --dns-nameserver 9.9.9.9
$ openstack router create argo-rtr
$ openstack router set argo-rtr --external-gateway public
$ openstack router add subnet argo-rtr argo-subnet
$ openstack security group create ssh-icmp
$ openstack security group rule create ssh-icmp --protocol tcp --dst-port 22 --remote-ip 0.0.0.0/0
$ openstack security group rule create ssh-icmp --protocol icmp
$ openstack floating ip create public
$ openstack server add floating ip web-01 203.0.113.50`)}
${term('an admin creates a provider VLAN network', `
$ openstack network create prod-vlan-120 \\
    --provider-network-type vlan \\
    --provider-physical-network physnet1 \\
    --provider-segment 120 --share
$ openstack subnet create prod-vlan-120-v4 --network prod-vlan-120 \\
    --subnet-range 172.16.120.0/24 --gateway 172.16.120.1 \\
    --allocation-pool start=172.16.120.50,end=172.16.120.250`)}
${lens({
  sys: 'Always check <code>openstack port show &lt;port&gt; -c status -c binding_host_id -c binding_vif_type</code>. A port stuck DOWN or with binding_failed tells you where to look.',
  net: 'Provider networks put tenant VLANs on your trunks: agree VLAN ranges, MTU and which physnet maps to which bond/bridge before deployment.',
  pre: 'Customers with strong network teams often prefer provider VLANs + existing firewalls; cloud-native teams prefer self-service overlays. Offer both.',
  sa: 'Decide early whether floating IPs, SNAT and routers are needed or whether routed provider networks / BGP are a better fit for scale.',
  pa: 'IP address management (IPAM), DNS (Designate) and firewall integration are the three network decisions that shape the whole operating model.',
})}`,
        sources: [['Networking guide', doc('neutron', 'admin/')], ['Intro to networking', doc('neutron', 'admin/intro.html')]],
      },
      {
        id: 'ml2-ovn',
        title: 'ML2, OVN and the packet\'s journey',
        minutes: 14,
        html: `
<p>Neutron's <b>ML2</b> plugin delegates the data plane to a <i>mechanism driver</i>. The default for new deployments is <b>ML2/OVN</b> (Open Virtual Network); ML2/OVS with agents is the older architecture still found in many brownfield clouds.</p>
<table><tr><th>Component (OVN)</th><th>Where</th><th>Job</th></tr>
<tr><td>neutron-server + OVN mech driver</td><td>Controllers</td><td>Translates Neutron objects into the OVN <b>Northbound</b> DB</td></tr>
<tr><td>ovn-northd</td><td>Controllers</td><td>Compiles Northbound → <b>Southbound</b> logical flows</td></tr>
<tr><td>OVN NB/SB ovsdb-server (RAFT)</td><td>Controllers</td><td>Clustered databases</td></tr>
<tr><td>ovn-controller</td><td>Every compute/gateway</td><td>Programs local Open vSwitch with OpenFlow</td></tr>
<tr><td>ovn-metadata-agent</td><td>Every compute</td><td>Metadata proxy per network</td></tr></table>
<p>OVN implements DHCP, security groups (conntrack), L3 routing and NAT <b>natively and distributed</b> on each compute node — no separate DHCP or L3 agents. North-south traffic without floating IPs exits via <b>gateway chassis</b> (nodes with <code>enable-chassis-as-gw</code>).</p>
<h3>Encapsulation and MTU</h3>
<p>OVN uses <b>Geneve</b> tunnels (UDP 6081). With IPv4 underlay, Geneve adds up to <b>58 bytes</b> of overhead; VXLAN adds 50. If the physical MTU is 1500, tenant networks get MTU 1442 (Geneve). Set the underlay to jumbo frames (9000) and <code>global_physnet_mtu = 9000</code> to give tenants a full 1500 or more.</p>
${note('warn', 'Classic MTU symptom: SSH connects, but <code>apt update</code> or a large page hangs. Small packets work, big ones are silently dropped. See the Oracle trial "The Silent Current".')}
${term('look under the hood (admin)', `
$ openstack network agent list
+--------------------------------------+------------------------------+--------+-------+-------+
| ID                                   | Agent Type                   | Host   | Alive | State |
+--------------------------------------+------------------------------+--------+-------+-------+
| 2c3d...                              | OVN Controller Gateway agent | net-01 | :-)   | UP    |
| 7a1e...                              | OVN Controller agent         | cmp-01 | :-)   | UP    |
| 9f0b...                              | OVN Metadata agent           | cmp-01 | :-)   | UP    |
+--------------------------------------+------------------------------+--------+-------+-------+
# inside the ovn_northd / ovn_controller containers (Kolla)
$ ovn-nbctl show argo-rtr
$ ovn-sbctl show
$ ovn-trace --summary argo-net 'inport=="<port-uuid>" && eth.src==fa:16:3e:aa:bb:cc && ip4.src==10.10.0.11 && ip4.dst==9.9.9.9 && ip.ttl==64'`)}
<p><code>ovn-trace</code> simulates a packet through the logical pipeline and tells you which ACL or route drops it — the single most powerful OVN troubleshooting tool.</p>
${lens({
  sys: 'Know how to find a VM\'s tap interface on the host: <code>openstack port list --server web-01</code> → port ID → <code>tap</code> + first 11 characters of the ID.',
  net: 'Plan underlay: jumbo MTU end-to-end, Geneve UDP 6081 allowed between all chassis, ECMP/BGP to gateway nodes, and LACP bonds with consistent hashing.',
  pre: 'OVN removes most network-node bottlenecks (distributed routing, no L3 agents). That is a strong answer to performance objections.',
  sa: 'Choose gateway placement: dedicated network nodes for strict separation, or all computes as gateway chassis for scale-out.',
  pa: 'Evaluate OVN BGP (maturing in Gazpacho) for routed, L2-free designs that integrate with the data centre fabric.',
})}`,
        sources: [['OVN in Neutron', doc('neutron', 'admin/ovn/index.html')], ['MTU considerations', doc('neutron', 'admin/config-mtu.html')], ['OVN documentation (ovn.org)', 'https://docs.ovn.org/en/latest/'], ['ovn-trace manual', 'https://www.ovn.org/support/dist-docs/ovn-trace.8.html']],
      },
      {
        id: 'security-groups',
        title: 'Security groups, port security and address pairs',
        minutes: 8,
        html: `
<p>Security groups are <b>stateful</b> allow-lists applied on each port. Rules can reference CIDRs or other security groups (<code>--remote-group</code>) — e.g. "database accepts 5432 only from members of <code>web-sg</code>".</p>
${term('tiered rules', `
$ openstack security group create web-sg
$ openstack security group create db-sg
$ openstack security group rule create web-sg --protocol tcp --dst-port 443
$ openstack security group rule create db-sg --protocol tcp --dst-port 5432 --remote-group web-sg
$ openstack security group rule list db-sg --long`)}
<h3>Port security and allowed address pairs</h3>
<p>Neutron blocks traffic from IPs/MACs not assigned to a port (anti-spoofing). A VM that must answer on a <b>virtual IP</b> (keepalived, Pacemaker, a firewall appliance) needs <code>--allowed-address</code> on its port, or port security disabled (only for trusted network functions).</p>
${term('keepalived VIP on two VMs', `
$ openstack port create --network argo-net --fixed-ip ip-address=10.10.0.100 vip-port
$ openstack port set --allowed-address ip-address=10.10.0.100 <web-01-port>
$ openstack port set --allowed-address ip-address=10.10.0.100 <web-02-port>`)}
${note('prod', 'Consider Neutron <b>FWaaS v2</b> or OVN network logging for audit trails, and default-deny egress for regulated tenants. Security group logging (<code>openstack network log create</code>) helps prove compliance.')}
${lens({
  net: 'Security groups are enforced on the hypervisor, not the physical firewall. Keep perimeter policy at the edge and micro-segmentation in security groups.',
  pre: 'Micro-segmentation per VM is included in the base platform — a strong point versus paid add-ons in other stacks.',
  sa: 'Model security groups per application tier and reference groups, not IPs; it survives scaling.',
})}`,
        sources: [['Security groups', doc('neutron', 'admin/archives/adv-features.html')], ['Network logging', doc('neutron', 'admin/config-logging.html')]],
      },
    ],
    quiz: [
      { q: 'In ML2/OVN, which component programs Open vSwitch on each compute node?', a: ['ovn-northd', 'ovn-controller', 'neutron-l3-agent', 'nova-compute'], c: 1, e: 'ovn-controller reads the Southbound DB and installs OpenFlow on the local OVS.' },
      { q: 'Physical MTU 1500 with Geneve over IPv4. What is the typical tenant network MTU?', a: ['1500', '1450', '1442', '9000'], c: 2, e: 'Geneve overhead is up to 58 bytes: 1500 − 58 = 1442.' },
      { q: 'A floating IP is implemented as…', a: ['A second NIC in the VM', 'DNAT/SNAT on the router between the external address and the fixed IP', 'A DHCP reservation', 'A BGP route to the VM MAC'], c: 1, e: 'Floating IPs are 1:1 NAT on the Neutron router (distributed in OVN when possible).' },
      { q: 'A keepalived VIP does not work between two VMs. What is the likely fix?', a: ['Add allowed address pairs for the VIP on both ports', 'Disable DHCP', 'Use a bigger flavor', 'Add a floating IP to each VM'], c: 0, e: 'Anti-spoofing drops traffic for IPs not on the port unless allowed.' },
      { q: 'Which tool simulates a packet through OVN logical flows to find the drop?', a: ['tcpdump', 'ovn-trace', 'ovs-vsctl show', 'openstack port show'], c: 1, e: 'ovn-trace walks the logical pipeline and reports matching ACLs and routes.' },
      { q: 'Default security group behaviour for a new group is…', a: ['Allow all', 'Deny ingress, allow egress', 'Deny all', 'Allow ingress, deny egress'], c: 1, e: 'New groups allow egress and deny ingress (except from members of the default group in the default SG).' },
    ],
  },

  // ------------------------------------------------------------------ 7
  {
    id: 'circe',
    n: 7,
    place: 'Circe\'s Island of Aeaea',
    title: 'The Enchantress of Storage',
    subtitle: 'Cinder, Swift, Manila and Ceph',
    tier: 'Sailor',
    relic: { icon: '🏺', name: 'Amphora of Circe', desc: 'Your data persists.' },
    myth: 'Circe turned men into swine until Odysseus, protected by the herb moly, understood her magic. Storage transforms data in ways that surprise the unprepared — replication, snapshots, thin provisioning. Carry your moly: understand each backend before trusting it.',
    lab: 'amphora',
    oracle: ['volume-attaching'],
    lessons: [
      {
        id: 'storage-types',
        title: 'Ephemeral, block, object and file',
        minutes: 9,
        html: `
<table><tr><th>Type</th><th>Service</th><th>Lifetime</th><th>Access</th><th>Use for</th></tr>
<tr><td>Ephemeral</td><td>Nova</td><td>Dies with the VM</td><td>Local disk or Ceph</td><td>OS disks of cattle, scratch</td></tr>
<tr><td>Block</td><td>Cinder</td><td>Independent of VM</td><td>Attached disk (iSCSI, RBD, NVMe-oF, FC)</td><td>Databases, persistent data, boot volumes</td></tr>
<tr><td>Object</td><td>Swift (or Ceph RGW)</td><td>Independent</td><td>HTTP (Swift API, S3)</td><td>Backups, media, data lakes, artefacts</td></tr>
<tr><td>Shared file</td><td>Manila</td><td>Independent</td><td>NFS / CephFS / CIFS</td><td>Shared home dirs, legacy apps, AI datasets</td></tr></table>
${term('volumes in practice', `
$ openstack volume type list
$ openstack volume create --size 100 --type ssd-replicated pgdata
$ openstack server add volume db-01 pgdata
$ openstack volume snapshot create --volume pgdata --force pgdata-snap-2026-09-25
$ openstack volume backup create --name pgdata-bkp --incremental pgdata
# boot from volume, so the root disk survives the server:
$ openstack server create --flavor m1.medium --network argo-net \\
    --boot-from-volume 40 --image ubuntu-24.04 db-02`)}
<h3>Volume types, backends and QoS</h3>
<p>A <b>volume type</b> maps user requests to a backend (via <code>volume_backend_name</code>) and can carry QoS specs (IOPS/throughput limits), encryption and replication settings. Users choose "gold/silver/bronze"; operators decide what that means physically.</p>
${term('define a tier', `
$ openstack volume type create --property volume_backend_name=ceph-ssd ssd-replicated
$ openstack volume qos create --consumer front-end \\
    --property total_iops_sec=3000 --property total_bytes_sec=209715200 qos-gold
$ openstack volume qos associate qos-gold ssd-replicated`)}
${lens({
  sys: 'cinder-volume talks to the backend; os-brick on each compute does the actual attach. Attach problems are often on the compute side (multipath, iSCSI initiator, Ceph keyring).',
  net: 'Storage traffic deserves its own network (and often its own NICs): iSCSI/NVMe-oF or Ceph public + cluster networks with jumbo frames.',
  pre: 'Customers rarely know their IOPS. Ask for current storage metrics or plan a small benchmark phase; performance tiers are where deals are won or lost.',
  sa: 'Cinder can front existing enterprise arrays (NetApp, Pure, PowerStore, etc.). Reusing them can smooth a migration from legacy virtualisation.',
})}`,
        sources: [['Cinder admin guide', doc('cinder', 'admin/')], ['Manila', doc('manila', '')], ['Swift', doc('swift', '')]],
      },
      {
        id: 'ceph',
        title: 'Ceph: the common backend',
        minutes: 12,
        html: `
<p>Most OpenStack clouds use <b>Ceph</b> as a unified backend: RBD for Glance images, Nova ephemeral disks and Cinder volumes; RGW for S3/Swift-compatible objects; CephFS for Manila.</p>
<ul>
<li><b>MONs</b> (3 or 5) hold the cluster map (quorum). <b>MGRs</b> run the dashboard and orchestrator (cephadm).</li>
<li><b>OSDs</b> — one daemon per disk; data is placed by the <b>CRUSH</b> algorithm across failure domains (host, rack, room).</li>
<li><b>Pools</b> with replication (size=3, min_size=2 is the norm) or erasure coding (capacity-efficient, higher latency; good for RGW objects).</li>
</ul>
<h3>Capacity rule of thumb</h3>
<p>Usable ≈ raw ÷ replicas × fill target. With 3× replication and a 70–80% fill target: <b>1 PB raw ≈ 250 TB usable</b>. Ceph needs free space to heal after a host failure: size so that losing your largest failure domain does not push you over <code>nearfull</code> (85%) or <code>full</code> (95%).</p>
${term('health first', `
$ ceph -s
  cluster:
    health: HEALTH_WARN
            1 osds down
            Degraded data redundancy: 12034/361023 objects degraded (3.333%)
$ ceph osd tree
$ ceph df
$ ceph health detail
# Cinder / Nova clients need keyrings and caps
$ ceph auth get client.cinder`)}
${note('prod', 'Separate the Ceph <b>cluster network</b> (replication, recovery) from the <b>public network</b> (client I/O) on large clusters, use NVMe for DB/WAL or all-flash, and throttle recovery (<code>osd_mclock_profile</code>) so rebuilds do not starve tenants.')}
${note('warn', 'Hyper-converged (Ceph OSDs on compute nodes) saves hardware but couples failures and noisy neighbours. Reserve CPU/RAM for OSDs (<code>reserved_host_memory_mb</code>, cpu sets) if you do it.')}
${lens({
  sys: 'Learn <code>ceph -s</code>, <code>ceph health detail</code>, <code>ceph osd df tree</code> and PG states. A stuck volume is often a Ceph health issue in disguise.',
  net: 'Ceph recovery can saturate links. 25 GbE minimum per storage node is common today; 100 GbE for all-NVMe.',
  pre: 'Ceph is open source and scale-out: "add nodes, not arrays". Be honest about the operational skill it needs or include managed support.',
  sa: 'Define failure domains in CRUSH to match the real data centre (host vs rack). A rack-level domain needs at least 3 racks for size=3.',
  pa: 'Decide the storage strategy: Ceph-only, external arrays, or both. Multi-backend Cinder with volume types lets you mix.',
})}`,
        sources: [['Cinder RBD driver', doc('cinder', 'configuration/block-storage/drivers/ceph-rbd-volume-driver.html')], ['Kolla external Ceph', doc('kolla-ansible', 'reference/storage/external-ceph-guide.html')], ['Ceph documentation', 'https://docs.ceph.com/en/latest/'], ['Ceph hardware recommendations', 'https://docs.ceph.com/en/latest/start/hardware-recommendations/']],
      },
    ],
    quiz: [
      { q: 'Which storage type is destroyed when the server is deleted (by default)?', a: ['Cinder volume', 'Ephemeral root disk', 'Swift object', 'Manila share'], c: 1, e: 'Ephemeral disks share the lifecycle of the instance.' },
      { q: 'With 3× replication and an 80% fill target, roughly how much usable capacity do you get from 900 TB raw?', a: ['720 TB', '300 TB', '240 TB', '450 TB'], c: 2, e: '900 / 3 = 300 × 0.8 = 240 TB.' },
      { q: 'What maps a user-facing volume type to a physical backend?', a: ['volume_backend_name extra spec', 'The flavor', 'A security group', 'The availability zone only'], c: 0, e: 'Volume type extra specs such as volume_backend_name drive the Cinder scheduler.' },
      { q: 'Which Ceph component decides where data is placed across failure domains?', a: ['RGW', 'CRUSH', 'MDS', 'cephadm'], c: 1, e: 'CRUSH computes placement deterministically from the cluster map.' },
      { q: 'Which service gives VMs shared NFS/CephFS file systems?', a: ['Swift', 'Manila', 'Cinder', 'Glance'], c: 1, e: 'Manila is the shared file system service.' },
    ],
  },

  // ------------------------------------------------------------------ 8
  {
    id: 'underworld',
    n: 8,
    place: 'The Underworld',
    title: 'Speaking with the Shades',
    subtitle: 'Troubleshooting method: logs, request IDs and failure points',
    tier: 'Hero',
    relic: { icon: '🕯️', name: 'Lamp of Tiresias', desc: 'The logs speak to you.' },
    myth: 'Odysseus descended to the Underworld to consult the prophet Tiresias. The dead only spoke after drinking the offering. Logs are your shades: they know exactly what happened, but only answer the right question, asked in the right place.',
    lab: 'full-voyage',
    oracle: ['no-valid-host', 'dhcp-silence', 'keystone-401', 'volume-attaching'],
    lessons: [
      {
        id: 'method',
        title: 'A method, not a guess',
        minutes: 11,
        html: `
<p>Expert troubleshooters are not faster because they know more tricks; they are faster because they follow a <b>method</b>:</p>
<ol>
<li><b>Define the symptom precisely.</b> Who, what, since when, how many? "Some VMs in AZ2 cannot reach the internet since 14:05" beats "network is broken".</li>
<li><b>Locate the plane.</b> Control plane (API errors, stuck states) or data plane (traffic, disk I/O)?</li>
<li><b>Find the request ID</b> and follow it across services.</li>
<li><b>Bisect the path.</b> Split the flow in half (e.g. VM → router → gateway → fabric) and test each half.</li>
<li><b>Form one hypothesis, test it, record it.</b> Change one thing at a time.</li>
<li><b>Fix, verify, then find the root cause</b> — and write it down (post-incident review).</li>
</ol>
${note('myth', 'Tiresias did not tell Odysseus everything; he told him what mattered next. Your first question should also be the one that eliminates the most possibilities.')}
<h3>Request IDs: the golden thread</h3>
<p>Every API response carries <code>x-openstack-request-id: req-…</code>. Services pass a <i>global request ID</i> onward, so a single <code>server create</code> can be traced from nova-api to the scheduler, conductor, compute, Neutron and Cinder logs.</p>
${term('follow the thread (Kolla log layout)', `
$ openstack --debug server create ... 2>&1 | grep -o 'req-[0-9a-f-]\\{36\\}' | head -1
req-6b1c1f3a-8f3e-4c2d-9c1b-1b2f0c0d6e7a
$ sudo grep -r req-6b1c1f3a /var/log/kolla/nova/ | cut -c1-220
# or, with central logging (OpenSearch):  global_request_id:"req-6b1c1f3a*"
$ openstack server event list web-01
$ openstack server event show web-01 req-6b1c1f3a-8f3e-4c2d-9c1b-1b2f0c0d6e7a`)}
<p><code>openstack server event list</code> shows every action on an instance (create, stop, migrate) with its request ID and result — a fast first stop.</p>
${lens({
  sys: 'Build a personal cheat-sheet: symptom → service → log file → grep pattern. The Codex page has a starter.',
  net: 'For data-plane issues, capture on both sides of each hop: inside the VM, on the tap interface, on the tunnel interface, and on the gateway.',
  pre: 'When a prospect asks about supportability, describe this method and the tooling (central logs, request tracing). It signals operational maturity.',
  lead: 'Mandate blameless post-incident reviews with timeline, root cause, detection gap and action items. Track the actions to completion.',
})}`,
        sources: [['Nova troubleshooting', doc('nova', 'admin/support-compute.html')], ['Kolla central logging', doc('kolla-ansible', 'reference/logging-and-monitoring/central-logging-guide.html')]],
      },
      {
        id: 'failure-map',
        title: 'The map of where things break',
        minutes: 14,
        html: `
<table><tr><th>Symptom</th><th>Likely area</th><th>First commands</th></tr>
<tr><td>HTTP 401 everywhere</td><td>Keystone tokens, Fernet keys, clock skew</td><td><code>openstack token issue</code>, compare key repos, <code>chronyc tracking</code></td></tr>
<tr><td>HTTP 503/504 from APIs</td><td>HAProxy backends down, DB/RabbitMQ saturation</td><td>HAProxy stats, <code>docker ps</code>, service logs</td></tr>
<tr><td>Server stuck BUILD/scheduling</td><td>RabbitMQ, scheduler, conductor</td><td><code>openstack compute service list</code>, rabbitmq queues</td></tr>
<tr><td>ERROR: No valid host</td><td>Placement capacity, filters, disabled services</td><td><code>allocation candidate list</code>, scheduler.log</td></tr>
<tr><td>BUILD/spawning then ERROR after ~5 min</td><td>VIF plug event missing (Neutron/OVN)</td><td>nova-compute.log "Timeout waiting for vif plugging", port status</td></tr>
<tr><td>ACTIVE but no IP</td><td>DHCP (OVN native or DHCP agent), port binding</td><td>console log, port status, ovn-controller</td></tr>
<tr><td>IP but no SSH</td><td>Security group, metadata (keys), floating IP/router, MTU</td><td>SG rules, console log, ping from router namespace</td></tr>
<tr><td>Volume stuck attaching/detaching</td><td>cinder-volume, os-brick on compute, Ceph/iSCSI</td><td>cinder logs, nova-compute log, <code>ceph -s</code></td></tr>
<tr><td>Services flap up/down</td><td>RabbitMQ partitions, time sync, heartbeats</td><td><code>rabbitmqctl cluster_status</code>, <code>chronyc</code></td></tr>
<tr><td>Live migration fails</td><td>CPU model mismatch, libvirt connectivity, ports</td><td>nova-compute logs on both hosts, <code>virsh</code></td></tr></table>
${term('the operator\'s first minute', `
$ openstack compute service list --long | grep -v " up "
$ openstack network agent list | grep -v ":-)"
$ openstack volume service list
$ sudo docker ps --filter "health=unhealthy"
$ sudo docker exec rabbitmq rabbitmqctl cluster_status
$ sudo docker exec mariadb mysql -uroot -p -e "SHOW STATUS LIKE 'wsrep_cluster_size'"
$ ceph -s`)}
<h3>Safely fixing stuck states</h3>
<p>Sometimes you must reset a resource's state after fixing the underlying cause:</p>
${term('state surgery (only after root cause is fixed)', `
$ openstack server set --state active web-01          # admin-only
$ openstack server reboot --hard web-01
$ openstack volume set --state available pgdata       # verify on backend first!
$ cinder attachment-list --all-tenants | grep <volume-id>
$ cinder attachment-delete <attachment-id>`)}
${note('warn', 'Resetting state without checking the backend can corrupt data: a volume marked "available" might still be mapped to a hypervisor. Verify with the storage backend (e.g. <code>rbd status</code> / watchers) before changing states.')}
${lens({
  sys: 'Practise every row of this table in your lab. Break it deliberately, then fix it.',
  net: 'Keep a packet-capture recipe for OVN: <code>ovs-tcpdump -i tap…</code> on the host and <code>tcpdump -i genev_sys_6081</code> for tunnel traffic.',
  lead: 'Turn this table into runbooks with owners. New on-call engineers should be able to follow them at 3 a.m.',
})}`,
        sources: [['Admin guide', guide('admin/')], ['Cinder troubleshooting', doc('cinder', 'admin/ts-cinder-config.html')]],
      },
    ],
    quiz: [
      { q: 'Which command lists every action performed on an instance with request IDs?', a: ['openstack server event list', 'openstack server history', 'nova-manage log', 'openstack audit list'], c: 0, e: 'Instance actions/events are recorded with request IDs and results.' },
      { q: 'A VM sits in BUILD/spawning for ~5 minutes then goes to ERROR. The compute log says "Timeout waiting for vif plugging". Where do you look next?', a: ['Glance', 'Neutron/OVN: port binding and the agent/controller on that host', 'Keystone', 'Placement'], c: 1, e: 'Nova waits for network-vif-plugged from Neutron.' },
      { q: 'What should you verify before resetting a volume to "available"?', a: ['Nothing, it is safe', 'That the backend no longer maps it to any host', 'That Horizon shows it', 'That the user agrees'], c: 1, e: 'Otherwise two hosts may write to the same disk.' },
      { q: 'Best first step for a vague "the cloud is slow" report?', a: ['Restart all services', 'Define the symptom precisely: which API/workload, since when, how many users', 'Add more controllers', 'Upgrade OpenStack'], c: 1, e: 'Precise symptoms drive the whole method.' },
      { q: 'Sudden widespread 401s across all APIs after rebuilding one controller. Likely cause?', a: ['Placement is full', 'Fernet keys on the rebuilt node differ from the others', 'MTU mismatch', 'Glance store is down'], c: 1, e: 'A node with different keys cannot validate tokens issued elsewhere.' },
    ],
  },

  // ------------------------------------------------------------------ 9
  {
    id: 'sirens',
    n: 9,
    place: 'The Sirens\' Rocks',
    title: 'Songs You Must Hear',
    subtitle: 'Observability: metrics, logs, alerts and capacity',
    tier: 'Hero',
    relic: { icon: '🎶', name: 'Siren\'s Lyre', desc: 'You hear the signals without being wrecked.' },
    myth: 'Odysseus wanted to hear the Sirens without wrecking the ship: he had himself tied to the mast while the crew plugged their ears. Good observability is the same design — you hear everything, but only the right signals are allowed to steer the ship (page a human).',
    oracle: ['rabbit-partition'],
    lessons: [
      {
        id: 'observability-stack',
        title: 'Metrics, logs and traces for a cloud',
        minutes: 12,
        html: `
<p>A production cloud needs three signal types:</p>
<table><tr><th>Signal</th><th>Typical tooling</th><th>Questions it answers</th></tr>
<tr><td>Metrics</td><td>Prometheus + exporters (node, libvirt, openstack-exporter, mysqld, rabbitmq, ceph mgr, ovn), Grafana</td><td>Is it healthy? Is it saturated? What is the trend?</td></tr>
<tr><td>Logs</td><td>Fluentd/Fluent Bit → OpenSearch (Kolla central logging) or Loki</td><td>What exactly happened for request X?</td></tr>
<tr><td>Tenant telemetry</td><td>Ceilometer → Gnocchi (or Prometheus), Aodh for alarms</td><td>Per-instance usage, billing, autoscaling triggers</td></tr></table>
<h3>What to alert on (page a human)</h3>
<ul>
<li><b>API availability & latency</b> — synthetic probes: token issue, list servers, create/delete a tiny VM every few minutes (Rally/Tempest smoke or a custom canary).</li>
<li><b>Quorum health</b> — Galera cluster size &lt; 3, RabbitMQ partitions/alarms, OVN RAFT leader missing, Ceph MON quorum.</li>
<li><b>Data-plane capacity</b> — Ceph nearfull, Placement free capacity per aggregate, floating IP pool exhaustion.</li>
<li><b>Agent liveness</b> — nova-compute or OVN controller down on N hosts.</li>
</ul>
<h3>What only to record (dashboards, tickets)</h3>
<p>Single API 500s, one slow request, CPU spikes on one hypervisor. The Siren's trap is alerting on everything; alert fatigue makes engineers ignore the one alarm that matters.</p>
${term('canary with the CLI (run from a cron / CI job)', `
$ openstack server create --flavor m1.tiny --image cirros --network canary-net \\
    --wait canary-$(date +%s) -f value -c id
$ openstack server delete --wait canary-...
# export duration + result as a Prometheus metric via the node exporter textfile collector`)}
${lens({
  sys: 'Enable Kolla\'s <code>enable_prometheus</code> and <code>enable_central_logging</code> from day one; retrofitting is painful.',
  net: 'Export OVS/OVN and switch metrics (drops, errors, tunnel counts). Many "cloud" incidents are fabric incidents.',
  pre: 'Show a Grafana dashboard in demos. Operators buy confidence, and confidence is visible.',
  sa: 'Define SLOs per service (e.g. 99.9% API success, p95 VM boot &lt; 90 s) and design capacity + alerting around them.',
  pa: 'Decide what the platform owes tenants (SLOs, maintenance windows) and publish it. It shapes redundancy spending.',
  lead: 'Review alerts monthly: delete ones nobody acted on, and add ones that would have caught the last incident earlier.',
})}`,
        sources: [['Kolla monitoring', doc('kolla-ansible', 'reference/logging-and-monitoring/prometheus-guide.html')], ['Ceilometer', doc('ceilometer', '')], ['Google SRE book: Monitoring distributed systems', 'https://sre.google/sre-book/monitoring-distributed-systems/']],
      },
      {
        id: 'capacity',
        title: 'Capacity management and the foresight of Tiresias',
        minutes: 9,
        html: `
<p>Capacity problems appear as "No valid host", slow disks or exhausted IP pools. Track these weekly:</p>
<ul>
<li><b>Placement</b>: used vs capacity per resource class and per aggregate/AZ (not just cloud-wide averages).</li>
<li><b>Largest free slot</b>: can you still place your biggest flavor? Fragmentation hides here.</li>
<li><b>Ceph</b>: % used, growth rate, and headroom to survive a host or rack loss.</li>
<li><b>Network</b>: floating IPs left, subnet exhaustion, gateway throughput.</li>
<li><b>Quotas</b> vs actual usage per project (over-allocated quotas are promises you may not keep).</li>
</ul>
${term('placement usage per host (admin)', `
$ for rp in $(openstack resource provider list -f value -c uuid); do
>   openstack resource provider usage show $rp -f value | paste -sd' '; done
$ openstack hypervisor list --long -c "Hypervisor Hostname" -c "vCPUs Used" -c "vCPUs" -c "Memory MB Used" -c "Memory MB"
$ openstack floating ip list --status DOWN -f value | wc -l`)}
${note('prod', 'Rule of thumb: order hardware when a pool reaches ~70% of its N+1 capacity. Lead time for servers can be 8–16 weeks.')}
${lens({
  pre: 'Build growth into proposals explicitly (e.g. 30% year-one growth) and show the expansion path: add compute nodes, add OSD nodes.',
  sa: 'Size per pool (general, GPU, pinned). A cloud-wide 50% free can still refuse every GPU request.',
  lead: 'Own a capacity review in the monthly ops meeting with a named owner and a procurement trigger.',
})}`,
        sources: [['Placement', doc('placement', '')]],
      },
    ],
    quiz: [
      { q: 'Which of these should page an on-call engineer?', a: ['A single API 500', 'Galera cluster size dropped from 3 to 2', 'One hypervisor at 90% CPU briefly', 'A user deleted a VM'], c: 1, e: 'Loss of quorum redundancy is urgent; one more failure means outage.' },
      { q: 'What is the most reliable way to know "can users actually create VMs right now"?', a: ['Check CPU usage', 'Run a synthetic canary that creates and deletes a VM', 'Ask users', 'Check Horizon loads'], c: 1, e: 'End-to-end synthetic checks measure user experience.' },
      { q: 'Cloud-wide capacity shows 50% free, yet GPU requests fail with No valid host. Why?', a: ['Placement bug', 'Capacity must be tracked per pool/aggregate; the GPU pool is full', 'Keystone quota', 'Glance'], c: 1, e: 'Averages hide per-pool exhaustion.' },
      { q: 'Which service collects per-instance tenant telemetry for billing?', a: ['Ceilometer', 'Horizon', 'Keystone', 'Octavia'], c: 0, e: 'Ceilometer polls and receives notifications, storing to Gnocchi or Prometheus.' },
    ],
  },

  // ------------------------------------------------------------------ 10
  {
    id: 'scylla',
    n: 10,
    place: 'Between Scylla and Charybdis',
    title: 'The Strait of Trade-offs',
    subtitle: 'High availability, quorum and failure domains',
    tier: 'Hero',
    relic: { icon: '🌀', name: 'Whirlpool Compass', desc: 'You navigate trade-offs.' },
    myth: 'Between the six-headed Scylla and the whirlpool Charybdis there was no perfect route — only a chosen cost. High availability is the same: consistency or availability, cost or resilience, simplicity or scale. The expert names the trade-off out loud.',
    oracle: ['rabbit-partition', 'keystone-401'],
    lessons: [
      {
        id: 'control-plane-ha',
        title: 'A highly available control plane',
        minutes: 13,
        html: `
${fig(haSvg, 'The common three-controller pattern.')}
<ul>
<li><b>VIP + HAProxy</b>: keepalived moves a virtual IP between controllers; HAProxy balances API calls to healthy backends.</li>
<li><b>MariaDB Galera</b>: synchronous multi-primary replication. OpenStack deployers usually send writes to a single node via HAProxy (active/backup) to avoid deadlocks from certification conflicts.</li>
<li><b>RabbitMQ</b>: clustered. Modern deployments use <b>quorum queues</b> (Raft-based) instead of classic mirrored queues, which are deprecated and removed in RabbitMQ 4.x. Kolla-Ansible made quorum queues the default for new deployments.</li>
<li><b>Memcached</b>: token/cache backend; not replicated — each service lists all memcached servers.</li>
<li><b>OVN NB/SB</b>: clustered ovsdb-server with RAFT.</li>
<li><b>Stateless APIs and workers</b>: run everywhere; scale horizontally.</li>
</ul>
<h3>Quorum math</h3>
<table><tr><th>Members</th><th>Failures tolerated</th><th>Notes</th></tr>
<tr><td>1</td><td>0</td><td>Lab only</td></tr>
<tr><td>2</td><td>0</td><td>Worse than 1: a split brain without quorum</td></tr>
<tr><td>3</td><td>1</td><td>Standard</td></tr>
<tr><td>5</td><td>2</td><td>Large or critical regions; more replication latency</td></tr></table>
${note('warn', 'Never stretch a Galera/RabbitMQ/RAFT cluster across two sites only. A link failure leaves each side without a majority. Use three sites (a small witness in the third) or independent regions.')}
<h3>Data-plane HA</h3>
<ul>
<li><b>Instance HA</b>: Masakari detects failed hosts/processes and evacuates instances (requires shared storage like Ceph for fast recovery).</li>
<li><b>Network HA</b>: OVN gateway chassis priorities; with ML2/OVS, L3 HA (VRRP) routers or DVR.</li>
<li><b>Application HA</b>: the cloud-native answer — anti-affinity server groups across AZs plus load balancers (Octavia).</li>
</ul>
${term('anti-affinity for an app tier', `
$ openstack server group create --policy anti-affinity web-ag
$ openstack server create --hint group=<web-ag-id> --flavor m1.medium ... web-01`)}
${lens({
  sys: 'Test failover quarterly: power off one controller in staging and time the recovery. Measure; do not assume.',
  net: 'keepalived VRRP needs multicast or unicast peers allowed on the API network; check for VRID collisions with other teams\' VRRP.',
  pre: 'Be precise: OpenStack control-plane HA protects the ability to manage; application HA still needs anti-affinity and load balancing.',
  sa: 'Map failure domains: host, rack, power feed, AZ, region. For each, state what survives and the RTO.',
  pa: 'Regions are the true blast-radius boundary. For critical estates, prefer two smaller independent regions over one giant stretched one.',
  lead: 'Run game days: simulate a RabbitMQ node loss or a Galera split during business hours with the whole team watching.',
})}`,
        sources: [['HA guide', guide('ha-guide/')], ['Kolla RabbitMQ', doc('kolla-ansible', 'reference/message-queues/rabbitmq.html')], ['Masakari', doc('masakari', '')], ['RabbitMQ quorum queues', 'https://www.rabbitmq.com/docs/quorum-queues'], ['Galera cluster docs', 'https://galeracluster.com/library/documentation/']],
      },
      {
        id: 'regions-azs',
        title: 'Regions, availability zones and cells',
        minutes: 9,
        html: `
<table><tr><th>Construct</th><th>Visible to users?</th><th>Purpose</th><th>Shares</th></tr>
<tr><td>Region</td><td>Yes</td><td>Geography / independent control plane</td><td>Often only Keystone (and Horizon)</td></tr>
<tr><td>Availability zone</td><td>Yes</td><td>Failure domain (power, rack row, room)</td><td>Whole control plane</td></tr>
<tr><td>Host aggregate</td><td>No</td><td>Grouping hosts by capability/licensing</td><td>Everything</td></tr>
<tr><td>Cell</td><td>No</td><td>Scale / message-bus blast radius</td><td>API, Placement, Keystone</td></tr></table>
<p>AZs exist separately in Nova, Cinder and Neutron. Keep names aligned (<code>az1</code> everywhere) and set <code>cross_az_attach = False</code> in Nova if volumes must stay in the same AZ as instances.</p>
${term('availability zones', `
$ openstack availability zone list --long
$ openstack aggregate create --zone az2 rack-b
$ openstack server create --availability-zone az2 ...
$ openstack volume create --availability-zone az2 --size 50 data-az2`)}
${lens({
  sa: 'Three AZs in one region is the sweet spot for most enterprises: quorum-safe control plane plus user-visible failure domains.',
  pa: 'Define when you add a region vs a cell vs an AZ, and write it into your architecture principles.',
  pre: 'Mirror public-cloud vocabulary (regions/AZs) so application teams can reuse their patterns.',
})}`,
        sources: [['Availability zones', doc('nova', 'admin/availability-zones.html')]],
      },
    ],
    quiz: [
      { q: 'How many failures does a 3-member quorum cluster tolerate?', a: ['0', '1', '2', '3'], c: 1, e: 'A majority (2 of 3) must remain.' },
      { q: 'Why is a two-site stretched Galera cluster risky?', a: ['It is too fast', 'A link failure leaves neither side with a majority', 'Galera does not support two sites', 'It needs more RAM'], c: 1, e: 'Quorum needs a third site or witness.' },
      { q: 'Which RabbitMQ queue type is recommended for modern OpenStack deployments?', a: ['Classic mirrored queues', 'Quorum queues', 'Transient non-durable queues only', 'Lazy queues'], c: 1, e: 'Mirrored classic queues are deprecated/removed in RabbitMQ 4.' },
      { q: 'Which construct is invisible to users and used to scale Nova\'s message bus/database?', a: ['Region', 'Availability zone', 'Cell', 'Project'], c: 2, e: 'Cells shard Nova\'s database and queue.' },
      { q: 'Which OpenStack project evacuates instances automatically when a hypervisor fails?', a: ['Masakari', 'Watcher', 'Blazar', 'Zun'], c: 0, e: 'Masakari provides instance HA.' },
    ],
  },
];
