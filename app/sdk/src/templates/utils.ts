export type ClassNameValue = string | false | null | undefined;

export function mergeClassNames(...values: ClassNameValue[]) {
  return values.filter(Boolean).join(' ');
}

export function readString(
  data: Record<string, unknown> | null | undefined,
  key: string,
  fallback = ''
) {
  return toStringOrFallback(data?.[key], fallback);
}

export function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function toStringOrFallback(value: unknown, fallback: string): string {
  return toStringOrNull(value) ?? fallback;
}

export function toNumberOrFallback(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
