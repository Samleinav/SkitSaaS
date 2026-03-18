import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AREAS = ['global', 'admin', 'dashboard', 'login'] as const;
const DEFAULT_LOCALE = 'en';
const MODULE_SOURCE_ENTRY_CANDIDATES = [
  'src/manifest.ts',
  'src/manifest.tsx',
  'src/manifest.js',
  'src/manifest.mjs'
] as const;
const THEME_CONFIG_ENTRY_CANDIDATES = ['config.ts', 'config.tsx'] as const;
const LOCALE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type I18nArea = (typeof AREAS)[number];
type TranslationNode =
  | string
  | readonly TranslationNode[]
  | { [key: string]: TranslationNode };

export type FlatTranslationConflict = {
  key: string;
  firstValue: string;
  secondValue: string;
  firstPath: string;
  secondPath: string;
};

type FlatTranslationsByLocale = Record<string, Record<string, string>>;
type FlatTranslationsByModuleId = Record<string, FlatTranslationsByLocale>;
type FlatTranslationSourcesByLocale = Record<string, Record<string, string>>;
type FlatTranslationConflictsByLocale = Record<string, FlatTranslationConflict[]>;
type CoreMessagesByArea = Record<I18nArea, Record<string, TranslationNode>>;

function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeImportAlias(input: string) {
  return input.replace(/[^a-zA-Z0-9_$]/g, '_');
}

function resolveLocalesRoot(rootDir: string) {
  return path.join(rootDir, 'lib', 'i18n', 'locales');
}

function resolveModulesDir(rootDir: string, override?: string | null) {
  if (override) {
    return path.isAbsolute(override) ? override : path.join(rootDir, override);
  }

  const envDir = process.env.MODULES_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.join(rootDir, envDir);
  }

  const primary = path.join(rootDir, 'modules');
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.join(rootDir, 'examplemodules');
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  return null;
}

function resolveThemesDir(rootDir: string, override?: string | null) {
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

function resolveModuleTranslationsRoot(moduleDir: string) {
  const distRoot = path.join(moduleDir, 'dist', 'i18n', 'translations');
  if (fs.existsSync(distRoot)) {
    return distRoot;
  }

  const sourceRoot = path.join(moduleDir, 'i18n', 'translations');
  if (fs.existsSync(sourceRoot)) {
    return sourceRoot;
  }

  return null;
}

function loadModuleJson(moduleDir: string) {
  const moduleJsonPath = path.join(moduleDir, 'module.json');
  if (!fs.existsSync(moduleJsonPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(moduleJsonPath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as unknown;
}

function relativePath(rootDir: string, filePath: string) {
  const relative = path.relative(rootDir, filePath);
  return relative || filePath;
}

function normalizeLocaleCode(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/_/g, '-').toLowerCase();
  if (!normalized || !LOCALE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function fileDeclaresAdditionalLocales(filePath: string) {
  try {
    return fs.readFileSync(filePath, 'utf8').includes('additionalLocales');
  } catch {
    return false;
  }
}

function collectDeclaredLocales({
  value,
  owner,
  warnings
}: {
  value: unknown;
  owner: string;
  warnings: string[];
}) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    warnings.push(`${owner} additionalLocales must be an array of locale codes.`);
    return [];
  }

  const seen = new Set<string>();
  const locales: string[] = [];

  for (const entry of value) {
    const locale = normalizeLocaleCode(entry);
    if (!locale) {
      warnings.push(
        `${owner} declares invalid locale ${JSON.stringify(entry)} in additionalLocales.`
      );
      continue;
    }

    if (seen.has(locale)) {
      continue;
    }

    seen.add(locale);
    locales.push(locale);
  }

  return locales.sort((left, right) => left.localeCompare(right));
}

function sortStringMap(input: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right))
  );
}

function sortStringMapByLocale(input: FlatTranslationsByLocale) {
  return Object.fromEntries(
    Object.entries(input)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([locale, translations]) => [locale, sortStringMap(translations)])
  );
}

