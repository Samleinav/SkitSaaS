import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
} from '@skitsaas/sdk/db';
import { getDb } from '@skitsaas/sdk/server';
import { resolveScientistAgentModel } from './config';
import {
  modScientistConcurrency,
  modScientistHypotheses,
  modScientistKgEdges,
  modScientistKgNodes,
  modScientistPapers,
  modScientistRunAgents,
  modScientistRunFiles,
  modScientistRuns,
  modScientistSessions,
  modScientistStorageLog,
  modScientistUsageLog,
  users,
} from '../db/schema';
import type {
  ScientistAgentExecutionResult,
  ScientistHypothesisInput,
  ScientistKgEdgeInput,
  ScientistKgNodeInput,
  ScientistModelTier,
  ScientistPaper,
  ScientistRunMode,
  ScientistRunStatus,
  ScientistStorageArtifact,
} from './types';

function scientistDb() {
  return getDb<any>();
}

function coerceNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function createScientistSession(input: {
  userId: number;
  title: string;
  mode: ScientistRunMode;
}) {
  const db = scientistDb();
  const [session] = await db
    .insert(modScientistSessions)
    .values({
      userId: input.userId,
      title: input.title,
      mode: input.mode,
    })
    .returning();

  return session ?? null;
}

export async function listScientistSessionsForUser(userId: number) {
  const db = scientistDb();
  const [sessions, runs]: [any[], any[]] = await Promise.all([
    db
      .select()
      .from(modScientistSessions)
      .where(eq(modScientistSessions.userId, userId))
      .orderBy(desc(modScientistSessions.updatedAt)),
    db
      .select()
      .from(modScientistRuns)
      .where(eq(modScientistRuns.userId, userId))
      .orderBy(desc(modScientistRuns.queuedAt)),
  ]);

  const runSummary = new Map<
    number,
    { runCount: number; activeRunCount: number; lastRunAt: Date | null }
  >();

  for (const run of runs) {
    const summary = runSummary.get(run.sessionId) ?? {
      runCount: 0,
      activeRunCount: 0,
      lastRunAt: null,
    };
    summary.runCount += 1;
    if (run.status === 'queued' || run.status === 'running') {
      summary.activeRunCount += 1;
    }
    summary.lastRunAt =
      summary.lastRunAt && summary.lastRunAt > (run.queuedAt ?? summary.lastRunAt)
        ? summary.lastRunAt
        : (run.queuedAt ?? summary.lastRunAt);
    runSummary.set(run.sessionId, summary);
  }

  return sessions.map((session: any) => ({
    ...session,
    runCount: runSummary.get(session.id)?.runCount ?? 0,
    activeRunCount: runSummary.get(session.id)?.activeRunCount ?? 0,
    lastRunAt: runSummary.get(session.id)?.lastRunAt ?? null,
  }));
}

export async function getScientistSessionDetailForUser(
  sessionId: number,
  userId: number
) {
  const db = scientistDb();
  const [session] = await db
    .select()
    .from(modScientistSessions)
    .where(
      and(
        eq(modScientistSessions.id, sessionId),
        eq(modScientistSessions.userId, userId)
      )
    )
    .limit(1);

  if (!session) {
    return null;
  }

  const runs: any[] = await db
    .select()
    .from(modScientistRuns)
    .where(eq(modScientistRuns.sessionId, sessionId))
    .orderBy(desc(modScientistRuns.queuedAt));

  return {
    session,
    runs,
  };
}

export async function deleteScientistSessionForUser(
  sessionId: number,
  userId: number
) {
  const db = scientistDb();
  const deleted = await db
    .delete(modScientistSessions)
    .where(
      and(
        eq(modScientistSessions.id, sessionId),
        eq(modScientistSessions.userId, userId)
      )
    )
    .returning({ id: modScientistSessions.id });

  return deleted.length > 0;
}

