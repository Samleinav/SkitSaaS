import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { SFilesAdapter, SFilesConfig } from '@skitsaas/sdk/sfiles';

export class S3Adapter implements SFilesAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: SFilesConfig) {
    if (!config.s3Bucket) throw new Error('SFILES_S3_BUCKET is required for S3 backend');
    if (!config.s3Region) throw new Error('SFILES_S3_REGION is required for S3 backend');

    this.bucket = config.s3Bucket;
    this.client = new S3Client({
      region: config.s3Region,
      ...(config.s3Endpoint ? { endpoint: config.s3Endpoint, forcePathStyle: true } : {}),
      ...(config.s3AccessKeyId && config.s3SecretAccessKey
        ? {
            credentials: {
              accessKeyId: config.s3AccessKeyId,
              secretAccessKey: config.s3SecretAccessKey,
            },
          }
        : {}),
    });
  }

  async save(buffer: Buffer, storagePath: string): Promise<{ etag: string | null }> {
    const result = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
        Body: buffer,
      })
    );
    return { etag: result.ETag ?? null };
  }

  async load(storagePath: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storagePath })
    );
    if (!result.Body) throw new Error(`S3: no body for key ${storagePath}`);
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async remove(storagePath: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePath })
    );
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storagePath })
      );
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(storagePath: string): string {
    if (this.config.s3Endpoint) {
      return `${this.config.s3Endpoint}/${this.bucket}/${storagePath}`;
    }
    return `https://${this.bucket}.s3.${this.config.s3Region}.amazonaws.com/${storagePath}`;
  }

  async getSignedUrl(storagePath: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storagePath });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
