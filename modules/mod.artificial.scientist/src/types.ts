export type ScientistRunStatus =
  | 'queued'
  | 'running'
  | 'partial'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ScientistAgentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type ScientistRunMode =
  | 'research_query'
  | 'document_analysis'
  | 'clinical_case';

export type ScientistModelTier = 'fast' | 'standard' | 'deep';

export type ScientistInferenceMode = 'realtime' | 'batch' | 'algorithmic' | 'mock';

export type ScientistRunFileType =
  | 'input'
  | 'output'
  | 'report'
  | 'hypotheses'
  | 'kg_nodes'
  | 'kg_edges'
  | 'document';

export type ScientistPaper = {
  pmid: string;
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  pubYear: number | null;
  meshTerms: string[];
};

export type ScientistKgNodeInput = {
  meshTerm: string;
  paperCount: number;
};

export type ScientistKgEdgeInput = {
  sourceMeshTerm: string;
  targetMeshTerm: string;
  relationType: 'co_occurrence';
  coOccurrenceCount: number;
  weight: number;
};

export type ScientistHypothesisInput = {
  title: string;
  content: Record<string, unknown>;
  pmidsCited: string[];
  evidenceLevel: string | null;
};

export type ScientistStorageArtifact = {
  fileType: ScientistRunFileType;
  storageKey: string;
  sizeBytes: number;
};

export type ScientistAgentExecutionResult = {
  promptInput: string;
  promptOutput: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  inferenceMode: ScientistInferenceMode;
  traceId: string | null;
  metadata?: Record<string, unknown>;
};
