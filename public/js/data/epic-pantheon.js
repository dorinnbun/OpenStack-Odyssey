import { term, note, lens } from './helpers.js';

// The Pantheon of Olympus: every remaining official OpenStack service of the
// 2026.1 release, one god per service. Islands are independent (open access):
// learn any service in any order.
const L = (project, path = '') => `https://docs.openstack.org/${project}/latest/${path}`;

export const PANTHEON_EPIC = {
  id: 'pantheon',
  title: 'The Pantheon of Olympus',
  greekTitle: 'ΟΛΥΜΠΟΣ',
  project: 'All OpenStack services',
  honour: 'Keeper of the Pantheon',
  glyph: 'laurel',
  openAccess: true,
  tagline: 'Every other official OpenStack service, one god at a time, from beginner to operator',
  myth: 'On Mount Olympus each god ruled one domain: Hermes carried messages, Hephaestus forged metal, Poseidon ruled the deep. OpenStack has its own pantheon of services beyond the core, each with one job. The Odyssey taught the core (Keystone, Nova, Placement, Glance, Neutron, Cinder, Octavia, Barbican); here you meet all the others of the 2026.1 release. Every island is open: visit the gods you need, in any order.',
  rose: [440, 334],
  map: [[80, 250, 1], [200, 128, -1], [320, 262, 1], [440, 118, -1], [560, 262, 1], [680, 118, -1], [800, 258, 1], [918, 132, -1]],
  short: ['Hall of Hermes', 'Forge of Hephaestus', 'Halls of Poseidon', 'Granaries of Demeter', 'Temple of Apollo', 'Council of Athena', 'Scales of Themis', 'Gates of Olympus'],
  levels: [
    // ------------------------------------------------------------ 1 Hermes
    {
      id: 'pan-hermes', n: 1, place: 'Hall of Hermes', title: 'Messages and Workflows',
      subtitle: 'Zaqar (messaging) and Mistral (workflows)',
      tier: 'Service', relic: { name: 'Winged Sandals', desc: 'Messages and workflows run at your command.' },
      myth: 'Hermes, messenger of the gods, carried words between Olympus and the world and guided travellers on their way. Zaqar carries messages between applications; Mistral guides long, multi-step jobs to their end.',
      goals: ['Explain when a message queue helps an application', 'Create queues and post messages with Zaqar', 'Write and run a Mistral workflow'],
      lessons: [
        {
          id: 'zaqar', title: 'Zaqar: messaging for tenants', minutes: 9,
          html: `
${note('plain', 'A message queue is a post box between programs. The sender drops a message in and carries on; the receiver collects it when ready. Neither has to wait for the other, and nothing is lost if the receiver is briefly down.')}
<p><b>Zaqar</b> is OpenStack’s multi-tenant messaging service for <i>applications running in the cloud</i> (it is not the RabbitMQ that OpenStack services use internally). It offers queues over an HTTP REST API and WebSockets, with <b>claims</b> (a worker takes a message so others do not), <b>TTLs</b> and <b>subscriptions</b> that push messages to webhooks or email.</p>
${term('queues from the CLI (python-zaqarclient plugin)', `
$ openstack messaging queue create orders
$ openstack messaging message post orders '[{"body": {"order": 1042, "item": "amphora"}, "ttl": 3600}]'
$ openstack messaging message list orders
$ openstack messaging claim create orders --ttl 300 --grace 60 --limit 5   # a worker takes up to 5
$ openstack messaging subscription create orders https://hooks.example.com/orders 3600`)}
<table><tr><th>Use it for</th><th>Consider instead</th></tr>
<tr><td>Decoupling tenant app components; notifications to users; Heat and Mistral signals</td><td>High-throughput event streaming: Kafka or a managed RabbitMQ on VMs</td></tr></table>
${lens({
  sys: 'Zaqar needs its own storage backend (MongoDB or Redis, with a SQL catalogue); plan it like any stateful service.',
  sa: 'Offer Zaqar when tenants want a simple managed queue without running their own broker.',
  pre: 'A native queue service helps answer “do you have an SQS-like service?” in cloud RFPs.',
})}`,
          sources: [['Zaqar documentation', L('zaqar')], ['Zaqar CLI commands', 'https://docs.openstack.org/python-openstackclient/latest/cli/plugin-commands/zaqar.html'], ['Messaging API v2', 'https://docs.openstack.org/api-ref/message/']],
        },
        {
          id: 'mistral', title: 'Mistral: workflows as a service', minutes: 10,
          html: `
<p><b>Mistral</b> runs <b>workflows</b>: a series of tasks with dependencies, retries, branches and timers, written in a YAML language. Each task calls an <b>action</b>: an OpenStack API (Nova, Cinder…), an HTTP call, SSH or a custom plugin.</p>
${term('backup-all.yaml: snapshot every volume of a project', `
version: '2.0'
backup_all:
  tasks:
    list_volumes:
      action: cinder.volumes_list
      publish:
        ids: <% task().result.id %>
      on-success: snapshot_each
    snapshot_each:
      with-items: vid in <% $.ids %>
      action: cinder.volume_snapshots_create volume_id=<% $.vid %> force=true
      retry: { count: 3, delay: 10 }`)}
${term('run it now, then every night', `
$ openstack workflow create backup-all.yaml
$ openstack workflow execution create backup_all
$ openstack workflow execution list
$ openstack cron trigger create nightly backup_all --pattern "0 2 * * *"`)}
${note('plain', 'Mistral is a recipe runner: you write the recipe once (steps, what to do if a step fails, when to repeat), and it cooks it reliably, as often as you like, with a full history.')}
${lens({
  sys: 'Good for operator automation that must be reliable and auditable: scheduled snapshots, clean-ups, multi-service runbooks.',
  sa: 'Tacker and other services use Mistral internally; tenants can use it for app automation without their own scheduler.',
  lead: 'Keep workflow definitions in Git and review them like code.',
})}`,
          sources: [['Mistral documentation', L('mistral')], ['Mistral workflow language v2', L('mistral', 'user/wf_lang_v2.html')]],
        },
      ],
      quiz: [
        { q: 'Zaqar is used by…', a: ['OpenStack services for internal RPC', 'Tenant applications that need a message queue', 'Nova to schedule VMs', 'Keystone for tokens'], c: 1, e: 'Zaqar is a tenant-facing messaging service; internal RPC uses RabbitMQ.' },
        { q: 'What does a Zaqar claim do?', a: ['Deletes a queue', 'Lets one worker take messages so others do not process them', 'Encrypts messages', 'Creates a subscription'], c: 1, e: 'Claims give a worker temporary ownership of messages.' },
        { q: 'In which format are Mistral workflows written?', a: ['JSON Schema', 'YAML (workflow language v2)', 'Python only', 'HCL'], c: 1, e: 'Mistral uses a YAML DSL.' },
        { q: 'How do you run a Mistral workflow on a schedule?', a: ['A cron trigger', 'A Nova flavor', 'A Heat parameter', 'A Zaqar claim'], c: 0, e: 'openstack cron trigger create … --pattern "…"' },
      ],
    },
    // ------------------------------------------------------------ 2 Hephaestus
    {
      id: 'pan-hephaestus', n: 2, place: 'Forge of Hephaestus', title: 'Beyond Virtual Machines',
      subtitle: 'Ironic (bare metal), Zun (containers) and Cyborg (accelerators)',
      tier: 'Service', relic: { name: 'Hammer of Hephaestus', desc: 'You forge metal, containers and accelerators into the cloud.' },
      myth: 'Hephaestus forged the gods’ armour and weapons from raw metal. Ironic hands out raw metal too: whole physical servers, provisioned as easily as VMs. Zun and Cyborg extend the forge to containers and accelerators.',
      goals: ['Enrol, clean and deploy a bare-metal node with Ironic', 'Run a container directly with Zun', 'Attach an accelerator through a Cyborg device profile'],
      oracle: ['ironic-clean-failed'],
      lessons: [
        {
          id: 'ironic', title: 'Ironic: bare metal as a service', minutes: 13,
          html: `
<p><b>Ironic</b> provisions <b>physical servers</b> through the same Nova API used for VMs. It controls each server’s management controller (BMC) over <b>Redfish</b> or IPMI, boots it into a small ramdisk, cleans the disks and writes an image.</p>
<h3>The life of a node</h3>
<table><tr><th>State</th><th>Meaning</th></tr>
<tr><td>enroll</td><td>Registered, Ironic has not verified the BMC yet</td></tr>
<tr><td>manageable</td><td>BMC credentials work; you may inspect it (discover CPU, RAM, disks, NICs)</td></tr>
<tr><td>available</td><td>Cleaned and ready for a tenant</td></tr>
<tr><td>active</td><td>Deployed: a tenant is using it</td></tr>
<tr><td>clean failed / deploy failed</td><td>Something went wrong: read <code>last_error</code></td></tr></table>
${term('enrol a server and make it available', `
$ openstack baremetal node create --driver redfish --name bm-01 \\
    --driver-info redfish_address=https://10.0.99.11 \\
    --driver-info redfish_system_id=/redfish/v1/Systems/1 \\
    --driver-info redfish_username=admin --driver-info redfish_password=… \\
    --resource-class baremetal.gold
$ openstack baremetal port create 3c:ec:ef:12:34:56 --node bm-01
$ openstack baremetal node manage bm-01
$ openstack baremetal node inspect bm-01
$ openstack baremetal node provide bm-01          # cleaning, then "available"
$ openstack baremetal node list`)}
${term('let tenants order it like a VM', `
$ openstack flavor create --vcpus 64 --ram 262144 --disk 480 bm.gold
$ openstack flavor set bm.gold --property resources:CUSTOM_BAREMETAL_GOLD=1 \\
    --property resources:VCPU=0 --property resources:MEMORY_MB=0 --property resources:DISK_GB=0
$ openstack server create --flavor bm.gold --image ubuntu-24.04 --network argo-net bm-app-01`)}
<p>2026.1 “Gazpacho” added automatic deploy-interface detection, trait-based port scheduling and a standalone mode. <b>Bifrost</b> runs Ironic on its own (no Nova, no Neutron) to provision the servers of the cloud itself.</p>
${lens({
  sys: 'Most Ironic failures are BMC or PXE/virtual-media problems: check <code>openstack baremetal node show bm-01 -f value -c last_error</code> first.',
  net: 'Ironic needs a provisioning network and, for multi-tenant bare metal, switch configuration per tenant (for example networking-generic-switch).',
  sa: 'Use bare metal for HPC, AI training, databases and licence-bound software that must see real hardware.',
  pre: '“Bare metal and VMs from one API” is a strong differentiator for AI and HPC customers.',
})}`,
          sources: [['Ironic documentation', L('ironic')], ['Ironic node states', L('ironic', 'user/states.html')], ['Bifrost', L('bifrost')]],
        },
        {
          id: 'zun', title: 'Zun: containers without servers', minutes: 8,
          html: `
<p><b>Zun</b> runs <b>containers directly</b> as first-class OpenStack resources, without the user creating VMs or a Kubernetes cluster. Containers get Neutron ports (through Kuryr), Cinder volumes and Keystone multi-tenancy, and several can be grouped in a <b>capsule</b> (like a pod).</p>
${term('run and manage a container', `
$ openstack appcontainer run --name web --net network=argo-net nginx:stable
$ openstack appcontainer list
$ openstack appcontainer logs web
$ openstack appcontainer exec --interactive web /bin/sh
$ openstack appcontainer delete web --force`)}
${note('plain', 'Zun is to containers what Nova is to VMs: ask for one, it runs somewhere suitable. Magnum instead gives you a whole Kubernetes cluster to manage many containers yourself.')}
${lens({
  sa: 'Choose Zun for simple, single-container jobs; choose Kubernetes (Magnum/Cluster API) for full application platforms.',
  sys: 'Zun needs Docker and Kuryr on its compute hosts; plan them as a separate host aggregate from Nova hypervisors.',
})}`,
          sources: [['Zun documentation', L('zun')], ['Zun CLI (appcontainer)', 'https://docs.openstack.org/python-zunclient/latest/']],
        },
        {
          id: 'cyborg', title: 'Cyborg: accelerators for everyone', minutes: 9,
          html: `
<p><b>Cyborg</b> manages <b>accelerators</b> (GPUs, FPGAs, SmartNICs, NVMe and other PCI devices): it discovers them, reports them to Placement and attaches them to instances. The request is written as a <b>device profile</b>: a “flavor for devices”.</p>
${term('offer a GPU through a device profile', `
$ openstack accelerator device list
$ openstack accelerator device profile create gpu-a100 \\
    '[{"resources:PGPU": "1", "trait:CUSTOM_GPU_A100": "required"}]'
$ openstack flavor set g1.a100 --property 'accel:device_profile=gpu-a100'
$ openstack server create --flavor g1.a100 --image ubuntu-24.04 --network argo-net train-01
$ openstack accelerator arq list          # accelerator requests bound to instances`)}
<p>Gazpacho refreshed Cyborg’s driver configuration guide for GPUs, FPGAs, NICs, SSDs and PCI passthrough. Many clouds still use plain Nova PCI passthrough or vGPU; Cyborg adds device lifecycle management (for example programming FPGA bitstreams) on top.</p>
${lens({
  sa: 'For AI clouds, compare Nova PCI/vGPU (simple, mature) with Cyborg (richer device management) per accelerator type.',
  sys: 'Resource class and trait names come from the Cyborg driver; check them in Placement before writing device profiles.',
})}`,
          sources: [['Cyborg documentation', L('cyborg')], ['Using Cyborg with your instance', L('cyborg', 'user/using-cyborg.html')], ['Compute API: accelerators', 'https://docs.openstack.org/api-guide/compute/accelerator-support.html']],
        },
      ],
      quiz: [
        { q: 'Through which API do tenants usually order Ironic bare-metal servers?', a: ['A separate bare-metal portal only', 'The Nova API (server create) with a bare-metal flavor', 'Cinder', 'Zun'], c: 1, e: 'Ironic is a Nova virt driver; flavors map to resource classes.' },
        { q: 'Which command moves an Ironic node from manageable to available (with cleaning)?', a: ['openstack baremetal node provide', 'openstack baremetal node deploy', 'openstack server start', 'openstack baremetal node manage'], c: 0, e: '"provide" cleans the node and makes it available.' },
        { q: 'Zun runs containers…', a: ['Inside a Kubernetes cluster it creates', 'Directly as OpenStack resources, with Neutron ports and Cinder volumes', 'Only on bare metal', 'Inside Glance'], c: 1, e: 'Zun is container-as-a-service without managing a cluster.' },
        { q: 'How does a flavor request a Cyborg accelerator?', a: ['--property accel:device_profile=<name>', '--gpu 1', 'hw:cpu_policy', 'A security group'], c: 0, e: 'The flavor points to a device profile.' },
      ],
    },
    // ------------------------------------------------------------ 3 Poseidon
    {
      id: 'pan-poseidon', n: 3, place: 'Halls of Poseidon', title: 'The Deep Stores',
      subtitle: 'Swift (object storage) and Manila (shared file systems)',
      tier: 'Service', relic: { name: 'Trident of Poseidon', desc: 'Objects and shares answer your call.' },
      myth: 'Poseidon ruled the deep, where everything that sinks is kept. Swift keeps billions of objects across whole data centres; Manila gives many servers one shared file system.',
      goals: ['Explain Swift’s proxy, storage servers, rings and consistency', 'Store, share and expire objects', 'Create a Manila share, grant access and mount it'],
      lessons: [
        {
          id: 'swift', title: 'Swift: object storage at any scale', minutes: 13,
          html: `
<table><tr><th>Component</th><th>Job</th></tr>
<tr><td>Proxy server</td><td>Public API (Swift, and S3 through the s3api middleware); finds data using the rings</td></tr>
<tr><td>Account, container, object servers</td><td>Store listings and object data on ordinary disks</td></tr>
<tr><td>Rings</td><td>Map names to disks across regions and zones; one ring per storage policy</td></tr>
<tr><td>Replicators, auditors, updaters</td><td>Background repair: copy missing replicas, find bit rot, catch up listings</td></tr></table>
${note('plain', 'Swift is a giant warehouse with a front desk (the proxy). You hand over a box with a label; it is copied to three shelves in different rooms. If a shelf breaks, workers quietly copy the box again.')}
<p>Swift is <b>eventually consistent</b>: a new object is stored immediately, but a container listing may take a moment to show it. <b>Storage policies</b> choose replication or erasure coding per container.</p>
${term('use it', `
$ openstack container create photos
$ openstack object create photos cat.jpg
$ openstack object list photos
$ swift upload --segment-size 1G backups db-2026-09-25.tar      # large objects in segments
$ swift post -r '.r:*,.rlistings' public-site                     # public read
$ swift tempurl GET 3600 /v1/AUTH_<project>/photos/cat.jpg <key> # time-limited link`)}
${term('operator: build a ring', `
$ swift-ring-builder object.builder create 10 3 1        # 2^10 partitions, 3 replicas
$ swift-ring-builder object.builder add r1z1-10.0.2.11:6200/sdb 100
$ swift-ring-builder object.builder rebalance`)}
${lens({
  sys: 'Watch replication lag, handoff partitions and disk usage per device; swift-recon gives a cluster-wide view.',
  sa: 'Swift or Ceph RGW? Swift is purpose-built and scales to huge multi-region object stores; RGW shares a cluster with block storage.',
  pre: 'Offer S3 compatibility (s3api) so existing tools and backup products work unchanged.',
})}`,
          sources: [['Swift architectural overview', L('swift', 'overview_architecture.html')], ['The rings', L('swift', 'overview_ring.html')], ['Storage policies', L('swift', 'overview_policies.html')]],
        },
        {
          id: 'manila', title: 'Manila: shared file systems', minutes: 11,
          html: `
<p><b>Manila</b> provides <b>shares</b> (NFS, CIFS/SMB, CephFS) that many instances mount at once: home directories, web content, AI datasets, legacy applications that expect a file server.</p>
<ul>
<li><b>Share types</b> map to backends (CephFS, NetApp, the generic driver…). The key extra spec is <code>driver_handles_share_servers</code>: whether Manila creates a share server per tenant network (true) or uses a pre-configured one (false).</li>
<li><b>Access rules</b> say who may mount: by IP range, user or cephx identity.</li>
<li>Snapshots, replication and share groups are supported where the backend allows.</li>
</ul>
${term('create, allow, mount', `
$ openstack share type create cephfsnfs false
$ openstack share create NFS 10 --name webdata --share-type cephfsnfs
$ openstack share access create webdata ip 10.10.0.0/24 --access-level rw
$ openstack share export location list webdata
# on each VM:
$ sudo mount -t nfs 10.0.3.20:/volumes/_nogroup/5b2c… /srv/web`)}
${lens({
  sys: 'With CephFS via NFS (NFS-Ganesha), size and make the Ganesha gateways highly available: they are in the data path.',
  net: 'Tenant VMs need a route to the share export: a storage provider network or a routed path to the NFS gateways.',
  sa: 'Use Manila for ReadWriteMany needs (including Kubernetes via the Manila CSI driver); keep databases on Cinder.',
})}`,
          sources: [['Manila documentation', L('manila')], ['Manila user guide', L('manila', 'user/index.html')], ['CephFS driver', L('manila', 'admin/cephfs_driver.html')]],
        },
      ],
      quiz: [
        { q: 'Which Swift component maps object names to disks?', a: ['The proxy only', 'The rings', 'Keystone', 'The auditor'], c: 1, e: 'Rings map partitions to devices across zones and regions.' },
        { q: 'Swift is…', a: ['Strongly consistent for listings', 'Eventually consistent: listings may lag briefly', 'A block store', 'A file system'], c: 1, e: 'Objects are durable immediately; listings catch up.' },
        { q: 'What does driver_handles_share_servers=true mean in Manila?', a: ['Manila creates share servers per tenant network', 'Shares are read-only', 'CephFS only', 'No access rules'], c: 0, e: 'DHSS=true lets Manila manage share servers itself.' },
        { q: 'Which command lets a subnet mount a Manila share?', a: ['openstack share access create <share> ip <cidr>', 'openstack security group rule create', 'openstack share mount', 'openstack volume attach'], c: 0, e: 'Access rules grant mount permission.' },
      ],
    },
    // ------------------------------------------------------------ 4 Demeter
    {
      id: 'pan-demeter', n: 4, place: 'Granaries of Demeter', title: 'Keeping the Harvest',
      subtitle: 'Freezer (backup and restore) and Storlets (compute inside object storage)',
      tier: 'Service', relic: { name: 'Sheaf of Demeter', desc: 'Your data is stored for the winter and worked where it lies.' },
      myth: 'Demeter filled the granaries so no winter could starve the people. Freezer fills your granaries with backups; Storlets lets you mill the grain right inside the store instead of hauling it out.',
      goals: ['Plan backups with Freezer agents, jobs and storage targets', 'Restore a backup', 'Run code next to your data with Storlets'],
      lessons: [
        {
          id: 'freezer', title: 'Freezer: backup, restore and disaster recovery', minutes: 10,
          html: `
<table><tr><th>Component</th><th>Job</th></tr>
<tr><td>freezer-agent</td><td>Does the work on a node: backs up files, databases (MySQL…), Cinder volumes or Nova instances; compresses, encrypts and makes incremental backups</td></tr>
<tr><td>freezer-scheduler</td><td>Runs jobs on each node on a schedule, taking them from the API</td></tr>
<tr><td>freezer-api</td><td>Stores jobs, sessions and backup metadata; multi-tenant</td></tr>
<tr><td>freezer-web-ui</td><td>Horizon plugin</td></tr></table>
${term('a file backup and its restore (agent flags per the Freezer docs)', `
$ freezer-agent --action backup --mode fs --path-to-backup /etc \\
    --container freezer_etc --backup-name etc-daily --storage swift
$ freezer-agent --action restore --container freezer_etc --backup-name etc-daily \\
    --restore-abs-path /restore/etc --storage swift`)}
<p>Backups can go to Swift, S3, a local path or another server over SSH. Jobs combine actions (for example “snapshot the database, then back up the files”) and run on many nodes in a synchronised way.</p>
${note('plain', 'Freezer is a backup robot you can install everywhere and steer from one place: tell it what to copy, where to keep it and how often, then ask it to put things back.')}
${lens({
  sys: 'Always test restores. Freezer records what was backed up; only a restore proves it works.',
  sa: 'Compare Freezer with Cinder backup (volumes only), Ceph RBD mirroring (replication) and commercial backup products when designing DR.',
  pre: 'An open-source backup service in the platform helps answer “how are tenant workloads protected?”.',
})}`,
          sources: [['Freezer documentation', L('freezer')], ['Freezer service overview', L('freezer', 'install/get_started.html')]],
        },
        {
          id: 'storlets', title: 'Storlets: compute inside Swift', minutes: 8,
          html: `
<p><b>Storlets</b> run small pieces of user code (Python or Java) <b>inside Swift</b>, on the proxy or object servers, in isolated Docker sandboxes. You call them with a header on a normal request, so data is transformed where it lives instead of being downloaded first.</p>
${term('ask Swift to shrink an image as it is downloaded', `
# the storlet (thumbnail.py) was uploaded once to the "storlet" container
$ curl -s -H "X-Auth-Token: $OS_TOKEN" -H "X-Run-Storlet: thumbnail.py" \\
    "$SWIFT_URL/photos/aegean-4k.jpg" -o aegean-thumb.jpg`)}
<table><tr><th>Good fits</th><th>Poor fits</th></tr>
<tr><td>Thumbnails, filtering CSV/JSON rows, redaction, metadata extraction, compression</td><td>Long-running or stateful jobs: use VMs, containers or a data platform</td></tr></table>
${lens({
  sa: 'Storlets reduce network transfer for data-heavy pipelines on Swift. Measure the win before adopting.',
  sys: 'Storlets need Docker on the Swift nodes and a controlled image; treat storlet code like any code running on your storage servers.',
})}`,
          sources: [['Storlets documentation', L('storlets')]],
        },
      ],
      quiz: [
        { q: 'Which Freezer component performs the backup on a node?', a: ['freezer-api', 'freezer-agent', 'freezer-web-ui', 'nova-compute'], c: 1, e: 'The agent does the work; the API stores metadata and jobs.' },
        { q: 'What proves a backup works?', a: ['A successful backup log', 'A tested restore', 'Compression', 'Encryption'], c: 1, e: 'Only restores prove backups.' },
        { q: 'How do you invoke a storlet?', a: ['A Nova flavor', 'An X-Run-Storlet header on a Swift request', 'A Heat template', 'A cron job'], c: 1, e: 'Storlets run on normal Swift GET/PUT requests with a header.' },
        { q: 'Why run code inside Swift?', a: ['To avoid moving large data across the network', 'To replace Nova', 'To encrypt tokens', 'To schedule VMs'], c: 0, e: 'Compute moves to the data.' },
      ],
    },
    // ------------------------------------------------------------ 5 Apollo
    {
      id: 'pan-apollo', n: 5, place: 'Temple of Apollo', title: 'Order and Foresight',
      subtitle: 'Heat (orchestration), Blazar (reservations) and Adjutant (self-service admin tasks)',
      tier: 'Service', relic: { name: 'Lyre of Apollo', desc: 'Your cloud keeps order, time and self-service.' },
      myth: 'Apollo brought order, harmony and foresight: his oracle knew what was coming. Heat brings order to whole stacks of resources, Blazar reserves what you will need tomorrow, and Adjutant handles the paperwork of users and quotas.',
      goals: ['Write and update a Heat template', 'Reserve hosts or instances for a future window with Blazar', 'Explain what Adjutant automates for users and admins'],
      oracle: ['heat-create-failed'],
      lessons: [
        {
          id: 'heat', title: 'Heat: whole stacks from one template', minutes: 12,
          html: `
<p><b>Heat</b> creates, updates and deletes <b>stacks</b>: groups of resources (networks, servers, volumes, load balancers…) described in a <b>HOT</b> (Heat Orchestration Template) YAML file.</p>
${term('web.yaml', `
heat_template_version: 2021-04-16
parameters:
  key_name: { type: string }
  flavor: { type: string, default: m1.small }
resources:
  net:
    type: OS::Neutron::Net
  subnet:
    type: OS::Neutron::Subnet
    properties: { network: { get_resource: net }, cidr: 10.20.0.0/24 }
  web:
    type: OS::Nova::Server
    properties:
      image: ubuntu-24.04
      flavor: { get_param: flavor }
      key_name: { get_param: key_name }
      networks: [{ network: { get_resource: net } }]
outputs:
  web_ip:
    value: { get_attr: [web, first_address] }`)}
${term('create, inspect, update, delete', `
$ openstack orchestration template validate -t web.yaml
$ openstack stack create -t web.yaml --parameter key_name=voyager web
$ openstack stack event list web
$ openstack stack output show web web_ip
$ openstack stack update -t web.yaml --parameter flavor=m1.medium web   # changes only what differs
$ openstack stack delete web`)}
<p>With <code>OS::Heat::AutoScalingGroup</code> and Aodh alarms, Heat can also scale groups of servers automatically.</p>
${lens({
  sys: 'When a stack fails, <code>openstack stack event list --nested-depth 3</code> shows which resource failed and why.',
  sa: 'Many teams now use Terraform/OpenTofu; Heat remains useful for in-cloud automation and is used by other services (for example Tacker).',
})}`,
          sources: [['Heat documentation', L('heat')], ['HOT template guide', L('heat', 'template_guide/hot_guide.html')], ['Resource types', L('heat', 'template_guide/openstack.html')]],
        },
        {
          id: 'blazar', title: 'Blazar: reserve resources in advance', minutes: 9,
          html: `
<p><b>Blazar</b> reserves capacity for a future time window through <b>leases</b>: whole hosts (<i>physical:host</i>) or a number of instances of a given size (<i>virtual:instance</i>). Research clouds such as Chameleon use it so experiments get guaranteed hardware.</p>
${term('reserve one host with at least 32 vCPUs for three days', `
$ openstack reservation lease create \\
    --reservation resource_type=physical:host,min=1,max=1,hypervisor_properties='[">=", "$vcpus", "32"]' \\
    --start-date "2026-10-01 09:00" --end-date "2026-10-03 18:00" gpu-workshop
$ openstack reservation lease show gpu-workshop
# when the lease starts, boot into it using the reservation id:
$ openstack server create --flavor m1.xlarge --image ubuntu-24.04 --network argo-net \\
    --hint reservation=<reservation-id> exp-01`)}
${note('plain', 'Blazar is a restaurant booking: you reserve a table for Saturday at eight, and nobody else can sit there at that time, even if the restaurant is busy.')}
${lens({
  sys: 'Reserved hosts go into a dedicated aggregate while leased; make sure capacity planning accounts for them.',
  pre: 'Reservations fit training, events and research customers who need guaranteed capacity on specific dates.',
})}`,
          sources: [['Blazar documentation', L('blazar')], ['Host reservation', L('blazar', 'cli/host-reservation.html')], ['Instance reservation', L('blazar', 'cli/instance-reservation.html')]],
        },
        {
          id: 'adjutant', title: 'Adjutant: self-service for users and admins', minutes: 8,
          html: `
<p><b>Adjutant</b> is a workflow service for the everyday admin tasks around Keystone, with an API, optional approval steps and a clear audit trail:</p>
<ul>
<li><b>Sign-up</b> of new customers and projects (optionally requiring approval).</li>
<li><b>Inviting users</b> to a project by email, and listing or managing project users for project admins.</li>
<li><b>Password reset</b> by email token, and <b>email address changes</b> with confirmation.</li>
<li><b>Quota change requests</b> between defined sizes, auto-approved or sent to an admin.</li>
</ul>
<p>Public cloud operators use it (with its Horizon plugin) so customers can manage their own teams without tickets to the operator.</p>
${note('plain', 'Adjutant is a helpful clerk at the front desk: it handles routine requests (new staff, lost passwords, bigger quotas) by the rules you set, and keeps a record of everything.')}
${lens({
  lead: 'Every ticket type Adjutant automates is on-call time saved. Start with password reset and user invites.',
  pa: 'For public or community clouds, self-service sign-up with approval rules is part of the product, not an extra.',
})}`,
          sources: [['Adjutant documentation', L('adjutant')], ['Adjutant features', L('adjutant', 'features.html')]],
        },
      ],
      quiz: [
        { q: 'A Heat template is written in…', a: ['HOT (YAML)', 'HCL', 'JSON Schema only', 'Python'], c: 0, e: 'Heat Orchestration Templates are YAML.' },
        { q: 'Which command shows why a stack failed?', a: ['openstack stack event list', 'openstack server list', 'openstack stack delete', 'openstack catalog list'], c: 0, e: 'Events show each resource’s status and reason.' },
        { q: 'Blazar reserves resources through…', a: ['Leases', 'Quotas', 'Flavors only', 'Security groups'], c: 0, e: 'A lease covers a time window.' },
        { q: 'Which is an Adjutant feature?', a: ['Password reset by email', 'Live migration', 'OVN tracing', 'Ceph replication'], c: 0, e: 'Adjutant automates user and project admin tasks.' },
      ],
    },
    // ------------------------------------------------------------ 6 Athena
    {
      id: 'pan-athena', n: 6, place: 'Council of Athena', title: 'Services for Builders',
      subtitle: 'Trove (databases), Designate (DNS) and Tacker (NFV orchestration)',
      tier: 'Service', relic: { name: 'Aegis of Athena', desc: 'You offer databases, names and network functions as a service.' },
      myth: 'Athena, goddess of wisdom and craft, advised builders and strategists. Her council gives application teams what they need most: databases they do not have to run, names for everything, and orchestration for network functions.',
      goals: ['Launch, back up and replicate a database with Trove', 'Manage zones and automatic records with Designate', 'Explain Tacker’s role in NFV lifecycle management'],
      oracle: ['trove-build'],
      lessons: [
        {
          id: 'trove', title: 'Trove: databases as a service', minutes: 11,
          html: `
<p><b>Trove</b> gives tenants managed databases (MySQL, MariaDB, PostgreSQL and more, per <b>datastore</b>). Each database instance is a Nova VM running a <b>guest agent</b>, which runs the database (as a container inside the VM in recent releases) and takes care of users, backups and replication.</p>
${term('a managed MySQL for the shop', `
$ openstack datastore version list mysql
$ openstack database instance create shop-db --flavor m1.medium --size 20 \\
    --datastore mysql --datastore-version 8.0 --nic net-id=<argo-net-id> \\
    --databases shop --users shopapp:S3cret
$ openstack database instance list
$ openstack database backup create shop-db-nightly --instance shop-db
$ openstack database instance create shop-db-replica --flavor m1.medium --size 20 \\
    --replica-of shop-db --nic net-id=<argo-net-id>`)}
<ul>
<li>The guest agent talks to Trove over RabbitMQ through a <b>management network</b>; if that path is broken, instances stay in BUILD.</li>
<li>Backups are stored in Swift (or S3-compatible storage).</li>
</ul>
${lens({
  sys: 'Build and test the Trove guest image per release; most failures come from the image, the management network or RabbitMQ access.',
  pre: 'Managed databases are one of the most requested “PaaS” features in cloud RFPs.',
  sa: 'For very large or critical databases, compare Trove with dedicated database platforms on bare metal (Ironic).',
})}`,
          sources: [['Trove documentation', L('trove')], ['Trove user guide', L('trove', 'user/index.html')]],
        },
        {
          id: 'designate', title: 'Designate: DNS as a service', minutes: 10,
          html: `
<table><tr><th>Component</th><th>Job</th></tr>
<tr><td>designate-api / central</td><td>API, validation and storage of zones and records</td></tr>
<tr><td>designate-worker / producer</td><td>Pushes changes to DNS servers; periodic tasks</td></tr>
<tr><td>designate-mdns</td><td>Serves zone transfers to the real DNS servers</td></tr>
<tr><td>Backends (pools)</td><td>BIND9, PowerDNS and others answer the actual DNS queries</td></tr></table>
${term('zones, records and reverse DNS', `
$ openstack zone create --email dns@shop.example.com shop.example.com.
$ openstack recordset create --type A --record 203.0.113.50 shop.example.com. www
$ openstack recordset list shop.example.com.
$ openstack ptr record set RegionOne:<floating-ip-id> www.shop.example.com.`)}
${term('automatic records from Neutron', `
$ openstack network set --dns-domain shop.example.com. argo-net
$ openstack port set --dns-name web-01 <port-id>     # → web-01.shop.example.com. is created`)}
${lens({
  net: 'Decide which zones Designate owns and delegate them from the corporate DNS; never let two systems write the same zone.',
  sys: 'Monitor zone status (ACTIVE vs PENDING/ERROR): a stuck zone usually means the backend DNS server cannot be reached.',
})}`,
          sources: [['Designate documentation', L('designate')], ['Designate with Neutron and Nova', L('designate', 'user/neutron-integration.html')], ['Neutron DNS integration', 'https://docs.openstack.org/neutron/latest/admin/config-dns-int-ext-serv.html']],
        },
        {
          id: 'tacker', title: 'Tacker: orchestrating network functions', minutes: 10,
          html: `
<p><b>Tacker</b> manages the lifecycle of <b>virtual network functions (VNFs)</b> and <b>containerised network functions</b> for telecom operators, following the ETSI NFV standards (NFV-SOL APIs). It deploys VNF packages onto a <b>VIM</b>: an OpenStack cloud (through Heat) or a Kubernetes cluster.</p>
${term('from package to running VNF', `
$ openstack vim register --config-file vim-config.yaml --is-default site-a
$ openstack vnf package create
$ openstack vnf package upload --path firewall-vnf.zip <package-id>
$ openstack vnflcm create <vnfd-id>
$ openstack vnflcm instantiate <vnf-instance-id> instantiate-params.json
$ openstack vnflcm scale --type SCALE_OUT --aspect-id worker <vnf-instance-id>
$ openstack vnflcm heal <vnf-instance-id>`)}
${note('plain', 'A VNF package is like an appliance delivered in a box with its manual (the VNFD). Tacker unpacks it, installs it on the cloud, and later grows, repairs or removes it on request.')}
${lens({
  net: 'NFV workloads need SR-IOV/DPDK, CPU pinning and huge pages: design those host pools before onboarding VNFs.',
  pre: 'Tacker matters in telecom deals where ETSI compliance and vendor-neutral lifecycle management are requirements.',
})}`,
          sources: [['Tacker documentation', L('tacker')], ['Tacker user guide', L('tacker', 'user/index.html')]],
        },
      ],
      quiz: [
        { q: 'What runs inside a Trove database instance besides the database?', a: ['A guest agent', 'Keystone', 'ovn-northd', 'Nothing'], c: 0, e: 'The guest agent manages the datastore on behalf of Trove.' },
        { q: 'Trove instances stuck in BUILD usually point to…', a: ['The guest image or its management network/RabbitMQ path', 'Designate', 'Horizon themes', 'Swift rings'], c: 0, e: 'The guest agent must reach Trove.' },
        { q: 'Which Designate feature creates DNS records automatically for ports?', a: ['Neutron DNS integration (dns_domain, dns_name)', 'Zone transfers', 'PTR only', 'Pools'], c: 0, e: 'Neutron publishes names to Designate.' },
        { q: 'Tacker follows which standards?', a: ['ETSI NFV (SOL APIs)', 'PCI DSS', 'IEEE 802.1Q only', 'ISO 9001'], c: 0, e: 'Tacker implements ETSI NFV-SOL lifecycle APIs.' },
      ],
    },
    // ------------------------------------------------------------ 7 Themis
    {
      id: 'pan-themis', n: 7, place: 'Scales of Themis', title: 'Measure, Rate and Rebalance',
      subtitle: 'Telemetry (Ceilometer, Aodh, Aetos), CloudKitty (rating) and Watcher (optimisation)',
      tier: 'Service', relic: { name: 'Scales of Themis', desc: 'You measure fairly and balance wisely.' },
      myth: 'Themis held the scales of fair order: every thing weighed, every share just. OpenStack’s telemetry weighs what each tenant uses, CloudKitty turns it into prices, and Watcher rebalances the cloud when the scales tip.',
      goals: ['Describe how Ceilometer, Aodh and Aetos fit together', 'Rate usage with CloudKitty', 'Run a Watcher audit and apply its action plan'],
      oracle: ['alert-storm', 'noisy-neighbor'],
      lessons: [
        {
          id: 'telemetry', title: 'Ceilometer, Aodh and Aetos', minutes: 12,
          html: `
<table><tr><th>Service</th><th>Job</th></tr>
<tr><td><b>Ceilometer</b></td><td>Collects usage per resource (instances, volumes, networks…) from polling agents and service notifications, and publishes it to a storage backend (for example Gnocchi, or Prometheus)</td></tr>
<tr><td><b>Aodh</b></td><td>Alarms on that data: threshold alarms (including PromQL-based <code>prometheus</code> alarms), event alarms and composite alarms, calling webhooks such as Heat scaling policies</td></tr>
<tr><td><b>Aetos</b></td><td>A reverse proxy in front of Prometheus that enforces Keystone authentication and multi-tenancy: members and readers see only their project’s metrics; admins and services (such as Watcher) see all</td></tr></table>
${term('an alarm that scales a stack when CPU is high (sketch)', `
$ openstack alarm create --name web-cpu-high --type prometheus \\
    --query 'avg(rate(ceilometer_cpu{project="<project-id>"}[5m]))' \\
    --threshold 0.8 --comparison-operator gt \\
    --alarm-action "<heat scale-out webhook URL>"
$ openstack alarm list
$ openstack alarm-history show <alarm-id>`)}
<p class="small muted">Metric names depend on how Ceilometer publishes to Prometheus in your deployment; check them before writing alarms. Gnocchi, a common historical backend, is developed outside OpenStack governance.</p>
${lens({
  sys: 'Telemetry for tenants (Ceilometer/Aodh/Aetos) is different from monitoring for operators (the Argus epic); many clouds run both, sometimes on one Prometheus.',
  sa: 'Aetos makes it safe to give tenants PromQL access to their own metrics through the same Keystone identities.',
})}`,
          sources: [['Ceilometer documentation', L('ceilometer')], ['Aodh alarms', L('aodh', 'admin/telemetry-alarms.html')], ['Aetos documentation', L('aetos')]],
        },
        {
          id: 'cloudkitty', title: 'CloudKitty: rating and chargeback', minutes: 9,
          html: `
<p><b>CloudKitty</b> turns metered usage into <b>rated</b> data (prices) per project, for showback, chargeback or a billing system. It collects metrics (from Gnocchi or Prometheus), applies <b>rating modules</b> and stores the result.</p>
${term('price instances by flavor with the hashmap module', `
$ openstack rating module enable hashmap
$ openstack rating hashmap service create instance
$ openstack rating hashmap field create <service-id> flavor_name
$ openstack rating hashmap mapping create --field-id <field-id> --value m1.medium -t flat 0.10
$ openstack rating summary get`)}
<p>CloudKitty rates; it does not invoice. Taxes, currencies and invoices belong to a billing system fed by CloudKitty.</p>
${lens({
  pre: 'Showback reports per project make a private cloud’s value visible to business units.',
  pa: 'Agree the unit prices with finance: they drive behaviour (for example cheaper spot-like capacity, pricier GPUs).',
})}`,
          sources: [['CloudKitty documentation', L('cloudkitty')], ['FinOps Framework: invoicing and chargeback', 'https://www.finops.org/framework/capabilities/invoicing-chargeback/']],
        },
        {
          id: 'watcher', title: 'Watcher: optimising the cloud', minutes: 10,
          html: `
<p><b>Watcher</b> analyses the cloud against a <b>goal</b> (server consolidation, workload balancing, saving energy…) using a <b>strategy</b> and live metrics, then proposes an <b>action plan</b> (live migrations, disabling idle hosts) that you review and apply.</p>
${term('consolidate VMs to free hosts', `
$ openstack optimize goal list
$ openstack optimize audittemplate create consolidate server_consolidation --strategy vm_workload_consolidation
$ openstack optimize audit create -a consolidate
$ openstack optimize actionplan list
$ openstack optimize actionplan show <plan-uuid>
$ openstack optimize actionplan start <plan-uuid>`)}
<p>Watcher reads metrics from a data source such as Prometheus (through Aetos in recent releases) or Gnocchi. Gazpacho’s parallel live migrations make applying plans faster.</p>
${note('plain', 'Watcher is a tidy-up advisor: it looks at how full each shelf is and suggests moving boxes so some shelves can be switched off or none is overloaded. You approve the plan before anything moves.')}
${lens({
  sys: 'Start with audits in advisory mode; review plans before enabling automatic execution.',
  pa: 'Consolidation can cut power and licence costs; balance it against the HA headroom you promised.',
})}`,
          sources: [['Watcher documentation', L('watcher')], ['Server consolidation strategy', L('watcher', 'strategies/basic-server-consolidation.html')], ['Watcher CLI', 'https://docs.openstack.org/python-openstackclient/latest/cli/plugin-commands/watcher.html']],
        },
      ],
      quiz: [
        { q: 'What does Aetos add in front of Prometheus?', a: ['Compression', 'Keystone authentication and per-project multi-tenancy', 'Alert routing', 'Dashboards'], c: 1, e: 'Members see only their project’s metrics.' },
        { q: 'Which service raises alarms on telemetry and can call Heat scaling policies?', a: ['Aodh', 'Ceilometer', 'CloudKitty', 'Blazar'], c: 0, e: 'Aodh evaluates alarms and calls actions.' },
        { q: 'CloudKitty…', a: ['Issues invoices and taxes', 'Rates usage into prices; billing is done elsewhere', 'Schedules VMs', 'Stores images'], c: 1, e: 'Rating only.' },
        { q: 'What does Watcher produce from an audit?', a: ['An action plan to review and start', 'A new flavor', 'A lease', 'A DNS zone'], c: 0, e: 'Action plans contain migrations and host changes.' },
      ],
    },
    // ------------------------------------------------------------ 8 Olympus gates
    {
      id: 'pan-olympus', n: 8, place: 'Gates of Olympus', title: 'Guardians and Front Doors',
      subtitle: 'Masakari (instance high availability), Horizon and Skyline (dashboards)',
      tier: 'Service', relic: { name: 'Keys to Olympus', desc: 'You guard workloads and open the cloud to its users.' },
      myth: 'The gates of Olympus were clouds kept by the Horae, who opened them for the worthy and closed them against storms. Masakari keeps workloads alive through storms; Horizon and Skyline are the gates through which people enter.',
      goals: ['Protect instances with Masakari segments and recovery methods', 'Operate and extend Horizon', 'Offer Skyline as a modern console'],
      lessons: [
        {
          id: 'masakari', title: 'Masakari: instance high availability', minutes: 10,
          html: `
<table><tr><th>Monitor</th><th>Detects</th></tr>
<tr><td>host monitor</td><td>A compute node that died (through Pacemaker/Corosync)</td></tr>
<tr><td>instance monitor</td><td>A VM that crashed (libvirt events)</td></tr>
<tr><td>process monitor</td><td>A critical process on the host that stopped (for example nova-compute)</td></tr></table>
<p>Notifications go to <b>masakari-engine</b>, which recovers according to the <b>failover segment</b>’s method: <code>auto</code> (evacuate anywhere), <code>reserved_host</code> (to spare hosts), or combinations such as <code>auto_priority</code>.</p>
${term('protect a group of hosts', `
$ openstack segment create zone-a auto COMPUTE
$ openstack segment host create cmp-01 COMPUTE SSH <segment-id>
$ openstack segment host create cmp-02 COMPUTE SSH <segment-id>
$ openstack notification list
# per-instance protection by the instance monitor:
$ openstack server set --property HA_Enabled=True web-01`)}
${note('warn', 'Evacuation rebuilds VMs on another host. Without shared storage (Ceph, NFS), local disks are lost. Make sure fencing is reliable, so a host that is only unreachable cannot keep writing to the same disks.')}
${lens({
  pre: 'Masakari answers the VMware HA question: automatic restart of VMs after a host failure.',
  sa: 'Combine Masakari (platform HA) with anti-affinity and load balancers (application HA) for critical services.',
})}`,
          sources: [['Masakari documentation', L('masakari')], ['masakari-monitors', L('masakari-monitors')]],
        },
        {
          id: 'dashboards', title: 'Horizon and Skyline', minutes: 9,
          html: `
<table><tr><th></th><th>Horizon</th><th>Skyline</th></tr>
<tr><td>Technology</td><td>Django (Python), server-rendered</td><td>React console plus skyline-apiserver</td></tr>
<tr><td>Strength</td><td>Complete, with plugins for most services (Octavia, Manila, Designate, Trove, Magnum…)</td><td>Faster, modern interface; good for large projects</td></tr>
<tr><td>Deploy with Kolla-Ansible</td><td><code>enable_horizon</code> plus per-service plugin switches</td><td><code>enable_skyline</code></td></tr></table>
<ul>
<li>Brand them (logo, colours, links to your documentation and status page).</li>
<li>Enable federation (single sign-on through OIDC or SAML) so users log in with corporate accounts.</li>
<li>Serve them only over TLS on the public VIP; set session timeouts to match your security policy.</li>
</ul>
${note('plain', 'The dashboards are the front door, not the house: everything they do goes through the same public APIs as the CLI. If the API refuses, the dashboard can only show the error.')}
${lens({
  sys: 'A slow dashboard is usually a slow API behind it: check API latency before tuning Horizon.',
  pre: 'Show the dashboard in demos, then show the same action with the CLI or Terraform: it proves there is no lock-in.',
})}`,
          sources: [['Horizon documentation', L('horizon')], ['Skyline console', L('skyline-console')], ['Skyline API server', L('skyline-apiserver')]],
        },
      ],
      quiz: [
        { q: 'Which Masakari recovery method evacuates instances to spare hosts only?', a: ['auto', 'reserved_host', 'rh_none', 'migrate'], c: 1, e: 'reserved_host uses hosts kept free for recovery.' },
        { q: 'Why does evacuation need shared storage to keep disks?', a: ['It does not', 'Local ephemeral disks stay on the failed host', 'For speed only', 'Keystone requires it'], c: 1, e: 'Without shared storage, VMs are rebuilt with fresh disks.' },
        { q: 'Skyline is built with…', a: ['Django', 'React plus a separate API server', 'PHP', 'Go templates'], c: 1, e: 'skyline-console (React) and skyline-apiserver.' },
        { q: 'A dashboard page is slow. What do you check first?', a: ['The CSS', 'The latency of the API it calls', 'The logo', 'The browser zoom'], c: 1, e: 'Dashboards are API clients.' },
      ],
    },
  ],
};
