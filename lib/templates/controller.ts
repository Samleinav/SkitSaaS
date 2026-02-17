import type { ReactNode } from 'react';
import {
  isTemplateComponentIdFormatValid,
  isTemplateComponentLockable
} from '@/lib/templates/catalog';
import {
  TEMPLATE_CONTRACT_VERSION,
  resolveTemplateContractCompatibility
} from '@/lib/templates/contract';

export type TemplateArea = 'admin' | 'dashboard' | 'frontend' | 'global';

export type TemplateResolverContext = {
  area: TemplateArea;
  themeId?: string | null;
  moduleId?: string | null;
  route?: string | null;
  data?: unknown;
  flags?: {
    adminForceOverride?: boolean;
    templatePriority?: 'theme' | 'module';
  };
};

export type TemplateRenderContext = {
  componentId: string;
  area: TemplateArea;
  themeId: string | null;
  moduleId: string | null;
  route: string | null;
  data?: unknown;
  flags: {
    adminForceOverride: boolean;
    templatePriority: 'theme' | 'module';
  };
};

export type TemplateRenderer = (context: TemplateRenderContext) => ReactNode;

export type TemplateEntry = {
  componentId: string;
  render: TemplateRenderer;
  templateId?: string;
  description?: string;
  lockTemplate?: boolean;
  payload?: Record<string, unknown>;
};

export type TemplateResolutionSource =
  | 'module_override'
  | 'theme_area_override'
  | 'theme_global_override'
  | 'module_default'
  | 'core_default'
  | 'fallback';

export type TemplateResolutionTrace = {
  componentId: string;
  area: TemplateArea;
  themeId: string | null;
  moduleId: string | null;
  route: string | null;
  source: TemplateResolutionSource;
  templateId: string | null;
  lockTemplate: boolean;
  adminForceOverride: boolean;
  templatePriority: 'theme' | 'module';
};

export type TemplateResolution = {
  source: TemplateResolutionSource;
  entry: TemplateEntry | null;
  trace: TemplateResolutionTrace;
};

type RegisterThemeTemplatesOptions = {
  area?: TemplateArea;
  replace?: boolean;
  contractRange?: string;
};

type RegisterModuleTemplatesOptions = {
  kind?: 'default' | 'override';
  replace?: boolean;
  contractRange?: string;
};

type RegisterTemplatesOptions = {
  replace?: boolean;
  contractRange?: string;
};

type CreateTemplateControllerOptions = {
  contractVersion?: string;
  traceLimit?: number;
  onTrace?: (trace: TemplateResolutionTrace) => void;
  coreTemplates?: TemplateEntry[];
};

export type TemplateController = {
  registerCoreTemplates: (
    entries: TemplateEntry[],
    options?: RegisterTemplatesOptions
  ) => number;
  registerThemeTemplates: (
    themeId: string,
    entries: TemplateEntry[],
    options?: RegisterThemeTemplatesOptions
  ) => number;
  registerModuleTemplates: (
    moduleId: string,
    entries: TemplateEntry[],
    options?: RegisterModuleTemplatesOptions
  ) => number;
  resolveTemplate: (
    componentId: string,
    context: TemplateResolverContext
  ) => TemplateResolution;
  renderWithTemplate: (
    componentId: string,
    context: TemplateResolverContext,
    fallbackRender: (context: TemplateRenderContext) => ReactNode
  ) => ReactNode;
  getResolutionTraces: () => TemplateResolutionTrace[];
  clearResolutionTraces: () => void;
};

