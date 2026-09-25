import { term, note, lens, fig, doc, guide } from './helpers.js';

const archSvg = `<svg viewBox="0 0 760 360" role="img" aria-label="OpenStack high level architecture">
  <style>.b{fill:var(--surface-2);stroke:var(--line);stroke-width:1.5}.t{font:600 14.5px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.h{font:700 12px Cinzel,serif;fill:var(--terracotta);letter-spacing:.08em}</style>
  <text x="20" y="26" class="h">USERS / AUTOMATION</text>
  <rect x="20" y="36" width="720" height="44" rx="1" class="b"/>
  <text x="40" y="63" class="t">Horizon dashboard · openstack CLI · SDKs · Terraform/OpenTofu · Ansible</text>
  <text x="20" y="108" class="h">CONTROL PLANE (REST APIs)</text>
  <g>
    <rect x="20" y="118" width="130" height="62" rx="1" class="b"/><text x="34" y="144" class="t">Keystone</text><text x="34" y="164" class="s">identity + catalog</text>
    <rect x="165" y="118" width="130" height="62" rx="1" class="b"/><text x="179" y="144" class="t">Nova + Placement</text><text x="179" y="164" class="s">compute scheduling</text>
    <rect x="310" y="118" width="130" height="62" rx="1" class="b"/><text x="324" y="144" class="t">Neutron</text><text x="324" y="164" class="s">networking</text>
    <rect x="455" y="118" width="130" height="62" rx="1" class="b"/><text x="469" y="144" class="t">Cinder / Glance</text><text x="469" y="164" class="s">volumes · images</text>
    <rect x="600" y="118" width="140" height="62" rx="1" class="b"/><text x="614" y="144" class="t">Octavia, Heat…</text><text x="614" y="164" class="s">higher-level services</text>
  </g>
  <rect x="20" y="194" width="350" height="40" rx="1" fill="var(--gold)" opacity=".25" stroke="var(--gold)"/>
  <text x="36" y="219" class="t">MariaDB / Galera  (state of every service)</text>
  <rect x="390" y="194" width="350" height="40" rx="1" fill="var(--terracotta)" opacity=".18" stroke="var(--terracotta)"/>
  <text x="406" y="219" class="t">RabbitMQ  (RPC between service workers)</text>
  <text x="20" y="266" class="h">DATA PLANE</text>
  <rect x="20" y="276" width="230" height="64" rx="1" class="b"/><text x="36" y="302" class="t">Compute nodes</text><text x="36" y="322" class="s">nova-compute · libvirt/KVM · OVN/OVS</text>
  <rect x="265" y="276" width="230" height="64" rx="1" class="b"/><text x="281" y="302" class="t">Network nodes / gateways</text><text x="281" y="322" class="s">routers · NAT · external traffic</text>
  <rect x="510" y="276" width="230" height="64" rx="1" class="b"/><text x="526" y="302" class="t">Storage</text><text x="526" y="322" class="s">Ceph · SAN/NAS · Swift</text>
</svg>`;

const bootSvg = `<svg viewBox="0 0 760 300" role="img" aria-label="Nova server boot flow">
  <style>.b{fill:var(--surface-2);stroke:var(--line);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.n{font:700 12px Cinzel,serif;fill:#fff}.a{stroke:var(--aegean);stroke-width:2;fill:none;marker-end:url(#ar)}</style>
  <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--aegean)"/></marker></defs>
  <rect x="10" y="30" width="120" height="50" rx="1" class="b"/><text x="24" y="60" class="t">openstack CLI</text>
  <rect x="170" y="30" width="120" height="50" rx="1" class="b"/><text x="186" y="60" class="t">nova-api</text>
  <rect x="330" y="30" width="130" height="50" rx="1" class="b"/><text x="342" y="60" class="t">nova-conductor</text>
  <rect x="500" y="30" width="120" height="50" rx="1" class="b"/><text x="510" y="60" class="t">nova-scheduler</text>
  <rect x="640" y="30" width="110" height="50" rx="1" class="b"/><text x="656" y="60" class="t">Placement</text>
  <rect x="330" y="190" width="130" height="50" rx="1" class="b"/><text x="345" y="220" class="t">nova-compute</text>
  <rect x="120" y="190" width="150" height="50" rx="1" class="b"/><text x="132" y="220" class="t">Glance / Neutron</text>
  <rect x="520" y="190" width="150" height="50" rx="1" class="b"/><text x="540" y="220" class="t">libvirt / KVM</text>
  <path d="M130 55H168" class="a"/><path d="M290 55H328" class="a"/><path d="M460 55H498" class="a"/><path d="M620 55H638" class="a"/>
  <path d="M395 80V188" class="a"/><path d="M330 215H272" class="a"/><path d="M460 215H518" class="a"/>
  <g><circle cx="150" cy="40" r="11" fill="var(--terracotta)"/><text x="146" y="45" class="n">1</text>
  <circle cx="310" cy="40" r="11" fill="var(--terracotta)"/><text x="306" y="45" class="n">2</text>
  <circle cx="480" cy="40" r="11" fill="var(--terracotta)"/><text x="476" y="45" class="n">3</text>
  <circle cx="630" cy="98" r="11" fill="var(--terracotta)"/><text x="626" y="103" class="n">4</text>
  <circle cx="410" cy="140" r="11" fill="var(--terracotta)"/><text x="406" y="145" class="n">5</text>
  <circle cx="300" cy="200" r="11" fill="var(--terracotta)"/><text x="296" y="205" class="n">6</text>
  <circle cx="490" cy="200" r="11" fill="var(--terracotta)"/><text x="486" y="205" class="n">7</text></g>
  <text x="10" y="280" style="font:italic 13.5px 'EB Garamond',Georgia,serif;fill:var(--muted)">1 auth + REST · 2 build request via RPC · 3 select_destinations · 4 allocation candidates + claim · 5 build_and_run_instance · 6 image + port binding · 7 define &amp; start domain</text>
</svg>`;