function sortStringMapByModuleId(input: FlatTranslationsByModuleId) {
  return Object.fromEntries(
    Object.entries(input)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([moduleId, translationsByLocale]) => [
        moduleId,
        sortStringMapByLocale(translationsByLocale)
      ])
  );
}

function sortConflictMap(input: FlatTranslationConflictsByLocale) {
  return Object.fromEntries(
    Object.entries(input)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([locale, conflicts]) => [
        locale,
        [...conflicts].sort((left, right) => {
          const byKey = left.key.localeCompare(right.key);
          if (byKey !== 0) {
            return byKey;
          }

          const byFirstPath = left.firstPath.localeCompare(right.firstPath);
          if (byFirstPath !== 0) {
            return byFirstPath;
          }

          return left.secondPath.localeCompare(right.secondPath);
        })
      ])
  );
}

function cloneStringMapByLocale(input: FlatTranslationsByLocale) {
  return Object.fromEntries(
    Object.entries(input).map(([locale, translations]) => [
      locale,
      { ...translations }
    ])
  );
}

function cloneConflictMap(input: FlatTranslationConflictsByLocale) {
  return Object.fromEntries(
    Object.entries(input).map(([locale, conflicts]) => [locale, [...conflicts]])
  );
}

function isTranslationNode(value: unknown): value is TranslationNode {
  if (typeof value === 'string') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isTranslationNode(entry));
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.values(value as Record<string, unknown>).every((entry) =>
    isTranslationNode(entry)
  );
}

function isFlatTranslationRecord(
  value: unknown
): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === 'string');
}

async function importLocaleModule(filePath: string) {
  const href = `${pathToFileURL(filePath).href}?ts=${Date.now()}`;
  return import(href);
}

