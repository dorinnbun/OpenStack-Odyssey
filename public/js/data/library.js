// "Beyond the Map": curated, trusted sources for topics the voyage does not yet
// teach in depth. Every link was checked against a live search index in
// September 2026. `kind` tells the reader how neutral the source is.
//   Official  – OpenStack / Kubernetes / Ceph / upstream project documentation
//   Foundation – OpenInfra Foundation material
//   Upstream  – open source project repository or docs outside openstack.org
//   Community – independent practitioner blog or guide
//   Vendor    – written by a company that sells products or services (useful, but not neutral)

export const LIBRARY = [
  {
    id: 'kubernetes', glyph: 'helmet', title: 'Kubernetes on OpenStack',
    why: 'Most private clouds now host Kubernetes. Learn how clusters are created on OpenStack (Magnum with Cluster API, or Cluster API directly) and how pods get OpenStack volumes and load balancers.',
    roles: ['sys', 'sa', 'pa', 'pre'], levels: ['scheria', 'phaeacian-court', 'k8s-geryon', 'k8s-hind', 'k8s-augeas'],
    links: [
      ['Magnum user guide', 'https://docs.openstack.org/magnum/latest/user/', 'Official'],
      ['Magnum Cluster API Helm driver', 'https://docs.openstack.org/magnum-capi-helm/latest/user_docs/index.html', 'Official'],
      ['magnum-cluster-api driver (Vexxhost)', 'https://github.com/vexxhost/magnum-cluster-api', 'Upstream'],
      ['Cluster API Provider OpenStack (CAPO) book', 'https://cluster-api-openstack.sigs.k8s.io/', 'Official'],
      ['cloud-provider-openstack (CCM, Cinder CSI, Octavia ingress)', 'https://github.com/kubernetes/cloud-provider-openstack', 'Official'],
      ['Using the Cinder CSI plugin', 'https://github.com/kubernetes/cloud-provider-openstack/blob/master/docs/cinder-csi-plugin/using-cinder-csi-plugin.md', 'Official'],
      ['Using the Octavia ingress controller', 'https://github.com/kubernetes/cloud-provider-openstack/blob/master/docs/octavia-ingress-controller/using-octavia-ingress-controller.md', 'Official'],
    ],
  },
  {
    id: 'backup-dr', glyph: 'amphora', title: 'Backup and disaster recovery',
    why: 'Snapshots live on the same backend as the volume. Real disaster recovery needs backups to a separate store, replication to a second site, and restores that have actually been rehearsed.',
    roles: ['sys', 'sa', 'pa', 'lead'], levels: ['circe', 'scylla', 'calypso', 'ceph-medea', 'k8s-cerberus', 'pan-demeter'],
    links: [
      ['Cinder replication in OpenStack', 'https://docs.openstack.org/cinder/latest/admin/replication-in-openstack.html', 'Official'],
      ['Cinder volume replication for disaster recovery (Charm guide)', 'https://docs.openstack.org/charm-guide/latest/admin/storage/cinder-replication-dr.html', 'Official'],
      ['Ceph RBD mirroring', 'https://docs.ceph.com/en/latest/rbd/rbd-mirroring/', 'Official'],
      ['Ops guide: backup and recovery', 'https://wiki.openstack.org/wiki/OpsGuide/Backup_and_Recovery', 'Official'],
      ['OpenStack disaster recovery with Ceph RBD mirror', 'https://satishdotpatel.github.io/openstack-dr-with-ceph-rbd-mirror/', 'Community'],
      ['Block storage backup planning (Red Hat)', 'https://docs.redhat.com/en/documentation/red_hat_openstack_platform/16.0/html/block_storage_backup_guide/assembly_backup_planning', 'Vendor'],
    ],
  },
  {
    id: 'vmware', glyph: 'trident', title: 'Migrating from VMware',
    why: 'The most common reason organisations evaluate OpenStack today. Covers assessment, reference architectures, conversion with virt-v2v, automation toolkits and real case studies.',
    roles: ['pre', 'sa', 'pa', 'sys'], levels: ['aeolus', 'phaeacian-court'],
    links: [
      ['VMware migration to OpenStack (OpenInfra hub)', 'https://www.openstack.org/vmware-migration-to-openstack/', 'Foundation'],
      ['VMware to OpenStack migration guide', 'https://www.openstack.org/vmware-migration-to-openstack/vmware-to-openstack-migration-guide', 'Foundation'],
      ['Case study: Okestro (Superuser)', 'https://superuser.openinfra.org/articles/vmware-migration-to-openstack-case-study-okestro/', 'Foundation'],
      ['os-migrate VMware migration kit', 'https://github.com/os-migrate/vmware-migration-kit', 'Upstream'],
      ['migratekit: near-live VMware migration (Vexxhost)', 'https://github.com/vexxhost/migratekit', 'Upstream'],
      ['virt-v2v manual', 'https://libguestfs.org/virt-v2v.1.html', 'Upstream'],
      ['VMware to OpenStack using virt-v2v (Rackspace)', 'https://blog.rackspacecloud.com/blog/2025/04/01/vmware_to_openstack_migration_using_virt-v2v/', 'Vendor'],
    ],
  },
  {
    id: 'cost', glyph: 'scroll', title: 'Cost, TCO and chargeback',
    why: 'Presales and architects must justify the business case. Learn how to model total cost of ownership and how to rate usage for showback or chargeback.',
    roles: ['pre', 'pa', 'lead', 'sa'], levels: ['phaeacian-court', 'sirens', 'pan-themis'],
    links: [
      ['CloudKitty (rating service) documentation', 'https://docs.openstack.org/cloudkitty/latest/', 'Official'],
      ['Rating in OpenStack with CloudKitty (Red Hat)', 'https://www.redhat.com/en/blog/taming-costs-cloud-environments-rating-openstack-cloudkitty', 'Vendor'],
      ['FinOps Framework: invoicing and chargeback', 'https://www.finops.org/framework/capabilities/invoicing-chargeback/', 'Upstream'],
      ['OpenStack vs VMware TCO calculator (Mirantis)', 'https://www.mirantis.com/tco-calculator/openstack-vs-vmware/', 'Vendor'],
      ['OpenStack vs AWS TCO calculator (Mirantis)', 'https://www.mirantis.com/tco-calculator/openstack-vs-aws/', 'Vendor'],
      ['How to calculate TCO for hosted private clouds (OpenMetal)', 'https://openmetal.io/resources/blog/how-to-calculate-total-cost-of-ownership-for-hosted-private-clouds/', 'Vendor'],
    ],
  },
  {
    id: 'ai-gpu', glyph: 'lamp', title: 'AI and GPU infrastructure',
    why: 'GPU passthrough, vGPU and MIG, accelerator management, and the RDMA/InfiniBand fabrics that AI training needs.',
    roles: ['sa', 'pa', 'sys', 'net'], levels: ['cyclops', 'scheria', 'phaeacian-court', 'k8s-geryon', 'pan-hephaestus'],
    links: [
      ['OpenStack for AI white paper', 'https://www.openstack.org/openstack-for-ai-white-paper', 'Foundation'],
      ['Nova: attaching virtual GPUs (vGPU)', 'https://docs.openstack.org/nova/latest/admin/virtual-gpu.html', 'Official'],
      ['Nova: PCI passthrough', 'https://docs.openstack.org/nova/latest/admin/pci-passthrough.html', 'Official'],
      ['Cyborg (accelerators) documentation', 'https://docs.openstack.org/cyborg/latest/', 'Official'],
      ['NVIDIA reference guide: virtualised GPU workloads on OpenStack over InfiniBand', 'https://docs.nvidia.com/networking/display/public/SOL/RDG+for+Virtualizing+GPU-Accelerated+HPC+and+AI+Workloads+on+OpenStack+Cloud+over+InfiniBand+Fabric', 'Vendor'],
      ['NVIDIA reference guide: bare-metal GPU workloads on OpenStack over InfiniBand', 'https://docs.nvidia.com/networking/display/public/sol/rdg+for+bare+metal+gpu-accelerated+hpc+and+ai+workloads+on+openstack+cloud+over+infiniband+fabric', 'Vendor'],
      ['Kubernetes, RDMA and OpenStack (StackHPC)', 'https://www.stackhpc.com/k8s-rdma-openstack.html', 'Vendor'],
    ],
  },
  {
    id: 'automation', glyph: 'column', title: 'Automation: SDK, Ansible, Terraform',
    why: 'Everything in OpenStack is an API. These are the standard tools for managing it as code.',
    roles: ['sys', 'net', 'sa', 'lead'], levels: ['lotus', 'calypso', 'pan-apollo', 'pan-hermes'],
    links: [
      ['openstacksdk user guide (Python)', 'https://docs.openstack.org/openstacksdk/latest/user/', 'Official'],
      ['Ansible openstack.cloud collection', 'https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/index.html', 'Upstream'],
      ['ansible-collections-openstack source', 'https://github.com/openstack/ansible-collections-openstack', 'Official'],
      ['Terraform OpenStack provider (registry)', 'https://registry.terraform.io/providers/terraform-provider-openstack/openstack/latest/docs', 'Upstream'],
      ['terraform-provider-openstack (works with OpenTofu)', 'https://github.com/terraform-provider-openstack/terraform-provider-openstack', 'Upstream'],
      ['Heat template guide', 'https://docs.openstack.org/heat/latest/template_guide/', 'Official'],
    ],
  },
  {
    id: 'performance', glyph: 'lyre', title: 'Performance testing and benchmarking',
    why: 'Measure before you tune and before you promise numbers to a customer: API scale, VM boot times, network and disk throughput.',
    roles: ['sys', 'net', 'sa', 'lead'], levels: ['sirens', 'return-ithaca', 'argus-cloud'],
    links: [
      ['OpenStack performance docs: tools', 'https://docs.openstack.org/performance-docs/latest/methodologies/tools.html', 'Official'],
      ['Rally benchmarking framework', 'https://github.com/openstack/rally', 'Official'],
      ['Browbeat: orchestrates Rally, Shaker and PerfKit', 'https://browbeat.readthedocs.io/usage.html', 'Upstream'],
      ['fio (disk I/O benchmarking) documentation', 'https://fio.readthedocs.io/en/latest/', 'Upstream'],
    ],
  },
  {
    id: 'multisite', glyph: 'owl', title: 'Multi-region, federation and edge',
    why: 'Designs that span sites: shared or federated Keystone, independent regions, and thousands of small edge locations.',
    roles: ['pa', 'sa', 'net'], levels: ['scylla', 'phaeacian-court', 'ovn-minotaur'],
    links: [
      ['Multiple regions with Kolla-Ansible', 'https://docs.openstack.org/kolla-ansible/latest/user/multi-regions.html', 'Official'],
      ['Multi-region deployments (Canonical OpenStack)', 'https://canonical-openstack.readthedocs-hosted.com/en/latest/how-to/misc/multiregion-deployments/', 'Vendor'],
      ['Keystone federation introduction', 'https://docs.openstack.org/keystone/latest/admin/federation/introduction.html', 'Official'],
      ['Keystone edge architectures', 'https://wiki.openstack.org/wiki/Keystone_edge_architectures', 'Official'],
      ['OpenInfra Edge Computing Group', 'https://wiki.openstack.org/wiki/Edge_Computing_Group', 'Foundation'],
      ['StarlingX (edge cloud platform)', 'https://www.starlingx.io/', 'Foundation'],
      ['Where next-generation edge and AI intersect', 'https://openinfra.org/blog/where-do-next-generation-edge-and-ai-intersect/', 'Foundation'],
    ],
  },
  {
    id: 'ipv6-dns', glyph: 'trident', title: 'IPv6 and DNS',
    why: 'IPv6 addressing modes and prefix delegation, and automatic DNS records for ports and floating IPs with Designate.',
    roles: ['net', 'sys', 'sa'], levels: ['laestrygonians', 'scheria', 'ovn-minotaur', 'pan-athena'],
    links: [
      ['Neutron: IPv6', 'https://docs.openstack.org/neutron/latest/admin/config-ipv6.html', 'Official'],
      ['Neutron: DNS integration with an external service', 'https://docs.openstack.org/neutron/latest/admin/config-dns-int-ext-serv.html', 'Official'],
      ['Designate: using DNS with Neutron and Nova', 'https://docs.openstack.org/designate/latest/user/neutron-integration.html', 'Official'],
    ],
  },
  {
    id: 'swift-ironic', glyph: 'amphora', title: 'Object storage and bare metal in depth',
    why: 'How Swift places data with rings and storage policies, and how Ironic provisions physical servers (including standalone with Bifrost).',
    roles: ['sys', 'sa', 'pa'], levels: ['circe', 'scheria', 'ceph-colchis', 'pan-poseidon', 'pan-hephaestus'],
    links: [
      ['Swift architectural overview', 'https://docs.openstack.org/swift/latest/overview_architecture.html', 'Official'],
      ['Swift: the rings', 'https://docs.openstack.org/swift/latest/overview_ring.html', 'Official'],
      ['Swift: storage policies', 'https://docs.openstack.org/swift/latest/overview_policies.html', 'Official'],
      ['Ironic: install and configure', 'https://docs.openstack.org/ironic/latest/install/install.html', 'Official'],
      ['Bifrost: standalone Ironic installation', 'https://docs.openstack.org/bifrost/latest/install/index.html', 'Official'],
    ],
  },
  {
    id: 'certification', glyph: 'laurel', title: 'Certification, releases and community',
    why: 'Prove your skills with the official hands-on exam, track what changes in each release, and keep learning from operators.',
    roles: ['sys', 'net', 'pre', 'sa', 'pa', 'lead'], levels: ['return-ithaca', 'calypso', 'ithaca'],
    links: [
      ['Certified OpenStack Administrator (COA) exam', 'https://www.openstack.org/coa/', 'Foundation'],
      ['The COA exam: why it matters and how to pass it (Superuser)', 'https://superuser.openinfra.org/articles/the-certified-openstack-administrator-exam-why-it-matters-for-your-career-and-how-to-pass-it/', 'Foundation'],
      ['Kolla-Ansible 2026.1 release notes', 'https://docs.openstack.org/releasenotes/kolla-ansible/2026.1.html', 'Official'],
      ['Superuser: operator stories and how-tos', 'https://superuser.openinfra.org/', 'Foundation'],
      ['OpenInfra blog', 'https://openinfra.org/blog/', 'Foundation'],
    ],
  },
];
