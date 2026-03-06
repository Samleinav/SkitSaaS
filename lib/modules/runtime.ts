import type { ComponentType } from 'react';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { appModules } from '@/lib/db/schema';
import { featureFlags } from '@/lib/feature-flags';
import { getResolvedAppConfig } from '@/lib/runtime-config/load-app-config';
import type {
  ModuleFlags,
  ModuleRuntimeMode
} from '@/lib/runtime-config/types';
import { recordModuleDispatchFailure } from '@/lib/observability/migration-metrics';
import { isAreaEnabled } from '@/lib/config/runtime-surface';
import { getAllModuleManifests, getModuleManifest } from './registry';
import { resolveModuleRouteAlias } from './routes';
import type {
  ModuleAuthProvider,
  ModuleAuthProviderCapabilities,
  ModuleAuthProviderFlow,
  ModuleAuthProviderKind,
  ModulePaymentMethod,
  ModulePaymentOrderType,
  ModuleFrontendSlotDefinition,
  ModuleApiHandler,
  ModuleManifest,
  ModuleNavArea,
  ModuleNavItem,
  ModulePageHandler,
  ModuleRouteAccess,
  ModuleRouteContext,
  ModuleWidgetDefinition
} from './manifest';

export type ModuleRuntimeStatus =
  | 'installed'
  | 'enabled'
  | 'disabled'
  | 'uninstalled';

export type ModuleRuntimeRow = {
  moduleId: string;
  status: ModuleRuntimeStatus;
  version: string;
  installMode: string;
};

export type ModuleRuntimeState = {
  manifest: ModuleManifest;
  status: ModuleRuntimeStatus;
  version: string;
  installMode: string;
};

export type ResolvedModuleNavItem = {
  href: string;
  label: string;
  order: number;
  exact?: boolean;
};

export type StandaloneHomeComponent = ComponentType<{ userId: number }>;

export type ModuleWidgetArea = 'admin' | 'dashboard';

export type ModuleAuthProviderAction = 'start' | 'callback' | 'health';

export type ResolvedModuleAuthProvider = {
  providerId: string;
  moduleId: string;
  moduleVersion: string;
  moduleDisplayName: string;
  kind: ModuleAuthProviderKind;
  displayName: string;
  description: string | null;
  flow: ModuleAuthProviderFlow;
  enabledByDefault: boolean;
  order: number;
  routes: {
    startPath: string;
    callbackPath: string;
    healthPath: string | null;
  };
  capabilities: Required<ModuleAuthProviderCapabilities>;
  metadata: Record<string, unknown> | null;
};

export type ModuleAuthProviderRegistryIssue = {
  code: 'duplicate_provider_id';
  providerId: string;
  moduleIds: string[];
  message: string;
};

export type ModuleAuthProviderRegistry = {
  providers: ResolvedModuleAuthProvider[];
  issues: ModuleAuthProviderRegistryIssue[];
};

export type ResolvedModulePaymentMethod = {
  paymentMethodId: string;
  moduleId: string;
  moduleVersion: string;
  moduleDisplayName: string;
  displayName: string;
  description: string | null;
  order: number;
  supportsOrderTypes: ModulePaymentOrderType[];
  routes: {
    startPath: string;
    cancelPath: string | null;
    returnPath: string | null;
    webhookPath: string | null;
  };
  metadata: Record<string, unknown> | null;
};

export type ModulePaymentMethodRegistryIssue = {
  code: 'duplicate_payment_method_id';
  paymentMethodId: string;
  moduleIds: string[];
  message: string;
};

export type ModulePaymentMethodRegistry = {
  methods: ResolvedModulePaymentMethod[];
  issues: ModulePaymentMethodRegistryIssue[];
};

function normalizeOrder(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function normalizeAuthProviderId(value: string) {
  return String(value).trim().toLowerCase();
}

function normalizePaymentMethodId(value: string) {
  return String(value).trim().toLowerCase();
}

function normalizeAuthProviderPath(value: string | undefined, fallback: string) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (!normalized) {
    return fallback;
  }

  return `/${normalized}`;
}

function normalizeOptionalAuthProviderPath(value: string | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!normalized) {
    return null;
  }

  return `/${normalized}`;
}

function normalizePaymentMethodPath(value: string | undefined, fallback: string) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (!normalized) {
    return fallback;
  }

  return `/${normalized}`;
}

function normalizeOptionalPaymentMethodPath(value: string | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!normalized) {
    return null;
  }

  return `/${normalized}`;
}

