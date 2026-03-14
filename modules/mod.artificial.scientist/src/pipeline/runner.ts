import {
  SCIENTIST_FILE_NAMES,
} from '../constants';
import { resolveScientistAgentModel } from '../config';
import {
  cacheScientistPapers,
  completeScientistAgent,
  failScientistAgent,
  getScientistRunForPipeline,
  markScientistAgentStarted,
  markScientistRunStatus,
  recordScientistStorageArtifact,
  recordScientistUsageLog,
  releaseScientistConcurrencySlot,
  replaceScientistHypotheses,
  replaceScientistKnowledgeGraph,
  setScientistConcurrencySlot,
} from '../data';
import type {
  ScientistAgentExecutionResult,
  ScientistHypothesisInput,
  ScientistKgEdgeInput,
  ScientistKgNodeInput,
  ScientistPaper,
} from '../types';
import { searchScientistPapers } from './bigquery';
import { runScientistJsonAgent, runScientistTextAgent } from './agents';
import { sanitizeForStorage } from './sanitizer';
import { storeScientistArtifact } from './s3-store';

function buildTopPaperSummary(papers: ScientistPaper[], limit = 10) {
  return papers.slice(0, limit).map((paper) => ({
    pmid: paper.pmid,
    title: paper.title,
    journal: paper.journal,
    pubYear: paper.pubYear,
    meshTerms: paper.meshTerms.slice(0, 6),
  }));
}

function buildKnowledgeGraph(papers: ScientistPaper[]) {
  const nodeCounts = new Map<string, number>();
  const edgeCounts = new Map<string, number>();

  for (const paper of papers) {
    const terms = Array.from(new Set(paper.meshTerms.filter(Boolean))).slice(0, 12);
    for (const term of terms) {
      nodeCounts.set(term, (nodeCounts.get(term) ?? 0) + 1);
    }
    for (let index = 0; index < terms.length; index += 1) {
      for (let offset = index + 1; offset < terms.length; offset += 1) {
        const pair = [terms[index], terms[offset]].sort().join('||');
        edgeCounts.set(pair, (edgeCounts.get(pair) ?? 0) + 1);
      }
    }
  }

  const nodes = Array.from(nodeCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 25)
    .map(
      ([meshTerm, paperCount]) =>
        ({
          meshTerm,
          paperCount,
        }) satisfies ScientistKgNodeInput
    );

  const allowedTerms = new Set(nodes.map((node) => node.meshTerm));
  const edges = Array.from(edgeCounts.entries())
    .map(([pair, count]) => {
      const [sourceMeshTerm, targetMeshTerm] = pair.split('||');
      return {
        sourceMeshTerm,
        targetMeshTerm,
        relationType: 'co_occurrence',
        coOccurrenceCount: count,
        weight: Number((count / Math.max(1, papers.length)).toFixed(4)),
      } satisfies ScientistKgEdgeInput;
    })
    .filter(
      (edge) =>
        allowedTerms.has(edge.sourceMeshTerm) &&
        allowedTerms.has(edge.targetMeshTerm)
    )
    .sort(
      (left, right) =>
        right.coOccurrenceCount - left.coOccurrenceCount ||
        left.sourceMeshTerm.localeCompare(right.sourceMeshTerm)
    )
    .slice(0, 40);

  return { nodes, edges };
}

function buildHypothesisFallback(papers: ScientistPaper[], meshTerms: string[]) {
  const cited = papers.slice(0, 6).map((paper) => paper.pmid);
  return [
    {
      title: `Potential interaction pattern around ${meshTerms[0] ?? 'key biomarkers'}`,
      content: {
        summary:
          'Evidence clusters suggest a plausible mechanistic relationship worth deeper validation in downstream branching runs.',
        rationale: papers.slice(0, 3).map((paper) => paper.title),
      },
      pmidsCited: cited,
      evidenceLevel: 'B',
    },
    {
      title: `Prioritize subgroup analysis for ${meshTerms.slice(0, 2).join(' + ') || 'the cohort'}`,
      content: {
        summary:
          'The top retrieved records show repeated co-occurrence signals that may hide response differences across patient subgroups.',
        rationale: meshTerms,
      },
      pmidsCited: cited.slice(0, 4),
      evidenceLevel: 'C',
    },
  ] satisfies ScientistHypothesisInput[];
}

