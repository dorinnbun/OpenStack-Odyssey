import { term, note, lens, fig } from './helpers.js';

// The Argonautica: Ceph from scratch, ending with Ceph as OpenStack's storage.
const CEPH = 'https://docs.ceph.com/en/latest';

const layersSvg = `<svg viewBox="0 0 760 300" role="img" aria-label="Ceph layers">
  <style>.b{fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}</style>
  <rect x="20" y="20" width="230" height="70" rx="1" class="b"/><text x="36" y="48" class="t">RBD: block devices</text><text x="36" y="70" class="s">VM disks, Cinder volumes, Glance images</text>
  <rect x="265" y="20" width="230" height="70" rx="1" class="b"/><text x="281" y="48" class="t">RGW: object gateway</text><text x="281" y="70" class="s">S3 and Swift APIs over HTTP</text>
  <rect x="510" y="20" width="230" height="70" rx="1" class="b"/><text x="526" y="48" class="t">CephFS: file system</text><text x="526" y="70" class="s">shared POSIX files, Manila shares</text>
  <rect x="20" y="110" width="720" height="44" rx="1" class="b"/><text x="36" y="138" class="t">librados: the library every interface uses to talk to the cluster</text>
  <rect x="20" y="174" width="720" height="106" rx="1" fill="var(--ochre)" opacity=".22" stroke="var(--line-strong)"/>
  <text x="36" y="200" class="t">RADOS: Reliable Autonomic Distributed Object Store</text>
  <text x="36" y="222" class="s">stores everything as objects, replicates them, detects failures and heals itself</text>
  <g><rect x="36" y="236" width="70" height="30" class="b"/><text x="52" y="256" class="t">MON</text>
  <rect x="116" y="236" width="70" height="30" class="b"/><text x="131" y="256" class="t">MGR</text>
  <rect x="196" y="236" width="70" height="30" class="b"/><text x="212" y="256" class="t">OSD</text>
  <rect x="276" y="236" width="70" height="30" class="b"/><text x="292" y="256" class="t">OSD</text>
  <rect x="356" y="236" width="70" height="30" class="b"/><text x="372" y="256" class="t">OSD</text>
  <text x="440" y="256" class="s">… one OSD per disk, as many as you like</text></g>
</svg>`;

const placementSvg = `<svg viewBox="0 0 760 250" role="img" aria-label="Object to placement group to OSD">
  <style>.b{fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.a{stroke:var(--accent-text);stroke-width:2;fill:none;marker-end:url(#arw)}</style>
  <defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent-text)"/></marker></defs>
  <rect x="20" y="90" width="150" height="60" class="b"/><text x="36" y="116" class="t">object</text><text x="36" y="136" class="s">rbd_data.4f2a…0003</text>
  <path d="M170 120H238" class="a"/><text x="176" y="108" class="s">hash</text>
  <rect x="240" y="90" width="150" height="60" class="b"/><text x="256" y="116" class="t">placement group</text><text x="256" y="136" class="s">PG 3.1a (pool 3)</text>
  <path d="M390 120H458" class="a"/><text x="396" y="108" class="s">CRUSH</text>
  <rect x="460" y="20" width="130" height="50" class="b"/><text x="476" y="42" class="t">osd.1</text><text x="476" y="60" class="s">host ceph-01 (primary)</text>
  <rect x="460" y="95" width="130" height="50" class="b"/><text x="476" y="117" class="t">osd.5</text><text x="476" y="135" class="s">host ceph-02</text>
  <rect x="460" y="170" width="130" height="50" class="b"/><text x="476" y="192" class="t">osd.7</text><text x="476" y="210" class="s">host ceph-03</text>
  <text x="610" y="112" class="s">3 copies,</text><text x="610" y="130" class="s">3 different hosts</text>
</svg>`;

const openstackSvg = `<svg viewBox="0 0 760 250" role="img" aria-label="OpenStack services using Ceph pools">
  <style>.b{fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.a{stroke:var(--accent-text);stroke-width:2;fill:none}</style>
  <rect x="20" y="20" width="160" height="56" class="b"/><text x="36" y="44" class="t">Glance</text><text x="36" y="64" class="s">user client.glance</text>
  <rect x="200" y="20" width="160" height="56" class="b"/><text x="216" y="44" class="t">Cinder volume</text><text x="216" y="64" class="s">user client.cinder</text>
  <rect x="380" y="20" width="160" height="56" class="b"/><text x="396" y="44" class="t">Nova (libvirt)</text><text x="396" y="64" class="s">uses client.cinder</text>
  <rect x="560" y="20" width="180" height="56" class="b"/><text x="576" y="44" class="t">Cinder backup</text><text x="576" y="64" class="s">user client.cinder-backup</text>
  <path d="M100 76V160 M280 76V160 M460 76V160 M650 76V160" class="a"/>
  <rect x="20" y="160" width="160" height="60" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="36" y="186" class="t">pool: images</text><text x="36" y="206" class="s">raw images (the parents)</text>
  <rect x="200" y="160" width="160" height="60" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="216" y="186" class="t">pool: volumes</text><text x="216" y="206" class="s">Cinder volumes</text>
  <rect x="380" y="160" width="160" height="60" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="396" y="186" class="t">pool: vms</text><text x="396" y="206" class="s">Nova ephemeral disks</text>
  <rect x="560" y="160" width="180" height="60" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="576" y="186" class="t">pool: backups</text><text x="576" y="206" class="s">volume backups</text>
  <text x="20" y="244" class="s">New VMs and volumes are copy-on-write clones of images: created in seconds, no data copied.</text>
</svg>`;

