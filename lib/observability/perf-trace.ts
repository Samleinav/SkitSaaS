type PerfTagValue = string | number | boolean | null | undefined;
type PerfTags = Record<string, PerfTagValue>;

type PerfTraceStatus = 'ok' | 'error' | 'skipped';

type SanitizedPerfTags = Record<string, string | number | boolean | null>;

type PerfTraceStep = {
  step: string;
  totalMs: number;
  deltaMs: number;
  tags: SanitizedPerfTags;
};

export type PerfTrace = {
  enabled: boolean;
  step: (step: string, tags?: PerfTags) => void;
  end: (status?: PerfTraceStatus, tags?: PerfTags) => void;
};

const NOOP_TRACE: PerfTrace = {
  enabled: false,
  step: () => {},
  end: () => {}
};

function parseBoolean(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

function sanitizeTags(tags: PerfTags = {}): SanitizedPerfTags {
  const entries = Object.entries(tags).filter(
    ([, value]) => value !== undefined
  );
  return Object.fromEntries(entries) as SanitizedPerfTags;
}

function normalizeScope(value: string) {
  return value.trim().toLowerCase();
}

function resolveScopeFilter() {
  const raw = process.env.PERF_DIAGNOSTICS_SCOPES;
  if (!raw) {
    return null;
  }

  const scopes = raw
    .split(',')
    .map(normalizeScope)
    .filter((scope) => scope.length > 0);

  return scopes.length > 0 ? new Set(scopes) : null;
}

export function isPerfTraceEnabled(scope: string) {
  if (!parseBoolean(process.env.PERF_DIAGNOSTICS)) {
    return false;
  }

  const filter = resolveScopeFilter();
  if (!filter) {
    return true;
  }

  const normalizedScope = normalizeScope(scope);
  return filter.has('*') || filter.has(normalizedScope);
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function toMs(value: number) {
  return Number(value.toFixed(2));
}

let traceSequence = 0;

function nextTraceSequence() {
  traceSequence += 1;
  return traceSequence.toString(36);
}

function buildTraceId(scope: string, name: string, startedAt: number) {
  const stablePrefix = `${scope}:${name}:${Math.round(startedAt * 1000).toString(36)}`;
  return `${stablePrefix}:${nextTraceSequence()}`;
}

export function createPerfTrace({
  scope,
  name,
  tags = {}
}: {
  scope: string;
  name: string;
  tags?: PerfTags;
}): PerfTrace {
  if (!isPerfTraceEnabled(scope)) {
    return NOOP_TRACE;
  }

  const startedAt = now();
  const traceId = buildTraceId(scope, name, startedAt);
  const steps: PerfTraceStep[] = [];
  const baseTags = sanitizeTags(tags);
  let previousAt = startedAt;
  let finished = false;

  function step(stepName: string, stepTags: PerfTags = {}) {
    if (finished) {
      return;
    }

    const currentAt = now();
    steps.push({
      step: stepName,
      totalMs: toMs(currentAt - startedAt),
      deltaMs: toMs(currentAt - previousAt),
      tags: sanitizeTags(stepTags)
    });
    previousAt = currentAt;
  }

  function end(status: PerfTraceStatus = 'ok', endTags: PerfTags = {}) {
    if (finished) {
      return;
    }

    finished = true;
    const finishedAt = now();

    console.info(
      '[perf-trace]',
      JSON.stringify({
        traceId,
        scope,
        name,
        status,
        totalMs: toMs(finishedAt - startedAt),
        tags: baseTags,
        endTags: sanitizeTags(endTags),
        steps
      })
    );
  }

  return {
    enabled: true,
    step,
    end
  };
}
