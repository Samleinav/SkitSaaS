const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'tmp');
const files = fs
  .readdirSync(dir)
  .filter((name) => /^perf-.*\.log$/.test(name))
  .map((name) => ({
    name,
    full: path.join(dir, name),
    mtime: fs.statSync(path.join(dir, name)).mtimeMs
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (!files.length) {
  console.log('NO_PERF_LOG');
  process.exit(0);
}

const log = files[0].full;
const lines = fs.readFileSync(log, 'utf8').split(/\r?\n/);
const traces = [];
for (const line of lines) {
  const idx = line.indexOf('[perf-trace]');
  if (idx === -1) continue;
  const jsonStart = line.indexOf('{', idx);
  if (jsonStart === -1) continue;
  try {
    traces.push(JSON.parse(line.slice(jsonStart)));
  } catch {}
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function summarizeByName(name) {
  const list = traces.filter((t) => t.name === name && t.status === 'ok');
  return {
    name,
    count: list.length,
    avgMs: Number(avg(list.map((t) => t.totalMs)).toFixed(2)),
    minMs: Number(Math.min(...list.map((t) => t.totalMs)).toFixed(2)),
    maxMs: Number(Math.max(...list.map((t) => t.totalMs)).toFixed(2))
  };
}

function summarizeSteps(name) {
  const list = traces.filter((t) => t.name === name && t.status === 'ok');
  const byStep = new Map();
  for (const trace of list) {
    for (const step of trace.steps || []) {
      const key = step.step;
      const arr = byStep.get(key) || [];
      arr.push(step.deltaMs);
      byStep.set(key, arr);
    }
  }

  return [...byStep.entries()]
    .map(([step, values]) => ({
      step,
      count: values.length,
      avgMs: Number(avg(values).toFixed(2)),
      maxMs: Number(Math.max(...values).toFixed(2))
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

const adminLayout = summarizeByName('admin.layout');
const adminPage = summarizeByName('admin.page.home');
const adminMeta = summarizeByName('admin.layout.metadata');

const themeTargets = [
  'layout.admin.shell',
  'section.admin.nav',
  'section.admin.breadcrumb',
  'ui.theme-toggle',
  'ui.language-switcher',
  'page.admin.home'
];

const themeSummary = themeTargets.map((id) => {
  const list = traces.filter(
    (t) => t.name === 'theme.code-template.resolve' && t.status === 'ok' && t.tags?.componentId === id
  );
  return {
    componentId: id,
    count: list.length,
    avgMs: list.length ? Number(avg(list.map((t) => t.totalMs)).toFixed(2)) : 0,
    maxMs: list.length ? Number(Math.max(...list.map((t) => t.totalMs)).toFixed(2)) : 0
  };
});

const aborts = traces.filter((t) => t.status === 'error' && t.endTags?.errorName === 'AbortError');

console.log(JSON.stringify({
  log,
  totals: {
    traces: traces.length,
    abortErrors: aborts.length
  },
  admin: {
    layout: adminLayout,
    layoutSteps: summarizeSteps('admin.layout'),
    pageHome: adminPage,
    pageHomeSteps: summarizeSteps('admin.page.home'),
    metadata: adminMeta,
    metadataSteps: summarizeSteps('admin.layout.metadata')
  },
  theme: themeSummary
}, null, 2));