export const CEPH_EPIC = {
  id: 'argonautica',
  title: 'The Argonautica',
  greekTitle: 'ΑΡΓΟΝΑΥΤΙΚΑ',
  project: 'Ceph',
  glyph: 'amphora',
  tagline: 'Ceph from scratch: the quest for the Golden Fleece of storage',
  myth: 'Before Odysseus, Jason sailed the Argo with fifty heroes to bring back the Golden Fleece. Your fleece is storage that never loses data, grows without limit and heals itself. You start knowing nothing about storage and end able to design and run Ceph under OpenStack.',
  map: [[90, 262, 1], [230, 150, -1], [370, 258, 1], [510, 118, -1], [660, 232, 1], [800, 118, -1], [905, 282, 1]],
  short: ['Iolcus', 'Lemnos', 'Cyzicus', 'Clashing Rocks', 'Colchis', 'Crete (Talos)', 'Medea’s craft'],
  levels: [
    // ------------------------------------------------------------ 1
    {
      id: 'ceph-iolcus', n: 1, place: 'Iolcus, the home port', title: 'Why Distributed Storage?',
      subtitle: 'Storage from zero: disks, block, file, object, and what Ceph is',
      tier: 'Novice', relic: { name: 'Oar of the Argo', desc: 'You know why Ceph exists.' },
      myth: 'Every quest begins with a reason. King Pelias sent Jason for the fleece; the data centre sends you because one disk, one server or one storage array is never enough.',
      goals: ['Explain block, file and object storage with everyday examples', 'Say why RAID and single arrays stop scaling', 'Name the parts of Ceph and what each one serves'],
      lessons: [
        {
          id: 'storage-basics', title: 'Storage from zero', minutes: 10,
          html: `
${note('plain', 'Storage is where data lives when the power goes off. The questions are always the same: how do programs <i>reach</i> the data, how do we avoid <i>losing</i> it, and how do we make it <i>bigger</i> when we run out?')}
<h3>Three ways to reach data</h3>
<table><tr><th>Type</th><th>Everyday picture</th><th>How programs use it</th><th>Examples</th></tr>
<tr><td><b>Block</b></td><td>A blank notebook: you decide how to organise every page</td><td>Looks like a raw disk (<code>/dev/vdb</code>); an operating system puts a file system on it</td><td>VM disks, databases, Cinder volumes</td></tr>
<tr><td><b>File</b></td><td>A shared filing cabinet with folders</td><td>Folders and files that many machines open at once (NFS, SMB)</td><td>Home directories, shared web content</td></tr>
<tr><td><b>Object</b></td><td>A cloakroom: hand over a coat, get a ticket, fetch it later by ticket</td><td>Whole objects stored and fetched over HTTP by name (S3, Swift)</td><td>Backups, photos, logs, AI datasets</td></tr></table>
<h3>Keeping data safe: redundancy</h3>
<ul>
<li><b>RAID</b> spreads data over several disks inside one server. If a disk dies, data survives; if the <i>server</i> dies, everything on it is unavailable.</li>
<li><b>Storage arrays (SAN/NAS)</b> are powerful boxes with dual controllers. They are reliable but expensive, and you grow them by buying a bigger box.</li>
<li><b>Distributed storage</b> spreads copies across <i>many ordinary servers</i>. Losing a disk, a server or even a rack is routine. You grow by adding servers.</li>
</ul>
${note('myth', 'One ship can sink. A fleet of fifty Argonauts, each carrying part of the cargo, arrives even when a few fall. That is distributed storage.')}
<h3>Replication and erasure coding, simply</h3>
<p><b>Replication</b> keeps full copies, typically 3. Simple and fast, but 1 TB of data uses 3 TB of disk. <b>Erasure coding</b> cuts data into pieces plus "parity" pieces (like a puzzle you can finish with some pieces missing). With 4 data + 2 parity pieces, 1 TB uses 1.5 TB of disk and survives any two failures, at the cost of more CPU and latency.</p>
${lens({
  sys: 'You will spend more time on failure handling than on setup. Distributed storage turns "a disk died" from an incident into a ticket.',
  pre: 'The storage story sells the cloud: no forklift upgrades, grow by adding standard servers, no vendor lock-in on disks.',
  sa: 'Always ask which access type each workload needs: block for VMs and databases, file for shared data, object for backups and data lakes.',
})}`,
          sources: [['Ceph introduction', `${CEPH}/start/`], ['Erasure code (Ceph docs)', `${CEPH}/rados/operations/erasure-code/`]],
        },
        {
          id: 'meet-ceph', title: 'Meet Ceph', minutes: 10,
          html: `
<p><b>Ceph</b> is open source software that turns many ordinary servers and disks into <b>one storage system</b> providing block, file and object storage at the same time. It has no single point of failure and repairs itself automatically.</p>
${fig(layersSvg, 'One cluster, three doors: RBD, RGW and CephFS all sit on top of RADOS.')}
<h3>The pieces in one sentence each</h3>
<ul>
<li><b>RADOS</b>: the heart. It stores everything as objects and keeps them safe.</li>
<li><b>RBD</b> (RADOS Block Device): virtual disks for VMs. This is what OpenStack uses most.</li>
<li><b>RGW</b> (RADOS Gateway): an S3- and Swift-compatible object store.</li>
<li><b>CephFS</b>: a shared file system, used by OpenStack Manila.</li>
</ul>
<h3>Releases</h3>
<p>Ceph ships about one major release a year, named in alphabetical order. The very first was <b>Argonaut</b> (yes, like this epic); recent ones are Reef (18), Squid (19) and <b>Tentacle (20)</b>, the current stable series (20.2.x), with <b>Umbrella</b> in development. Deployment tools pin a Ceph release per OpenStack release, so check your tool's support matrix.</p>
${note('plain', 'The name comes from "cephalopod", the octopus family: many arms, one brain, and it regrows lost arms. That is exactly how the cluster behaves.')}
<h3>Why OpenStack and Ceph are such good partners</h3>
<ul>
<li>One Ceph cluster can back Glance, Cinder, Nova, Cinder backup, Swift/S3 and Manila.</li>
<li>VMs boot from <b>copy-on-write clones</b> of images: seconds, not minutes.</li>
<li>Because every compute node reaches the same storage, <b>live migration and evacuation</b> need no disk copying.</li>
</ul>
${lens({
  sys: 'Most OpenStack operators you meet will run Ceph. Learning both together is the fastest way to be useful on a real platform.',
  pre: 'Ceph is also the storage layer for Proxmox and for Kubernetes (via Rook), so the skill transfers across platforms.',
  pa: 'Decide early: one Ceph cluster for everything, or separate clusters per workload or site. Blast radius is the key trade-off.',
})}`,
          sources: [['Ceph architecture', `${CEPH}/architecture/`], ['Ceph releases', `${CEPH}/releases/`], ['Tentacle release notes', `${CEPH}/releases/tentacle/`]],
        },
      ],
      quiz: [
        { q: 'Which storage type looks like a raw disk to a VM?', a: ['Object', 'Block', 'File', 'Archive'], c: 1, e: 'Block storage appears as a device such as /dev/vdb.' },
        { q: 'With 3× replication, how much raw disk does 10 TB of data use?', a: ['10 TB', '15 TB', '30 TB', '13 TB'], c: 2, e: 'Three full copies: 30 TB.' },
        { q: 'Which Ceph interface do OpenStack VMs and Cinder volumes use?', a: ['RGW', 'CephFS', 'RBD', 'MDS'], c: 2, e: 'RBD provides block devices.' },
        { q: 'Erasure coding 4+2 survives how many simultaneous failures?', a: ['1', '2', '4', '6'], c: 1, e: 'Any 2 of the 6 pieces can be lost.' },
      ],
    },
    // ------------------------------------------------------------ 2
    {
      id: 'ceph-lemnos', n: 2, place: 'Lemnos', title: 'Meet the Crew',
      subtitle: 'MON, MGR, OSD, MDS, RGW, and reading the cluster’s health',
      tier: 'Novice', relic: { name: 'Crew Roll of the Argo', desc: 'You know every daemon aboard.' },
      myth: 'On Lemnos the Argonauts learnt who each of them was: the steersman, the singer, the strong man. A Ceph cluster is a crew too, and each daemon has one job.',
      goals: ['Describe what MON, MGR, OSD, MDS and RGW do', 'Explain quorum and why there are 3 or 5 monitors', 'Read ceph -s line by line'],
      lab: 'raise-argo',
      lessons: [
        {
          id: 'daemons', title: 'The daemons and their jobs', minutes: 10,
          html: `
<table><tr><th>Daemon</th><th>Job</th><th>How many</th></tr>
<tr><td><b>MON</b> (monitor)</td><td>Keeps the <b>cluster map</b>: which OSDs exist, which are up, where data should go. They vote to agree.</td><td>3 (or 5 in large clusters)</td></tr>
<tr><td><b>MGR</b> (manager)</td><td>Runs the dashboard, metrics (Prometheus), the orchestrator (cephadm) and the PG autoscaler.</td><td>2 (one active, one standby)</td></tr>
<tr><td><b>OSD</b> (object storage daemon)</td><td>Owns <b>one disk</b>. Stores objects, replicates to other OSDs, reports failures, rebuilds data.</td><td>One per disk: tens to thousands</td></tr>
<tr><td><b>MDS</b> (metadata server)</td><td>File and folder metadata for CephFS only.</td><td>Only if you use CephFS</td></tr>
<tr><td><b>RGW</b> (gateway)</td><td>HTTP front door for S3/Swift.</td><td>Only if you use object storage</td></tr></table>
${note('plain', 'MONs are the captains who hold the map and must agree by majority. OSDs are the rowers: each owns one disk and does the heavy lifting. The MGR is the ship’s scribe who keeps the logbook and dashboard.')}
<h3>Quorum: why 3 monitors?</h3>
<p>Monitors only act when a <b>majority</b> agrees. With 3 MONs, 1 can fail. With 5, 2 can fail. With 2, losing one stops everything, so never run an even number.</p>
<h3>Clients talk to OSDs directly</h3>
<p>A client asks a MON for the map once, then <b>calculates</b> where data lives and talks straight to the right OSDs. There is no central controller in the data path, which is why Ceph scales so well.</p>
<h3>BlueStore</h3>
<p>Each OSD writes to its disk with <b>BlueStore</b>, which manages the raw device itself (no file system underneath). Its metadata database (<i>DB</i>) and write-ahead log (<i>WAL</i>) can sit on a faster NVMe to speed up slow HDDs.</p>
${lens({
  sys: 'Memorise the daemon names; every log line and alert mentions them.',
  net: 'Clients talk to every OSD directly, so the storage network carries traffic between every compute node and every storage node.',
  sa: 'Place the 3 MONs in 3 different failure domains (racks or rooms), exactly like OpenStack controllers.',
})}`,
          sources: [['Ceph architecture', `${CEPH}/architecture/`], ['BlueStore configuration', `${CEPH}/rados/configuration/bluestore-config-ref/`]],
        },
        {
          id: 'reading-status', title: 'Reading the cluster’s health', minutes: 9,
          html: `
<p>The first command every Ceph operator types is <code>ceph -s</code> (status). Learn to read it top to bottom:</p>
${term('a healthy cluster', `
$ ceph -s
  cluster:
    id:     3f1c9a2e-5b7d-11f0-9a1b-525400a1b2c3
    health: HEALTH_OK

  services:
    mon: 3 daemons, quorum ceph-01,ceph-02,ceph-03 (age 3d)
    mgr: ceph-01.xkq(active, since 3d), standbys: ceph-02.pmr
    osd: 9 osds: 9 up (since 3d), 9 in (since 3d)

  data:
    pools:   4 pools, 97 pgs
    objects: 12.41k objects, 48 GiB
    usage:   146 GiB used, 8.8 TiB / 9.0 TiB avail
    pgs:     97 active+clean`)}
<table><tr><th>Line</th><th>What to check</th></tr>
<tr><td>health</td><td><code>HEALTH_OK</code> good; <code>HEALTH_WARN</code> look soon; <code>HEALTH_ERR</code> act now</td></tr>
<tr><td>mon</td><td>All monitors in quorum</td></tr>
<tr><td>osd</td><td><b>up</b> = daemon running; <b>in</b> = allowed to hold data. Up and in should match the total.</td></tr>
<tr><td>usage</td><td>Watch the used percentage; Ceph warns at 85% on any OSD</td></tr>
<tr><td>pgs</td><td>Everything <code>active+clean</code> is the goal</td></tr></table>
${term('when something is wrong', `
$ ceph health detail
HEALTH_WARN 1 osds down; Degraded data redundancy: 1204/36123 objects degraded (3.333%), 11 pgs degraded
[WRN] OSD_DOWN: 1 osds down
    osd.4 (root=default,host=ceph-02) is down
$ ceph osd tree`)}
${note('plain', '"Degraded" means some objects currently have fewer copies than they should. Data is still readable; Ceph is already working to rebuild the missing copies.')}
${lens({
  sys: 'Make <code>ceph -s</code> and <code>ceph health detail</code> a habit before and after every change.',
  lead: 'Put HEALTH_ERR on the pager and HEALTH_WARN on the daily dashboard review.',
})}`,
          sources: [['Monitoring a cluster', `${CEPH}/rados/operations/monitoring/`], ['Health checks', `${CEPH}/rados/operations/health-checks/`]],
        },
      ],
      quiz: [
        { q: 'Which daemon owns a single disk and stores the data?', a: ['MON', 'MGR', 'OSD', 'MDS'], c: 2, e: 'One OSD per disk.' },
        { q: 'Why run 3 monitors rather than 2?', a: ['Faster writes', 'A majority can still agree after one failure', 'Ceph requires odd OSD counts', 'Licensing'], c: 1, e: 'Quorum needs a majority: 2 of 3.' },
        { q: 'Which daemon is only needed for CephFS?', a: ['RGW', 'MDS', 'MGR', 'MON'], c: 1, e: 'The metadata server serves file-system metadata.' },
        { q: 'An OSD is "up" but "out". What does that mean?', a: ['It is deleted', 'Running, but not holding data', 'Holding data but not running', 'In maintenance mode'], c: 1, e: 'Up = process alive; in = participates in data placement.' },
        { q: 'Do clients send data through the monitors?', a: ['Yes, always', 'No, they calculate placement and talk to OSDs directly', 'Only for writes', 'Only for RGW'], c: 1, e: 'MONs provide the map; data goes straight to OSDs.' },
      ],
    },
    // ------------------------------------------------------------ 3
    {
      id: 'ceph-cyzicus', n: 3, place: 'Cyzicus', title: 'Build Your First Cluster',
      subtitle: 'Plan a lab and deploy Ceph with cephadm',
      tier: 'Apprentice', relic: { name: 'Shipwright’s Adze', desc: 'You have built a cluster with your own hands.' },
      myth: 'At Cyzicus the Argonauts beached the Argo and set up camp. Before sailing further you need a camp of your own: a small cluster you are free to break.',
      goals: ['Plan a 3-node lab: CPU, RAM, disks, networks', 'Bootstrap a cluster with cephadm', 'Add hosts and OSDs and open the dashboard'],
      lab: 'raise-argo',
      lessons: [
        {
          id: 'plan-lab', title: 'Plan your lab', minutes: 8,
          html: `
<table><tr><th></th><th>Minimum lab</th><th>Small production</th></tr>
<tr><td>Nodes</td><td>3 VMs (or 1 VM for a quick look)</td><td>4+ servers (3 is the absolute minimum; 4+ lets Ceph heal after a node loss)</td></tr>
<tr><td>CPU / RAM</td><td>4 vCPU, 8 GB each</td><td>~1 core and ~5 GB RAM per OSD, plus the OS</td></tr>
<tr><td>Disks</td><td>OS disk + 2–3 empty data disks (20 GB+) per VM</td><td>SSD/NVMe, or HDD with NVMe for DB/WAL</td></tr>
<tr><td>Network</td><td>One network is fine</td><td>Public + cluster networks, 25 GbE or faster, MTU 9000</td></tr></table>
<h3>Before you start, on every node</h3>
<ul>
<li>A supported Linux (for example Ubuntu 24.04 LTS or a RHEL 9 family distribution).</li>
<li><b>Podman or Docker</b>, <b>lvm2</b>, <b>Python 3</b> and <b>time synchronisation</b> (chrony). Clock differences break monitors.</li>
<li>Hostnames that resolve, and root SSH from the first node to the others (cephadm sets up its own key).</li>
<li>Empty data disks: no partitions, no file systems.</li>
</ul>
${note('plain', 'Ceph needs raw, empty disks because each OSD takes over its whole disk. If a disk still has old partitions, Ceph will refuse to use it, which protects you from wiping the wrong drive.')}
${lens({
  sys: 'Run the lab as VMs on the OpenStack lab from the main voyage, or on a laptop with 32 GB RAM.',
  pre: 'A 3-VM Ceph lab is also an excellent live demo of self-healing: stop one VM and watch the cluster repair itself.',
})}`,
          sources: [['Cephadm install requirements', `${CEPH}/cephadm/install/`], ['Hardware recommendations', `${CEPH}/start/hardware-recommendations/`]],
        },
        {
          id: 'cephadm', title: 'Deploy with cephadm, step by step', minutes: 14,
          html: `
<p><b>cephadm</b> is Ceph’s own deployment tool. It runs every daemon in a container and manages them from inside the cluster (the <i>orchestrator</i>).</p>
${term('1. install cephadm and bootstrap the first node', `
# on ceph-01 (10.0.0.11). Prerequisites:
$ sudo apt install -y podman lvm2 chrony
# fetch the standalone cephadm for the current release (see the install docs for other methods)
$ CEPH_RELEASE=20.2.3
$ curl --silent --remote-name --location https://download.ceph.com/rpm-\${CEPH_RELEASE}/el9/noarch/cephadm
$ chmod +x cephadm
$ sudo ./cephadm add-repo --release tentacle && sudo ./cephadm install
$ sudo cephadm bootstrap --mon-ip 10.0.0.11
...
Ceph Dashboard is now available at: https://ceph-01:8443/
            User: admin
        Password: 3xq8...
Bootstrap complete.`)}
<p>Bootstrap creates the first MON and MGR, writes <code>/etc/ceph/ceph.conf</code> and the admin keyring, and prints the dashboard login.</p>
${term('2. add the other hosts', `
$ sudo cephadm shell            # a container with the ceph CLI
$ ceph cephadm get-pub-key > ~/ceph.pub
$ ssh-copy-id -f -i ~/ceph.pub root@ceph-02
$ ssh-copy-id -f -i ~/ceph.pub root@ceph-03
$ ceph orch host add ceph-02 10.0.0.12 --labels _admin
$ ceph orch host add ceph-03 10.0.0.13
$ ceph orch host ls`)}
${term('3. turn every empty disk into an OSD', `
$ ceph orch device ls           # which disks are available?
$ ceph orch apply osd --all-available-devices
$ ceph -s                       # after a minute: 9 osds: 9 up, 9 in`)}
<p>cephadm places 3 MONs and 2 MGRs automatically as hosts join. For larger clusters use an <b>OSD service specification</b> (a YAML file) instead of <code>--all-available-devices</code>, so new disks are only used when you decide.</p>
${note('warn', '<code>--all-available-devices</code> keeps consuming any new empty disk it sees. In production, run it once, then make the service unmanaged or switch to a spec file.')}
${lens({
  sys: 'After deploying, run <code>ceph orch ps</code> to see every daemon, the host it runs on and its version.',
  lead: 'Put the service specifications in Git. They are the cluster’s design, exactly like Kolla’s globals.yml.',
})}`,
          sources: [['Deploying a new Ceph cluster (cephadm)', `${CEPH}/cephadm/install/`], ['Host management', `${CEPH}/cephadm/host-management/`], ['OSD service', `${CEPH}/cephadm/services/osd/`]],
        },
      ],
      quiz: [
        { q: 'Which tool is Ceph’s own container-based deployment and management tool?', a: ['ceph-deploy', 'cephadm', 'kolla', 'rook-cli'], c: 1, e: 'cephadm bootstraps and orchestrates containerised daemons.' },
        { q: 'Why must data disks be empty?', a: ['Speed', 'An OSD takes over the whole device; Ceph refuses disks with partitions', 'Licensing', 'Only for HDDs'], c: 1, e: 'This protects existing data.' },
        { q: 'What service must be correct on all nodes to keep monitors happy?', a: ['DNS only', 'Time synchronisation', 'SNMP', 'SELinux'], c: 1, e: 'Clock skew causes monitor warnings and elections.' },
        { q: 'Which command deploys OSDs on every unused disk?', a: ['ceph osd create all', 'ceph orch apply osd --all-available-devices', 'cephadm disks', 'ceph-volume auto'], c: 1, e: 'The orchestrator discovers and uses free devices.' },
      ],
    },
    // ------------------------------------------------------------ 4
    {
      id: 'ceph-symplegades', n: 4, place: 'The Clashing Rocks', title: 'Pools, PGs and CRUSH',
      subtitle: 'How Ceph decides where every object lives',
      tier: 'Apprentice', relic: { name: 'Dove of Phineus', desc: 'You steer data safely between failures.' },
      myth: 'The Symplegades crushed any ship that sailed between them. Jason released a dove first to see the path. CRUSH is Ceph’s dove: it computes a safe path for every object so no single failure crushes your data.',
      goals: ['Explain object → placement group → OSD', 'Create pools and choose replication or erasure coding', 'Use failure domains so copies never share a host or rack'],
      lab: 'raise-argo',
      lessons: [
        {
          id: 'pools-pgs', title: 'Pools and placement groups', minutes: 11,
          html: `
<p>A <b>pool</b> is a named bucket with its own rules: how many copies, which disks, which application. OpenStack typically uses pools named <code>images</code>, <code>volumes</code>, <code>vms</code> and <code>backups</code>.</p>
${fig(placementSvg, 'Every object is hashed into a placement group; CRUSH maps the group to OSDs on different hosts.')}
${note('plain', 'Tracking millions of objects one by one would be slow, so Ceph groups them into a few hundred <b>placement groups (PGs)</b>, like sorting letters into post-code bags. Ceph then only has to decide where each bag goes.')}
${term('create a pool for block storage', `
$ ceph osd pool create volumes
pool 'volumes' created
$ rbd pool init volumes                  # tags it for RBD use
$ ceph osd pool ls detail | grep volumes
pool 3 'volumes' replicated size 3 min_size 2 crush_rule 0 object_hash rjenkins pg_num 32 pgp_num 32 autoscale_mode on application rbd
$ ceph osd pool autoscale-status`)}
<ul>
<li><b>size 3</b>: keep 3 copies. <b>min_size 2</b>: keep accepting writes while at least 2 copies are available.</li>
<li><b>PG autoscaler</b> (mode <code>on</code> by default) picks the number of PGs for you. Setting <code>target_size_ratio</code> on big pools tells it how full you expect them to get.</li>
<li><b>application</b> must be set (rbd, rgw or cephfs), otherwise Ceph shows a warning.</li>
</ul>
${note('warn', 'Never set <code>size 2 min_size 1</code> to save disk space. One failure then leaves a single copy, and a second failure means data loss.')}
${lens({
  sys: 'Use <code>ceph df</code> to see space per pool; remember MAX AVAIL already accounts for replication.',
  sa: 'Plan pools per use and per performance tier (for example <code>volumes-ssd</code> and <code>volumes-hdd</code>), each mapped to Cinder volume types.',
})}`,
          sources: [['Pools', `${CEPH}/rados/operations/pools/`], ['Placement groups and the autoscaler', `${CEPH}/rados/operations/placement-groups/`]],
        },
        {
          id: 'crush-ec', title: 'CRUSH, failure domains and erasure coding', minutes: 12,
          html: `
<p><b>CRUSH</b> is the algorithm that maps PGs to OSDs using a map of your hardware: <code>root → datacenter → room → rack → host → osd</code>. A <b>CRUSH rule</b> says, for example, “put each copy on a different host”. That level is the <b>failure domain</b>.</p>
${term('see the hierarchy', `
$ ceph osd tree
ID  CLASS  WEIGHT   TYPE NAME         STATUS  REWEIGHT
-1         8.78964  root default
-3         2.92988      host ceph-01
 0    ssd  0.97659          osd.0         up   1.00000
 1    ssd  0.97659          osd.1         up   1.00000
 2    ssd  0.97659          osd.2         up   1.00000
-5         2.92988      host ceph-02
 3    ssd  0.97659          osd.3         up   1.00000
...`)}
<h3>Choosing a failure domain</h3>
<table><tr><th>Failure domain</th><th>Survives</th><th>Needs (for 3 copies)</th></tr>
<tr><td>host (default)</td><td>Losing a whole server</td><td>3+ hosts (4+ to heal fully)</td></tr>
<tr><td>rack</td><td>Losing a rack’s power or switch</td><td>3+ racks with similar capacity</td></tr>
<tr><td>datacenter</td><td>Losing a site (stretch mode)</td><td>2 sites plus a tie-breaker monitor</td></tr></table>
${term('a rule for SSDs only, spread across racks', `
$ ceph osd crush rule create-replicated fast-by-rack default rack ssd
$ ceph osd pool set volumes-ssd crush_rule fast-by-rack`)}
<h3>Erasure coding pools</h3>
${term('an EC 4+2 pool for object storage', `
$ ceph osd erasure-code-profile set ec-4-2 k=4 m=2 crush-failure-domain=host
$ ceph osd pool create rgw-data erasure ec-4-2
$ ceph osd pool application enable rgw-data rgw`)}
<p>EC needs at least <i>k+m</i> failure domains (6 hosts for 4+2) and is best for large, sequential object data. Keep RBD for VMs on replicated pools unless you know the trade-offs.</p>
${note('oracle', 'Capacity rule of thumb: usable ≈ raw ÷ 3 (replication) × 0.8. Leave room so the cluster can re-create a failed host’s data without crossing the 85% “nearfull” warning.')}
${lens({
  sa: 'Match CRUSH to the real data centre. A rack failure domain with only two racks cannot place three copies.',
  pa: 'Stretch clusters across two sites need low latency and a third-site tie-breaker. For longer distances use RBD mirroring between two clusters instead.',
  net: 'Failure domains are only real if power and network are independent: two racks behind one top-of-rack switch are one failure domain.',
})}`,
          sources: [['CRUSH maps', `${CEPH}/rados/operations/crush-map/`], ['Erasure code', `${CEPH}/rados/operations/erasure-code/`], ['Stretch mode', `${CEPH}/rados/operations/stretch-mode/`]],
        },
      ],
      quiz: [
        { q: 'What does the PG layer do?', a: ['Encrypts objects', 'Groups objects so placement is computed per group, not per object', 'Stores metadata for CephFS', 'Balances HTTP traffic'], c: 1, e: 'PGs make placement and recovery manageable.' },
        { q: 'A pool has size 3, min_size 2. Two of three copies of a PG are available. What happens to writes?', a: ['Writes stop', 'Writes continue', 'The pool is deleted', 'Ceph switches to EC'], c: 1, e: 'Writes continue while at least min_size copies are available.' },
        { q: 'Which command tags a pool for RBD use?', a: ['rbd pool init volumes', 'ceph pool rbd volumes', 'rbd enable volumes', 'ceph osd pool tag rbd'], c: 0, e: 'rbd pool init (or ceph osd pool application enable <pool> rbd).' },
        { q: 'How many hosts does an EC 4+2 pool with failure domain host need at minimum?', a: ['3', '4', '6', '8'], c: 2, e: 'k+m = 6 separate failure domains.' },
        { q: 'Roughly how much usable space do 300 TB raw give with 3× replication and an 80% fill target?', a: ['240 TB', '100 TB', '80 TB', '150 TB'], c: 2, e: '300 / 3 × 0.8 = 80 TB.' },
      ],
    },
    // ------------------------------------------------------------ 5
    {
      id: 'ceph-colchis', n: 5, place: 'Colchis', title: 'The Golden Fleece',
      subtitle: 'Ceph as the storage of OpenStack: Glance, Cinder, Nova, backup, S3 and Manila',
      tier: 'Adept', relic: { name: 'The Golden Fleece', desc: 'Your cloud stands on Ceph.' },
      myth: 'In Colchis the fleece hung in a sacred grove, guarded by a dragon that never slept. Here you join Ceph to OpenStack, guarding it with keys (cephx users) that give each service only what it needs.',
      goals: ['Create the pools and cephx users OpenStack needs', 'Configure Glance, Cinder and Nova for RBD (and understand copy-on-write)', 'Know how RGW and CephFS serve Swift/S3 and Manila'],
      lab: 'golden-fleece',
      oracle: ['ceph-qcow2', 'volume-attaching'],
      lessons: [
        {
          id: 'pools-users', title: 'Pools and keys for OpenStack', minutes: 12,
          html: `
${fig(openstackSvg, 'Each OpenStack service gets its own pool and its own Ceph user.')}
${term('pools', `
$ ceph osd pool create images && rbd pool init images
$ ceph osd pool create volumes && rbd pool init volumes
$ ceph osd pool create vms && rbd pool init vms
$ ceph osd pool create backups && rbd pool init backups`)}
${term('cephx users with least privilege (from the Ceph documentation)', `
$ ceph auth get-or-create client.glance mon 'profile rbd' \\
    osd 'profile rbd pool=images' mgr 'profile rbd pool=images'
$ ceph auth get-or-create client.cinder mon 'profile rbd' \\
    osd 'profile rbd pool=volumes, profile rbd pool=vms, profile rbd-read-only pool=images' \\
    mgr 'profile rbd pool=volumes, profile rbd pool=vms'
$ ceph auth get-or-create client.cinder-backup mon 'profile rbd' \\
    osd 'profile rbd pool=backups' mgr 'profile rbd pool=backups'
$ ceph auth get client.cinder`)}
${note('plain', 'A cephx user is a named key with permissions, like a key card that only opens certain doors. Glance can write images; Cinder can write volumes and VM disks but only <i>read</i> images, because it clones from them.')}
<p>The <code>profile rbd</code> capabilities are preferred over hand-written ones because they include the permissions RBD needs for exclusive locks, such as blocklisting a crashed client so its lock can be taken over.</p>
${lens({
  sys: 'Every compute node needs the Cinder user’s key registered as a <b>libvirt secret</b>. A missing secret is the classic “attach works on old hosts, fails on new ones” problem (see the Oracle).',
  sa: 'Use separate pools per service so you can size, monitor and apply CRUSH rules to each independently.',
})}`,
          sources: [['Block devices and OpenStack (Ceph docs)', `${CEPH}/rbd/rbd-openstack/`], ['User management (cephx)', `${CEPH}/rados/operations/user-management/`]],
        },
        {
          id: 'wiring', title: 'Wiring OpenStack to Ceph', minutes: 14,
          html: `
<h3>With Kolla-Ansible (external Ceph)</h3>
${term('/etc/kolla/globals.yml', `
glance_backend_ceph: "yes"
cinder_backend_ceph: "yes"
nova_backend_ceph: "yes"
ceph_glance_pool_name: "images"
ceph_cinder_pool_name: "volumes"
ceph_nova_pool_name: "vms"
ceph_cinder_backup_pool_name: "backups"
# copy ceph.conf and the keyrings into /etc/kolla/config/{glance,cinder/cinder-volume,cinder/cinder-backup,nova}/
$ kolla-ansible deploy -i multinode --tags glance,cinder,nova`)}
<h3>What those settings mean in each service</h3>
${term('the important options', `
# glance-api.conf
[glance_store]
stores = rbd
default_store = rbd
rbd_store_pool = images
rbd_store_user = glance
[DEFAULT]
show_image_direct_url = True        # lets Cinder and Nova clone instead of copy

# cinder.conf
[ceph]
volume_driver = cinder.volume.drivers.rbd.RBDDriver
volume_backend_name = ceph
rbd_pool = volumes
rbd_user = cinder
rbd_secret_uuid = 457eb676-33da-42ec-9a8c-9293d545c337

# nova.conf (compute nodes)
[libvirt]
images_type = rbd
images_rbd_pool = vms
rbd_user = cinder
rbd_secret_uuid = 457eb676-33da-42ec-9a8c-9293d545c337`)}
<h3>Copy-on-write: why boots are so fast</h3>
<p>When Glance images are <b>raw</b>, Nova and Cinder create new disks as <b>RBD clones</b> of the image: nothing is copied, and a 40 GB VM is ready in seconds. If the image is <b>qcow2</b>, every boot must download and convert it, which is slow and fills the vms pool with full copies.</p>
${term('check that clones are really clones', `
$ openstack image show ubuntu-24.04 -c disk_format
| disk_format | raw |
$ rbd info vms/3c2f…_disk | grep parent
        parent: images/5b1e…@snap`)}
<h3>Object and file storage too</h3>
<ul>
<li><b>RGW</b> can provide the OpenStack <b>object-store</b> endpoint (Swift API with Keystone authentication) and S3 at the same time. Kolla-Ansible can register it with <code>enable_ceph_rgw</code>.</li>
<li><b>CephFS</b> backs <b>Manila</b> shares, via the native CephFS protocol or NFS (through NFS-Ganesha).</li>
</ul>
${lens({
  sys: 'Test end to end: upload a raw image, boot a VM, attach a volume, take a backup, and confirm each lands in the expected pool with <code>rbd ls &lt;pool&gt;</code>.',
  pre: 'Fast clones and instant live migration are visible in a demo and resonate with VMware customers used to shared storage.',
  pa: 'One Ceph cluster serving block, object and file simplifies operations; separate clusters reduce blast radius. Decide per risk appetite.',
})}`,
          sources: [['Kolla-Ansible external Ceph guide', 'https://docs.openstack.org/kolla-ansible/latest/reference/storage/external-ceph-guide.html'], ['Cinder RBD driver', 'https://docs.openstack.org/cinder/latest/configuration/block-storage/drivers/ceph-rbd-volume-driver.html'], ['Ceph Object Gateway', `${CEPH}/radosgw/`], ['CephFS', `${CEPH}/cephfs/`]],
        },
      ],
      quiz: [
        { q: 'Which image format enables copy-on-write clones on RBD?', a: ['qcow2', 'raw', 'vmdk', 'iso'], c: 1, e: 'Clones need raw images; qcow2 must be converted.' },
        { q: 'Why does client.cinder get only read-only access to the images pool?', a: ['Performance', 'It clones from images but must not change them', 'Ceph requires it', 'Licensing'], c: 1, e: 'Least privilege: read the parent, write the clone.' },
        { q: 'Which Glance option lets Nova and Cinder clone instead of copy?', a: ['show_image_direct_url = True', 'image_cache = on', 'rbd_clone = yes', 'enable_cow = true'], c: 0, e: 'It exposes the RBD location to other services.' },
        { q: 'What must exist on every compute node for RBD disks to attach?', a: ['A Glance cache', 'A libvirt secret holding the Cinder user key', 'An NFS mount', 'An RGW gateway'], c: 1, e: 'libvirt authenticates to Ceph with the secret.' },
        { q: 'Which Ceph interface backs Manila shares?', a: ['RBD', 'RGW', 'CephFS', 'librados only'], c: 2, e: 'CephFS (native or through NFS).' },
      ],
    },
    // ------------------------------------------------------------ 6
    {
      id: 'ceph-talos', n: 6, place: 'Crete, where Talos stands guard', title: 'Keeping the Giant Standing',
      subtitle: 'Operations: failures, maintenance, upgrades and capacity',
      tier: 'Adept', relic: { name: 'Bronze Nail of Talos', desc: 'You keep the cluster healthy day after day.' },
      myth: 'Talos was a bronze giant whose life ran through a single vein sealed by one nail. Pull the nail and he falls. A Ceph cluster has nails too: full disks, lost quorum, careless maintenance. Here you learn to guard them.',
      goals: ['Handle a failed OSD from alert to replacement', 'Do maintenance without triggering needless recovery', 'Upgrade Ceph and watch capacity before it bites'],
      lab: 'talos',
      oracle: ['ceph-nearfull'],
      lessons: [
        {
          id: 'failures', title: 'When a disk dies', minutes: 12,
          html: `
<p>Disks fail every week in a big cluster. The routine:</p>
<ol>
<li><b>Notice</b>: <code>HEALTH_WARN 1 osds down</code>. Ceph marks the OSD <b>out</b> automatically after 10 minutes (<code>mon_osd_down_out_interval</code>) and starts rebuilding copies elsewhere.</li>
<li><b>Look</b>: <code>ceph health detail</code>, <code>ceph osd tree down</code>, then the host’s kernel log (<code>dmesg</code>) and SMART data.</li>
<li><b>Let it heal</b>: watch <code>ceph -s</code> until all PGs are <code>active+clean</code>.</li>
<li><b>Replace</b>: remove the OSD keeping its ID, swap the disk, and let the orchestrator recreate it.</li>
</ol>
${term('replace a failed disk with cephadm', `
$ ceph osd tree down
$ ceph osd out 4                        # if Ceph has not done it yet
$ ceph -s                               # wait for recovery to finish
$ ceph orch osd rm 4 --replace          # keep the ID for the new disk
$ ceph orch osd rm status
# physically replace the disk, then:
$ ceph orch device zap ceph-02 /dev/sdd --force   # only if the new disk is not empty
$ ceph orch apply osd --all-available-devices     # or your OSD spec re-applies`)}
<h3>PG states you will meet</h3>
<table><tr><th>State</th><th>Meaning</th><th>Worry?</th></tr>
<tr><td>active+clean</td><td>All copies present and consistent</td><td>No</td></tr>
<tr><td>degraded / undersized</td><td>Fewer copies than wanted</td><td>Watch; recovery is running</td></tr>
<tr><td>recovering / backfilling</td><td>Copying data to restore redundancy</td><td>Normal after failures</td></tr>
<tr><td>peering</td><td>OSDs agreeing on the PG’s state</td><td>Only if it lasts minutes</td></tr>
<tr><td>inconsistent</td><td>A scrub found copies that differ</td><td>Yes: investigate, then <code>ceph pg repair</code></td></tr>
<tr><td>down / incomplete / stale</td><td>Not enough OSDs to serve data</td><td>Yes: urgent</td></tr></table>
${lens({
  sys: 'Keep spare disks on site and a written replacement runbook. Most clusters replace disks weekly.',
  lead: 'Track disk failure rates per model and batch. A bad batch shows up as clustered failures.',
})}`,
          sources: [['Adding and removing OSDs (cephadm)', `${CEPH}/cephadm/services/osd/`], ['Placement group states', `${CEPH}/rados/operations/pg-states/`], ['Troubleshooting OSDs', `${CEPH}/rados/troubleshooting/troubleshooting-osd/`]],
        },
        {
          id: 'maintenance', title: 'Maintenance, upgrades and capacity', minutes: 12,
          html: `
<h3>Rebooting a node without drama</h3>
${term('planned maintenance on one host', `
$ ceph osd set noout          # don't start rebuilding while the host reboots
$ ceph orch host maintenance enter ceph-02
# patch and reboot ceph-02
$ ceph orch host maintenance exit ceph-02
$ ceph osd unset noout
$ ceph -s                     # back to active+clean`)}
${note('plain', '<code>noout</code> tells Ceph: “this server is only napping, don’t start copying its data elsewhere.” Always remove the flag afterwards, or a real failure later will not heal.')}
<h3>Upgrades</h3>
${term('rolling upgrade with the orchestrator', `
$ ceph orch upgrade check --ceph-version 20.2.3
$ ceph orch upgrade start --ceph-version 20.2.3
$ ceph orch upgrade status
$ ceph versions`)}
<p>cephadm upgrades daemons in a safe order (MGR, MON, OSDs host by host…), checking health between steps. Read the release notes first, and check which Ceph versions your OpenStack deployment tool supports.</p>
<h3>Capacity: the most common emergency</h3>
<table><tr><th>Threshold</th><th>Default</th><th>Effect</th></tr>
<tr><td>nearfull</td><td>85%</td><td>Warning</td></tr>
<tr><td>backfillfull</td><td>90%</td><td>Recovery into that OSD stops</td></tr>
<tr><td>full</td><td>95%</td><td><b>Writes stop</b> on the whole affected pool</td></tr></table>
<p>Watch the <b>fullest OSD</b>, not the average. The <b>balancer</b> module (on by default, <code>upmap</code> mode) evens out usage. Monitor with the built-in dashboard, or the MGR Prometheus module and Grafana.</p>
${lens({
  sys: 'Alert at 75% of the fullest OSD, order hardware at 70% of the cluster.',
  pa: 'Plan growth in whole failure domains (add a full host, not one disk per host) to keep CRUSH balanced.',
})}`,
          sources: [['Host maintenance (cephadm)', `${CEPH}/cephadm/host-management/`], ['Upgrading Ceph (cephadm)', `${CEPH}/cephadm/upgrade/`], ['Balancer', `${CEPH}/rados/operations/balancer/`], ['Prometheus module', `${CEPH}/mgr/prometheus/`]],
        },
      ],
      quiz: [
        { q: 'Which flag stops Ceph from rebuilding data while a host briefly reboots?', a: ['nodown', 'noout', 'pause', 'norecover'], c: 1, e: 'noout prevents OSDs from being marked out.' },
        { q: 'At the default "full" ratio (95%), what happens?', a: ['Nothing', 'A warning only', 'Writes stop to the affected pools', 'Ceph deletes snapshots'], c: 2, e: 'Full OSDs block writes to protect data.' },
        { q: 'A scrub reports a PG as inconsistent. The right first step?', a: ['Delete the pool', 'Investigate which OSD/disk is bad, then ceph pg repair', 'Ignore it', 'Restart all MONs'], c: 1, e: 'Find the cause (often a failing disk), then repair.' },
        { q: 'Which command replaces an OSD while keeping its ID?', a: ['ceph osd purge 4', 'ceph orch osd rm 4 --replace', 'ceph osd destroy-all', 'rbd rm osd.4'], c: 1, e: '--replace marks it destroyed and reuses the ID.' },
        { q: 'Why watch the fullest OSD rather than the average?', a: ['Averages are wrong', 'One full OSD blocks writes even if the cluster average is low', 'Ceph ignores averages', 'For billing'], c: 1, e: 'Limits apply per OSD.' },
      ],
    },
    // ------------------------------------------------------------ 7
    {
      id: 'ceph-medea', n: 7, place: 'Medea’s craft', title: 'Troubleshooting and Design',
      subtitle: 'Slow requests, sizing, hardware choices and disaster recovery',
      tier: 'Expert', relic: { name: 'Cauldron of Medea', desc: 'You can diagnose and design Ceph for production.' },
      myth: 'Medea’s knowledge of herbs and spells got the Argonauts home. Yours is the knowledge to read a sick cluster, and to design one that will not fall sick.',
      goals: ['Diagnose slow requests layer by layer', 'Size a cluster and pick hardware and networks', 'Choose a disaster-recovery pattern'],
      oracle: ['ceph-nearfull', 'ceph-qcow2', 'noisy-neighbor'],
      lessons: [
        {
          id: 'troubleshooting', title: 'Reading a sick cluster', minutes: 13,
          html: `
<h3>Slow requests (slow ops)</h3>
<p>“<code>N slow ops, oldest one blocked for 34 sec</code>” means some OSDs are not completing writes in time. Tenants feel it as VM disk latency.</p>
${term('narrow it down', `
$ ceph health detail | grep -i slow
$ ceph osd perf | sort -k3 -n | tail           # latency per OSD
$ ceph tell osd.12 dump_ops_in_flight | head -40
$ ssh ceph-05 'dmesg -T | tail; smartctl -a /dev/sdc | grep -i -E "realloc|pending|crc"'`)}
<table><tr><th>Pattern</th><th>Likely cause</th></tr>
<tr><td>One OSD always slow</td><td>Failing disk or controller: check SMART, kernel log</td></tr>
<tr><td>All OSDs on one host slow</td><td>Host problem: CPU/RAM pressure, NIC errors, noisy neighbour on hyper-converged nodes</td></tr>
<tr><td>Everything slow during recovery</td><td>Recovery competing with clients: adjust the mClock profile (<code>high_client_ops</code>)</td></tr>
<tr><td>Random timeouts, “heartbeat_check: no reply”</td><td>Network: MTU mismatch, packet loss, a flapping bond</td></tr></table>
<h3>Monitors complaining</h3>
<ul><li><code>MON_CLOCK_SKEW</code>: fix time sync (chrony) on the monitor hosts.</li>
<li><code>MON_DISK_LOW</code>: the monitor’s database disk is filling; free space under <code>/var/lib/ceph</code>.</li></ul>
${note('oracle', 'Same method as the main voyage: define the symptom, find which layer (client, network, OSD, disk), compare the affected OSDs with healthy ones, and change one thing at a time.')}
${lens({
  sys: 'Keep <code>ceph osd perf</code>, <code>ceph -w</code> (live events) and the Grafana OSD latency panel close at hand.',
  net: 'Test MTU end to end on the storage networks with <code>ping -M do -s 8972</code> between every pair of Ceph hosts.',
})}`,
          sources: [['Troubleshooting OSDs', `${CEPH}/rados/troubleshooting/troubleshooting-osd/`], ['Troubleshooting monitors', `${CEPH}/rados/troubleshooting/troubleshooting-mon/`], ['mClock configuration', `${CEPH}/rados/configuration/mclock-config-ref/`]],
        },
        {
          id: 'design', title: 'Designing Ceph for production', minutes: 14,
          html: `
<h3>Hardware choices</h3>
<table><tr><th>Choice</th><th>Guidance</th></tr>
<tr><td>Media</td><td>All-NVMe for VM volumes and databases; HDD + NVMe DB/WAL for capacity and object storage</td></tr>
<tr><td>RAM</td><td>About 4 GB per OSD by default (<code>osd_memory_target</code>), plus the OS and other daemons</td></tr>
<tr><td>CPU</td><td>NVMe OSDs are CPU-hungry: plan several cores per NVMe</td></tr>
<tr><td>Network</td><td>25 GbE minimum; 100 GbE for all-NVMe. Separate public and cluster networks on large clusters. MTU 9000.</td></tr>
<tr><td>Node count</td><td>More, smaller nodes heal faster and lose less capacity per failure than a few huge ones</td></tr></table>
<h3>Sizing example</h3>
<p>The customer needs <b>200 TB usable</b> for VM volumes, 3× replication, 75% fill target:</p>
<p>raw = 200 × 3 ÷ 0.75 = <b>800 TB</b>. With 8 nodes of 10 × 15.36 TB NVMe (≈150 TB raw each) you get 1.2 PB raw. After losing one node, 1.05 PB remains, which comfortably holds 600 TB of replicated data below the 85% warning.</p>
<h3>Hyper-converged or dedicated?</h3>
<p><b>Hyper-converged</b> (OSDs on compute nodes) saves servers and suits edge sites and small clouds, but you must reserve CPU and RAM for OSDs in Nova. <b>Dedicated</b> storage nodes isolate failures and performance and suit most enterprise clouds.</p>
<h3>Disaster recovery</h3>
<ul>
<li><b>Backups</b>: Cinder backup to a separate Ceph pool or cluster, or to object storage.</li>
<li><b>RBD mirroring</b>: asynchronous replication of images to a second cluster (snapshot-based mirroring is the usual choice); Cinder can use it for replicated volume types.</li>
<li><b>Stretch mode</b>: one cluster across two close sites with a tie-breaker monitor; zero data loss, but needs low latency.</li>
</ul>
${lens({
  pre: 'Size from usable capacity and IOPS, show the replication overhead openly, and include failure headroom. Customers trust a number they can recompute.',
  sa: 'Use the Architecture Forge on this site for the OpenStack side; add Ceph nodes from the calculation above.',
  pa: 'Standardise one or two node types. Mixed hardware complicates CRUSH weights and performance predictability.',
})}`,
          sources: [['Hardware recommendations', `${CEPH}/start/hardware-recommendations/`], ['RBD mirroring', `${CEPH}/rbd/rbd-mirroring/`], ['Stretch mode', `${CEPH}/rados/operations/stretch-mode/`]],
        },
      ],
      quiz: [
        { q: 'One OSD shows much higher latency than all others. First suspect?', a: ['The monitors', 'That OSD’s disk or controller', 'Keystone', 'The PG autoscaler'], c: 1, e: 'Check SMART and the kernel log on its host.' },
        { q: 'A MON_CLOCK_SKEW warning is fixed by…', a: ['Adding OSDs', 'Fixing time synchronisation on monitor hosts', 'Restarting RGW', 'Raising pg_num'], c: 1, e: 'Monitors need synchronised clocks.' },
        { q: '200 TB usable, 3× replication, 75% fill target. Raw capacity needed?', a: ['600 TB', '800 TB', '267 TB', '450 TB'], c: 1, e: '200 × 3 / 0.75 = 800 TB.' },
        { q: 'Which DR option replicates RBD images asynchronously to a second cluster?', a: ['Stretch mode', 'RBD mirroring', 'Scrubbing', 'The balancer'], c: 1, e: 'RBD mirroring is asynchronous, cluster to cluster.' },
        { q: 'Why prefer more, smaller storage nodes?', a: ['Cheaper licences', 'Faster healing and less capacity lost per node failure', 'Fewer PGs', 'Ceph requires it'], c: 1, e: 'Each failure is a smaller share of the cluster.' },
      ],
    },
  ],
};
