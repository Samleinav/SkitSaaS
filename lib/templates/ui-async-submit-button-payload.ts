export type UiAsyncSubmitButtonTemplatePayload = {
  className?: string;
  iconClassName?: string;
};

function normalizeClassName(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeUiAsyncSubmitButtonTemplatePayload(
  value: unknown
): UiAsyncSubmitButtonTemplatePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const payload = value as Record<string, unknown>;
  return {
    className: normalizeClassName(payload.className),
    iconClassName: normalizeClassName(payload.iconClassName)
  };
}

