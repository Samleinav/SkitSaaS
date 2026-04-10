import { areTeamsEnabled } from '@/lib/organizations/config';

export type SubscriptionCheckoutTargetType = 'team' | 'user';
export type SubscriptionTemplateTargetScope = 'organization' | 'user';

function normalizeCheckoutTargetType(
  value: string | null | undefined
): SubscriptionCheckoutTargetType | null {
  if (value === 'team' || value === 'user') {
    return value;
  }

  return null;
}

function normalizeTemplateTargetScope(
  value: string | null | undefined
): SubscriptionTemplateTargetScope | null {
  if (value === 'organization' || value === 'user') {
    return value;
  }

  return null;
}

export function supportsSelfServiceSubscriptionTemplateScope(
  templateTargetScope: string | null | undefined,
  options?: {
    teamsEnabled?: boolean;
  }
) {
  const normalizedTemplateScope = normalizeTemplateTargetScope(templateTargetScope);
  if (!normalizedTemplateScope) {
    return false;
  }

  if (
    normalizedTemplateScope === 'organization' &&
    (options?.teamsEnabled ?? areTeamsEnabled()) === false
  ) {
    return false;
  }

  if (normalizedTemplateScope === 'user') {
    return (options?.teamsEnabled ?? areTeamsEnabled()) === false;
  }

  return normalizedTemplateScope === 'organization';
}

export function filterSelfServiceSubscriptionTemplates<
  T extends { targetScope: string | null | undefined }
>(
  templates: readonly T[],
  options?: {
    teamsEnabled?: boolean;
  }
) {
  return templates.filter((template) =>
    supportsSelfServiceSubscriptionTemplateScope(template.targetScope, options)
  );
}

export function isSubscriptionTemplateScopeCompatible({
  checkoutTargetType,
  templateTargetScope
}: {
  checkoutTargetType: string | null | undefined;
  templateTargetScope: string | null | undefined;
}) {
  const normalizedTargetType = normalizeCheckoutTargetType(checkoutTargetType);
  const normalizedTemplateScope = normalizeTemplateTargetScope(templateTargetScope);

  if (!normalizedTargetType || !normalizedTemplateScope) {
    return false;
  }

  if (normalizedTargetType === 'team') {
    return normalizedTemplateScope === 'organization';
  }

  return normalizedTemplateScope === 'user';
}
