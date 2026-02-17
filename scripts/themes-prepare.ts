import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  THEME_RUNTIME_CONTRACT_VERSION,
  validateThemePackManifest,
  type ThemePackManifest
} from '../lib/themes/manifest';
import {
  BACKOFFICE_BASELINE_THEME_ID,
  BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS,
  BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA
} from '../lib/themes/required-code-templates';
import { isSemverRangeSatisfied } from './modules-prepare';

type ThemePrepareErrorCode =
  | 'theme_json_parse_failed'
  | 'theme_manifest_invalid'
  | 'theme_tokens_missing'
  | 'theme_templates_missing'
  | 'theme_assets_missing'
  | 'theme_id_duplicate'
  | 'theme_range_invalid'
  | 'theme_selection_missing'
  | 'theme_selection_incompatible'
  | 'theme_frontend_routes_missing'
  | 'theme_required_template_missing'
  | 'theme_baseline_missing';

type ThemePrepareError = {
  code: ThemePrepareErrorCode;
  themeDir: string;
  message: string;
};

export type CodeTemplateEntry = {
  componentId: string;
  filePath: string;
};

export type ResolvedThemePack = {
  themeId: string;
  version: string;
  areas: ThemePackManifest['areas'];
  mode: ThemePackManifest['mode'];
  themeRange: string;
  packDir: string;
  entryTokensPath: string;
  entryTemplatesPath: string | null;
  entryAssetsPath: string | null;
  manifest: ThemePackManifest;
  themeCompatible: boolean | null;
  codeTemplates: CodeTemplateEntry[];
  hasThemeConfig: boolean;
  themeConfigImportPath: string | null;
  hasFrontendRoutes: boolean;
  frontendRoutesImportPath: string | null;
};

export type ThemesPrepareOptions = {
  rootDir?: string;
  themesDir?: string;
  hostThemeVersion?: string;
  strictCompatibility?: boolean;
  logWarnings?: boolean;
};

export type ThemesPrepareResult = {
  rootDir: string;
  themesDir: string | null;
  hostThemeVersion: string;
  strictCompatibility: boolean;
  outputPath: string;
  selectionOutputPath: string;
  warnings: string[];
  errors: ThemePrepareError[];
  compatibilityErrors: string[];
  resolvedThemePacks: ResolvedThemePack[];
  selectedThemesByArea: Record<'admin' | 'dashboard' | 'frontend', string>;
  templatePriority: 'theme' | 'module';
};

type ThemeSelectionArea = 'admin' | 'dashboard' | 'frontend';
type ThemeSelectionSource = 'env' | 'legacy_env' | 'default';

type ResolvedThemeSelection = {
  area: ThemeSelectionArea;
  themeId: string;
  source: ThemeSelectionSource;
  envKey: string;
  legacyEnvKey: string | null;
};

const THEME_SELECTION_AREAS: readonly ThemeSelectionArea[] = [
  'admin',
  'dashboard',
  'frontend'
];

const THEME_SELECTION_DEFAULTS: Record<ThemeSelectionArea, string> = {
  admin: 'theme.first.backoffice',
  dashboard: 'theme.first.backoffice',
  frontend: 'theme.first.frontend'
};

const THEME_SELECTION_ENV_KEYS: Record<
  ThemeSelectionArea,
  { key: string; legacyKey?: string }
> = {
  admin: {
    key: 'THEME_ADMIN',
    legacyKey: 'THEME_ADMIN_DEFAULT'
  },
  dashboard: {
    key: 'THEME_DASHBOARD',
    legacyKey: 'THEME_DASHBOARD_DEFAULT'
  },
  frontend: {
    key: 'THEME_FRONTEND'
  }
};

const TEMPLATE_PRIORITY_VALUES = new Set(['theme', 'module']);

function toPosixPath(value: string) {
  return value.replace(/\\/g, '/');
}

function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function trimToNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function resolveThemeTemplatePriority(warnings: string[]) {
  const rawPriority = trimToNull(process.env.THEME_TEMPLATE_PRIORITY);
  if (!rawPriority) {
    return 'theme' as const;
  }

  const normalizedPriority = rawPriority.toLowerCase();
  if (TEMPLATE_PRIORITY_VALUES.has(normalizedPriority)) {
    return normalizedPriority as 'theme' | 'module';
  }

  warnings.push(
    `Env THEME_TEMPLATE_PRIORITY="${rawPriority}" is invalid; using "theme".`
  );
  return 'theme' as const;
}

