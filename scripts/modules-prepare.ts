import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ModuleJson = {
  moduleId?: string;
  moduleMode?: string;
  entry?: string;
  sourceEntry?: string;
  buildCommand?: string;
  sdkRange?: string;
  templatePack?: {
    defaultEntry?: string;
    overrideEntry?: string;
    contractRange?: string;
  };
  db?: {
    schemaVersion?: number;
    migrationsDir?: string;
    schemaEntry?: string;
    seedEntry?: string;
  };
};

export type ModuleMode = 'prebuilt' | 'source-host' | 'source-package';

type ResolvedModuleDb = {
  schemaVersion: number;
  migrationsDir?: string;
  schemaEntry?: string;
  seedEntry?: string;
};

type ResolvedModuleTemplatePack = {
  defaultEntryPath?: string;
  overrideEntryPath?: string;
  contractRange?: string;
};

export type ResolvedModule = {
  moduleId: string;
  entryPath: string;
  importPath: string;
  importName: string;
  mode: ModuleMode;
  sdkRange: string | null;
  sdkCompatible: boolean | null;
  db: ResolvedModuleDb | null;
  templatePack: ResolvedModuleTemplatePack | null;
};

export type ModulePrepareConfigErrorCode =
  | 'module_mode_missing'
  | 'module_mode_invalid'
  | 'module_entry_missing'
  | 'module_entry_not_found'
  | 'module_source_entry_missing'
  | 'module_source_entry_not_found'
  | 'module_build_command_missing'
  | 'module_template_pack_invalid'
  | 'module_template_pack_entry_not_found';

export type ModulePrepareConfigError = {
  code: ModulePrepareConfigErrorCode;
  moduleId: string;
  moduleDir: string;
  message: string;
};

const MODULE_MODES = new Set<ModuleMode>([
  'prebuilt',
  'source-host',
  'source-package'
]);

const DEFAULT_SOURCE_ENTRY_CANDIDATES = [
  'src/manifest.ts',
  'src/manifest.tsx',
  'src/manifest.js',
  'src/manifest.mjs'
];

