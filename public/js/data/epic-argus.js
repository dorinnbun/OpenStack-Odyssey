import { term, note, lens, fig } from './helpers.js';

// Argus Panoptes: observability from scratch (metrics, dashboards, alerts,
// logs), ending with a complete monitoring design for OpenStack and Ceph.
const PROM = 'https://prometheus.io/docs';
const KOLLA = 'https://docs.openstack.org/kolla-ansible/latest/reference/logging-and-monitoring';

const pipeSvg = `<svg viewBox="0 0 760 250" role="img" aria-label="Monitoring pipeline">
  <style>.b{fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5}.t{font:600 14px 'EB Garamond',Georgia,serif;fill:var(--ink)}.s{font:italic 12.5px 'EB Garamond',Georgia,serif;fill:var(--muted)}.a{stroke:var(--accent-text);stroke-width:2;fill:none;marker-end:url(#arg)}</style>
  <defs><marker id="arg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent-text)"/></marker></defs>
  <rect x="20" y="20" width="170" height="150" class="b"/><text x="34" y="44" class="t">Exporters</text>
  <text x="34" y="68" class="s">node (hosts)</text><text x="34" y="88" class="s">openstack-exporter</text><text x="34" y="108" class="s">libvirt · OVN · mysqld</text><text x="34" y="128" class="s">rabbitmq · haproxy</text><text x="34" y="148" class="s">ceph (mgr module)</text>
  <path d="M190 95H258" class="a"/><text x="198" y="85" class="s">scrape</text>
  <rect x="260" y="60" width="160" height="70" fill="var(--ochre)" opacity=".3" stroke="var(--line-strong)"/><text x="276" y="88" class="t">Prometheus</text><text x="276" y="110" class="s">stores time series, rules</text>
  <path d="M420 80H498" class="a"/><path d="M420 115H498" class="a"/>
  <rect x="500" y="36" width="120" height="50" class="b"/><text x="514" y="66" class="t">Grafana</text>
  <rect x="500" y="100" width="120" height="50" class="b"/><text x="514" y="130" class="t">Alertmanager</text>
  <path d="M620 125H688" class="a"/><rect x="690" y="100" width="60" height="50" class="b"/><text x="700" y="130" class="t">pager</text>
  <rect x="20" y="194" width="400" height="44" class="b"/><text x="34" y="221" class="t">Logs: Fluentd/Fluent Bit → OpenSearch (or Loki)</text>
  <text x="440" y="221" class="s">searched in OpenSearch Dashboards or Grafana</text>
</svg>`;

