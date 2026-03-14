import type {
  ScientistAgentStatus,
  ScientistModelTier,
  ScientistRunFileType,
  ScientistRunMode,
  ScientistRunStatus,
} from './types';

export const SCIENTIST_MODULE_ID = 'mod.artificial.scientist';
export const SCIENTIST_MODULE_VERSION = '0.1.0';
export const SCIENTIST_MODULE_NAME = 'AI Scientist';

export const SCIENTIST_ADMIN_ALIAS = '/artificial-scientist';
export const SCIENTIST_DASHBOARD_ALIAS = '/research';
export const SCIENTIST_API_BASE = `/api/modules/${SCIENTIST_MODULE_ID}`;

export const SCIENTIST_RUN_STATUSES: readonly ScientistRunStatus[] = [
  'queued',
  'running',
  'partial',
  'completed',
  'failed',
  'cancelled',
] as const;

export const SCIENTIST_AGENT_STATUSES: readonly ScientistAgentStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
] as const;

export const SCIENTIST_RUN_MODES: readonly ScientistRunMode[] = [
  'research_query',
  'document_analysis',
  'clinical_case',
] as const;

export const SCIENTIST_MODEL_TIERS: readonly ScientistModelTier[] = [
  'fast',
  'standard',
  'deep',
] as const;

export const SCIENTIST_FILE_TYPES: readonly ScientistRunFileType[] = [
  'input',
  'output',
  'report',
  'hypotheses',
  'kg_nodes',
  'kg_edges',
  'document',
] as const;

export const SCIENTIST_AGENT_NUMBERS = [1, 2, 3, 4] as const;

export const SCIENTIST_DEFAULT_MODE: ScientistRunMode = 'research_query';
export const SCIENTIST_DEFAULT_TIER: ScientistModelTier = 'standard';
export const SCIENTIST_DEFAULT_MAX_PAPERS = 120;

export const SCIENTIST_MAX_PAPERS_BY_TIER: Record<ScientistModelTier, number> = {
  fast: 60,
  standard: 120,
  deep: 240,
};

export const SCIENTIST_FILE_NAMES = {
  input: 'input.jsonl.gz',
  output: 'output.jsonl.gz',
  report: 'report.md.gz',
  hypotheses: 'hypotheses.json.gz',
  kgNodes: 'kg_nodes.json.gz',
  kgEdges: 'kg_edges.json.gz',
} as const;

export const SCIENTIST_EVIDENCE_LEVELS = ['A', 'B', 'C', 'D'] as const;

export function formatScientistUsd(value: number | string | null | undefined) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatScientistDate(value: Date | string | null | undefined) {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toISOString().replace('T', ' ').slice(0, 16);
}

export function normalizePositiveInt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function normalizeScientistMode(value: unknown): ScientistRunMode {
  return SCIENTIST_RUN_MODES.includes(value as ScientistRunMode)
    ? (value as ScientistRunMode)
    : SCIENTIST_DEFAULT_MODE;
}

export function normalizeScientistTier(value: unknown): ScientistModelTier {
  return SCIENTIST_MODEL_TIERS.includes(value as ScientistModelTier)
    ? (value as ScientistModelTier)
    : SCIENTIST_DEFAULT_TIER;
}
