import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import tailwindPostcss from '@tailwindcss/postcss';
import dotenv from 'dotenv';
import {
  THEME_RUNTIME_CONTRACT_VERSION,
  validateThemePackManifest,
  type ThemePackManifest
} from '../lib/themes/manifest';
import { extractStaticAdditionalLocalesFromFile } from './static-additional-locales';
import {
  BACKOFFICE_BASELINE_THEME_ID,
  BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS,
  BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA
} from '../lib/themes/required-code-templates';
import { isSemverRangeSatisfied } from './modules-prepare';

dotenv.config();

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
  additionalLocales: string[];
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
type ThemeAssetArea = ThemeSelectionArea | 'global';
type ThemeAreaAssetMap = Partial<Record<ThemeAssetArea, string>>;
type ThemeAreaAssetListMap = Partial<
  Record<ThemeAssetArea, string | string[]>
>;
type ThemeAreaBooleanMap = Partial<Record<ThemeAssetArea, boolean>>;

type ThemeAssetsManifestForBuild = {
  globalCssByArea?: ThemeAreaAssetMap;
  scriptByArea?: ThemeAreaAssetMap;
  additionalCssByArea?: ThemeAreaAssetListMap;
  additionalScriptByArea?: ThemeAreaAssetListMap;
  ignoreCoreCssByArea?: ThemeAreaBooleanMap;
  ignoreCoreScriptByArea?: ThemeAreaBooleanMap;
};

type ThemeAreaAssetsBundle = {
  cssHrefs: string[];
  scriptHrefs: string[];
  ignoreCoreCss: boolean;
  ignoreCoreScript: boolean;
};

type ThemeAssetsBundlesByArea = Record<ThemeSelectionArea, ThemeAreaAssetsBundle>;

type CoreAreaAssetsBundle = {
  cssHref: string | null;
  scriptHref: string | null;
};