export const ARGUS_EPIC = {
  id: 'argus',
  title: 'The Watch of Argus',
  greekTitle: 'ΑΡΓΟΣ ΠΑΝΟΠΤΗΣ',
  project: 'Monitoring',
  honour: 'Keeper of the Hundred Eyes',
  glyph: 'owl',
  tagline: 'Observability from scratch: metrics, dashboards, alerts and logs for OpenStack and Ceph',
  myth: 'Hera set Argus Panoptes, the giant with a hundred eyes, to keep watch: some of his eyes always stayed open, so nothing escaped him. A monitored cloud needs the same: eyes on every host and service, and a way to tell which of a hundred signals deserves to wake a human.',
  rose: [575, 335],
  map: [[95, 240, 1], [255, 130, -1], [415, 255, 1], [575, 120, -1], [735, 250, 1], [895, 135, -1]],
  short: ['Hera’s Watchman', 'The Hundred Eyes', 'Mirror of Perseus', 'The Beacon Fires', 'Library of Scrolls', 'Argus over the Cloud'],
  levels: [
    // ------------------------------------------------------------ 1
    {
      id: 'argus-watchman', n: 1, place: 'Hera’s Watchman', title: 'Why We Watch',
      subtitle: 'Metrics, logs and traces, and what “healthy” means',
      tier: 'Novice', relic: { name: 'Peacock Feather', desc: 'You know what to watch and why.' },
      myth: 'When Argus fell, Hera set his hundred eyes in the peacock’s tail so they would never be lost. Monitoring starts with the same promise: never lose sight of what matters.',
      goals: ['Tell metrics, logs and traces apart', 'Describe the USE and RED methods', 'Write a simple SLI and SLO'],
      lessons: [
        {
          id: 'signals', title: 'Three kinds of signal', minutes: 9,
          html: `
<table><tr><th>Signal</th><th>Plain words</th><th>Example</th><th>Typical tool</th></tr>
<tr><td><b>Metrics</b></td><td>Numbers measured over time</td><td>CPU 72%, 3 API errors per second</td><td>Prometheus</td></tr>
<tr><td><b>Logs</b></td><td>Diary entries for each event</td><td>“ERROR No valid host was found”</td><td>OpenSearch, Loki</td></tr>
<tr><td><b>Traces</b></td><td>The path of one request through many services</td><td>API → scheduler → compute: 4.1 s</td><td>OpenTelemetry (plus OpenStack request IDs)</td></tr></table>
${note('plain', 'Metrics tell you <b>that</b> something is wrong (the temperature is rising). Logs tell you <b>what</b> happened (the fire started in the kitchen). Traces tell you <b>where</b> a single request spent its time.')}
<h3>Two checklists for what to measure</h3>
<ul>
<li><b>USE</b> for resources (hosts, disks, links): <b>U</b>tilisation, <b>S</b>aturation, <b>E</b>rrors.</li>
<li><b>RED</b> for services (APIs): <b>R</b>ate of requests, <b>E</b>rrors, <b>D</b>uration.</li>
</ul>
${lens({
  sys: 'Apply USE to every hypervisor and storage node, and RED to every OpenStack API behind HAProxy.',
  lead: 'Agree what “healthy” means before choosing tools. Tools without targets create dashboards nobody reads.',
})}`,
          sources: [['Google SRE book: monitoring distributed systems', 'https://sre.google/sre-book/monitoring-distributed-systems/'], ['Prometheus overview', `${PROM}/introduction/overview/`]],
        },
        {
          id: 'slo', title: 'SLIs and SLOs in plain words', minutes: 9,
          html: `
<ul>
<li>An <b>SLI</b> (service level indicator) is a measurement of user experience, for example “percentage of <code>server create</code> requests that succeed”.</li>
<li>An <b>SLO</b> (objective) is the target, for example “99.5% of VM builds succeed over 30 days”.</li>
<li>The <b>error budget</b> is what the SLO allows to fail: 0.5% of builds. Spend it on change; stop risky changes when it runs out.</li>
</ul>
<table><tr><th>Cloud SLI</th><th>How to measure</th></tr>
<tr><td>API availability</td><td>Share of non-5xx responses at HAProxy</td></tr>
<tr><td>VM build success and time</td><td>A canary that boots and deletes a tiny VM every few minutes</td></tr>
<tr><td>Volume attach success</td><td>Canary attach/detach, or Cinder notifications</td></tr>
<tr><td>Network reachability</td><td>Probe a canary VM’s floating IP from outside</td></tr></table>
${note('oracle', 'Page a human when the SLO is at risk (users are affected or soon will be), not for every metric that looks unusual.')}
${lens({
  pa: 'Publish SLOs for the platform. They justify redundancy spending and set expectations with tenants.',
  pre: 'Customers ask “what availability do you guarantee?”. SLOs backed by canary measurements are a credible answer.',
})}`,
          sources: [['Google SRE book: service level objectives', 'https://sre.google/sre-book/service-level-objectives/'], ['Google SRE workbook: alerting on SLOs', 'https://sre.google/workbook/alerting-on-slos/']],
        },
      ],
      quiz: [
        { q: 'Which signal is best for “how many API errors per second right now?”', a: ['Logs', 'Metrics', 'Traces', 'Backups'], c: 1, e: 'Rates over time are metrics.' },
        { q: 'USE stands for…', a: ['Users, Sessions, Events', 'Utilisation, Saturation, Errors', 'Uptime, Speed, Efficiency', 'Update, Scale, Evacuate'], c: 1, e: 'Brendan Gregg’s method for resources.' },
        { q: 'An SLO is…', a: ['A raw measurement', 'A target for a user-facing measurement', 'A log format', 'A dashboard'], c: 1, e: 'The SLI is the measurement; the SLO is the target.' },
        { q: 'Best way to know whether users can actually create VMs?', a: ['CPU graphs', 'A canary that creates and deletes a VM regularly', 'Asking users', 'Counting hypervisors'], c: 1, e: 'Synthetic end-to-end checks measure real experience.' },
      ],
    },
    // ------------------------------------------------------------ 2
    {
      id: 'argus-eyes', n: 2, place: 'The Hundred Eyes', title: 'Prometheus and PromQL',
      subtitle: 'Scraping, exporters, labels and your first queries',
      tier: 'Novice', relic: { name: 'Eye of Argus', desc: 'You can ask Prometheus anything.' },
      myth: 'Each of Argus’s eyes watched one thing. Each Prometheus exporter is an eye: it shows one kind of system as numbers that Prometheus collects every few seconds.',
      goals: ['Explain scraping, targets, exporters and labels', 'Write PromQL with rate, sum by, and comparisons', 'Find down targets and saturated resources'],
      lab: 'argus-eyes',
      oracle: ['prom-cardinality'],
      lessons: [
        {
          id: 'prometheus', title: 'How Prometheus works', minutes: 11,
          html: `
${fig(pipeSvg, 'Exporters expose numbers, Prometheus scrapes and stores them, Grafana shows them and Alertmanager routes alerts.')}
<ul>
<li>An <b>exporter</b> is a small program exposing metrics over HTTP at <code>/metrics</code>.</li>
<li>Prometheus <b>scrapes</b> every <b>target</b> on a schedule (e.g. every 30 s) and stores each <b>time series</b>.</li>
<li>Every series has a name and <b>labels</b>, e.g. <code>node_load1{instance="cmp-07:9100", job="node"}</code>.</li>
<li>If a scrape fails, Prometheus records <code>up{…} 0</code> for that target: the most useful metric of all.</li>
</ul>
${term('what an exporter returns', `
$ curl -s http://cmp-07:9100/metrics | grep -E '^node_load1|^node_filesystem_avail_bytes' | head -3
node_load1 3.21
node_filesystem_avail_bytes{device="/dev/sda2",fstype="xfs",mountpoint="/"} 4.1e+10`)}
<p>Prometheus 3.x is the current major version (3.14 in August 2026, with an LTS series), released every six weeks.</p>
${lens({
  sys: 'Every exporter adds targets and series. Keep an inventory of which exporters run where; it is your map of what Argus can see.',
  net: 'Scraping is pull-based: Prometheus must reach every exporter port. Plan firewall rules from the monitoring network.',
})}`,
          sources: [['Prometheus overview', `${PROM}/introduction/overview/`], ['Data model', `${PROM}/concepts/data_model/`], ['Prometheus releases', 'https://github.com/prometheus/prometheus/releases']],
        },
        {
          id: 'promql', title: 'PromQL you will actually use', minutes: 13,
          html: `
${term('five queries every operator needs', `
# 1. which targets are down?
up == 0
# 2. CPU busy % per host (rate turns counters into per-second values)
100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))
# 3. which disks will be full within 24 hours, at the current trend?
predict_linear(node_filesystem_avail_bytes{mountpoint="/var/lib/docker"}[6h], 24*3600) < 0
# 4. API errors per second through HAProxy, per backend
sum by (proxy) (rate(haproxy_backend_http_responses_total{code="5xx"}[5m]))
# 5. which nova-compute services are down? (openstack-exporter)
openstack_nova_agent_state{service="nova-compute"} == 0`)}
${note('plain', '<b>Counters</b> only go up (total requests ever). <code>rate(x[5m])</code> turns them into “per second, averaged over 5 minutes”. <b>Gauges</b> go up and down (free disk space) and are used as they are.')}
<ul>
<li><code>sum by (label)</code> adds series together, keeping one result per label value.</li>
<li>Comparisons like <code>== 0</code> or <code>&gt; 0.9</code> filter results; alert rules are just queries that return something.</li>
<li><code>absent(up{job="openstack"})</code> fires when a metric disappears entirely, so you catch a dead exporter too.</li>
</ul>
${lens({
  sys: 'Practise in the Terminal lab “The Hundred Eyes”: find the down host, the dead nova-compute and the disk about to fill.',
  lead: 'Keep useful queries in version-controlled recording rules so everyone uses the same definitions.',
})}`,
          sources: [['Querying basics', `${PROM}/prometheus/latest/querying/basics/`], ['Query functions (rate, predict_linear, absent)', `${PROM}/prometheus/latest/querying/functions/`], ['openstack-exporter', 'https://github.com/openstack-exporter/openstack-exporter']],
        },
      ],
      quiz: [
        { q: 'What does up == 0 return?', a: ['Hosts with high load', 'Targets Prometheus failed to scrape', 'Stopped VMs', 'Idle CPUs'], c: 1, e: 'up is 0 when a scrape fails.' },
        { q: 'Why wrap a counter in rate()?', a: ['To make it smaller', 'To turn an ever-growing total into a per-second rate', 'To delete it', 'To add labels'], c: 1, e: 'Counters only increase; rate gives change per second.' },
        { q: 'Which function estimates when a disk will be full?', a: ['sum', 'predict_linear', 'absent', 'topk'], c: 1, e: 'It extrapolates the trend linearly.' },
        { q: 'How do you get one result per host from many CPU series?', a: ['avg by (instance) (...)', 'rate only', 'count()', 'absent()'], c: 0, e: 'Aggregate with by (instance).' },
      ],
    },
    // ------------------------------------------------------------ 3
    {
      id: 'argus-mirror', n: 3, place: 'The Mirror of Perseus', title: 'Dashboards That Help',
      subtitle: 'Grafana: data sources, panels, variables and good dashboard design',
      tier: 'Apprentice', relic: { name: 'Polished Shield', desc: 'Your dashboards show the truth at a glance.' },
      myth: 'Perseus could not look at Medusa directly, so he watched her in his polished shield. A dashboard is that shield: a safe reflection of a system you cannot look at directly.',
      goals: ['Connect Grafana to Prometheus and OpenSearch', 'Build panels with variables per host or service', 'Design dashboards that answer questions, not decorate walls'],
      lessons: [
        {
          id: 'grafana', title: 'Grafana basics', minutes: 10,
          html: `
<ul>
<li>A <b>data source</b> connects Grafana to Prometheus, OpenSearch, Loki or Alertmanager.</li>
<li>A <b>panel</b> is one query drawn as a time series, stat, table, gauge or heatmap.</li>
<li><b>Variables</b> (for example <code>$host</code>) let one dashboard serve every host from a drop-down.</li>
<li><b>Provisioning</b> loads dashboards from files, so they live in Git, not only in the UI.</li>
</ul>
${term('a panel query using a variable', `
# variable "host":  label_values(node_uname_info, nodename)
100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle", instance=~"$host.*"}[5m])))`)}
<p>Kolla-Ansible deploys Grafana with Prometheus as a data source (<code>enable_grafana</code>, <code>enable_prometheus</code>); recent releases also add Alertmanager as a Grafana data source.</p>
${lens({
  sys: 'Start from community dashboards (node exporter, Ceph, RabbitMQ, OVN) and trim them. Never start from an empty page.',
})}`,
          sources: [['Grafana documentation', 'https://grafana.com/docs/grafana/latest/'], ['Kolla-Ansible: Grafana', `${KOLLA}/grafana-guide.html`]],
        },
        {
          id: 'design', title: 'Designing dashboards people use', minutes: 9,
          html: `
<ol>
<li><b>One question per dashboard</b>: “Is the cloud healthy?”, “Why is this hypervisor slow?”, “How much capacity is left?”.</li>
<li><b>Top row = verdict</b>: a few stat panels in green/amber/red (API availability, failed builds, Ceph health, free capacity).</li>
<li><b>Then drill-down</b>: graphs that explain the verdict, then links to logs for the same time range.</li>
<li><b>Same scales and units</b> everywhere; label units (%, ms, bytes/s).</li>
<li><b>Annotate changes</b>: deploys and upgrades as annotations explain many spikes instantly.</li>
</ol>
${note('plain', 'A good dashboard lets a new on-call engineer answer “is it us, and where?” in under a minute without asking anyone.')}
${lens({
  lead: 'Review dashboards quarterly: delete panels nobody used during the last incidents.',
  pre: 'A clean “cloud health” dashboard is the most convincing screen in a demo of operational maturity.',
})}`,
          sources: [['Grafana dashboard best practices', 'https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/']],
        },
      ],
      quiz: [
        { q: 'What makes one dashboard serve every host?', a: ['Annotations', 'Variables', 'Alerts', 'Plugins'], c: 1, e: 'Template variables such as $host.' },
        { q: 'What belongs in the top row of an operations dashboard?', a: ['Every metric you have', 'A few verdict panels showing health at a glance', 'Logs', 'Nothing'], c: 1, e: 'Verdict first, detail below.' },
        { q: 'Why provision dashboards from files?', a: ['Speed', 'They are versioned in Git and reproducible', 'Grafana requires it', 'For colour themes'], c: 1, e: 'Dashboards as code.' },
        { q: 'Why add deployment annotations to graphs?', a: ['Decoration', 'They explain spikes caused by changes', 'They reduce storage', 'They trigger alerts'], c: 1, e: 'Most incidents follow a change.' },
      ],
    },
    // ------------------------------------------------------------ 4
    {
      id: 'argus-beacons', n: 4, place: 'The Beacon Fires', title: 'Alerts Worth Waking For',
      subtitle: 'Alert rules, Alertmanager routing, grouping, inhibition and silences',
      tier: 'Adept', relic: { name: 'Beacon Torch', desc: 'Your alerts are few, clear and actionable.' },
      myth: 'When Troy fell, a chain of beacon fires carried the news from mountain to mountain to Mycenae in a single night. Alerts are your beacons: they must carry one clear message quickly, and only when it matters.',
      goals: ['Write alert rules with for, labels and runbook links', 'Route, group and inhibit alerts in Alertmanager', 'Use silences safely during maintenance'],
      lab: 'argus-eyes',
      oracle: ['alert-storm', 'silent-watch'],
      lessons: [
        {
          id: 'rules', title: 'Alert rules', minutes: 11,
          html: `
${term('alerts.yml', `
groups:
  - name: cloud
    rules:
      - alert: NovaComputeDown
        expr: openstack_nova_agent_state{service="nova-compute", adminState="enabled"} == 0
        for: 5m
        labels: { severity: critical, team: compute }
        annotations:
          summary: "nova-compute down on {{ $labels.hostname }}"
          runbook_url: "https://wiki.example.com/runbooks/nova-compute-down"
      - alert: DiskWillFillIn24h
        expr: predict_linear(node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}[6h], 24*3600) < 0
        for: 30m
        labels: { severity: warning }`)}
<ul>
<li><b>for</b>: the condition must hold this long, which filters out brief blips.</li>
<li><b>severity</b>: <i>critical</i> pages a human now; <i>warning</i> goes to a ticket or chat.</li>
<li><b>runbook_url</b>: every alert links to what to do. No runbook, no page.</li>
</ul>
${lens({
  sys: 'Test rules with <code>promtool check rules alerts.yml</code> in CI before deploying them.',
  lead: 'Track pages per week and per engineer. More than a couple of pages per shift burns people out.',
})}`,
          sources: [['Alerting rules', `${PROM}/prometheus/latest/configuration/alerting_rules/`], ['Google SRE workbook: on-call', 'https://sre.google/workbook/on-call/']],
        },
        {
          id: 'alertmanager', title: 'Alertmanager: routing, grouping, silencing', minutes: 11,
          html: `
${term('alertmanager.yml (excerpt)', `
route:
  receiver: chat
  group_by: [alertname, cluster]
  group_wait: 30s
  repeat_interval: 4h
  routes:
    - matchers: [severity="critical"]
      receiver: pager
inhibit_rules:
  - source_matchers: [alertname="NodeDown"]
    target_matchers: [severity=~"warning|critical"]
    equal: [instance]`)}
<ul>
<li><b>Grouping</b> turns 40 alerts from one failure into one notification.</li>
<li><b>Inhibition</b> hides the consequences when the cause is already alerting: if the host is down, do not also page for every service on it.</li>
<li><b>Silences</b> mute matching alerts for a time window during planned work.</li>
<li>A <b>Watchdog</b> alert that always fires proves the whole pipeline works; if it stops arriving, your monitoring is broken.</li>
</ul>
${term('silence planned work', `
$ amtool silence add alertname=NodeDown instance=~"cmp-07.*" \\
    --comment="PSU replacement, ticket OPS-812" --duration=2h
$ amtool silence query
$ amtool alert query`)}
${note('warn', 'Always put an expiry and a ticket in a silence. A forgotten, open-ended silence is how real outages go unnoticed.')}
${lens({
  sys: 'Practise silences in the Terminal lab: silence only the host you are fixing, never the whole alert name.',
  pa: 'Design the routing tree with the teams: who receives what, at which hours, with which escalation.',
})}`,
          sources: [['Alertmanager', `${PROM}/alerting/latest/alertmanager/`], ['Alertmanager configuration', `${PROM}/alerting/latest/configuration/`]],
        },
      ],
      quiz: [
        { q: 'What does "for: 5m" do in an alert rule?', a: ['Sends every 5 minutes', 'The condition must hold for 5 minutes before firing', 'Deletes the alert after 5 minutes', 'Scrapes every 5 minutes'], c: 1, e: 'It filters brief blips.' },
        { q: 'A host dies and 40 alerts fire for services on it. Which feature shows only the root cause?', a: ['Silences', 'Inhibition rules', 'Recording rules', 'Scrape intervals'], c: 1, e: 'Inhibit consequences when the cause alert fires.' },
        { q: 'Why keep an always-firing Watchdog alert?', a: ['Tradition', 'If it stops arriving, the alerting pipeline itself is broken', 'To test CPUs', 'For billing'], c: 1, e: 'A dead-man’s switch for monitoring.' },
        { q: 'What should every silence have?', a: ['No end date', 'An expiry and a reason or ticket', 'A dashboard', 'A severity'], c: 1, e: 'Forgotten silences hide real outages.' },
      ],
    },
    // ------------------------------------------------------------ 5
    {
      id: 'argus-scrolls', n: 5, place: 'The Library of Scrolls', title: 'Logs You Can Search',
      subtitle: 'Collecting, storing and searching logs with Fluentd and OpenSearch',
      tier: 'Adept', relic: { name: 'Sealed Scroll', desc: 'You can find any log line in seconds.' },
      myth: 'The great library kept every scroll, but a scroll you cannot find is as good as lost. Central logging is the library’s catalogue: every log line from every service, searchable by time, host and request ID.',
      goals: ['Explain the log pipeline from file to search', 'Search OpenStack logs by request ID and host', 'Plan retention and log-based alerts'],
      lessons: [
        {
          id: 'pipeline', title: 'The log pipeline', minutes: 10,
          html: `
<ol>
<li>Services write logs (in Kolla-Ansible under <code>/var/log/kolla/&lt;service&gt;/</code>).</li>
<li>A collector (<b>Fluentd</b> in Kolla-Ansible, or Fluent Bit) tails the files, parses them and adds fields such as host, service and level.</li>
<li>Logs are stored and indexed in <b>OpenSearch</b> (Kolla indices use the prefix <code>flog-</code> by default), or in Loki.</li>
<li>People search in <b>OpenSearch Dashboards</b> or Grafana.</li>
</ol>
${term('enable it with Kolla-Ansible', `
# /etc/kolla/globals.yml
enable_central_logging: "yes"
# OpenSearch, OpenSearch Dashboards and Fluentd are then deployed
$ kolla-ansible deploy -i multinode --tags opensearch,fluentd`)}
${lens({
  sys: 'Plan disk for logs: busy clouds produce tens of GB per day. Set retention (for example 14–30 days hot) before the disk fills.',
  sa: 'For regulated customers, also forward audit logs (CADF) to the customer’s SIEM with longer retention.',
})}`,
          sources: [['Kolla-Ansible: central logging', `${KOLLA}/central-logging-guide.html`], ['OpenSearch documentation', 'https://docs.opensearch.org/latest/']],
        },
        {
          id: 'searching', title: 'Finding the needle', minutes: 10,
          html: `
${term('searches that solve incidents (OpenSearch Dashboards query language)', `
# everything about one API request, across all services
global_request_id:"req-6b1c1f3a-8f3e-4c2d-9c1b-1b2f0c0d6e7a"
# errors from nova-compute on one host in the last hour
programname:nova-compute AND Hostname:cmp-07 AND log_level:ERROR
# RabbitMQ connection problems anywhere
Payload:"AMQP server" AND Payload:unreachable`)}
<p>Field names depend on your collector configuration; open one log entry to see the exact names in your deployment.</p>
<h3>Metrics from logs</h3>
<p>Some problems only appear in logs, for example “No valid host was found”. Count them (with a log-to-metrics exporter or OpenSearch alerting) and alert when the count jumps, so logs feed the same alerting path as metrics.</p>
${lens({
  sys: 'The request ID from <code>openstack --debug</code> or <code>server event list</code> is the fastest search key you have.',
  lead: 'Link dashboards to log searches for the same host and time range; it halves investigation time.',
})}`,
          sources: [['OpenSearch Dashboards: Discover', 'https://docs.opensearch.org/latest/dashboards/discover/index-discover/'], ['Kolla-Ansible: central logging', `${KOLLA}/central-logging-guide.html`]],
        },
      ],
      quiz: [
        { q: 'Which component collects and ships logs in Kolla-Ansible’s central logging?', a: ['Prometheus', 'Fluentd', 'Grafana', 'Alertmanager'], c: 1, e: 'Fluentd tails log files and sends them to OpenSearch.' },
        { q: 'Fastest way to see every log line for one failed API call?', a: ['grep random hosts', 'Search by the request ID', 'Restart services', 'Read Grafana'], c: 1, e: 'Request IDs link logs across services.' },
        { q: 'What must you decide before logs fill the disks?', a: ['Colours', 'Retention', 'Dashboards', 'Severity'], c: 1, e: 'Set how long logs are kept.' },
        { q: 'A problem only shows up as a log message. How can it still page someone?', a: ['It cannot', 'Count the messages as a metric or log alert and alert on jumps', 'Email the logs', 'Increase log level'], c: 1, e: 'Turn log events into alertable signals.' },
      ],
    },
    // ------------------------------------------------------------ 6
    {
      id: 'argus-cloud', n: 6, place: 'Argus over the Cloud', title: 'Watching OpenStack and Ceph',
      subtitle: 'What to monitor on every layer, capacity forecasting and SLO alerts',
      tier: 'Expert', relic: { name: 'The Hundred Eyes', desc: 'Nothing in your cloud escapes you.' },
      myth: 'Argus watched Io day and night, with some eyes always awake. The final island puts every eye in place: hosts, control plane, network, storage and user experience, watched together as one system.',
      goals: ['List the exporters and key metrics for each layer of an OpenStack cloud', 'Forecast capacity from metrics', 'Alert on SLO burn instead of raw thresholds'],
      oracle: ['silent-watch', 'alert-storm', 'prom-cardinality', 'rabbit-partition'],
      lessons: [
        {
          id: 'layers', title: 'A monitoring map for OpenStack', minutes: 13,
          html: `
<table><tr><th>Layer</th><th>Exporter / source</th><th>Watch</th></tr>
<tr><td>Hosts</td><td>node exporter</td><td>CPU, memory, disk space and I/O, NIC errors, clock sync</td></tr>
<tr><td>OpenStack services</td><td>openstack-exporter, HAProxy exporter</td><td>Agent states, API errors and latency, quotas and usage</td></tr>
<tr><td>Database</td><td>mysqld exporter</td><td>Galera cluster size, flow control, slow queries</td></tr>
<tr><td>Message queue</td><td>RabbitMQ built-in Prometheus plugin</td><td>Partitions, alarms, queue length, unacknowledged messages</td></tr>
<tr><td>Hypervisors</td><td>libvirt exporter</td><td>VM count, vCPU steal, disk and network per VM</td></tr>
<tr><td>Network</td><td>OVN exporter, OVS metrics</td><td>NB/SB leaders, ovn-controller connectivity, tunnel counts, drops</td></tr>
<tr><td>Storage</td><td>Ceph MGR Prometheus module</td><td><code>ceph_health_status</code>, fullest OSD, OSD latency, PG states</td></tr>
<tr><td>User experience</td><td>Canary jobs (Tempest/Rally smoke or custom)</td><td>VM build, attach and reachability success and time</td></tr></table>
${term('Kolla-Ansible switches', `
enable_prometheus: "yes"
enable_grafana: "yes"
enable_prometheus_alertmanager: "yes"
enable_prometheus_openstack_exporter: "yes"
enable_prometheus_libvirt_exporter: "yes"
enable_central_logging: "yes"`)}
<p class="small muted">Check the exact variable names for your Kolla-Ansible release in its monitoring guide.</p>
${lens({
  sys: 'Build one “cloud health” dashboard from this table, one row per layer.',
  net: 'Add the physical fabric (switch interface errors, drops) through SNMP or gNMI; many cloud incidents start there.',
})}`,
          sources: [['Kolla-Ansible: Prometheus', `${KOLLA}/prometheus-guide.html`], ['Ceph Prometheus module', 'https://docs.ceph.com/en/latest/mgr/prometheus/'], ['RabbitMQ Prometheus monitoring', 'https://www.rabbitmq.com/docs/prometheus'], ['openstack-exporter', 'https://github.com/openstack-exporter/openstack-exporter']],
        },
        {
          id: 'capacity-slo', title: 'Capacity forecasts and SLO alerts', minutes: 12,
          html: `
<h3>Forecast before you run out</h3>
${term('capacity queries', `
# days until the Ceph cluster reaches 85% (nearfull), at the 7-day trend
(0.85 * ceph_cluster_total_bytes - ceph_cluster_total_used_bytes)
  / deriv(ceph_cluster_total_used_bytes[7d]) / 86400
# fraction of physical vCPUs already allocated, cloud-wide (openstack-exporter)
sum(openstack_placement_resource_usage{resourcetype="VCPU"})
  / sum(openstack_placement_resource_total{resourcetype="VCPU"})`)}
<p class="small muted">Metric names vary between exporter versions; confirm them on your exporter’s <code>/metrics</code> page.</p>
<h3>Alert on SLO burn, not on noise</h3>
<p>If your SLO is 99.5% successful VM builds over 30 days, alert when the <b>error budget is burning fast</b>: for example, the failure rate over the last hour is more than 14 times the budget rate. That pages for real user impact and ignores harmless blips.</p>
${term('a fast-burn alert (sketch)', `
- alert: VMBuildSLOFastBurn
  expr: |
    (1 - sum(rate(canary_vm_build_success_total[1h])) / sum(rate(canary_vm_build_total[1h])))
      > 14 * (1 - 0.995)
  for: 5m
  labels: { severity: critical }`)}
${note('oracle', 'Watch the watchers: alert when Prometheus cannot scrape its targets, when an exporter disappears (<code>absent()</code>), and keep the Watchdog alert flowing to an external dead-man’s switch.')}
${lens({
  pa: 'Capacity forecasts drive procurement. Share them monthly with finance and management, not only engineers.',
  lead: 'Replace old threshold pages one by one with SLO-based ones; measure the drop in pages per week.',
  pre: 'Show forecasts and SLO dashboards in proposals for managed services; they make the operations offer tangible.',
})}`,
          sources: [['Google SRE workbook: alerting on SLOs', 'https://sre.google/workbook/alerting-on-slos/'], ['Query functions (deriv, predict_linear)', `${PROM}/prometheus/latest/querying/functions/`]],
        },
      ],
      quiz: [
        { q: 'Which source exposes Ceph health to Prometheus?', a: ['node exporter', 'The Ceph MGR Prometheus module', 'libvirt exporter', 'Fluentd'], c: 1, e: 'Enable the prometheus module in the Ceph manager.' },
        { q: 'Which exporter reports whether nova-compute and Neutron agents are up?', a: ['openstack-exporter', 'blackbox exporter only', 'mysqld exporter', 'Grafana'], c: 0, e: 'It queries the OpenStack APIs.' },
        { q: 'Why alert on SLO burn rate instead of a fixed error threshold?', a: ['It is cheaper', 'It pages only when user impact threatens the objective', 'Prometheus requires it', 'It needs fewer exporters'], c: 1, e: 'Burn-rate alerts track real impact.' },
        { q: 'How do you notice that monitoring itself has died?', a: ['You cannot', 'An always-firing Watchdog alert sent to an external dead-man’s switch', 'More dashboards', 'Daily reboots'], c: 1, e: 'Silence from the watchdog is the alarm.' },
      ],
    },
  ],
};
