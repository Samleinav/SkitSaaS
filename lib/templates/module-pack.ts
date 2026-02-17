import type { ModuleManifest, ModuleTemplatePackEntry } from '@/lib/modules/manifest';
import type { TemplateController, TemplateEntry } from '@/lib/templates/controller';

const PASSTHROUGH_TEMPLATE_ERROR = '__template_passthrough__';

type NormalizedModuleTemplatePackEntry = {
  componentId: string;
  templateId: string;
  description?: string;
  lockTemplate: boolean;
  payload?: Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function passthroughTemplateRender(): never {
  throw new Error(PASSTHROUGH_TEMPLATE_ERROR);
}

function normalizeEntry({
  moduleId,
  kind,
  entry,
  index
}: {
  moduleId: string;
  kind: 'defaults' | 'overrides';
  entry: ModuleTemplatePackEntry;
  index: number;
}): NormalizedModuleTemplatePackEntry {
  const componentId = String(entry.componentId ?? '')
    .trim()
    .toLowerCase();
  if (!componentId) {
    throw new Error(
      `[template-module-pack] ${moduleId} templatePack.${kind}[${index}] requires componentId.`
    );
  }

  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(componentId)) {
    throw new Error(
      `[template-module-pack] ${moduleId} templatePack.${kind}[${index}] has invalid componentId="${String(entry.componentId ?? '')}".`
    );
  }

  const payload = entry.payload;
  if (payload !== undefined && !isObject(payload)) {
    throw new Error(
      `[template-module-pack] ${moduleId} templatePack.${kind}[${index}] payload must be an object.`
    );
  }

  const templateIdRaw = String(entry.templateId ?? '')
    .trim()
    .toLowerCase();
  const templateId = templateIdRaw || `${moduleId}.${kind}.${componentId}`;
  const description =
    typeof entry.description === 'string' && entry.description.trim().length > 0
      ? entry.description.trim()
      : undefined;

  return {
    componentId,
    templateId,
    description,
    lockTemplate: entry.lockTemplate === true,
    payload: payload as Record<string, unknown> | undefined
  };
}

function normalizeEntries({
  moduleId,
  kind,
  entries
}: {
  moduleId: string;
  kind: 'defaults' | 'overrides';
  entries: ModuleTemplatePackEntry[] | undefined;
}) {
  if (!entries?.length) {
    return [] as NormalizedModuleTemplatePackEntry[];
  }

  const normalized = entries.map((entry, index) =>
    normalizeEntry({
      moduleId,
      kind,
      entry,
      index
    })
  );

  const seenComponentIds = new Set<string>();
  for (const entry of normalized) {
    if (seenComponentIds.has(entry.componentId)) {
      throw new Error(
        `[template-module-pack] ${moduleId} templatePack.${kind} duplicates componentId="${entry.componentId}".`
      );
    }

    seenComponentIds.add(entry.componentId);
  }

  return normalized;
}

function toTemplateEntries(entries: NormalizedModuleTemplatePackEntry[]): TemplateEntry[] {
  return entries.map((entry) => ({
    componentId: entry.componentId,
    templateId: entry.templateId,
    description: entry.description,
    lockTemplate: entry.lockTemplate,
    payload: entry.payload,
    render: passthroughTemplateRender
  }));
}

export function registerModuleTemplatesFromManifest({
  controller,
  manifest,
  replace = true
}: {
  controller: TemplateController;
  manifest: ModuleManifest;
  replace?: boolean;
}) {
  const moduleId = manifest.moduleId;
  const pack = manifest.templatePack;
  if (!pack) {
    return {
      moduleId,
      registered: 0
    };
  }

  const defaults = normalizeEntries({
    moduleId,
    kind: 'defaults',
    entries: pack.defaults
  });
  const overrides = normalizeEntries({
    moduleId,
    kind: 'overrides',
    entries: pack.overrides
  });

  let registered = 0;
  if (defaults.length > 0) {
    registered += controller.registerModuleTemplates(
      moduleId,
      toTemplateEntries(defaults),
      {
        kind: 'default',
        replace,
        contractRange: pack.contractRange
      }
    );
  }

  if (overrides.length > 0) {
    registered += controller.registerModuleTemplates(
      moduleId,
      toTemplateEntries(overrides),
      {
        kind: 'override',
        replace,
        contractRange: pack.contractRange
      }
    );
  }

  return {
    moduleId,
    registered
  };
}
