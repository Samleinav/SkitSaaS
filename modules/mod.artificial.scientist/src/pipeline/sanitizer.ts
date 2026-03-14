const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  [/\bAKIA[0-9A-Z]{16}\b/g, '[redacted-aws-access-key]'],
  [/\bASIA[0-9A-Z]{16}\b/g, '[redacted-aws-session-key]'],
  [/\b(?:aws_)?secret(?:_access)?_key\b\s*[:=]\s*["']?[^"'\s,}]+["']?/gi, 'secret_access_key="[redacted]"'],
  [/\b(?:x-amz-security-token|session_token)\b\s*[:=]\s*["']?[^"'\s,}]+["']?/gi, 'session_token="[redacted]"'],
  [/\bBearer\s+[A-Za-z0-9._-]+\b/g, 'Bearer [redacted]'],
  [/"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----\\n?"/gi, '"private_key":"[redacted]"'],
  [/"client_email"\s*:\s*"[^"]+"/gi, '"client_email":"[redacted]"'],
  [/"accessKeyId"\s*:\s*"[^"]+"/gi, '"accessKeyId":"[redacted]"'],
  [/"secretAccessKey"\s*:\s*"[^"]+"/gi, '"secretAccessKey":"[redacted]"'],
];

export function sanitizeForStorage(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return SENSITIVE_PATTERNS.reduce(
    (sanitized, [pattern, replacement]) => sanitized.replace(pattern, replacement),
    value
  );
}
