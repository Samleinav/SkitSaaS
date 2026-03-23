import {
  checkAuthRateLimit,
  resolveClientIp
} from '@/lib/auth/rate-limit';

export async function applyAuthProviderRateLimit(
  request: Request,
  action: 'start' | 'callback'
) {
  const ip = resolveClientIp(request);
  const rateLimit = await checkAuthRateLimit({ ip, action });
  if (!rateLimit.limited) {
    return null;
  }

  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(rateLimit.retryAfterSeconds ?? 60)
      }
    }
  );
}