const SEMVER_REGEX =
  /^v?(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?(?:-(?<prerelease>[0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

type Semver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

type Comparator = {
  op: '<' | '<=' | '>' | '>=' | '=';
  version: Semver;
};

type CompatibilityResult = {
  sdkRange: string | null;
  sdkCompatible: boolean | null;
};

function toPosixPath(value: string) {
  return value.replace(/\\/g, '/');
}

function pushConfigError({
  configErrors,
  moduleId,
  moduleDir,
  code,
  message
}: {
  configErrors: ModulePrepareConfigError[];
  moduleId: string;
  moduleDir: string;
  code: ModulePrepareConfigErrorCode;
  message: string;
}) {
  configErrors.push({
    code,
    moduleId,
    moduleDir,
    message
  });
}

function resolveModuleMode({
  moduleId,
  moduleDir,
  moduleJson,
  configErrors
}: {
  moduleId: string;
  moduleDir: string;
  moduleJson: ModuleJson;
  configErrors: ModulePrepareConfigError[];
}): ModuleMode | null {
  const modeRaw =
    typeof moduleJson.moduleMode === 'string' ? moduleJson.moduleMode.trim() : '';
  if (!modeRaw) {
    pushConfigError({
      configErrors,
      moduleId,
      moduleDir,
      code: 'module_mode_missing',
      message: `Module ${moduleId} is missing moduleMode in module.json. Use one of: prebuilt, source-host, source-package.`
    });
    return null;
  }

  if (!MODULE_MODES.has(modeRaw as ModuleMode)) {
    pushConfigError({
      configErrors,
      moduleId,
      moduleDir,
      code: 'module_mode_invalid',
      message: `Module ${moduleId} has invalid moduleMode="${modeRaw}". Use one of: prebuilt, source-host, source-package.`
    });
    return null;
  }

  return modeRaw as ModuleMode;
}

function resolveRelativePath(moduleDir: string, value: string) {
  return path.isAbsolute(value) ? value : path.join(moduleDir, value);
}

function resolvePrebuiltEntry({
  moduleId,
  moduleDir,
  moduleJson,
  moduleMode,
  configErrors
}: {
  moduleId: string;
  moduleDir: string;
  moduleJson: ModuleJson;
  moduleMode: Extract<ModuleMode, 'prebuilt' | 'source-package'>;
  configErrors: ModulePrepareConfigError[];
}) {
  const raw = typeof moduleJson.entry === 'string' ? moduleJson.entry.trim() : '';
  if (!raw) {
    pushConfigError({
      configErrors,
      moduleId,
      moduleDir,
      code: 'module_entry_missing',
      message: `Module ${moduleId} (moduleMode="${moduleMode}") must declare entry in module.json.`
    });
    return null;
  }

  const absolute = resolveRelativePath(moduleDir, raw);
  if (!fs.existsSync(absolute)) {
    pushConfigError({
      configErrors,
      moduleId,
      moduleDir,
      code: 'module_entry_not_found',
      message: `Module ${moduleId} entry="${raw}" does not exist. Build the module first or fix module.json.`
    });
    return null;
  }

  return absolute;
}

function resolveSourceHostEntry({
  moduleId,
  moduleDir,
  moduleJson,
  configErrors
}: {
  moduleId: string;
  moduleDir: string;
  moduleJson: ModuleJson;
  configErrors: ModulePrepareConfigError[];
}) {
  const sourceEntryRaw =
    typeof moduleJson.sourceEntry === 'string' ? moduleJson.sourceEntry.trim() : '';
  if (sourceEntryRaw) {
    const absolute = resolveRelativePath(moduleDir, sourceEntryRaw);
    if (fs.existsSync(absolute)) {
      return absolute;
    }

    pushConfigError({
      configErrors,
      moduleId,
      moduleDir,
      code: 'module_source_entry_not_found',
      message: `Module ${moduleId} sourceEntry="${sourceEntryRaw}" does not exist.`
    });
    return null;
  }

  for (const candidate of DEFAULT_SOURCE_ENTRY_CANDIDATES) {
    const absolute = path.join(moduleDir, candidate);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  pushConfigError({
    configErrors,
    moduleId,
    moduleDir,
    code: 'module_source_entry_missing',
    message: `Module ${moduleId} (moduleMode="source-host") requires sourceEntry or one of the default source candidates (${DEFAULT_SOURCE_ENTRY_CANDIDATES.join(', ')}).`
  });

  return null;
}

function resolveModuleEntry({
  moduleId,
  moduleDir,
  moduleJson,
  moduleMode,
  configErrors
}: {
  moduleId: string;
  moduleDir: string;
  moduleJson: ModuleJson;
  moduleMode: ModuleMode;
  configErrors: ModulePrepareConfigError[];
}) {
  if (moduleMode === 'source-host') {
    const entryPath = resolveSourceHostEntry({
      moduleId,
      moduleDir,
      moduleJson,
      configErrors
    });
    if (!entryPath) {
      return null;
    }

    return {
      entryPath,
      mode: moduleMode
    };
  }

  const entryPath = resolvePrebuiltEntry({
    moduleId,
    moduleDir,
    moduleJson,
    moduleMode,
    configErrors
  });
  if (!entryPath) {
    return null;
  }

  return {
    entryPath,
    mode: moduleMode
  };
}

function loadModuleJson(moduleDir: string): ModuleJson | null {
  const moduleJsonPath = path.join(moduleDir, 'module.json');
  if (!fs.existsSync(moduleJsonPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(moduleJsonPath, 'utf8');
    return JSON.parse(raw) as ModuleJson;
  } catch {
    return null;
  }
}

function stripExtension(value: string) {
  return value.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
}

function resolveImportPath(rootDir: string, entryPath: string) {
  const relative = toPosixPath(path.relative(rootDir, entryPath));
  const withoutExt = stripExtension(relative);
  if (!withoutExt.startsWith('..')) {
    return `@/${withoutExt}`;
  }

  const normalized = withoutExt.startsWith('.') ? withoutExt : `./${withoutExt}`;
  return normalized;
}

function resolveModuleDbConfig({
  rootDir,
  moduleDir,
  moduleId,
  moduleJson,
  warnings
}: {
  rootDir: string;
  moduleDir: string;
  moduleId: string;
  moduleJson: ModuleJson;
  warnings: string[];
}): ResolvedModuleDb | null {
  const dbConfig = moduleJson.db;
  if (!dbConfig || typeof dbConfig !== 'object' || Array.isArray(dbConfig)) {
    return null;
  }

  const resolvePathField = (
    value: string | undefined,
    field: 'migrationsDir' | 'schemaEntry' | 'seedEntry'
  ) => {
    if (!value || !value.trim()) {
      return undefined;
    }

    const absolute = path.isAbsolute(value)
      ? value
      : path.join(moduleDir, value);
    if (!fs.existsSync(absolute)) {
      warnings.push(
        `Module ${moduleId} defines db.${field}="${value}" but path does not exist.`
      );
      return undefined;
    }

    return toPosixPath(path.relative(rootDir, absolute));
  };

  let schemaVersion = 0;
  if (dbConfig.schemaVersion !== undefined) {
    if (
      typeof dbConfig.schemaVersion === 'number' &&
      Number.isInteger(dbConfig.schemaVersion) &&
      dbConfig.schemaVersion >= 0
    ) {
      schemaVersion = dbConfig.schemaVersion;
    } else {
      warnings.push(
        `Module ${moduleId} has invalid db.schemaVersion. Expected integer >= 0.`
      );
    }
  }

  const migrationsDir = resolvePathField(
    dbConfig.migrationsDir,
    'migrationsDir'
  );
  const schemaEntry = resolvePathField(dbConfig.schemaEntry, 'schemaEntry');
  const seedEntry = resolvePathField(dbConfig.seedEntry, 'seedEntry');

  return {
    schemaVersion,
    ...(migrationsDir ? { migrationsDir } : {}),
    ...(schemaEntry ? { schemaEntry } : {}),
    ...(seedEntry ? { seedEntry } : {})
  };
}

function resolveModuleTemplatePackConfig({
  rootDir,
  moduleDir,
  moduleId,
  moduleJson,
  configErrors
}: {
  rootDir: string;
  moduleDir: string;
  moduleId: string;
  moduleJson: ModuleJson;
  configErrors: ModulePrepareConfigError[];
}): ResolvedModuleTemplatePack | null {
  const templatePackRaw = moduleJson.templatePack;
  if (
    !templatePackRaw ||
    typeof templatePackRaw !== 'object' ||
    Array.isArray(templatePackRaw)
  ) {
    return null;
  }

  const normalizeEntryPath = (
    value: unknown,
    field: 'defaultEntry' | 'overrideEntry'
  ) => {
    if (value === undefined) {
      return null;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
      pushConfigError({
        configErrors,
        moduleId,
        moduleDir,
        code: 'module_template_pack_invalid',
        message: `Module ${moduleId} templatePack.${field} must be a non-empty string when provided.`
      });
      return null;
    }

    const absolute = resolveRelativePath(moduleDir, value.trim());
    if (!fs.existsSync(absolute)) {
      pushConfigError({
        configErrors,
        moduleId,
        moduleDir,
        code: 'module_template_pack_entry_not_found',
        message: `Module ${moduleId} templatePack.${field}="${value.trim()}" does not exist.`
      });
      return null;
    }

    return toPosixPath(path.relative(rootDir, absolute));
  };

  const defaultEntryPath = normalizeEntryPath(
    templatePackRaw.defaultEntry,
    'defaultEntry'
  );
  const overrideEntryPath = normalizeEntryPath(
    templatePackRaw.overrideEntry,
    'overrideEntry'
  );

  if (!defaultEntryPath && !overrideEntryPath) {
    pushConfigError({
      configErrors,
      moduleId,
      moduleDir,
      code: 'module_template_pack_invalid',
      message: `Module ${moduleId} templatePack must include defaultEntry or overrideEntry.`
    });
    return null;
  }

  const contractRange =
    typeof templatePackRaw.contractRange === 'string' &&
    templatePackRaw.contractRange.trim().length > 0
      ? templatePackRaw.contractRange.trim()
      : undefined;

  return {
    ...(defaultEntryPath ? { defaultEntryPath } : {}),
    ...(overrideEntryPath ? { overrideEntryPath } : {}),
    ...(contractRange ? { contractRange } : {})
  };
}

function toImportName(moduleId: string) {
  const safe = moduleId.replace(/[^a-zA-Z0-9_$]/g, '_');
  return `mod_${safe}`;
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

export type ModulesPrepareOptions = {
  rootDir?: string;
  modulesDir?: string;
  hostSdkVersion?: string | null;
  strictCompatibility?: boolean;
  logWarnings?: boolean;
};

export type ModulesPrepareResult = {
  rootDir: string;
  modulesDir: string | null;
  hostSdkVersion: string | null;
  strictCompatibility: boolean;
  outputPath: string;
  warnings: string[];
  configErrors: ModulePrepareConfigError[];
  compatibilityErrors: string[];
  resolvedModules: ResolvedModule[];
};

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

function resolveStrictCompatibility(options: ModulesPrepareOptions) {
  if (typeof options.strictCompatibility === 'boolean') {
    return options.strictCompatibility;
  }

  return parseBooleanFlag(process.env.MODULES_PREPARE_STRICT, false);
}

function parseSemver(value: string): Semver | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(SEMVER_REGEX);
  if (!match || !match.groups) {
    return null;
  }

  const major = Number(match.groups.major ?? '0');
  const minor = Number(match.groups.minor ?? '0');
  const patch = Number(match.groups.patch ?? '0');
  if (![major, minor, patch].every((segment) => Number.isInteger(segment))) {
    return null;
  }

  const prereleaseRaw = match.groups.prerelease?.trim() ?? '';
  const prerelease = prereleaseRaw
    ? prereleaseRaw.split('.').map((segment) => segment.trim()).filter(Boolean)
    : [];

  return {
    major,
    minor,
    patch,
    prerelease
  };
}

function comparePrerelease(a: string[], b: string[]) {
  if (a.length === 0 && b.length === 0) {
    return 0;
  }
  if (a.length === 0) {
    return 1;
  }
  if (b.length === 0) {
    return -1;
  }

  const maxLength = Math.max(a.length, b.length);
  for (let index = 0; index < maxLength; index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === undefined) {
      return -1;
    }
    if (right === undefined) {
      return 1;
    }

    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const leftIsNumber = String(leftNumber) === left;
    const rightIsNumber = String(rightNumber) === right;

    if (leftIsNumber && rightIsNumber) {
      if (leftNumber !== rightNumber) {
        return leftNumber > rightNumber ? 1 : -1;
      }
      continue;
    }
    if (leftIsNumber) {
      return -1;
    }
    if (rightIsNumber) {
      return 1;
    }

    if (left !== right) {
      return left > right ? 1 : -1;
    }
  }

  return 0;
}

function compareSemver(a: Semver, b: Semver) {
  if (a.major !== b.major) {
    return a.major > b.major ? 1 : -1;
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor ? 1 : -1;
  }
  if (a.patch !== b.patch) {
    return a.patch > b.patch ? 1 : -1;
  }

  return comparePrerelease(a.prerelease, b.prerelease);
}

function bumpForCaret(version: Semver): Semver {
  if (version.major > 0) {
    return { major: version.major + 1, minor: 0, patch: 0, prerelease: [] };
  }
  if (version.minor > 0) {
    return { major: 0, minor: version.minor + 1, patch: 0, prerelease: [] };
  }

  return { major: 0, minor: 0, patch: version.patch + 1, prerelease: [] };
}

function bumpForTilde(version: Semver): Semver {
  return {
    major: version.major,
    minor: version.minor + 1,
    patch: 0,
    prerelease: []
  };
}

function matchesComparator(current: Semver, comparator: Comparator) {
  const comparison = compareSemver(current, comparator.version);
  switch (comparator.op) {
    case '<':
      return comparison < 0;
    case '<=':
      return comparison <= 0;
    case '>':
      return comparison > 0;
    case '>=':
      return comparison >= 0;
    case '=':
      return comparison === 0;
    default:
      return false;
  }
}

function parseComparator(token: string): Comparator[] | null {
  const normalized = token.trim();
  if (!normalized) {
    return [];
  }
  if (normalized === '*' || /^x$/i.test(normalized)) {
    return [];
  }

  if (normalized.startsWith('^')) {
    const base = parseSemver(normalized.slice(1));
    if (!base) {
      return null;
    }

    return [
      { op: '>=', version: base },
      { op: '<', version: bumpForCaret(base) }
    ];
  }

  if (normalized.startsWith('~')) {
    const base = parseSemver(normalized.slice(1));
    if (!base) {
      return null;
    }

    return [
      { op: '>=', version: base },
      { op: '<', version: bumpForTilde(base) }
    ];
  }

  const comparatorMatch = normalized.match(
    /^(?<op><=|>=|<|>|=)?(?<version>v?\d+(?:\.\d+)?(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/
  );
  if (!comparatorMatch || !comparatorMatch.groups) {
    return null;
  }

  const parsedVersion = parseSemver(comparatorMatch.groups.version);
  if (!parsedVersion) {
    return null;
  }

  const op = (comparatorMatch.groups.op ?? '=') as Comparator['op'];
  return [{ op, version: parsedVersion }];
}

export function isSemverRangeSatisfied(
  version: string,
  range: string
): boolean | null {
  const parsedVersion = parseSemver(version);
  if (!parsedVersion) {
    return null;
  }

  const normalizedRange = range.trim();
  if (!normalizedRange || normalizedRange === '*' || /^x$/i.test(normalizedRange)) {
    return true;
  }

  const branches = normalizedRange
    .split('||')
    .map((branch) => branch.trim())
    .filter(Boolean);
  if (!branches.length) {
    return null;
  }

  for (const branch of branches) {
    const tokens = branch
      .replace(/,/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (!tokens.length) {
      return null;
    }

    let allMatch = true;
    for (const token of tokens) {
      const comparators = parseComparator(token);
      if (!comparators) {
        return null;
      }

      for (const comparator of comparators) {
        if (!matchesComparator(parsedVersion, comparator)) {
          allMatch = false;
          break;
        }
      }

      if (!allMatch) {
        break;
      }
    }

    if (allMatch) {
      return true;
    }
  }

  return false;
}

export function loadHostSdkVersion(rootDir: string, warnings: string[]) {
  const sdkPackagePath = path.join(rootDir, 'app', 'sdk', 'package.json');
  if (!fs.existsSync(sdkPackagePath)) {
    warnings.push(
      'SDK package metadata not found at app/sdk/package.json. Compatibility checks skipped.'
    );
    return null;
  }

  try {
    const raw = fs.readFileSync(sdkPackagePath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    const version =
      typeof parsed.version === 'string' ? parsed.version.trim() : '';
    if (!version || !parseSemver(version)) {
      warnings.push(
        `SDK version in app/sdk/package.json is invalid (${JSON.stringify(parsed.version)}). Compatibility checks skipped.`
      );
      return null;
    }

    return version;
  } catch {
    warnings.push(
      'SDK package metadata could not be parsed from app/sdk/package.json. Compatibility checks skipped.'
    );
    return null;
  }
}

function resolveModuleCompatibility({
  moduleId,
  moduleJson,
  hostSdkVersion,
  strictCompatibility,
  warnings,
  compatibilityErrors
}: {
  moduleId: string;
  moduleJson: ModuleJson;
  hostSdkVersion: string | null;
  strictCompatibility: boolean;
  warnings: string[];
  compatibilityErrors: string[];
}): CompatibilityResult {
  const report = (message: string) => {
    if (strictCompatibility) {
      compatibilityErrors.push(message);
      return;
    }

    warnings.push(message);
  };

  const sdkRangeRaw = moduleJson.sdkRange;
  const sdkRange = typeof sdkRangeRaw === 'string' ? sdkRangeRaw.trim() : '';
  if (!sdkRange) {
    report(
      `Module ${moduleId} is missing sdkRange in module.json. Add sdkRange (for example "^0.1.0").`
    );
    return {
      sdkRange: null,
      sdkCompatible: null
    };
  }

  if (!hostSdkVersion) {
    warnings.push(
      `Module ${moduleId} declares sdkRange="${sdkRange}" but host SDK version is unavailable; compatibility check skipped.`
    );
    return {
      sdkRange,
      sdkCompatible: null
    };
  }

  const matchesRange = isSemverRangeSatisfied(hostSdkVersion, sdkRange);
  if (matchesRange === null) {
    report(
      `Module ${moduleId} declares invalid sdkRange="${sdkRange}". Use a valid semver range (for example "^0.1.0" or ">=0.1.0 <0.2.0").`
    );
    return {
      sdkRange,
      sdkCompatible: null
    };
  }

  if (!matchesRange) {
    report(
      `Module ${moduleId} sdkRange="${sdkRange}" is incompatible with host SDK ${hostSdkVersion}.`
    );
  }

  return {
    sdkRange,
    sdkCompatible: matchesRange
  };
}

function validateModuleModeSpecificContract({
  moduleId,
  moduleDir,
  moduleMode,
  moduleJson,
  configErrors
}: {
  moduleId: string;
  moduleDir: string;
  moduleMode: ModuleMode;
  moduleJson: ModuleJson;
  configErrors: ModulePrepareConfigError[];
}) {
  if (moduleMode !== 'source-package') {
    return;
  }

  const buildCommandRaw =
    typeof moduleJson.buildCommand === 'string'
      ? moduleJson.buildCommand.trim()
      : '';
  if (!buildCommandRaw) {
    pushConfigError({
      configErrors,
      moduleId,
      moduleDir,
      code: 'module_build_command_missing',
      message: `Module ${moduleId} (moduleMode="source-package") must declare buildCommand in module.json.`
    });
  }
}

export function runModulesPrepare(
  options: ModulesPrepareOptions = {}
): ModulesPrepareResult {
  const rootDir = options.rootDir ?? process.cwd();
  const modulesDir = resolveModulesDir(rootDir, options.modulesDir ?? null);
  const resolvedModules: ResolvedModule[] = [];
  const warnings: string[] = [];
  const configErrors: ModulePrepareConfigError[] = [];
  const compatibilityErrors: string[] = [];
  const strictCompatibility = resolveStrictCompatibility(options);
  const hostSdkVersion =
    typeof options.hostSdkVersion === 'string'
      ? options.hostSdkVersion.trim() || null
      : loadHostSdkVersion(rootDir, warnings);

  if (modulesDir && fs.existsSync(modulesDir)) {
    const moduleDirs = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(modulesDir, entry.name));

    for (const moduleDir of moduleDirs) {
      const moduleJson = loadModuleJson(moduleDir);
      if (!moduleJson?.moduleId) {
        continue;
      }

      const moduleMode = resolveModuleMode({
        moduleId: moduleJson.moduleId,
        moduleDir,
        moduleJson,
        configErrors
      });
      if (!moduleMode) {
        continue;
      }

      validateModuleModeSpecificContract({
        moduleId: moduleJson.moduleId,
        moduleDir,
        moduleMode,
        moduleJson,
        configErrors
      });

      const resolved = resolveModuleEntry({
        moduleId: moduleJson.moduleId,
        moduleDir,
        moduleJson,
        moduleMode,
        configErrors
      });
      if (!resolved) {
        continue;
      }

      const compatibility = resolveModuleCompatibility({
        moduleId: moduleJson.moduleId,
        moduleJson,
        hostSdkVersion,
        strictCompatibility,
        warnings,
        compatibilityErrors
      });

      resolvedModules.push({
        moduleId: moduleJson.moduleId,
        entryPath: resolved.entryPath,
        importPath: resolveImportPath(rootDir, resolved.entryPath),
        importName: toImportName(moduleJson.moduleId),
        mode: resolved.mode,
        sdkRange: compatibility.sdkRange,
        sdkCompatible: compatibility.sdkCompatible,
        templatePack: resolveModuleTemplatePackConfig({
          rootDir,
          moduleDir,
          moduleId: moduleJson.moduleId,
          moduleJson,
          configErrors
        }),
        db: resolveModuleDbConfig({
          rootDir,
          moduleDir,
          moduleId: moduleJson.moduleId,
          moduleJson,
          warnings
        })
      });
    }
  }

  resolvedModules.sort((a, b) => a.moduleId.localeCompare(b.moduleId));

  if (configErrors.length > 0) {
    const details = configErrors.map((error) => `- ${error.message}`).join('\n');
    throw new Error(`[modules-prepare] module config validation failed:\n${details}`);
  }

  if (strictCompatibility && compatibilityErrors.length > 0) {
    const details = compatibilityErrors.map((error) => `- ${error}`).join('\n');
    throw new Error(
      `[modules-prepare] strict SDK compatibility failed:\n${details}`
    );
  }

  const outputPath = path.join(
    rootDir,
    'lib',
    'modules',
    'external.generated.ts'
  );
  const importLines = resolvedModules.map(
    (mod) => `import ${mod.importName} from '${mod.importPath}';`
  );
  const moduleList = resolvedModules.map((mod) => mod.importName).join(', ');
  const metaList = resolvedModules
    .map(
      (mod) =>
        `{ moduleId: ${JSON.stringify(mod.moduleId)}, mode: ${JSON.stringify(mod.mode)}, entry: ${JSON.stringify(mod.importPath)}, sdkRange: ${JSON.stringify(mod.sdkRange)}, sdkCompatible: ${JSON.stringify(mod.sdkCompatible)}, templatePack: ${JSON.stringify(mod.templatePack)}, db: ${JSON.stringify(mod.db)} }`
    )
    .join(',\n  ');

  const fileBody = `import type { ModuleManifest } from './manifest';\n${importLines.join(
    '\n'
  )}\n\nexport const EXTERNAL_MODULES: ModuleManifest[] = [${
    moduleList ? `\n  ${moduleList}\n` : ''
  }];\n\nexport const EXTERNAL_MODULE_META = [${
    metaList ? `\n  ${metaList}\n` : ''
  }];\n`;

  ensureOutputDir(outputPath);
  fs.writeFileSync(outputPath, fileBody, 'utf8');

  if (warnings.length && options.logWarnings !== false) {
    console.warn('[modules-prepare] warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  return {
    rootDir,
    modulesDir,
    hostSdkVersion,
    strictCompatibility,
    outputPath,
    warnings,
    configErrors,
    compatibilityErrors,
    resolvedModules
  };
}

function parseCliArgs(argv: string[]) {
  let strictCompatibility: boolean | undefined;
  let hostSdkVersion: string | null | undefined;

  for (const arg of argv) {
    if (arg === '--strict-compat') {
      strictCompatibility = true;
      continue;
    }
    if (arg === '--no-strict-compat' || arg === '--warn-compat') {
      strictCompatibility = false;
      continue;
    }
    if (arg.startsWith('--sdk-version=')) {
      const value = arg.slice('--sdk-version='.length).trim();
      hostSdkVersion = value || null;
    }
  }

  return {
    ...(strictCompatibility === undefined ? {} : { strictCompatibility }),
    ...(hostSdkVersion === undefined ? {} : { hostSdkVersion })
  } as Pick<
    ModulesPrepareOptions,
    'strictCompatibility' | 'hostSdkVersion'
  >;
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  try {
    runModulesPrepare(parseCliArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
