export const SUBSCRIPTION_TEMPLATE_FEATURE_DISPLAY_ORDER_STEP = 10;

export function getSubscriptionTemplateFeatureDefaultDisplayOrder(
  rowIndex: number
) {
  if (!Number.isInteger(rowIndex) || rowIndex < 0) {
    return 0;
  }

  return rowIndex * SUBSCRIPTION_TEMPLATE_FEATURE_DISPLAY_ORDER_STEP;
}

export function normalizeSubscriptionTemplateFeatureDisplayOrder(
  input: string | number | null | undefined,
  fallbackRowIndex: number
) {
  if (input === null || input === undefined || String(input).trim() === '') {
    return getSubscriptionTemplateFeatureDefaultDisplayOrder(fallbackRowIndex);
  }

  const parsed = Number(input);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}