function normalizeId(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeComponentId(value: string) {
  return value.trim().toLowerCase();
}

function normalizeArea(area: string | null | undefined): TemplateArea {
  const normalized = String(area ?? '').trim().toLowerCase();
  if (
    normalized === 'admin' ||
    normalized === 'dashboard' ||
    normalized === 'frontend' ||
    normalized === 'global'
  ) {
    return normalized;
  }

  return 'global';
}

function normalizeEntry(entry: TemplateEntry): TemplateEntry {
  const componentId = normalizeComponentId(entry.componentId);
  if (!componentId || !isTemplateComponentIdFormatValid(componentId)) {
    throw new Error(
      `[template-controller] Invalid componentId "${entry.componentId}". Use dot.case or kebab segments (example: "ui.alert-dialog").`
    );
  }

  if (typeof entry.render !== 'function') {
    throw new Error(
      `[template-controller] componentId="${componentId}" requires a render function.`
    );
  }

  if (entry.lockTemplate && !isTemplateComponentLockable(componentId)) {
    throw new Error(
      `[template-controller] componentId="${componentId}" is not lockable by policy.`
    );
  }

  return {
    ...entry,
    componentId,
    templateId: normalizeId(entry.templateId) ?? componentId,
    lockTemplate: entry.lockTemplate === true
  };
}

function toRenderContext(
  componentId: string,
  context: TemplateResolverContext
): TemplateRenderContext {
  const area = normalizeArea(context.area);
  const themeId = normalizeId(context.themeId);
  const moduleId = normalizeId(context.moduleId);
  const route = normalizeId(context.route);
  const adminForceOverride = context.flags?.adminForceOverride === true;
  const templatePriority =
    context.flags?.templatePriority === 'module' ? 'module' : 'theme';

  return {
    componentId: normalizeComponentId(componentId),
    area,
    themeId,
    moduleId,
    route,
    data: context.data,
    flags: {
      adminForceOverride,
      templatePriority
    }
  };
}

function assertContractCompatibility({
  contractVersion,
  contractRange,
  owner
}: {
  contractVersion: string;
  contractRange: string | undefined;
  owner: string;
}) {
  if (!contractRange) {
    return;
  }

  const compatibility = resolveTemplateContractCompatibility(
    contractRange,
    contractVersion
  );
  if (compatibility === 'compatible') {
    return;
  }

  if (compatibility === 'incompatible') {
    throw new Error(
      `[template-controller] ${owner} contractRange="${contractRange}" is incompatible with host contract ${contractVersion}.`
    );
  }

  throw new Error(
    `[template-controller] ${owner} contractRange="${contractRange}" is invalid.`
  );
}

function upsertTemplates({
  target,
  entries,
  replace = true
}: {
  target: Map<string, TemplateEntry>;
  entries: TemplateEntry[];
  replace?: boolean;
}) {
  let count = 0;
  for (const rawEntry of entries) {
    const entry = normalizeEntry(rawEntry);
    if (!replace && target.has(entry.componentId)) {
      continue;
    }

    target.set(entry.componentId, entry);
    count += 1;
  }

  return count;
}

export function createTemplateController(
  options: CreateTemplateControllerOptions = {}
): TemplateController {
  const contractVersion = normalizeId(options.contractVersion) ?? TEMPLATE_CONTRACT_VERSION;
  const traceLimit = Number.isInteger(options.traceLimit)
    ? Math.max(0, Number(options.traceLimit))
    : 200;
  const onTrace =
    typeof options.onTrace === 'function' ? options.onTrace : null;

  const coreTemplates = new Map<string, TemplateEntry>();
  const themeTemplates = new Map<
    string,
    Map<TemplateArea, Map<string, TemplateEntry>>
  >();
  const moduleDefaultTemplates = new Map<string, Map<string, TemplateEntry>>();
  const moduleOverrideTemplates = new Map<string, Map<string, TemplateEntry>>();
  const traces: TemplateResolutionTrace[] = [];

  function recordTrace(trace: TemplateResolutionTrace) {
    if (traceLimit > 0) {
      traces.push(trace);
      if (traces.length > traceLimit) {
        traces.shift();
      }
    }

    onTrace?.(trace);
  }

  function getThemeAreaTemplates(themeId: string, area: TemplateArea) {
    const byArea = themeTemplates.get(themeId);
    if (!byArea) {
      return null;
    }

    return byArea.get(area) ?? null;
  }

  function getModuleTemplateMap(
    moduleId: string,
    kind: 'default' | 'override'
  ) {
    const store =
      kind === 'override' ? moduleOverrideTemplates : moduleDefaultTemplates;
    const existing = store.get(moduleId);
    if (existing) {
      return existing;
    }

    const created = new Map<string, TemplateEntry>();
    store.set(moduleId, created);
    return created;
  }

  function resolveTemplate(
    componentId: string,
    context: TemplateResolverContext
  ): TemplateResolution {
    const renderContext = toRenderContext(componentId, context);
    const normalizedComponentId = renderContext.componentId;

    const moduleOverride = renderContext.moduleId
      ? moduleOverrideTemplates
          .get(renderContext.moduleId)
          ?.get(normalizedComponentId) ?? null
      : null;
    const moduleDefault = renderContext.moduleId
      ? moduleDefaultTemplates
          .get(renderContext.moduleId)
          ?.get(normalizedComponentId) ?? null
      : null;

    const lockTemplate = Boolean(
      moduleOverride?.lockTemplate || moduleDefault?.lockTemplate
    );

    const makeResolution = (
      source: TemplateResolutionSource,
      entry: TemplateEntry | null
    ): TemplateResolution => {
      const trace: TemplateResolutionTrace = {
        componentId: normalizedComponentId,
        area: renderContext.area,
        themeId: renderContext.themeId,
        moduleId: renderContext.moduleId,
        route: renderContext.route,
        source,
        templateId: entry?.templateId ?? null,
        lockTemplate,
        adminForceOverride: renderContext.flags.adminForceOverride,
        templatePriority: renderContext.flags.templatePriority
      };
      recordTrace(trace);
      return {
        source,
        entry,
        trace
      };
    };

    if (moduleOverride) {
      return makeResolution('module_override', moduleOverride);
    }

    if (lockTemplate && !renderContext.flags.adminForceOverride) {
      if (moduleDefault) {
        return makeResolution('module_default', moduleDefault);
      }

      const coreDefault = coreTemplates.get(normalizedComponentId) ?? null;
      if (coreDefault) {
        return makeResolution('core_default', coreDefault);
      }

      return makeResolution('fallback', null);
    }

    const resolveThemeEntry = () => {
      if (!renderContext.themeId) {
        return null;
      }

      const areaThemeEntry =
        getThemeAreaTemplates(renderContext.themeId, renderContext.area)?.get(
          normalizedComponentId
        ) ?? null;
      if (areaThemeEntry) {
        return makeResolution('theme_area_override', areaThemeEntry);
      }

      const globalThemeEntry =
        getThemeAreaTemplates(renderContext.themeId, 'global')?.get(
          normalizedComponentId
        ) ?? null;
      if (globalThemeEntry) {
        return makeResolution('theme_global_override', globalThemeEntry);
      }

      return null;
    };

    if (renderContext.flags.templatePriority === 'module') {
      if (moduleDefault) {
        return makeResolution('module_default', moduleDefault);
      }

      const themedResolution = resolveThemeEntry();
      if (themedResolution) {
        return themedResolution;
      }
    } else {
      const themedResolution = resolveThemeEntry();
      if (themedResolution) {
        return themedResolution;
      }

      if (moduleDefault) {
        return makeResolution('module_default', moduleDefault);
      }
    }

    const coreDefault = coreTemplates.get(normalizedComponentId) ?? null;
    if (coreDefault) {
      return makeResolution('core_default', coreDefault);
    }

    return makeResolution('fallback', null);
  }

  function renderWithTemplate(
    componentId: string,
    context: TemplateResolverContext,
    fallbackRender: (context: TemplateRenderContext) => ReactNode
  ) {
    const renderContext = toRenderContext(componentId, context);
    const resolution = resolveTemplate(componentId, context);
    if (!resolution.entry) {
      return fallbackRender(renderContext);
    }

    try {
      return resolution.entry.render(renderContext);
    } catch {
      return fallbackRender(renderContext);
    }
  }

  const controller: TemplateController = {
    registerCoreTemplates(entries, registrationOptions = {}) {
      assertContractCompatibility({
        contractVersion,
        contractRange: registrationOptions.contractRange,
        owner: 'core templates'
      });

      return upsertTemplates({
        target: coreTemplates,
        entries,
        replace: registrationOptions.replace ?? true
      });
    },
    registerThemeTemplates(themeId, entries, registrationOptions = {}) {
      const normalizedThemeId = normalizeId(themeId);
      if (!normalizedThemeId) {
        throw new Error('[template-controller] Theme id is required.');
      }

      assertContractCompatibility({
        contractVersion,
        contractRange: registrationOptions.contractRange,
        owner: `theme "${normalizedThemeId}"`
      });

      const area = normalizeArea(registrationOptions.area ?? 'global');
      const byArea =
        themeTemplates.get(normalizedThemeId) ?? new Map<TemplateArea, Map<string, TemplateEntry>>();
      themeTemplates.set(normalizedThemeId, byArea);

      const templates = byArea.get(area) ?? new Map<string, TemplateEntry>();
      byArea.set(area, templates);

      return upsertTemplates({
        target: templates,
        entries,
        replace: registrationOptions.replace ?? true
      });
    },
    registerModuleTemplates(moduleId, entries, registrationOptions = {}) {
      const normalizedModuleId = normalizeId(moduleId);
      if (!normalizedModuleId) {
        throw new Error('[template-controller] Module id is required.');
      }

      assertContractCompatibility({
        contractVersion,
        contractRange: registrationOptions.contractRange,
        owner: `module "${normalizedModuleId}"`
      });

      const kind = registrationOptions.kind ?? 'default';
      const target = getModuleTemplateMap(normalizedModuleId, kind);

      return upsertTemplates({
        target,
        entries,
        replace: registrationOptions.replace ?? true
      });
    },
    resolveTemplate,
    renderWithTemplate,
    getResolutionTraces() {
      return [...traces];
    },
    clearResolutionTraces() {
      traces.length = 0;
    }
  };

  if (options.coreTemplates?.length) {
    controller.registerCoreTemplates(options.coreTemplates);
  }

  return controller;
}
