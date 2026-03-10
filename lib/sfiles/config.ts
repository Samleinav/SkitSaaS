import type { SFileBackend, SFilesConfig } from '@skitsaas/sdk/sfiles';

export function getSfilesConfig(): SFilesConfig {
  return {
    backend: (process.env.SFILES_BACKEND as SFileBackend) ?? 'local',
    localRoot: process.env.SFILES_LOCAL_ROOT ?? './storage/sfiles',
    urlBase: process.env.SFILES_URL_BASE ?? 'http://localhost:3000',
    signedUrlExpireSeconds: Number(process.env.SFILES_SIGNED_URL_EXPIRES ?? 3600),
    s3Bucket: process.env.SFILES_S3_BUCKET,
    s3Region: process.env.SFILES_S3_REGION,
    s3AccessKeyId: process.env.SFILES_S3_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.SFILES_S3_SECRET_ACCESS_KEY,
    s3Endpoint: process.env.SFILES_S3_ENDPOINT,
  };
}
