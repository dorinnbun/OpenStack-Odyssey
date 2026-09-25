# ⛵ OpenStack Odyssey

An interactive, gamified OpenStack course that takes you from **your first Keystone token to troubleshooting multi-layer production incidents and writing architecture proposals**. It follows the story of Homer's *Odyssey*: fifteen islands (levels), each with quests, a trial and a relic to earn.

It is written for **system engineers, network engineers, presales, solution architects, principal architects and engineering leads**. Every lesson ends with a *role lens* that explains what the topic means for each of those roles.

The content targets **OpenStack 2026.1 "Gazpacho"** (a SLURP release). Sources: [docs.openstack.org/2026.1](https://docs.openstack.org/2026.1/), [openstack.org/software](https://www.openstack.org/software/), plus trusted upstream references (Ceph, OVN, RabbitMQ, Galera, libvirt, cloud-init, NIST, Google SRE). Each lesson lists its own sources.

## What's inside

| Feature | What it does |
|---|---|
| **The Voyage** (15 levels, 34 lessons, 72 trial questions) | Mortal → Sailor → Hero → Demigod → Olympian tiers. Covers cloud basics, Keystone, the CLI, Nova/Placement, Glance, Neutron/OVN, Cinder/Ceph, troubleshooting method, observability, HA, security, deployment and upgrades, advanced networking and services, architecture and presales, and expert incident case studies. |
| **Side epics** (25 islands, 49 lessons, 107 questions) | Four more journeys from scratch, each with its own map, unlock chain, relics, honour and trials. **The Argonautica (Ceph)**, 7 islands: storage basics → daemons → cephadm → pools, PGs and CRUSH → Ceph as OpenStack's storage → operations → troubleshooting and design. **The Labours of the Helmsman (Kubernetes)**, 6 islands: containers → Deployments → Services and Octavia → Cinder CSI → Magnum and Cluster API → security, upgrades, troubleshooting. **The Labyrinth of Daedalus (OVN)**, 6 islands: networking basics → Open vSwitch → OVN architecture → tracing packets with ovn-trace → Neutron on OVN (gateways, NAT, security groups, BGP) → RAFT operations, upgrades and failures. **The Watch of Argus (Monitoring)**, 6 islands: metrics/logs/traces and SLOs → Prometheus and PromQL → Grafana → Alertmanager (grouping, inhibition, silences) → central logging with OpenSearch → monitoring OpenStack and Ceph end to end with capacity forecasts and SLO burn alerts. Beginner "In plain words" boxes and per-island goals throughout. |
| **The Oracle** (20 scenarios) | Branching troubleshooting trials based on real incidents: No valid host, DHCP failures, floating IPs, MTU, Fernet keys, stuck volumes, RabbitMQ partitions, live migration, Octavia, noisy neighbours. |
| **Terminal labs** (11 labs) | A stateful simulator for `openstack`, `ceph`/`rbd`, OVN (`ovn-nbctl`, `ovn-sbctl`, `ovn-trace`, `ovs-vsctl`, `ssh` between hosts) and monitoring (`promql`, `amtool`), including a failed-disk drill, a stale-tunnel hunt and an on-call night shift in the browser. It produces real-looking tables and real error messages, and supports `-f json/value`, `-c`, tab completion and command history. Objectives are checked automatically. |
| **Architecture Forge** | A sizing calculator with presets (enterprise, edge, AI/GPU, telco). It generates a live physical diagram and a draft Markdown proposal you can download. |
| **Cheat Sheet** | Over 180 commands in 12 domains, plus symptom → cause → first check, default ports, resource states, key config options and formulas. You can search it, copy any command and print it to PDF. |
| **Beyond the Map** | 63 trusted sources for 11 topics the voyage doesn't cover in depth yet: Kubernetes on OpenStack, backup/DR, VMware migration, cost/TCO/chargeback, AI/GPU, automation, performance testing, multi-region and edge, IPv6/DNS, Swift/Ironic, and certification. Each link is labelled Official, Foundation, Upstream, Community or Vendor, and can be filtered by role. Level pages link to the related topics. |
| **Codex** | A service catalogue with links to the 2026.1 docs, a symptom → log map, a glossary and the full source list. |
| **Hero profile & paths** | XP, 8 ranks, relics, honours, learning paths per role, a free-roam mode for pros, and progress export/import. |

Progress is saved in the browser (`localStorage`). No account or backend is needed.

## Design language

The site is styled after ancient Greece, not a modern web app:

- **Day theme:** papyrus and limestone with black-figure pottery (black on terracotta). **Night theme** (ΝΥΞ): red-figure pottery (terracotta and cream on black glaze).
- **Home:** a temple front with a pediment carved with a trireme, a Doric triglyph frieze, fluted columns and a stepped base.
- **Voyage map:** drawn like an ancient chart, with hand-drawn islands, a wind rose, a dotted route and a trireme marking where you are.
- **Books** are numbered with Greek letters (Α, Β, Γ…), as Homer's books are. Trial answers use Α Β Γ Δ.
- **Relics** are bronze coins (drachmae) stamped with the book's letter. Icons are black-figure glyphs: owl, amphora, column, helmet, lyre, scroll, lamp, laurel and trident. There are no emoji.
- **Type:** Cinzel inscription capitals, EB Garamond text, and meander (Greek key) friezes. All shapes are square-cut stone tablets.

## Hosting on Cloudflare (free plan): which option?

**Recommended: Cloudflare Workers with Static Assets** (already configured in `wrangler.jsonc`).

| | **Workers + Static Assets** ✅ | Cloudflare Pages |
|---|---|---|
| Static requests | Free and unlimited | Free and unlimited |
| Dynamic code | Workers: 100k requests/day on free | Pages Functions: count against the same 100k/day |
| File limits (free) | 20,000 files, 25 MiB each | 20,000 files, 25 MiB each |
| Future features | Full Workers platform: D1, KV, Durable Objects, Cron Triggers, better observability | Subset; Cloudflare now points new projects to Workers and publishes a Pages → Workers migration guide |
| Deploy | `npx wrangler deploy` or Git-connected builds | Git integration or `wrangler pages deploy` |

The site is fully static and the config has no Worker script, so **no request uses your Workers quota**: it is effectively free at any traffic level. If you later want cloud-synced progress or leaderboards, add a small Worker (`main` + `run_worker_first: ["/api/*"]`) with D1 or KV. Only `/api/*` calls would then count toward the 100k/day free quota.

Choose **Pages** only if you want its Git-based preview deployments and never plan to add server-side features. The same `public/` folder works there unchanged: set the build output directory to `public` and leave the build command empty.

### Deploy steps (Workers)

```bash
npm install                 # installs wrangler
npx wrangler login
npm run deploy              # = wrangler deploy → https://openstack-odyssey.<your-subdomain>.workers.dev
```

For Git-based CI: Cloudflare dashboard → Workers & Pages → Create → Import a repository → select this repo. Leave the build command empty and use `npx wrangler deploy` as the deploy command. Add a custom domain under the Worker's *Settings → Domains & Routes*.

`public/_headers` sets security headers (CSP, frame denial and similar) and cache rules. Workers static assets apply it automatically.

## Local development

```bash
npm run serve    # python static server on http://localhost:8788
npm run dev      # or wrangler dev (closest to production)
npm run check    # syntax-check all JS and validate curriculum integrity
```

There is no build step and no framework: plain HTML, CSS and ES modules.

## Project structure

```
public/
  index.html            app shell
  css/odyssey.css       ancient Greek design: papyrus, black-/red-figure pottery, temple, meander
  js/app.js             router, progress/XP, pages
  js/terminal.js        openstack CLI simulator + lab definitions
  js/forge.js           sizing calculator, diagram, proposal generator
  js/ornaments.js       coins, trireme and black-figure glyphs (inline SVG)
  js/data/levels-*.js   curriculum (lessons, role lenses, quizzes)
  js/data/scenarios.js  Oracle troubleshooting trees
  js/data/cheatsheet.js cheat sheet data
  js/data/codex.js      services, log map, glossary, sources
scripts/validate.mjs    content integrity checks
wrangler.jsonc          Cloudflare Workers static-assets config
```

## Extending the journey

- **Add a lesson**: add an object to a level's `lessons` array in `public/js/data/levels-*.js`. Use the `term()`, `note()`, `lens()` and `fig()` helpers from `helpers.js`.
- **Add an Oracle trial**: add a node graph to `scenarios.js`. Each choice needs either `go` (correct, next node) or `wrong` (feedback). The final node has `end: true`.
- **Add a side epic**: copy `public/js/data/epic-ceph.js` as a template (id, title, greekTitle, project, glyph, tagline, myth, map, short, levels) and list it in `public/js/data/epics.js`. `npm run check` validates numbering, map points and references.
- **Add a Beyond-the-Map source**: add a `[title, url, kind]` entry to `public/js/data/library.js`. `npm run check` validates kinds, roles, levels and HTTPS.
- **Add a terminal command**: add a handler to `P.cmds` in `terminal.js`. It appears in tab completion automatically.
- Run `npm run check` before committing.

*OpenStack® is a registered trademark of the OpenInfra Foundation. This is an independent community learning project.*