function buildReportFallback(
  rawQuery: string,
  hypotheses: ScientistHypothesisInput[],
  meshTerms: string[],
  paperCount: number
) {
  const bullets = hypotheses
    .map((hypothesis) => `- ${hypothesis.title}`)
    .join('\n');

  return `# Research report\n\n## Query\n${rawQuery}\n\n## Resolved terms\n${meshTerms.join(', ')}\n\n## Retrieved papers\n${paperCount}\n\n## Hypotheses\n${bullets}\n\n## Notes\nThis report was produced by the Sprint 1 runtime. In mock mode it preserves the same storage and transparency contract while using deterministic local output.\n`;
}

function buildJsonlLine(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function sanitizeExecutionPayload(
  execution: ScientistAgentExecutionResult,
  metadata?: Record<string, unknown>
): ScientistAgentExecutionResult {
  return {
    ...execution,
    promptInput: sanitizeForStorage(execution.promptInput),
    promptOutput: sanitizeForStorage(execution.promptOutput),
    metadata: metadata ? JSON.parse(sanitizeForStorage(JSON.stringify(metadata))) : execution.metadata,
  };
}

async function persistRunArtifacts(input: {
  runId: number;
  userId: number;
  inputs: Record<string, unknown>[];
  outputs: Record<string, unknown>[];
  reportMarkdown: string;
  hypotheses: ScientistHypothesisInput[];
  nodes: ScientistKgNodeInput[];
  edges: ScientistKgEdgeInput[];
}) {
  const artifacts = await Promise.all([
    storeScientistArtifact(
      input.runId,
      SCIENTIST_FILE_NAMES.input,
      input.inputs.map((entry) => buildJsonlLine(entry)).join('\n'),
      'application/jsonl'
    ),
    storeScientistArtifact(
      input.runId,
      SCIENTIST_FILE_NAMES.output,
      input.outputs.map((entry) => buildJsonlLine(entry)).join('\n'),
      'application/jsonl'
    ),
    storeScientistArtifact(
      input.runId,
      SCIENTIST_FILE_NAMES.report,
      input.reportMarkdown,
      'text/markdown'
    ),
    storeScientistArtifact(
      input.runId,
      SCIENTIST_FILE_NAMES.hypotheses,
      JSON.stringify(input.hypotheses, null, 2),
      'application/json'
    ),
    storeScientistArtifact(
      input.runId,
      SCIENTIST_FILE_NAMES.kgNodes,
      JSON.stringify(input.nodes, null, 2),
      'application/json'
    ),
    storeScientistArtifact(
      input.runId,
      SCIENTIST_FILE_NAMES.kgEdges,
      JSON.stringify(input.edges, null, 2),
      'application/json'
    ),
  ]);

  for (const artifact of artifacts) {
    await recordScientistStorageArtifact(input.runId, input.userId, artifact);
  }
}

export function enqueueScientistRunPipeline(runId: number) {
  setImmediate(() => {
    void runScientistRunPipeline(runId);
  });
}

export async function runScientistRunPipeline(runId: number) {
  const pipelineRecord = await getScientistRunForPipeline(runId);
  if (!pipelineRecord?.run || !pipelineRecord.session) {
    return;
  }

  const { run, session, agents } = pipelineRecord;
  const runInputs: Record<string, unknown>[] = [];
  const runOutputs: Record<string, unknown>[] = [];
  const executionByAgent = new Map<number, ScientistAgentExecutionResult>();

  await setScientistConcurrencySlot({
    runId: run.id,
    userId: run.userId,
    slotType: 'realtime',
  });
  await markScientistRunStatus(run.id, 'running', {
    startedAt: new Date(),
    lastError: null,
  });

  try {
    const agent1ModelId = resolveScientistAgentModel(1, run.tier);
    await markScientistAgentStarted(run.id, 1);
    const paperSearch = await searchScientistPapers({
      rawQuery: run.rawQuery,
      tier: run.tier,
    });
    const agent1Prompt = `Resolve medical search terms and retrieve evidence for the following question:\n\n${run.rawQuery}\n\nFocus override: ${run.focusOverride ?? 'none'}\nTier: ${run.tier}\n`;
    const agent1Output = JSON.stringify(
      {
        provider: paperSearch.provider,
        notes: paperSearch.notes,
        meshTerms: paperSearch.meshTerms,
        paperCount: paperSearch.papers.length,
        papers: buildTopPaperSummary(paperSearch.papers),
      },
      null,
      2
    );
    const agent1Execution = sanitizeExecutionPayload(
      {
        promptInput: agent1Prompt,
        promptOutput: agent1Output,
        inputTokens: Math.max(1, Math.ceil(agent1Prompt.length / 4)),
        outputTokens: Math.max(1, Math.ceil(agent1Output.length / 4)),
        costUsd: 0,
        inferenceMode: paperSearch.provider === 'bigquery' ? 'algorithmic' : 'mock',
        traceId: null,
      },
      {
        meshTerms: paperSearch.meshTerms,
        paperCount: paperSearch.papers.length,
        provider: paperSearch.provider,
      }
    );
    await cacheScientistPapers(paperSearch.papers);
    await completeScientistAgent(run.id, 1, agent1Execution);
    await recordScientistUsageLog({
      userId: run.userId,
      sessionId: run.sessionId,
      runId: run.id,
      agentNumber: 1,
      modelId: agent1ModelId,
      execution: agent1Execution,
    });
    executionByAgent.set(1, agent1Execution);
    runInputs.push({
      agent: 1,
      model: agent1ModelId,
      prompt: agent1Execution.promptInput,
      tier: run.tier,
      meshTerms: paperSearch.meshTerms,
    });
    runOutputs.push({
      agent: 1,
      provider: paperSearch.provider,
      meshTerms: paperSearch.meshTerms,
      pmidsFound: paperSearch.papers.length,
      papers: buildTopPaperSummary(paperSearch.papers),
    });

    const graph = buildKnowledgeGraph(paperSearch.papers);
    const agent2ModelId = resolveScientistAgentModel(2, run.tier);
    await markScientistAgentStarted(run.id, 2);
    const agent2Prompt = `Build a MeSH co-occurrence graph from ${paperSearch.papers.length} papers. Top terms: ${paperSearch.meshTerms.join(', ')}`;
    const agent2TextFallback = JSON.stringify(
      {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        topNodes: graph.nodes.slice(0, 10),
      },
      null,
      2
    );
    const agent2Summary = await runScientistTextAgent({
      modelId: agent2ModelId,
      prompt: `${agent2Prompt}\n\nEvidence sample:\n${JSON.stringify(buildTopPaperSummary(paperSearch.papers, 8), null, 2)}`,
      fallbackText: agent2TextFallback,
      temperature: 0.1,
      maxTokens: 1400,
    });
    const agent2Execution = sanitizeExecutionPayload(agent2Summary.execution, {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    });
    await replaceScientistKnowledgeGraph({
      runId: run.id,
      userId: run.userId,
      nodes: graph.nodes,
      edges: graph.edges,
    });
    await completeScientistAgent(run.id, 2, agent2Execution);
    await recordScientistUsageLog({
      userId: run.userId,
      sessionId: run.sessionId,
      runId: run.id,
      agentNumber: 2,
      modelId: agent2ModelId,
      execution: agent2Execution,
    });
    executionByAgent.set(2, agent2Execution);
    runInputs.push({
      agent: 2,
      model: agent2ModelId,
      prompt: agent2Execution.promptInput,
      papers: buildTopPaperSummary(paperSearch.papers, 8),
    });
    runOutputs.push({
      agent: 2,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      summary: agent2Execution.promptOutput,
    });

    const hypothesesFallback = buildHypothesisFallback(
      paperSearch.papers,
      paperSearch.meshTerms
    );
    const agent3ModelId = resolveScientistAgentModel(3, run.tier);
    await markScientistAgentStarted(run.id, 3);
    const hypothesisResponse = await runScientistJsonAgent({
      modelId: agent3ModelId,
      prompt: `You are extracting evidence-backed hypotheses from a medical research run.\nReturn a JSON array where each item has title, content, pmidsCited, and evidenceLevel.\n\nOriginal query: ${run.rawQuery}\nResolved terms: ${paperSearch.meshTerms.join(', ')}\nTop evidence: ${JSON.stringify(buildTopPaperSummary(paperSearch.papers, 10), null, 2)}\nKnowledge graph summary: ${agent2Execution.promptOutput}`,
      fallbackValue: hypothesesFallback,
      fallbackText: JSON.stringify(hypothesesFallback, null, 2),
      temperature: 0.2,
      maxTokens: 1800,
    });
    const hypotheses = Array.isArray(hypothesisResponse.value)
      ? (hypothesisResponse.value as ScientistHypothesisInput[])
      : hypothesesFallback;
    const agent3Execution = sanitizeExecutionPayload(hypothesisResponse.execution, {
      hypothesisCount: hypotheses.length,
    });
    await replaceScientistHypotheses({
      runId: run.id,
      sessionId: session.id,
      userId: run.userId,
      hypotheses,
    });
    await completeScientistAgent(run.id, 3, agent3Execution);
    await recordScientistUsageLog({
      userId: run.userId,
      sessionId: run.sessionId,
      runId: run.id,
      agentNumber: 3,
      modelId: agent3ModelId,
      execution: agent3Execution,
    });
    executionByAgent.set(3, agent3Execution);
    runInputs.push({
      agent: 3,
      model: agent3ModelId,
      prompt: agent3Execution.promptInput,
      knowledgeGraph: {
        nodes: graph.nodes.slice(0, 10),
        edges: graph.edges.slice(0, 10),
      },
    });
    runOutputs.push({
      agent: 3,
      hypotheses,
    });

    const reportFallback = buildReportFallback(
      run.rawQuery,
      hypotheses,
      paperSearch.meshTerms,
      paperSearch.papers.length
    );
    const agent4ModelId = resolveScientistAgentModel(4, run.tier);
    await markScientistAgentStarted(run.id, 4);
    const reportResponse = await runScientistTextAgent({
      modelId: agent4ModelId,
      prompt: `Write a structured markdown report for this medical research run.\n\nQuery: ${run.rawQuery}\nTier: ${run.tier}\nResolved terms: ${paperSearch.meshTerms.join(', ')}\nHypotheses: ${JSON.stringify(hypotheses, null, 2)}\nEvidence sample: ${JSON.stringify(buildTopPaperSummary(paperSearch.papers, 12), null, 2)}`,
      fallbackText: reportFallback,
      temperature: 0.2,
      maxTokens: 2200,
    });
    const agent4Execution = sanitizeExecutionPayload(reportResponse.execution, {
      reportLength: reportResponse.text.length,
    });
    await completeScientistAgent(run.id, 4, agent4Execution);
    await recordScientistUsageLog({
      userId: run.userId,
      sessionId: run.sessionId,
      runId: run.id,
      agentNumber: 4,
      modelId: agent4ModelId,
      execution: agent4Execution,
    });
    executionByAgent.set(4, agent4Execution);
    runInputs.push({
      agent: 4,
      model: agent4ModelId,
      prompt: agent4Execution.promptInput,
      hypotheses,
    });
    runOutputs.push({
      agent: 4,
      reportMarkdown: reportResponse.text,
    });

    await persistRunArtifacts({
      runId: run.id,
      userId: run.userId,
      inputs: runInputs,
      outputs: runOutputs,
      reportMarkdown: sanitizeForStorage(reportResponse.text),
      hypotheses,
      nodes: graph.nodes,
      edges: graph.edges,
    });

    const totalCostUsd = Array.from(executionByAgent.values()).reduce(
      (total, execution) => total + (execution.costUsd ?? 0),
      0
    );

    await markScientistRunStatus(run.id, 'completed', {
      meshTerms: paperSearch.meshTerms,
      costUsdTotal: String(totalCostUsd),
      completedAt: new Date(),
      s3Prefix: `runs/${run.id}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown run pipeline failure.';
    const pendingAgent =
      (agents as any[]).find(
        (agent: any) => agent.status === 'pending' || agent.status === 'running'
      ) ??
      null;

    if (pendingAgent) {
      await failScientistAgent(run.id, pendingAgent.agentNumber, message);
    }

    await markScientistRunStatus(run.id, 'failed', {
      completedAt: new Date(),
      lastError: message,
    });
  } finally {
    await releaseScientistConcurrencySlot(run.id);
  }
}
