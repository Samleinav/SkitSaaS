'use client';

import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useState
} from 'react';
import {
  THEME_CODE_REGISTRY,
  type CodeRegistryThemeEntry
} from '@/lib/themes/code-registry.generated';

export type ThemeTemplateProps<TData = unknown> = {
  id: string;
  data?: TData;
  fallback?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type ResolvedTemplate = {
  Component: ComponentType<any>;
  Provider: ComponentType<{ children: ReactNode }> | null;
};

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

function normalizeId(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getRegistryEntry(
  themeId: string | null | undefined
): CodeRegistryThemeEntry | null {
  const normalizedThemeId = normalizeId(themeId);
  if (!normalizedThemeId) {
    return null;
  }

  return THEME_CODE_REGISTRY[normalizedThemeId] ?? null;
}

const loadedTemplates = new Map<string, ComponentType<any>>();
const loadedProviders = new Map<
  string,
  ComponentType<{ children: ReactNode }> | null
>();

async function loadTemplate(
  entry: CodeRegistryThemeEntry,
  componentId: string
): Promise<ResolvedTemplate | null> {
  const templateLoader = entry.templates[componentId];
  if (!templateLoader) {
    return null;
  }

  const cacheKey = `${entry.themeId}::${componentId}`;
  let Component = loadedTemplates.get(cacheKey);
  if (!Component) {
    const mod = await templateLoader();
    Component = mod.default;
    loadedTemplates.set(cacheKey, Component);
  }

  let Provider = loadedProviders.get(entry.themeId);
  if (Provider === undefined) {
    if (entry.providerImport) {
      const providerModule = await entry.providerImport();
      Provider = providerModule.default;
    } else {
      Provider = null;
    }
    loadedProviders.set(entry.themeId, Provider);
  }

  return { Component, Provider };
}

function ThemeTemplateLoader<TData>({
  registryEntry,
  id,
  data,
  fallback,
  className,
  children
}: {
  registryEntry: CodeRegistryThemeEntry;
  id: string;
  data?: TData;
  fallback?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const [resolved, setResolved] = useState<ResolvedTemplate | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    setState('loading');

    loadTemplate(registryEntry, id)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (!result) {
          setState('missing');
          return;
        }

        setResolved(result);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [registryEntry, id]);

  if (state !== 'ready' || !resolved) {
    return <>{fallback ?? children ?? null}</>;
  }

  const { Component, Provider } = resolved;
  const rendered = (
    <Component data={data} className={className} themeId={registryEntry.themeId}>
      {children}
    </Component>
  );

  if (Provider) {
    return <Provider>{rendered}</Provider>;
  }

  return rendered;
}

export function ThemeTemplate<TData = unknown>({
  id,
  data,
  fallback,
  className,
  themeId,
  children
}: ThemeTemplateProps<TData> & { themeId?: string | null }) {
  const normalizedTemplateId = normalizeId(id);
  if (!normalizedTemplateId) {
    return <>{fallback ?? children ?? null}</>;
  }

  const entry = getRegistryEntry(themeId);
  if (!entry) {
    return <>{fallback ?? children ?? null}</>;
  }

  if (!(normalizedTemplateId in entry.templates)) {
    return <>{fallback ?? children ?? null}</>;
  }

  return (
    <ThemeTemplateLoader
      registryEntry={entry}
      id={normalizedTemplateId}
      data={data}
      fallback={fallback}
      className={className}
    >
      {children}
    </ThemeTemplateLoader>
  );
}