function resolveThemeSelectionForArea({
  area,
  warnings
}: {
  area: ThemeSelectionArea;
  warnings: string[];
}): ResolvedThemeSelection {
  const envKeys = THEME_SELECTION_ENV_KEYS[area];
  const envValue = trimToNull(process.env[envKeys.key]);
  if (envValue) {
    return {
      area,
      themeId: envValue,
      source: 'env',
      envKey: envKeys.key,
      legacyEnvKey: envKeys.legacyKey ?? null
    };
  }

  if (envKeys.legacyKey) {
    const legacyValue = trimToNull(process.env[envKeys.legacyKey]);
    if (legacyValue) {
      warnings.push(
        `Env ${envKeys.legacyKey} is deprecated; use ${envKeys.key}.`
      );
      return {
        area,
        themeId: legacyValue,
        source: 'legacy_env',
        envKey: envKeys.key,
        legacyEnvKey: envKeys.legacyKey
      };
    }
  }

  return {
    area,
    themeId: THEME_SELECTION_DEFAULTS[area],
    source: 'default',
    envKey: envKeys.key,
    legacyEnvKey: envKeys.legacyKey ?? null
  };
}

function isThemePackAreaCompatible({
  pack,
  area
}: {
  pack: ResolvedThemePack;
  area: ThemeSelectionArea;
}) {
  return pack.areas.includes(area) || pack.areas.includes('global');
}

function resolveStrictCompatibility(options: ThemesPrepareOptions) {
  if (typeof options.strictCompatibility === 'boolean') {
    return options.strictCompatibility;
  }

  return parseBooleanFlag(process.env.THEMES_PREPARE_STRICT, true);
}

function resolveThemesDir(rootDir: string, override?: string) {
  if (override) {
    return path.isAbsolute(override) ? override : path.join(rootDir, override);
  }

  const envDir = process.env.THEMES_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.join(rootDir, envDir);
  }

  const primary = path.join(rootDir, 'themes');
  if (fs.existsSync(primary)) {
    return primary;
  }

  return null;
}

function resolvePathFromPack({
  packDir,
  relativePath
}: {
  packDir: string;
  relativePath: string;
}) {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.join(packDir, relativePath);
}

function toRelativePath(rootDir: string, absolutePath: string) {
  return toPosixPath(path.relative(rootDir, absolutePath));
}

function pushThemeError(
  errors: ThemePrepareError[],
  error: ThemePrepareError
) {
  errors.push(error);
}

const CODE_TEMPLATE_EXTENSIONS = new Set(['.tsx', '.jsx']);

function scanCodeTemplates({
  packDir,
  rootDir
}: {
  packDir: string;
  rootDir: string;
}): CodeTemplateEntry[] {
  const templatesDir = path.join(packDir, 'templates');
  if (!fs.existsSync(templatesDir)) {
    return [];
  }

  const entries: CodeTemplateEntry[] = [];
  const scanDir = (dirPath: string) => {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
      const absolutePath = path.join(dirPath, file.name);

      if (file.isDirectory()) {
        scanDir(absolutePath);
        continue;
      }

      if (!file.isFile()) {
        continue;
      }

      const ext = path.extname(file.name);
      if (!CODE_TEMPLATE_EXTENSIONS.has(ext)) {
        continue;
      }

      const baseName = file.name.slice(0, -ext.length);
      const componentId = baseName.toLowerCase();

      entries.push({
        componentId,
        filePath: toRelativePath(rootDir, absolutePath)
      });
    }
  };

  scanDir(templatesDir);

  entries.sort((a, b) => a.componentId.localeCompare(b.componentId));
  return entries;
}

function resolveThemeConfigImportPath({
  packDir,
  rootDir
}: {
  packDir: string;
  rootDir: string;
}) {
  const canonicalCandidates = ['config.ts', 'config.tsx'] as const;

  for (const candidate of canonicalCandidates) {
    const absolutePath = path.join(packDir, candidate);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const relativePath = toRelativePath(rootDir, absolutePath).replace(
      /\.(ts|tsx)$/i,
      ''
    );
    return {
      hasThemeConfig: true,
      importPath: relativePath
    };
  }

  return {
    hasThemeConfig: false,
    importPath: null
  };
}

function resolveThemeRoutesImportPath({
  packDir,
  rootDir
}: {
  packDir: string;
  rootDir: string;
}) {
  const routeCandidates = ['routes.ts', 'routes.tsx'] as const;

  for (const candidate of routeCandidates) {
    const absolutePath = path.join(packDir, candidate);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    return toRelativePath(rootDir, absolutePath).replace(/\.(ts|tsx)$/i, '');
  }

  return null;
}

const I18N_AREAS = ['global', 'dashboard', 'admin', 'login', 'frontend'] as const;

type ThemeI18nMessages = Record<string, Record<string, unknown>>;

