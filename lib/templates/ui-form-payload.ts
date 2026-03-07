export type UiFormTemplatePayload = {
  formClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  sectionClassName?: string;
  sectionHeaderClassName?: string;
  sectionTitleClassName?: string;
  sectionDescriptionClassName?: string;
  gridClassName?: string;
  fieldClassName?: string;
  labelClassName?: string;
  descriptionTextClassName?: string;
  fieldErrorTextClassName?: string;
  inputClassName?: string;
  textareaClassName?: string;
  selectClassName?: string;
  checkboxWrapperClassName?: string;
  formErrorClassName?: string;
  actionsClassName?: string;
};

function normalizeClassName(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeUiFormTemplatePayload(
  value: unknown
): UiFormTemplatePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const payload = value as Record<string, unknown>;

  return {
    formClassName: normalizeClassName(payload.formClassName),
    headerClassName: normalizeClassName(payload.headerClassName),
    titleClassName: normalizeClassName(payload.titleClassName),
    descriptionClassName: normalizeClassName(payload.descriptionClassName),
    sectionClassName: normalizeClassName(payload.sectionClassName),
    sectionHeaderClassName: normalizeClassName(payload.sectionHeaderClassName),
    sectionTitleClassName: normalizeClassName(payload.sectionTitleClassName),
    sectionDescriptionClassName: normalizeClassName(
      payload.sectionDescriptionClassName
    ),
    gridClassName: normalizeClassName(payload.gridClassName),
    fieldClassName: normalizeClassName(payload.fieldClassName),
    labelClassName: normalizeClassName(payload.labelClassName),
    descriptionTextClassName: normalizeClassName(
      payload.descriptionTextClassName
    ),
    fieldErrorTextClassName: normalizeClassName(
      payload.fieldErrorTextClassName
    ),
    inputClassName: normalizeClassName(payload.inputClassName),
    textareaClassName: normalizeClassName(payload.textareaClassName),
    selectClassName: normalizeClassName(payload.selectClassName),
    checkboxWrapperClassName: normalizeClassName(
      payload.checkboxWrapperClassName
    ),
    formErrorClassName: normalizeClassName(payload.formErrorClassName),
    actionsClassName: normalizeClassName(payload.actionsClassName)
  };
}
