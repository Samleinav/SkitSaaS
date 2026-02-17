import fs from 'node:fs';
import path from 'node:path';
import type { ThemeArea } from '@/lib/theme';
import type { ExternalThemePack } from '@/lib/themes/external.generated';
import { EXTERNAL_THEME_PACKS } from '@/lib/themes/external.generated';
import { resolveExternalThemePackBySelection } from '@/lib/themes/runtime';
import {
  isTemplateComponentIdFormatValid,
  isTemplateComponentLockable
} from '@/lib/templates/catalog';
import type {
  TemplateArea,
  TemplateController,
  TemplateEntry
} from '@/lib/templates/controller';

type ThemeTemplatePackTemplateEntry = {
  componentId: string;
  templateId?: string;
  description?: string;
  payload?: Record<string, unknown>;
};

type ThemeTemplatePackManifest = {
  contractRange?: string;
  templates?: Partial<Record<TemplateArea, ThemeTemplatePackTemplateEntry[]>>;
};

type NormalizedThemeTemplatePackEntry = {
  componentId: string;
  templateId: string;
  description?: string;
  payload?: Record<string, unknown>;
};

type NormalizedThemeTemplatePackManifest = {
  contractRange?: string;
  templates: Partial<Record<TemplateArea, NormalizedThemeTemplatePackEntry[]>>;
};

const THEME_TEMPLATE_PACK_AREAS = new Set<TemplateArea>([
  'admin',
  'dashboard',
  'frontend',
  'global'
]);

const PASSTHROUGH_TEMPLATE_ERROR = '__template_passthrough__';
const templatePackCache = new Map<string, NormalizedThemeTemplatePackManifest | null>();

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeArea(area: string | null | undefined): TemplateArea | null {
  const normalized = String(area ?? '').trim().toLowerCase();
  if (THEME_TEMPLATE_PACK_AREAS.has(normalized as TemplateArea)) {
    return normalized as TemplateArea;
  }

  return null;
}

function normalizePayload(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!isObject(value)) {
    throw new Error(
      '[template-theme-pack] payload must be an object when provided.'
    );
  }

  return value;
}

function normalizeTemplateEntry({
  entry,
  area,
  index
}: {
  entry: unknown;
  area: TemplateArea;
  index: number;
}): NormalizedThemeTemplatePackEntry {
  if (!isObject(entry)) {
    throw new Error(
      `[template-theme-pack] templates.${area}[${index}] must be an object.`
    );
  }

  const componentId = String(entry.componentId ?? '')
    .trim()
    .toLowerCase();
  if (!componentId || !isTemplateComponentIdFormatValid(componentId)) {
    throw new Error(
      `[template-theme-pack] templates.${area}[${index}] has invalid componentId="${String(entry.componentId ?? '')}".`
    );
  }

  if (entry.lockTemplate === true && !isTemplateComponentLockable(componentId)) {
    throw new Error(
      `[template-theme-pack] componentId="${componentId}" cannot use lockTemplate in theme templates.`
    );
  }

  const templateIdRaw = String(entry.templateId ?? '')
    .trim()
    .toLowerCase();
  const templateId = templateIdRaw || `${area}.${componentId}`;
  const description =
    typeof entry.description === 'string' && entry.description.trim().length > 0
      ? entry.description.trim()
      : undefined;

  return {
    componentId,
    templateId,
    description,
    payload: normalizePayload(entry.payload)
  };
}

