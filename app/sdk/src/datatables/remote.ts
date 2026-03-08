import type {
  BuildTableQueryState,
  BuildTableRemoteSourceDefinition,
  BuildTableRequestDefinition
} from './definition.js';
import { createBuildTableQuerySearchParams } from './query.js';

export type BuildTableRemoteListResult<TItem extends Record<string, unknown>> = {
  items: TItem[];
  total: number;
  page?: number;
  pageSize?: number;
  payload: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbsoluteUrl(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function readByPath(source: unknown, path: string | undefined) {
  if (!path || !path.trim()) {
    return undefined;
  }

  return path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (!isRecord(current)) {
        return undefined;
      }

      return current[segment];
    }, source);
}

function toBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost';
}

function appendObjectToSearchParams(
  params: URLSearchParams,
  body: Record<string, unknown>
) {
  for (const [key, value] of Object.entries(body)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry == null) {
          continue;
        }

        params.append(key, String(entry));
      }
      continue;
    }

    params.set(key, String(value));
  }
}

function createFormData(body: Record<string, unknown>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(body)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry == null) {
          continue;
        }

        formData.append(key, String(entry));
      }
      continue;
    }

    formData.set(key, String(value));
  }

  return formData;
}

export function resolveBuildTableRemoteListUrl(
  source: BuildTableRemoteSourceDefinition,
  query: BuildTableQueryState
) {
  const url = new URL(source.url, toBaseUrl());
  const params = new URLSearchParams(url.search);
  const queryParams = createBuildTableQuerySearchParams(
    query,
    source.queryOptions
  );

  for (const [key, value] of queryParams.entries()) {
    params.set(key, value);
  }

  url.search = params.toString();

  if (isAbsoluteUrl(source.url)) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveBuildTableRemoteListResult<
  TItem extends Record<string, unknown>
>(
  payload: unknown,
  source?: BuildTableRemoteSourceDefinition
): BuildTableRemoteListResult<TItem> {
  const response = source?.response;
  const itemsValue =
    readByPath(payload, response?.itemsKey ?? 'items') ??
    (Array.isArray(payload) ? payload : []);
  const totalValue =
    readByPath(payload, response?.totalKey ?? 'total') ??
    (Array.isArray(itemsValue) ? itemsValue.length : 0);
  const pageValue = readByPath(payload, response?.pageKey ?? 'page');
  const pageSizeValue = readByPath(payload, response?.pageSizeKey ?? 'pageSize');

  return {
    items: Array.isArray(itemsValue) ? (itemsValue as TItem[]) : [],
    total:
      typeof totalValue === 'number'
        ? totalValue
        : Number.parseInt(String(totalValue ?? ''), 10) || 0,
    page:
      typeof pageValue === 'number'
        ? pageValue
        : Number.parseInt(String(pageValue ?? ''), 10) || undefined,
    pageSize:
      typeof pageSizeValue === 'number'
        ? pageSizeValue
        : Number.parseInt(String(pageSizeValue ?? ''), 10) || undefined,
    payload
  };
}

export function createBuildTableRequestDescriptor(
  request: BuildTableRequestDefinition
) {
  const method = request.method ?? 'POST';
  const body = isRecord(request.body) ? request.body : {};
  const url = new URL(request.url, toBaseUrl());
  const init: RequestInit = {
    method,
    credentials: request.credentials,
    headers: {
      ...(request.headers ?? {})
    }
  };

  if (method === 'GET') {
    appendObjectToSearchParams(url.searchParams, body);
  } else if ((request.bodyFormat ?? 'json') === 'formData') {
    init.body = createFormData(body);
  } else if (request.bodyFormat === 'searchParams') {
    const params = new URLSearchParams();
    appendObjectToSearchParams(params, body);
    init.body = params;
  } else {
    init.body = JSON.stringify(body);
    if (!('Content-Type' in (init.headers as Record<string, string>))) {
      (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
  }

  const resolvedUrl = isAbsoluteUrl(request.url)
    ? url.toString()
    : `${url.pathname}${url.search}${url.hash}`;

  return {
    url: resolvedUrl,
    init
  };
}