function readJsonFileSafe(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function scanThemeI18n({
  packDir,
  themeId,
  warnings
}: {
  packDir: string;
  themeId: string;
  warnings: string[];
}): ThemeI18nMessages {
  const i18nDir = path.join(packDir, 'i18n');
  if (!fs.existsSync(i18nDir)) {
    return {};
  }

  const messages: ThemeI18nMessages = {};

  for (const area of I18N_AREAS) {
    const areaDir = path.join(i18nDir, area);
    if (!fs.existsSync(areaDir)) {
      continue;
    }

    const localeFiles = fs
      .readdirSync(areaDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name);

    for (const fileName of localeFiles) {
      const locale = fileName.replace(/\.json$/i, '');
      const filePath = path.join(areaDir, fileName);
      const tree = readJsonFileSafe(filePath);

      if (!tree) {
        warnings.push(
          `Theme ${themeId}: invalid i18n JSON in ${area}/${fileName}`
        );
        continue;
      }

      if (!messages[locale]) {
        messages[locale] = {};
      }

      // Merge area messages under the area key
      messages[locale] = {
        ...messages[locale],
        [area]: tree
      };
    }
  }

  // Also check for flat locale files directly in i18n/ (e.g. i18n/en.json)
  const directFiles = fs
    .readdirSync(i18nDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name);

  for (const fileName of directFiles) {
    const locale = fileName.replace(/\.json$/i, '');
    const filePath = path.join(i18nDir, fileName);
    const tree = readJsonFileSafe(filePath);

    if (!tree) {
      warnings.push(
        `Theme ${themeId}: invalid i18n JSON in ${fileName}`
      );
      continue;
    }

    if (!messages[locale]) {
      messages[locale] = {};
    }

    messages[locale] = {
      ...messages[locale],
      ...tree
    };
  }

  return messages;
}

function writeGeneratedThemeI18nRegistry({
  outputPath,
  themeI18nMap
}: {
  outputPath: string;
  themeI18nMap: Record<string, ThemeI18nMessages>;
}) {
  const hasAny = Object.keys(themeI18nMap).length > 0;

  const body = hasAny
    ? JSON.stringify(themeI18nMap, null, 2)
    : '{}';

  const fileBody =
    "import type { ThemeI18nRegistry } from '@skitsaas/sdk';\n\n" +
    `export const THEME_I18N_REGISTRY: ThemeI18nRegistry = ${body};\n`;

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, fileBody, 'utf8');
}

function serializeThemePackForOutput(pack: ResolvedThemePack) {
  return {
    themeId: pack.themeId,
    version: pack.version,
    areas: pack.areas,
    mode: pack.mode,
    entryTokens: pack.manifest.entryTokens,
    themeRange: pack.themeRange,
    packDir: pack.packDir,
    entryTokensPath: pack.entryTokensPath,
    entryTemplatesPath: pack.entryTemplatesPath,
    entryAssetsPath: pack.entryAssetsPath,
    themeCompatible: pack.themeCompatible,
    codeTemplates: pack.codeTemplates,
    hasThemeConfig: pack.hasThemeConfig,
    themeConfigImportPath: pack.themeConfigImportPath,
    hasFrontendRoutes: pack.hasFrontendRoutes,
    frontendRoutesImportPath: pack.frontendRoutesImportPath
  };
}

function writeGeneratedThemeRegistry({
  outputPath,
  resolvedThemePacks
}: {
  outputPath: string;
  resolvedThemePacks: ResolvedThemePack[];
}) {
  const packsBody = JSON.stringify(
    resolvedThemePacks.map(serializeThemePackForOutput),
    null,
    2
  );

  const fileBody =
    "import type { ThemePackManifest } from './manifest';\n\n" +
    'export type CodeTemplateRegistryEntry = {\n' +
    '  componentId: string;\n' +
    '  filePath: string;\n' +
    '};\n\n' +
    'export type ExternalThemePack = ThemePackManifest & {\n' +
    '  packDir: string;\n' +
    '  entryTokensPath: string;\n' +
    '  entryTemplatesPath: string | null;\n' +
    '  entryAssetsPath: string | null;\n' +
    '  themeCompatible: boolean | null;\n' +
    '  codeTemplates: CodeTemplateRegistryEntry[];\n' +
    '  hasThemeConfig: boolean;\n' +
    '  themeConfigImportPath?: string | null;\n' +
    '  hasFrontendRoutes: boolean;\n' +
    '  frontendRoutesImportPath?: string | null;\n' +
    '};\n\n' +
    `export const EXTERNAL_THEME_PACKS: ExternalThemePack[] = ${packsBody};\n`;

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, fileBody, 'utf8');
}

