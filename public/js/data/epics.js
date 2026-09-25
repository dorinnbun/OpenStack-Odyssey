// Side epics: external projects that complete OpenStack, each a separate
// journey from scratch. Add a new epic by writing a file like epic-ceph.js and
// listing it here. An epic with `openAccess: true` has every island open from
// the start (a reference pantheon rather than a strict sequence).
import { CEPH_EPIC } from './epic-ceph.js';
import { K8S_EPIC } from './epic-k8s.js';
import { OVN_EPIC } from './epic-ovn.js';
import { ARGUS_EPIC } from './epic-argus.js';
import { PANTHEON_EPIC } from './epic-pantheon.js';

export const EPICS = [CEPH_EPIC, K8S_EPIC, OVN_EPIC, ARGUS_EPIC, PANTHEON_EPIC];
