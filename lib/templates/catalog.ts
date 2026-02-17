const COMPONENT_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;

export const TEMPLATE_COMPONENT_IDS = [
  'ui.table',
  'ui.alert-dialog',
  'ui.async-submit-button'
] as const;

export type TemplateComponentId = (typeof TEMPLATE_COMPONENT_IDS)[number];

export const TEMPLATE_LOCKABLE_COMPONENT_IDS = [
  'ui.alert-dialog',
  'ui.async-submit-button'
] as const;

export type TemplateLockableComponentId =
  (typeof TEMPLATE_LOCKABLE_COMPONENT_IDS)[number];

const TEMPLATE_COMPONENT_ID_SET = new Set<string>(TEMPLATE_COMPONENT_IDS);
const TEMPLATE_LOCKABLE_COMPONENT_ID_SET = new Set<string>(
  TEMPLATE_LOCKABLE_COMPONENT_IDS
);

export function isTemplateComponentId(value: string) {
  return TEMPLATE_COMPONENT_ID_SET.has(value);
}

export function isTemplateComponentIdFormatValid(value: string) {
  return COMPONENT_ID_PATTERN.test(value);
}

export function isTemplateComponentLockable(componentId: string) {
  return TEMPLATE_LOCKABLE_COMPONENT_ID_SET.has(componentId);
}