function splitModuleApiPath(path: string) {
  const normalizedPath = String(path)
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!normalizedPath) {
    return [] as string[];
  }

  return normalizedPath.split('/').filter(Boolean);
}

function normalizeAuthProviderMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeAuthProviderCapabilities(
  capabilities: ModuleAuthProviderCapabilities | undefined
) {
  return {
    passwordless: Boolean(capabilities?.passwordless),
    mfa: Boolean(capabilities?.mfa),
    enterprise: Boolean(capabilities?.enterprise),
    justInTimeProvisioning: Boolean(capabilities?.justInTimeProvisioning),
    groupsSync: Boolean(capabilities?.groupsSync)
  };
}

function normalizeAuthProviderFlow(flow: ModuleAuthProviderFlow | undefined) {
  if (flow === 'link' || flow === 'both') {
    return flow;
  }

  return 'login' as const;
}

function normalizePaymentMethodOrderTypes(
  orderTypes: ModulePaymentMethod['supportsOrderTypes']
) {
  const normalized = new Set<ModulePaymentOrderType>();
  for (const entry of orderTypes ?? ['subscription', 'one_time']) {
    if (entry === 'subscription' || entry === 'one_time') {
      normalized.add(entry);
    }
  }

  if (normalized.size === 0) {
    return ['subscription', 'one_time'] as ModulePaymentOrderType[];
  }

  return Array.from(normalized.values()).sort();
}

const MODULE_STATUSES = new Set<ModuleRuntimeStatus>([
  'installed',
  'enabled',
  'disabled',
  'uninstalled'
]);
const FRONTEND_ADMIN_ROLES = new Set(['admin']);
const resolvedAppConfig = getResolvedAppConfig();

function normalizeModuleStatus(value: string): ModuleRuntimeStatus {
  if (MODULE_STATUSES.has(value as ModuleRuntimeStatus)) {
    return value as ModuleRuntimeStatus;
  }

  return 'uninstalled';
}

export function resolveEnabledModuleIdSet({
  manifests,
  runtimeRows,
  moduleRuntimeMode,
  moduleFlags
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
  moduleRuntimeMode: ModuleRuntimeMode;
  moduleFlags: ModuleFlags;
}) {
  const manifestIds = new Set(manifests.map((manifest) => manifest.moduleId));
  const enabledByDb = new Set(
    runtimeRows
      .filter((row) => normalizeModuleStatus(row.status) === 'enabled')
      .map((row) => row.moduleId)
      .filter((moduleId) => manifestIds.has(moduleId))
  );

  if (moduleRuntimeMode === 'db') {
    return enabledByDb;
  }

  const enabledByConfig = new Set<string>();
  for (const [moduleId, enabled] of Object.entries(moduleFlags)) {
    if (!manifestIds.has(moduleId) || enabled !== true) {
      continue;
    }

    enabledByConfig.add(moduleId);
  }

  if (moduleRuntimeMode === 'config') {
    return enabledByConfig;
  }

  const enabledHybrid = new Set<string>(enabledByDb);
  for (const moduleId of enabledByConfig) {
    enabledHybrid.add(moduleId);
  }
  for (const [moduleId, enabled] of Object.entries(moduleFlags)) {
    if (enabled === false) {
      enabledHybrid.delete(moduleId);
    }
  }

  return enabledHybrid;
}

function resolveRuntimeEnabledModuleIdSet({
  manifests,
  runtimeRows
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
}) {
  return resolveEnabledModuleIdSet({
    manifests,
    runtimeRows,
    moduleRuntimeMode: resolvedAppConfig.moduleRuntimeMode,
    moduleFlags: resolvedAppConfig.modules
  });
}

export type FrontendModuleAccessOutcome =
  | 'granted'
  | 'login_required'
  | 'forbidden'
  | 'manifest_missing';

export type FrontendSlotProviderResolutionSource =
  | 'target_module'
  | 'enabled_module'
  | 'missing';

export type FrontendSlotProviderResolution = {
  source: FrontendSlotProviderResolutionSource;
  slotId: string;
  moduleId: string | null;
  slot: ModuleFrontendSlotDefinition | null;
};

