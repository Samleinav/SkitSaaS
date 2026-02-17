import 'server-only';

import {
  getCurrentSubscriptionTemplateFeatureEntriesByScope,
  getCurrentOrganizationSubscriptionTemplateFeatureEntries,
  getSubscriptionTemplateFeatureEntries,
  getSubscriptionTemplateFeatureEntriesByScope
} from '@/lib/db/queries';
import {
  createFeatureController,
  type FeatureController
} from '@/lib/features/controller';
import type { SubscriptionTargetScope } from '@/lib/payments/subscription-scopes';

export type FeatureScope = SubscriptionTargetScope;

const USER_FEATURE_PREFIX = 'dashboard.user.';

type ScopeControllers = Record<FeatureScope, FeatureController>;

export type ScopedFeatureController = {
  feature: (key: string, fallback?: string | null) => string | null;
  has: (key: string) => boolean;
  can: (key: string, required?: number) => boolean;
  number: (key: string, fallback?: number | null) => number | null;
  int: (key: string, fallback?: number | null) => number | null;
  bool: (key: string, fallback?: boolean) => boolean;
  resolveScope: (key: string) => FeatureScope;
  forScope: (scope: FeatureScope) => FeatureController;
  allByScope: () => Readonly<Record<FeatureScope, Readonly<Record<string, string>>>>;
};

export function resolveFeatureScopeFromKey(key: string): FeatureScope {
  const normalized = key.trim().toLowerCase();
  if (normalized.startsWith(USER_FEATURE_PREFIX)) {
    return 'user';
  }

  return 'organization';
}

function createScopedFeatureController(
  controllers: ScopeControllers
): ScopedFeatureController {
  const forKey = (key: string) => controllers[resolveFeatureScopeFromKey(key)];

  return {
    feature(key, fallback = null) {
      return forKey(key).feature(key, fallback);
    },
    has(key) {
      return forKey(key).has(key);
    },
    can(key, required = 1) {
      return forKey(key).can(key, required);
    },
    number(key, fallback = null) {
      return forKey(key).number(key, fallback);
    },
    int(key, fallback = null) {
      return forKey(key).int(key, fallback);
    },
    bool(key, fallback = false) {
      return forKey(key).bool(key, fallback);
    },
    resolveScope: resolveFeatureScopeFromKey,
    forScope(scope) {
      return controllers[scope];
    },
    allByScope() {
      return Object.freeze({
        user: controllers.user.all(),
        organization: controllers.organization.all()
      });
    }
  };
}

export async function getSubscriptionFeatureControllerByTemplateId(
  templateId: number | null | undefined,
  scope?: FeatureScope
): Promise<FeatureController> {
  if (!templateId || !Number.isInteger(templateId) || templateId <= 0) {
    return createFeatureController();
  }

  const features = scope
    ? await getSubscriptionTemplateFeatureEntriesByScope({
        templateId,
        targetScope: scope
      })
    : await getSubscriptionTemplateFeatureEntries(templateId);
  return createFeatureController(features);
}

export async function getCurrentFeatureControllerByScope(
  scope: FeatureScope
): Promise<FeatureController> {
  const features = await getCurrentSubscriptionTemplateFeatureEntriesByScope(scope);
  return createFeatureController(features);
}

export async function getCurrentScopedFeatureController(): Promise<ScopedFeatureController> {
  const [userFeatures, organizationFeatures] = await Promise.all([
    getCurrentSubscriptionTemplateFeatureEntriesByScope('user'),
    getCurrentOrganizationSubscriptionTemplateFeatureEntries()
  ]);

  return createScopedFeatureController({
    user: createFeatureController(userFeatures),
    organization: createFeatureController(organizationFeatures)
  });
}
