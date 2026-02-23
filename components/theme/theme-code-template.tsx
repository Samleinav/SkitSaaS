import type { ComponentType, ReactNode } from 'react';
import {
  THEME_CODE_REGISTRY,
  type CodeRegistryThemeEntry
} from '@/lib/themes/code-registry.generated';
import {
  MODULE_CODE_TEMPLATE_REGISTRY,
  type ModuleCodeRegistryEntry
} from '@/lib/templates/module-code-registry.generated';
import type { TemplateDataForId } from '@/lib/themes/template-data-contract';
import { createPerfTrace } from '@/lib/observability/perf-trace';

function resolveThemeId(explicitThemeId: string | null | undefined): string | null {
  return explicitThemeId ?? null;
}

/**
 * Internal async function that does the actual template resolution.
 * Exported for testing and reuse.
 */
async function resolveTemplate<TId extends string>({
  id,
  themeId,
  moduleId,
  data,
  className,
  children,
  fallback
}: {
  id: TId;
  themeId: string | null;
  moduleId?: string | null;
  data?: TemplateDataForId<TId>;
  className?: string;
  children?: ReactNode;
  fallback?: ReactNode;
}) {
  const normalizedTemplateId = normalizeId(id);
  if (!normalizedTemplateId) {
    throw new Error('[theme-code-template] Missing or invalid component id.');
  }
  const normalizedModuleId = normalizeId(moduleId);
  const resolved = await resolveThemeCodeTemplate<TId>({
    themeId,
    componentId: normalizedTemplateId
  });

  if (!resolved.resolved) {
    reportMissingThemeCodeTemplate({
      reason: resolved.reason,
      componentId: resolved.componentId,
      themeId: resolved.themeId,
      moduleId: normalizedModuleId
    });

    if (normalizedModuleId) {
      const renderedModuleTemplate = await renderModuleCodeTemplate({
        moduleId: normalizedModuleId,
        templateId: normalizedTemplateId,
        data: data as Record<string, unknown> | undefined,
        className,
        themeId: themeId ?? undefined,
        children
      });
      return <>{renderedModuleTemplate}</>;
    }

    return <>{fallback ?? children ?? null}</>;
  }

  const renderedTemplate = (
    <resolved.resolved.Component
      data={data}
      className={className}
      themeId={themeId ?? undefined}
    >
      {children}
    </resolved.resolved.Component>
  );

  if (resolved.resolved.Provider) {
    return <resolved.resolved.Provider>{renderedTemplate}</resolved.resolved.Provider>;
  }

  return renderedTemplate;
}

type ThemeProviderComponent = ComponentType<{ children: ReactNode }>;
type ThemeTemplateComponent<TId extends string = string> = ComponentType<{
  data?: TemplateDataForId<TId>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
}>;

type ResolvedThemeCodeTemplate<TId extends string = string> = {
  Component: ThemeTemplateComponent<TId>;
  Provider: ThemeProviderComponent | null;
};

type ThemeCodeTemplateResolveFailureReason =
  | 'invalid_component_id'
  | 'missing_theme_id'
  | 'theme_not_registered'
  | 'template_not_registered'
  | 'template_load_failed';

type ThemeCodeTemplateResolution<TId extends string = string> = {
  resolved: ResolvedThemeCodeTemplate<TId> | null;
  componentId: string | null;
  themeId: string | null;
  reason: ThemeCodeTemplateResolveFailureReason | null;
};

const loadedTemplateComponents = new Map<string, ThemeTemplateComponent>();
const loadedProviderComponents = new Map<string, ThemeProviderComponent | null>();
const loadedModuleTemplateComponents = new Map<string, ThemeTemplateComponent>();