export function resolveFrontendRouteAccessOutcome({
  policy,
  userRole
}: {
  policy: ModuleRouteAccess;
  userRole: string | null;
}): Exclude<FrontendModuleAccessOutcome, 'manifest_missing'> {
  if (policy === 'public') {
    return 'granted';
  }

  if (!userRole) {
    return 'login_required';
  }

  if (policy === 'admin' && !FRONTEND_ADMIN_ROLES.has(userRole)) {
    return 'forbidden';
  }

  return 'granted';
}

function normalizeFrontendSlotId(slotId: string) {
  return String(slotId).trim().toLowerCase();
}

function findFrontendSlot(
  manifest: ModuleManifest,
  slotId: string
): ModuleFrontendSlotDefinition | null {
  const normalizedSlotId = normalizeFrontendSlotId(slotId);
  if (!normalizedSlotId) {
    return null;
  }

  const entries = manifest.frontendSlots ?? [];
  for (const entry of entries) {
    if (normalizeFrontendSlotId(entry.slotId) === normalizedSlotId) {
      return entry;
    }
  }

  return null;
}

export function resolveFrontendSlotProvider({
  slotId,
  targetModuleId,
  manifests,
  enabledModuleIds
}: {
  slotId: string;
  targetModuleId?: string | null;
  manifests: ModuleManifest[];
  enabledModuleIds: string[];
}): FrontendSlotProviderResolution {
  const normalizedSlotId = normalizeFrontendSlotId(slotId);
  if (!normalizedSlotId) {
    return {
      source: 'missing',
      slotId: normalizedSlotId,
      moduleId: null,
      slot: null
    };
  }

  const enabledSet = new Set(
    enabledModuleIds.map((moduleId) => String(moduleId).trim()).filter(Boolean)
  );
  const byModuleId = new Map(
    manifests.map((manifest) => [manifest.moduleId, manifest])
  );

  const normalizedTargetModuleId = String(targetModuleId ?? '').trim();
  if (normalizedTargetModuleId && enabledSet.has(normalizedTargetModuleId)) {
    const targetManifest = byModuleId.get(normalizedTargetModuleId);
    if (targetManifest) {
      const targetSlot = findFrontendSlot(targetManifest, normalizedSlotId);
      if (targetSlot) {
        return {
          source: 'target_module',
          slotId: normalizedSlotId,
          moduleId: normalizedTargetModuleId,
          slot: targetSlot
        };
      }
    }
  }

  for (const manifest of manifests) {
    if (!enabledSet.has(manifest.moduleId)) {
      continue;
    }

    if (
      normalizedTargetModuleId &&
      manifest.moduleId === normalizedTargetModuleId
    ) {
      continue;
    }

    const slot = findFrontendSlot(manifest, normalizedSlotId);
    if (!slot) {
      continue;
    }

    return {
      source: 'enabled_module',
      slotId: normalizedSlotId,
      moduleId: manifest.moduleId,
      slot
    };
  }

  return {
    source: 'missing',
    slotId: normalizedSlotId,
    moduleId: null,
    slot: null
  };
}

export function resolveFrontendRouteAccessPolicy(
  manifest: ModuleManifest
): ModuleRouteAccess {
  const policy = manifest.frontendRouteAccess;
  if (policy === 'user' || policy === 'admin') {
    return policy;
  }

  return 'public';
}

export async function evaluateFrontendModuleAccess(
  moduleId: string
): Promise<FrontendModuleAccessOutcome> {
  const manifest = getModuleManifest(moduleId);
  if (!manifest) {
    recordModuleDispatchFailure(moduleId, 'manifest_missing');
    return 'manifest_missing';
  }

  const policy = resolveFrontendRouteAccessPolicy(manifest);
  if (policy === 'public') {
    return 'granted';
  }

  const user = await getUser();
  const outcome = resolveFrontendRouteAccessOutcome({
    policy,
    userRole: user?.role ?? null
  });
  if (outcome === 'login_required') {
    recordModuleDispatchFailure(moduleId, 'auth_required');
  } else if (outcome === 'forbidden') {
    recordModuleDispatchFailure(moduleId, 'admin_required');
  }

  return outcome;
}