function writeGeneratedCodeRegistry({
  outputPath,
  resolvedThemePacks
}: {
  outputPath: string;
  resolvedThemePacks: ResolvedThemePack[];
}) {
  const packsWithCode = resolvedThemePacks.filter(
    (pack) => pack.codeTemplates.length > 0 || pack.hasThemeConfig
  );

  if (packsWithCode.length === 0) {
    const emptyBody =
      "import type { ComponentType } from 'react';\n\n" +
      "import type { ThemeConfig } from './config';\n\n" +
      'export type CodeRegistryThemeEntry = {\n' +
      '  themeId: string;\n' +
      '  configImport: (() => Promise<{ default: ThemeConfig }>) | null;\n' +
      '  providerImport: (() => Promise<{ default: ComponentType<{ children: React.ReactNode }> }>) | null;\n' +
      '  templates: Record<string, () => Promise<{ default: ComponentType<any> }>>;\n' +
      '};\n\n' +
      'export const THEME_CODE_REGISTRY: Record<string, CodeRegistryThemeEntry> = {};\n';

    ensureOutputDir(outputPath);
    fs.writeFileSync(outputPath, emptyBody, 'utf8');
    return;
  }

  const lines: string[] = [];
  lines.push("import type { ComponentType } from 'react';");
  lines.push("import type { ThemeConfig } from './config';");
  lines.push('');
  lines.push('export type CodeRegistryThemeEntry = {');
  lines.push('  themeId: string;');
  lines.push('  configImport: (() => Promise<{ default: ThemeConfig }>) | null;');
  lines.push('  providerImport: (() => Promise<{ default: ComponentType<{ children: React.ReactNode }> }>) | null;');
  lines.push('  templates: Record<string, () => Promise<{ default: ComponentType<any> }>>;');
  lines.push('};');
  lines.push('');
  lines.push('export const THEME_CODE_REGISTRY: Record<string, CodeRegistryThemeEntry> = {');

  for (const pack of packsWithCode) {
    const safeKey = JSON.stringify(pack.themeId);
    lines.push(`  ${safeKey}: {`);
    lines.push(`    themeId: ${safeKey},`);

    if (pack.hasThemeConfig && pack.themeConfigImportPath) {
      const configImportPath = `../../${pack.themeConfigImportPath}`;
      lines.push(`    configImport: () => import(${JSON.stringify(configImportPath)}),`);
      lines.push(`    providerImport: () => import(${JSON.stringify(configImportPath)}).then(m => ({ default: m.default?.Provider ?? (({ children }: any) => children) })),`);
    } else {
      lines.push('    configImport: null,');
      lines.push('    providerImport: null,');
    }

    lines.push('    templates: {');
    for (const entry of pack.codeTemplates) {
      const importPath = `../../${entry.filePath.replace(/\.(tsx|jsx)$/, '')}`;
      lines.push(`      ${JSON.stringify(entry.componentId)}: () => import(${JSON.stringify(importPath)}),`);
    }
    lines.push('    },');
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

function writeGeneratedFrontendRouteRegistry({
  outputPath,
  resolvedThemePacks
}: {
  outputPath: string;
  resolvedThemePacks: ResolvedThemePack[];
}) {
  const packsWithRoutes = resolvedThemePacks.filter(
    (pack) => pack.hasFrontendRoutes && pack.frontendRoutesImportPath
  );

  const lines: string[] = [];
  lines.push(
    "import type { FrontendThemeRoutesImport } from './frontend-routes-contract';"
  );
  lines.push('');
  lines.push('export type FrontendRouteRegistryThemeEntry = {');
  lines.push('  themeId: string;');
  lines.push('  routesImport: FrontendThemeRoutesImport;');
  lines.push('};');
  lines.push('');
  lines.push(
    'export const THEME_FRONTEND_ROUTE_REGISTRY: Record<string, FrontendRouteRegistryThemeEntry> = {'
  );

  for (const pack of packsWithRoutes) {
    const safeThemeId = JSON.stringify(pack.themeId);
    const importPath = `../../${pack.frontendRoutesImportPath}`;

    lines.push(`  ${safeThemeId}: {`);
    lines.push(`    themeId: ${safeThemeId},`);
    lines.push(
      `    routesImport: () => import(${JSON.stringify(importPath)}),`
    );
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

function validateSelectedThemes({
  resolvedThemePacks,
  selections,
  errors
}: {
  resolvedThemePacks: ResolvedThemePack[];
  selections: ResolvedThemeSelection[];
  errors: ThemePrepareError[];
}) {
  const byThemeId = new Map(
    resolvedThemePacks.map((pack) => [pack.themeId, pack] as const)
  );

  for (const selection of selections) {
    const selectedPack = byThemeId.get(selection.themeId);
    if (!selectedPack) {
      pushThemeError(errors, {
        code: 'theme_selection_missing',
        themeDir: selection.area,
        message:
          `Theme selection for area "${selection.area}" resolved to ` +
          `"${selection.themeId}" (${selection.source}) but no theme pack with that themeId exists. ` +
          `Configure ${selection.envKey} with an existing theme id.`
      });
      continue;
    }

    if (selectedPack.themeCompatible === false) {
      pushThemeError(errors, {
        code: 'theme_selection_incompatible',
        themeDir: selectedPack.packDir,
        message:
          `Theme selection for area "${selection.area}" resolved to ` +
          `"${selection.themeId}" but the selected pack is incompatible with host contract ${THEME_RUNTIME_CONTRACT_VERSION}.`
      });
      continue;
    }

    if (
      !isThemePackAreaCompatible({
        pack: selectedPack,
        area: selection.area
      })
    ) {
      pushThemeError(errors, {
        code: 'theme_selection_incompatible',
        themeDir: selectedPack.packDir,
        message:
          `Theme selection for area "${selection.area}" resolved to ` +
          `"${selection.themeId}" but the pack areas=${JSON.stringify(selectedPack.areas)} do not support this area.`
      });
    }
  }
}

function validateSelectedFrontendThemeRoutes({
  resolvedThemePacks,
  selections,
  errors
}: {
  resolvedThemePacks: ResolvedThemePack[];
  selections: ResolvedThemeSelection[];
  errors: ThemePrepareError[];
}) {
  const frontendSelection = selections.find(
    (selection) => selection.area === 'frontend'
  );
  if (!frontendSelection) {
    return;
  }

  const selectedPack = resolvedThemePacks.find(
    (pack) => pack.themeId === frontendSelection.themeId
  );
  if (!selectedPack) {
    return;
  }

  if (!selectedPack.hasFrontendRoutes || !selectedPack.frontendRoutesImportPath) {
    pushThemeError(errors, {
      code: 'theme_frontend_routes_missing',
      themeDir: selectedPack.packDir,
      message:
        `Theme selection for area "frontend" resolved to "${frontendSelection.themeId}" ` +
        `(${frontendSelection.source}) but routes.ts[x] is missing. ` +
        'Frontend build-time routing requires a theme routes registry.'
    });
  }
}

function resolveTemplateSourceOrder(templatePriority: 'theme' | 'module') {
  return templatePriority === 'module' ? 'module -> theme' : 'theme -> module';
}

function getMissingCodeTemplateIds({
  pack,
  requiredTemplateIds
}: {
  pack: ResolvedThemePack;
  requiredTemplateIds: readonly string[];
}) {
  const availableTemplateIds = new Set(
    pack.codeTemplates.map((entry) => entry.componentId)
  );
  return requiredTemplateIds.filter(
    (templateId) => !availableTemplateIds.has(templateId)
  );
}

function validateBackofficeRequiredTemplates({
  resolvedThemePacks,
  selections,
  templatePriority,
  errors
}: {
  resolvedThemePacks: ResolvedThemePack[];
  selections: ResolvedThemeSelection[];
  templatePriority: 'theme' | 'module';
  errors: ThemePrepareError[];
}) {
  const byThemeId = new Map(
    resolvedThemePacks.map((pack) => [pack.themeId, pack] as const)
  );
  const sourceOrder = resolveTemplateSourceOrder(templatePriority);

  for (const area of ['admin', 'dashboard'] as const) {
    const selection = selections.find(
      (candidate) => candidate.area === area
    );
    if (!selection) {
      continue;
    }

    const selectedPack = byThemeId.get(selection.themeId);
    if (!selectedPack) {
      continue;
    }

    const missingTemplateIds = getMissingCodeTemplateIds({
      pack: selectedPack,
      requiredTemplateIds:
        BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA[area]
    });
    if (missingTemplateIds.length === 0) {
      continue;
    }

    pushThemeError(errors, {
      code: 'theme_required_template_missing',
      themeDir: selectedPack.packDir,
      message:
        `Theme selection for area "${area}" resolved to "${selection.themeId}" ` +
        `(${selection.source}) but is missing required host code templates: ` +
        `${missingTemplateIds.join(', ')}. ` +
        `Expected source order for backoffice resolution with ` +
        `THEME_TEMPLATE_PRIORITY="${templatePriority}": ${sourceOrder}.`
    });
  }

  const baselinePack = byThemeId.get(BACKOFFICE_BASELINE_THEME_ID);
  if (!baselinePack) {
    pushThemeError(errors, {
      code: 'theme_baseline_missing',
      themeDir: 'themes',
      message:
        `Required baseline backoffice theme "${BACKOFFICE_BASELINE_THEME_ID}" ` +
        'is missing. Add the theme pack so admin/dashboard fallback coverage stays guaranteed.'
    });
    return;
  }

  for (const area of ['admin', 'dashboard'] as const) {
    if (
      !isThemePackAreaCompatible({
        pack: baselinePack,
        area
      })
    ) {
      pushThemeError(errors, {
        code: 'theme_baseline_missing',
        themeDir: baselinePack.packDir,
        message:
          `Baseline backoffice theme "${BACKOFFICE_BASELINE_THEME_ID}" must support ` +
          `area "${area}" but declares areas=${JSON.stringify(baselinePack.areas)}.`
      });
    }
  }

  const missingBaselineTemplateIds = getMissingCodeTemplateIds({
    pack: baselinePack,
    requiredTemplateIds: BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS
  });
  if (missingBaselineTemplateIds.length > 0) {
    pushThemeError(errors, {
      code: 'theme_baseline_missing',
      themeDir: baselinePack.packDir,
      message:
        `Baseline backoffice theme "${BACKOFFICE_BASELINE_THEME_ID}" is missing required host ` +
        `code templates: ${missingBaselineTemplateIds.join(', ')}. ` +
        `Expected source order for backoffice resolution with ` +
        `THEME_TEMPLATE_PRIORITY="${templatePriority}": ${sourceOrder}.`
    });
  }
}

function writeGeneratedThemeSelectionRegistry({
  outputPath,
  selections,
  templatePriority
}: {
  outputPath: string;
  selections: ResolvedThemeSelection[];
  templatePriority: 'theme' | 'module';
}) {
  const byArea = selections.reduce<Record<ThemeSelectionArea, string>>(
    (accumulator, selection) => {
      accumulator[selection.area] = selection.themeId;
      return accumulator;
    },
    {
      admin: THEME_SELECTION_DEFAULTS.admin,
      dashboard: THEME_SELECTION_DEFAULTS.dashboard,
      frontend: THEME_SELECTION_DEFAULTS.frontend
    }
  );

  const selectionsJson = JSON.stringify(selections, null, 2);
  const byAreaJson = JSON.stringify(byArea, null, 2);
  const selectedThemeIds = Array.from(new Set(Object.values(byArea))).sort();
  const selectedThemeIdsJson = JSON.stringify(selectedThemeIds, null, 2);

  const lines: string[] = [];
  lines.push('export type ThemeSelectionArea = "admin" | "dashboard" | "frontend";');
  lines.push('export type ThemeSelectionSource = "env" | "legacy_env" | "default";');
  lines.push('export type ThemeTemplatePriority = "theme" | "module";');
  lines.push('');
  lines.push('export type ThemeAreaSelection = {');
  lines.push('  area: ThemeSelectionArea;');
  lines.push('  themeId: string;');
  lines.push('  source: ThemeSelectionSource;');
  lines.push('  envKey: string;');
  lines.push('  legacyEnvKey: string | null;');
  lines.push('};');
  lines.push('');
  lines.push('export const THEME_SELECTIONS: ThemeAreaSelection[] = ' + selectionsJson + ';');
  lines.push('');
  lines.push('export const THEME_SELECTION_BY_AREA: Record<ThemeSelectionArea, string> = ' + byAreaJson + ';');
  lines.push('');
  lines.push('export const THEME_TEMPLATE_PRIORITY: ThemeTemplatePriority = ' + JSON.stringify(templatePriority) + ';');
  lines.push('');
  lines.push('export const ACTIVE_THEME_IDS: string[] = ' + selectedThemeIdsJson + ';');
  lines.push('');
  lines.push('// Decision: keep code registry generation for all discovered packs.');
  lines.push('export const THEME_CODE_REGISTRY_SCOPE = "all" as const;');
  lines.push('');

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

export function runThemesPrepare(
  options: ThemesPrepareOptions = {}
): ThemesPrepareResult {
  const rootDir = options.rootDir ?? process.cwd();
  const themesDir = resolveThemesDir(rootDir, options.themesDir);
  const strictCompatibility = resolveStrictCompatibility(options);
  const hostThemeVersion =
    options.hostThemeVersion?.trim() || THEME_RUNTIME_CONTRACT_VERSION;

  const warnings: string[] = [];
  const errors: ThemePrepareError[] = [];
  const compatibilityErrors: string[] = [];
  const resolvedThemePacks: ResolvedThemePack[] = [];
  const themeI18nMap: Record<string, ThemeI18nMessages> = {};
  const templatePriority = resolveThemeTemplatePriority(warnings);
  const resolvedSelections = THEME_SELECTION_AREAS.map((area) =>
    resolveThemeSelectionForArea({
      area,
      warnings
    })
  );
  if (trimToNull(process.env.FF_USE_THEME_RUNTIME)) {
    warnings.push('Env FF_USE_THEME_RUNTIME is deprecated and ignored.');
  }

  if (themesDir && fs.existsSync(themesDir)) {
    const packDirs = fs
      .readdirSync(themesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(themesDir, entry.name));

    for (const packDir of packDirs) {
      const themeJsonPath = path.join(packDir, 'theme.json');
      if (!fs.existsSync(themeJsonPath)) {
        continue;
      }

      let rawManifest: unknown;
      try {
        rawManifest = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
      } catch {
        pushThemeError(errors, {
          code: 'theme_json_parse_failed',
          themeDir: packDir,
          message: `Theme pack ${packDir} has invalid theme.json (parse error).`
        });
        continue;
      }

      const validation = validateThemePackManifest(rawManifest);
      if (!validation.ok) {
        const details = validation.issues
          .map((issue) => `${issue.field}: ${issue.message}`)
          .join('; ');
        pushThemeError(errors, {
          code: 'theme_manifest_invalid',
          themeDir: packDir,
          message: `Theme pack ${packDir} has invalid manifest: ${details}`
        });
        continue;
      }

      const manifest = validation.manifest;
      const entryTokensAbsolute = resolvePathFromPack({
        packDir,
        relativePath: manifest.entryTokens
      });
      if (!fs.existsSync(entryTokensAbsolute)) {
        pushThemeError(errors, {
          code: 'theme_tokens_missing',
          themeDir: packDir,
          message: `Theme ${manifest.themeId} entryTokens="${manifest.entryTokens}" does not exist.`
        });
        continue;
      }

      let entryTemplatesAbsolute: string | null = null;
      if (manifest.entryTemplates) {
        entryTemplatesAbsolute = resolvePathFromPack({
          packDir,
          relativePath: manifest.entryTemplates
        });

        if (!fs.existsSync(entryTemplatesAbsolute)) {
          pushThemeError(errors, {
            code: 'theme_templates_missing',
            themeDir: packDir,
            message: `Theme ${manifest.themeId} entryTemplates="${manifest.entryTemplates}" does not exist.`
          });
          continue;
        }
      }

      let entryAssetsAbsolute: string | null = null;
      if (manifest.entryAssets) {
        entryAssetsAbsolute = resolvePathFromPack({
          packDir,
          relativePath: manifest.entryAssets
        });

        if (!fs.existsSync(entryAssetsAbsolute)) {
          pushThemeError(errors, {
            code: 'theme_assets_missing',
            themeDir: packDir,
            message: `Theme ${manifest.themeId} entryAssets="${manifest.entryAssets}" does not exist.`
          });
          continue;
        }
      }

      const rangeCheck = isSemverRangeSatisfied(
        hostThemeVersion,
        manifest.themeRange
      );
      if (rangeCheck === null) {
        pushThemeError(errors, {
          code: 'theme_range_invalid',
          themeDir: packDir,
          message: `Theme ${manifest.themeId} has invalid themeRange="${manifest.themeRange}".`
        });
        continue;
      }

      if (!rangeCheck) {
        const message = `Theme ${manifest.themeId} themeRange="${manifest.themeRange}" is incompatible with host theme contract ${hostThemeVersion}.`;
        if (strictCompatibility) {
          compatibilityErrors.push(message);
        } else {
          warnings.push(message);
        }
      }

      const codeTemplates = scanCodeTemplates({ packDir, rootDir });
      const themeConfigResolution = resolveThemeConfigImportPath({
        packDir,
        rootDir
      });
      const frontendRoutesImportPath = resolveThemeRoutesImportPath({
        packDir,
        rootDir
      });
      const i18nMessages = scanThemeI18n({ packDir, themeId: manifest.themeId, warnings });
      if (Object.keys(i18nMessages).length > 0) {
        themeI18nMap[manifest.themeId] = i18nMessages;
      }

      resolvedThemePacks.push({
        themeId: manifest.themeId,
        version: manifest.version,
        areas: manifest.areas,
        mode: manifest.mode,
        themeRange: manifest.themeRange,
        packDir: toRelativePath(rootDir, packDir),
        entryTokensPath: toRelativePath(rootDir, entryTokensAbsolute),
        entryTemplatesPath: entryTemplatesAbsolute
          ? toRelativePath(rootDir, entryTemplatesAbsolute)
          : null,
        entryAssetsPath: entryAssetsAbsolute
          ? toRelativePath(rootDir, entryAssetsAbsolute)
          : null,
        manifest,
        themeCompatible: rangeCheck,
        codeTemplates,
        hasThemeConfig: themeConfigResolution.hasThemeConfig,
        themeConfigImportPath: themeConfigResolution.importPath,
        hasFrontendRoutes: Boolean(frontendRoutesImportPath),
        frontendRoutesImportPath
      });
    }
  }

  resolvedThemePacks.sort((left, right) =>
    left.themeId.localeCompare(right.themeId)
  );

  const seenThemeIds = new Set<string>();
  for (const theme of resolvedThemePacks) {
    if (seenThemeIds.has(theme.themeId)) {
      pushThemeError(errors, {
        code: 'theme_id_duplicate',
        themeDir: theme.packDir,
        message: `Theme pack declares duplicate themeId="${theme.themeId}".`
      });
      continue;
    }
    seenThemeIds.add(theme.themeId);
  }

  if (errors.length > 0) {
    const details = errors.map((error) => `- ${error.message}`).join('\n');
    throw new Error(`[themes-prepare] theme manifest validation failed:\n${details}`);
  }

  if (strictCompatibility && compatibilityErrors.length > 0) {
    const details = compatibilityErrors.map((error) => `- ${error}`).join('\n');
    throw new Error(`[themes-prepare] strict theme compatibility failed:\n${details}`);
  }

  validateSelectedThemes({
    resolvedThemePacks,
    selections: resolvedSelections,
    errors
  });
  validateSelectedFrontendThemeRoutes({
    resolvedThemePacks,
    selections: resolvedSelections,
    errors
  });
  validateBackofficeRequiredTemplates({
    resolvedThemePacks,
    selections: resolvedSelections,
    templatePriority,
    errors
  });
  if (errors.length > 0) {
    const details = errors.map((error) => `- ${error.message}`).join('\n');
    throw new Error(`[themes-prepare] theme selection validation failed:\n${details}`);
  }

  const outputPath = path.join(rootDir, 'lib', 'themes', 'external.generated.ts');
  writeGeneratedThemeRegistry({
    outputPath,
    resolvedThemePacks
  });

  const codeRegistryOutputPath = path.join(rootDir, 'lib', 'themes', 'code-registry.generated.ts');
  writeGeneratedCodeRegistry({
    outputPath: codeRegistryOutputPath,
    resolvedThemePacks
  });

  const frontendRouteRegistryOutputPath = path.join(
    rootDir,
    'lib',
    'themes',
    'frontend-routes.generated.ts'
  );
  writeGeneratedFrontendRouteRegistry({
    outputPath: frontendRouteRegistryOutputPath,
    resolvedThemePacks
  });

  const i18nRegistryOutputPath = path.join(rootDir, 'lib', 'i18n', 'themes-i18n.generated.ts');
  writeGeneratedThemeI18nRegistry({
    outputPath: i18nRegistryOutputPath,
    themeI18nMap
  });

  const selectionOutputPath = path.join(rootDir, 'lib', 'themes', 'selection.generated.ts');
  writeGeneratedThemeSelectionRegistry({
    outputPath: selectionOutputPath,
    selections: resolvedSelections,
    templatePriority
  });

  if (warnings.length > 0 && options.logWarnings !== false) {
    console.warn('[themes-prepare] warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  return {
    rootDir,
    themesDir,
    hostThemeVersion,
    strictCompatibility,
    outputPath,
    selectionOutputPath,
    warnings,
    errors,
    compatibilityErrors,
    resolvedThemePacks,
    selectedThemesByArea: {
      admin: resolvedSelections.find((selection) => selection.area === 'admin')?.themeId ??
        THEME_SELECTION_DEFAULTS.admin,
      dashboard:
        resolvedSelections.find((selection) => selection.area === 'dashboard')
          ?.themeId ?? THEME_SELECTION_DEFAULTS.dashboard,
      frontend:
        resolvedSelections.find((selection) => selection.area === 'frontend')
          ?.themeId ?? THEME_SELECTION_DEFAULTS.frontend
    },
    templatePriority
  };
}

function parseCliArgs(argv: string[]) {
  let strictCompatibility: boolean | undefined;
  let hostThemeVersion: string | undefined;

  for (const arg of argv) {
    if (arg === '--strict-compat') {
      strictCompatibility = true;
      continue;
    }

    if (arg === '--no-strict-compat' || arg === '--warn-compat') {
      strictCompatibility = false;
      continue;
    }

    if (arg.startsWith('--theme-version=')) {
      const raw = arg.slice('--theme-version='.length).trim();
      hostThemeVersion = raw || undefined;
    }
  }

  return {
    ...(strictCompatibility === undefined ? {} : { strictCompatibility }),
    ...(hostThemeVersion ? { hostThemeVersion } : {})
  } as Pick<ThemesPrepareOptions, 'strictCompatibility' | 'hostThemeVersion'>;
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  try {
    runThemesPrepare(parseCliArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
