export type UiTableTemplatePayload = {
  containerClassName?: string;
  tableClassName?: string;
};

function normalizeClassName(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeUiTableTemplatePayload(
  value: unknown
): UiTableTemplatePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const payload = value as Record<string, unknown>;
  return {
    containerClassName: normalizeClassName(payload.containerClassName),
    tableClassName: normalizeClassName(payload.tableClassName)
  };
}