type CoreAssetsByArea = Record<ThemeSelectionArea, CoreAreaAssetsBundle>;

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
const THEME_ASSET_AREAS = new Set<ThemeAssetArea>([
  ...THEME_SELECTION_AREAS,
  'global'
]);
const CORE_CSS_SOURCE_BY_AREA: Record<ThemeSelectionArea, string> = {
  admin: 'app/assets/admin/core.css',
  dashboard: 'app/assets/dashboard/core.css',
  frontend: 'app/assets/frontend/core.css'
};
const CORE_SCRIPT_SOURCE_BY_AREA: Record<ThemeSelectionArea, string | null> = {
  admin: null,
  dashboard: null,
  frontend: null
};

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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAreaAssetMap(value: unknown): ThemeAreaAssetMap | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const normalized: ThemeAreaAssetMap = {};
  for (const [rawArea, rawPath] of Object.entries(value)) {
    const area = rawArea.trim().toLowerCase();
    if (!THEME_ASSET_AREAS.has(area as ThemeAssetArea)) {
      continue;
    }

    if (typeof rawPath !== 'string') {
      continue;
    }

    const assetPath = rawPath.trim();
    if (!assetPath) {
      continue;
    }

    normalized[area as ThemeAssetArea] = assetPath;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeAreaAssetListMap(
  value: unknown
): ThemeAreaAssetListMap | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const normalized: ThemeAreaAssetListMap = {};
  for (const [rawArea, rawPaths] of Object.entries(value)) {
    const area = rawArea.trim().toLowerCase();
    if (!THEME_ASSET_AREAS.has(area as ThemeAssetArea)) {
      continue;
    }

    if (typeof rawPaths === 'string') {
      const assetPath = rawPaths.trim();
      if (assetPath) {
        normalized[area as ThemeAssetArea] = assetPath;
      }
      continue;
    }

    if (!Array.isArray(rawPaths)) {
      continue;
    }

    const paths = rawPaths
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (paths.length > 0) {
      normalized[area as ThemeAssetArea] = paths;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeAreaBooleanMap(value: unknown): ThemeAreaBooleanMap | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const normalized: ThemeAreaBooleanMap = {};
  for (const [rawArea, rawBoolean] of Object.entries(value)) {
    const area = rawArea.trim().toLowerCase();
    if (!THEME_ASSET_AREAS.has(area as ThemeAssetArea)) {
      continue;
    }

    if (typeof rawBoolean !== 'boolean') {
      continue;
    }

    normalized[area as ThemeAssetArea] = rawBoolean;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeThemeAssetsManifestForBuild(
  raw: unknown
): ThemeAssetsManifestForBuild {
  if (!isObject(raw)) {
    return {};
  }

  return {
    globalCssByArea: normalizeAreaAssetMap(raw.globalCssByArea),
    scriptByArea: normalizeAreaAssetMap(raw.scriptByArea),
    additionalCssByArea: normalizeAreaAssetListMap(raw.additionalCssByArea),
    additionalScriptByArea: normalizeAreaAssetListMap(raw.additionalScriptByArea),
    ignoreCoreCssByArea: normalizeAreaBooleanMap(raw.ignoreCoreCssByArea),
    ignoreCoreScriptByArea: normalizeAreaBooleanMap(raw.ignoreCoreScriptByArea)
  };
}

function resolveAreaAssetPath(
  assetsByArea: ThemeAreaAssetMap | undefined,
  area: ThemeSelectionArea
) {
  if (!assetsByArea) {
    return null;
  }

  return assetsByArea[area] ?? assetsByArea.global ?? null;
}

function resolveAreaAssetListPaths(
  assetsByArea: ThemeAreaAssetListMap | undefined,
  area: ThemeSelectionArea
) {
  if (!assetsByArea) {
    return [];
  }

  const value = assetsByArea[area] ?? assetsByArea.global;
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

function resolveAreaBooleanFlag(
  flagsByArea: ThemeAreaBooleanMap | undefined,
  area: ThemeSelectionArea
) {
  if (!flagsByArea) {
    return false;
  }

  return flagsByArea[area] ?? flagsByArea.global ?? false;
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

function toPublicHref({
  rootDir,
  absolutePath
}: {
  rootDir: string;
  absolutePath: string;
}) {
  const publicDir = path.join(rootDir, 'public');
  const relativePath = path.relative(publicDir, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(
      `[themes-prepare] Output path escaped public directory: ${absolutePath}`
    );
  }

  return `/${toPosixPath(relativePath)}`;
}

function ensureCleanDir(dirPath: string) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function readThemeConfigFilePath({
  rootDir,
  pack
}: {
  rootDir: string;
  pack: ResolvedThemePack;
}) {
  if (!pack.hasThemeConfig || !pack.themeConfigImportPath) {
    return null;
  }

  const candidateExtensions = ['.ts', '.tsx', '.js', '.mjs', '.cjs'] as const;
  for (const extension of candidateExtensions) {
    const candidatePath = path.join(
      rootDir,
      `${pack.themeConfigImportPath}${extension}`
    );
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

async function readThemeAssetsManifestFromThemeConfig({
  rootDir,
  pack,
  warnings
}: {
  rootDir: string;
  pack: ResolvedThemePack;
  warnings: string[];
}): Promise<ThemeAssetsManifestForBuild> {
  const configFilePath = readThemeConfigFilePath({ rootDir, pack });
  if (!configFilePath) {
    return {};
  }

  try {
    const configModule = await import(pathToFileURL(configFilePath).href);
    const config = configModule?.default;
    if (!isObject(config)) {
      return {};
    }

    return normalizeThemeAssetsManifestForBuild(config.assets);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown config import error';
    warnings.push(
      `Theme ${pack.themeId}: failed loading config assets (${message}).`
    );
    return {};
  }
}

function resolveThemeScopedAbsolutePath({
  rootDir,
  pack,
  relativePath,
  warnings,
  field
}: {
  rootDir: string;
  pack: ResolvedThemePack;
  relativePath: string;
  warnings: string[];
  field: string;
}) {
  const normalizedRelativePath = relativePath.trim();
  if (!normalizedRelativePath || path.isAbsolute(normalizedRelativePath)) {
    warnings.push(
      `Theme ${pack.themeId}: invalid ${field} path "${relativePath}".`
    );
    return null;
  }

  const packRoot = path.resolve(rootDir, pack.packDir);
  const absolutePath = path.resolve(packRoot, normalizedRelativePath);
  const relativeToPack = path.relative(packRoot, absolutePath);
  if (relativeToPack.startsWith('..') || path.isAbsolute(relativeToPack)) {
    warnings.push(
      `Theme ${pack.themeId}: ignored unsafe ${field} path "${relativePath}".`
    );
    return null;
  }

  if (!fs.existsSync(absolutePath)) {
    warnings.push(
      `Theme ${pack.themeId}: missing ${field} path "${relativePath}".`
    );
    return null;
  }

  return absolutePath;
}

async function compileCssAssetToPublicHref({
  rootDir,
  sourceAbsolutePath,
  outputDirAbsolute,
  outputLabel
}: {
  rootDir: string;
  sourceAbsolutePath: string;
  outputDirAbsolute: string;
  outputLabel: string;
}) {
  const inputCss = fs.readFileSync(sourceAbsolutePath, 'utf8');
  const compiled = await postcss([tailwindPostcss()]).process(inputCss, {
    from: sourceAbsolutePath
  });
  const hash = crypto
    .createHash('sha256')
    .update(compiled.css)
    .digest('hex')
    .slice(0, 12);
  const outputFileName = `${outputLabel}-${hash}.css`;
  const outputAbsolutePath = path.join(outputDirAbsolute, outputFileName);
  fs.mkdirSync(outputDirAbsolute, { recursive: true });
  fs.writeFileSync(outputAbsolutePath, compiled.css, 'utf8');
  return toPublicHref({ rootDir, absolutePath: outputAbsolutePath });
}

function copyScriptAssetToPublicHref({
  rootDir,
  sourceAbsolutePath,
  outputDirAbsolute,
  outputLabel
}: {
  rootDir: string;
  sourceAbsolutePath: string;
  outputDirAbsolute: string;
  outputLabel: string;
}) {
  const sourceBuffer = fs.readFileSync(sourceAbsolutePath);
  const hash = crypto
    .createHash('sha256')
    .update(sourceBuffer)
    .digest('hex')
    .slice(0, 12);
  const sourceExtension = path.extname(sourceAbsolutePath) || '.js';
  const outputFileName = `${outputLabel}-${hash}${sourceExtension}`;
  const outputAbsolutePath = path.join(outputDirAbsolute, outputFileName);
  fs.mkdirSync(outputDirAbsolute, { recursive: true });
  fs.writeFileSync(outputAbsolutePath, sourceBuffer);
  return toPublicHref({ rootDir, absolutePath: outputAbsolutePath });
}

async function compileCoreAssetsByArea({
  rootDir,
  warnings
}: {
  rootDir: string;
  warnings: string[];
}): Promise<CoreAssetsByArea> {
  const bundles: CoreAssetsByArea = {
    admin: { cssHref: null, scriptHref: null },
    dashboard: { cssHref: null, scriptHref: null },
    frontend: { cssHref: null, scriptHref: null }
  };

  for (const area of THEME_SELECTION_AREAS) {
    const cssSourceRelative = CORE_CSS_SOURCE_BY_AREA[area];
    const cssSourceAbsolute = path.join(rootDir, cssSourceRelative);
    if (fs.existsSync(cssSourceAbsolute)) {
      bundles[area].cssHref = await compileCssAssetToPublicHref({
        rootDir,
        sourceAbsolutePath: cssSourceAbsolute,
        outputDirAbsolute: path.join(
          rootDir,
          'public',
          '.generated',
          'core-assets',
          area
        ),
        outputLabel: 'core'
      });
    }

    const scriptSourceRelative = CORE_SCRIPT_SOURCE_BY_AREA[area];
    if (scriptSourceRelative) {
      const scriptSourceAbsolute = path.join(rootDir, scriptSourceRelative);
      if (fs.existsSync(scriptSourceAbsolute)) {
        bundles[area].scriptHref = copyScriptAssetToPublicHref({
          rootDir,
          sourceAbsolutePath: scriptSourceAbsolute,
          outputDirAbsolute: path.join(
            rootDir,
            'public',
            '.generated',
            'core-assets',
            area
          ),
          outputLabel: 'core'
        });
      } else {
        warnings.push(
          `Core asset missing for area "${area}": ${scriptSourceRelative}`
        );
      }
    }
  }

  return bundles;
}

function dedupeAbsolutePaths(paths: Array<string | null>) {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const entry of paths) {
    if (!entry || seen.has(entry)) {
      continue;
    }

    seen.add(entry);
    deduped.push(entry);
  }

  return deduped;
}

async function compileThemeAssetsByArea({
  rootDir,
  pack,
  assetsManifest,
  warnings
}: {
  rootDir: string;
  pack: ResolvedThemePack;
  assetsManifest: ThemeAssetsManifestForBuild;
  warnings: string[];
}): Promise<ThemeAssetsBundlesByArea> {
  const bundles: ThemeAssetsBundlesByArea = {
    admin: {
      cssHrefs: [],
      scriptHrefs: [],
      ignoreCoreCss: false,
      ignoreCoreScript: false
    },
    dashboard: {
      cssHrefs: [],
      scriptHrefs: [],
      ignoreCoreCss: false,
      ignoreCoreScript: false
    },
    frontend: {
      cssHrefs: [],
      scriptHrefs: [],
      ignoreCoreCss: false,
      ignoreCoreScript: false
    }
  };

  const tokensAbsolutePath = path.join(rootDir, pack.entryTokensPath);
  if (!fs.existsSync(tokensAbsolutePath)) {
    warnings.push(
      `Theme ${pack.themeId}: missing entryTokens at ${pack.entryTokensPath}.`
    );
  }

  for (const area of THEME_SELECTION_AREAS) {
    const primaryCssRelative = resolveAreaAssetPath(
      assetsManifest.globalCssByArea,
      area
    );
    const additionalCssRelative = resolveAreaAssetListPaths(
      assetsManifest.additionalCssByArea,
      area
    );
    const primaryScriptRelative = resolveAreaAssetPath(
      assetsManifest.scriptByArea,
      area
    );
    const additionalScriptRelative = resolveAreaAssetListPaths(
      assetsManifest.additionalScriptByArea,
      area
    );

    bundles[area].ignoreCoreCss = resolveAreaBooleanFlag(
      assetsManifest.ignoreCoreCssByArea,
      area
    );
    bundles[area].ignoreCoreScript = resolveAreaBooleanFlag(
      assetsManifest.ignoreCoreScriptByArea,
      area
    );

    const cssSources = dedupeAbsolutePaths([
      fs.existsSync(tokensAbsolutePath) ? tokensAbsolutePath : null,
      primaryCssRelative
        ? resolveThemeScopedAbsolutePath({
            rootDir,
            pack,
            relativePath: primaryCssRelative,
            warnings,
            field: `assets.globalCssByArea.${area}`
          })
        : null,
      ...additionalCssRelative.map((relativePath) =>
        resolveThemeScopedAbsolutePath({
          rootDir,
          pack,
          relativePath,
          warnings,
          field: `assets.additionalCssByArea.${area}`
        })
      )
    ]);

    const scriptSources = dedupeAbsolutePaths([
      primaryScriptRelative
        ? resolveThemeScopedAbsolutePath({
            rootDir,
            pack,
            relativePath: primaryScriptRelative,
            warnings,
            field: `assets.scriptByArea.${area}`
          })
        : null,
      ...additionalScriptRelative.map((relativePath) =>
        resolveThemeScopedAbsolutePath({
          rootDir,
          pack,
          relativePath,
          warnings,
          field: `assets.additionalScriptByArea.${area}`
        })
      )
    ]);

    const themeAreaOutputDir = path.join(
      rootDir,
      'public',
      '.generated',
      'theme-assets',
      pack.themeId,
      area
    );

    for (let index = 0; index < cssSources.length; index += 1) {
      const cssSourceAbsolute = cssSources[index];
      const cssHref = await compileCssAssetToPublicHref({
        rootDir,
        sourceAbsolutePath: cssSourceAbsolute,
        outputDirAbsolute: path.join(themeAreaOutputDir, 'css'),
        outputLabel: `asset-${index + 1}`
      });
      bundles[area].cssHrefs.push(cssHref);
    }

    for (let index = 0; index < scriptSources.length; index += 1) {
      const scriptSourceAbsolute = scriptSources[index];
      const scriptHref = copyScriptAssetToPublicHref({
        rootDir,
        sourceAbsolutePath: scriptSourceAbsolute,
        outputDirAbsolute: path.join(themeAreaOutputDir, 'js'),
        outputLabel: `asset-${index + 1}`
      });
      bundles[area].scriptHrefs.push(scriptHref);
    }
  }

  return bundles;
}

function writeGeneratedThemeAssetsRegistry({
  outputPath,
  coreAssetsByArea,
  themeAssetsById
}: {
  outputPath: string;
  coreAssetsByArea: CoreAssetsByArea;
  themeAssetsById: Record<string, ThemeAssetsBundlesByArea>;
}) {
  const lines: string[] = [];
  lines.push('export type ThemeSelectionArea = "admin" | "dashboard" | "frontend";');
  lines.push('');
  lines.push('export type CoreAreaAssetsBundle = {');
  lines.push('  cssHref: string | null;');
  lines.push('  scriptHref: string | null;');
  lines.push('};');
  lines.push('');
  lines.push('export type ThemeAreaAssetsBundle = {');
  lines.push('  cssHrefs: string[];');
  lines.push('  scriptHrefs: string[];');
  lines.push('  ignoreCoreCss: boolean;');
  lines.push('  ignoreCoreScript: boolean;');
  lines.push('};');
  lines.push('');
  lines.push(
    'export const CORE_ASSETS_BY_AREA: Record<ThemeSelectionArea, CoreAreaAssetsBundle> = ' +
      JSON.stringify(coreAssetsByArea, null, 2) +
      ';'
  );
  lines.push('');
  lines.push(
    'export const THEME_ASSETS_BY_THEME_ID: Record<string, Record<ThemeSelectionArea, ThemeAreaAssetsBundle>> = ' +
      JSON.stringify(themeAssetsById, null, 2) +
      ';'
  );
  lines.push('');

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

async function prepareCompiledThemeAndCoreAssets({
  rootDir,
  resolvedThemePacks,
  warnings
}: {
  rootDir: string;
  resolvedThemePacks: ResolvedThemePack[];
  warnings: string[];
}) {
  const generatedThemeAssetsDir = path.join(
    rootDir,
    'public',
    '.generated',
    'theme-assets'
  );
  const generatedCoreAssetsDir = path.join(
    rootDir,
    'public',
    '.generated',
    'core-assets'
  );
  ensureCleanDir(generatedThemeAssetsDir);
  ensureCleanDir(generatedCoreAssetsDir);

  const coreAssetsByArea = await compileCoreAssetsByArea({
    rootDir,
    warnings
  });

  const themeAssetsById: Record<string, ThemeAssetsBundlesByArea> = {};
  for (const pack of resolvedThemePacks) {
    const assetsManifest = await readThemeAssetsManifestFromThemeConfig({
      rootDir,
      pack,
      warnings
    });
    const bundles = await compileThemeAssetsByArea({
      rootDir,
      pack,
      assetsManifest,
      warnings
    });
    themeAssetsById[pack.themeId] = bundles;
  }

  const outputPath = path.join(rootDir, 'lib', 'themes', 'assets.generated.ts');
  writeGeneratedThemeAssetsRegistry({
    outputPath,
    coreAssetsByArea,
    themeAssetsById
  });
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

function resolveThemeConfigFilePath(packDir: string) {
  const canonicalCandidates = ['config.ts', 'config.tsx'] as const;

  for (const candidate of canonicalCandidates) {
    const absolutePath = path.join(packDir, candidate);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return null;
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

const THEME_TRANSLATION_AREAS = [
  'global',
  'dashboard',
  'admin',
  'login',
  'frontend'
] as const;

type ThemeTranslationsByArea = Record<string, Record<string, Record<string, string>>>;

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

function isFlatTranslationRecord(
  value: Record<string, unknown>
): value is Record<string, string> {
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function scanThemeTranslations({
  packDir,
  themeId,
  warnings
}: {
  packDir: string;
  themeId: string;
  warnings: string[];
}): ThemeTranslationsByArea {
  const localesDir = path.join(packDir, 'locales');
  if (!fs.existsSync(localesDir)) {
    return {};
  }

  const translationsByArea: ThemeTranslationsByArea = {};

  for (const area of THEME_TRANSLATION_AREAS) {
    const areaDir = path.join(localesDir, area);
    if (!fs.existsSync(areaDir)) {
      continue;
    }

    const localeFiles = fs
      .readdirSync(areaDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const fileName of localeFiles) {
      const locale = fileName.replace(/\.json$/i, '');
      const filePath = path.join(areaDir, fileName);
      const tree = readJsonFileSafe(filePath);

      if (!tree || !isFlatTranslationRecord(tree)) {
        warnings.push(
          `Theme ${themeId}: invalid locale JSON in ${area}/${fileName}. Expected a flat object shaped like { "Cancel": "Cancelar" }.`
        );
        continue;
      }

      if (!translationsByArea[area]) {
        translationsByArea[area] = {};
      }

      translationsByArea[area][locale] = Object.fromEntries(
        Object.entries(tree).sort(([left], [right]) => left.localeCompare(right))
      );
    }
  }

  return translationsByArea;
}

function writeGeneratedThemeTranslationsRegistry({
  outputPath,
  themeTranslationsByThemeId
}: {
  outputPath: string;
  themeTranslationsByThemeId: Record<string, ThemeTranslationsByArea>;
}) {
  const normalizedRegistry = Object.fromEntries(
    Object.entries(themeTranslationsByThemeId).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );
  const hasAny = Object.keys(normalizedRegistry).length > 0;

  const body = hasAny
    ? JSON.stringify(normalizedRegistry, null, 2)
    : '{}';

  const fileBody =
    "import type { ThemeTranslationsRegistry } from '@skitsaas/sdk';\n\n" +
    `export const THEME_TRANSLATIONS_BY_THEME_ID: ThemeTranslationsRegistry = ${body};\n`;

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
    additionalLocales: pack.additionalLocales,
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
    '  additionalLocales?: string[];\n' +
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

export async function runThemesPrepare(
  options: ThemesPrepareOptions = {}
): Promise<ThemesPrepareResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const themesDir = resolveThemesDir(rootDir, options.themesDir);
  const strictCompatibility = resolveStrictCompatibility(options);
  const hostThemeVersion =
    options.hostThemeVersion?.trim() || THEME_RUNTIME_CONTRACT_VERSION;

  const warnings: string[] = [];
  const errors: ThemePrepareError[] = [];
  const compatibilityErrors: string[] = [];
  const resolvedThemePacks: ResolvedThemePack[] = [];
  const themeTranslationsByThemeId: Record<string, ThemeTranslationsByArea> = {};
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
      const themeConfigFilePath = resolveThemeConfigFilePath(packDir);
      const additionalLocalesFromConfig = themeConfigFilePath
        ? extractStaticAdditionalLocalesFromFile(
            themeConfigFilePath,
            `Theme ${manifest.themeId}`
          )
        : { locales: [], warnings: [] };
      warnings.push(...additionalLocalesFromConfig.warnings);
      const frontendRoutesImportPath = resolveThemeRoutesImportPath({
        packDir,
        rootDir
      });
      const themeTranslations = scanThemeTranslations({
        packDir,
        themeId: manifest.themeId,
        warnings
      });
      if (Object.keys(themeTranslations).length > 0) {
        themeTranslationsByThemeId[manifest.themeId] = themeTranslations;
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
        additionalLocales: additionalLocalesFromConfig.locales,
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

  const themeTranslationsOutputPath = path.join(
    rootDir,
    'lib',
    'i18n',
    'theme-translations.generated.ts'
  );
  writeGeneratedThemeTranslationsRegistry({
    outputPath: themeTranslationsOutputPath,
    themeTranslationsByThemeId
  });

  const selectionOutputPath = path.join(rootDir, 'lib', 'themes', 'selection.generated.ts');
  writeGeneratedThemeSelectionRegistry({
    outputPath: selectionOutputPath,
    selections: resolvedSelections,
    templatePriority
  });
  await prepareCompiledThemeAndCoreAssets({
    rootDir,
    resolvedThemePacks,
    warnings
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
  runThemesPrepare(parseCliArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
