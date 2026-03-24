type MetricTagValue = string | number | boolean | null | undefined;
type MetricTags = Record<string, MetricTagValue>;

type MigrationMetricName =
  | 'migration.dual_write_replay.queued'
  | 'migration.dual_write_replay.replayed'
  | 'migration.dual_write_replay.failed'
  | 'migration.read_source.legacy'
  | 'migration.read_source.new'
  | 'migration.lifecycle.skipped'
  | 'migration.lifecycle.error'
  | 'migration.module_dispatch.failed'
  | 'migration.theme_resolution.policy'
  | 'migration.theme_resolution.override'
  | 'migration.theme_resolution.area_active'
  | 'migration.theme_resolution.fallback';

type MigrationMetricEvent = {
  metric: MigrationMetricName;
  count: number;
  tags: Record<string, string | number | boolean | null>;
};

function queueModuleDispatchAuditLog(
  moduleId: string,
  reason: string,
  tags: Record<string, string | number | boolean | null>
) {
  void import('@/lib/system/activity-logs')
    .then(({ createSysActivityLog }) =>
      createSysActivityLog({
        eventType: 'module.dispatch.failed',
        eventCategory: 'module_runtime',
        action: 'dispatch',
        status: 'warning',
        entityType: 'module',
        entityId: moduleId,
        source: typeof tags.source === 'string' ? tags.source : null,
        requestId: typeof tags.requestId === 'string' ? tags.requestId : null,
        message: `Module dispatch failed: ${reason}`,
        metadata: {
          moduleId,
          reason,
          ...tags
        }
      })
    )
    .catch((error) => {
      console.error('[migration-metric] failed to persist module dispatch log', {
        moduleId,
        reason,
        error
      });
    });
}

function sanitizeTags(tags: MetricTags = {}) {
  const entries = Object.entries(tags).filter(
    ([, value]) => value !== undefined
  );
  return Object.fromEntries(entries) as Record<
    string,
    string | number | boolean | null
  >;
}

export function emitMigrationMetric(
  metric: MigrationMetricName,
  tags: MetricTags = {},
  count = 1
) {
  const event: MigrationMetricEvent = {
    metric,
    count,
    tags: sanitizeTags(tags)
  };

  console.info('[migration-metric]', JSON.stringify(event));
  return event;
}

export function recordDualWriteReplayQueued(
  domain: string,
  tags: MetricTags = {}
) {
  return emitMigrationMetric('migration.dual_write_replay.queued', {
    domain,
    ...tags,
  });
}

export function recordDualWriteReplayReplayed(
  domain: string,
  tags: MetricTags = {}
) {
  return emitMigrationMetric('migration.dual_write_replay.replayed', {
    domain,
    ...tags,
  });
}

export function recordDualWriteReplayFailed(
  domain: string,
  reason: string,
  tags: MetricTags = {}
) {
  return emitMigrationMetric('migration.dual_write_replay.failed', {
    domain,
    reason,
    ...tags,
  });
}

export function recordReadSource(
  domain: string,
  source: 'legacy' | 'new',
  tags: MetricTags = {}
) {
  if (source === 'legacy') {
    return emitMigrationMetric('migration.read_source.legacy', {
      domain,
      ...tags,
    });
  }

  return emitMigrationMetric('migration.read_source.new', {
    domain,
    ...tags,
  });
}

export function recordLifecycleSkipped(reason: string, tags: MetricTags = {}) {
  return emitMigrationMetric('migration.lifecycle.skipped', {
    reason,
    ...tags,
  });
}

export function recordLifecycleError(reason: string, tags: MetricTags = {}) {
  return emitMigrationMetric('migration.lifecycle.error', {
    reason,
    ...tags,
  });
}

export function recordModuleDispatchFailure(
  moduleId: string,
  reason: string,
  tags: MetricTags = {}
) {
  const sanitizedTags = sanitizeTags(tags);
  const event = emitMigrationMetric('migration.module_dispatch.failed', {
    moduleId,
    reason,
    ...sanitizedTags,
  });

  queueModuleDispatchAuditLog(moduleId, reason, sanitizedTags);
  return event;
}

export function recordThemeResolutionSource(
  area: string,
  source: 'policy' | 'override' | 'area_active' | 'fallback',
  tags: MetricTags = {}
) {
  if (source === 'policy') {
    return emitMigrationMetric('migration.theme_resolution.policy', {
      area,
      ...tags,
    });
  }

  if (source === 'override') {
    return emitMigrationMetric('migration.theme_resolution.override', {
      area,
      ...tags,
    });
  }

  if (source === 'area_active') {
    return emitMigrationMetric('migration.theme_resolution.area_active', {
      area,
      ...tags,
    });
  }

  return emitMigrationMetric('migration.theme_resolution.fallback', {
    area,
    ...tags,
  });
}
