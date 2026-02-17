import type { ComponentType, ReactNode } from 'react';
import {
  THEME_CODE_REGISTRY,
  type CodeRegistryThemeEntry
} from '@/lib/themes/code-registry.generated';

type ThemeProviderComponent = ComponentType<{ children: ReactNode }>;
type ThemeTemplateComponent<TData = unknown> = ComponentType<{
  data?: TData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
}>;

type ResolvedThemeCodeTemplate<TData = unknown> = {
  Component: ThemeTemplateComponent<TData>;
  Provider: ThemeProviderComponent | null;
};

type ThemeCodeTemplateResolveFailureReason =
  | 'invalid_component_id'
  | 'missing_theme_id'
  | 'theme_not_registered'
  | 'template_not_registered'
  | 'template_load_failed';

type ThemeCodeTemplateResolution<TData = unknown> = {
  resolved: ResolvedThemeCodeTemplate<TData> | null;
  componentId: string | null;
  themeId: string | null;
  reason: ThemeCodeTemplateResolveFailureReason | null;
};

const loadedTemplateComponents = new Map<string, ThemeTemplateComponent>();
const loadedProviderComponents = new Map<string, ThemeProviderComponent | null>();

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

async function resolveThemeCodeTemplate<TData>({
  themeId,
  componentId
}: {
  themeId: string | null | undefined;
  componentId: string;
}): Promise<ThemeCodeTemplateResolution<TData>> {
  const normalizedComponentId = normalizeId(componentId);
  if (!normalizedComponentId) {
    return {
      resolved: null,
      componentId: null,
      themeId: normalizeId(themeId),
      reason: 'invalid_component_id'
    };
  }

  const normalizedThemeId = normalizeId(themeId);
  if (!normalizedThemeId) {
    return {
      resolved: null,
      componentId: normalizedComponentId,
      themeId: null,
      reason: 'missing_theme_id'
    };
  }

  const registryEntry = resolveRegistryEntry(normalizedThemeId);
  if (!registryEntry) {
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

    if (!Component) {
      return {
        resolved: null,
        componentId: normalizedComponentId,
        themeId: normalizedThemeId,
        reason: 'template_not_registered'
      };
    }

    return {
      resolved: {
        Component: Component as ThemeTemplateComponent<TData>,
        Provider
      },
      componentId: normalizedComponentId,
      themeId: normalizedThemeId,
      reason: null
    };
  } catch {
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
  themeId
}: {
  reason: ThemeCodeTemplateResolveFailureReason | null;
  componentId: string | null;
  themeId: string | null;
}) {
  if (process.env.NODE_ENV !== 'development' || !reason) {
    return;
  }

  console.error(
    `[theme-code-template] template_not_found` +
      ` reason="${reason}"` +
      ` componentId="${componentId ?? 'unknown'}"` +
      ` themeId="${themeId ?? 'none'}"`
  );
}

export async function ThemeCodeTemplate<TData>({
  id,
  themeId,
  data,
  className,
  children,
  fallback
}: {
  id: string;
  themeId: string | null | undefined;
  data?: TData;
  className?: string;
  children?: ReactNode;
  fallback: ReactNode;
}) {
  const resolved = await resolveThemeCodeTemplate<TData>({
    themeId,
    componentId: id
  });

  if (!resolved.resolved) {
    reportMissingThemeCodeTemplate({
      reason: resolved.reason,
      componentId: resolved.componentId,
      themeId: resolved.themeId
    });
    return <>{fallback}</>;
  }

  const renderedTemplate = (
    <resolved.resolved.Component
      data={data}
      className={className}
      themeId={normalizeId(themeId) ?? undefined}
    >
      {children}
    </resolved.resolved.Component>
  );

  if (resolved.resolved.Provider) {
    return <resolved.resolved.Provider>{renderedTemplate}</resolved.resolved.Provider>;
  }

  return renderedTemplate;
}
