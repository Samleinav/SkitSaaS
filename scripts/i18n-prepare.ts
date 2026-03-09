import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AREAS = ['global', 'admin', 'dashboard', 'login'] as const;
const DEFAULT_LOCALE = 'en';

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

function loadModuleId(moduleDir: string) {
  const moduleJsonPath = path.join(moduleDir, 'module.json');
  if (!fs.existsSync(moduleJsonPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(moduleJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { moduleId?: string };
    return parsed.moduleId ?? null;
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

function loadModuleFlatTranslations({
  rootDir,
  modulesDir: modulesDirOverride
}: {
  rootDir: string;
  modulesDir?: string;
}) {
  const modulesDir = resolveModulesDir(rootDir, modulesDirOverride ?? null);
  const translationsByLocale: FlatTranslationsByLocale = {};
  const sourcePathsByLocale: FlatTranslationSourcesByLocale = {};
  const warnings: string[] = [];

  if (modulesDir && fs.existsSync(modulesDir)) {
    const moduleDirs = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(modulesDir, entry.name))
      .sort((left, right) => left.localeCompare(right));

    for (const moduleDir of moduleDirs) {
      const moduleId = loadModuleId(moduleDir);
      if (!moduleId) {
        continue;
      }

      if (!moduleId.startsWith('mod.')) {
        warnings.push(
          `Module ${moduleId} does not follow "mod.*" namespace. Skipping flat translations.`
        );
        continue;
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
        const sourcePaths = (sourcePathsByLocale[locale] ??=
          Object.create(null) as Record<string, string>);

        for (const [key, value] of Object.entries(payload).sort(
          ([left], [right]) => left.localeCompare(right)
        )) {
          const existingValue = registry[key];

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
    modulesDir,
    warnings,
    translationsByLocale: sortStringMapByLocale(translationsByLocale),
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

export type I18nPrepareOptions = {
  rootDir?: string;
  modulesDir?: string;
  logWarnings?: boolean;
};

export type I18nPrepareResult = {
  rootDir: string;
  localesRoot: string;
  locales: string[];
  supportedLocalesPath: string;
  coreMessagesPath: string;
  translationsPath: string;
  modulesDir: string | null;
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

  const locales = fs
    .readdirSync(localesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (locales.length === 0) {
    throw new Error('No locale directories found under lib/i18n/locales.');
  }

  if (!locales.includes(DEFAULT_LOCALE)) {
    throw new Error(
      `Default locale "${DEFAULT_LOCALE}" is missing from lib/i18n/locales.`
    );
  }

  for (const locale of locales) {
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

  const coreMessagesByArea = await loadCoreMessagesByArea(
    localesRoot,
    locales,
    rootDir
  );
  const coreFlatTranslations = buildCoreFlatTranslationsByLocale(coreMessagesByArea);
  const moduleFlatTranslations = loadModuleFlatTranslations({
    rootDir,
    modulesDir: options.modulesDir
  });
  const mergedFlatTranslations = mergeFlatTranslationsByLocale({
    coreTranslationsByLocale: coreFlatTranslations.translationsByLocale,
    coreConflictsByLocale: coreFlatTranslations.conflictsByLocale,
    coreSourcePathsByLocale: coreFlatTranslations.sourcePathsByLocale,
    moduleTranslationsByLocale: moduleFlatTranslations.translationsByLocale,
    moduleSourcePathsByLocale: moduleFlatTranslations.sourcePathsByLocale
  });

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
  fs.writeFileSync(coreMessagesPath, createCoreMessagesBody(locales), 'utf8');

  ensureOutputDir(translationsPath);
  fs.writeFileSync(
    translationsPath,
    createTranslationsBody(mergedFlatTranslations),
    'utf8'
  );

  if (moduleFlatTranslations.warnings.length && options.logWarnings !== false) {
    console.warn('[i18n:prepare] warnings:');
    for (const warning of moduleFlatTranslations.warnings) {
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
    modulesDir: moduleFlatTranslations.modulesDir,
    warnings: moduleFlatTranslations.warnings
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