export async function createScientistRun(input: {
  sessionId: number;
  userId: number;
  rawQuery: string;
  focusOverride?: string | null;
  tier: ScientistModelTier;
  mode: ScientistRunMode;
}) {
  const db = scientistDb();
  const [session] = await db
    .select()
    .from(modScientistSessions)
    .where(
      and(
        eq(modScientistSessions.id, input.sessionId),
        eq(modScientistSessions.userId, input.userId)
      )
    )
    .limit(1);

  if (!session) {
    return null;
  }

  return db.transaction(async (tx: any) => {
    const [run] = await tx
      .insert(modScientistRuns)
      .values({
        sessionId: input.sessionId,
        userId: input.userId,
        rawQuery: input.rawQuery,
        focusOverride: input.focusOverride ?? null,
        tier: input.tier,
        mode: input.mode,
        status: 'queued',
      })
      .returning();

    if (!run) {
      return null;
    }

    await tx.insert(modScientistRunAgents).values(
      [1, 2, 3, 4].map((agentNumber) => ({
        runId: run.id,
        userId: input.userId,
        agentNumber,
        modelId: resolveScientistAgentModel(agentNumber as 1 | 2 | 3 | 4, input.tier),
        status: 'pending',
      }))
    );

    return run;
  });
}

export async function getScientistRunForPipeline(runId: number) {
  const db = scientistDb();
  const [run] = await db
    .select()
    .from(modScientistRuns)
    .where(eq(modScientistRuns.id, runId))
    .limit(1);

  if (!run) {
    return null;
  }

  const [session] = await db
    .select()
    .from(modScientistSessions)
    .where(eq(modScientistSessions.id, run.sessionId))
    .limit(1);

  const agents: any[] = await db
    .select()
    .from(modScientistRunAgents)
    .where(eq(modScientistRunAgents.runId, runId))
    .orderBy(asc(modScientistRunAgents.agentNumber));

  return {
    run,
    session: session ?? null,
    agents,
  };
}

export async function markScientistRunStatus(
  runId: number,
  status: ScientistRunStatus,
  patch: Record<string, unknown> = {}
) {
  const db = scientistDb();
  const [updated] = await db
    .update(modScientistRuns)
    .set({
      status,
      ...patch,
    })
    .where(eq(modScientistRuns.id, runId))
    .returning();

  return updated ?? null;
}

export async function markScientistAgentStarted(
  runId: number,
  agentNumber: number
) {
  const db = scientistDb();
  const [updated] = await db
    .update(modScientistRunAgents)
    .set({
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    })
    .where(
      and(
        eq(modScientistRunAgents.runId, runId),
        eq(modScientistRunAgents.agentNumber, agentNumber)
      )
    )
    .returning();

  return updated ?? null;
}

export async function completeScientistAgent(
  runId: number,
  agentNumber: number,
  payload: ScientistAgentExecutionResult
) {
  const db = scientistDb();
  const [updated] = await db
    .update(modScientistRunAgents)
    .set({
      status: 'completed',
      promptInput: payload.promptInput,
      promptOutput: payload.promptOutput,
      metadata: payload.metadata ?? null,
      inputTokens: payload.inputTokens,
      outputTokens: payload.outputTokens,
      costUsd: String(payload.costUsd ?? 0),
      inferenceMode: payload.inferenceMode,
      bedrockTraceId: payload.traceId,
      completedAt: new Date(),
      errorMessage: null,
    })
    .where(
      and(
        eq(modScientistRunAgents.runId, runId),
        eq(modScientistRunAgents.agentNumber, agentNumber)
      )
    )
    .returning();

  return updated ?? null;
}

export async function failScientistAgent(
  runId: number,
  agentNumber: number,
  message: string
) {
  const db = scientistDb();
  const [updated] = await db
    .update(modScientistRunAgents)
    .set({
      status: 'failed',
      errorMessage: message,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(modScientistRunAgents.runId, runId),
        eq(modScientistRunAgents.agentNumber, agentNumber)
      )
    )
    .returning();

  return updated ?? null;
}

export async function cacheScientistPapers(papers: ScientistPaper[]) {
  if (papers.length === 0) {
    return;
  }

  const db = scientistDb();
  await db
    .insert(modScientistPapers)
    .values(
      papers.map((paper) => ({
        pmid: paper.pmid,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        journal: paper.journal,
        pubYear: paper.pubYear,
        meshTerms: paper.meshTerms,
      }))
    )
    .onConflictDoNothing();
}

