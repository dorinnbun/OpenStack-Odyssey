import { term, note, lens, doc, guide } from './helpers.js';

export const LEVELS_3 = [
  // ------------------------------------------------------------------ 11
  {
    id: 'helios',
    n: 11,
    place: 'Thrinacia, Isle of Helios',
    title: 'The Sacred Cattle',
    subtitle: 'Security, hardening, secrets and compliance',
    tier: 'Demigod',
    relic: { icon: '☀️', name: 'Sun Disk of Helios', desc: 'You guard what is sacred.' },
    myth: 'The crew was warned never to touch the cattle of Helios. Starving, they did anyway, and every one of them was lost. In a cloud the sacred cattle are credentials, keys and the admin role. One careless shortcut can sink everything.',
    oracle: ['keystone-401'],
    lessons: [
      {
        id: 'hardening',
        title: 'Hardening the platform',
        minutes: 13,
        html: `
<p>Security for OpenStack happens in layers. Security domains from the OpenStack Security Guide are a useful map:</p>
<table><tr><th>Domain</th><th>Examples</th><th>Key controls</th></tr>
<tr><td>Public</td><td>Internet, customer networks</td><td>TLS on the VIP, WAF/rate limiting, only public endpoints exposed</td></tr>
<tr><td>Guest</td><td>Tenant VM traffic</td><td>Security groups, port security, overlay isolation, no route to management</td></tr>
<tr><td>Management</td><td>APIs internal, DB, RabbitMQ, IPMI/BMC</td><td>Separate VLANs, firewalling, TLS internally, bastion access only</td></tr>
<tr><td>Data</td><td>Storage replication, Ceph</td><td>Isolated networks, CephX auth, encryption at rest</td></tr></table>
<h3>Checklist</h3>
<ul>
<li><b>TLS everywhere</b>: external VIP certificates and internal TLS (Kolla <code>kolla_enable_tls_internal</code>), RabbitMQ TLS, DB TLS.</li>
<li><b>Secure RBAC</b>: enable new defaults and scope enforcement per service (<code>[oslo_policy] enforce_new_defaults = True</code>, <code>enforce_scope = True</code>) after testing your tooling.</li>
<li><b>Secrets</b>: passwords in Ansible Vault or an external secrets manager; rotate service passwords; never in Git plaintext.</li>
<li><b>Hypervisor</b>: SELinux/AppArmor for libvirt (sVirt), patched kernels & microcode for CPU side-channels, disable unused QEMU devices.</li>
<li><b>BMC/IPMI</b>: on an isolated network; default passwords changed; Redfish over TLS for Ironic.</li>
<li><b>Images</b>: signed images, vulnerability-scanned golden images, and a patch cadence.</li>
<li><b>Audit</b>: CADF audit middleware (Keystone, Nova…) shipped to your SIEM.</li>
</ul>
${term('check for exposed services from outside', `
$ nmap -Pn -p 1-65535 api.example.com
# expect only 443 (and 6080/6082 if consoles are public). Never 3306, 5672, 11211, 6641/6642.
$ openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null | openssl x509 -noout -dates`)}
${note('warn', 'Memcached (11211) and RabbitMQ (5672/15672) exposed on the wrong interface are classic findings in penetration tests. Bind them to the internal network only.')}
${lens({
  sys: 'Run periodic config audits (e.g. OpenSCAP, Ansible checks) against the Security Guide checklists.',
  net: 'Enforce the security domains in the fabric: ACLs so tenant overlays can never reach management and BMC VLANs.',
  pre: 'Map controls to the customer\'s framework (ISO 27001, SOC 2, PCI DSS, local regulators). Security answers often decide sovereign-cloud deals.',
  sa: 'Include a security architecture section in every design: domains, TLS points, identity federation, key management, logging to SIEM.',
  pa: 'Threat-model the platform once a year; include supply chain (container images, packages) and insider risk from operators.',
  lead: 'Make security reviews part of the change process, not a yearly event. Track findings like bugs.',
})}`,
        sources: [['OpenStack Security Guide', `https://docs.openstack.org/security-guide/`], ['Kolla TLS', doc('kolla-ansible', 'admin/tls.html')], ['oslo.policy', doc('oslo.policy', '')], ['CIS Benchmarks (host OS hardening)', 'https://www.cisecurity.org/cis-benchmarks']],
      },
      {
        id: 'barbican-encryption',
        title: 'Barbican, encryption and key management',
        minutes: 9,
        html: `
<p><b>Barbican</b> stores secrets, keys and certificates, backed by an HSM (PKCS#11), KMIP or a simple crypto plugin. It enables:</p>
<ul>
<li><b>Encrypted Cinder volumes</b> (LUKS): keys are generated in Barbican and fetched by Nova at attach time.</li>
<li><b>Octavia TLS termination</b>: certificates stored as Barbican secret containers.</li>
<li><b>Image signing verification</b> in Nova/Glance.</li>
</ul>
${term('encrypted volume type', `
$ openstack volume type create --encryption-provider luks \\
    --encryption-cipher aes-xts-plain64 --encryption-key-size 256 \\
    --encryption-control-location front-end LUKS
$ openstack volume create --size 20 --type LUKS secret-data
$ openstack secret list`)}
${note('prod', 'For regulated customers, the key question is "who holds the master key?". An HSM in the customer\'s control (or an external KMS via KMIP) is often required.')}
${lens({
  sys: 'Back up Barbican\'s database and the master key (KEK). Losing it means losing every encrypted volume.',
  pre: 'Encryption at rest with customer-controlled keys is a standard RFP item. Barbican + HSM answers it.',
  sa: 'Decide between backend encryption (Ceph dm-crypt on OSDs) and per-volume LUKS: the first protects disks, the second isolates tenants.',
})}`,
        sources: [['Barbican', doc('barbican', '')], ['Volume encryption', doc('cinder', 'configuration/block-storage/volume-encryption.html')]],
      },
    ],
    quiz: [
      { q: 'Which of these ports should never be reachable from the public network?', a: ['443', '5672 (RabbitMQ)', 'Both', 'Neither'], c: 1, e: 'Message bus, DB and cache ports belong only on internal networks.' },
      { q: 'Which service stores the keys for encrypted Cinder volumes?', a: ['Keystone', 'Barbican', 'Glance', 'Designate'], c: 1, e: 'Barbican (Key Manager) holds the LUKS keys.' },
      { q: 'What does enforce_scope=True do in oslo.policy?', a: ['Encrypts tokens', 'Rejects tokens whose scope (system/domain/project) does not match the policy', 'Enables TLS', 'Enables quotas'], c: 1, e: 'Scope checking is part of secure RBAC.' },
      { q: 'Losing Barbican\'s master key (KEK) means…', a: ['Nothing', 'Encrypted volumes can no longer be decrypted', 'Keystone stops', 'Only Horizon breaks'], c: 1, e: 'All wrapped keys depend on the KEK — back it up.' },
    ],
  },

  // ------------------------------------------------------------------ 12
  {
    id: 'calypso',
    n: 12,
    place: 'Ogygia, Island of Calypso',
    title: 'Seven Years of Day Two',
    subtitle: 'Deployment tools, upgrades and lifecycle operations',
    tier: 'Demigod',
    relic: { icon: '🪵', name: 'Raft of Ogygia', desc: 'You can build, upgrade and sail on.' },
    myth: 'Odysseus spent seven years on Calypso\'s island — comfortable, but stuck. Many clouds end up there: deployed once, never upgraded, slowly rotting. To leave, Odysseus built a raft with his own hands. Your raft is repeatable automation.',
    lessons: [
      {
        id: 'deploy-tools',
        title: 'Choosing a deployment tool',
        minutes: 12,
        html: `
<table><tr><th>Tool</th><th>Approach</th><th>Strengths</th><th>Consider</th></tr>
<tr><td><b>Kolla-Ansible</b></td><td>Ansible deploys Kolla container images (Docker or Podman)</td><td>Most popular upstream path, simple, fast upgrades, good docs</td><td>You own OS + hardware lifecycle</td></tr>
<tr><td><b>Kayobe</b></td><td>Kolla-Ansible + bare-metal provisioning (Bifrost) + host config</td><td>Full lifecycle from bare metal; popular in research/HPC</td><td>More moving parts</td></tr>
<tr><td><b>OpenStack-Ansible</b></td><td>Ansible, services in LXC containers or on hosts, from source</td><td>Very flexible, mature, strong upgrade playbooks</td><td>Steeper learning curve</td></tr>
<tr><td><b>OpenStack-Helm</b></td><td>Helm charts on Kubernetes</td><td>Kubernetes-native operations, GitOps friendly</td><td>Requires deep Kubernetes skills</td></tr>
<tr><td><b>Canonical Sunbeam / Charms</b></td><td>Juju + snaps/K8s operators</td><td>Vendor support, quick start</td><td>Ubuntu-centric, vendor tooling</td></tr>
<tr><td><b>Vendor distributions</b></td><td>e.g. Red Hat (RHOSO on OpenShift), Mirantis, others</td><td>Commercial support, certification</td><td>Release lag, subscription cost</td></tr></table>
${term('kolla-ansible day-2 commands', `
$ kolla-ansible reconfigure -i multinode --tags nova     # apply config changes
$ kolla-ansible deploy -i multinode --limit cmp-17         # add a new compute
$ kolla-ansible pull -i multinode                          # pre-pull images
$ kolla-ansible upgrade -i multinode                       # rolling upgrade
$ kolla-ansible mariadb_backup -i multinode                # Mariabackup
$ kolla-ansible mariadb_recovery -i multinode              # full cluster recovery`)}
<p>Keep <b>everything in Git</b>: <code>globals.yml</code>, inventory, <code>/etc/kolla/config/</code> overrides and encrypted passwords. Deploy from CI or a controlled deployment host, never from a laptop.</p>
${lens({
  sys: 'Master one tool deeply. Mixing tools on one cloud creates drift nobody can reason about.',
  pre: 'Map the tool to the customer\'s skills: Kubernetes-heavy teams like Helm-based options; Linux/Ansible teams like Kolla-Ansible or OSA.',
  sa: 'Document the "golden" configuration and every override with a reason. It is the cloud\'s design record.',
  pa: 'The deployment tool is a long-term commitment. Evaluate upgrade history, community size and vendor support options.',
  lead: 'Treat the deploy repo like application code: pull requests, reviews, CI linting, and staged rollout.',
})}`,
        sources: [['Deployment guides', guide('deploy/')], ['Kolla-Ansible', doc('kolla-ansible', '')], ['OpenStack-Ansible', doc('openstack-ansible', '')], ['Kayobe', doc('kayobe', '')], ['OpenStack-Helm', 'https://docs.openstack.org/openstack-helm/latest/']],
      },
      {
        id: 'upgrades',
        title: 'Upgrades without shipwreck',
        minutes: 12,
        html: `
<h3>The upgrade playbook</h3>
<ol>
<li><b>Read</b> release notes for every service (upgrade notes, deprecations, removed config options). Check the deployment tool's upgrade notes.</li>
<li><b>Pre-checks</b>: all services up, no stuck instances, DB backups, Ceph <code>HEALTH_OK</code>, disk space on controllers.</li>
<li><b>Nova pre-upgrade checks</b>: <code>nova-status upgrade check</code>; Placement and Cinder have similar <code>*-status</code> commands.</li>
<li><b>Staging rehearsal</b> with production-like data (DB copy) — time each step.</li>
<li><b>Control plane first</b> (DB migrations, APIs), then <b>computes rolling</b> — Nova supports N-1 compute versions against a newer control plane (and SLURP N-2 for skip-level).</li>
<li><b>Post-checks</b>: Tempest/Rally smoke, canary VMs, dashboards.</li>
<li><b>Clean-up</b>: online data migrations (<code>nova-manage db online_data_migrations</code>), remove service version pins.</li>
</ol>
${term('health gates', `
$ docker exec nova_api nova-status upgrade check
+-------------------------------------------+
| Upgrade Check Results                     |
+-------------------------------------------+
| Check: Cells v2                           |
| Result: Success                           |
| Check: Placement API                      |
| Result: Success                           |
| Check: Older than N-1 computes            |
| Result: Success                           |
+-------------------------------------------+
$ docker exec nova_api nova-manage db online_data_migrations`)}
${note('prod', 'Host OS upgrades (e.g. to a new Ubuntu LTS / EL major) are separate projects. Do them per host with live migration, never at the same time as an OpenStack upgrade.')}
<h3>Other day-2 duties</h3>
<ul>
<li><b>Hypervisor maintenance</b>: <code>openstack compute service set --disable --disable-reason "maint" cmp-05 nova-compute</code>, then live-migrate everything off (Gazpacho\'s parallel live migration connections shorten this).</li>
<li><b>Database hygiene</b>: <code>nova-manage db archive_deleted_rows --until-complete</code> and purge shadow tables.</li>
<li><b>Certificate renewal</b>, password rotation, OS patching cadence.</li>
</ul>
${term('drain a hypervisor', `
$ openstack compute service set --disable --disable-reason "kernel patch" cmp-05 nova-compute
$ for s in $(openstack server list --all-projects --host cmp-05 -f value -c ID); do
>   openstack server migrate --live-migration $s; done
$ openstack server list --all-projects --host cmp-05`)}
${lens({
  sys: 'Keep a per-release upgrade log: step, duration, surprises. Next year it becomes your runbook.',
  pre: 'Customers fear upgrades most. Show the SLURP cadence and a sample upgrade runbook to de-risk the decision.',
  pa: 'Stay within supported releases. Falling more than two releases behind turns upgrades into migrations.',
  lead: 'Budget upgrade effort as recurring work (roughly one engineer-month per year for a mid-size cloud is a reasonable starting estimate; measure your own).',
})}`,
        sources: [['Nova upgrades', doc('nova', 'admin/upgrades.html')], ['Kolla-Ansible operating guide', doc('kolla-ansible', 'user/operating-kolla.html')]],
      },
    ],
    quiz: [
      { q: 'In which order do you normally upgrade?', a: ['Computes first, then controllers', 'Control plane first, then computes rolling', 'All at once', 'Only databases'], c: 1, e: 'Newer control planes support older computes (N-1), not the other way round.' },
      { q: 'Which command checks Nova upgrade readiness?', a: ['nova-status upgrade check', 'openstack upgrade verify', 'nova-manage check', 'kolla-ansible status'], c: 0, e: 'nova-status upgrade check validates cells, placement and compute versions.' },
      { q: 'Which tool combines Kolla-Ansible with bare-metal provisioning of the hosts?', a: ['Kayobe', 'OpenStack-Helm', 'DevStack', 'Tempest'], c: 0, e: 'Kayobe adds Bifrost-based provisioning and host configuration.' },
      { q: 'Before patching a hypervisor you should…', a: ['Reboot immediately', 'Disable its nova-compute service and live-migrate instances off', 'Delete its instances', 'Remove it from Keystone'], c: 1, e: 'Disabling stops new placements; migration empties the host.' },
    ],
  },

  // ------------------------------------------------------------------ 13
  {
    id: 'scheria',
    n: 13,
    place: 'Scheria, Land of the Phaeacians',
    title: 'The Swift Ships of Scheria',
    subtitle: 'Advanced networking and the wider pantheon of services',
    tier: 'Demigod',
    relic: { icon: '⛵', name: 'Phaeacian Ship', desc: 'Your networks sail at the speed of thought.' },
    myth: 'The Phaeacians had ships that needed no helmsman and sailed faster than a falcon. Advanced networking — SR-IOV, DPDK, BGP, load balancing as a service — gives your workloads that speed, if you understand what the ship is doing underneath.',
    oracle: ['mtu-hang', 'octavia-pending', 'floating-ip'],
    lessons: [
      {
        id: 'adv-networking',
        title: 'SR-IOV, DPDK, DVR and BGP',
        minutes: 14,
        html: `
<table><tr><th>Technology</th><th>What it does</th><th>Trade-off</th></tr>
<tr><td><b>SR-IOV</b></td><td>A NIC virtual function passed directly to the VM (<code>--vnic-type direct</code>)</td><td>Near line-rate, low latency; bypasses OVS so no security groups, harder live migration</td></tr>
<tr><td><b>OVS-DPDK</b></td><td>Userspace OVS with poll-mode drivers</td><td>High packet rates with SDN features; dedicates cores and huge pages</td></tr>
<tr><td><b>Hardware offload</b></td><td>OVS/OVN flows offloaded to SmartNICs/DPUs (<code>switchdev</code>)</td><td>Best of both; NIC-specific support matrix</td></tr>
<tr><td><b>DVR / distributed routing</b></td><td>East-west and floating IP traffic routed on the compute node</td><td>Native in OVN; complex in ML2/OVS</td></tr>
<tr><td><b>BGP</b></td><td>Advertise tenant/floating prefixes to the fabric (neutron-dynamic-routing, OVN BGP)</td><td>L2-free, scalable edge; needs fabric team integration</td></tr>
<tr><td><b>Routed provider networks</b></td><td>One network, multiple L2 segments per rack; Placement-aware IP allocation</td><td>Scales provider networks without stretching VLANs</td></tr></table>
${term('SR-IOV port for a network function', `
$ openstack network create sriov-net --provider-network-type vlan \\
    --provider-physical-network physnet-sriov --provider-segment 300
$ openstack subnet create sriov-sub --network sriov-net --subnet-range 192.168.30.0/24
$ openstack port create --network sriov-net --vnic-type direct vnf-port-1
$ openstack server create --flavor vnf.pinned --image vnf-image --port vnf-port-1 vnf-01`)}
<h3>Trunks and VLAN-aware VMs</h3>
${term('a VM that receives many VLANs', `
$ openstack port create --network trunk-parent parent0
$ openstack network trunk create --parent-port parent0 fw-trunk
$ openstack network trunk set --subport port=sub-101,segmentation-type=vlan,segmentation-id=101 fw-trunk`)}
${lens({
  sys: 'SR-IOV needs IOMMU enabled in BIOS and kernel (<code>intel_iommu=on iommu=pt</code>), VFs created at boot, and <code>pci</code> device specs in nova.conf.',
  net: 'For telco NFV, design NUMA alignment end-to-end: NIC, VFs, pinned vCPUs and huge pages on the same socket.',
  pre: 'Telco and financial customers will ask for packet rates (Mpps), not Gbps. Get their traffic profile before promising numbers.',
  sa: 'Choose per workload: OVN for general, SR-IOV for data-plane VNFs, offload/DPU where supported and justified.',
  pa: 'BGP-based designs remove large L2 domains and align the cloud with modern data-centre fabrics (EVPN/VXLAN spine-leaf).',
})}`,
        sources: [['SR-IOV', doc('neutron', 'admin/config-sriov.html')], ['OVS-DPDK', doc('neutron', 'admin/config-ovs-dpdk.html')], ['Routed provider networks', doc('neutron', 'admin/config-routed-networks.html')], ['BGP dynamic routing', doc('neutron', 'admin/config-bgp-dynamic-routing.html')]],
      },
      {
        id: 'pantheon',
        title: 'The wider pantheon: Octavia, Heat, Ironic, Magnum, Designate, Cyborg',
        minutes: 13,
        html: `
<table><tr><th>Service</th><th>What it gives users</th><th>Operator notes</th></tr>
<tr><td><b>Octavia</b></td><td>Load balancers (L4/L7, TLS termination)</td><td>Amphora VMs on an lb-mgmt network, or the lightweight OVN provider (L4 only)</td></tr>
<tr><td><b>Heat</b></td><td>Orchestration templates (HOT), autoscaling</td><td>Many teams now use Terraform/OpenTofu instead, but Heat remains useful in-cloud</td></tr>
<tr><td><b>Ironic</b></td><td>Bare-metal servers through the Nova API</td><td>Needs BMC access (Redfish/IPMI), provisioning network; Gazpacho adds autodetect deploy interface and trait-based port scheduling</td></tr>
<tr><td><b>Magnum</b></td><td>Kubernetes clusters as a service</td><td>Modern drivers use Cluster API (e.g. the Vexxhost/StackHPC CAPI drivers)</td></tr>
<tr><td><b>Designate</b></td><td>DNS zones/records, auto-records for floating IPs</td><td>Backs onto BIND9/PowerDNS</td></tr>
<tr><td><b>Manila</b></td><td>Shared file systems</td><td>CephFS/NFS or vendor drivers</td></tr>
<tr><td><b>Cyborg</b></td><td>Accelerator lifecycle (GPU, FPGA, SmartNIC)</td><td>Refreshed driver guide in Gazpacho; many GPU clouds still use Nova PCI passthrough or vGPU/mdev directly</td></tr>
<tr><td><b>Blazar</b>, <b>Watcher</b>, <b>Masakari</b></td><td>Reservations, optimisation, instance HA</td><td>Adopt when a clear need exists</td></tr></table>
${term('a TLS load balancer with Octavia', `
$ openstack loadbalancer create --name web-lb --vip-subnet-id argo-subnet --wait
$ openstack secret store --name web-tls --payload-content-type 'application/octet-stream' \\
    --payload-content-encoding base64 --payload "$(base64 -w0 web.p12)"
$ openstack loadbalancer listener create --name https --protocol TERMINATED_HTTPS \\
    --protocol-port 443 --default-tls-container-ref <secret-href> web-lb
$ openstack loadbalancer pool create --name web-pool --lb-algorithm ROUND_ROBIN \\
    --listener https --protocol HTTP
$ openstack loadbalancer healthmonitor create --type HTTP --url-path /healthz \\
    --delay 5 --timeout 3 --max-retries 3 web-pool
$ openstack loadbalancer member create --subnet-id argo-subnet --address 10.10.0.11 --protocol-port 80 web-pool`)}
${term('GPU passthrough flavor (Nova PCI)', `
# nova.conf on the GPU compute ([pci] section)
# device_spec = {"vendor_id":"10de","product_id":"20b5"}
# alias = {"vendor_id":"10de","product_id":"20b5","device_type":"type-PF","name":"a100"}
$ openstack flavor create --vcpus 32 --ram 262144 --disk 200 \\
    --property "pci_passthrough:alias"="a100:1" g1.a100.1`)}
${lens({
  sys: 'Octavia is the service most often "stuck in PENDING". Its lb-mgmt network and certificates must be right from day one.',
  net: 'Amphora needs connectivity from the lb-mgmt network to the health manager on UDP 5555; plan this network carefully.',
  pre: 'Load balancing, DNS and Kubernetes as a service are what turn "VMs" into a platform. Include them in the value story.',
  sa: 'For AI/GPU clouds, decide on passthrough vs vGPU vs MIG, and on bare metal (Ironic) for training clusters.',
  pa: 'Offer a curated service catalogue. Every extra service is another upgrade and on-call burden; add what users will really consume.',
})}`,
        sources: [['Octavia', doc('octavia', '')], ['Ironic', doc('ironic', '')], ['Magnum', doc('magnum', '')], ['Designate', doc('designate', '')], ['Cyborg', doc('cyborg', '')], ['Nova PCI passthrough', doc('nova', 'admin/pci-passthrough.html')]],
      },
    ],
    quiz: [
      { q: 'Which vNIC type requests an SR-IOV virtual function?', a: ['normal', 'direct', 'macvtap-only', 'virtio'], c: 1, e: '--vnic-type direct binds an SR-IOV VF.' },
      { q: 'What is a key trade-off of SR-IOV?', a: ['Slow throughput', 'Bypasses OVS, so security groups and easy live migration are lost', 'Requires Swift', 'Only works with IPv6'], c: 1, e: 'Traffic goes directly to the NIC.' },
      { q: 'Which Octavia provider needs no amphora VMs but offers only L4?', a: ['amphora', 'ovn', 'haproxy-direct', 'f5'], c: 1, e: 'The OVN provider implements L4 LB in the OVN data plane.' },
      { q: 'Which service provisions physical servers through the Nova API?', a: ['Ironic', 'Cyborg', 'Zun', 'Blazar'], c: 0, e: 'Ironic is the bare-metal service.' },
      { q: 'Routed provider networks help because…', a: ['They remove the need for IPs', 'They avoid stretching one VLAN across all racks by using per-rack segments', 'They enable SR-IOV', 'They encrypt traffic'], c: 1, e: 'Each segment is local to a rack; Placement maps segments to hosts.' },
    ],
  },

  // ------------------------------------------------------------------ 14
  {
    id: 'phaeacian-court',
    n: 14,
    place: 'The Court of King Alcinous',
    title: 'Telling the Tale',
    subtitle: 'Architecture design, sizing and presales proposals',
    tier: 'Olympian',
    relic: { icon: '📜', name: 'Scroll of Alcinous', desc: 'You can propose a cloud and win the room.' },
    myth: 'At King Alcinous\'s court, Odysseus told his whole story so well that the king gave him a ship home. Architects and presales engineers live this scene: a clear, honest, well-structured story of the design is what earns the ship.',
    lessons: [
      {
        id: 'requirements',
        title: 'From requirements to design principles',
        minutes: 12,
        html: `
<p>Great designs start with good questions. Use a discovery checklist:</p>
<table><tr><th>Area</th><th>Ask</th></tr>
<tr><td>Business</td><td>Why now? Cost, sovereignty, licensing exit, new product, AI? What does success look like in 12 months?</td></tr>
<tr><td>Workloads</td><td>How many VMs, sizes, OS mix, growth, stateful vs stateless, special hardware (GPU, SR-IOV), licence constraints (Windows, Oracle)?</td></tr>
<tr><td>Availability</td><td>RTO/RPO per tier, maintenance windows, number of sites, DR expectations</td></tr>
<tr><td>Network</td><td>Existing fabric, VLAN vs overlay, IPAM/DNS, firewalls, internet/edge, bandwidth, IPv6</td></tr>
<tr><td>Storage</td><td>Capacity, IOPS/latency, existing arrays, backup product, object storage needs</td></tr>
<tr><td>Security</td><td>Compliance frameworks, IdP, key management, audit/SIEM, data residency</td></tr>
<tr><td>Operations</td><td>Team size & skills, support model (self, vendor, managed), monitoring stack, change process</td></tr>
<tr><td>Commercial</td><td>Budget model (capex/opex), timeline, hardware vendor preferences</td></tr></table>
<h3>Write architecture principles</h3>
<p>Principles turn debates into decisions. Examples:</p>
<ol>
<li><b>Everything as code</b> — no manual changes to production configuration.</li>
<li><b>N+1 at every layer</b> — lose any single node without user-visible impact.</li>
<li><b>Upgrade annually on SLURP releases.</b></li>
<li><b>Tenants own application HA</b>; the platform provides AZs, anti-affinity and load balancers.</li>
<li><b>Standard hardware profiles</b> — at most 3–4 server SKUs.</li>
</ol>
<h3>Architecture decision records (ADRs)</h3>
${term('ADR-007.md', `
# ADR-007: Use ML2/OVN with dedicated gateway nodes
Status: Accepted (2026-09-25)
Context: 40 compute nodes, 3 racks, north-south traffic 20 Gbps, need
  floating IPs and SNAT; network team requires separation of edge traffic.
Decision: ML2/OVN, 3 dedicated gateway chassis (2x25GbE bonded uplinks),
  Geneve overlay with 9000 MTU underlay.
Consequences: + distributed east-west routing, no L3/DHCP agents
  - 3 extra servers; gateway capacity must be monitored.
Alternatives: all computes as gateways (rejected: edge VLANs on every rack).`)}
${lens({
  pre: 'Run discovery as a workshop, not a questionnaire. Record answers and assumptions; unvalidated assumptions become risks in the proposal.',
  sa: 'Produce a solution design with: context, requirements, principles, logical design, physical design, operations, risks, and ADRs.',
  pa: 'Own the principles and reference architectures across projects so each new cloud is a variant, not a reinvention.',
  lead: 'Review designs with operators before sign-off. The people on call must be able to run what architects draw.',
})}`,
        sources: [['Architecture design guide', `https://docs.openstack.org/arch-design/`], ['Operations guide', `https://docs.openstack.org/operations-guide/`], ['ADR practice (adr.github.io)', 'https://adr.github.io/']],
      },
      {
        id: 'reference-architectures',
        title: 'Reference architectures and sizing',
        minutes: 15,
        html: `
<h3>Common patterns</h3>
<table><tr><th>Pattern</th><th>Shape</th><th>Key choices</th></tr>
<tr><td><b>Starter / edge</b> (≤ 10 nodes)</td><td>3 hyper-converged controller+compute+Ceph nodes, then add computes</td><td>Kolla-Ansible, OVN, Ceph HCI with reserved resources</td></tr>
<tr><td><b>Enterprise general purpose</b> (20–200 nodes)</td><td>3 controllers, 2–3 gateway nodes, N computes, separate Ceph cluster (5+ nodes)</td><td>3 AZs if 3 rooms/racks, spine-leaf 25/100 GbE, federation to AD/Entra</td></tr>
<tr><td><b>Telco / NFV</b></td><td>Multiple edge + central regions</td><td>SR-IOV/DPDK, pinning, huge pages, provider VLANs, real-time kernels</td></tr>
<tr><td><b>AI / GPU</b></td><td>GPU computes or Ironic bare metal, high-speed fabric</td><td>PCI passthrough/vGPU, RDMA/InfiniBand or RoCE, Manila/CephFS or parallel FS for datasets</td></tr>
<tr><td><b>Public cloud provider</b></td><td>Multiple regions, cells per region</td><td>Billing (CloudKitty/Ceilometer), Designate, Octavia, strong quota and abuse processes</td></tr></table>
<h3>Sizing method (compute)</h3>
<ol>
<li>Sum demand: vCPU and RAM of all workloads (+ growth).</li>
<li>Per host capacity: <code>vCPU = threads × cpu_ratio</code>, <code>RAM = (total − reserved) × ram_ratio</code>.</li>
<li>Hosts needed = max(vCPU demand ÷ vCPU per host, RAM demand ÷ RAM per host), rounded up.</li>
<li>Add HA headroom: N+1 (or N+2, or one full AZ worth).</li>
<li>Check the <b>largest flavor</b> fits one host with room to spare.</li>
</ol>
${note('oracle', 'Use the <b>Forge</b> page on this site to run this calculation and produce a draft proposal and diagram you can edit.')}
<h3>Network baseline (enterprise)</h3>
<ul>
<li>Spine-leaf, 2 × 25 GbE (or 100 GbE) per server, LACP or two independent uplinks.</li>
<li>VLANs: management/API internal, public API, tenant overlay (Geneve), storage public, storage cluster, provider/external, BMC/OOB, provisioning.</li>
<li>MTU 9000 on overlay and storage networks.</li>
</ul>
<h3>Migration from legacy virtualisation</h3>
<p>Plan waves: inventory → classify (rehost, replatform, retire) → pilot → migrate by application. Tools include <code>virt-v2v</code> and vendor/partner migration tooling; Gazpacho's workload-mobility improvements help. Always test drivers (virtio) and licensing per OS.</p>
${lens({
  pre: 'Present three options (e.g. starter, recommended, premium) with clear trade-offs. Customers like choosing; they dislike a single take-it-or-leave-it quote.',
  sa: 'State every sizing assumption (ratios, growth, HA policy) on one page. When the customer changes one, you can recompute quickly.',
  pa: 'Standardise reference architectures as versioned documents with a bill of materials template.',
  lead: 'Make sure the delivery team has reviewed any design sold. Sizing that ignores Ceph recovery headroom becomes an on-call problem.',
})}`,
        sources: [['Architecture design guide', `https://docs.openstack.org/arch-design/`], ['Nova allocation ratios', doc('nova', 'admin/scheduling.html')], ['Ceph hardware recommendations', 'https://docs.ceph.com/en/latest/start/hardware-recommendations/'], ['libguestfs virt-v2v', 'https://libguestfs.org/virt-v2v.1.html']],
      },
      {
        id: 'proposal',
        title: 'Writing the proposal and handling objections',
        minutes: 10,
        html: `
<h3>A proposal structure that works</h3>
<ol>
<li><b>Executive summary</b> — the problem, the outcome, the cost, in half a page.</li>
<li><b>Understanding of requirements</b> — show you listened; list assumptions.</li>
<li><b>Solution overview</b> — one diagram, the service catalogue users will get.</li>
<li><b>Logical & physical architecture</b> — control plane, compute pools, storage, network, security.</li>
<li><b>Operations model</b> — monitoring, backups, upgrades (SLURP), support tiers, SLAs.</li>
<li><b>Implementation plan</b> — phases, milestones, acceptance tests (Tempest, Rally, customer UAT).</li>
<li><b>Bill of materials & commercials</b>.</li>
<li><b>Risks & mitigations</b>.</li>
</ol>
<h3>Objections you will hear</h3>
<table><tr><th>Objection</th><th>Honest answer</th></tr>
<tr><td>"OpenStack is too complex."</td><td>It is modular; deploy only what you need with a mature tool. Complexity is managed with automation and, if desired, a support partner.</td></tr>
<tr><td>"Upgrades are painful."</td><td>SLURP gives yearly upgrades; containerised deployments make them rolling and rehearsable.</td></tr>
<tr><td>"We don't have the skills."</td><td>Offer training (like this journey), managed services or co-operation for year one, with a knowledge-transfer plan.</td></tr>
<tr><td>"What about Kubernetes?"</td><td>OpenStack provides the infrastructure Kubernetes runs on (VMs, bare metal, LBs, volumes via Cinder CSI), multi-tenant and API-driven.</td></tr>
<tr><td>"Is it production-proven?"</td><td>Run by large telcos, research centres, public cloud providers and enterprises worldwide; cite relevant references from the OpenInfra user stories.</td></tr></table>
${lens({
  pre: 'Always add an acceptance test plan. It builds trust and protects both sides at hand-over.',
  sa: 'Keep a reusable proposal skeleton; the Forge output follows this structure.',
  pa: 'Your credibility comes from naming risks first. A proposal without a risks section is a sales brochure.',
})}`,
        sources: [['OpenStack user stories', 'https://www.openstack.org/user-stories/'], ['Tempest', doc('tempest', '')], ['Rally', 'https://docs.openstack.org/rally/latest/']],
      },
    ],
    quiz: [
      { q: 'Demand is 2,000 vCPU and 6 TB RAM. Hosts have 96 threads, 768 GB usable RAM, CPU ratio 4:1, RAM 1:1. Hosts before HA?', a: ['6', '8', '9', '21'], c: 1, e: 'CPU: 2000/(96×4)=5.2 → 6. RAM: 6144/768 = 8. RAM dominates → 8, then add N+1.' },
      { q: 'What is the purpose of an Architecture Decision Record?', a: ['Billing', 'Capture context, decision, consequences and alternatives for a significant choice', 'List VMs', 'Store passwords'], c: 1, e: 'ADRs preserve the why behind the design.' },
      { q: 'Which is the best response to "OpenStack upgrades are painful"?', a: ['Never upgrade', 'SLURP yearly cadence plus rehearsed, containerised rolling upgrades', 'Reinstall each year', 'Upgrades are not needed'], c: 1, e: 'Explain the process and cadence honestly.' },
      { q: 'Why present three options in a proposal?', a: ['To confuse', 'To show trade-offs and let the customer choose a risk/cost level', 'It is required by OpenStack', 'To increase price'], c: 1, e: 'Options frame decisions around trade-offs.' },
      { q: 'Which Kubernetes integration gives pods persistent volumes from OpenStack?', a: ['Cinder CSI driver', 'Nova scheduler', 'Glance', 'Designate'], c: 0, e: 'cloud-provider-openstack ships the Cinder CSI plugin.' },
    ],
  },

  // ------------------------------------------------------------------ 15
  {
    id: 'return-ithaca',
    n: 15,
    place: 'Return to Ithaca',
    title: 'The Trial of the Bow',
    subtitle: 'Expert troubleshooting, leadership and the final trial',
    tier: 'Olympian',
    relic: { icon: '🏹', name: 'Bow of Odysseus', desc: 'You strung the bow. You are home.' },
    myth: 'Home at last, Odysseus faced the final test: string the great bow and shoot through twelve axe heads. Only the true master could. Your trial is the same — twelve failures in a row, through every layer of the stack, each shot clean.',
    oracle: ['live-migration', 'rabbit-partition', 'octavia-pending', 'mtu-hang', 'keystone-401', 'noisy-neighbor'],
    lessons: [
      {
        id: 'complex-cases',
        title: 'Multi-layer incidents: three case studies',
        minutes: 16,
        html: `
<h3>Case 1 — "Random API timeouts every afternoon"</h3>
<p><b>Symptom:</b> 1–2% of API calls time out between 14:00 and 16:00. Nothing obvious in service logs.</p>
<ol>
<li>Correlate with metrics: HAProxy shows backend queueing on nova-api; DB connection counts spike.</li>
<li>Galera shows <code>wsrep_flow_control_paused</code> rising — one node is slow to apply writes.</li>
<li>That node's disk latency spikes at 14:00: a backup job (<code>mariabackup</code>) runs there.</li>
<li><b>Root cause:</b> backup I/O on the synced primary node → flow control stalls the whole cluster.</li>
<li><b>Fix:</b> run backups on a node that is not the HAProxy write target, throttle I/O, move to fast disks. Add an alert on flow control.</li>
</ol>
<h3>Case 2 — "Some new VMs get no IP, old ones are fine"</h3>
<ol>
<li>Only VMs on 3 of 40 hosts. Ports stay DOWN. <code>openstack network agent list</code> shows OVN controllers alive.</li>
<li>On an affected host: <code>ovs-vsctl show</code> lacks tunnels to some chassis. <code>ovn-sbctl list chassis</code> shows these hosts registered with an <b>old encap IP</b>.</li>
<li>They were re-IP'd during a rack move; <code>ovn-encap-ip</code> in the local OVS DB was not updated.</li>
<li><b>Fix:</b> <code>ovs-vsctl set open . external-ids:ovn-encap-ip=&lt;new-ip&gt;</code>, restart ovn-controller, verify tunnels. Add a check comparing encap IPs to the inventory.</li>
</ol>
<h3>Case 3 — "Volume attach fails only for large Windows VMs"</h3>
<ol>
<li>Attach errors: <code>VolumeDeviceNotFound</code> after 30 s on iSCSI backend, only on busy hosts.</li>
<li>os-brick rescans are slow on hosts with hundreds of LUNs; multipath is misconfigured (<code>find_multipaths</code>), causing long timeouts.</li>
<li><b>Fix:</b> correct multipath.conf per vendor guide, enable <code>use_multipath_for_image_xfer</code> consistently, clean stale devices. Long-term: move to a backend with fewer per-host LUNs (or NVMe-oF).</li>
</ol>
${note('oracle', 'All three cases share a pattern: the reported symptom is in one layer, the root cause in another. Keep asking "what changed?" and "what is different about the affected ones?"')}
${lens({
  sys: 'Write each incident as a case study like these. Your team\'s own cases are the best training material you will ever have.',
  net: 'Keep an inventory of chassis encap IPs, MTUs and LLDP neighbours; diffing reality against inventory solves many "mystery" incidents.',
  lead: 'Measure MTTD and MTTR and review them quarterly. Improvements usually come from better detection, not faster typing.',
})}`,
        sources: [['Galera flow control', 'https://galeracluster.com/library/documentation/node-states.html'], ['os-brick', doc('os-brick', '')], ['OVN architecture', 'https://www.ovn.org/support/dist-docs/ovn-architecture.7.html']],
      },
      {
        id: 'leading',
        title: 'Leading the crew: runbooks, on-call and game days',
        minutes: 10,
        html: `
<p>The final skill is not technical: it is making a team capable of running the cloud without heroes.</p>
<ul>
<li><b>Runbooks</b>: one per alert. Symptom, impact, diagnosis steps (copy-paste commands), fix, escalation.</li>
<li><b>On-call</b>: primary + secondary, sustainable rotation, handover notes, paging only on actionable alerts.</li>
<li><b>Game days</b>: monthly controlled failure (kill a RabbitMQ node, fill a Ceph OSD, block Geneve on one host). Measure detection and recovery.</li>
<li><b>Change management</b>: peer-reviewed PRs to the deploy repo, staged rollout (lab → staging → one AZ → all).</li>
<li><b>Capability matrix</b>: map each engineer to Keystone/Nova/Neutron/Cinder/Ceph/HA skill levels, and use this Odyssey to close the gaps.</li>
<li><b>Upstream engagement</b>: report bugs, attend the PTG/Summit, contribute fixes — it is how you influence the roadmap.</li>
</ul>
${term('runbook template', `
# RB-012  OVN controller down on compute
Alert: ovn_controller_up == 0 for 5m on {{host}}
Impact: New ports on host cannot be bound; existing flows keep working until OVS restarts.
Diagnose:
$ openstack network agent list --host {{host}}
$ ssh {{host}} sudo docker logs --tail 100 ovn_controller
$ ssh {{host}} sudo docker exec openvswitch_vswitchd ovs-vsctl show
Fix:
$ ssh {{host}} sudo docker restart ovn_controller
Verify: agent alive, test port binding with a canary VM pinned to host.
Escalate: network on-call if SB DB connection errors persist > 15m.`)}
${lens({
  lead: 'You succeeded when the cloud runs well while you are on holiday.',
  pa: 'Institutionalise learning: architecture reviews, incident reviews and upgrade retrospectives feed back into principles.',
  sys: 'Volunteer to run the next game day. Designing failures is the fastest way to deepen understanding.',
})}`,
        sources: [['Google SRE workbook: on-call', 'https://sre.google/workbook/on-call/'], ['OpenInfra PTG', 'https://openinfra.org/ptg/']],
      },
    ],
    quiz: [
      { q: 'Galera flow control is pausing the cluster during backups. Best fix?', a: ['Disable Galera', 'Run backups on a non-write node with throttled I/O and alert on flow control', 'Add RabbitMQ nodes', 'Increase token expiry'], c: 1, e: 'A slow applier throttles the whole synchronous cluster.' },
      { q: 'VMs on a few re-IP\'d hosts get no connectivity. OVN chassis show old IPs. What is wrong?', a: ['Security groups', 'ovn-encap-ip was not updated, so tunnels point to stale addresses', 'Placement', 'Glance'], c: 1, e: 'Chassis encap IP defines tunnel endpoints.' },
      { q: 'What should every paging alert have?', a: ['A runbook', 'A red colour', 'A manager copy', 'Nothing'], c: 0, e: 'Actionable alerts need documented diagnosis and fix steps.' },
      { q: 'The purpose of a game day is…', a: ['To party', 'To practise controlled failures and measure detection and recovery', 'To upgrade', 'To benchmark'], c: 1, e: 'Game days build confidence and expose gaps safely.' },
      { q: 'Which question most often cracks a multi-layer incident?', a: ['"Who is to blame?"', '"What changed, and what is different about the affected ones?"', '"Can we reboot?"', '"Is it DNS?" (always)'], c: 1, e: 'Differences and changes narrow the search space.' },
    ],
  },
];