export async function resolveFrontendModuleSlot({
  slotId,
  moduleId,
  route,
  payload,
  searchParams
}: {
  slotId: string;
  moduleId?: string | null;
  route?: string | null;
  payload?: unknown;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const normalizedSlotId = normalizeFrontendSlotId(slotId);
  if (!normalizedSlotId) {
    return null;
  }

  if (!featureFlags.useAppModulesRuntime) {
    recordModuleDispatchFailure('frontend.slot', 'runtime_disabled', {
      slotId: normalizedSlotId
    });
    return null;
  }

  const manifests = getAllModuleManifests();
  const enabledManifests = await getEnabledModuleManifests();
  const provider = resolveFrontendSlotProvider({
    slotId: normalizedSlotId,
    targetModuleId: moduleId,
    manifests,
    enabledModuleIds: enabledManifests.map((manifest) => manifest.moduleId)
  });

  if (!provider.slot || !provider.moduleId) {
    recordModuleDispatchFailure('frontend.slot', 'slot_not_found', {
      slotId: normalizedSlotId,
      moduleId: moduleId ?? null
    });
    return null;
  }

  try {
    return await provider.slot.handler({
      moduleId: provider.moduleId,
      slotId: normalizedSlotId,
      route: route ?? null,
      payload,
      searchParams
    });
  } catch {
    recordModuleDispatchFailure(provider.moduleId, 'slot_handler_error', {
      slotId: normalizedSlotId
    });
    return null;
  }
}

export function mergeModuleRuntimeState({
  manifests,
  runtimeRows
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
}) {
  const byModuleId = new Map(
    runtimeRows.map((row) => [row.moduleId, row])
  );

  return manifests.map((manifest) => {
    const runtimeRow = byModuleId.get(manifest.moduleId);
    return {
      manifest,
      status: runtimeRow?.status ?? 'uninstalled',
      version: runtimeRow?.version ?? manifest.version,
      installMode: runtimeRow?.installMode ?? 'core'
    } satisfies ModuleRuntimeState;
  });
}

async function getModuleRuntimeRows(): Promise<ModuleRuntimeRow[]> {
  if (!featureFlags.useAppModulesRuntime) {
    return [];
  }

  if (resolvedAppConfig.moduleRuntimeMode === 'config') {
    return [];
  }

  const rows = await db
    .select({
      moduleId: appModules.moduleId,
      status: appModules.status,
      version: appModules.version,
      installMode: appModules.installMode
    })
    .from(appModules);

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => ({
    ...row,
    status: normalizeModuleStatus(row.status)
  }));
}

export async function getEnabledModuleManifests() {
  if (!featureFlags.useAppModulesRuntime) {
    return [];
  }

  const manifests = getAllModuleManifests();
  const runtimeRows = await getModuleRuntimeRows();
  const enabledIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });

  return manifests.filter((manifest) =>
    enabledIds.has(manifest.moduleId)
  );
}

export function buildAuthProviderRegistry({
  manifests,
  runtimeRows,
  enabledOnly = true
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
  enabledOnly?: boolean;
}): ModuleAuthProviderRegistry {
  const enabledModuleIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });
  const providers: ResolvedModuleAuthProvider[] = [];

  for (const manifest of manifests) {
    if (enabledOnly && !enabledModuleIds.has(manifest.moduleId)) {
      continue;
    }

    for (const moduleProvider of manifest.authProviders ?? []) {
      const providerId = normalizeAuthProviderId(moduleProvider.providerId);
      if (!providerId) {
        continue;
      }

      providers.push({
        providerId,
        moduleId: manifest.moduleId,
        moduleVersion: manifest.version,
        moduleDisplayName: manifest.displayName,
        kind: moduleProvider.kind,
        displayName: moduleProvider.displayName?.trim() || providerId,
        description: moduleProvider.description?.trim() || null,
        flow: normalizeAuthProviderFlow(moduleProvider.flow),
        enabledByDefault: Boolean(moduleProvider.enabledByDefault),
        order: normalizeOrder(moduleProvider.order),
        routes: {
          startPath: normalizeAuthProviderPath(
            moduleProvider.routes?.startPath,
            `/start/${providerId}`
          ),
          callbackPath: normalizeAuthProviderPath(
            moduleProvider.routes?.callbackPath,
            `/callback/${providerId}`
          ),
          healthPath: normalizeOptionalAuthProviderPath(
            moduleProvider.routes?.healthPath
          )
        },
        capabilities: normalizeAuthProviderCapabilities(
          moduleProvider.capabilities
        ),
        metadata: normalizeAuthProviderMetadata(moduleProvider.metadata)
      });
    }
  }

  const duplicateMap = new Map<string, ResolvedModuleAuthProvider[]>();
  for (const provider of providers) {
    const existing = duplicateMap.get(provider.providerId);
    if (existing) {
      existing.push(provider);
      continue;
    }

    duplicateMap.set(provider.providerId, [provider]);
  }

  const issues: ModuleAuthProviderRegistryIssue[] = [];
  const duplicatedProviderIds = new Set<string>();
  for (const [providerId, entries] of duplicateMap.entries()) {
    if (entries.length <= 1) {
      continue;
    }

    duplicatedProviderIds.add(providerId);
    issues.push({
      code: 'duplicate_provider_id',
      providerId,
      moduleIds: entries.map((entry) => entry.moduleId).sort(),
      message:
        `Duplicate auth provider id "${providerId}" found across enabled modules. ` +
        'Provider is disabled until conflict is resolved.'
    });
  }

  const normalizedProviders = providers
    .filter((provider) => !duplicatedProviderIds.has(provider.providerId))
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      const byDisplayName = left.displayName.localeCompare(right.displayName);
      if (byDisplayName !== 0) {
        return byDisplayName;
      }

      const byProviderId = left.providerId.localeCompare(right.providerId);
      if (byProviderId !== 0) {
        return byProviderId;
      }

      return left.moduleId.localeCompare(right.moduleId);
    });

  return {
    providers: normalizedProviders,
    issues
  };
}

