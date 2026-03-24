const REQUEST_ID_HEADER = 'x-request-id';
const FALLBACK_REQUEST_ID_HEADERS = ['x-vercel-id', 'cf-ray'] as const;

const generatedRequestIds = new WeakMap<Request, string>();

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function readRequestId(request: Request) {
  const direct = normalizeText(request.headers.get(REQUEST_ID_HEADER));
  if (direct) {
    return direct;
  }

  for (const headerName of FALLBACK_REQUEST_ID_HEADERS) {
    const fallback = normalizeText(request.headers.get(headerName));
    if (fallback) {
      return fallback;
    }
  }

  return null;
}

export function getOrCreateRequestId(request: Request) {
  const existing = readRequestId(request);
  if (existing) {
    return existing;
  }

  const cached = generatedRequestIds.get(request);
  if (cached) {
    return cached;
  }

  const nextRequestId = crypto.randomUUID();
  generatedRequestIds.set(request, nextRequestId);
  return nextRequestId;
}

export function setResponseRequestIdHeader<TResponse extends Response>(
  response: TResponse,
  requestId: string | null | undefined
) {
  const normalized = normalizeText(requestId);
  if (normalized) {
    response.headers.set(REQUEST_ID_HEADER, normalized);
  }

  return response;
}
