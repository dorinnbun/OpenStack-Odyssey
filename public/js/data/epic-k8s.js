import { term, note, lens, fig } from './helpers.js';

// The Labours of the Helmsman: Kubernetes (Greek κυβερνήτης, "helmsman") from
// scratch, ending with Kubernetes running on and integrated with OpenStack.
const K8S = 'https://kubernetes.io/docs';
const CPO = 'https://github.com/kubernetes/cloud-provider-openstack/blob/master/docs';

const archSvg = `<svg viewBox="0 0 760 270" role="img" aria-label="Kubernetes architecture on OpenStack">
  <style>.b{fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.h{font:700 12px Cinzel,serif;fill:var(--accent-text);letter-spacing:.08em}</style>
  <text x="20" y="22" class="h">CONTROL PLANE (usually 3 VMs)</text>
  <rect x="20" y="30" width="150" height="54" class="b"/><text x="34" y="54" class="t">kube-apiserver</text><text x="34" y="73" class="s">the front door</text>
  <rect x="185" y="30" width="120" height="54" class="b"/><text x="199" y="54" class="t">etcd</text><text x="199" y="73" class="s">cluster state</text>
  <rect x="320" y="30" width="130" height="54" class="b"/><text x="334" y="54" class="t">scheduler</text><text x="334" y="73" class="s">picks a node</text>
  <rect x="465" y="30" width="140" height="54" class="b"/><text x="479" y="54" class="t">controllers</text><text x="479" y="73" class="s">keep desired state</text>
  <rect x="620" y="30" width="120" height="54" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="632" y="54" class="t">OpenStack CCM</text><text x="632" y="73" class="s">talks to OpenStack</text>
  <text x="20" y="116" class="h">WORKER NODES (VMs or bare metal)</text>
  <rect x="20" y="124" width="350" height="70" class="b"/><text x="34" y="148" class="t">node: kubelet · container runtime · CNI</text><text x="34" y="170" class="s">runs pods; CSI node plugin attaches volumes</text>
  <rect x="390" y="124" width="350" height="70" class="b"/><text x="404" y="148" class="t">node: kubelet · container runtime · CNI</text><text x="404" y="170" class="s">pods  pods  pods</text>
  <text x="20" y="224" class="h">OPENSTACK UNDERNEATH</text>
  <rect x="20" y="232" width="720" height="30" fill="var(--terracotta)" opacity=".16" stroke="var(--line-strong)"/>
  <text x="34" y="253" class="t">Nova VMs · Neutron networks · Octavia load balancers · Cinder volumes · Keystone users</text>
</svg>`;

