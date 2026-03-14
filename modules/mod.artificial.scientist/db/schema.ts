import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  sql,
} from '@skitsaas/sdk/db';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  role: varchar('role', { length: 20 }),
});

export const modScientistSessions = pgTable(
  'mod_scientist_sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 240 }).notNull(),
    mode: varchar('mode', { length: 30 }).notNull().default('research_query'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIndex: index('mod_scientist_sessions_user_idx').on(table.userId),
    createdIndex: index('mod_scientist_sessions_created_idx').on(table.createdAt),
    modeCheck: check(
      'mod_scientist_sessions_mode_chk',
      sql`${table.mode} in ('research_query', 'document_analysis', 'clinical_case')`
    ),
  })
);

export const modScientistRuns = pgTable(
  'mod_scientist_runs',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => modScientistSessions.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentRunId: integer('parent_run_id'),
    depth: integer('depth').notNull().default(0),
    mode: varchar('mode', { length: 30 }).notNull().default('research_query'),
    tier: varchar('tier', { length: 20 }).notNull().default('standard'),
    status: varchar('status', { length: 20 }).notNull().default('queued'),
    rawQuery: text('raw_query').notNull(),
    focusOverride: text('focus_override'),
    meshTerms: jsonb('mesh_terms'),
    runConfig: jsonb('run_config'),
    lastError: text('last_error'),
    s3Prefix: text('s3_prefix'),
    s3Moved: boolean('s3_moved').notNull().default(false),
    costUsdTotal: numeric('cost_usd_total', {
      precision: 12,
      scale: 6,
    })
      .notNull()
      .default('0'),
    queuedAt: timestamp('queued_at').notNull().defaultNow(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    partialAt: timestamp('partial_at'),
    partialReason: text('partial_reason'),
  },
  (table) => ({
    sessionIndex: index('mod_scientist_runs_session_idx').on(table.sessionId),
    userIndex: index('mod_scientist_runs_user_idx').on(table.userId),
    statusIndex: index('mod_scientist_runs_status_idx').on(table.status),
    tierIndex: index('mod_scientist_runs_tier_idx').on(table.tier),
    queuedIndex: index('mod_scientist_runs_queued_idx').on(table.queuedAt),
    depthCheck: check(
      'mod_scientist_runs_depth_chk',
      sql`${table.depth} between 0 and 2`
    ),
    modeCheck: check(
      'mod_scientist_runs_mode_chk',
      sql`${table.mode} in ('research_query', 'document_analysis', 'clinical_case')`
    ),
    tierCheck: check(
      'mod_scientist_runs_tier_chk',
      sql`${table.tier} in ('fast', 'standard', 'deep')`
    ),
    statusCheck: check(
      'mod_scientist_runs_status_chk',
      sql`${table.status} in ('queued', 'running', 'partial', 'completed', 'failed', 'cancelled')`
    ),
  })
);

export const modScientistRunAgents = pgTable(
  'mod_scientist_run_agents',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => modScientistRuns.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    agentNumber: integer('agent_number').notNull(),
    modelId: text('model_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    promptInput: text('prompt_input'),
    promptOutput: text('prompt_output'),
    metadata: jsonb('metadata'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 })
      .notNull()
      .default('0'),
    inferenceMode: varchar('inference_mode', { length: 20 })
      .notNull()
      .default('realtime'),
    bedrockTraceId: text('bedrock_trace_id'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    runIndex: index('mod_scientist_run_agents_run_idx').on(table.runId),
    runAgentUnique: uniqueIndex('mod_scientist_run_agents_run_agent_uidx').on(
      table.runId,
      table.agentNumber
    ),
    statusCheck: check(
      'mod_scientist_run_agents_status_chk',
      sql`${table.status} in ('pending', 'running', 'completed', 'failed')`
    ),
    inferenceModeCheck: check(
      'mod_scientist_run_agents_mode_chk',
      sql`${table.inferenceMode} in ('realtime', 'batch', 'algorithmic', 'mock')`
    ),
    agentNumberCheck: check(
      'mod_scientist_run_agents_num_chk',
      sql`${table.agentNumber} between 1 and 4`
    ),
  })
);

export const modScientistRunFiles = pgTable(
  'mod_scientist_run_files',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => modScientistRuns.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileType: varchar('file_type', { length: 30 }).notNull(),
    s3Key: text('s3_key').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    contentEncoding: varchar('content_encoding', { length: 20 })
      .notNull()
      .default('gzip'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    runIndex: index('mod_scientist_run_files_run_idx').on(table.runId),
    fileTypeCheck: check(
      'mod_scientist_run_files_type_chk',
      sql`${table.fileType} in ('input', 'output', 'report', 'hypotheses', 'kg_nodes', 'kg_edges', 'document')`
    ),
  })
);