export async function getEnabledAuthProviderRegistry(): Promise<ModuleAuthProviderRegistry> {
  if (!featureFlags.useAppModulesRuntime) {
    return {
      providers: [],
      issues: []
    };
  }

  const manifests = getAllModuleManifests();
  const runtimeRows = await getModuleRuntimeRows();
  return buildAuthProviderRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });
}

export type ResolvedAuthProviderById = {
  provider: ResolvedModuleAuthProvider | null;
  issue: ModuleAuthProviderRegistryIssue | null;
  registry: ModuleAuthProviderRegistry;
};

export async function getEnabledAuthProviderById(
  providerId: string
): Promise<ResolvedAuthProviderById> {
  const normalizedProviderId = normalizeAuthProviderId(providerId);
  const registry = await getEnabledAuthProviderRegistry();
  const provider =
    registry.providers.find((entry) => entry.providerId === normalizedProviderId) ??
    null;
  const issue =
    registry.issues.find((entry) => entry.providerId === normalizedProviderId) ??
    null;

  return {
    provider,
    issue,
    registry
  };
}

export function resolveAuthProviderActionPath(
  provider: ResolvedModuleAuthProvider,
  action: ModuleAuthProviderAction
) {
  if (action === 'start') {
    return provider.routes.startPath;
  }

  if (action === 'callback') {
    return provider.routes.callbackPath;
  }

  return provider.routes.healthPath;
}

export function resolveAuthProviderActionSlug(
  provider: ResolvedModuleAuthProvider,
  action: ModuleAuthProviderAction
) {
  const path = resolveAuthProviderActionPath(provider, action);
  if (!path) {
    return null;
  }

  return splitModuleApiPath(path);
}