export async function replaceScientistKnowledgeGraph(input: {
  runId: number;
  userId: number;
  nodes: ScientistKgNodeInput[];
  edges: ScientistKgEdgeInput[];
}) {
  const db = scientistDb();

  return db.transaction(async (tx: any) => {
    await tx
      .delete(modScientistKgEdges)
      .where(eq(modScientistKgEdges.runId, input.runId));
    await tx
      .delete(modScientistKgNodes)
      .where(eq(modScientistKgNodes.runId, input.runId));

    if (input.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const insertedNodes: any[] = await tx
      .insert(modScientistKgNodes)
      .values(
        input.nodes.map((node) => ({
          runId: input.runId,
          userId: input.userId,
          meshTerm: node.meshTerm,
          paperCount: node.paperCount,
        }))
      )
      .returning({
        id: modScientistKgNodes.id,
        meshTerm: modScientistKgNodes.meshTerm,
      });

    const nodeMap = new Map(
      insertedNodes.map((node: any) => [node.meshTerm, node.id] as const)
    );

    const edgeValues = input.edges
      .map((edge) => {
        const sourceNodeId = nodeMap.get(edge.sourceMeshTerm);
        const targetNodeId = nodeMap.get(edge.targetMeshTerm);
        if (!sourceNodeId || !targetNodeId) {
          return null;
        }

        return {
          runId: input.runId,
          userId: input.userId,
          sourceNodeId,
          targetNodeId,
          relationType: edge.relationType,
          coOccurrenceCount: edge.coOccurrenceCount,
          weight: String(edge.weight),
        };
      })
      .filter(Boolean);

    if (edgeValues.length > 0) {
      await tx.insert(modScientistKgEdges).values(edgeValues);
    }

    return {
      nodes: insertedNodes,
      edges: edgeValues,
    };
  });
}

export async function replaceScientistHypotheses(input: {
  runId: number;
  sessionId: number;
  userId: number;
  hypotheses: ScientistHypothesisInput[];
}) {
  const db = scientistDb();
  await db
    .delete(modScientistHypotheses)
    .where(eq(modScientistHypotheses.runId, input.runId));

  if (input.hypotheses.length === 0) {
    return [];
  }

  return db
    .insert(modScientistHypotheses)
    .values(
      input.hypotheses.map((hypothesis) => ({
        runId: input.runId,
        sessionId: input.sessionId,
        userId: input.userId,
        title: hypothesis.title,
        content: hypothesis.content,
        pmidsCited: hypothesis.pmidsCited,
        evidenceLevel: hypothesis.evidenceLevel,
      }))
    )
    .returning();
}

export async function recordScientistStorageArtifact(
  runId: number,
  userId: number,
  artifact: ScientistStorageArtifact
) {
  const db = scientistDb();
  const [file] = await db
    .insert(modScientistRunFiles)
    .values({
      runId,
      userId,
      fileType: artifact.fileType,
      s3Key: artifact.storageKey,
      sizeBytes: artifact.sizeBytes,
    })
    .returning();

  await db.insert(modScientistStorageLog).values({
    runId,
    userId,
    s3Key: artifact.storageKey,
    sizeBytes: artifact.sizeBytes,
    fileType: artifact.fileType,
  });

  return file ?? null;
}

export async function recordScientistUsageLog(input: {
  userId: number;
  sessionId: number;
  runId: number;
  agentNumber: number;
  modelId: string;
  execution: ScientistAgentExecutionResult;
}) {
  const db = scientistDb();
  await db.insert(modScientistUsageLog).values({
    userId: input.userId,
    sessionId: input.sessionId,
    runId: input.runId,
    agentNumber: input.agentNumber,
    modelId: input.modelId,
    inputTokens: input.execution.inputTokens,
    outputTokens: input.execution.outputTokens,
    costUsd: String(input.execution.costUsd ?? 0),
    inferenceMode: input.execution.inferenceMode,
  });
}

export async function setScientistConcurrencySlot(input: {
  runId: number;
  userId: number;
  slotType: 'realtime' | 'batch_active';
}) {
  const db = scientistDb();
  await db.insert(modScientistConcurrency).values({
    runId: input.runId,
    userId: input.userId,
    slotType: input.slotType,
  });
}

export async function releaseScientistConcurrencySlot(runId: number) {
  const db = scientistDb();
  await db
    .update(modScientistConcurrency)
    .set({
      releasedAt: new Date(),
    })
    .where(
      and(
        eq(modScientistConcurrency.runId, runId),
        isNull(modScientistConcurrency.releasedAt)
      )
    );
}

export async function getScientistRunDetailForUser(
  runId: number,
  userId: number
) {
  const db = scientistDb();
  const [run] = await db
    .select()
    .from(modScientistRuns)
    .where(and(eq(modScientistRuns.id, runId), eq(modScientistRuns.userId, userId)))
    .limit(1);

  if (!run) {
    return null;
  }

  const [session, agents, files, hypotheses, nodes, edges]: [
    any[],
    any[],
    any[],
    any[],
    any[],
    any[]
  ] = await Promise.all([
    db
      .select()
      .from(modScientistSessions)
      .where(eq(modScientistSessions.id, run.sessionId))
      .limit(1),
    db
      .select()
      .from(modScientistRunAgents)
      .where(eq(modScientistRunAgents.runId, runId))
      .orderBy(asc(modScientistRunAgents.agentNumber)),
    db
      .select()
      .from(modScientistRunFiles)
      .where(eq(modScientistRunFiles.runId, runId))
      .orderBy(desc(modScientistRunFiles.createdAt)),
    db
      .select()
      .from(modScientistHypotheses)
      .where(eq(modScientistHypotheses.runId, runId))
      .orderBy(desc(modScientistHypotheses.createdAt)),
    db
      .select()
      .from(modScientistKgNodes)
      .where(eq(modScientistKgNodes.runId, runId))
      .orderBy(desc(modScientistKgNodes.paperCount), asc(modScientistKgNodes.meshTerm)),
    db
      .select()
      .from(modScientistKgEdges)
      .where(eq(modScientistKgEdges.runId, runId))
      .orderBy(desc(modScientistKgEdges.coOccurrenceCount)),
  ]);

  return {
    run,
    session: session[0] ?? null,
    agents,
    files,
    hypotheses,
    nodes,
    edges,
  };
}

export async function getScientistRunStatusForUser(runId: number, userId: number) {
  const detail = await getScientistRunDetailForUser(runId, userId);
  if (!detail) {
    return null;
  }

  return {
    run: detail.run,
    agents: detail.agents.map((agent: any) => ({
      id: agent.id,
      agentNumber: agent.agentNumber,
      status: agent.status,
      modelId: agent.modelId,
      startedAt: agent.startedAt,
      completedAt: agent.completedAt,
      errorMessage: agent.errorMessage,
    })),
  };
}

export async function listScientistAgentsForUser(runId: number, userId: number) {
  const detail = await getScientistRunDetailForUser(runId, userId);
  return detail?.agents ?? null;
}

export async function getScientistAgentForUser(
  runId: number,
  agentNumber: number,
  userId: number
) {
  const db = scientistDb();
  const [agent] = await db
    .select({
      id: modScientistRunAgents.id,
      runId: modScientistRunAgents.runId,
      userId: modScientistRunAgents.userId,
      agentNumber: modScientistRunAgents.agentNumber,
      modelId: modScientistRunAgents.modelId,
      status: modScientistRunAgents.status,
      promptInput: modScientistRunAgents.promptInput,
      promptOutput: modScientistRunAgents.promptOutput,
      metadata: modScientistRunAgents.metadata,
      inputTokens: modScientistRunAgents.inputTokens,
      outputTokens: modScientistRunAgents.outputTokens,
      costUsd: modScientistRunAgents.costUsd,
      inferenceMode: modScientistRunAgents.inferenceMode,
      bedrockTraceId: modScientistRunAgents.bedrockTraceId,
      errorMessage: modScientistRunAgents.errorMessage,
      startedAt: modScientistRunAgents.startedAt,
      completedAt: modScientistRunAgents.completedAt,
    })
    .from(modScientistRunAgents)
    .innerJoin(modScientistRuns, eq(modScientistRuns.id, modScientistRunAgents.runId))
    .where(
      and(
        eq(modScientistRunAgents.runId, runId),
        eq(modScientistRunAgents.agentNumber, agentNumber),
        eq(modScientistRuns.userId, userId)
      )
    )
    .limit(1);

  return agent ?? null;
}

export async function listScientistRecentRunsForUser(userId: number, limit = 12) {
  const db = scientistDb();
  const runs: any[] = await db
    .select()
    .from(modScientistRuns)
    .where(eq(modScientistRuns.userId, userId))
    .orderBy(desc(modScientistRuns.queuedAt))
    .limit(limit);

  if (runs.length === 0) {
    return [];
  }

  const sessionIds = Array.from(new Set(runs.map((run: any) => run.sessionId))) as number[];
  const sessions: any[] = await db
    .select()
    .from(modScientistSessions)
    .where(inArray(modScientistSessions.id, sessionIds));
  const sessionMap = new Map(sessions.map((session: any) => [session.id, session]));

  return runs.map((run: any) => ({
    ...run,
    sessionTitle: sessionMap.get(run.sessionId)?.title ?? `Session #${run.sessionId}`,
  }));
}

export async function listScientistRunsForAdmin(filters?: {
  status?: string | null;
  tier?: string | null;
  limit?: number;
}) {
  const db = scientistDb();
  const allRuns: any[] = await db
    .select({
      id: modScientistRuns.id,
      sessionId: modScientistRuns.sessionId,
      userId: modScientistRuns.userId,
      status: modScientistRuns.status,
      tier: modScientistRuns.tier,
      mode: modScientistRuns.mode,
      rawQuery: modScientistRuns.rawQuery,
      costUsdTotal: modScientistRuns.costUsdTotal,
      queuedAt: modScientistRuns.queuedAt,
      startedAt: modScientistRuns.startedAt,
      completedAt: modScientistRuns.completedAt,
      sessionTitle: modScientistSessions.title,
      userEmail: users.email,
    })
    .from(modScientistRuns)
    .innerJoin(modScientistSessions, eq(modScientistSessions.id, modScientistRuns.sessionId))
    .leftJoin(users, eq(users.id, modScientistRuns.userId))
    .orderBy(desc(modScientistRuns.queuedAt));

  return allRuns
    .filter((run: any) => (filters?.status ? run.status === filters.status : true))
    .filter((run: any) => (filters?.tier ? run.tier === filters.tier : true))
    .slice(0, filters?.limit ?? 100);
}

export async function getScientistAdminOverview() {
  const db = scientistDb();
  const [sessions, allRuns]: [any[], any[]] = await Promise.all([
    db.select().from(modScientistSessions),
    db.select().from(modScientistRuns).orderBy(desc(modScientistRuns.queuedAt)),
  ]);

  return {
    totalSessions: sessions.length,
    totalRuns: allRuns.length,
    totalCostUsd: allRuns.reduce(
      (total: number, run: any) => total + coerceNumber(run.costUsdTotal),
      0
    ),
    recentRuns: allRuns.slice(0, 10),
  };
}

export async function getScientistAdminUsageSummary() {
  const db = scientistDb();
  const rows = await db
    .select({
      userId: modScientistUsageLog.userId,
      userEmail: users.email,
      modelId: modScientistUsageLog.modelId,
      inputTokens: modScientistUsageLog.inputTokens,
      outputTokens: modScientistUsageLog.outputTokens,
      costUsd: modScientistUsageLog.costUsd,
      createdAt: modScientistUsageLog.createdAt,
    })
    .from(modScientistUsageLog)
    .leftJoin(users, eq(users.id, modScientistUsageLog.userId))
    .orderBy(desc(modScientistUsageLog.createdAt));

  const grouped = new Map<
    string,
    {
      userId: number;
      userEmail: string | null;
      modelCount: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      latestAt: Date | null;
    }
  >();

  for (const row of rows) {
    const key = String(row.userId);
    const existing = grouped.get(key) ?? {
      userId: row.userId,
      userEmail: row.userEmail ?? null,
      modelCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      latestAt: null,
    };

    existing.modelCount += row.modelId ? 1 : 0;
    existing.inputTokens += row.inputTokens ?? 0;
    existing.outputTokens += row.outputTokens ?? 0;
    existing.costUsd += coerceNumber(row.costUsd);
    if (!existing.latestAt || (row.createdAt && row.createdAt > existing.latestAt)) {
      existing.latestAt = row.createdAt;
    }
    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const leftTime = left.latestAt?.getTime() ?? 0;
    const rightTime = right.latestAt?.getTime() ?? 0;
    return rightTime - leftTime;
  });
}
