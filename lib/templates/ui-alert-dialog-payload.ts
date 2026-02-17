export type UiAlertDialogTemplatePayload = {
  triggerClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  footerClassName?: string;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
};

function normalizeClassName(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeUiAlertDialogTemplatePayload(
  value: unknown
): UiAlertDialogTemplatePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const payload = value as Record<string, unknown>;
  return {
    triggerClassName: normalizeClassName(payload.triggerClassName),
    contentClassName: normalizeClassName(payload.contentClassName),
    titleClassName: normalizeClassName(payload.titleClassName),
    descriptionClassName: normalizeClassName(payload.descriptionClassName),
    footerClassName: normalizeClassName(payload.footerClassName),
    cancelButtonClassName: normalizeClassName(payload.cancelButtonClassName),
    confirmButtonClassName: normalizeClassName(payload.confirmButtonClassName)
  };
}