function normalizeId(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function resolveRegistryEntry(themeId: string | null | undefined) {
  const normalizedThemeId = normalizeId(themeId);
  if (!normalizedThemeId) {
    return null;
  }

  return THEME_CODE_REGISTRY[normalizedThemeId] ?? null;
}

async function loadThemeTemplateComponent({
  registryEntry,
  componentId
}: {
  registryEntry: CodeRegistryThemeEntry;
  componentId: string;
}) {
  const templateLoader = registryEntry.templates[componentId];
  if (!templateLoader) {
    return null;
  }

  const cacheKey = `${registryEntry.themeId}::${componentId}`;
  const cached = loadedTemplateComponents.get(cacheKey);
  if (cached) {
    return cached;
  }

  const templateModule = await templateLoader();
  const templateComponent = templateModule.default as ThemeTemplateComponent;
  loadedTemplateComponents.set(cacheKey, templateComponent);
  return templateComponent;
}

async function loadThemeProviderComponent(registryEntry: CodeRegistryThemeEntry) {
  if (loadedProviderComponents.has(registryEntry.themeId)) {
    return loadedProviderComponents.get(registryEntry.themeId) ?? null;
  }

  if (!registryEntry.providerImport) {
    loadedProviderComponents.set(registryEntry.themeId, null);
    return null;
  }

  const providerModule = await registryEntry.providerImport();
  const provider = providerModule.default as ThemeProviderComponent;
  loadedProviderComponents.set(registryEntry.themeId, provider);
  return provider;
}

async function resolveThemeCodeTemplate<TId extends string>({
  themeId,
  componentId
}: {
  themeId: string | null | undefined;
  componentId: string;
}): Promise<ThemeCodeTemplateResolution<TId>> {
  const normalizedComponentId = normalizeId(componentId);
  const normalizedThemeId = normalizeId(themeId);
  const perfTrace = createPerfTrace({
    scope: 'theme',
    name: 'theme.code-template.resolve',
    tags: {
      componentId: normalizedComponentId,
      themeId: normalizedThemeId
    }
  });

  if (!normalizedComponentId) {
    perfTrace.end('skipped', {
      reason: 'invalid_component_id'
    });
    return {
      resolved: null,
      componentId: null,
      themeId: normalizedThemeId,
      reason: 'invalid_component_id'
    };
  }

  if (!normalizedThemeId) {
    perfTrace.end('skipped', {
      reason: 'missing_theme_id'
    });
    return {
      resolved: null,
      componentId: normalizedComponentId,
      themeId: null,
      reason: 'missing_theme_id'
    };
  }

  const registryEntry = resolveRegistryEntry(normalizedThemeId);
  if (!registryEntry) {
    perfTrace.end('skipped', {
      reason: 'theme_not_registered'
    });
    return {
      resolved: null,
      componentId: normalizedComponentId,
      themeId: normalizedThemeId,
      reason: 'theme_not_registered'
    };
  }

  try {
    const [Component, Provider] = await Promise.all([
      loadThemeTemplateComponent({
        registryEntry,
        componentId: normalizedComponentId
      }),
      loadThemeProviderComponent(registryEntry)
    ]);
    perfTrace.step('loadThemeTemplateAndProvider', {
      hasComponent: Boolean(Component),
      hasProvider: Boolean(Provider)
    });

    if (!Component) {
      perfTrace.end('skipped', {
        reason: 'template_not_registered'
      });
      return {
        resolved: null,
        componentId: normalizedComponentId,
        themeId: normalizedThemeId,
        reason: 'template_not_registered'
      };
    }

    perfTrace.end('ok', {
      hasProvider: Boolean(Provider)
    });
    return {
      resolved: {
        Component: Component as ThemeTemplateComponent<TId>,
        Provider
      },
      componentId: normalizedComponentId,
      themeId: normalizedThemeId,
      reason: null
    };
  } catch {
    perfTrace.end('error', {
      reason: 'template_load_failed'
    });
    return {
      resolved: null,
      componentId: normalizedComponentId,
      themeId: normalizedThemeId,
      reason: 'template_load_failed'
    };
  }
}

function reportMissingThemeCodeTemplate({
  reason,
  componentId,
  themeId,
  moduleId
}: {
  reason: ThemeCodeTemplateResolveFailureReason | null;
  componentId: string | null;
  themeId: string | null;
  moduleId: string | null;
}) {
  if (process.env.NODE_ENV !== 'development' || !reason) {
    return;
  }

  console.error(
    `[theme-code-template] template_not_found` +
      ` reason="${reason}"` +
      ` componentId="${componentId ?? 'unknown'}"` +
      ` themeId="${themeId ?? 'none'}"` +
      ` moduleId="${moduleId ?? 'none'}"`
  );
}

function resolveModuleCodeRegistryEntry(
  moduleId: string | null | undefined
): ModuleCodeRegistryEntry | null {
  const normalizedModuleId = normalizeId(moduleId);
  if (!normalizedModuleId) {
    return null;
  }

  return MODULE_CODE_TEMPLATE_REGISTRY[normalizedModuleId] ?? null;
}

async function loadModuleTemplateComponent({
  registryEntry,
  componentId
}: {
  registryEntry: ModuleCodeRegistryEntry;
  componentId: string;
}) {
  const templateLoader = registryEntry.templates[componentId];
  if (!templateLoader) {
    return null;
  }

  const cacheKey = `${registryEntry.moduleId}::${componentId}`;
  const cached = loadedModuleTemplateComponents.get(cacheKey);
  if (cached) {
    return cached;
  }

  const templateModule = await templateLoader();
  const templateComponent = templateModule.default as ThemeTemplateComponent;
  loadedModuleTemplateComponents.set(cacheKey, templateComponent);
  return templateComponent;
}

async function renderModuleCodeTemplate({
  moduleId,
  templateId,
  data,
  className,
  themeId,
  children
}: {
  moduleId: string;
  templateId: string;
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
}) {
  const registryEntry = resolveModuleCodeRegistryEntry(moduleId);
  if (!registryEntry) {
    throw new Error(
      `[theme-code-template] Missing module code template registry ` +
        `moduleId="${moduleId}" componentId="${templateId}".`
    );
  }

  let component: ThemeTemplateComponent | null = null;
  try {
    component = await loadModuleTemplateComponent({
      registryEntry,
      componentId: templateId
    });
  } catch {
    throw new Error(
      `[theme-code-template] Failed loading module code template ` +
        `moduleId="${moduleId}" componentId="${templateId}".`
    );
  }

  if (!component) {
    throw new Error(
      `[theme-code-template] Missing module code template ` +
        `moduleId="${moduleId}" componentId="${templateId}".`
    );
  }

  const ModuleComponent = component;
  return (
    <ModuleComponent data={data} className={className} themeId={themeId}>
      {children}
    </ModuleComponent>
  );
}

/**
 * ThemeCodeTemplate - Renders themed templates with explicit theme resolution.
 *
 * Usage:
 * ```tsx
 * // With explicit themeId
 * <ThemeCodeTemplate id="page.admin.products" themeId="theme.first.backoffice">
 *   <Content />
 * </ThemeCodeTemplate>
 * ```
 *
 * Note: This is an async component to support React Server Components.
 */
export async function ThemeCodeTemplate<TId extends string>({
  id,
  themeId,
  moduleId,
  data,
  className,
  children,
  fallback
}: {
  id: TId;
  themeId?: string | null;
  moduleId?: string | null;
  data?: TemplateDataForId<TId>;
  className?: string;
  children?: ReactNode;
  fallback?: ReactNode;
}) {
  const resolvedThemeId = resolveThemeId(themeId);

  return resolveTemplate({
    id,
    themeId: resolvedThemeId,
    moduleId,
    data,
    className,
    children,
    fallback
  });
}
