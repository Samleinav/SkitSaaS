import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { getScientistRuntimeConfig } from '../config';
import type { ScientistAgentExecutionResult } from '../types';

type TextAgentInput = {
  modelId: string;
  prompt: string;
  fallbackText: string;
  temperature?: number;
  maxTokens?: number;
};

type JsonAgentInput<TValue> = TextAgentInput & {
  fallbackValue: TValue;
};

let cachedClient: BedrockRuntimeClient | null = null;

function getBedrockClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getScientistRuntimeConfig().bedrock;
  cachedClient = new BedrockRuntimeClient({
    region: config.region,
    ...(config.accessKeyId && config.secretAccessKey
      ? {
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        }
      : {}),
  });

  return cachedClient;
}

function countApproximateTokens(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.35));
}

function extractTextFromConverseResponse(response: Record<string, any>) {
  const messageContent = response.output?.message?.content;
  if (!Array.isArray(messageContent)) {
    return '';
  }

  return messageContent
    .map((entry) => (typeof entry?.text === 'string' ? entry.text : ''))
    .filter(Boolean)
    .join('\n');
}

function buildMockExecution(
  prompt: string,
  outputText: string
): ScientistAgentExecutionResult {
  return {
    promptInput: prompt,
    promptOutput: outputText,
    inputTokens: countApproximateTokens(prompt),
    outputTokens: countApproximateTokens(outputText),
    costUsd: 0,
    inferenceMode: 'mock',
    traceId: null,
  };
}

async function invokeBedrockTextAgent(input: TextAgentInput) {
  const prompt = input.prompt.trim();
  if (!prompt) {
    return {
      text: input.fallbackText,
      execution: buildMockExecution(prompt, input.fallbackText),
    };
  }

  try {
    const command = new ConverseCommand({
      modelId: input.modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: input.maxTokens ?? 1800,
        temperature: input.temperature ?? 0.2,
      },
    });

    const response = await getBedrockClient().send(command);
    const outputText = extractTextFromConverseResponse(response as Record<string, any>);
    const usage = (response as Record<string, any>).usage ?? {};

    return {
      text: outputText || input.fallbackText,
      execution: {
        promptInput: prompt,
        promptOutput: outputText || input.fallbackText,
        inputTokens:
          typeof usage.inputTokens === 'number'
            ? usage.inputTokens
            : countApproximateTokens(prompt),
        outputTokens:
          typeof usage.outputTokens === 'number'
            ? usage.outputTokens
            : countApproximateTokens(outputText || input.fallbackText),
        costUsd: 0,
        inferenceMode: 'realtime' as const,
        traceId:
          typeof (response as Record<string, any>).$metadata?.requestId === 'string'
            ? (response as Record<string, any>).$metadata.requestId
            : null,
      },
    };
  } catch {
    return {
      text: input.fallbackText,
      execution: buildMockExecution(prompt, input.fallbackText),
    };
  }
}

function tryParseJson<TValue>(value: string): TValue | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as TValue;
  } catch {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (!fencedMatch?.[1]) {
      return null;
    }

    try {
      return JSON.parse(fencedMatch[1]) as TValue;
    } catch {
      return null;
    }
  }
}

export async function runScientistTextAgent(input: TextAgentInput) {
  return invokeBedrockTextAgent(input);
}

export async function runScientistJsonAgent<TValue>(input: JsonAgentInput<TValue>) {
  const fallbackText =
    typeof input.fallbackValue === 'string'
      ? input.fallbackValue
      : JSON.stringify(input.fallbackValue, null, 2);
  const response = await invokeBedrockTextAgent({
    ...input,
    fallbackText,
  });

  const parsed = tryParseJson<TValue>(response.text);
  return {
    value: parsed ?? input.fallbackValue,
    text: parsed ? response.text : fallbackText,
    execution: parsed
      ? response.execution
      : {
          ...response.execution,
          promptOutput: fallbackText,
        },
  };
}
