// The Oracle: branching troubleshooting trials.
// Each node: { text, out? (terminal output), choices: [{ t, go } | { t, wrong }] }
// A final node has { end: true, text, lesson }.

export const SCENARIOS = [
  {
    id: 'no-valid-host',
    title: 'The Cave Has No Room',
    difficulty: 2,
    tags: ['Nova', 'Placement'],
    summary: 'A project cannot boot any new m1.xlarge instances: "No valid host was found".',
    start: 'a',
    nodes: {
      a: {
        text: 'The team "argonauts" reports that every new <code>m1.xlarge</code> (8 vCPU, 32 GB) fails. Smaller flavors still work. What do you do first?',
        out: `$ openstack server show app-07 -c status -c fault -f yaml
status: ERROR
fault:
  code: 500
  message: No valid host was found. There are not enough hosts available.`,
        choices: [
          { t: 'Restart nova-scheduler on all controllers.', wrong: 'Restarting hides evidence and rarely fixes capacity. The scheduler is up — it just found no host.' },
          { t: 'Ask Placement directly whether any host can satisfy 8 VCPU + 32768 MB.', go: 'b' },
          { t: 'Increase the project quota.', wrong: 'Quota errors return HTTP 403 "Quota exceeded" at the API, not "No valid host".' },
        ],
      },
      b: {
        text: 'Placement returns no allocation candidates for this request. Smaller requests return several. Where next?',
        out: `$ openstack allocation candidate list --resource VCPU=8 --resource MEMORY_MB=32768
(empty)
$ openstack allocation candidate list --resource VCPU=2 --resource MEMORY_MB=4096 -f value | wc -l
14`,
        choices: [
          { t: 'Look at inventories and usage of the hypervisors to see which resource is exhausted.', go: 'c' },
          { t: 'Check Neutron agents.', wrong: 'Placement filtering happens before any network work. Stay on capacity.' },
        ],
      },
      c: {
        text: 'You inspect a typical host. What stands out?',
        out: `$ openstack resource provider inventory list cmp-03 -c resource_class -c total -c reserved -c allocation_ratio
+----------------+--------+----------+------------------+
| resource_class |  total | reserved | allocation_ratio |
+----------------+--------+----------+------------------+
| VCPU           |     64 |        0 |              4.0 |
| MEMORY_MB      | 257024 |     8192 |              1.0 |
| DISK_GB        |   1800 |        0 |              1.0 |
+----------------+--------+----------+------------------+
$ openstack resource provider usage show cmp-03
+----------------+--------+
| resource_class |  usage |
+----------------+--------+
| VCPU           |    118 |
| MEMORY_MB      | 229376 |
| DISK_GB        |    620 |
+----------------+--------+`,
        choices: [
          { t: 'VCPU is exhausted: 118 of 64 used.', wrong: 'Capacity is total × ratio = 256 VCPU; 118 is fine.' },
          { t: 'MEMORY_MB: only ~19 GB free (257024 − 8192 − 229376). A 32 GB instance cannot fit on this host.', go: 'd' },
          { t: 'DISK_GB is full.', wrong: '620 of 1800 GB is used — plenty left.' },
        ],
      },
      d: {
        text: 'All 14 hosts show between 6 and 24 GB of free RAM: the pool is fragmented. Total free RAM across the cloud is ~220 GB, but no single host has 32 GB. What is the best course of action?',
        choices: [
          { t: 'Set ram_allocation_ratio to 1.5 so the flavor fits.', wrong: 'Memory overcommit risks swapping and OOM kills for every tenant. Treat it as a last resort with eyes open.' },
          { t: 'Short-term: live-migrate small instances to consolidate free RAM on a few hosts. Long-term: add capacity and configure the weigher to pack (not spread) memory.', go: 'e' },
          { t: 'Delete cell0 to free up space.', wrong: 'cell0 only stores failed instance records and has nothing to do with capacity.' },
        ],
      },
      e: {
        end: true,
        text: 'You consolidate by live-migrating a handful of small VMs, freeing two hosts with 64 GB each. The xlarge instances boot. You add a capacity alert on <b>largest free slot per flavor</b> and adjust <code>ram_weight_multiplier</code> to a negative value to stack workloads.',
        lesson: '“No valid host” is a capacity or constraint question. Ask Placement directly, compute free = (total − reserved) × ratio − used per host, and watch for fragmentation — cloud-wide averages lie.',
      },
    },
  },

  {
    id: 'dhcp-silence',
    title: 'The Silence of the Harbour',
    difficulty: 2,
    tags: ['Neutron', 'OVN'],
    summary: 'New VMs on some hosts boot to ACTIVE but never get an IP address.',
    start: 'a',
    nodes: {
      a: {
        text: 'New Ubuntu VMs are ACTIVE, but SSH times out. The console log shows cloud-init waiting. What is your first check?',
        out: `$ openstack console log show web-14 | grep -iE "dhcp|ci-info"
[  12.341] cloud-init[512]: DHCPv4 request on ens3 ... no lease, forgoing.
ci-info: +++++++++++++++++Net device info++++++++++++++++++
ci-info: | ens3 | False | . | . | fa:16:3e:21:7b:c4 |`,
        choices: [
          { t: 'Add an SSH rule to the security group.', wrong: 'The VM has no IP at all; security groups are not the first problem.' },
          { t: 'Check the Neutron port status and which host it is bound to.', go: 'b' },
          { t: 'Rebuild the image.', wrong: 'Older VMs from the same image work. The image is fine.' },
        ],
      },
      b: {
        text: 'The port is DOWN and bound to cmp-07. Other failing VMs are also on cmp-07 and cmp-09. What next?',
        out: `$ openstack port list --server web-14 -c ID -c Status
| 5d2c7a1e-... | DOWN |
$ openstack port show 5d2c7a1e-... -c binding_host_id -c binding_vif_type
| binding_host_id  | cmp-07 |
| binding_vif_type | ovs    |`,
        choices: [
          { t: 'List network agents for the affected hosts.', go: 'c' },
          { t: 'Restart neutron-server.', wrong: 'Ports on other hosts go ACTIVE, so neutron-server works. Look at the hosts.' },
        ],
      },
      c: {
        text: 'Agents on the affected hosts:',
        out: `$ openstack network agent list --host cmp-07
+-------------+----------------------+--------+-------+-------+
| ID          | Agent Type           | Host   | Alive | State |
+-------------+----------------------+--------+-------+-------+
| 8f1a...     | OVN Controller agent | cmp-07 | XXX   | UP    |
| 3c2e...     | OVN Metadata agent   | cmp-07 | :-)   | UP    |
+-------------+----------------------+--------+-------+-------+`,
        choices: [
          { t: 'The OVN controller on cmp-07 is not alive. Inspect ovn-controller on the host.', go: 'd' },
          { t: 'The metadata agent is the problem.', wrong: 'Metadata is alive; the port cannot even get DHCP, which ovn-controller implements locally.' },
        ],
      },
      d: {
        text: 'On cmp-07:',
        out: `$ sudo docker logs --tail 5 ovn_controller
2026-09-25T09:14:02Z|00031|reconnect|INFO|ssl:10.0.0.11:6642: connecting...
2026-09-25T09:14:02Z|00032|stream_ssl|WARN|SSL_connect: error:0A000086:SSL routines::certificate verify failed
2026-09-25T09:14:03Z|00033|reconnect|INFO|ssl:10.0.0.11:6642: connection attempt failed (Protocol error)`,
        choices: [
          { t: 'The SB DB TLS certificate cannot be verified. Check certificate expiry and the CA bundle on cmp-07.', go: 'e' },
          { t: 'Open port 6642 on the firewall.', wrong: 'The TCP connection succeeds; TLS verification fails.' },
        ],
      },
      e: {
        end: true,
        text: 'The OVN client certificates on cmp-07 and cmp-09 were issued before a CA rotation and not redeployed (those hosts were in maintenance). You redeploy certs with the deployment tool, restart ovn_controller, the agents turn alive and the ports go ACTIVE. You add certificate-expiry and agent-liveness alerts.',
        lesson: 'DHCP in OVN is served by ovn-controller on the local chassis. "No lease" on a subset of hosts → check port binding host → agent liveness on that host → ovn-controller logs.',
      },
    },
  },

  {
    id: 'floating-ip',
    title: 'The Unreachable Shore',
    difficulty: 1,
    tags: ['Neutron', 'Security groups'],
    summary: 'A VM has a floating IP but cannot be pinged or reached over SSH.',
    start: 'a',
    nodes: {
      a: {
        text: 'The VM <code>web-01</code> is ACTIVE with fixed IP 10.10.0.11 and floating IP 203.0.113.50. Ping and SSH from the office time out. Where do you start?',
        choices: [
          { t: 'Check the security groups on the VM\'s port.', go: 'b' },
          { t: 'Reboot the VM.', wrong: 'Rebooting without a hypothesis rarely helps and loses in-memory state.' },
          { t: 'Replace the floating IP.', wrong: 'The address is not the issue until you know the path is permitted.' },
        ],
      },
      b: {
        text: 'The security groups on the port:',
        out: `$ openstack server show web-01 -c security_groups
| security_groups | name='default' |
$ openstack security group rule list default -c "IP Protocol" -c "Port Range" -c Direction -c "Remote Security Group"
+-------------+------------+-----------+-----------------------+
| IP Protocol | Port Range | Direction | Remote Security Group |
+-------------+------------+-----------+-----------------------+
| None        |            | egress    | None                  |
| None        |            | egress    | None                  |
| None        |            | ingress   | default               |
| None        |            | ingress   | default               |
+-------------+------------+-----------+-----------------------+`,
        choices: [
          { t: 'Ingress is only allowed from members of "default". Add rules for ICMP and TCP 22 from the office CIDR.', go: 'c' },
          { t: 'Egress is blocked.', wrong: 'Egress is allowed for IPv4 and IPv6.' },
        ],
      },
      c: {
        text: 'You added the rules. Ping now works, but SSH says "Permission denied (publickey)".',
        out: `$ openstack security group rule create default --protocol icmp --remote-ip 198.51.100.0/24
$ openstack security group rule create default --protocol tcp --dst-port 22 --remote-ip 198.51.100.0/24
$ ssh ubuntu@203.0.113.50
ubuntu@203.0.113.50: Permission denied (publickey).`,
        choices: [
          { t: 'Check whether cloud-init could fetch the key from the metadata service (console log).', go: 'd' },
          { t: 'Disable port security.', wrong: 'Networking now works. This is an authentication problem.' },
        ],
      },
      d: {
        text: 'The console log shows:',
        out: `$ openstack console log show web-01 | grep -i 169.254
url_helper.py[WARNING]: Calling 'http://169.254.169.254/2009-04-04/meta-data/instance-id' failed [50/120s]: request error [HTTPConnectionPool(...): Max retries exceeded]`,
        choices: [
          { t: 'Metadata is unreachable. Check the OVN metadata agent on the VM\'s host and, meanwhile, rebuild with --config-drive true.', go: 'e' },
          { t: 'Create a new keypair.', wrong: 'The key never reached the VM; a new key would not either.' },
        ],
      },
      e: {
        end: true,
        text: 'The ovn-metadata-agent on the host had crashed after an OOM event. Restarting it (and reserving host memory properly) fixes metadata; new VMs get keys. You teach the team the three-layer check: security group → metadata/keys → routing/NAT.',
        lesson: 'Unreachable VMs are usually security groups first, metadata/keys second, routing/NAT third. The console log tells you which.',
      },
    },
  },

  {
    id: 'mtu-hang',
    title: 'The Silent Current',
    difficulty: 3,
    tags: ['Neutron', 'MTU', 'Fabric'],
    summary: 'SSH connects, but apt update and HTTPS downloads hang forever.',
    start: 'a',
    nodes: {
      a: {
        text: 'Users can SSH into VMs, and small commands work. But <code>apt update</code> stalls at 0%, <code>git clone</code> hangs, and large web pages never finish loading. This started after a new tenant network was created with a custom MTU. What is your hypothesis?',
        choices: [
          { t: 'DNS is broken.', wrong: 'Name resolution succeeds (the connections start). Something breaks only on large transfers.' },
          { t: 'Packets larger than the path MTU are dropped: small packets pass, full-size ones die silently.', go: 'b' },
          { t: 'The router is overloaded.', wrong: 'Overload would affect small and large packets, and other networks too.' },
        ],
      },
      b: {
        text: 'Test with the DF (don\'t fragment) bit from inside the VM:',
        out: `$ ip link show ens3 | grep mtu
2: ens3: <BROADCAST,MULTICAST,UP> mtu 1500 qdisc fq_codel state UP
$ ping -M do -s 1472 -c 2 9.9.9.9
PING 9.9.9.9 (9.9.9.9) 1472(1500) bytes of data.
--- 9.9.9.9 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss
$ ping -M do -s 1414 -c 2 9.9.9.9
64 bytes from 9.9.9.9: icmp_seq=1 ttl=54 time=3.1 ms`,
        choices: [
          { t: 'The VM uses MTU 1500 but the path only carries 1442-byte packets. Check the network MTU in Neutron.', go: 'c' },
          { t: 'Increase the VM MTU to 9000.', wrong: 'That makes the problem worse: even larger frames would be dropped.' },
        ],
      },
      c: {
        text: 'The network\'s MTU:',
        out: `$ openstack network show analytics-net -c mtu
| mtu | 1500 |
# neutron.conf: global_physnet_mtu = 1500 ; underlay MTU = 1500 ; overlay = geneve`,
        choices: [
          { t: 'The network was forced to 1500 on a 1500-byte underlay with Geneve (58 bytes overhead). Fix: set the network MTU to 1442, or raise the underlay to jumbo frames and global_physnet_mtu to 9000.', go: 'd' },
          { t: 'Geneve has no overhead, so 1500 is right.', wrong: 'Geneve encapsulation adds up to 58 bytes over IPv4.' },
        ],
      },
      d: {
        end: true,
        text: 'Short term, you set <code>openstack network set --mtu 1442 analytics-net</code> and renew DHCP leases (or reboot VMs) so guests learn the new MTU. Long term, the network team enables 9000 MTU on the fabric, you set <code>global_physnet_mtu = 9000</code>, and tenants get a full 1500 by default.',
        lesson: 'Small packets work, large ones hang → think MTU. Test with ping -M do -s, compute overlay overhead (Geneve 58, VXLAN 50), and fix the underlay rather than forcing tenant MTUs.',
      },
    },
  },

  {
    id: 'keystone-401',
    title: 'The Keys of Aeolus',
    difficulty: 3,
    tags: ['Keystone', 'HA'],
    summary: 'After a controller rebuild, about a third of API calls fail with 401 Unauthorized.',
    start: 'a',
    nodes: {
      a: {
        text: 'controller-3 was rebuilt yesterday. Since then, roughly one in three CLI calls fails with <code>HTTP 401</code>, across all services. Retries sometimes succeed. What pattern does "one in three" suggest?',
        choices: [
          { t: 'Load balancing across three Keystone backends, one of which behaves differently.', go: 'b' },
          { t: 'Users typing wrong passwords.', wrong: 'The failures are random and affect service-to-service calls too.' },
          { t: 'The database is corrupt.', wrong: 'A corrupt DB would fail consistently, not one in three.' },
        ],
      },
      b: {
        text: 'You compare the Fernet key repositories:',
        out: `$ for h in ctl-01 ctl-02 ctl-03; do echo "== $h"; ssh $h sudo ls /etc/kolla/keystone/fernet-keys 2>/dev/null || ssh $h sudo docker exec keystone ls /etc/keystone/fernet-keys; done
== ctl-01
0 1 2 3
== ctl-02
0 1 2 3
== ctl-03
0 1`,
        choices: [
          { t: 'ctl-03 has different (fresh) keys. Tokens issued on ctl-01/02 cannot be decrypted on ctl-03 and vice versa.', go: 'c' },
          { t: 'Key count does not matter.', wrong: 'The keys must be identical on every node; ctl-03 generated its own.' },
        ],
      },
      c: {
        text: 'How do you fix it safely?',
        choices: [
          { t: 'Copy the key repository from ctl-01 to ctl-03 (same ownership/permissions) or run the deployment tool\'s Fernet sync, then restart Keystone on ctl-03.', go: 'd' },
          { t: 'Run keystone-manage fernet_setup on all three nodes.', wrong: 'That generates new keys everywhere and invalidates all existing tokens — and still leaves them different.' },
        ],
      },
      d: {
        end: true,
        text: 'After syncing keys the 401s stop. You also check NTP (clock skew causes similar symptoms), add a check that hashes the key repositories on each controller, and update the rebuild runbook to run the deployment tool\'s keystone role (which distributes keys) before adding the node back into HAProxy.',
        lesson: 'Intermittent 401s proportional to the number of controllers point to inconsistent Fernet keys (or clock skew) on one node.',
      },
    },
  },

  {
    id: 'volume-attaching',
    title: 'The Amphora Will Not Open',
    difficulty: 3,
    tags: ['Cinder', 'Nova', 'Ceph'],
    summary: 'Volumes attach fine on most hosts but stay "attaching" and roll back on two new hypervisors.',
    start: 'a',
    nodes: {
      a: {
        text: 'Two freshly added computes (cmp-21, cmp-22) cannot attach Ceph volumes. The volume goes <code>attaching</code> then back to <code>available</code>. Instances on older hosts are fine. Where is the fault most likely?',
        choices: [
          { t: 'cinder-volume on the controllers.', wrong: 'cinder-volume serves the old hosts fine; the difference is on the new computes.' },
          { t: 'On the new computes: the connection from nova-compute/os-brick/libvirt to Ceph.', go: 'b' },
        ],
      },
      b: {
        text: 'nova-compute log on cmp-21:',
        out: `ERROR nova.virt.libvirt.driver [req-9a1c...] Failed to attach volume at mountpoint: /dev/vdb:
libvirt.libvirtError: internal error: unable to execute QEMU command 'blockdev-add':
error connecting: Permission denied`,
        choices: [
          { t: 'Check the libvirt secret for the Ceph client key on this host.', go: 'c' },
          { t: 'Increase the volume size.', wrong: 'Size is not related to a permission denied from Ceph.' },
        ],
      },
      c: {
        text: 'Libvirt secrets:',
        out: `$ sudo docker exec nova_libvirt virsh secret-list
 UUID                                   Usage
-------------------------------------------------------------------
 (none)
# old host:
 457eb676-33da-42ec-9a8c-9293d545c337   ceph client.cinder secret`,
        choices: [
          { t: 'The libvirt secret (rbd_secret_uuid with the client.cinder key) was never created on the new hosts. Re-run the deployment for these hosts so the secret and keyring are installed.', go: 'd' },
          { t: 'Recreate the Ceph pool.', wrong: 'The pool is fine; other hosts use it.' },
        ],
      },
      d: {
        end: true,
        text: 'The new hosts were deployed with <code>--limit</code> but the Ceph keyring files were missing from the config overrides directory on the deployment host. After adding them and re-running the deploy for cmp-21/22, the libvirt secret exists and attaches succeed. You add a post-deploy test that attaches a volume on every new compute.',
        lesson: 'When a problem affects only new or changed hosts, diff them against a working host: keyrings, secrets, packages, config, kernel.',
      },
    },
  },

  {
    id: 'rabbit-partition',
    title: 'The Whirlpool of Messages',
    difficulty: 4,
    tags: ['RabbitMQ', 'HA', 'Nova'],
    summary: 'Compute services flap between up and down; builds time out with MessagingTimeout.',
    start: 'a',
    nodes: {
      a: {
        text: 'After a network maintenance on the controller switches, <code>openstack compute service list</code> shows random computes flapping to <code>down</code>. New builds hang and conductor logs show <code>MessagingTimeout</code>. Which component do you suspect first?',
        choices: [
          { t: 'The RabbitMQ cluster.', go: 'b' },
          { t: 'Placement.', wrong: 'Placement is a REST service; MessagingTimeout is an RPC/RabbitMQ symptom.' },
          { t: 'Glance.', wrong: 'Builds do not even reach image download.' },
        ],
      },
      b: {
        text: 'Cluster status from rabbit on ctl-01:',
        out: `$ sudo docker exec rabbitmq rabbitmqctl cluster_status
...
Running Nodes
rabbit@ctl-01
rabbit@ctl-02
Network Partitions
Node rabbit@ctl-01 cannot communicate with rabbit@ctl-03
Node rabbit@ctl-02 cannot communicate with rabbit@ctl-03`,
        choices: [
          { t: 'A network partition happened during maintenance and ctl-03 is isolated in its own view of the cluster. Services connected to ctl-03 publish to queues nobody consumes.', go: 'c' },
          { t: 'Everything is fine; partitions are normal.', wrong: 'A partition means two views of the queues; messages are lost or stuck.' },
        ],
      },
      c: {
        text: 'What is the right recovery?',
        choices: [
          { t: 'Restart the minority node (ctl-03) so it rejoins the majority; verify cluster_status shows no partitions and queue leaders are healthy.', go: 'd' },
          { t: 'Delete all queues on all nodes.', wrong: 'This loses in-flight messages and forces every service to reconnect at once. Not a first step.' },
          { t: 'Restart ctl-01 and ctl-02.', wrong: 'Those are the majority side; restarting them makes things worse.' },
        ],
      },
      d: {
        text: 'The cluster heals and services stabilise. What prevents a repeat?',
        choices: [
          { t: 'Use quorum queues and the pause_minority partition-handling strategy, and ensure maintenance does not isolate a single controller.', go: 'e' },
          { t: 'Run RabbitMQ on a single node.', wrong: 'That removes HA entirely.' },
        ],
      },
      e: {
        end: true,
        text: 'You confirm <code>cluster_partition_handling = pause_minority</code>, migrate to quorum queues (the Kolla default for new deployments), add alerts on partitions and unacknowledged message growth, and add a "RabbitMQ health" step to the network maintenance checklist.',
        lesson: 'MessagingTimeout + flapping services = inspect the message bus first. Partitions heal by restarting the minority side; quorum queues and pause_minority prevent split brain.',
      },
    },
  },

  {
    id: 'live-migration',
    title: 'The Ship That Would Not Move',
    difficulty: 4,
    tags: ['Nova', 'libvirt'],
    summary: 'Live migrations to newly purchased hypervisors fail; migrations between old hosts succeed.',
    start: 'a',
    nodes: {
      a: {
        text: 'You bought newer CPUs (cmp-30..39). Live migration from old hosts to new ones works, but migrating back (new → old) fails. The migration is marked "error" instantly.',
        out: `$ openstack server migration list --server app-3
| Status | Source   | Dest   | Type           |
| error  | cmp-31   | cmp-04 | live-migration |`,
        choices: [
          { t: 'Look at nova-compute logs on the destination (cmp-04).', go: 'b' },
          { t: 'Increase live_migration_bandwidth.', wrong: 'The migration fails immediately, before any memory copying starts.' },
        ],
      },
      b: {
        text: 'On cmp-04:',
        out: `ERROR nova.virt.libvirt.driver ... Unacceptable CPU info: CPU doesn't have compatibility.
the CPU is incompatible with host CPU: Host CPU does not provide required features: avx512f, avx512dq, avx512bw
Refer to http://libvirt.org/html/libvirtLibvirt-host.html#virCPUCompareResult`,
        choices: [
          { t: 'VMs that started on the new hosts expose newer CPU features the old hosts lack. Check cpu_mode in nova.conf.', go: 'c' },
          { t: 'Libvirt TLS certificates are wrong.', wrong: 'TLS problems produce connection errors, not CPU compatibility errors.' },
        ],
      },
      c: {
        text: 'nova.conf on the new hosts has <code>cpu_mode = host-passthrough</code>. What is the durable fix?',
        choices: [
          { t: 'Use cpu_mode = custom with a common baseline model (e.g. the oldest generation) via cpu_models on all hosts in the migration domain, or split old and new hosts into separate aggregates.', go: 'd' },
          { t: 'Disable AVX-512 in the BIOS of new hosts.', wrong: 'Possible, but wastes hardware for everyone; a baseline CPU model achieves compatibility without BIOS changes.' },
        ],
      },
      d: {
        end: true,
        text: 'You set <code>[libvirt] cpu_mode = custom</code> and <code>cpu_models = Cascadelake-Server-noTSX</code> (the oldest generation in the pool) consistently, and create a separate aggregate + flavor for workloads that genuinely need AVX-512. Existing VMs need a cold restart (stop/start) to pick up the new CPU model.',
        lesson: 'Heterogeneous CPU pools need a common baseline CPU model for bidirectional live migration. host-passthrough gives performance, not mobility.',
      },
    },
  },

  {
    id: 'octavia-pending',
    title: 'The Harbour Gate Stuck Half-Open',
    difficulty: 4,
    tags: ['Octavia', 'Neutron'],
    summary: 'New load balancers remain PENDING_CREATE and later go to ERROR.',
    start: 'a',
    nodes: {
      a: {
        text: 'Every new load balancer stays <code>PENDING_CREATE</code> for ~10 minutes, then <code>ERROR</code>. Existing LBs work. What do you check first?',
        choices: [
          { t: 'Octavia worker logs to see where the create flow is waiting.', go: 'b' },
          { t: 'Delete the stuck load balancers directly in the database.', wrong: 'Never edit the DB before understanding the cause; you may leave orphaned amphorae and ports.' },
        ],
      },
      b: {
        text: 'octavia-worker.log:',
        out: `WARNING octavia.amphorae.drivers.haproxy.rest_api_driver [-] Could not connect to instance. Retrying.: requests.exceptions.ConnectTimeout: HTTPSConnectionPool(host='172.31.0.47', port=9443)
...
ERROR octavia.controller.worker.v2.tasks.amphora_driver_tasks [-] Amphora compute instance failed to become reachable`,
        choices: [
          { t: 'The controller cannot reach the amphora agent on the lb-mgmt network (port 9443). Check the amphora VM and the lb-mgmt network path.', go: 'c' },
          { t: 'The amphora image is missing.', wrong: 'The amphora VM was created (it has an IP). The problem is connectivity.' },
        ],
      },
      c: {
        text: 'The amphora VM is ACTIVE with IP 172.31.0.47. From the controller, ping fails. The lb-mgmt network is a provider VLAN 400. What changed recently?',
        out: `$ openstack server show amphora-5c1... -c status -c addresses --all-projects
| status    | ACTIVE                     |
| addresses | lb-mgmt-net=172.31.0.47    |
$ ip -br addr show o-hm0
o-hm0   DOWN   172.31.0.2/16`,
        choices: [
          { t: 'The health-manager interface o-hm0 on the controller is DOWN (e.g. after a reboot without its bridge port being restored). Bring it back up persistently.', go: 'd' },
          { t: 'The security group for amphorae blocks 9443.', wrong: 'Possible in general, but here the controller-side interface itself is down.' },
        ],
      },
      d: {
        end: true,
        text: 'The controller had been rebooted; the <code>o-hm0</code> interface (an OVS port on the lb-mgmt network) was created manually and never persisted. You recreate it through the deployment tool (Kolla <code>octavia_network_interface</code>), verify UDP 5555 heartbeats arrive, and failover the stuck LBs with <code>openstack loadbalancer failover</code> after marking them ERROR.',
        lesson: 'Octavia depends on bidirectional connectivity between controllers and amphorae on the lb-mgmt network (TCP 9443 to agents, UDP 5555 heartbeats back). Persist that plumbing with your deployment tool.',
      },
    },
  },

  {
    id: 'noisy-neighbor',
    title: 'The Suitors in the Hall',
    difficulty: 5,
    tags: ['Nova', 'Ceph', 'Performance'],
    summary: 'A tenant\'s database has periodic latency spikes; nothing is "down".',
    start: 'a',
    nodes: {
      a: {
        text: 'A banking tenant reports p99 latency spikes on their PostgreSQL VM every few minutes. CPU on the VM looks normal. Nothing is down. Which layers do you examine?',
        choices: [
          { t: 'Correlate VM-level metrics (steal time, disk await) with host and Ceph metrics at the spike timestamps.', go: 'b' },
          { t: 'Tell the tenant to tune PostgreSQL.', wrong: 'Maybe later — but first prove whether the platform is the cause.' },
        ],
      },
      b: {
        text: 'Inside the VM, <code>iostat</code> shows <code>await</code> jumping from 2 ms to 180 ms during spikes; CPU steal stays near 0%. The volume is on Ceph RBD. What next?',
        out: `$ ceph osd perf | sort -k3 -n | tail -3
osd.41   88   91
osd.17  102  110
osd.12  240  251
$ ceph health detail
HEALTH_WARN 3 slow ops, oldest one blocked for 34 sec, osd.12 has slow ops`,
        choices: [
          { t: 'osd.12 is slow. Check its disk and host: SMART, other daemons on that host, recovery or scrub activity.', go: 'c' },
          { t: 'Increase VM vCPUs.', wrong: 'CPU is not the bottleneck: steal is ~0% and I/O waits are high.' },
        ],
      },
      c: {
        text: 'osd.12 lives on cmp-18 — a hyper-converged node. At each spike, a tenant batch job on cmp-18 saturates memory bandwidth and the OSD\'s CPU. The OSD is starved.',
        choices: [
          { t: 'Reserve CPU and memory for Ceph on HCI nodes (cpu_shared_set / reserved_host_memory_mb, cgroup limits for OSDs) and set QoS on the noisy tenant\'s flavor; consider moving the DB to a dedicated storage tier.', go: 'd' },
          { t: 'Mark osd.12 out permanently.', wrong: 'That triggers a large rebalance and hides the design problem; the next OSD on an HCI host will suffer too.' },
        ],
      },
      d: {
        end: true,
        text: 'You pin OSD daemons to reserved cores, exclude those cores from Nova, set <code>reserved_host_memory_mb</code> to cover OSD memory targets, and add flavor I/O and CPU quotas for batch workloads. Latency spikes disappear. You write an ADR: "Latency-critical tiers run on non-HCI storage".',
        lesson: 'Performance incidents cross layers: guest → hypervisor → storage daemon → shared host resources. Hyper-convergence needs explicit resource reservation.',
      },
    },
  },
  // ---------------------------------------------------------------- Ceph
  {
    id: 'ceph-nearfull',
    title: 'The Flood of Deucalion',
    difficulty: 3,
    tags: ['Ceph', 'Capacity'],
    summary: 'Suddenly, new volumes fail and some VMs freeze on write. Ceph reports HEALTH_ERR.',
    start: 'a',
    nodes: {
      a: {
        text: 'Monday 09:10. Users report that <code>openstack volume create</code> hangs, and several database VMs have frozen writes. The cluster says:',
        out: `$ ceph -s
  cluster:
    health: HEALTH_ERR
            1 full osd(s)
            2 nearfull osd(s)
            3 pool(s) full
  data:
    usage:   212 TiB used, 88 TiB / 300 TiB avail`,
        choices: [
          { t: 'The cluster is only 71% used, so this must be a bug. Restart the monitors.', wrong: 'Limits apply per OSD, not to the cluster average. One full OSD is enough to block writes.' },
          { t: 'Find which OSDs are full and why the data is unevenly spread.', go: 'b' },
          { t: 'Delete old Glance images to free space immediately.', wrong: 'Deleting at random may not free space on the full OSD, and removing parent images can fail because clones depend on them.' },
        ],
      },
      b: {
        text: 'Per-OSD usage:',
        out: `$ ceph osd df tree | sort -k17 -n | tail -4
 ID  CLASS  WEIGHT   REWEIGHT  SIZE    USE     %USE   VAR   PGS  TYPE NAME
 31    hdd  7.27739   1.00000  7.3 TiB 6.2 TiB  85.6  1.21   61      osd.31
 44    hdd  7.27739   1.00000  7.3 TiB 6.3 TiB  86.9  1.23   62      osd.44
 17    hdd  7.27739   1.00000  7.3 TiB 6.9 TiB  95.1  1.34   71      osd.17
$ ceph balancer status
{ "active": false, "mode": "none" }`,
        choices: [
          { t: 'The balancer is off, so a few OSDs hold far more PGs than others. Unblock carefully, then rebalance.', go: 'c' },
          { t: 'Set the full ratio to 0.99 and forget about it.', wrong: 'A small temporary raise can help you act, but leaving it there risks OSDs filling completely, which is very hard to recover from.' },
        ],
      },
      c: {
        text: 'What is the safest sequence?',
        choices: [
          { t: 'Temporarily raise the full ratio slightly (for example 0.96) to let deletes and rebalancing proceed, lower the reweight of osd.17, enable the balancer in upmap mode, then restore the ratio and add capacity.', go: 'd' },
          { t: 'Mark osd.17 out immediately.', wrong: 'Marking it out moves its data onto OSDs that are already nearfull and can push them over the limit too.' },
        ],
      },
      d: {
        end: true,
        text: 'You run <code>ceph osd set-full-ratio 0.96</code>, <code>ceph osd reweight 17 0.90</code>, <code>ceph balancer mode upmap</code> and <code>ceph balancer on</code>. Writes resume, usage evens out to about 74% per OSD within hours, and you restore the full ratio to 0.95. A new storage node is ordered, and an alert on the <i>fullest</i> OSD at 75% is added.',
        lesson: 'Ceph blocks writes when any single OSD reaches the full ratio. Keep the balancer on, alert on the fullest OSD, and treat ratio changes as a temporary lifeline, not a fix.',
      },
    },
  },
  {
    id: 'ceph-qcow2',
    title: 'The Slow Birth of Ships',
    difficulty: 2,
    tags: ['Ceph', 'Glance', 'Nova'],
    summary: 'On a new Ceph-backed cloud, VMs take minutes to boot and the vms pool fills far faster than expected.',
    start: 'a',
    nodes: {
      a: {
        text: 'The new cloud uses Ceph for Glance and Nova. A 20 GB Ubuntu VM takes 4 minutes in <i>spawning</i>, and the <code>vms</code> pool grows by 20 GB per VM. The design promised boots in seconds using copy-on-write clones. What do you check first?',
        choices: [
          { t: 'The format of the Glance images.', go: 'b' },
          { t: 'Add more OSDs for speed.', wrong: 'More disks will not help if every boot copies a full image instead of cloning it.' },
          { t: 'Increase Nova’s vif_plugging_timeout.', wrong: 'The time is spent preparing the disk, not waiting for the network.' },
        ],
      },
      b: {
        text: 'The image details:',
        out: `$ openstack image show ubuntu-24.04 -c disk_format -c size
| disk_format | qcow2      |
| size        | 612368384  |
$ rbd info vms/7d3e…_disk | grep parent
(no output: the disk is a full copy, not a clone)`,
        choices: [
          { t: 'The images are qcow2. RBD can only clone raw images, so Nova downloads, converts and writes a full copy for every VM.', go: 'c' },
          { t: 'The image is too small.', wrong: 'Size is not the problem; the format prevents cloning.' },
        ],
      },
      c: {
        text: 'How do you fix it for new and existing images?',
        choices: [
          { t: 'Convert images to raw (qemu-img convert, or Glance image import with conversion), upload them as raw, and check that show_image_direct_url is enabled in Glance.', go: 'd' },
          { t: 'Switch Nova back to local disks.', wrong: 'That gives up live migration without copying and the other Ceph benefits.' },
        ],
      },
      d: {
        end: true,
        text: 'After re-uploading the images as raw and confirming <code>show_image_direct_url = True</code>, new VMs boot in about 15 seconds and <code>rbd info</code> shows a parent snapshot in the images pool. You add an image-upload check to the golden-image pipeline that rejects qcow2 for this cloud.',
        lesson: 'With Ceph RBD, Glance images must be raw for copy-on-write clones. qcow2 images silently turn every boot into a full download, conversion and copy.',
      },
    },
  },
  // ---------------------------------------------------------------- Kubernetes on OpenStack
  {
    id: 'k8s-lb-pending',
    title: 'The Gate That Would Not Open',
    difficulty: 2,
    tags: ['Kubernetes', 'Octavia', 'OCCM'],
    summary: 'A Kubernetes Service of type LoadBalancer stays <pending> forever on an OpenStack cloud.',
    start: 'a',
    nodes: {
      a: {
        text: 'A team deploys their shop on a new Kubernetes cluster running on OpenStack. The Service has been <code>&lt;pending&gt;</code> for 20 minutes:',
        out: `$ kubectl get svc shop
NAME   TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
shop   LoadBalancer   10.96.41.12    <pending>     443:30814/TCP`,
        choices: [
          { t: 'Look at the Service’s events.', go: 'b' },
          { t: 'Delete and recreate the Service.', wrong: 'Recreating hides the error message you need.' },
          { t: 'Restart CoreDNS.', wrong: 'DNS has nothing to do with creating an external load balancer.' },
        ],
      },
      b: {
        text: 'The events:',
        out: `$ kubectl describe svc shop | tail -4
Events:
  Type     Reason                  Message
  Warning  SyncLoadBalancerFailed  Error syncing load balancer: failed to ensure load balancer:
           error creating loadbalancer: Expected HTTP response code [201 202] ... 403:
           Quota exceeded for resources: ['loadbalancer']`,
        choices: [
          { t: 'The OpenStack project has hit its Octavia load balancer quota. Check usage and quota in that project.', go: 'c' },
          { t: 'The OCCM credentials are wrong.', wrong: 'Wrong credentials give 401 errors. This is a 403 quota error: authentication worked.' },
        ],
      },
      c: {
        text: 'The project has 10 load balancers, the quota is 10, and 6 of them belong to clusters that were deleted last month.',
        out: `$ openstack loadbalancer list --project shop-team -c name -c provisioning_status
| kube_service_old-cluster_default_web  | ACTIVE |
| kube_service_old-cluster_default_api  | ACTIVE |
...`,
        choices: [
          { t: 'Clean up the orphaned load balancers from deleted clusters, then fix the process so cluster deletion removes its Services first.', go: 'd' },
          { t: 'Raise the quota to 100 and move on.', wrong: 'You would keep paying for orphaned load balancers and floating IPs, and hit the new limit later.' },
        ],
      },
      d: {
        end: true,
        text: 'After deleting the 6 orphaned load balancers (and their floating IPs), the Service gets its external IP within two minutes. The team’s cluster-deletion runbook now deletes LoadBalancer Services before deleting the cluster, and a weekly report lists load balancers named <code>kube_service_*</code> whose cluster no longer exists.',
        lesson: 'A pending LoadBalancer is almost always an OpenStack-side error. Read the Service events and OCCM logs; quotas, credentials and wrong network or subnet IDs are the usual causes.',
      },
    },
  },
  {
    id: 'k8s-pvc-pending',
    title: 'The Stable With No Stalls',
    difficulty: 3,
    tags: ['Kubernetes', 'Cinder CSI', 'Availability zones'],
    summary: 'A database pod is stuck because its volume will not attach, but only in one availability zone.',
    start: 'a',
    nodes: {
      a: {
        text: 'A PostgreSQL StatefulSet on a cluster spread across az1 and az2 has one pod stuck in <code>ContainerCreating</code>:',
        out: `$ kubectl describe pod pg-1 | tail -3
  Warning  FailedAttachVolume  attachdetach-controller  AttachVolume.Attach failed for volume "pvc-7b1…":
  rpc error: code = Internal desc = [ControllerPublishVolume] Attach Volume failed with error
  Invalid input received: Invalid volume: Volume availability zone az1 does not match instance az2 (HTTP 400)`,
        choices: [
          { t: 'The volume was created in az1 but the pod was scheduled to a node in az2. Check how the StorageClass binds volumes.', go: 'b' },
          { t: 'Cinder is down.', wrong: 'Cinder answered with a clear 400 error, so it is up.' },
        ],
      },
      b: {
        text: 'The StorageClass:',
        out: `$ kubectl get sc standard -o yaml | grep -E 'provisioner|volumeBindingMode'
provisioner: cinder.csi.openstack.org
volumeBindingMode: Immediate`,
        choices: [
          { t: 'Immediate binding creates the volume before the pod is scheduled, in whatever AZ the driver picks. Use WaitForFirstConsumer so the volume follows the pod’s node.', go: 'c' },
          { t: 'Set cross_az_attach = True in Nova.', wrong: 'That may hide the error, but it creates cross-AZ traffic and defeats the purpose of availability zones.' },
        ],
      },
      c: {
        text: 'The StorageClass is fixed for new volumes. The existing pg-1 volume is still in az1. What now?',
        choices: [
          { t: 'For this pod, schedule it to an az1 node (the PV’s node affinity allows it) or restore its data into a new volume in az2 from a snapshot or backup. Then re-test the StatefulSet across both zones.', go: 'd' },
          { t: 'Delete the PVC and hope.', wrong: 'Deleting the PVC can delete the data. Never do that on a database without a backup.' },
        ],
      },
      d: {
        end: true,
        text: 'With <code>volumeBindingMode: WaitForFirstConsumer</code>, new volumes are created in the zone of the scheduled pod. pg-1 runs again on an az1 node, and the platform’s default StorageClasses are all switched to topology-aware binding.',
        lesson: 'Cinder volumes live in one availability zone. On multi-AZ clusters, StorageClasses must use WaitForFirstConsumer so volumes are created where their pods run.',
      },
    },
  },
  {
    id: 'k8s-mtu',
    title: 'Two Seas on Top of Each Other',
    difficulty: 3,
    tags: ['Kubernetes', 'CNI', 'Neutron', 'MTU'],
    summary: 'Pods on different nodes can ping each other, but large API responses between them hang.',
    start: 'a',
    nodes: {
      a: {
        text: 'On a fresh cluster, health checks pass, but the frontend times out when the backend (on another node) returns big JSON responses. Pods on the same node work fine. Your hypothesis?',
        choices: [
          { t: 'Packets larger than the path allows are dropped between nodes: an MTU problem across the two overlays.', go: 'b' },
          { t: 'The backend is overloaded.', wrong: 'It is fast for pods on the same node; only cross-node large responses fail.' },
          { t: 'CoreDNS is failing.', wrong: 'Name resolution works, since connections start and small calls succeed.' },
        ],
      },
      b: {
        text: 'You compare MTUs:',
        out: `# on a node VM (Neutron network)
$ ip link show ens3 | grep -o 'mtu [0-9]*'
mtu 1442
# inside a pod
$ kubectl exec frontend-7c9 -- cat /sys/class/net/eth0/mtu
1450
$ kubectl -n kube-system get cm calico-config -o yaml | grep -i mtu
  veth_mtu: "1450"`,
        choices: [
          { t: 'The CNI was hard-coded to 1450, but the node network is only 1442 and VXLAN adds 50 bytes. Pod MTU must be at most 1392.', go: 'c' },
          { t: 'Raise the node MTU to 9000 inside the VM.', wrong: 'The VM cannot send more than its Neutron network allows; the fabric would drop the frames.' },
        ],
      },
      c: {
        text: 'What is the durable fix?',
        choices: [
          { t: 'Set the CNI MTU to 1392 (or let it auto-detect), roll the CNI pods, and ideally raise the underlay to jumbo frames so tenants get more headroom.', go: 'd' },
          { t: 'Disable the CNI overlay and hope routing works.', wrong: 'Without encapsulation you also need allowed address pairs or BGP. Do that deliberately, not as a quick fix.' },
        ],
      },
      d: {
        end: true,
        text: 'With the CNI MTU at 1392, large responses flow. The cluster template now leaves MTU to auto-detection, and the network team schedules jumbo frames on the tenant underlay.',
        lesson: 'Kubernetes on OpenStack stacks one overlay on another. Pod MTU = node MTU − CNI overhead. Symptoms are identical to the classic Neutron MTU problem: small works, large hangs.',
      },
    },
  },
  // ---------------------------------------------------------------- OVN
  {
    id: 'ovn-gateway',
    title: 'The Gate with No Keeper',
    difficulty: 3,
    tags: ['OVN', 'Neutron', 'Gateways'],
    summary: 'After adding three new gateway nodes, some routers lose outbound internet while floating IPs keep working.',
    start: 'a',
    nodes: {
      a: {
        text: 'The network team added gw-04, gw-05 and gw-06 and removed two old gateways. Since then, VMs <b>without</b> floating IPs on some projects cannot reach the internet. VMs <b>with</b> floating IPs are fine. Where does outbound traffic without a floating IP leave the cloud?',
        choices: [
          { t: 'Through SNAT on the router’s gateway port, which is scheduled on a gateway chassis.', go: 'b' },
          { t: 'Directly from each compute node.', wrong: 'That is how distributed floating IPs work. Plain SNAT is centralised on a gateway chassis.' },
          { t: 'Through the metadata agent.', wrong: 'Metadata only serves 169.254.169.254 inside the cloud.' },
        ],
      },
      b: {
        text: 'You check where an affected router’s gateway port now lives:',
        out: `$ ovn-nbctl lrp-get-gateway-chassis lrp-4a1c…
lrp-4a1c…_gw-05    3
lrp-4a1c…_gw-04    2
lrp-4a1c…_gw-06    1
$ ovn-sbctl find Port_Binding logical_port=cr-lrp-4a1c… | grep chassis
chassis             : 7e2d… (gw-05)`,
        choices: [
          { t: 'The port is active on gw-05. Compare gw-05’s OVS configuration with a working gateway.', go: 'c' },
          { t: 'Delete and recreate the router.', wrong: 'Destructive, and it hides the cause, which is almost certainly on the new nodes.' },
        ],
      },
      c: {
        text: 'On gw-05 and on an old, working gateway:',
        out: `[gw-05]$ ovs-vsctl get open . external-ids
{hostname=gw-05, ovn-cms-options=enable-chassis-as-gw, ovn-encap-ip="10.0.1.45", ovn-encap-type=geneve, ovn-remote="ssl:10.0.0.11:6642,…"}
[gw-02]$ ovs-vsctl get open . external-ids
{hostname=gw-02, ovn-bridge-mappings="physnet1:br-ex", ovn-cms-options=enable-chassis-as-gw, …}`,
        choices: [
          { t: 'gw-05 has no ovn-bridge-mappings, so it can host gateway ports but has no path to the external network. Add physnet1:br-ex (with br-ex attached to the external NIC).', go: 'd' },
          { t: 'The encap IP is wrong.', wrong: 'Tunnels are fine: traffic reaches gw-05. It just cannot leave towards the external network.' },
        ],
      },
      d: {
        end: true,
        text: 'The new gateways were deployed with a host-vars file that missed the external interface, so no <code>br-ex</code> and no bridge mapping existed. After redeploying them with the right interface, <code>ovn-bridge-mappings=physnet1:br-ex</code> appears and SNAT works again. You add a post-deploy check: every chassis with <code>enable-chassis-as-gw</code> must have a bridge mapping for the external physnet.',
        lesson: 'A gateway chassis needs two things: enable-chassis-as-gw and a bridge mapping to the external network. With only the first, OVN happily schedules routers there that have nowhere to send traffic.',
      },
    },
  },
  {
    id: 'ovn-raft',
    title: 'The Palace without a King',
    difficulty: 4,
    tags: ['OVN', 'RAFT', 'Neutron'],
    summary: 'Port creation fails across the cloud with timeouts after one controller was rebuilt.',
    start: 'a',
    nodes: {
      a: {
        text: 'ctl-03 was reinstalled and redeployed this morning. Now new VMs fail at network setup, and neutron-server logs are full of timeouts talking to the OVN Northbound database. Existing VMs still pass traffic. First step?',
        choices: [
          { t: 'Check the RAFT status of the Northbound cluster on each controller.', go: 'b' },
          { t: 'Restart ovn-controller on every compute node.', wrong: 'Existing traffic works, so the data plane is fine; the problem is where Neutron writes, the NB database.' },
        ],
      },
      b: {
        text: 'Cluster status on ctl-01 and ctl-03:',
        out: `[ctl-01]$ ovn-appctl -t /var/run/ovn/ovnnb_db.ctl cluster/status OVN_Northbound | grep -E 'Role|Leader|Servers' -A3
Role: candidate
Leader: unknown
Servers:
    3c2b (3c2b at tcp:10.0.0.11:6643) (self)
    9d10 (9d10 at tcp:10.0.0.12:6643) last msg 1830 ms ago
    e47a (e47a at tcp:10.0.0.13:6643) last msg 5 h ago
[ctl-03]$ ovn-appctl -t /var/run/ovn/ovnnb_db.ctl cluster/status OVN_Northbound | grep -E 'Cluster ID|Role'
Cluster ID: 51f0 (51f0…)
Role: leader`,
        choices: [
          { t: 'ctl-03 bootstrapped a brand-new single-member cluster (different Cluster ID) instead of rejoining. The original cluster lost a member and is struggling to elect a leader.', go: 'c' },
          { t: 'Everything is fine: ctl-03 is the leader.', wrong: 'ctl-03 leads a different cluster (another Cluster ID). The real cluster has no leader.' },
        ],
      },
      c: {
        text: 'What is the safe recovery?',
        choices: [
          { t: 'Stop the NB database on ctl-03, remove its stray database file, and rejoin it to the existing cluster (join-cluster via the deployment tool). Once the original cluster has a leader, verify with neutron-ovn-db-sync-util in log mode.', go: 'd' },
          { t: 'Make ctl-03’s new cluster the real one and point everything at it.', wrong: 'Its database is empty: you would lose every logical switch, router and port.' },
        ],
      },
      d: {
        end: true,
        text: 'After ctl-03 rejoins the original cluster (same Cluster ID, three members), a leader is elected within seconds, neutron-server stops timing out, and the sync tool reports no differences. The controller-rebuild runbook now says: restore or rejoin OVN databases, never bootstrap a new cluster on a replaced controller.',
        lesson: 'A rebuilt controller must rejoin the existing RAFT clusters. Check Cluster ID, Role and Leader with cluster/status on every member; two different Cluster IDs mean a split you must repair before anything else.',
      },
    },
  },
  // ---------------------------------------------------------------- Monitoring
  {
    id: 'alert-storm',
    title: 'The Storm of Beacons',
    difficulty: 2,
    tags: ['Monitoring', 'Alertmanager'],
    summary: 'One top-of-rack switch fails and the on-call engineer receives 412 pages in five minutes.',
    start: 'a',
    nodes: {
      a: {
        text: '03:12. A top-of-rack switch in rack B dies. 18 hosts go dark. The on-call phone receives 412 separate pages: NodeDown, NovaComputeDown, OVNControllerDown, CephOSDDown, HighLatency… The engineer misses the one about the switch itself. What went wrong?',
        choices: [
          { t: 'Alerts are not grouped, and nothing suppresses consequences when their cause is already alerting.', go: 'b' },
          { t: 'Too few alert rules.', wrong: 'The problem is too many notifications for one failure, not too few rules.' },
          { t: 'The switch should have been monitored by Grafana.', wrong: 'Grafana shows data; the routing of pages is Alertmanager’s job.' },
        ],
      },
      b: {
        text: 'The current Alertmanager route:',
        out: `route:
  receiver: pager
  group_by: ['...']        # every alert is its own group
  group_wait: 0s
  repeat_interval: 5m
inhibit_rules: []`,
        choices: [
          { t: 'Group by alertname and rack or cluster, add a short group_wait, and add inhibition rules: when a switch or host is down, suppress alerts from what sits behind it.', go: 'c' },
          { t: 'Disable paging at night.', wrong: 'Then the switch failure itself would not wake anyone.' },
        ],
      },
      c: {
        text: 'Which inhibition makes sense here?',
        choices: [
          { t: 'Source SwitchDown (or NodeDown) inhibits warning and critical alerts with the same rack (or instance) label.', go: 'd' },
          { t: 'Inhibit everything whenever any alert fires.', wrong: 'That would hide unrelated failures happening at the same time.' },
        ],
      },
      d: {
        end: true,
        text: 'With <code>group_by: [alertname, rack]</code>, <code>group_wait: 30s</code> and inhibition on the rack label, the same failure now produces one SwitchDown page plus one grouped summary. You also add the rack label to every target through relabelling, and review pages per incident monthly.',
        lesson: 'Alert fatigue hides the root cause. Group related alerts, inhibit consequences when their cause is alerting, and label targets with their failure domain (rack, AZ) so rules can use it.',
      },
    },
  },
  {
    id: 'silent-watch',
    title: 'When Argus Closed His Eyes',
    difficulty: 3,
    tags: ['Monitoring', 'Prometheus'],
    summary: 'A compute node was down for 9 hours and no alert fired, although the NovaComputeDown rule exists.',
    start: 'a',
    nodes: {
      a: {
        text: 'Customers report their VMs on cmp-12 were unreachable all night. The rule <code>NovaComputeDown</code> exists and was tested last month. Nobody was paged. Where do you start?',
        choices: [
          { t: 'Check whether Prometheus actually had the data the rule needs.', go: 'b' },
          { t: 'Blame the on-call engineer.', wrong: 'Blameless reviews find system causes; and here nobody was paged at all.' },
        ],
      },
      b: {
        text: 'In Prometheus:',
        out: `> up{job="openstack-exporter"}
(no data)
> openstack_nova_agent_state{hostname="cmp-12"}
(no data for the last 9h)
> ALERTS{alertname="NovaComputeDown"}
(no data)`,
        choices: [
          { t: 'The openstack-exporter target disappeared, so the metric vanished. A rule of the form “== 0” returns nothing when there is no data, so it never fired.', go: 'c' },
          { t: 'The rule’s threshold is wrong.', wrong: 'The rule never had any data to compare. Missing data is the problem.' },
        ],
      },
      c: {
        text: 'The exporter had been moved to a new controller during maintenance, and its scrape target was never updated. How do you make sure silence can never again look like health?',
        choices: [
          { t: 'Alert on up == 0 and on absent() for every critical job, keep an always-firing Watchdog alert sent to an external dead-man’s switch, and generate scrape targets from the inventory.', go: 'd' },
          { t: 'Lower the rule’s “for” duration.', wrong: 'A shorter wait does not help when there is no data at all.' },
        ],
      },
      d: {
        end: true,
        text: 'You add <code>absent(up{job="openstack-exporter"})</code> and <code>up == 0</code> alerts, connect the Watchdog alert to an external heartbeat service that pages if it stops, and generate Prometheus targets from the same inventory as the deployment. A game day confirms that stopping the exporter now pages within 5 minutes.',
        lesson: 'Alert rules only see data that exists. Watch the watchers: alert on failed scrapes and absent series, and use a dead-man’s switch so a dead monitoring pipeline is itself an alarm.',
      },
    },
  },
  {
    id: 'prom-cardinality',
    title: 'The Hydra of Labels',
    difficulty: 4,
    tags: ['Monitoring', 'Prometheus', 'Scale'],
    summary: 'Prometheus restarts every few hours, killed for running out of memory.',
    start: 'a',
    nodes: {
      a: {
        text: 'Since last week, Prometheus on the monitoring node is killed by the out-of-memory killer every few hours, leaving gaps in every graph. Nothing changed in Prometheus itself. What do you check first?',
        choices: [
          { t: 'How many time series Prometheus holds, and which metrics grew.', go: 'b' },
          { t: 'Add RAM and move on.', wrong: 'If series keep multiplying, any amount of RAM runs out. Find the growth first.' },
        ],
      },
      b: {
        text: 'The head series count and the biggest metrics (from the TSDB status page and a query):',
        out: `> prometheus_tsdb_head_series
4.2e+06            # one week ago: 0.9e+06
> topk(3, count by (__name__) ({__name__=~".+"}))
libvirt_domain_block_stats_read_bytes_total{…}   1.1e+06
libvirt_domain_interface_stats_receive_bytes_total{…}   0.9e+06
node_cpu_seconds_total{…}   0.04e+06`,
        choices: [
          { t: 'The libvirt exporter now emits one series per VM disk and interface with a label that changes often. Check its labels.', go: 'c' },
          { t: 'node_cpu_seconds_total is the culprit.', wrong: 'It is small and stable. The libvirt metrics exploded.' },
        ],
      },
      c: {
        text: 'A label sample:',
        out: `libvirt_domain_block_stats_read_bytes_total{domain="instance-0003a1f2", instance_name="web-7f3c9b", instance_id="…", project_name="…", target_device="vda", request_id="req-9e1c…"}`,
        choices: [
          { t: 'A new exporter version added labels such as request_id that change constantly, creating new series all the time. Drop or rewrite those labels with metric_relabel_configs, and keep only what dashboards use.', go: 'd' },
          { t: 'Delete all libvirt metrics forever.', wrong: 'You would lose valuable per-VM visibility. Remove the harmful labels instead.' },
        ],
      },
      d: {
        end: true,
        text: 'A <code>metric_relabel_configs</code> rule drops the <code>request_id</code> label (and a few unused ones). Head series fall back to about 1 million, memory is stable, and you add an alert on sudden growth of <code>prometheus_tsdb_head_series</code>, plus a review step for exporter upgrades.',
        lesson: 'Every unique label combination is a separate series. Labels with ever-changing values (IDs, request IDs, timestamps) explode cardinality and memory. Watch head series and relabel away what you do not need.',
      },
    },
  },
  {
    id: 'heat-create-failed',
    title: 'The Oracle Speaks in Riddles',
    difficulty: 2,
    tags: ['Heat', 'Nova', 'Quota'],
    summary: 'A Heat stack goes CREATE_FAILED with a vague message. Find the real cause deep inside nested stacks.',
    start: 'a',
    nodes: {
      a: {
        text: 'The web team deploys <code>shop</code> from a template with an autoscaling group. It fails. The top-level status says little.',
        out: `$ openstack stack show shop -c stack_status -c stack_status_reason
+---------------------+------------------------------------------------------------+
| stack_status        | CREATE_FAILED                                              |
| stack_status_reason | Resource CREATE failed: ResourceInError: resources.web_asg |
+---------------------+------------------------------------------------------------+`,
        choices: [
          { t: 'Delete the stack and create it again.', wrong: 'Retrying without a cause wastes time and can leave orphans. Read the events first.' },
          { t: 'List the stack events, including nested stacks, to find the first resource that failed.', go: 'b' },
          { t: 'Restart heat-engine.', wrong: 'Heat worked fine: it reports a failure from another service. Look at what it reports.' },
        ],
      },
      b: {
        text: 'The nested events show the first failure:',
        out: `$ openstack stack event list shop --nested-depth 3 | grep -i failed
2026-09-25 10:02:14 [shop-web_asg-x7k2-server-2]: CREATE_FAILED  ResourceInError: resources.server:
  Went to status ERROR due to "Message: Quota exceeded for cores: Requested 4, but already used 18 of 20 cores, Code: 403"`,
        choices: [
          { t: 'The autoscaling group asked for 3 × 4 vCPU; the project only had 2 cores left. Check the quota and the template sizes.', go: 'c' },
          { t: 'The image is broken.', wrong: 'The message is clear: a 403 quota error on cores, not an image problem.' },
        ],
      },
      c: {
        text: 'Quota usage confirms it. What is the right fix?',
        out: `$ openstack quota show --usage shop-project -c cores
| cores | limit 20 | in_use 18 | reserved 0 |`,
        choices: [
          { t: 'Agree the right size with the team: raise the cores quota (or shrink min_size / flavor), then run openstack stack update or delete and recreate.', go: 'd' },
          { t: 'Set the quota to unlimited (-1) for this project.', wrong: 'Unlimited quotas remove the guardrail that protects everyone else. Size it deliberately.' },
        ],
      },
      d: {
        end: true,
        text: 'After the quota change the stack is recreated and goes <code>CREATE_COMPLETE</code>. You add a pre-check to the pipeline (<code>openstack quota show --usage</code>) and set <code>min_size</code> so it fits the budget.',
        lesson: 'Heat usually reports someone else\'s error. Use <code>stack event list --nested-depth N</code> to find the first failed resource, then fix it in the service that failed (here Nova quota).',
      },
    },
  },
  {
    id: 'trove-build',
    title: 'The Silent Scribe',
    difficulty: 3,
    tags: ['Trove', 'RabbitMQ', 'Networking'],
    summary: 'Every new Trove database instance stays in BUILD and then goes ERROR after a timeout.',
    start: 'a',
    nodes: {
      a: {
        text: 'A new MySQL instance never becomes ACTIVE. The Nova VM under it is ACTIVE and has an IP. What is Trove waiting for?',
        out: `$ openstack database instance show db1 -c status -c fault
| status | ERROR |
| fault  | Polling request timed out. |
$ openstack server list --all-projects --name db1
| 7c1e… | db1 | ACTIVE | trove-mgmt=172.30.0.41; tenant-net=10.10.0.12 |`,
        choices: [
          { t: 'The guest agent inside the VM must report back to Trove over RabbitMQ. Check whether it can.', go: 'b' },
          { t: 'The flavor is too small for MySQL.', wrong: 'A small flavor makes MySQL slow, but the VM booted and Trove heard nothing at all. Look at the path back.' },
          { t: 'Recreate the datastore version.', wrong: 'That changes nothing about the communication path. Find the broken link first.' },
        ],
      },
      b: {
        text: 'You look at the guest agent log from the console (or the Trove debug log). What do you see?',
        out: `$ openstack console log show db1 | grep -i amqp
guest-agent: ERROR oslo.messaging._drivers.impl_rabbit
  [-] AMQP server on 192.168.10.5:5672 is unreachable: timed out. Trying again in 32 seconds.`,
        choices: [
          { t: 'Check routing and firewall between the Trove management network (172.30.0.0/24) and the RabbitMQ address 192.168.10.5:5672.', go: 'c' },
          { t: 'Restart RabbitMQ.', wrong: 'Other services use RabbitMQ fine. Only the guest cannot reach it: this is a path problem.' },
        ],
      },
      c: {
        text: 'The management network has no route to the controllers\' internal VIP; a recent firewall change also dropped the old rule. What is the fix?',
        out: `$ openstack subnet show trove-mgmt-subnet -c host_routes -c gateway_ip
| gateway_ip  | None |
| host_routes |      |`,
        choices: [
          { t: 'Add a host route (or gateway) to the internal network and allow TCP 5672 from 172.30.0.0/24 to the controllers only; better still, give guests a dedicated RabbitMQ vhost/user.', go: 'd' },
          { t: 'Put the guests on the public network.', wrong: 'That exposes the database VMs and the message bus. Keep a separate, restricted management network.' },
        ],
      },
      d: {
        end: true,
        text: 'With the route and the firewall rule in place, the guest agent connects, reports <code>ACTIVE</code>, and new instances build in about two minutes.',
        lesson: 'Trove needs a working path from the guest agent to the message bus (via the management network). When the VM is ACTIVE but the database is not, check that path first: routes, firewall and credentials.',
      },
    },
  },
  {
    id: 'ironic-clean-failed',
    title: 'The Forge Will Not Cool',
    difficulty: 3,
    tags: ['Ironic', 'Networking'],
    summary: 'After a tenant deletes a bare-metal instance, the node lands in "clean failed" and can no longer be scheduled.',
    start: 'a',
    nodes: {
      a: {
        text: 'Node <code>bm-07</code> finished a workload. Instead of returning to <code>available</code>, it is stuck.',
        out: `$ openstack baremetal node show bm-07 -c provision_state -c maintenance -c last_error
| provision_state | clean failed |
| maintenance     | True |
| last_error      | Timeout reached while cleaning the node. Please check if the ramdisk responsible for the cleaning is running on the node. |`,
        choices: [
          { t: 'Set the node to available with provide right now.', wrong: 'Skipping cleaning gives the next tenant disks with the old tenant\'s data. Find why cleaning failed.' },
          { t: 'Find out whether the cleaning ramdisk (IPA) booted and could call back to Ironic.', go: 'b' },
          { t: 'Replace the node\'s disks.', wrong: 'Nothing points to a hardware fault yet. The error says the ramdisk did not answer.' },
        ],
      },
      b: {
        text: 'The node\'s serial console shows the ramdisk booted but never got an address on the cleaning network:',
        out: `$ openstack baremetal node show bm-07 -f value -c driver_info | grep -o "cleaning_network[^,]*"
cleaning_network: 'provisioning'
(console) ironic-python-agent: No DHCP offer received on eno1, retrying…`,
        choices: [
          { t: 'Check the switch port: after the tenant used the node, the port must move back from the tenant VLAN to the provisioning network.', go: 'c' },
          { t: 'Increase the cleaning timeout.', wrong: 'Waiting longer will not give the ramdisk a DHCP offer.' },
        ],
      },
      c: {
        text: 'networking-generic-switch logs show the reconfiguration was refused because of an expired switch password. The port is still in the tenant VLAN. What now?',
        out: `ironic-conductor.log: ERROR ... networking_generic_switch ... Authentication failed for switch leaf-12`,
        choices: [
          { t: 'Fix the switch credentials, then: baremetal node maintenance unset bm-07 && baremetal node manage bm-07 && baremetal node provide bm-07 (it cleans again).', go: 'd' },
          { t: 'Move the port manually on the switch and mark the node available.', wrong: 'Manual changes drift from what Ironic believes, and you still skip cleaning. Fix the automation and let Ironic re-clean.' },
        ],
      },
      d: {
        end: true,
        text: 'With valid credentials Ironic moves the port to the provisioning VLAN, the ramdisk gets DHCP, disks are wiped and the node returns to <code>available</code>. You add an alert on nodes in <code>clean failed</code> and on switch-auth errors.',
        lesson: 'In multi-tenant bare metal, cleaning depends on the network: the port must move back to the provisioning network. When cleaning times out, follow the chain: ramdisk → DHCP → switch configuration → credentials.',
      },
    },
  },
];