export function buildPaymentMethodRegistry({
  manifests,
  runtimeRows,
  enabledOnly = true
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
  enabledOnly?: boolean;
}): ModulePaymentMethodRegistry {
  const enabledModuleIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });
  const methods: ResolvedModulePaymentMethod[] = [];

  for (const manifest of manifests) {
    if (enabledOnly && !enabledModuleIds.has(manifest.moduleId)) {
      continue;
    }

    for (const moduleMethod of manifest.paymentMethods ?? []) {
      const paymentMethodId = normalizePaymentMethodId(
        moduleMethod.paymentMethodId
      );
      if (!paymentMethodId) {
        continue;
      }

      methods.push({
        paymentMethodId,
        moduleId: manifest.moduleId,
        moduleVersion: manifest.version,
        moduleDisplayName: manifest.displayName,
        displayName: moduleMethod.displayName?.trim() || paymentMethodId,
        description: moduleMethod.description?.trim() || null,
        order: normalizeOrder(moduleMethod.order),
        supportsOrderTypes: normalizePaymentMethodOrderTypes(
          moduleMethod.supportsOrderTypes
        ),
        routes: {
          startPath: normalizePaymentMethodPath(
            moduleMethod.routes?.startPath,
            `/start/${paymentMethodId}`
          ),
          cancelPath: normalizeOptionalPaymentMethodPath(
            moduleMethod.routes?.cancelPath
          ),
          returnPath: normalizeOptionalPaymentMethodPath(
            moduleMethod.routes?.returnPath
          ),
          webhookPath: normalizeOptionalPaymentMethodPath(
            moduleMethod.routes?.webhookPath
          )
        },
        metadata: normalizeAuthProviderMetadata(moduleMethod.metadata)
      });
    }
  }

  const duplicateMap = new Map<string, ResolvedModulePaymentMethod[]>();
  for (const method of methods) {
    const existing = duplicateMap.get(method.paymentMethodId);
    if (existing) {
      existing.push(method);
      continue;
    }

    duplicateMap.set(method.paymentMethodId, [method]);
  }

  const issues: ModulePaymentMethodRegistryIssue[] = [];
  const duplicatedPaymentMethodIds = new Set<string>();
  for (const [paymentMethodId, entries] of duplicateMap.entries()) {
    if (entries.length <= 1) {
      continue;
    }

    duplicatedPaymentMethodIds.add(paymentMethodId);
    issues.push({
      code: 'duplicate_payment_method_id',
      paymentMethodId,
      moduleIds: entries.map((entry) => entry.moduleId).sort(),
      message:
        `Duplicate payment method id "${paymentMethodId}" found across enabled modules. ` +
        'Method is disabled until conflict is resolved.'
    });
  }

  const normalizedMethods = methods
    .filter((method) => !duplicatedPaymentMethodIds.has(method.paymentMethodId))
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      const byDisplayName = left.displayName.localeCompare(right.displayName);
      if (byDisplayName !== 0) {
        return byDisplayName;
      }

      const byMethodId = left.paymentMethodId.localeCompare(right.paymentMethodId);
      if (byMethodId !== 0) {
        return byMethodId;
      }

      return left.moduleId.localeCompare(right.moduleId);
    });

  return {
    methods: normalizedMethods,
    issues
  };
}

export async function getEnabledPaymentMethodRegistry(): Promise<ModulePaymentMethodRegistry> {
  if (!featureFlags.useAppModulesRuntime) {
    return {
      methods: [],
      issues: []
    };
  }

  const manifests = getAllModuleManifests();
  const runtimeRows = await getModuleRuntimeRows();
  return buildPaymentMethodRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });
}

export type ResolvedPaymentMethodById = {
  method: ResolvedModulePaymentMethod | null;
  issue: ModulePaymentMethodRegistryIssue | null;
  registry: ModulePaymentMethodRegistry;
};

export async function getEnabledPaymentMethodById(
  paymentMethodId: string
): Promise<ResolvedPaymentMethodById> {
  const normalizedPaymentMethodId = normalizePaymentMethodId(paymentMethodId);
  const registry = await getEnabledPaymentMethodRegistry();
  const method =
    registry.methods.find(
      (entry) => entry.paymentMethodId === normalizedPaymentMethodId
    ) ?? null;
  const issue =
    registry.issues.find(
      (entry) => entry.paymentMethodId === normalizedPaymentMethodId
    ) ?? null;

  return {
    method,
    issue,
    registry
  };
}

export async function isModuleEnabled(moduleId: string) {
  if (!featureFlags.useAppModulesRuntime) {
    return false;
  }

  const manifests = getAllModuleManifests();
  if (!manifests.some((manifest) => manifest.moduleId === moduleId)) {
    return false;
  }

  const runtimeRows = await getModuleRuntimeRows();
  const enabledModuleIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });
  return enabledModuleIds.has(moduleId);
}

function resolveNavItemsForModule(
  manifest: ModuleManifest,
  area: ModuleNavArea
) {
  const moduleNavItems =
    area === 'admin'
      ? manifest.adminNavItems
      : area === 'dashboard'
        ? manifest.dashboardNavItems
        : manifest.frontendNavItems;
  if (!moduleNavItems?.length) {
    return [];
  }

  return moduleNavItems.map((item) => ({
    href: item.href,
    label: item.label,
    order: normalizeOrder(item.order),
    exact: item.exact
  }));
}

function resolveStandaloneHomeComponentForModule(
  manifest: ModuleManifest
): StandaloneHomeComponent | null {
  return manifest.standaloneHomeComponent ?? null;
}

