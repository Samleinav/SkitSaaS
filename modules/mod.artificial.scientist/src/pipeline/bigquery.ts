import { BigQuery } from '@google-cloud/bigquery';
import { getScientistRuntimeConfig, isScientistBigQueryConfigured } from '../config';
import type { ScientistModelTier, ScientistPaper } from '../types';
import { SCIENTIST_MAX_PAPERS_BY_TIER } from '../constants';

type ScientistPaperSearchResult = {
  meshTerms: string[];
  papers: ScientistPaper[];
  provider: 'bigquery' | 'mock';
  notes: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function inferMeshTerms(rawQuery: string) {
  const cleaned = rawQuery
    .replace(/[+/,;:()[\]{}]/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const stopWords = new Set([
    'and',
    'or',
    'the',
    'with',
    'for',
    'into',
    'from',
    'about',
    'over',
    'effect',
    'effects',
    'study',
    'studies',
    'analysis',
    'patient',
    'patients',
  ]);

  const candidates = Array.from(
    new Set(
      cleaned
        .filter((term) => term.length > 2)
        .filter((term) => !stopWords.has(term.toLowerCase()))
        .slice(0, 8)
    )
  );

  if (candidates.length > 0) {
    return candidates;
  }

  return ['Medical Research', 'Evidence Review'];
}

function buildMockPapers(meshTerms: string[], limit: number): ScientistPaper[] {
  return meshTerms.slice(0, 4).flatMap((term, termIndex) =>
    Array.from({ length: Math.max(1, Math.min(3, Math.ceil(limit / 4))) }, (_, index) => {
      const ordinal = termIndex * 10 + index + 1;
      return {
        pmid: `mock-${termIndex + 1}${index + 1}${ordinal}`.replace(/\D/g, '').slice(0, 12),
        title: `${term} evidence synthesis ${index + 1}`,
        abstract: `Mock evidence summary for ${term}. This local fallback keeps the module testable without cloud credentials while preserving the run pipeline contract.`,
        authors: [`Mock Author ${ordinal}`, 'SKitSaaS Research Runtime'],
        journal: 'Mock Journal of Translational Evidence',
        pubYear: 2024 - index,
        meshTerms: [term, ...meshTerms.filter((entry) => entry !== term).slice(0, 2)],
      } satisfies ScientistPaper;
    })
  );
}

function normalizePaperRow(row: Record<string, unknown>): ScientistPaper {
  const authors = Array.isArray(row.authors)
    ? row.authors.map((entry) => String(entry))
    : [];
  const meshTerms = Array.isArray(row.mesh_terms)
    ? row.mesh_terms.map((entry) => String(entry))
    : Array.isArray(row.meshTerms)
      ? row.meshTerms.map((entry) => String(entry))
      : [];

  const pubYearValue = row.pub_year ?? row.pubYear;
  const parsedYear = typeof pubYearValue === 'number'
    ? pubYearValue
    : typeof pubYearValue === 'string'
      ? Number(pubYearValue)
      : null;

  return {
    pmid: String(row.pmid ?? ''),
    title: typeof row.title === 'string' ? row.title : 'Untitled paper',
    abstract: typeof row.abstract === 'string' ? row.abstract : null,
    authors,
    journal: typeof row.journal === 'string' ? row.journal : null,
    pubYear: Number.isFinite(parsedYear) ? Number(parsedYear) : null,
    meshTerms,
  };
}

function buildBigQuerySearchRegex(meshTerms: string[]) {
  return meshTerms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase())
    .join('|');
}

function createBigQueryClient() {
  const config = getScientistRuntimeConfig().bigQuery;
  const credentials = config.credentialsJson
    ? JSON.parse(config.credentialsJson)
    : undefined;

  return new BigQuery({
    projectId: config.projectId || credentials?.project_id,
    ...(credentials ? { credentials } : {}),
  });
}

async function queryBigQueryPapers(
  meshTerms: string[],
  limit: number
): Promise<ScientistPaper[]> {
  const config = getScientistRuntimeConfig().bigQuery;
  const dataset = config.dataset;
  const client = createBigQueryClient();
  const query = `
    SELECT
      CAST(pmid AS STRING) AS pmid,
      title,
      abstract,
      authors,
      journal,
      pub_year,
      mesh_terms
    FROM \`${dataset}.papers\`
    WHERE REGEXP_CONTAINS(
      LOWER(
        CONCAT(
          IFNULL(title, ''),
          ' ',
          IFNULL(abstract, ''),
          ' ',
          ARRAY_TO_STRING(IFNULL(mesh_terms, []), ' ')
        )
      ),
      @search
    )
    LIMIT @limit
  `;

  const [rows] = await client.query({
    query,
    location: 'US',
    useLegacySql: false,
    params: {
      search: buildBigQuerySearchRegex(meshTerms),
      limit,
    },
  });

  return Array.isArray(rows)
    ? rows
        .map((row) =>
          normalizePaperRow((row ?? {}) as Record<string, unknown>)
        )
        .filter((paper) => paper.pmid)
    : [];
}

export async function searchScientistPapers(input: {
  rawQuery: string;
  tier: ScientistModelTier;
}): Promise<ScientistPaperSearchResult> {
  const meshTerms = inferMeshTerms(normalizeWhitespace(input.rawQuery));
  const limit = SCIENTIST_MAX_PAPERS_BY_TIER[input.tier] ?? SCIENTIST_MAX_PAPERS_BY_TIER.standard;

  if (!isScientistBigQueryConfigured()) {
    return {
      meshTerms,
      papers: buildMockPapers(meshTerms, limit),
      provider: 'mock',
      notes: 'BigQuery credentials are not configured.',
    };
  }

  try {
    const papers = await queryBigQueryPapers(meshTerms, limit);
    if (papers.length > 0) {
      return {
        meshTerms,
        papers,
        provider: 'bigquery',
        notes: 'Fetched papers from BigQuery.',
      };
    }
  } catch (error) {
    return {
      meshTerms,
      papers: buildMockPapers(meshTerms, limit),
      provider: 'mock',
      notes: `BigQuery query failed, using mock fallback: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }

  return {
    meshTerms,
    papers: buildMockPapers(meshTerms, limit),
    provider: 'mock',
    notes: 'BigQuery returned zero rows, using mock fallback.',
  };
}