function normalizeThemeTemplatePackManifest(
  raw: unknown
): NormalizedThemeTemplatePackManifest {
  if (!isObject(raw)) {
    throw new Error('[template-theme-pack] manifest must be an object.');
  }

  const contractRange =
    typeof raw.contractRange === 'string' && raw.contractRange.trim().length > 0
      ? raw.contractRange.trim()
      : undefined;

  const templatesRaw = raw.templates;
  if (templatesRaw === undefined) {
    return {
      contractRange,
      templates: {}
    };
  }

  if (!isObject(templatesRaw)) {
    throw new Error('[template-theme-pack] templates must be an object.');
  }

  const normalizedTemplates: Partial<
    Record<TemplateArea, NormalizedThemeTemplatePackEntry[]>
  > = {};

  for (const [rawArea, rawEntries] of Object.entries(templatesRaw)) {
    const area = normalizeArea(rawArea);
    if (!area) {
      throw new Error(
        `[template-theme-pack] templates.${rawArea} is invalid. Use admin, dashboard, frontend, or global.`
      );
    }

    if (!Array.isArray(rawEntries)) {
      throw new Error(
        `[template-theme-pack] templates.${area} must be an array.`
      );
    }

    const entries = rawEntries.map((entry, index) =>
      normalizeTemplateEntry({
        entry,
        area,
        index
      })
    );

    const seenComponentIds = new Set<string>();
    for (const entry of entries) {
      if (seenComponentIds.has(entry.componentId)) {
        throw new Error(
          `[template-theme-pack] templates.${area} duplicates componentId="${entry.componentId}".`
        );
      }

      seenComponentIds.add(entry.componentId);
    }

    normalizedTemplates[area] = entries;
  }

  return {
    contractRange,
    templates: normalizedTemplates
  };
}

function readThemeTemplateManifestFile({
  entryTemplatesPath,
  rootDir
}: {
  entryTemplatesPath: string;
  rootDir: string;
}) {
  const absolutePath = path.join(rootDir, entryTemplatesPath);
  if (templatePackCache.has(absolutePath)) {
    return templatePackCache.get(absolutePath) ?? null;
  }

  if (!fs.existsSync(absolutePath)) {
    templatePackCache.set(absolutePath, null);
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const normalized = normalizeThemeTemplatePackManifest(raw);
    templatePackCache.set(absolutePath, normalized);
    return normalized;
  } catch (error) {
    templatePackCache.set(absolutePath, null);
    throw error;
  }
}

function passthroughTemplateRender() {
  throw new Error(PASSTHROUGH_TEMPLATE_ERROR);
}

function toTemplateEntries(entries: NormalizedThemeTemplatePackEntry[]): TemplateEntry[] {
  return entries.map((entry) => ({
    componentId: entry.componentId,
    templateId: entry.templateId,
    description: entry.description,
    render: passthroughTemplateRender,
    payload: entry.payload
  })) as TemplateEntry[];
}

type RegisterThemeTemplatesFromSelectionOptions = {
  controller: TemplateController;
  themeId: string | null | undefined;
  area: ThemeArea;
  packs?: ExternalThemePack[];
  rootDir?: string;
  replace?: boolean;
};

export function registerThemeTemplatesFromSelection({
  controller,
  themeId,
  area,
  packs = EXTERNAL_THEME_PACKS,
  rootDir,
  replace = true
}: RegisterThemeTemplatesFromSelectionOptions) {
  const selectedPack = resolveExternalThemePackBySelection({
    themeId,
    area,
    packs
  });
  if (!selectedPack?.entryTemplatesPath) {
    return {
      themeId: selectedPack?.themeId ?? null,
      registered: 0
    };
  }

  const manifest = readThemeTemplateManifestFile({
    entryTemplatesPath: selectedPack.entryTemplatesPath,
    rootDir: rootDir ?? process.cwd()
  });
  if (!manifest) {
    return {
      themeId: selectedPack.themeId,
      registered: 0
    };
  }

  const normalizedArea = area === 'public' ? 'frontend' : area;
  const areaEntries = manifest.templates[normalizedArea];
  const globalEntries = manifest.templates.global;

  let registered = 0;
  if (Array.isArray(globalEntries) && globalEntries.length > 0) {
    registered += controller.registerThemeTemplates(
      selectedPack.themeId,
      toTemplateEntries(globalEntries),
      {
        area: 'global',
        replace,
        contractRange: manifest.contractRange
      }
    );
  }

  if (Array.isArray(areaEntries) && areaEntries.length > 0) {
    registered += controller.registerThemeTemplates(
      selectedPack.themeId,
      toTemplateEntries(areaEntries),
      {
        area: normalizedArea,
        replace,
        contractRange: manifest.contractRange
      }
    );
  }

  return {
    themeId: selectedPack.themeId,
    registered
  };
}