export const LEVELS_1 = [
  // ------------------------------------------------------------------ 1
  {
    id: 'ithaca',
    n: 1,
    place: 'Ithaca',
    title: 'The Call to Voyage',
    subtitle: 'Cloud fundamentals and the shape of OpenStack',
    tier: 'Mortal',
    relic: { icon: '🫒', name: 'Olive Branch', desc: 'You understand why clouds exist.' },
    myth: 'Every odyssey starts at home. Before Odysseus could sail, he had to know his ship, his crew and the sea. Here you learn what a cloud is, why organisations build private clouds, and how OpenStack is assembled from cooperating services.',
    lab: 'first-light',
    lessons: [
      {
        id: 'what-is-cloud',
        title: 'What a cloud really is',
        minutes: 8,
        html: `
<p>A <b>cloud</b> is not "someone else's computer". It is a set of pooled resources — compute, network, storage — that users obtain <b>on demand, through an API, without filing a ticket</b>. NIST's classic definition lists five traits worth remembering because customers and auditors still use them:</p>
<table><tr><th>Trait</th><th>What it means in OpenStack terms</th></tr>
<tr><td>On-demand self-service</td><td>A user runs <code>openstack server create</code> and gets a VM in seconds.</td></tr>
<tr><td>Broad network access</td><td>Everything is a REST API over HTTPS; Horizon and the CLI are just clients.</td></tr>
<tr><td>Resource pooling</td><td>Hundreds of hypervisors appear as one pool; the scheduler decides placement.</td></tr>
<tr><td>Rapid elasticity</td><td>Capacity is added by enrolling more nodes; tenants scale with Heat, Magnum or Terraform.</td></tr>
<tr><td>Measured service</td><td>Quotas, usage records and telemetry make chargeback and showback possible.</td></tr></table>
<h3>IaaS, PaaS, SaaS: where OpenStack sits</h3>
<p>OpenStack is primarily <b>Infrastructure-as-a-Service (IaaS)</b>: virtual machines, bare metal, networks, block/object/file storage and load balancers. On top of it teams run Kubernetes (via Magnum, Cluster API or their own tooling), databases and applications.</p>
<h3>Why organisations build private clouds</h3>
<ul>
<li><b>Sovereignty and compliance</b> — data must stay in-country or on-premises (telcos, governments, banks, research).</li>
<li><b>Cost at scale</b> — steady, predictable workloads are often cheaper on owned hardware than rented by the hour.</li>
<li><b>Licensing escape</b> — many operators are moving off proprietary virtualisation after licensing changes; OpenStack 2026.1 "Gazpacho" invested heavily in workload migration and live-migration performance for exactly this reason.</li>
<li><b>Special hardware</b> — GPUs, SmartNICs, FPGAs, SR-IOV and DPDK for telco network functions and AI.</li>
</ul>
${note('myth', 'Odysseus did not own the sea; he learnt how to use it. A private cloud is the same bargain: you own the ship, so you also own the storms.')}
${lens({
  sys: 'Your job shifts from "build a server" to "keep the platform that builds servers healthy". Automation and observability matter more than hand-crafted hosts.',
  net: 'Networks become software objects created by tenants. You design the underlay (spine-leaf, VLAN/VXLAN/Geneve, BGP) that makes those objects possible at scale.',
  pre: 'Lead with outcomes: self-service speed, sovereignty and cost predictability. Qualify early: workload types, growth, compliance, current virtualisation estate and team skills.',
  sa: 'Map requirements to service models. Not everything belongs on IaaS; identify what needs bare metal (Ironic), GPUs, or managed Kubernetes on top.',
  pa: 'The key strategic decision is operating model, not technology: who runs day 2, how upgrades happen every 6–12 months, and how the platform is funded.',
  lead: 'A private cloud is a product. Staff it like one: platform team, on-call, backlog, SLOs and a roadmap.',
})}
`,
        sources: [['OpenStack software overview', 'https://www.openstack.org/software/'], ['2026.1 documentation home', guide('')], ['NIST SP 800-145: Definition of Cloud Computing', 'https://csrc.nist.gov/pubs/sp/800/145/final']],
      },
      {
        id: 'openstack-architecture',
        title: 'The anatomy of OpenStack',
        minutes: 12,
        html: `
<p>OpenStack is not one program. It is a family of <b>independent services</b>, each with its own REST API, database schema and worker processes, that cooperate through three shared foundations:</p>
<ol>
<li><b>Keystone</b> — every request carries a token; every service is discovered through Keystone's <i>service catalog</i>.</li>
<li><b>A SQL database</b> (MariaDB/Galera in most deployments) — where each service keeps its state.</li>
<li><b>A message queue</b> (RabbitMQ) — how an API process asks its workers (scheduler, conductor, compute agents) to do things via RPC.</li>
</ol>
${fig(archSvg, 'Control plane services share a database cluster and a message bus; the data plane runs your workloads.')}
<h3>The core services you must know</h3>
<table>
<tr><th>Service</th><th>Code name</th><th>One-liner</th></tr>
<tr><td>Identity</td><td>Keystone</td><td>Authentication, authorisation, projects, service catalog</td></tr>
<tr><td>Compute</td><td>Nova</td><td>Lifecycle of virtual machines (and bare metal via Ironic)</td></tr>
<tr><td>Placement</td><td>Placement</td><td>Inventory and allocation of resources (CPU, RAM, disk, GPUs, bandwidth)</td></tr>
<tr><td>Networking</td><td>Neutron</td><td>Networks, subnets, routers, ports, security groups, floating IPs</td></tr>
<tr><td>Image</td><td>Glance</td><td>Catalogue of bootable images</td></tr>
<tr><td>Block storage</td><td>Cinder</td><td>Persistent volumes, snapshots, backups</td></tr>
<tr><td>Object storage</td><td>Swift</td><td>S3-like, eventually consistent object store</td></tr>
<tr><td>Dashboard</td><td>Horizon (and Skyline)</td><td>Web UI</td></tr>
</table>
<p>Around this core sit services such as Octavia (load balancing), Heat (orchestration), Barbican (secrets), Designate (DNS), Manila (shared file systems), Ironic (bare metal), Magnum (container clusters) and Cyborg (accelerators).</p>
<h3>Control plane vs data plane</h3>
<p>The <b>control plane</b> is APIs, schedulers, databases and queues — usually 3 controller nodes for HA. The <b>data plane</b> is where tenant traffic and disks live: compute hypervisors, network gateways and storage. A key production property: <b>if the control plane is down, running VMs keep running</b>. You lose the ability to <i>change</i> things, not the workloads themselves.</p>
${note('oracle', 'When something breaks, first ask: is this a control-plane problem (API errors, stuck states) or a data-plane problem (a VM cannot reach the network, disk I/O errors)? That single question halves your search space.')}
${term('explore the catalog', `
$ openstack service list
+----------------------------------+-----------+----------------+
| ID                               | Name      | Type           |
+----------------------------------+-----------+----------------+
| 1c0e...                          | keystone  | identity       |
| 5b7a...                          | nova      | compute        |
| 7f21...                          | neutron   | network        |
| 8a9c...                          | glance    | image          |
| a3d4...                          | cinderv3  | volumev3       |
| c61e...                          | placement | placement      |
+----------------------------------+-----------+----------------+
$ openstack endpoint list --interface public -c "Service Name" -c URL`)}
${lens({
  sys: 'Learn the process names per service (nova-api, nova-conductor, nova-scheduler, nova-compute…). When you debug, you will be reading their logs one by one.',
  net: 'Neutron is the service that touches your world. Its data plane (OVN or Open vSwitch) runs on every compute node, so a Neutron problem can look like "the VM is broken".',
  pre: 'Customers often ask "is OpenStack one product?". Explain the modular model: they deploy only what they need, and every piece is open source under Apache 2.0.',
  sa: 'Draw the control plane / data plane split in every design. It clarifies HA, failure domains and upgrade impact to stakeholders.',
  pa: 'Service independence means you can adopt capabilities incrementally, but also that version alignment and upgrade orchestration are your responsibility (or your distribution vendor\'s).',
  lead: 'Build team competency around the shared foundations first (Keystone, DB, RabbitMQ). Most outages trace back to them.',
})}`,
        sources: [['Install guide: overview', guide('install/')], ['Admin guides', guide('admin/')]],
      },
      {
        id: 'releases',
        title: 'Releases, SLURP and 2026.1 Gazpacho',
        minutes: 7,
        html: `
<p>OpenStack ships a coordinated release <b>every six months</b>. Since 2023 releases are named <code>YEAR.N</code> plus an alphabetical code name: 2025.1 Epoxy, 2025.2 Flamingo, <b>2026.1 Gazpacho</b> (released 1 April 2026), then 2026.2.</p>
<h3>SLURP — the Skip Level Upgrade Release Process</h3>
<p>Every <code>.1</code> release is a <b>SLURP</b> release. Operators can upgrade SLURP → SLURP once a year (for example 2025.1 Epoxy → 2026.1 Gazpacho) and skip the <code>.2</code> in between. Non-SLURP releases can still be deployed, but they can only upgrade to the next release.</p>
${note('prod', 'Most enterprises pick an annual SLURP cadence. Plan it as a project: staging environment, database backups, a tested rollback plan, and a change window for the control plane. Data-plane VMs keep running during a well-run upgrade.')}
<h3>What Gazpacho brought (highlights)</h3>
<ul>
<li><b>Nova</b>: parallel live migration connections (faster evacuations and maintenance), full OpenAPI schema coverage of the compute API, and continued migration from eventlet to native Python threading.</li>
<li><b>Neutron / OVN</b>: BGP capabilities, north-south routing for external ports and allowed-address-pairs with virtual MACs.</li>
<li><b>Ironic</b>: automatic deploy-interface detection, trait-based port scheduling and a standalone mode without Nova/Neutron.</li>
<li><b>Cinder</b>: performance, replication and Ceph improvements; asynchronous volume attach work.</li>
<li><b>Cyborg</b>: refreshed accelerator driver guide (GPU, FPGA, NIC, SSD, PCI passthrough) — relevant for AI infrastructure.</li>
</ul>
<p class="muted small">Always check the release notes of each project for your exact deployment; distributions (Canonical, Red Hat, SUSE-derived, Mirantis, etc.) may backport or lag features.</p>
${lens({
  sys: 'Track the release notes for the services you run, especially "Upgrade Notes" and "Deprecation Notes" sections.',
  pre: 'Use SLURP to answer the "how often must we upgrade?" objection: once a year is supported.',
  pa: 'Align your platform roadmap to SLURP releases and your hardware refresh cycle. Budget one upgrade project per year.',
  lead: 'Put upgrades on the team calendar like a release train; rehearse them in staging twice before production.',
})}`,
        sources: [['2026.1 Gazpacho release documentation', guide('')], ['OpenStack software', 'https://www.openstack.org/software/']],
      },
    ],
    quiz: [
      { q: 'Which OpenStack service provides the service catalog that other services and clients use to find endpoints?', a: ['Nova', 'Keystone', 'Placement', 'Horizon'], c: 1, e: 'Keystone issues tokens and publishes the service catalog of endpoints.' },
      { q: 'If all three controller nodes lose power, what happens to running VMs on healthy compute nodes?', a: ['They are paused immediately', 'They are migrated automatically', 'They keep running; you just cannot change anything via the API', 'They are deleted after the token expires'], c: 2, e: 'The data plane is independent from the control plane for running workloads.' },
      { q: 'What does the message queue (RabbitMQ) do in OpenStack?', a: ['Stores images', 'Carries RPC between API processes and service workers', 'Balances HTTP load across controllers', 'Replicates the SQL database'], c: 1, e: 'RabbitMQ carries RPC casts/calls, e.g. nova-conductor → nova-compute.' },
      { q: 'Which upgrade path is supported under SLURP?', a: ['2025.2 → 2026.2', '2025.1 Epoxy → 2026.1 Gazpacho', '2024.2 → 2026.1', 'Any release to any release'], c: 1, e: 'SLURP releases (.1) can upgrade directly to the next SLURP release.' },
      { q: 'Which service tracks inventories and allocations of resources such as VCPU, MEMORY_MB and custom GPU classes?', a: ['Placement', 'Cinder', 'Glance', 'Ceilometer'], c: 0, e: 'Placement stores resource providers, inventories, traits and allocations.' },
    ],
  },

  // ------------------------------------------------------------------ 2
  {
    id: 'cicones',
    n: 2,
    place: 'Land of the Cicones',
    title: 'First Landing: Identity',
    subtitle: 'Keystone, tokens, projects, roles and the catalog',
    tier: 'Mortal',
    relic: { icon: '🗝️', name: 'Bronze Key', desc: 'Keystone opens its gates to you.' },
    myth: 'At the first landing, the crew plundered carelessly and paid for it. Identity is where careless clouds pay too: sloppy roles and shared admin passwords are the first raid an attacker makes.',
    lab: 'first-light',
    lessons: [
      {
        id: 'keystone-concepts',
        title: 'Domains, projects, users and roles',
        minutes: 10,
        html: `
<p>Keystone models <b>who you are</b> and <b>what you may do where</b>:</p>
<ul>
<li><b>Domain</b> — a namespace for users, groups and projects. Often one per organisation or per identity source (e.g. an LDAP/AD domain and a local <code>Default</code> domain).</li>
<li><b>Project</b> (historically "tenant") — the unit of ownership and quota. Every VM, network and volume belongs to exactly one project. Projects can be nested.</li>
<li><b>User / Group</b> — identities. In production, users usually come from LDAP, SAML2 or OpenID Connect federation rather than Keystone's own SQL backend.</li>
<li><b>Role</b> — a named permission bundle, granted to a user or group <b>on</b> a project, a domain, or the whole system.</li>
</ul>
<p>The sentence to remember: <i>“User <b>alice</b> has role <b>member</b> on project <b>argonauts</b>.”</i> That triple is a <b>role assignment</b>.</p>
<h3>Secure RBAC — default roles</h3>
<p>Modern OpenStack ships persona-based default roles, implied in a hierarchy:</p>
<table><tr><th>Role</th><th>Intended use</th></tr>
<tr><td><code>reader</code></td><td>Read-only (auditors, dashboards, monitoring)</td></tr>
<tr><td><code>member</code></td><td>Normal project users: create and manage their own resources</td></tr>
<tr><td><code>manager</code></td><td>Project-level management tasks delegated by operators (newer services)</td></tr>
<tr><td><code>admin</code></td><td>Cloud operators. Grant sparingly.</td></tr>
<tr><td><code>service</code></td><td>Service-to-service calls (e.g. Nova calling Neutron)</td></tr></table>
${term('assign a role', `
$ openstack project create --domain Default --description "Voyage crew" argonauts
$ openstack user create --domain Default --password-prompt alice
$ openstack role add --project argonauts --user alice member
$ openstack role assignment list --user alice --project argonauts --names
+--------+---------------+-------+---------------------+
| Role   | User          | Group | Project             |
+--------+---------------+-------+---------------------+
| member | alice@Default |       | argonauts@Default   |
+--------+---------------+-------+---------------------+`)}
${note('warn', 'Never hand the cloud <code>admin</code> account to automation. Create a dedicated user or, better, an <b>application credential</b> scoped to one project with only the roles it needs.')}
${lens({
  sys: 'Use groups, not individual users, for role assignments. Offboarding becomes one LDAP change instead of an audit across projects.',
  net: 'Neutron RBAC (network sharing) is separate from Keystone roles: you can share a provider network with specific projects using <code>openstack network rbac create</code>.',
  pre: 'Federation with the customer\'s existing IdP (Entra ID, Keycloak, Okta) via OIDC/SAML is usually a must-have. Confirm it during discovery.',
  sa: 'Design the project hierarchy early: per team, per environment (dev/test/prod), or per application. It drives quotas, chargeback and network isolation.',
  pa: 'Decide your identity architecture once: single Keystone per region vs shared across regions, and how federation maps attributes to groups and projects.',
  lead: 'Document the access model (who gets admin, break-glass procedure, reviews every quarter). Auditors will ask.',
})}`,
        sources: [['Keystone admin guide', doc('keystone', 'admin/')], ['Default roles', doc('keystone', 'admin/service-api-protection.html')]],
      },
      {
        id: 'tokens-catalog',
        title: 'Tokens, scopes and the service catalog',
        minutes: 9,
        html: `
<p>Every API call carries an <code>X-Auth-Token</code>. Clients obtain it by authenticating to Keystone with a <b>scope</b>:</p>
<ul>
<li><b>Project scope</b> — act on resources in a project (most common).</li>
<li><b>Domain scope</b> — manage users/projects inside a domain.</li>
<li><b>System scope</b> — operate the deployment itself (e.g. list all hypervisors).</li>
</ul>
<p>The default token format is <b>Fernet</b>: small, non-persistent (nothing written to the DB), encrypted with symmetric keys stored in <code>/etc/keystone/fernet-keys/</code>. Because every controller must be able to decrypt every token, <b>all Keystone nodes need identical keys</b>, rotated in sync.</p>
${term('inspect a token', `
$ openstack token issue
+------------+-----------------------------------------------------------+
| Field      | Value                                                     |
+------------+-----------------------------------------------------------+
| expires    | 2026-09-25T23:11:04+0000                                  |
| id         | gAAAAABm...                                               |
| project_id | 3f0c2b1c6e2a4c0e9b9f5d6a1c2b3d4e                          |
| user_id    | 9a1d3e5f7b...                                             |
+------------+-----------------------------------------------------------+
$ openstack catalog list`)}
<p>The <b>catalog</b> lists each service with <code>public</code>, <code>internal</code> and <code>admin</code> endpoint interfaces. In production, public endpoints are behind TLS on a VIP; internal endpoints are on a management network used service-to-service.</p>
${note('oracle', 'A sudden flood of <code>401 Unauthorized</code> across <i>all</i> services, especially right after a key rotation or controller rebuild, almost always means Fernet keys are out of sync between controllers. Try the Oracle trial "The Keys of Aeolus".')}
<h3>Application credentials</h3>
<p>For CI pipelines, Terraform and monitoring, create an application credential. It is bound to a user + project, can restrict roles and even individual API calls (access rules), and can be revoked without changing the user's password.</p>
${term('application credential for Terraform', `
$ openstack application credential create --role member --expiration 2027-01-01T00:00:00 tf-pipeline
$ cat ~/.config/openstack/clouds.yaml
clouds:
  argonauts-ci:
    auth_type: v3applicationcredential
    auth:
      auth_url: https://keystone.example.com:5000/v3
      application_credential_id: "a1b2..."
      application_credential_secret: "..."
    region_name: RegionOne`)}
${lens({
  sys: 'Automate Fernet key rotation (Kolla-Ansible and OpenStack-Ansible already do) and alert if key directories differ between controllers.',
  net: 'Public endpoints need a DNS name, a certificate and a VIP. Plan the internal vs public API networks as separate VLANs.',
  pre: 'Application credentials answer the "how do we integrate CI/CD securely?" question in one sentence.',
  sa: 'Specify which interface (public/internal) each consumer uses; misrouted service traffic over public TLS VIPs is a common latency and firewall surprise.',
  pa: 'For multi-region, choose between one shared Keystone (single catalog, one blast radius) and per-region Keystones with federation.',
})}`,
        sources: [['Fernet tokens', doc('keystone', 'admin/fernet-token-faq.html')], ['Application credentials', doc('keystone', 'user/application_credentials.html')]],
      },
    ],
    quiz: [
      { q: 'What is a role assignment?', a: ['A user with a password', 'A (user or group, role, target) triple such as alice / member / project argonauts', 'A token scope', 'A policy file'], c: 1, e: 'Roles only matter when assigned to an actor on a target: project, domain or system.' },
      { q: 'Why must all Keystone nodes share the same Fernet key repository?', a: ['To speed up the database', 'Because any node must decrypt tokens issued by any other node', 'Because Horizon requires it', 'They do not need to'], c: 1, e: 'Fernet tokens are validated by decryption with the shared symmetric keys.' },
      { q: 'Which is the best credential for a Terraform pipeline?', a: ['The cloud admin password', 'A shared human user', 'An application credential with a limited role and expiry', 'A system-scoped admin token'], c: 2, e: 'Application credentials are scoped, revocable and can be role-limited.' },
      { q: 'Which default role is intended for read-only auditors?', a: ['reader', 'member', 'service', 'observer'], c: 0, e: 'The reader role is the read-only persona in secure RBAC.' },
      { q: 'Which scope would an operator use to list all hypervisors in the cloud?', a: ['Project scope', 'Domain scope', 'System scope', 'Unscoped token'], c: 2, e: 'Deployment-wide operations are system-scoped under secure RBAC.' },
    ],
  },

  // ------------------------------------------------------------------ 3
  {
    id: 'lotus',
    n: 3,
    place: 'Island of the Lotus-Eaters',
    title: 'The Tools of the Voyager',
    subtitle: 'Horizon, the unified CLI, clouds.yaml and your first lab',
    tier: 'Mortal',
    relic: { icon: '🪶', name: 'Scribe\'s Quill', desc: 'You command the CLI.' },
    myth: 'The Lotus-Eaters offered a sweet fruit that made sailors forget their journey. The dashboard is sweet too — but a voyager who never learns the CLI never learns to automate, and forgets how the cloud actually works.',
    lab: 'first-light',
    lessons: [
      {
        id: 'cli-basics',
        title: 'The openstack client, clouds.yaml and openrc',
        minutes: 10,
        html: `
<p>The unified <code>openstack</code> command (python-openstackclient) talks to every service. Install it in a virtual environment:</p>
${term('install the client', `
$ python3 -m venv ~/.venvs/osc && source ~/.venvs/osc/bin/activate
$ pip install python-openstackclient python-octaviaclient python-designateclient
$ openstack --version`)}
<h3>Two ways to authenticate</h3>
<p><b>1. openrc (environment variables)</b> — downloaded from Horizon (<i>API Access → Download OpenStack RC File</i>):</p>
${term('openrc', `
$ cat argonauts-openrc.sh
export OS_AUTH_URL=https://keystone.example.com:5000/v3
export OS_PROJECT_NAME=argonauts
export OS_USER_DOMAIN_NAME=Default
export OS_PROJECT_DOMAIN_NAME=Default
export OS_USERNAME=alice
export OS_REGION_NAME=RegionOne
export OS_IDENTITY_API_VERSION=3
$ source argonauts-openrc.sh`)}
<p><b>2. clouds.yaml (recommended)</b> — multiple named clouds in one file, used by the CLI, the SDK, Ansible and Terraform:</p>
${term('clouds.yaml', `
$ export OS_CLOUD=argonauts
$ openstack server list
# ~/.config/openstack/clouds.yaml  (put passwords in secure.yaml)
clouds:
  argonauts:
    auth:
      auth_url: https://keystone.example.com:5000/v3
      username: alice
      project_name: argonauts
      user_domain_name: Default
      project_domain_name: Default
    region_name: RegionOne
    interface: public
    identity_api_version: 3`)}
<h3>Output tricks every pro uses</h3>
${term('shape the output', `
# pick columns
$ openstack server list -c Name -c Status -c Networks
# machine-readable output for scripts
$ openstack server show web-01 -f json | jq -r '.status'
# a single value, no table
$ openstack server show web-01 -f value -c status
ACTIVE
# see every HTTP call and the request IDs (gold for troubleshooting)
$ openstack --debug server show web-01 2>&1 | grep -i "x-openstack-request-id"`)}
${note('oracle', 'The <code>--debug</code> flag shows the real REST requests, the endpoint used and the <b>request ID</b>. With a request ID you can grep the exact log lines on the controllers.')}
${lens({
  sys: 'Keep one clouds.yaml per environment in your password manager or vault; use <code>OS_CLOUD</code> to switch. Never commit secure.yaml.',
  net: 'Add <code>-f json</code> and <code>jq</code> to audit ports and security groups at scale; Horizon cannot show 5,000 ports usefully.',
  pre: 'Demo the CLI and a short Terraform/OpenTofu plan alongside Horizon. Buyers who fear lock-in respond well to "everything is an API".',
  sa: 'Standardise on clouds.yaml for all tooling (CLI, openstacksdk, Ansible <code>openstack.cloud</code> collection, Terraform provider).',
  lead: 'Make "no manual changes in production" a team norm: CLI for investigation, code for change.',
})}`,
        sources: [['python-openstackclient', doc('python-openstackclient', '')], ['openstacksdk configuration', doc('openstacksdk', 'user/config/configuration.html')]],
      },
      {
        id: 'lab-setup',
        title: 'Build your own training ground',
        minutes: 10,
        html: `
<p>You learn OpenStack by breaking it. Choose a lab that matches your hardware:</p>
<table><tr><th>Option</th><th>Good for</th><th>Needs</th></tr>
<tr><td><b>This site's terminal</b></td><td>Learning CLI flows safely right now</td><td>A browser</td></tr>
<tr><td><b>DevStack</b></td><td>Developers, quick all-in-one experiments</td><td>1 VM, 8+ GB RAM, 4 vCPU, Ubuntu LTS</td></tr>
<tr><td><b>Kolla-Ansible all-in-one</b></td><td>Operators: same tooling as production, containers</td><td>1 VM/host, 16+ GB RAM, 2 NICs</td></tr>
<tr><td><b>Kolla-Ansible multinode</b></td><td>HA, upgrades, failure drills</td><td>3 controllers + 2 computes (VMs are fine with nested virt)</td></tr>
<tr><td><b>Canonical Sunbeam / MicroStack</b></td><td>Fast evaluation on Ubuntu</td><td>1+ hosts</td></tr></table>
${term('Kolla-Ansible all-in-one (abridged)', `
$ python3 -m venv ~/kolla && source ~/kolla/bin/activate
$ pip install -U pip 'ansible-core>=2.19,<2.21'   # 2026.1 supports ansible-core 2.19–2.20
$ pip install git+https://opendev.org/openstack/kolla-ansible@stable/2026.1
$ kolla-ansible install-deps
$ sudo mkdir -p /etc/kolla && sudo chown $USER:$USER /etc/kolla
$ cp -r ~/kolla/share/kolla-ansible/etc_examples/kolla/* /etc/kolla/
$ cp ~/kolla/share/kolla-ansible/ansible/inventory/all-in-one .
$ kolla-genpwd
# edit /etc/kolla/globals.yml:
#   network_interface: "ens3"            # management / API
#   neutron_external_interface: "ens4"   # no IP, for provider/external traffic
#   kolla_internal_vip_address: "10.0.0.250"
$ kolla-ansible bootstrap-servers -i all-in-one
$ kolla-ansible prechecks -i all-in-one
$ kolla-ansible deploy -i all-in-one
$ kolla-ansible post-deploy -i all-in-one   # writes /etc/kolla/clouds.yaml`)}
<p class="small muted">Check the Kolla-Ansible quickstart and release notes for your exact release: supported host OS versions and the Ansible version window change between releases (2026.1 needs Ansible 12–13, i.e. ansible-core 2.19–2.20).</p>
${note('prod', 'Keep your lab <b>disposable</b>. Snapshot the VMs after deploy, then practise failures: stop RabbitMQ, fill a disk, desync Fernet keys, kill ovn-controller. That is how the Underworld levels become easy.')}
${lens({
  sys: 'Kolla-Ansible AIO on a 32 GB VM is the best return on time for an operator.',
  net: 'Give the lab two NICs so you can practise provider networks and external gateways realistically.',
  pre: 'A small, well-rehearsed demo cloud (or Sunbeam on a mini PC) wins more deals than slides.',
  lead: 'Give every engineer a personal lab budget. Failure drills in labs prevent them in production.',
})}`,
        sources: [['Kolla-Ansible quickstart', doc('kolla-ansible', 'user/quickstart.html')], ['Kolla-Ansible 2026.1 release notes', 'https://docs.openstack.org/releasenotes/kolla-ansible/2026.1.html'], ['DevStack', `https://docs.openstack.org/devstack/latest/`]],
      },
    ],
    quiz: [
      { q: 'Which environment variable selects a named cloud from clouds.yaml?', a: ['OS_CLOUD', 'OS_PROFILE', 'OPENSTACK_ENV', 'OS_AUTH_TYPE'], c: 0, e: 'OS_CLOUD=name tells the CLI and SDK which entry to use.' },
      { q: 'Which flag shows the raw HTTP requests and request IDs?', a: ['--verbose-api', '--trace', '--debug', '-vvv only'], c: 2, e: '--debug prints request/response details including x-openstack-request-id.' },
      { q: 'How do you print only the status field of a server?', a: ['openstack server show web -c status -f value', 'openstack server status web', 'openstack server get web.status', 'openstack server show web | status'], c: 0, e: '-c selects columns and -f value removes the table formatting.' },
      { q: 'In Kolla-Ansible, what should neutron_external_interface usually be?', a: ['The same interface as the API', 'A dedicated interface without an IP address', 'The loopback', 'A bond with the storage network'], c: 1, e: 'It is attached to the provider bridge; an IP on it would conflict with bridging.' },
    ],
  },

  // ------------------------------------------------------------------ 4
  {
    id: 'cyclops',
    n: 4,
    place: 'Cave of the Cyclops',
    title: 'The Giant of Compute',
    subtitle: 'Nova, Placement and the life of a virtual machine',
    tier: 'Sailor',
    relic: { icon: '👁️', name: 'Eye of Polyphemus', desc: 'You see how the scheduler sees.' },
    myth: 'Polyphemus kept his flock in a cave and counted every sheep. Nova and Placement do the same with CPUs and memory — and like Odysseus, you win by understanding exactly how the counting works.',
    lab: 'forge-vessel',
    oracle: ['no-valid-host', 'live-migration'],
    lessons: [
      {
        id: 'nova-arch',
        title: 'Nova architecture and the boot flow',
        minutes: 12,
        html: `
<p>Nova is a set of cooperating processes:</p>
<table><tr><th>Process</th><th>Role</th><th>Where</th></tr>
<tr><td><code>nova-api</code></td><td>REST API, validation, quotas</td><td>Controllers</td></tr>
<tr><td><code>nova-scheduler</code></td><td>Chooses a host using Placement + filters/weighers</td><td>Controllers</td></tr>
<tr><td><code>nova-conductor</code></td><td>Orchestrates builds, migrations; DB proxy for computes</td><td>Controllers (super + cell conductors)</td></tr>
<tr><td><code>nova-compute</code></td><td>Drives the hypervisor (libvirt/KVM, Ironic…)</td><td>Every hypervisor</td></tr>
<tr><td><code>nova-novncproxy</code> / spice / serial</td><td>Console access</td><td>Controllers</td></tr>
<tr><td>Placement API</td><td>Resource inventories & allocations</td><td>Controllers</td></tr></table>
${fig(bootSvg, 'What happens when you run openstack server create.')}
<ol>
<li>The client authenticates with Keystone and POSTs to <code>/servers</code>. nova-api checks quota and creates a <i>build request</i>.</li>
<li>nova-conductor asks the scheduler for a destination.</li>
<li>nova-scheduler asks Placement for <b>allocation candidates</b> that have enough VCPU, MEMORY_MB, DISK_GB and required traits.</li>
<li>The scheduler runs <b>filters</b> (e.g. AZ, aggregates, affinity, PCI, NUMA) and <b>weighers</b>, then claims the resources in Placement.</li>
<li>The conductor casts <code>build_and_run_instance</code> to the chosen nova-compute over RabbitMQ.</li>
<li>nova-compute downloads/clones the image, asks Neutron for the port binding, asks Cinder for volumes.</li>
<li>libvirt defines and starts the domain. Neutron reports <code>network-vif-plugged</code>; the instance goes <b>ACTIVE</b>.</li>
</ol>
${note('oracle', 'Each step has a characteristic failure. Stuck in <b>BUILD/scheduling</b> → scheduler/Placement/RabbitMQ. <b>ERROR with "No valid host"</b> → no candidate passed Placement or filters. Stuck in <b>BUILD/spawning</b> for 5 minutes then ERROR → often the VIF plug event never arrived (Neutron agent/OVN problem).')}
<h3>Cells v2</h3>
<p>Every deployment has at least <code>cell0</code> (where instances that failed scheduling are recorded) and <code>cell1</code>. Large clouds add more cells, each with its own database and message queue, so a RabbitMQ failure only affects one cell. The top-level "API cell" holds the API database and super-conductor.</p>
${term('see the compute side', `
$ openstack compute service list
+----+----------------+-------------+----------+---------+-------+
| ID | Binary         | Host        | Zone     | Status  | State |
+----+----------------+-------------+----------+---------+-------+
|  3 | nova-scheduler | ctl-01      | internal | enabled | up    |
|  6 | nova-conductor | ctl-01      | internal | enabled | up    |
| 11 | nova-compute   | cmp-01      | nova     | enabled | up    |
| 12 | nova-compute   | cmp-02      | nova     | enabled | down  |
+----+----------------+-------------+----------+---------+-------+
$ openstack hypervisor list --long
$ openstack resource provider list`)}
${lens({
  sys: 'Memorise which log to open for which state: scheduler.log for "No valid host", nova-compute.log on the host for spawn errors, conductor.log for build retries.',
  net: 'A VM can fail in "spawning" purely because of the network: Nova waits for Neutron\'s vif-plugged event (vif_plugging_timeout, default 300s).',
  pre: 'Customers from VMware ask about DRS and HA. Explain: scheduling is Placement + filters; host failure recovery is evacuation (manual, or automated with Masakari).',
  sa: 'Design cells when you expect more than several hundred hypervisors per region, or when you need blast-radius isolation for the message bus.',
  pa: 'Cells, regions and AZs are three different tools: cells for scale, AZs for failure domains the user can see, regions for geography/independent control planes.',
})}`,
        sources: [['Nova architecture', doc('nova', 'admin/architecture.html')], ['Cells v2', doc('nova', 'admin/cells.html')]],
      },
      {
        id: 'flavors-images-servers',
        title: 'Flavors, keypairs and your first server',
        minutes: 10,
        html: `
<p>A <b>flavor</b> is a hardware template: vCPU, RAM, root disk, ephemeral disk, swap, plus <b>extra specs</b> that request special behaviour (CPU pinning, huge pages, GPUs, traits).</p>
${term('flavors and keypairs', `
$ openstack flavor create --vcpus 2 --ram 4096 --disk 40 m1.medium
$ openstack flavor create --vcpus 8 --ram 32768 --disk 80 \\
    --property hw:cpu_policy=dedicated \\
    --property hw:mem_page_size=large c1.pinned.xlarge
$ openstack keypair create --public-key ~/.ssh/id_ed25519.pub voyager`)}
${term('boot a server', `
$ openstack server create \\
    --flavor m1.medium \\
    --image ubuntu-24.04 \\
    --network argo-net \\
    --security-group ssh-icmp \\
    --key-name voyager \\
    --user-data cloud-init.yaml \\
    web-01
$ openstack server show web-01 -c status -c addresses -c fault
$ openstack console log show web-01 | tail -30`)}
<h3>Instance states you will meet</h3>
<table><tr><th>Status</th><th>Meaning</th></tr>
<tr><td>BUILD</td><td>Being scheduled or spawned (check <code>OS-EXT-STS:task_state</code>)</td></tr>
<tr><td>ACTIVE</td><td>Running (as far as Nova knows)</td></tr>
<tr><td>SHUTOFF</td><td>Stopped</td></tr>
<tr><td>ERROR</td><td>Something failed — the <code>fault</code> field explains</td></tr>
<tr><td>VERIFY_RESIZE</td><td>Resize/migration waiting for confirm or revert</td></tr>
<tr><td>SHELVED_OFFLOADED</td><td>Freed from hypervisor, image stored in Glance</td></tr></table>
${note('prod', 'Boot-from-volume vs local disk: with Ceph as the Nova ephemeral backend (<code>images_type = rbd</code>) you get fast copy-on-write clones and live migration without shared NFS. With local disks, live migration needs block migration and is slower.')}
${lens({
  sys: 'Create a curated flavor catalogue (general, memory, compute, pinned, GPU). Too many flavors fragment capacity; too few waste it.',
  pre: 'Flavors are your "instance types" in AWS language. Map the customer\'s current VM sizes into 6–10 flavors during sizing.',
  sa: 'Use flavor extra specs + host aggregates to steer special workloads (pinned CPU, GPU, licence-bound hosts) without exposing hosts to users.',
  lead: 'Flavor changes are product changes: version them in code and communicate them to tenants.',
})}`,
        sources: [['Flavors', doc('nova', 'admin/flavors.html')], ['Launch instances', doc('nova', 'user/launch-instances.html')]],
      },
      {
        id: 'scheduling',
        title: 'Scheduling mastery: Placement, aggregates, NUMA',
        minutes: 14,
        html: `
<p>Scheduling happens in two phases:</p>
<ol>
<li><b>Placement pre-filter</b> — a single SQL-backed query returns hosts (resource providers) with enough capacity and the required <b>traits</b> (e.g. <code>HW_CPU_X86_AVX512F</code>, <code>CUSTOM_GPU_A100</code>).</li>
<li><b>Filters & weighers</b> in nova-scheduler — e.g. <code>AvailabilityZoneFilter</code>, <code>ComputeFilter</code>, <code>AggregateInstanceExtraSpecsFilter</code>, <code>ServerGroupAntiAffinityFilter</code>, <code>PciPassthroughFilter</code>, <code>NUMATopologyFilter</code>; then weighers such as RAM/CPU spreading or packing.</li>
</ol>
<h3>Capacity math: allocation ratios</h3>
<p>Placement capacity = <code>(total − reserved) × allocation_ratio</code>. A 64-thread host with <code>cpu_allocation_ratio = 4.0</code> offers 256 VCPU. RAM is usually kept at <b>1.0</b> in production because overcommitting memory leads to swapping or OOM kills.</p>
${term('inspect placement', `
$ openstack resource provider list
$ openstack resource provider inventory list 4e8e5957-649f-477b-9e5b-f1f75b21c03c
+----------------+------------------+----------+----------+-----------+----------+--------+
| resource_class | allocation_ratio | max_unit | reserved | step_size | min_unit |  total |
+----------------+------------------+----------+----------+-----------+----------+--------+
| VCPU           |              4.0 |       64 |        0 |         1 |        1 |     64 |
| MEMORY_MB      |              1.0 |   515072 |    16384 |         1 |        1 | 515072 |
| DISK_GB        |              1.0 |     3570 |        0 |         1 |        1 |   3570 |
+----------------+------------------+----------+----------+-----------+----------+--------+
$ openstack resource provider usage show 4e8e5957-649f-477b-9e5b-f1f75b21c03c
$ openstack allocation candidate list --resource VCPU=8 --resource MEMORY_MB=32768`)}
<h3>Aggregates, AZs and traits</h3>
${term('steer GPU workloads to GPU hosts', `
$ openstack aggregate create --zone az1 gpu-hosts
$ openstack aggregate add host gpu-hosts cmp-gpu-01
$ openstack aggregate set --property gpu=true gpu-hosts
$ openstack flavor set g1.a100 --property aggregate_instance_extra_specs:gpu=true
# or, placement-native with traits:
$ openstack resource provider trait set --trait CUSTOM_GPU_HOST <rp-uuid>
$ openstack flavor set g1.a100 --property trait:CUSTOM_GPU_HOST=required`)}
<h3>NUMA, CPU pinning and huge pages</h3>
<p>For telco (NFV), trading or latency-sensitive workloads use <code>hw:cpu_policy=dedicated</code>, <code>hw:mem_page_size=large</code> and, if needed, <code>hw:numa_nodes</code>. Configure <code>[compute] cpu_dedicated_set</code> and <code>cpu_shared_set</code> on the compute node so pinned and shared workloads never fight over the same cores.</p>
${note('warn', 'Pinned instances cannot share cores, so capacity math changes: allocation ratio effectively becomes 1.0 for PCPU. Size dedicated hosts separately.')}
${lens({
  sys: 'Before blaming the scheduler, run <code>openstack allocation candidate list</code> with the flavor\'s resources. If it returns nothing, Placement is the reason.',
  net: 'SR-IOV and DPDK workloads are NUMA-sensitive: the VF or PMD cores must be on the same NUMA node as the VM\'s vCPUs.',
  pre: 'Be explicit about the overcommit assumptions in your sizing (e.g. CPU 4:1, RAM 1:1). They change the hardware count dramatically.',
  sa: 'Prefer traits over legacy aggregate metadata for new designs — they are evaluated in Placement, earlier and cheaper.',
  pa: 'Define capacity tiers (shared, dedicated, GPU) as separate pools with separate SLAs and pricing.',
})}`,
        sources: [['Scheduling', doc('nova', 'admin/scheduling.html')], ['CPU topologies', doc('nova', 'admin/cpu-topologies.html')], ['Placement usage', doc('placement', 'usage/')]],
      },
    ],
    quiz: [
      { q: 'A server goes to ERROR with "No valid host was found". What is the first useful check?', a: ['Restart nova-compute everywhere', 'Run allocation candidate list for the flavor\'s resources and read nova-scheduler logs', 'Recreate the image', 'Delete cell0'], c: 1, e: 'Determine whether Placement returned no candidates or filters eliminated them.' },
      { q: 'A host has 64 CPU threads and cpu_allocation_ratio=4.0. How many VCPU does Placement offer (no reserved)?', a: ['64', '128', '256', '16'], c: 2, e: '64 × 4.0 = 256 VCPU.' },
      { q: 'Which process casts build_and_run_instance to nova-compute?', a: ['nova-api', 'nova-conductor', 'Placement', 'Keystone'], c: 1, e: 'The conductor orchestrates the build after the scheduler chooses a host.' },
      { q: 'Why keep ram_allocation_ratio at 1.0 in most production clouds?', a: ['Placement requires it', 'Memory overcommit risks swapping and OOM kills', 'Nova cannot count RAM otherwise', 'Licensing'], c: 1, e: 'Unlike CPU time, memory cannot be time-shared without heavy penalties.' },
      { q: 'Which flavor extra spec requests dedicated (pinned) CPUs?', a: ['hw:cpu_policy=dedicated', 'hw:pin=true', 'cpu:exclusive=1', 'trait:PINNED=required'], c: 0, e: 'hw:cpu_policy=dedicated requests PCPU resources.' },
      { q: 'What is cell0 used for?', a: ['Storing images', 'Recording instances that failed to schedule', 'Running controllers', 'Backups'], c: 1, e: 'Instances that never reached a cell are stored in cell0.' },
    ],
  },

  // ------------------------------------------------------------------ 5
  {
    id: 'aeolus',
    n: 5,
    place: 'Island of Aeolus',
    title: 'The Bag of Winds',
    subtitle: 'Glance images, metadata and cloud-init',
    tier: 'Sailor',
    relic: { icon: '🌬️', name: 'Bag of Winds', desc: 'You bottle golden images.' },
    myth: 'Aeolus gave Odysseus every wind in a bag — a gift that was ruined when the crew opened it carelessly. Images are your bottled winds: well-built, they carry every VM safely; opened carelessly, they spread misconfiguration across the fleet.',
    lab: 'forge-vessel',
    lessons: [
      {
        id: 'glance',
        title: 'Glance, formats and backends',
        minutes: 10,
        html: `
<p><b>Glance</b> stores image metadata and delegates bytes to a backend store: <b>Ceph RBD</b>, Swift, a filesystem, or S3-compatible storage. Glance can use <b>multiple stores</b> at once (e.g. one Ceph cluster per edge site).</p>
<table><tr><th>Format</th><th>When</th></tr>
<tr><td><code>qcow2</code></td><td>Compact, supports sparse files. Great for upload/download and local-disk computes.</td></tr>
<tr><td><code>raw</code></td><td><b>Required for efficient Ceph</b>: RBD copy-on-write clones only work from raw images. A qcow2 image on Ceph is converted at every boot.</td></tr>
<tr><td><code>iso</code></td><td>Installer media (rescue/installs).</td></tr>
<tr><td><code>vmdk</code> / <code>vhdx</code></td><td>Imports from VMware/Hyper-V — convert them first with <code>qemu-img</code>, or use the interoperable import convert plugin.</td></tr></table>
${term('upload an image correctly for Ceph', `
$ wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
$ qemu-img info noble-server-cloudimg-amd64.img | grep format
file format: qcow2
$ qemu-img convert -p -f qcow2 -O raw noble-server-cloudimg-amd64.img noble.raw
$ openstack image create ubuntu-24.04 \\
    --disk-format raw --container-format bare \\
    --file noble.raw \\
    --property os_distro=ubuntu --property os_version=24.04 \\
    --property hw_disk_bus=scsi --property hw_scsi_model=virtio-scsi \\
    --property hw_qemu_guest_agent=yes \\
    --public`)}
<h3>Image properties that change behaviour</h3>
<ul>
<li><code>hw_disk_bus</code>, <code>hw_scsi_model</code>, <code>hw_vif_model</code> — virtual hardware (virtio-scsi enables discard/TRIM).</li>
<li><code>hw_qemu_guest_agent=yes</code> — enables quiesced snapshots and password injection via the agent.</li>
<li><code>hw_firmware_type=uefi</code>, <code>os_secure_boot=required</code> — UEFI and Secure Boot guests (e.g. Windows 11).</li>
<li><code>hw_machine_type</code> — pin a QEMU machine type for older guests.</li>
<li><code>img_signature*</code> — signed images, verified by Nova with keys from Barbican.</li>
</ul>
<h3>Visibility</h3>
<p><code>public</code> (everyone), <code>private</code> (owner project), <code>shared</code> (owner + explicitly added members), <code>community</code> (discoverable by anyone but not listed by default).</p>
${lens({
  sys: 'Enable <code>show_multiple_locations</code> only if you understand its security implications; Ceph COW works through location metadata.',
  pre: 'VMware migration projects live or die on image/disk conversion. Mention tools like virt-v2v and the Gazpacho migration improvements.',
  sa: 'Plan image lifecycle: who builds, tests, signs and deprecates golden images, and on what cadence (monthly patching is typical).',
  lead: 'Automate image builds (Packer or diskimage-builder) in CI and publish with a version suffix plus a stable alias.',
})}`,
        sources: [['Glance admin guide', doc('glance', 'admin/')], ['Image properties', doc('glance', 'admin/useful-image-properties.html')]],
      },
      {
        id: 'cloud-init',
        title: 'cloud-init, metadata and config drive',
        minutes: 9,
        html: `
<p>A cloud image is generic. <b>cloud-init</b> personalises it at first boot using data from the <b>metadata service</b> (<code>http://169.254.169.254</code>) or a <b>config drive</b>.</p>
${term('cloud-init.yaml', `
#cloud-config
hostname: web-01
package_update: true
packages: [nginx, qemu-guest-agent]
users:
  - name: ops
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAA... ops@bastion
runcmd:
  - systemctl enable --now nginx qemu-guest-agent
$ openstack server create --user-data cloud-init.yaml --config-drive true ...`)}
<h3>How metadata reaches the VM</h3>
<ul>
<li><b>ML2/OVN</b>: an <code>ovn-metadata-agent</code> on every compute node runs a haproxy in a per-network namespace that proxies 169.254.169.254 to nova-api-metadata.</li>
<li><b>ML2/OVS</b>: the metadata proxy runs in the router namespace (L3 agent) or the DHCP namespace for isolated networks.</li>
<li><b>Config drive</b>: an ISO/vfat disk attached to the VM — no network needed. Ideal for provider networks without DHCP or for strict environments.</li>
</ul>
${note('oracle', 'Symptom: VM boots but you cannot SSH with your key, and the console log shows <code>url_helper.py … 169.254.169.254 … Connection refused/timeout</code>. The metadata path is broken (metadata agent down, or no router on an isolated network). Workaround: boot with <code>--config-drive true</code> while you fix the agent.')}
${term('check from inside the VM', `
$ curl -s http://169.254.169.254/openstack/latest/meta_data.json | jq .uuid
$ sudo cloud-init status --long
$ sudo tail -50 /var/log/cloud-init.log`)}
${lens({
  sys: 'On OVN deployments, <code>openstack network agent list --agent-type ovn-metadata</code> should show an alive agent on every compute.',
  net: 'Metadata traffic is link-local; firewalls inside images (e.g. hardened CIS baselines) sometimes block it.',
  sa: 'Standardise bootstrap: cloud-init for OS basics, then hand off to Ansible/Puppet/Salt or a GitOps agent for configuration.',
})}`,
        sources: [['Nova metadata', doc('nova', 'user/metadata.html')], ['Config drive', doc('nova', 'admin/config-drive.html')]],
      },
    ],
    quiz: [
      { q: 'Which disk format should images have on a Ceph RBD backend for copy-on-write clones?', a: ['qcow2', 'raw', 'vmdk', 'iso'], c: 1, e: 'RBD clones require raw images; qcow2 must be converted on every boot.' },
      { q: 'What address serves instance metadata?', a: ['10.0.0.1', '169.254.169.254', '127.0.0.53', '192.0.2.1'], c: 1, e: 'The link-local metadata address is 169.254.169.254.' },
      { q: 'Which option provides metadata without using the network?', a: ['--config-drive true', '--no-network', '--property metadata=local', 'hw_qemu_guest_agent'], c: 0, e: 'The config drive is attached as a disk.' },
      { q: 'Which image visibility makes an image usable by the owner plus explicitly added projects?', a: ['public', 'community', 'shared', 'private'], c: 2, e: 'Shared images have members that accept the share.' },
    ],
  },
];