export const modScientistKgNodes = pgTable(
  'mod_scientist_kg_nodes',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => modScientistRuns.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    meshTerm: varchar('mesh_term', { length: 240 }).notNull(),
    paperCount: integer('paper_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    runIndex: index('mod_scientist_kg_nodes_run_idx').on(table.runId),
    runMeshUnique: uniqueIndex('mod_scientist_kg_nodes_run_mesh_uidx').on(
      table.runId,
      table.meshTerm
    ),
  })
);

export const modScientistKgEdges = pgTable(
  'mod_scientist_kg_edges',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => modScientistRuns.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceNodeId: integer('source_node_id')
      .notNull()
      .references(() => modScientistKgNodes.id, { onDelete: 'cascade' }),
    targetNodeId: integer('target_node_id')
      .notNull()
      .references(() => modScientistKgNodes.id, { onDelete: 'cascade' }),
    relationType: varchar('relation_type', { length: 30 })
      .notNull()
      .default('co_occurrence'),
    coOccurrenceCount: integer('co_occurrence_count').notNull().default(0),
    weight: numeric('weight', { precision: 8, scale: 4 }).notNull().default('0'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    runIndex: index('mod_scientist_kg_edges_run_idx').on(table.runId),
    relationCheck: check(
      'mod_scientist_kg_edges_relation_chk',
      sql`${table.relationType} in ('co_occurrence')`
    ),
  })
);

export const modScientistPapers = pgTable(
  'mod_scientist_papers',
  {
    pmid: varchar('pmid', { length: 60 }).primaryKey(),
    title: text('title'),
    abstract: text('abstract'),
    authors: jsonb('authors'),
    journal: text('journal'),
    pubYear: integer('pub_year'),
    meshTerms: jsonb('mesh_terms'),
    cachedAt: timestamp('cached_at').notNull().defaultNow(),
  },
  (table) => ({
    cachedIndex: index('mod_scientist_papers_cached_idx').on(table.cachedAt),
  })
);

export const modScientistEmbeddings = pgTable(
  'mod_scientist_embeddings',
  {
    id: serial('id').primaryKey(),
    pmid: varchar('pmid', { length: 60 })
      .notNull()
      .references(() => modScientistPapers.pmid, { onDelete: 'cascade' }),
    runId: integer('run_id')
      .notNull()
      .references(() => modScientistRuns.id, { onDelete: 'cascade' }),
    embedding: jsonb('embedding'),
    chunkIndex: integer('chunk_index').notNull().default(0),
    modelUsed: text('model_used').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    runIndex: index('mod_scientist_embeddings_run_idx').on(table.runId),
  })
);

export const modScientistHypotheses = pgTable(
  'mod_scientist_hypotheses',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => modScientistRuns.id, { onDelete: 'cascade' }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => modScientistSessions.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 240 }).notNull(),
    content: jsonb('content').notNull(),
    pmidsCited: jsonb('pmids_cited'),
    evidenceLevel: varchar('evidence_level', { length: 8 }),
    isSaved: boolean('is_saved').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    runIndex: index('mod_scientist_hypotheses_run_idx').on(table.runId),
    evidenceLevelCheck: check(
      'mod_scientist_hypotheses_evidence_chk',
      sql`${table.evidenceLevel} is null or ${table.evidenceLevel} in ('A', 'B', 'C', 'D')`
    ),
  })
);

export const modScientistUsageLog = pgTable(
  'mod_scientist_usage_log',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: integer('session_id'),
    runId: integer('run_id'),
    agentNumber: integer('agent_number'),
    modelId: text('model_id'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 })
      .notNull()
      .default('0'),
    inferenceMode: varchar('inference_mode', { length: 20 })
      .notNull()
      .default('realtime'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIndex: index('mod_scientist_usage_log_user_idx').on(table.userId),
    createdIndex: index('mod_scientist_usage_log_created_idx').on(table.createdAt),
  })
);

export const modScientistStorageLog = pgTable(
  'mod_scientist_storage_log',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    runId: integer('run_id'),
    s3Key: text('s3_key').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    fileType: varchar('file_type', { length: 30 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIndex: index('mod_scientist_storage_log_user_idx').on(table.userId),
    createdIndex: index('mod_scientist_storage_log_created_idx').on(table.createdAt),
  })
);

export const modScientistConcurrency = pgTable(
  'mod_scientist_concurrency',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    runId: integer('run_id')
      .notNull()
      .references(() => modScientistRuns.id, { onDelete: 'cascade' }),
    slotType: varchar('slot_type', { length: 20 }).notNull().default('realtime'),
    acquiredAt: timestamp('acquired_at').notNull().defaultNow(),
    releasedAt: timestamp('released_at'),
  },
  (table) => ({
    userIndex: index('mod_scientist_concurrency_user_idx').on(table.userId),
    slotTypeCheck: check(
      'mod_scientist_concurrency_slot_chk',
      sql`${table.slotType} in ('realtime', 'batch_active')`
    ),
  })
);
