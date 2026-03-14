import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getScientistRuntimeConfig, isScientistS3Configured } from '../config';
import type { ScientistStorageArtifact } from '../types';

let cachedClient: S3Client | null = null;

function getScientistS3Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getScientistRuntimeConfig().s3;
  cachedClient = new S3Client({
    region: config.region,
    ...(config.endpoint
      ? {
          endpoint: config.endpoint,
          forcePathStyle: true,
        }
      : {}),
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

function buildArtifactKey(runId: number, fileName: string) {
  return `runs/${runId}/${fileName}`;
}

async function saveLocalArtifact(
  relativePath: string,
  buffer: Buffer
): Promise<ScientistStorageArtifact> {
  const config = getScientistRuntimeConfig();
  const absolutePath = path.resolve(config.localStorageRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    fileType: resolveArtifactTypeFromName(relativePath),
    storageKey: `local://${relativePath}`,
    sizeBytes: buffer.byteLength,
  };
}

function resolveArtifactTypeFromName(fileName: string) {
  if (fileName.endsWith('input.jsonl.gz')) return 'input';
  if (fileName.endsWith('output.jsonl.gz')) return 'output';
  if (fileName.endsWith('report.md.gz')) return 'report';
  if (fileName.endsWith('hypotheses.json.gz')) return 'hypotheses';
  if (fileName.endsWith('kg_nodes.json.gz')) return 'kg_nodes';
  if (fileName.endsWith('kg_edges.json.gz')) return 'kg_edges';
  return 'document';
}

export async function storeScientistArtifact(
  runId: number,
  fileName: string,
  body: string | Buffer,
  contentType: string
): Promise<ScientistStorageArtifact> {
  const relativePath = buildArtifactKey(runId, fileName);
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  const zipped = gzipSync(payload);

  if (!isScientistS3Configured()) {
    return saveLocalArtifact(relativePath, zipped);
  }

  const config = getScientistRuntimeConfig().s3;
  await getScientistS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: relativePath,
      Body: zipped,
      ContentEncoding: 'gzip',
      ContentType: contentType,
      ...(config.kmsKeyId
        ? {
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: config.kmsKeyId,
          }
        : {}),
    })
  );

  return {
    fileType: resolveArtifactTypeFromName(fileName),
    storageKey: relativePath,
    sizeBytes: zipped.byteLength,
  };
}