export const K8S_EPIC = {
  id: 'helmsman',
  title: 'The Labours of the Helmsman',
  greekTitle: 'ΚΥΒΕΡΝΗΤΗΣ',
  project: 'Kubernetes',
  glyph: 'helmet',
  tagline: 'Kubernetes from scratch, then running it on OpenStack',
  myth: 'Kubernetes takes its name from the Greek κυβερνήτης: the helmsman. Like Heracles, you earn mastery through labours, from a first container to production clusters that use OpenStack for their load balancers, disks and users.',
  map: [[100, 205, 1], [255, 300, 1], [420, 150, -1], [585, 282, 1], [745, 132, -1], [900, 250, 1]],
  short: ['Nemean Lion', 'Lernaean Hydra', 'Ceryneian Hind', 'Augean Stables', 'Cattle of Geryon', 'Cerberus'],
  levels: [
    // ------------------------------------------------------------ 1
    {
      id: 'k8s-nemea', n: 1, place: 'The Nemean Lion', title: 'Containers from Scratch',
      subtitle: 'What a container is, and why we need an orchestrator',
      tier: 'Novice', relic: { name: 'Lion Skin', desc: 'Containers hold no mystery for you.' },
      myth: 'The first labour: a lion whose skin no weapon could pierce. Heracles won by understanding it, not by hitting harder. Containers seem mysterious until you see they are ordinary Linux processes wearing a clever disguise.',
      goals: ['Explain containers versus virtual machines', 'Describe images, registries and a container runtime', 'Name the parts of a Kubernetes cluster'],
      lessons: [
        {
          id: 'containers', title: 'Containers versus virtual machines', minutes: 9,
          html: `
${note('plain', 'A virtual machine is a whole house: its own foundations (kernel), plumbing and furniture. A container is a flat in an apartment block: it shares the building’s foundations (the host kernel) but has its own locked door, furniture and address.')}
<table><tr><th></th><th>Virtual machine (Nova)</th><th>Container</th></tr>
<tr><td>Contains</td><td>A full operating system with its own kernel</td><td>An application and its libraries; shares the host kernel</td></tr>
<tr><td>Starts in</td><td>Tens of seconds</td><td>About a second</td></tr>
<tr><td>Size</td><td>Gigabytes</td><td>Megabytes</td></tr>
<tr><td>Isolation</td><td>Strong (hardware virtualisation)</td><td>Good (namespaces, cgroups), weaker than a VM</td></tr>
<tr><td>Best for</td><td>Any OS, strong tenant isolation, legacy apps</td><td>Many small services deployed often</td></tr></table>
<h3>Images, registries, runtimes</h3>
<ul>
<li>An <b>image</b> is a packaged application (like a Glance image, but for one app).</li>
<li>A <b>registry</b> stores images (Docker Hub, Quay, Harbor, or one you host on OpenStack).</li>
<li>A <b>runtime</b> such as containerd or CRI-O starts containers from images.</li>
</ul>
${term('your first container', `
$ podman run -d --name web -p 8080:80 docker.io/library/nginx:stable
$ curl -s localhost:8080 | head -4
$ podman ps
$ podman stop web && podman rm web`)}
${note('plain', 'VMs and containers are partners, not rivals. The usual pattern is Kubernetes running <i>inside</i> OpenStack VMs: OpenStack isolates tenants, Kubernetes packs applications efficiently.')}
${lens({
  sys: 'You already run containers: Kolla-Ansible deploys every OpenStack service as a container.',
  pre: 'Customers modernising applications want Kubernetes; customers with legacy apps want VMs. OpenStack offers both on one platform.',
})}`,
          sources: [['Kubernetes overview', `${K8S}/concepts/overview/`], ['Containers (Kubernetes docs)', `${K8S}/concepts/containers/`]],
        },
        {
          id: 'why-k8s', title: 'Why Kubernetes, and how it is built', minutes: 10,
          html: `
<p>Running one container is easy. Running 500 across 30 machines, restarting failed ones, rolling out new versions and balancing traffic is not. <b>Kubernetes</b> does that: you declare <i>what you want</i> and its controllers keep making reality match.</p>
${fig(archSvg, 'A Kubernetes cluster built from OpenStack resources.')}
<table><tr><th>Kubernetes part</th><th>Job</th><th>OpenStack cousin</th></tr>
<tr><td>kube-apiserver</td><td>The single API everything talks to</td><td>nova-api, neutron-server…</td></tr>
<tr><td>etcd</td><td>Stores all cluster state (a replicated key-value store)</td><td>MariaDB/Galera</td></tr>
<tr><td>kube-scheduler</td><td>Chooses a node for each pod</td><td>nova-scheduler + Placement</td></tr>
<tr><td>controller-manager</td><td>Loops that fix drift from the desired state</td><td>nova-conductor</td></tr>
<tr><td>kubelet</td><td>Agent on each node that runs pods</td><td>nova-compute</td></tr>
<tr><td>CNI plugin</td><td>Pod networking</td><td>Neutron + OVN</td></tr></table>
<h3>Releases</h3>
<p>Kubernetes ships about three minor releases a year; <b>v1.37</b> (August 2026) is the latest. Each release gets roughly 14 months of patches, so plan to upgrade clusters at least once a year.</p>
${lens({
  sys: 'Your OpenStack knowledge transfers: API servers, schedulers, a state database and per-node agents are the same pattern.',
  sa: 'Decide who owns Kubernetes: the platform team (clusters as a service) or each application team (self-managed).',
})}`,
          sources: [['Cluster components', `${K8S}/concepts/overview/components/`], ['Kubernetes releases', 'https://kubernetes.io/releases/'], ['Kubernetes v1.37 release', 'https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/']],
        },
      ],
      quiz: [
        { q: 'What do containers share that VMs do not?', a: ['The disk', 'The host kernel', 'The IP address', 'Nothing'], c: 1, e: 'Containers share the host kernel; VMs run their own.' },
        { q: 'Which Kubernetes component stores all cluster state?', a: ['kubelet', 'etcd', 'kube-proxy', 'CoreDNS'], c: 1, e: 'etcd is the replicated key-value store.' },
        { q: 'Which OpenStack service is the closest cousin of the kubelet?', a: ['nova-compute', 'keystone', 'glance-api', 'horizon'], c: 0, e: 'Both are per-node agents that run workloads.' },
        { q: 'Where does Kubernetes usually run in an OpenStack cloud?', a: ['Instead of OpenStack', 'Inside OpenStack VMs or on Ironic bare metal', 'Only on the controllers', 'Inside Glance'], c: 1, e: 'OpenStack provides the infrastructure; Kubernetes runs on top.' },
      ],
    },
    // ------------------------------------------------------------ 2
    {
      id: 'k8s-hydra', n: 2, place: 'The Lernaean Hydra', title: 'Pods That Grow Back',
      subtitle: 'Your first cluster, kubectl, pods, Deployments and self-healing',
      tier: 'Novice', relic: { name: 'Hydra’s Head', desc: 'You command self-healing workloads.' },
      myth: 'Cut off one of the Hydra’s heads and two grow back. A Kubernetes Deployment is a friendly Hydra: kill a pod and a new one appears at once, because the desired number of replicas never changes.',
      goals: ['Start a practice cluster on one OpenStack VM', 'Use kubectl to create, inspect and delete resources', 'Run a Deployment, scale it and roll out a new version'],
      lessons: [
        {
          id: 'first-cluster', title: 'Your first cluster', minutes: 10,
          html: `
<p>For learning, run a small cluster on one VM in your OpenStack lab (4 vCPU, 8 GB RAM). Two easy options:</p>
${term('option A: k3s, a lightweight single-binary Kubernetes', `
$ curl -sfL https://get.k3s.io | sh -
$ sudo k3s kubectl get nodes`)}
${term('option B: kind, Kubernetes in containers', `
$ kind create cluster --name labour
$ kubectl cluster-info --context kind-labour`)}
${term('kubectl, the only tool you need at first', `
$ kubectl get nodes -o wide
$ kubectl get pods -A                 # every pod in every namespace
$ kubectl describe node <name>        # details and recent events
$ kubectl explain deployment.spec     # built-in documentation`)}
${note('plain', '<code>kubectl</code> is to Kubernetes what the <code>openstack</code> command is to OpenStack: a client that sends requests to the API. <code>get</code> lists, <code>describe</code> explains, <code>apply</code> creates or updates, <code>delete</code> removes.')}
${lens({
  sys: 'Install <code>kubectl</code> and enable shell completion (<code>kubectl completion bash</code>); you will type it thousands of times.',
  pre: 'A k3s VM is a quick demo of “Kubernetes on your OpenStack in five minutes”.',
})}`,
          sources: [['kubectl quick reference', `${K8S}/reference/kubectl/quick-reference/`], ['k3s quick start', 'https://docs.k3s.io/quick-start'], ['kind quick start', 'https://kind.sigs.k8s.io/docs/user/quick-start/']],
        },
        {
          id: 'deployments', title: 'Pods, Deployments and rolling updates', minutes: 12,
          html: `
<ul>
<li>A <b>pod</b> is one or more containers that always run together on one node, sharing an IP address.</li>
<li>A <b>Deployment</b> says “keep N copies of this pod running, at this version”. It manages a ReplicaSet that replaces any pod that dies.</li>
<li>A <b>namespace</b> is a folder for resources, like an OpenStack project inside the cluster.</li>
</ul>
${term('web.yaml', `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels: { app: web }
spec:
  replicas: 3
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: nginx
          image: nginx:1.27
          ports: [{ containerPort: 80 }]
          resources:
            requests: { cpu: 100m, memory: 64Mi }`)}
${term('the Hydra at work', `
$ kubectl apply -f web.yaml
$ kubectl get pods -l app=web
$ kubectl delete pod <one-of-them>     # cut off a head…
$ kubectl get pods -l app=web          # …a new one is already starting
$ kubectl scale deployment web --replicas=5
$ kubectl set image deployment/web nginx=nginx:1.28   # rolling update
$ kubectl rollout status deployment/web
$ kubectl rollout undo deployment/web                  # instant rollback`)}
${note('plain', 'Kubernetes is <b>declarative</b>: you describe the result (“3 copies of nginx 1.27”), not the steps. Controllers keep comparing reality with your description and fix any difference, forever.')}
${lens({
  sys: 'Always set resource <b>requests</b>: the scheduler uses them the way Nova uses flavors.',
  lead: 'Keep manifests in Git and deploy with a GitOps tool (Argo CD or Flux) so the cluster always matches the repository.',
})}`,
          sources: [['Pods', `${K8S}/concepts/workloads/pods/`], ['Deployments', `${K8S}/concepts/workloads/controllers/deployment/`], ['Namespaces', `${K8S}/concepts/overview/working-with-objects/namespaces/`]],
        },
      ],
      quiz: [
        { q: 'What keeps the requested number of pod copies running?', a: ['A Service', 'A Deployment (via its ReplicaSet)', 'etcd directly', 'The CNI'], c: 1, e: 'Deployments manage ReplicaSets that replace failed pods.' },
        { q: 'You delete one pod of a 3-replica Deployment. What happens?', a: ['2 pods remain', 'A replacement pod is created', 'The Deployment is deleted', 'The node restarts'], c: 1, e: 'The controller restores the desired count.' },
        { q: 'Which command rolls back the last Deployment change?', a: ['kubectl undo web', 'kubectl rollout undo deployment/web', 'kubectl revert', 'kubectl delete deployment web'], c: 1, e: 'rollout undo returns to the previous revision.' },
        { q: 'What is the scheduler’s equivalent of a Nova flavor?', a: ['Labels', 'Resource requests', 'Namespaces', 'Annotations'], c: 1, e: 'Requests tell the scheduler how much CPU and memory a pod needs.' },
      ],
    },
    // ------------------------------------------------------------ 3
    {
      id: 'k8s-hind', n: 3, place: 'The Ceryneian Hind', title: 'Catching Moving Targets',
      subtitle: 'Services, Ingress, DNS and networking, then Octavia on OpenStack',
      tier: 'Apprentice', relic: { name: 'Golden Antler', desc: 'Traffic always finds your pods.' },
      myth: 'The Hind was so fast that Heracles chased it for a year. Pods move just as fast: they die, restart and change IP addresses. A Service is how clients catch them every time.',
      goals: ['Expose pods with ClusterIP, NodePort and LoadBalancer Services', 'Get real OpenStack load balancers with the OpenStack cloud controller manager', 'Avoid the MTU trap of overlays on top of overlays'],
      oracle: ['k8s-lb-pending', 'k8s-mtu'],
      lessons: [
        {
          id: 'services', title: 'Services, Ingress and DNS', minutes: 10,
          html: `
<table><tr><th>Service type</th><th>Reachable from</th><th>Typical use</th></tr>
<tr><td>ClusterIP</td><td>Inside the cluster only</td><td>Service-to-service calls</td></tr>
<tr><td>NodePort</td><td>Every node’s IP on a high port</td><td>Labs and debugging</td></tr>
<tr><td>LoadBalancer</td><td>An external IP from the cloud</td><td>Production entry points (on OpenStack: an Octavia load balancer)</td></tr></table>
${term('expose the web Deployment', `
$ kubectl expose deployment web --port 80 --type ClusterIP
$ kubectl get svc web
$ kubectl run -it --rm probe --image=busybox:1.36 --restart=Never -- wget -qO- http://web`)}
<p>Each Service also gets a DNS name (<code>web.default.svc.cluster.local</code>) served by <b>CoreDNS</b>. An <b>Ingress</b> (or the newer <b>Gateway API</b>) routes many HTTP host names and paths through one load balancer.</p>
<p>Pods get their IPs from a <b>CNI plugin</b> such as Calico or Cilium, which builds a pod network across the nodes, usually with its own overlay (VXLAN or Geneve).</p>
${lens({
  net: 'Kubernetes networking is a second SDN on top of Neutron. Know which layer owns which address range: Neutron for node IPs, the CNI for pod and service IPs.',
  sa: 'Standardise one Ingress or Gateway controller per cluster type, fronted by an Octavia load balancer.',
})}`,
          sources: [['Services', `${K8S}/concepts/services-networking/service/`], ['Ingress', `${K8S}/concepts/services-networking/ingress/`], ['Gateway API', 'https://gateway-api.sigs.k8s.io/']],
        },
        {
          id: 'occm', title: 'Load balancers from OpenStack', minutes: 12,
          html: `
<p>The <b>OpenStack cloud controller manager (OCCM)</b>, from the <i>cloud-provider-openstack</i> project, lets Kubernetes ask OpenStack for resources. Its best-known job: turning <code>type: LoadBalancer</code> Services into <b>Octavia</b> load balancers with floating IPs.</p>
${term('cloud.conf (stored as a Kubernetes secret)', `
[Global]
auth-url = https://keystone.example.com:5000/v3
application-credential-id = 5b2a…
application-credential-secret = …
region = RegionOne

[LoadBalancer]
floating-network-id = <public network id>
subnet-id = <subnet of the cluster nodes>`)}
${term('ask for a load balancer', `
$ kubectl expose deployment web --port 80 --type LoadBalancer --name web-lb
$ kubectl get svc web-lb -w
NAME     TYPE           EXTERNAL-IP     PORT(S)
web-lb   LoadBalancer   <pending>       80:31622/TCP
web-lb   LoadBalancer   203.0.113.77    80:31622/TCP
$ openstack loadbalancer list        # the same load balancer, seen from OpenStack`)}
${note('warn', '<b>The MTU trap</b>: your nodes sit on a Neutron Geneve network (MTU 1442 on a 1500-byte fabric), and the CNI adds its own overlay (VXLAN adds 50 bytes). Pod MTU must then be 1392 or lower. Most CNIs detect this, but a hard-coded 1450 or 1500 gives the classic “small requests work, big ones hang” symptom.')}
<p>Two more fixes you will need on OpenStack: if the CNI routes pod IPs without encapsulation, add the pod CIDR as an <b>allowed address pair</b> on node ports (or Neutron’s anti-spoofing drops the traffic), and open the CNI’s ports (for example BGP 179, VXLAN 4789/UDP) in the nodes’ security group.</p>
${lens({
  sys: 'Give OCCM an application credential scoped to the cluster’s project, never an admin password.',
  net: 'Plan floating IP and Octavia quotas per cluster: every LoadBalancer Service consumes one load balancer and one floating IP.',
  pre: 'Self-service load balancers for Kubernetes are a key differentiator of OpenStack versus plain virtualisation.',
})}`,
          sources: [['Using the OpenStack cloud controller manager', `${CPO}/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md`], ['Exposing applications with LoadBalancer services', `${CPO}/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md`], ['Neutron MTU considerations', 'https://docs.openstack.org/neutron/latest/admin/config-mtu.html']],
        },
      ],
      quiz: [
        { q: 'Which Service type gets an external IP from OpenStack Octavia?', a: ['ClusterIP', 'NodePort', 'LoadBalancer', 'Headless'], c: 2, e: 'The OCCM creates an Octavia load balancer for it.' },
        { q: 'Which component turns LoadBalancer Services into Octavia load balancers?', a: ['kube-proxy', 'The OpenStack cloud controller manager', 'CoreDNS', 'Cinder CSI'], c: 1, e: 'OCCM from cloud-provider-openstack.' },
        { q: 'Node network MTU is 1442 and the CNI uses VXLAN (50 bytes). Maximum safe pod MTU?', a: ['1500', '1450', '1392', '9000'], c: 2, e: '1442 − 50 = 1392.' },
        { q: 'Pods are routed without encapsulation between OpenStack VMs and traffic is dropped. Likely fix?', a: ['Bigger flavor', 'Allowed address pairs for the pod CIDR on node ports', 'More replicas', 'Restart etcd'], c: 1, e: 'Neutron anti-spoofing drops traffic from unknown IPs.' },
      ],
    },
    // ------------------------------------------------------------ 4
    {
      id: 'k8s-augeas', n: 4, place: 'The Augean Stables', title: 'Storage That Stays',
      subtitle: 'Volumes, PersistentVolumeClaims, StorageClasses and Cinder CSI',
      tier: 'Apprentice', relic: { name: 'River Alpheus', desc: 'Your data survives any pod.' },
      myth: 'Heracles cleaned the Augean stables by diverting two rivers through them: the dirt was washed away, the stables remained. Pods come and go like the water; persistent volumes are the stables that stay.',
      goals: ['Explain PersistentVolumes, PersistentVolumeClaims and StorageClasses', 'Provision Cinder volumes automatically with the Cinder CSI driver', 'Choose between Cinder, Manila and Ceph for each workload'],
      oracle: ['k8s-pvc-pending'],
      lessons: [
        {
          id: 'pv-pvc', title: 'Persistent volumes, simply', minutes: 9,
          html: `
${note('plain', 'A container’s own disk is wiped when it restarts. For data that must survive, a pod asks for storage with a <b>PersistentVolumeClaim</b> (“I need 10 GB, fast”). A <b>StorageClass</b> says how to create it (“fast” means a Cinder SSD volume). Kubernetes then creates and attaches a <b>PersistentVolume</b> automatically.')}
<table><tr><th>Object</th><th>Who writes it</th><th>OpenStack cousin</th></tr>
<tr><td>StorageClass</td><td>Platform team</td><td>Cinder volume type</td></tr>
<tr><td>PersistentVolumeClaim</td><td>Application team</td><td>“openstack volume create” request</td></tr>
<tr><td>PersistentVolume</td><td>Created automatically</td><td>The Cinder volume itself</td></tr></table>
<h3>Access modes</h3>
<ul><li><b>ReadWriteOnce</b>: one node at a time (block storage such as Cinder). Databases.</li>
<li><b>ReadWriteMany</b>: many nodes at once (file storage such as Manila/CephFS). Shared content.</li></ul>
${lens({
  sys: 'Set a default StorageClass so application teams do not need to know storage details.',
  sa: 'Map StorageClasses one-to-one to Cinder volume types (for example <code>standard</code>, <code>fast-ssd</code>) with QoS.',
})}`,
          sources: [['Persistent volumes', `${K8S}/concepts/storage/persistent-volumes/`], ['Storage classes', `${K8S}/concepts/storage/storage-classes/`]],
        },
        {
          id: 'cinder-csi', title: 'Cinder CSI in practice', minutes: 12,
          html: `
${term('storageclass.yaml', `
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: cinder.csi.openstack.org
parameters:
  type: ssd-replicated          # a Cinder volume type
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer`)}
${term('claim storage and watch it appear in Cinder', `
$ cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: pgdata }
spec:
  accessModes: [ReadWriteOnce]
  resources: { requests: { storage: 20Gi } }
EOF
$ kubectl get pvc pgdata
$ openstack volume list --name pvc-*      # a real Cinder volume`)}
<ul>
<li><b>WaitForFirstConsumer</b> creates the volume only once the pod is scheduled, so it lands in the same <b>availability zone</b> as the node. Without it, a volume in az1 cannot attach to a node in az2.</li>
<li>Snapshots work through the CSI snapshot controller and map to Cinder snapshots.</li>
<li>For ReadWriteMany, use the <b>Manila CSI</b> driver (CephFS or NFS shares).</li>
<li>If Cinder is backed by Ceph, pods get Ceph RBD volumes transparently. Alternatively, <b>Ceph CSI</b> (or Rook) can talk to Ceph directly.</li>
</ul>
${lens({
  sys: 'Each node VM can attach a limited number of volumes; set the CSI node plugin’s maximum to match your hypervisor limits.',
  pa: 'Prefer Cinder CSI for multi-tenant clouds (tenancy and quotas are enforced by OpenStack). Direct Ceph CSI suits platform-owned clusters.',
})}`,
          sources: [['Using the Cinder CSI plugin', `${CPO}/cinder-csi-plugin/using-cinder-csi-plugin.md`], ['Manila CSI plugin', `${CPO}/manila-csi-plugin/using-manila-csi-plugin.md`], ['Ceph CSI', 'https://github.com/ceph/ceph-csi']],
        },
      ],
      quiz: [
        { q: 'Which object does an application team write to request storage?', a: ['StorageClass', 'PersistentVolumeClaim', 'CSIDriver', 'Node'], c: 1, e: 'The PVC is the request.' },
        { q: 'What is the provisioner name of the Cinder CSI driver?', a: ['kubernetes.io/cinder', 'cinder.csi.openstack.org', 'csi.ceph.com', 'openstack.org/volume'], c: 1, e: 'cinder.csi.openstack.org.' },
        { q: 'Why use volumeBindingMode WaitForFirstConsumer?', a: ['Faster volumes', 'The volume is created in the same availability zone as the scheduled pod', 'Required for snapshots', 'It enables encryption'], c: 1, e: 'Topology-aware provisioning avoids cross-AZ attach failures.' },
        { q: 'Which access mode needs file storage such as Manila?', a: ['ReadWriteOnce', 'ReadWriteMany', 'ReadOnlyOnce', 'WriteOnce'], c: 1, e: 'Many nodes writing at once needs a shared file system.' },
      ],
    },
    // ------------------------------------------------------------ 5
    {
      id: 'k8s-geryon', n: 5, place: 'The Cattle of Geryon', title: 'Herding Many Clusters',
      subtitle: 'Clusters as a service: self-managed, Cluster API or Magnum',
      tier: 'Adept', relic: { name: 'Crook of Geryon', desc: 'You can offer Kubernetes clusters as a service.' },
      myth: 'Heracles had to drive a whole herd from the edge of the world. Platform teams face the same labour: not one Kubernetes cluster, but dozens, each needing creation, upgrades and cleanup.',
      goals: ['Compare the three ways to run Kubernetes on OpenStack', 'Create a cluster with Magnum and a Cluster API driver', 'Design multi-tenancy and quotas for clusters'],
      lessons: [
        {
          id: 'options', title: 'Three ways to run Kubernetes on OpenStack', minutes: 11,
          html: `
<table><tr><th>Approach</th><th>How</th><th>Best when</th></tr>
<tr><td><b>Self-managed</b></td><td>Terraform/OpenTofu creates VMs; kubeadm, k3s or RKE2 installs Kubernetes; you add OCCM and Cinder CSI</td><td>One team, few clusters, full control</td></tr>
<tr><td><b>Cluster API (CAPO)</b></td><td>A management cluster creates and upgrades workload clusters on OpenStack from declarative YAML</td><td>A platform team running many clusters with GitOps</td></tr>
<tr><td><b>Magnum</b></td><td>OpenStack’s own “Container Infrastructure” API: <code>openstack coe cluster create</code>; modern drivers use Cluster API underneath</td><td>A cloud offering Kubernetes to tenants as a self-service product</td></tr></table>
${note('plain', 'All three end in the same place: VMs running Kubernetes, with OCCM for load balancers and Cinder CSI for storage. The difference is who pushes the buttons and how upgrades happen.')}
${lens({
  pre: 'Kubernetes as a self-service product (Magnum) turns a private cloud into a platform like the public clouds offer. That is a strong commercial story.',
  sa: 'Choose one approach per audience. Mixing them in one cloud multiplies support effort.',
  pa: 'Cluster API is becoming the common engine: Magnum’s modern drivers and many products build on it. Betting on it keeps options open.',
})}`,
          sources: [['Cluster API Provider OpenStack', 'https://cluster-api-openstack.sigs.k8s.io/'], ['Magnum user guide', 'https://docs.openstack.org/magnum/latest/user/'], ['kubeadm', `${K8S}/setup/production-environment/tools/kubeadm/`]],
        },
        {
          id: 'magnum', title: 'Clusters as a service with Magnum', minutes: 12,
          html: `
<p>The original Magnum driver built clusters with Heat templates; it is deprecated. Current deployments use a <b>Cluster API driver</b>: <i>magnum-cluster-api</i> (Vexxhost) or <i>magnum-capi-helm</i> (StackHPC/Azimuth). Both run a small management Kubernetes cluster that the operator provides.</p>
${term('operator: publish a template', `
$ openstack image create ubuntu-2404-kube-v1.37 --disk-format qcow2 \\
    --property os_distro=ubuntu --property kube_version=v1.37.0 --file capi-ubuntu.qcow2
$ openstack coe cluster template create k8s-v1-37 \\
    --coe kubernetes --image ubuntu-2404-kube-v1.37 \\
    --external-network public --master-flavor m1.large --flavor m1.xlarge \\
    --network-driver calico --master-lb-enabled`)}
${term('tenant: create, use and grow a cluster', `
$ openstack coe cluster create shop --cluster-template k8s-v1-37 \\
    --master-count 3 --node-count 3
$ openstack coe cluster list
$ openstack coe cluster config shop --dir ~/.kube/shop && export KUBECONFIG=~/.kube/shop/config
$ kubectl get nodes
$ openstack coe nodegroup create shop gpu --flavor g1.a100.1 --node-count 2
$ openstack coe cluster resize shop 5`)}
<p class="small muted">Exact image properties and labels differ per driver: follow the driver’s documentation for your release.</p>
${lens({
  sys: 'Quotas matter: each cluster consumes VMs, volumes, a load balancer for the API and floating IPs. Size tenant quotas accordingly.',
  lead: 'Offer a small number of tested templates (one per supported Kubernetes minor version) and retire old ones on a schedule.',
})}`,
          sources: [['magnum-cluster-api driver', 'https://github.com/vexxhost/magnum-cluster-api'], ['magnum-capi-helm driver', 'https://docs.openstack.org/magnum-capi-helm/latest/user_docs/index.html'], ['Magnum user guide', 'https://docs.openstack.org/magnum/latest/user/']],
        },
      ],
      quiz: [
        { q: 'Which OpenStack project offers Kubernetes clusters as a service?', a: ['Zun', 'Magnum', 'Heat', 'Octavia'], c: 1, e: 'Magnum is the Container Infrastructure service.' },
        { q: 'What do modern Magnum drivers use underneath?', a: ['Docker Swarm', 'Cluster API', 'Mesos', 'Nova cells'], c: 1, e: 'Cluster API replaced the deprecated Heat-based driver.' },
        { q: 'Which command adds a GPU node group to a Magnum cluster?', a: ['openstack coe nodegroup create', 'kubectl add nodes', 'openstack server create --gpu', 'magnum gpu add'], c: 0, e: 'Node groups let one cluster mix flavors.' },
        { q: 'A single team with two clusters and full control needs. Simplest fit?', a: ['Magnum', 'Self-managed with Terraform and kubeadm/k3s', 'Cluster API with GitOps', 'None'], c: 1, e: 'Self-managed is simplest at small scale.' },
      ],
    },
    // ------------------------------------------------------------ 6
    {
      id: 'k8s-cerberus', n: 6, place: 'Cerberus at the Gate', title: 'Guarding the Gates',
      subtitle: 'Security, upgrades, backup and troubleshooting Kubernetes on OpenStack',
      tier: 'Expert', relic: { name: 'Chain of Cerberus', desc: 'You run Kubernetes in production on OpenStack.' },
      myth: 'The last labour: bring Cerberus, the three-headed guard dog, up from the Underworld. Production Kubernetes has three heads to tame: security, lifecycle and troubleshooting.',
      goals: ['Secure access with RBAC and Keystone', 'Upgrade and back up clusters safely', 'Diagnose Pending load balancers, Pending volumes and NotReady nodes'],
      oracle: ['k8s-lb-pending', 'k8s-pvc-pending', 'k8s-mtu'],
      lessons: [
        {
          id: 'security-lifecycle', title: 'Security and lifecycle', minutes: 11,
          html: `
<h3>Access</h3>
<ul>
<li><b>RBAC</b>: Roles grant verbs (get, create…) on resources inside a namespace; RoleBindings give them to users or groups.</li>
<li><b>Keystone integration</b>: the <i>k8s-keystone-auth</i> webhook from cloud-provider-openstack lets OpenStack users log in to Kubernetes with their OpenStack credentials and maps Keystone roles to Kubernetes permissions.</li>
<li>Network policies (enforced by the CNI) restrict pod-to-pod traffic, like security groups for pods.</li>
</ul>
<h3>Upgrades</h3>
<p>Upgrade one minor version at a time (1.36 → 1.37), control plane first, then nodes. With Cluster API or Magnum this becomes a template or version change that replaces VMs in a rolling fashion. Upgrade OCCM and the CSI drivers to versions that match the Kubernetes minor version.</p>
<h3>Backup</h3>
${term('two layers of backup', `
# cluster state: an etcd snapshot (self-managed control planes)
$ ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-$(date +%F).db
# application resources and volumes: Velero to S3 (for example Ceph RGW)
$ velero backup create shop-daily --include-namespaces shop --snapshot-volumes`)}
${lens({
  sys: 'Test restores into a scratch cluster every quarter. An untested backup is a hope, not a plan.',
  lead: 'Publish a support policy: which Kubernetes versions you support and when each goes out of support.',
})}`,
          sources: [['RBAC authorization', `${K8S}/reference/access-authn-authz/rbac/`], ['Keystone authentication for Kubernetes', `${CPO}/keystone-auth/using-keystone-webhook-authenticator-and-authorizer.md`], ['Upgrading kubeadm clusters', `${K8S}/tasks/administer-cluster/kubeadm/kubeadm-upgrade/`], ['Velero', 'https://velero.io/docs/']],
        },
        {
          id: 'troubleshooting', title: 'Troubleshooting on OpenStack', minutes: 12,
          html: `
<table><tr><th>Symptom</th><th>Usual cause on OpenStack</th><th>First check</th></tr>
<tr><td>Service EXTERNAL-IP stays &lt;pending&gt;</td><td>OCCM credentials, Octavia quota, wrong subnet or floating network ID</td><td><code>kubectl describe svc</code>, OCCM pod logs, <code>openstack loadbalancer list</code></td></tr>
<tr><td>PVC stays Pending</td><td>No default StorageClass, wrong Cinder volume type, volume quota, AZ mismatch</td><td><code>kubectl describe pvc</code>, CSI controller logs</td></tr>
<tr><td>Pod stuck ContainerCreating (volume)</td><td>Attach failed: volume in another AZ, too many volumes on the VM, Cinder backend issue</td><td><code>kubectl describe pod</code>, <code>openstack volume show</code></td></tr>
<tr><td>Node NotReady</td><td>VM down, kubelet stopped, CNI broken, disk full</td><td><code>kubectl describe node</code>, <code>openstack server show</code>, kubelet logs</td></tr>
<tr><td>Cross-node pod traffic hangs on large payloads</td><td>MTU of CNI overlay on top of Neutron overlay</td><td><code>ip link</code> in pods, CNI MTU setting</td></tr></table>
${term('the Kubernetes first minute', `
$ kubectl get nodes
$ kubectl get pods -A | grep -v -E 'Running|Completed'
$ kubectl get events -A --sort-by=.lastTimestamp | tail -20
$ kubectl -n kube-system logs deploy/openstack-cloud-controller-manager --tail=50
$ kubectl -n kube-system logs deploy/csi-cinder-controllerplugin -c cinder-csi-plugin --tail=50`)}
${note('oracle', 'Most “Kubernetes problems” on OpenStack are OpenStack problems seen through Kubernetes: quotas, security groups, MTU, availability zones and credentials. Check both sides.')}
${lens({
  sys: 'Practise the three Kubernetes trials in the Oracle; each is based on a common real incident.',
  net: 'Keep a per-cluster record of node, pod and service CIDRs to avoid overlaps with tenant networks and VPNs.',
})}`,
          sources: [['Debug running pods', `${K8S}/tasks/debug/debug-application/debug-running-pod/`], ['Debug services', `${K8S}/tasks/debug/debug-application/debug-service/`], ['cloud-provider-openstack', 'https://github.com/kubernetes/cloud-provider-openstack']],
        },
      ],
      quiz: [
        { q: 'Which webhook lets OpenStack users log in to Kubernetes with Keystone credentials?', a: ['k8s-keystone-auth', 'kube-proxy', 'OCCM', 'CoreDNS'], c: 0, e: 'Part of cloud-provider-openstack.' },
        { q: 'How should Kubernetes minor versions be upgraded?', a: ['Skip several at once', 'One minor at a time, control plane first', 'Nodes first', 'Only reinstall'], c: 1, e: 'Kubernetes supports upgrading one minor version at a time.' },
        { q: 'A PVC stays Pending. Which is NOT a likely cause?', a: ['No default StorageClass', 'Cinder volume quota reached', 'Wrong Cinder volume type', 'A ClusterIP Service'], c: 3, e: 'Services have nothing to do with volume provisioning.' },
        { q: 'Which tool backs up namespaces and volumes to S3?', a: ['etcdctl', 'Velero', 'kubeadm', 'Helm'], c: 1, e: 'Velero backs up resources and volume snapshots.' },
        { q: 'A LoadBalancer Service stays <pending>. Where do you look first?', a: ['CoreDNS logs', 'kubectl describe svc and the OCCM logs', 'etcd', 'The kubelet on a random node'], c: 1, e: 'Events and OCCM logs show the OpenStack error.' },
      ],
    },
  ],
};