async function resolveStandaloneNavItemsForModule(
  manifest: ModuleManifest,
  userId: number
) {
  const standaloneNavItems = manifest.standaloneNavItems;
  if (!standaloneNavItems) {
    return [] as ResolvedModuleNavItem[];
  }

  try {
    const moduleNavItems =
      typeof standaloneNavItems === 'function'
        ? await standaloneNavItems(userId)
        : standaloneNavItems;
    if (!Array.isArray(moduleNavItems) || moduleNavItems.length === 0) {
      return [] as ResolvedModuleNavItem[];
    }

    return moduleNavItems.map((item) => ({
      href: item.href,
      label: item.label,
      order: normalizeOrder(item.order),
      exact: item.exact
    }));
  } catch {
    recordModuleDispatchFailure(manifest.moduleId, 'standalone_nav_items_error');
    return [] as ResolvedModuleNavItem[];
  }
}

export function buildEnabledModuleNavItems({
  manifests,
  runtimeRows,
  area
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
  area: ModuleNavArea;
}) {
  const enabledIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });

  const items = manifests.flatMap((manifest) => {
    if (!enabledIds.has(manifest.moduleId)) {
      return [];
    }

    return resolveNavItemsForModule(manifest, area);
  });

  return items.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.label.localeCompare(b.label);
  });
}

export async function getEnabledModuleNavItems(area: ModuleNavArea) {
  if (!isAreaEnabled(area)) {
    return [] as ResolvedModuleNavItem[];
  }

  if (!featureFlags.useAppModulesRuntime) {
    return [] as ResolvedModuleNavItem[];
  }

  const manifests = getAllModuleManifests();
  const runtimeRows = await getModuleRuntimeRows();
  return buildEnabledModuleNavItems({ manifests, runtimeRows, area });
}

export function buildEnabledStandaloneHomeComponent({
  manifests,
  runtimeRows
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
}) {
  const enabledIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });

  for (const manifest of manifests) {
    if (!enabledIds.has(manifest.moduleId)) {
      continue;
    }

    const component = resolveStandaloneHomeComponentForModule(manifest);
    if (component) {
      return component;
    }
  }

  return null;
}

export async function buildEnabledStandaloneNavItems({
  manifests,
  runtimeRows,
  userId
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
  userId: number;
}) {
  const enabledIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });

  const items: ResolvedModuleNavItem[] = [];
  for (const manifest of manifests) {
    if (!enabledIds.has(manifest.moduleId)) {
      continue;
    }

    const moduleItems = await resolveStandaloneNavItemsForModule(manifest, userId);
    if (moduleItems.length > 0) {
      items.push(...moduleItems);
    }
  }

  return items.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.label.localeCompare(b.label);
  });
}

export async function getEnabledStandaloneHomeComponent() {
  if (!isAreaEnabled('dashboard')) {
    return null;
  }

  if (!featureFlags.useAppModulesRuntime) {
    return null;
  }

  const manifests = getAllModuleManifests();
  const runtimeRows = await getModuleRuntimeRows();
  return buildEnabledStandaloneHomeComponent({ manifests, runtimeRows });
}

export async function getEnabledStandaloneNavItems(userId: number) {
  if (!isAreaEnabled('dashboard')) {
    return [];
  }

  if (!featureFlags.useAppModulesRuntime) {
    return [];
  }

  const manifests = getAllModuleManifests();
  const runtimeRows = await getModuleRuntimeRows();
  return buildEnabledStandaloneNavItems({
    manifests,
    runtimeRows,
    userId
  });
}

function resolveWidgetsForArea(
  manifest: ModuleManifest,
  area: ModuleWidgetArea
) {
  return area === 'admin'
    ? manifest.adminDashboardWidgets
    : manifest.dashboardWidgets;
}

export function buildEnabledModuleWidgets({
  manifests,
  runtimeRows,
  area
}: {
  manifests: ModuleManifest[];
  runtimeRows: ModuleRuntimeRow[];
  area: ModuleWidgetArea;
}) {
  const enabledIds = resolveRuntimeEnabledModuleIdSet({
    manifests,
    runtimeRows
  });

  const widgets = manifests.flatMap(
    (manifest) => {
      if (!enabledIds.has(manifest.moduleId)) {
        return [];
      }

      return resolveWidgetsForArea(manifest, area) ?? [];
    }
  );

  return widgets.sort((a, b) => {
    const orderDelta = normalizeOrder(a.order) - normalizeOrder(b.order);
    if (orderDelta !== 0) {
      return orderDelta;
    }

    return a.id.localeCompare(b.id);
  });
}

async function getEnabledModuleWidgets(area: ModuleWidgetArea) {
  if (!featureFlags.useAppModulesRuntime) {
    return [] as ModuleWidgetDefinition<unknown>[];
  }

  const manifests = getAllModuleManifests();
  const runtimeRows = await getModuleRuntimeRows();
  return buildEnabledModuleWidgets({ manifests, runtimeRows, area });
}

