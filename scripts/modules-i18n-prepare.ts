import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
type ModuleMessageTree = Record<string, unknown>;
type ModuleMessagesByLocale = Record<string, Record<string, ModuleMessageTree>>;
type ModuleMessagesByArea = Record<string, ModuleMessagesByLocale>;

const AREAS = ['global', 'dashboard', 'admin', 'login'] as const;

function createEmptyMessages(): ModuleMessagesByArea {
  const empty: ModuleMessagesByArea = {};
  for (const area of AREAS) {
    empty[area] = {};
  }
  return empty;
}

function readJsonFile(filePath: string): ModuleMessageTree | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as ModuleMessageTree;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function resolveModuleI18nRoot(moduleDir: string) {
  const distRoot = path.join(moduleDir, 'dist', 'i18n');
  if (fs.existsSync(distRoot)) {
    return distRoot;
  }

  const sourceRoot = path.join(moduleDir, 'i18n');
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

function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

export type ModulesI18nPrepareOptions = {
  rootDir?: string;
  modulesDir?: string;
  logWarnings?: boolean;
};

export type ModulesI18nPrepareResult = {
  rootDir: string;
  modulesDir: string | null;
  outputPath: string;
  warnings: string[];
};

export function runModulesI18nPrepare(
  options: ModulesI18nPrepareOptions = {}
): ModulesI18nPrepareResult {
  const rootDir = options.rootDir ?? process.cwd();
  const modulesDir = resolveModulesDir(rootDir, options.modulesDir ?? null);
  const output = createEmptyMessages();
  const warnings: string[] = [];

  if (modulesDir && fs.existsSync(modulesDir)) {
    const moduleDirs = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(modulesDir, entry.name));

    for (const moduleDir of moduleDirs) {
      const moduleId = loadModuleId(moduleDir);
      if (!moduleId) {
        continue;
      }

      if (!moduleId.startsWith('mod.')) {
        warnings.push(
          `Module ${moduleId} does not follow "mod.*" namespace. Skipping i18n.`
        );
        continue;
      }

      const i18nRoot = resolveModuleI18nRoot(moduleDir);
      if (!i18nRoot) {
        continue;
      }

      for (const area of AREAS) {
        const areaDir = path.join(i18nRoot, area);
        if (!fs.existsSync(areaDir)) {
          continue;
        }

        const localeFiles = fs
          .readdirSync(areaDir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
          .map((entry) => entry.name);

        for (const fileName of localeFiles) {
          const locale = fileName.replace(/\.json$/i, '');
          const localeFile = path.join(areaDir, fileName);
          const messageTree = readJsonFile(localeFile);
          if (!messageTree) {
            warnings.push(
              `Invalid JSON in ${path.relative(rootDir, localeFile)}`
            );
            continue;
          }

          if (!output[area][locale]) {
            output[area][locale] = {};
          }

          output[area][locale][moduleId] = messageTree;
        }
      }
    }
  }

  const generatedPath = path.join(
    rootDir,
    'lib',
    'i18n',
    'messages',
    'modules.generated.ts'
  );
  const fileBody = `import type { ModuleMessagesByArea } from '../module-messages';\n\nexport const moduleMessagesByArea: ModuleMessagesByArea = ${JSON.stringify(
    output,
    null,
    2
  )};\n`;

  ensureOutputDir(generatedPath);
  fs.writeFileSync(generatedPath, fileBody, 'utf8');

  if (warnings.length && options.logWarnings !== false) {
    console.warn('[modules-i18n-prepare] warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  return {
    rootDir,
    modulesDir,
    outputPath: generatedPath,
    warnings
  };
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  runModulesI18nPrepare();
}
