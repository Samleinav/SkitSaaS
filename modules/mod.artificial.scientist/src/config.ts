import type { ScientistModelTier } from './types';
import { SCIENTIST_DEFAULT_TIER } from './constants';

function readEnv(key: string) {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function readBooleanEnv(key: string, defaultValue = false) {
  const value = readEnv(key).toLowerCase();
  if (!value) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value);
}

type ScientistRuntimeConfig = {
  allowMockPipeline: boolean;
  localStorageRoot: string;
  s3: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    kmsKeyId: string;
    endpoint: string;
  };
  bigQuery: {
    projectId: string;
    credentialsJson: string;
    dataset: string;
  };
  bedrock: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
};

const DEFAULT_MODELS = {
  agent12: {
    fast: 'amazon.nova-lite-v1:0',
    standard: 'openai.gpt-oss-120b',
    deep: 'moonshot.kimi-k2-thinking',
  },
  agent3: {
    fast: 'us.anthropic.claude-sonnet-4-6',
    standard: 'us.anthropic.claude-sonnet-4-6',
    deep: 'us.anthropic.claude-opus-4-6',
  },
  agent4: {
    fast: 'us.anthropic.claude-sonnet-4-6',
    standard: 'us.anthropic.claude-opus-4-6',
    deep: 'us.anthropic.claude-opus-4-6',
  },
} as const satisfies Record<string, Record<ScientistModelTier, string>>;

let runtimeConfig: ScientistRuntimeConfig | null = null;

export function getScientistRuntimeConfig(): ScientistRuntimeConfig {
  if (runtimeConfig) {
    return runtimeConfig;
  }

  runtimeConfig = {
    allowMockPipeline: readBooleanEnv('MOD_SCIENTIST_ALLOW_MOCK_PIPELINE', true),
    localStorageRoot:
      readEnv('MOD_SCIENTIST_LOCAL_STORAGE_ROOT') ||
      './storage/mod.artificial.scientist',
    s3: {
      bucket: readEnv('MOD_SCIENTIST_S3_BUCKET'),
      region: readEnv('MOD_SCIENTIST_S3_REGION') || 'us-east-1',
      accessKeyId: readEnv('MOD_SCIENTIST_S3_ACCESS_KEY_ID'),
      secretAccessKey: readEnv('MOD_SCIENTIST_S3_SECRET_ACCESS_KEY'),
      kmsKeyId: readEnv('MOD_SCIENTIST_S3_KMS_KEY_ID'),
      endpoint: readEnv('MOD_SCIENTIST_S3_ENDPOINT'),
    },
    bigQuery: {
      projectId: readEnv('BIGQUERY_PROJECT_ID'),
      credentialsJson: readEnv('BIGQUERY_CREDENTIALS_JSON'),
      dataset: readEnv('BIGQUERY_PUBMED_DATASET') || 'bigquery-public-data.pubmed',
    },
    bedrock: {
      region: readEnv('BEDROCK_REGION') || 'us-east-1',
      accessKeyId: readEnv('BEDROCK_ACCESS_KEY_ID'),
      secretAccessKey: readEnv('BEDROCK_SECRET_ACCESS_KEY'),
    },
  };

  return runtimeConfig;
}

export function resolveScientistAgentModel(
  agentNumber: 1 | 2 | 3 | 4,
  tier: ScientistModelTier = SCIENTIST_DEFAULT_TIER
) {
  if (agentNumber === 1 || agentNumber === 2) {
    return (
      readEnv(`BEDROCK_${tier.toUpperCase()}_AGENT12`) || DEFAULT_MODELS.agent12[tier]
    );
  }

  if (agentNumber === 3) {
    return readEnv(`BEDROCK_AGENT3_${tier.toUpperCase()}`) || DEFAULT_MODELS.agent3[tier];
  }

  return readEnv(`BEDROCK_AGENT4_${tier.toUpperCase()}`) || DEFAULT_MODELS.agent4[tier];
}

export function isScientistBedrockConfigured() {
  const config = getScientistRuntimeConfig();
  return Boolean(config.bedrock.region);
}

export function isScientistBigQueryConfigured() {
  const config = getScientistRuntimeConfig();
  return Boolean(config.bigQuery.projectId || config.bigQuery.credentialsJson);
}

export function isScientistS3Configured() {
  const config = getScientistRuntimeConfig();
  return Boolean(config.s3.bucket);
}