export async function getEnabledAdminDashboardModuleWidgets() {
  return getEnabledModuleWidgets('admin');
}

export async function getEnabledDashboardModuleWidgets() {
  return getEnabledModuleWidgets('dashboard');
}

function buildRouteContext({
  moduleId,
  slug,
  matchedAlias,
  searchParams
}: {
  moduleId: string;
  slug?: string[] | string;
  matchedAlias?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
}): ModuleRouteContext {
  const normalizedSlug = Array.isArray(slug)
    ? slug
    : typeof slug === 'string' && slug
      ? [slug]
      : [];

  return {
    moduleId,
    slug: normalizedSlug,
    matchedAlias: matchedAlias ?? null,
    searchParams
  };
}

async function resolveModulePageHandler({
  moduleId,
  handler,
  context
}: {
  moduleId: string;
  handler?: ModulePageHandler;
  context: ModuleRouteContext;
}) {
  if (!handler) {
    recordModuleDispatchFailure(moduleId, 'handler_missing');
    return null;
  }

  return handler(context);
}

export async function resolveModulePage({
  area,
  moduleId,
  slug,
  matchedAlias,
  searchParams
}: {
  area: 'admin' | 'dashboard' | 'frontend';
  moduleId: string;
  slug?: string[] | string;
  matchedAlias?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!isAreaEnabled(area)) {
    recordModuleDispatchFailure(moduleId, 'area_disabled', {
      area
    });
    return null;
  }

  if (!featureFlags.useModuleDispatcherRoutes) {
    recordModuleDispatchFailure(moduleId, 'dispatcher_disabled');
    return null;
  }

  const manifest = getModuleManifest(moduleId);
  if (!manifest) {
    recordModuleDispatchFailure(moduleId, 'manifest_missing');
    return null;
  }

  if (!featureFlags.useAppModulesRuntime) {
    recordModuleDispatchFailure(moduleId, 'runtime_disabled');
    return null;
  }

  const enabled = await isModuleEnabled(moduleId);
  if (!enabled) {
    recordModuleDispatchFailure(moduleId, 'module_disabled');
    return null;
  }

  const context = buildRouteContext({
    moduleId,
    slug,
    matchedAlias,
    searchParams
  });
  const handler =
    area === 'admin'
      ? manifest.adminPage
      : area === 'dashboard'
        ? manifest.dashboardPage
        : manifest.frontendPage;

  return resolveModulePageHandler({ moduleId, handler, context });
}

export async function resolveModulePageByPath({
  area,
  path,
  searchParams
}: {
  area: 'admin' | 'dashboard' | 'frontend';
  path: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!isAreaEnabled(area)) {
    recordModuleDispatchFailure(`${area}.route_alias`, 'area_disabled', {
      area,
      path
    });
    return null;
  }

  const match = resolveModuleRouteAlias({
    area,
    path,
    manifests: getAllModuleManifests()
  });

  if (!match) {
    recordModuleDispatchFailure(`${area}.route_alias`, 'route_alias_not_found', {
      path
    });
    return null;
  }

  return resolveModulePage({
    area,
    moduleId: match.moduleId,
    slug: match.slug,
    matchedAlias: match.aliasPath,
    searchParams
  });
}

export async function resolveModuleApiHandler({
  moduleId,
  slug,
  request
}: {
  moduleId: string;
  slug?: string[] | string;
  request: Request;
}) {
  if (!featureFlags.useModuleDispatcherRoutes) {
    recordModuleDispatchFailure(moduleId, 'dispatcher_disabled');
    return null;
  }

  const manifest = getModuleManifest(moduleId);
  if (!manifest) {
    recordModuleDispatchFailure(moduleId, 'manifest_missing');
    return null;
  }

  if (!featureFlags.useAppModulesRuntime) {
    recordModuleDispatchFailure(moduleId, 'runtime_disabled');
    return null;
  }

  const enabled = await isModuleEnabled(moduleId);
  if (!enabled) {
    recordModuleDispatchFailure(moduleId, 'module_disabled');
    return null;
  }

  const handler: ModuleApiHandler | undefined = manifest.apiHandler;
  if (!handler) {
    recordModuleDispatchFailure(moduleId, 'handler_missing');
    return null;
  }

  const context = buildRouteContext({ moduleId, slug });
  return handler(request, context);
}