function resolveModuleManifestPath(moduleDir: string, moduleJson: Record<string, unknown>) {
  const sourceEntryRaw =
    typeof moduleJson.sourceEntry === 'string' ? moduleJson.sourceEntry.trim() : '';
  if (sourceEntryRaw) {
    const absolute = path.isAbsolute(sourceEntryRaw)
      ? sourceEntryRaw
      : path.join(moduleDir, sourceEntryRaw);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  const entryRaw =
    typeof moduleJson.entry === 'string' ? moduleJson.entry.trim() : '';
  if (entryRaw) {
    const absolute = path.isAbsolute(entryRaw)
      ? entryRaw
      : path.join(moduleDir, entryRaw);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  for (const candidate of MODULE_SOURCE_ENTRY_CANDIDATES) {
    const absolute = path.join(moduleDir, candidate);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  return null;
}

function resolveThemeConfigPath(packDir: string) {
  for (const candidate of THEME_CONFIG_ENTRY_CANDIDATES) {
    const absolute = path.join(packDir, candidate);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  return null;
}

async function importOptionalDefault(filePath: string) {
  const href = `${pathToFileURL(filePath).href}?ts=${Date.now()}`;
  const imported = await import(href);
  return imported.default as Record<string, unknown> | undefined;
}

async function loadThemeAdditionalLocales({
  rootDir,
  themesDir: themesDirOverride
}: {
  rootDir: string;
  themesDir?: string;
}) {
  const themesDir = resolveThemesDir(rootDir, themesDirOverride ?? null);
  const warnings: string[] = [];
  const localeSet = new Set<string>();

  if (themesDir && fs.existsSync(themesDir)) {
    const packDirs = fs
      .readdirSync(themesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(themesDir, entry.name))
      .sort((left, right) => left.localeCompare(right));

    for (const packDir of packDirs) {
      const themeJsonPath = path.join(packDir, 'theme.json');
      if (!fs.existsSync(themeJsonPath)) {
        continue;
      }

      let themeId = path.basename(packDir);
      try {
        const themeJson = readJsonFile(themeJsonPath) as { themeId?: string };
        if (typeof themeJson?.themeId === 'string' && themeJson.themeId.trim()) {
          themeId = themeJson.themeId.trim();
        }
      } catch {
        warnings.push(
          `Theme ${themeId}: unable to parse ${relativePath(rootDir, themeJsonPath)} while collecting additionalLocales.`
        );
      }

      const configPath = resolveThemeConfigPath(packDir);
      if (!configPath) {
        continue;
      }

      try {
        const config = (await importOptionalDefault(configPath)) ?? {};
        const locales = collectDeclaredLocales({
          value: config.additionalLocales,
          owner: `Theme ${themeId}`,
          warnings
        });
        for (const locale of locales) {
          localeSet.add(locale);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(
          `Theme ${themeId}: failed loading ${relativePath(rootDir, configPath)} (${message}).`
        );
      }
    }
  }

  return {
    themesDir,
    warnings,
    locales: [...localeSet].sort((left, right) => left.localeCompare(right))
  };
}

async function loadCoreMessagesByArea(
  localesRoot: string,
  locales: string[],
  rootDir: string
): Promise<CoreMessagesByArea> {
  const messagesByArea = {
    global: {},
    admin: {},
    dashboard: {},
    login: {}
  } as CoreMessagesByArea;

  for (const area of AREAS) {
    for (const locale of locales) {
      const filePath = path.join(localesRoot, locale, `${area}.ts`);
      const imported = await importLocaleModule(filePath);
      const messages = imported.default as unknown;

      if (!isTranslationNode(messages)) {
        throw new Error(
          `Invalid default export in ${relativePath(rootDir, filePath)}. Expected a nested translation object.`
        );
      }

      messagesByArea[area][locale] = messages;
    }
  }

  return messagesByArea;
}

function collectFlatTranslations({
  registry,
  sourcePaths,
  blockedKeys,
  conflicts,
  defaultNode,
  localeNode,
  path
}: {
  registry: Record<string, string>;
  sourcePaths: Record<string, string>;
  blockedKeys: Set<string>;
  conflicts: FlatTranslationConflict[];
  defaultNode: TranslationNode;
  localeNode: TranslationNode;
  path: string[];
}) {
  if (typeof defaultNode === 'string') {
    if (typeof localeNode !== 'string') {
      return;
    }

    if (blockedKeys.has(defaultNode)) {
      return;
    }

    const existingValue = registry[defaultNode];
    const currentPath = path.join('.');

    if (existingValue === undefined) {
      registry[defaultNode] = localeNode;
      sourcePaths[defaultNode] = currentPath;
      return;
    }

    if (existingValue !== localeNode) {
      conflicts.push({
        key: defaultNode,
        firstValue: existingValue,
        secondValue: localeNode,
        firstPath: sourcePaths[defaultNode] ?? currentPath,
        secondPath: currentPath
      });
      delete registry[defaultNode];
      delete sourcePaths[defaultNode];
      blockedKeys.add(defaultNode);
    }

    return;
  }

  if (Array.isArray(defaultNode)) {
    if (!Array.isArray(localeNode)) {
      return;
    }

    for (let index = 0; index < defaultNode.length; index += 1) {
      const nextDefaultNode = defaultNode[index];
      const nextLocaleNode = localeNode[index];

      if (nextDefaultNode === undefined || nextLocaleNode === undefined) {
        continue;
      }

      collectFlatTranslations({
        registry,
        sourcePaths,
        blockedKeys,
        conflicts,
        defaultNode: nextDefaultNode,
        localeNode: nextLocaleNode,
        path: [...path, String(index)]
      });
    }

    return;
  }

  if (
    !defaultNode ||
    typeof defaultNode !== 'object' ||
    !localeNode ||
    typeof localeNode !== 'object' ||
    Array.isArray(localeNode)
  ) {
    return;
  }

  const defaultRecord = defaultNode as Record<string, TranslationNode>;
  const localeRecord = localeNode as Record<string, TranslationNode>;

  for (const key of Object.keys(defaultRecord)) {
    const nextDefaultNode = defaultRecord[key];
    const nextLocaleNode = localeRecord[key];

    if (nextDefaultNode === undefined || nextLocaleNode === undefined) {
      continue;
    }

    collectFlatTranslations({
      registry,
      sourcePaths,
      blockedKeys,
      conflicts,
      defaultNode: nextDefaultNode,
      localeNode: nextLocaleNode,
      path: [...path, key]
    });
  }
}

function buildCoreFlatTranslationsByLocale(coreMessagesByArea: CoreMessagesByArea) {
  const translationsByLocale: FlatTranslationsByLocale = {};
  const conflictsByLocale: FlatTranslationConflictsByLocale = {};
  const sourcePathsByLocale: FlatTranslationSourcesByLocale = {};
  const blockedKeysByLocale: Record<string, Set<string>> = {};

  for (const area of AREAS) {
    const localeMap = coreMessagesByArea[area];
    const defaultMessages = localeMap[DEFAULT_LOCALE];

    if (!defaultMessages) {
      continue;
    }

    for (const locale of Object.keys(localeMap).sort((left, right) =>
      left.localeCompare(right)
    )) {
      const registry = (translationsByLocale[locale] ??= {});
      const sourcePaths = (sourcePathsByLocale[locale] ??=
        Object.create(null) as Record<string, string>);
      const blockedKeys = (blockedKeysByLocale[locale] ??= new Set<string>());
      const conflicts = (conflictsByLocale[locale] ??= []);

      collectFlatTranslations({
        registry,
        sourcePaths,
        blockedKeys,
        conflicts,
        defaultNode: defaultMessages,
        localeNode: localeMap[locale],
        path: [area, locale]
      });
    }
  }

  return {
    translationsByLocale: sortStringMapByLocale(translationsByLocale),
    conflictsByLocale: sortConflictMap(conflictsByLocale),
    sourcePathsByLocale: sortStringMapByLocale(sourcePathsByLocale)
  };
}

async function loadModuleFlatTranslations({
  rootDir,
  modulesDir: modulesDirOverride
}: {
  rootDir: string;
  modulesDir?: string;
}) {
  const modulesDir = resolveModulesDir(rootDir, modulesDirOverride ?? null);
  const translationsByLocale: FlatTranslationsByLocale = {};
  const translationsByModuleId: FlatTranslationsByModuleId = {};
  const sourcePathsByLocale: FlatTranslationSourcesByLocale = {};
  const warnings: string[] = [];
  const declaredLocaleSet = new Set<string>();

  if (modulesDir && fs.existsSync(modulesDir)) {
    const moduleDirs = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(modulesDir, entry.name))
      .sort((left, right) => left.localeCompare(right));

    for (const moduleDir of moduleDirs) {
      const moduleJson = loadModuleJson(moduleDir);
      const moduleId =
        typeof moduleJson?.moduleId === 'string' ? moduleJson.moduleId : null;
      if (!moduleId) {
        continue;
      }

      if (!moduleId.startsWith('mod.')) {
        warnings.push(
          `Module ${moduleId} does not follow "mod.*" namespace. Skipping flat translations.`
        );
        continue;
      }

      if (moduleJson) {
        const manifestPath = resolveModuleManifestPath(moduleDir, moduleJson);
        if (manifestPath && fileDeclaresAdditionalLocales(manifestPath)) {
          try {
            const manifest = (await importOptionalDefault(manifestPath)) ?? {};
            const locales = collectDeclaredLocales({
              value: manifest.additionalLocales,
              owner: `Module ${moduleId}`,
              warnings
            });
            for (const locale of locales) {
              declaredLocaleSet.add(locale);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            warnings.push(
              `Module ${moduleId}: failed loading ${relativePath(rootDir, manifestPath)} (${message}).`
            );
          }
        }
      }

      const translationsRoot = resolveModuleTranslationsRoot(moduleDir);
      if (!translationsRoot) {
        continue;
      }

      const localeFiles = fs
        .readdirSync(translationsRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

      for (const fileName of localeFiles) {
        const locale = fileName.replace(/\.json$/i, '');
        const filePath = path.join(translationsRoot, fileName);
        const payload = readJsonFile(filePath);

        if (!isFlatTranslationRecord(payload)) {
          throw new Error(
            `Invalid flat translations in ${relativePath(rootDir, filePath)}. Expected a JSON object shaped like { "English key": "Translated value" }.`
          );
        }

        const registry = (translationsByLocale[locale] ??= {});
        const moduleRegistry = ((translationsByModuleId[moduleId] ??=
          Object.create(null) as FlatTranslationsByLocale)[locale] ??=
          Object.create(null) as Record<string, string>);
        const sourcePaths = (sourcePathsByLocale[locale] ??=
          Object.create(null) as Record<string, string>);

        for (const [key, value] of Object.entries(payload).sort(
          ([left], [right]) => left.localeCompare(right)
        )) {
          const existingValue = registry[key];
          moduleRegistry[key] = value;

          if (existingValue === undefined) {
            registry[key] = value;
            sourcePaths[key] = relativePath(rootDir, filePath);
            continue;
          }

          if (existingValue !== value) {
            throw new Error(
              `Conflicting module flat translation for locale "${locale}" key "${key}" between ${sourcePaths[key]} and ${relativePath(rootDir, filePath)}.`
            );
          }
        }
      }
    }
  }

  return {
    declaredLocales: [...declaredLocaleSet].sort((left, right) =>
      left.localeCompare(right)
    ),
    modulesDir,
    warnings,
    translationsByLocale: sortStringMapByLocale(translationsByLocale),
    translationsByModuleId: sortStringMapByModuleId(translationsByModuleId),
    sourcePathsByLocale: sortStringMapByLocale(sourcePathsByLocale)
  };
}

function mergeFlatTranslationsByLocale({
  coreTranslationsByLocale,
  coreConflictsByLocale,
  coreSourcePathsByLocale,
  moduleTranslationsByLocale,
  moduleSourcePathsByLocale
}: {
  coreTranslationsByLocale: FlatTranslationsByLocale;
  coreConflictsByLocale: FlatTranslationConflictsByLocale;
  coreSourcePathsByLocale: FlatTranslationSourcesByLocale;
  moduleTranslationsByLocale: FlatTranslationsByLocale;
  moduleSourcePathsByLocale: FlatTranslationSourcesByLocale;
}) {
  const translationsByLocale = cloneStringMapByLocale(coreTranslationsByLocale);
  const conflictsByLocale = cloneConflictMap(coreConflictsByLocale);
  const sourcePathsByLocale = cloneStringMapByLocale(coreSourcePathsByLocale);
  const locales = Array.from(
    new Set([
      ...Object.keys(coreTranslationsByLocale),
      ...Object.keys(moduleTranslationsByLocale),
      ...Object.keys(coreConflictsByLocale)
    ])
  ).sort((left, right) => left.localeCompare(right));

  for (const locale of locales) {
    const registry = (translationsByLocale[locale] ??= {});
    const sourcePaths = (sourcePathsByLocale[locale] ??=
      Object.create(null) as Record<string, string>);
    const conflicts = (conflictsByLocale[locale] ??= []);
    const moduleTranslations = moduleTranslationsByLocale[locale] ?? {};
    const moduleSourcePaths = moduleSourcePathsByLocale[locale] ?? {};

    for (const [key, value] of Object.entries(moduleTranslations).sort(
      ([left], [right]) => left.localeCompare(right)
    )) {
      const existingValue = registry[key];

      if (existingValue === undefined) {
        registry[key] = value;
        sourcePaths[key] =
          moduleSourcePaths[key] ?? `modules.translations.${locale}`;
        continue;
      }

      if (existingValue !== value) {
        conflicts.push({
          key,
          firstValue: existingValue,
          secondValue: value,
          firstPath: sourcePaths[key] ?? `core.translations.${locale}`,
          secondPath:
            moduleSourcePaths[key] ?? `modules.translations.${locale}`
        });
      }
    }
  }

  return {
    translationsByLocale: sortStringMapByLocale(translationsByLocale),
    conflictsByLocale: sortConflictMap(conflictsByLocale)
  };
}

function hasFlatTranslationConflicts(
  conflictsByLocale: FlatTranslationConflictsByLocale
) {
  return Object.values(conflictsByLocale).some((conflicts) => conflicts.length > 0);
}

function formatFlatTranslationConflictError(
  conflictsByLocale: FlatTranslationConflictsByLocale
) {
  const lines = [
    'Conflicting flat translations detected during i18n:prepare.'
  ];

  for (const [locale, conflicts] of Object.entries(conflictsByLocale)) {
    if (conflicts.length === 0) {
      continue;
    }

    lines.push(`Locale "${locale}":`);

    for (const conflict of conflicts) {
      lines.push(
        `- key "${conflict.key}" maps to both "${conflict.firstValue}" (${conflict.firstPath}) and "${conflict.secondValue}" (${conflict.secondPath})`
      );
    }
  }

  lines.push(
    'Make each locale/key pair resolve to a single translated value before rerunning pnpm i18n:prepare.'
  );

  return lines.join('\n');
}

function createSupportedLocalesBody(locales: string[]) {
  return `// Auto-generated by pnpm i18n:prepare. Do not edit.\nexport const SUPPORTED_LOCALES = ${JSON.stringify(
    locales
  )} as const;\n`;
}

function createCoreMessagesBody(locales: string[]) {
  const importLines: string[] = [
    `// Auto-generated by pnpm i18n:prepare. Do not edit.`,
    `import type { GlobalMessages } from './messages/global';`,
    `import type { AdminMessages } from './messages/admin';`,
    `import type { DashboardMessages } from './messages/dashboard';`,
    `import type { LoginMessages } from './messages/login';`
  ];

  const registryLines: string[] = ['', 'export const coreMessagesByArea = {'];

  for (const area of AREAS) {
    registryLines.push(`  ${area}: {`);

    for (const locale of locales) {
      const alias = sanitizeImportAlias(`${locale}_${area}`);
      importLines.push(`import ${alias} from './locales/${locale}/${area}';`);
      registryLines.push(`    ${locale}: ${alias},`);
    }

    registryLines.push('  },');
  }

  registryLines.push(
    `} satisfies {`,
    `  global: Record<string, GlobalMessages>;`,
    `  admin: Record<string, AdminMessages>;`,
    `  dashboard: Record<string, DashboardMessages>;`,
    `  login: Record<string, LoginMessages>;`,
    `};`,
    ''
  );

  return `${importLines.join('\n')}\n${registryLines.join('\n')}`;
}

function createTranslationsBody({
  translationsByLocale,
  conflictsByLocale
}: {
  translationsByLocale: FlatTranslationsByLocale;
  conflictsByLocale: FlatTranslationConflictsByLocale;
}) {
  return `// Auto-generated by pnpm i18n:prepare. Do not edit.
export type FlatTranslationConflict = {
  key: string;
  firstValue: string;
  secondValue: string;
  firstPath: string;
  secondPath: string;
};

export const flatTranslationsByLocale = ${JSON.stringify(
    translationsByLocale,
    null,
    2
  )} satisfies Record<string, Record<string, string>>;

export const flatTranslationConflictsByLocale = ${JSON.stringify(
    conflictsByLocale,
    null,
    2
  )} satisfies Record<string, FlatTranslationConflict[]>;
`;
}

function createModuleFlatTranslationsBody(
  translationsByModuleId: FlatTranslationsByModuleId
) {
  return `// Auto-generated by pnpm i18n:prepare. Do not edit.
import type { FlatTranslationsByModuleId } from '@skitsaas/sdk';

export const flatTranslationsByModuleId: FlatTranslationsByModuleId = ${JSON.stringify(
    translationsByModuleId,
    null,
    2
  )};
`;
}

export type I18nPrepareOptions = {
  rootDir?: string;
  modulesDir?: string;
  themesDir?: string;
  logWarnings?: boolean;
};

export type I18nPrepareResult = {
  rootDir: string;
  localesRoot: string;
  locales: string[];
  supportedLocalesPath: string;
  coreMessagesPath: string;
  translationsPath: string;
  moduleFlatTranslationsPath: string;
  modulesDir: string | null;
  themesDir: string | null;
  warnings: string[];
};

export async function runI18nPrepare(
  options: I18nPrepareOptions = {}
): Promise<I18nPrepareResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const localesRoot = resolveLocalesRoot(rootDir);

  if (!fs.existsSync(localesRoot)) {
    throw new Error(
      `Missing locale root: ${path.relative(rootDir, localesRoot) || localesRoot}`
    );
  }

  const coreLocales = fs
    .readdirSync(localesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (coreLocales.length === 0) {
    throw new Error('No locale directories found under lib/i18n/locales.');
  }

  if (!coreLocales.includes(DEFAULT_LOCALE)) {
    throw new Error(
      `Default locale "${DEFAULT_LOCALE}" is missing from lib/i18n/locales.`
    );
  }

  for (const locale of coreLocales) {
    for (const area of AREAS) {
      const filePath = path.join(localesRoot, locale, `${area}.ts`);
      if (!fs.existsSync(filePath)) {
        throw new Error(
          `Missing ${area}.ts for locale "${locale}" at ${relativePath(rootDir, filePath)}`
        );
      }
    }
  }

  const supportedLocalesPath = path.join(
    rootDir,
    'lib',
    'i18n',
    'supported-locales.generated.ts'
  );
  const coreMessagesPath = path.join(
    rootDir,
    'lib',
    'i18n',
    'core-messages.generated.ts'
  );
  const translationsPath = path.join(
    rootDir,
    'lib',
    'i18n',
    'translations.generated.ts'
  );
  const moduleFlatTranslationsPath = path.join(
    rootDir,
    'lib',
    'i18n',
    'module-flat-translations.generated.ts'
  );

  const coreMessagesByArea = await loadCoreMessagesByArea(
    localesRoot,
    coreLocales,
    rootDir
  );
  const coreFlatTranslations = buildCoreFlatTranslationsByLocale(coreMessagesByArea);
  const moduleFlatTranslations = await loadModuleFlatTranslations({
    rootDir,
    modulesDir: options.modulesDir
  });
  const themeLocales = await loadThemeAdditionalLocales({
    rootDir,
    themesDir: options.themesDir
  });
  const mergedFlatTranslations = mergeFlatTranslationsByLocale({
    coreTranslationsByLocale: coreFlatTranslations.translationsByLocale,
    coreConflictsByLocale: coreFlatTranslations.conflictsByLocale,
    coreSourcePathsByLocale: coreFlatTranslations.sourcePathsByLocale,
    moduleTranslationsByLocale: moduleFlatTranslations.translationsByLocale,
    moduleSourcePathsByLocale: moduleFlatTranslations.sourcePathsByLocale
  });
  const locales = Array.from(
    new Set([
      ...coreLocales,
      ...themeLocales.locales,
      ...moduleFlatTranslations.declaredLocales,
      ...Object.keys(moduleFlatTranslations.translationsByLocale)
    ])
  ).sort((left, right) => left.localeCompare(right));

  if (hasFlatTranslationConflicts(mergedFlatTranslations.conflictsByLocale)) {
    throw new Error(
      formatFlatTranslationConflictError(
        mergedFlatTranslations.conflictsByLocale
      )
    );
  }

  ensureOutputDir(supportedLocalesPath);
  fs.writeFileSync(
    supportedLocalesPath,
    createSupportedLocalesBody(locales),
    'utf8'
  );

  ensureOutputDir(coreMessagesPath);
  fs.writeFileSync(coreMessagesPath, createCoreMessagesBody(coreLocales), 'utf8');

  ensureOutputDir(translationsPath);
  fs.writeFileSync(
    translationsPath,
    createTranslationsBody(mergedFlatTranslations),
    'utf8'
  );

  ensureOutputDir(moduleFlatTranslationsPath);
  fs.writeFileSync(
    moduleFlatTranslationsPath,
    createModuleFlatTranslationsBody(moduleFlatTranslations.translationsByModuleId),
    'utf8'
  );

  const warnings = [...moduleFlatTranslations.warnings, ...themeLocales.warnings];

  if (warnings.length && options.logWarnings !== false) {
    console.warn('[i18n:prepare] warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  return {
    rootDir,
    localesRoot,
    locales,
    supportedLocalesPath,
    coreMessagesPath,
    translationsPath,
    moduleFlatTranslationsPath,
    modulesDir: moduleFlatTranslations.modulesDir,
    themesDir: themeLocales.themesDir,
    warnings
  };
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  runI18nPrepare().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
