import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  isSemverRangeSatisfied,
  loadHostSdkVersion,
  type ModuleMode
} from './modules-prepare';

type ModuleJson = {
  moduleId?: string;
  moduleMode?: string;
  entry?: string;
  buildCommand?: string;
  testCommand?: string;
  sdkRange?: string;
  templatePack?: {
    defaultEntry?: string;
    overrideEntry?: string;
    contractRange?: string;
  };
};

type ModulePackageJson = {
  peerDependencies?: Record<string, unknown>;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
};

const CRITICAL_MODULE_PEERS = [
  'react',
  'react-dom',
  'next',
  '@skitsaas/sdk'
] as const;

type CriticalModulePeer = (typeof CRITICAL_MODULE_PEERS)[number];

export type HostCriticalPeerVersions = Record<CriticalModulePeer, string | null>;

export type ModuleBuildConfigErrorCode =
  | 'module_entry_missing'
  | 'module_build_command_missing'
  | 'module_package_json_missing'
  | 'module_package_json_invalid'
  | 'module_filter_not_found'
  | 'module_filter_not_source_package'
  | 'module_template_pack_invalid';

export type ModuleBuildConfigError = {
  code: ModuleBuildConfigErrorCode;
  moduleId: string;
  moduleDir: string;
  message: string;
};

export type ModuleBuildEvidence = {
  moduleId: string;
  moduleDir: string;
  entry: string;
  buildCommand: string;
  testCommand: string | null;
  sdkRange: string;
  templatePack: {
    defaultEntry?: string;
    overrideEntry?: string;
    contractRange?: string;
  } | null;
  builtAt: string | null;
  testedAt: string | null;
  dryRun: boolean;
};

type SourcePackageTarget = {
  moduleId: string;
  moduleDir: string;
  entry: string;
  entryAbsolute: string;
  buildCommand: string;
  testCommand: string | null;
  sdkRange: string;
  templatePack: {
    defaultEntry?: string;
    overrideEntry?: string;
    contractRange?: string;
  } | null;
  templatePackResolved: {
    defaultEntryAbsolute?: string;
    overrideEntryAbsolute?: string;
  };
};

export type ModuleBuildCommandRunner = (target: {
  moduleId: string;
  moduleDir: string;
  buildCommand: string;
}) => {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

export type ModuleTestCommandRunner = (target: {
  moduleId: string;
  moduleDir: string;
  testCommand: string;
}) => {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

export type ModulesBuildOptions = {
  rootDir?: string;
  modulesDir?: string;
  onlyModuleId?: string;
  dryRun?: boolean;
  hostSdkVersion?: string | null;
  hostPeerVersions?: Partial<HostCriticalPeerVersions>;
  strictCompatibility?: boolean;
  runTests?: boolean;
  logWarnings?: boolean;
  writeEvidence?: boolean;
  commandRunner?: ModuleBuildCommandRunner;
  testCommandRunner?: ModuleTestCommandRunner;
};

export type ModulesBuildResult = {
  rootDir: string;
  modulesDir: string | null;
  hostSdkVersion: string | null;
  strictCompatibility: boolean;
  runTests: boolean;
  dryRun: boolean;
  onlyModuleId: string | null;
  outputPath: string;
  warnings: string[];
  configErrors: ModuleBuildConfigError[];
  compatibilityErrors: string[];
  builtModules: ModuleBuildEvidence[];
};

function toPosixPath(value: string) {
  return value.replace(/\\/g, '/');
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

function loadModulePackageJson({
  moduleId,
  moduleDir,
  configErrors
}: {
  moduleId: string;
  moduleDir: string;
  configErrors: ModuleBuildConfigError[];
}): ModulePackageJson | null {
  const packageJsonPath = path.join(moduleDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    pushConfigError({
      configErrors,
      code: 'module_package_json_missing',
      moduleId,
      moduleDir,
      message: `Module ${moduleId} (moduleMode="source-package") must include package.json.`
    });
    return null;
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as ModulePackageJson;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      pushConfigError({
        configErrors,
        code: 'module_package_json_invalid',
        moduleId,
        moduleDir,
        message: `Module ${moduleId} has invalid package.json content. Expected a JSON object.`
      });
      return null;
    }

    return parsed;
  } catch {
    pushConfigError({
      configErrors,
      code: 'module_package_json_invalid',
      moduleId,
      moduleDir,
      message: `Module ${moduleId} has invalid package.json.`
    });
    return null;
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

function resolveStrictCompatibility(options: ModulesBuildOptions) {
  if (typeof options.strictCompatibility === 'boolean') {
    return options.strictCompatibility;
  }

  return parseBooleanFlag(process.env.MODULES_BUILD_STRICT, true);
}

function normalizeHostVersionSpec(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const spec = value.trim();
  if (!spec) {
    return null;
  }

  if (
    spec.startsWith('workspace:') ||
    spec.startsWith('file:') ||
    spec.startsWith('link:') ||
    spec.startsWith('git+') ||
    spec.includes(':')
  ) {
    return null;
  }

  const direct = spec.match(
    /^v?\d+(?:\.\d+)?(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
  );
  if (direct) {
    return spec.replace(/^v/, '');
  }

  const prefixed = spec.match(
    /^[~^]v?\d+(?:\.\d+)?(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
  );
  if (prefixed) {
    return spec.slice(1).replace(/^v/, '');
  }

  return null;
}

function loadRootPackageJson(rootDir: string, warnings: string[]) {
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    warnings.push(
      'Host package metadata not found at package.json. Peer compatibility checks may be incomplete.'
    );
    return null;
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    return parsed;
  } catch {
    warnings.push(
      'Host package metadata could not be parsed from package.json. Peer compatibility checks may be incomplete.'
    );
    return null;
  }
}

function loadHostCriticalPeerVersions({
  rootDir,
  hostSdkVersion,
  hostPeerOverrides,
  warnings
}: {
  rootDir: string;
  hostSdkVersion: string | null;
  hostPeerOverrides?: Partial<HostCriticalPeerVersions>;
  warnings: string[];
}): HostCriticalPeerVersions {
  const rootPackage = loadRootPackageJson(rootDir, warnings);
  const deps = rootPackage?.dependencies ?? {};
  const devDeps = rootPackage?.devDependencies ?? {};

  const resolveHostPackageVersion = (packageName: string) => {
    const depValue =
      deps[packageName] !== undefined ? deps[packageName] : devDeps[packageName];
    return normalizeHostVersionSpec(depValue);
  };

  const base: HostCriticalPeerVersions = {
    react: resolveHostPackageVersion('react'),
    'react-dom': resolveHostPackageVersion('react-dom'),
    next: resolveHostPackageVersion('next'),
    '@skitsaas/sdk': hostSdkVersion
  };

  if (!hostPeerOverrides) {
    return base;
  }

  return {
    react:
      hostPeerOverrides.react !== undefined
        ? hostPeerOverrides.react
        : base.react,
    'react-dom':
      hostPeerOverrides['react-dom'] !== undefined
        ? hostPeerOverrides['react-dom']
        : base['react-dom'],
    next:
      hostPeerOverrides.next !== undefined ? hostPeerOverrides.next : base.next,
    '@skitsaas/sdk':
      hostPeerOverrides['@skitsaas/sdk'] !== undefined
        ? hostPeerOverrides['@skitsaas/sdk']
        : base['@skitsaas/sdk']
  };
}

function validateSourcePackageCriticalPeers({
  moduleId,
  modulePackageJson,
  hostPeerVersions,
  strictCompatibility,
  warnings,
  compatibilityErrors
}: {
  moduleId: string;
  modulePackageJson: ModulePackageJson;
  hostPeerVersions: HostCriticalPeerVersions;
  strictCompatibility: boolean;
  warnings: string[];
  compatibilityErrors: string[];
}) {
  const report = (message: string) => {
    if (strictCompatibility) {
      compatibilityErrors.push(message);
      return;
    }

    warnings.push(message);
  };

  const peers = modulePackageJson.peerDependencies;
  const peerMap =
    peers && typeof peers === 'object' && !Array.isArray(peers) ? peers : {};

  for (const peerName of CRITICAL_MODULE_PEERS) {
    const declaredRangeRaw = peerMap[peerName];
    const declaredRange =
      typeof declaredRangeRaw === 'string' ? declaredRangeRaw.trim() : '';
    if (!declaredRange) {
      report(
        `Module ${moduleId} must declare peerDependencies.${peerName} in package.json.`
      );
      continue;
    }

    const hostVersion = hostPeerVersions[peerName];
    if (!hostVersion) {
      report(
        `Module ${moduleId} declares peerDependencies.${peerName}="${declaredRange}" but host ${peerName} version is unavailable.`
      );
      continue;
    }

    const matchesRange = isSemverRangeSatisfied(hostVersion, declaredRange);
    if (matchesRange === null) {
      report(
        `Module ${moduleId} declares invalid peerDependencies.${peerName}="${declaredRange}".`
      );
      continue;
    }

    if (!matchesRange) {
      report(
        `Module ${moduleId} peerDependencies.${peerName}="${declaredRange}" is incompatible with host ${peerName}@${hostVersion}.`
      );
    }
  }
}

function resolveRelativePath(moduleDir: string, value: string) {
  return path.isAbsolute(value) ? value : path.join(moduleDir, value);
}

function asModuleMode(value: string | undefined): ModuleMode | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (
    normalized === 'prebuilt' ||
    normalized === 'source-host' ||
    normalized === 'source-package'
  ) {
    return normalized;
  }

  return null;
}

function pushConfigError({
  configErrors,
  code,
  moduleId,
  moduleDir,
  message
}: {
  configErrors: ModuleBuildConfigError[];
  code: ModuleBuildConfigErrorCode;
  moduleId: string;
  moduleDir: string;
  message: string;
}) {
  configErrors.push({
    code,
    moduleId,
    moduleDir,
    message
  });
}

function resolveSourcePackageTemplatePack({
  moduleId,
  moduleDir,
  moduleJson,
  configErrors
}: {
  moduleId: string;
  moduleDir: string;
  moduleJson: ModuleJson;
  configErrors: ModuleBuildConfigError[];
}) {
  const templatePack = moduleJson.templatePack;
  if (!templatePack) {
    return {
      templatePack: null,
      templatePackResolved: {}
    };
  }

  if (typeof templatePack !== 'object' || Array.isArray(templatePack)) {
    pushConfigError({
      configErrors,
      code: 'module_template_pack_invalid',
      moduleId,
      moduleDir,
      message: `Module ${moduleId} templatePack must be an object when provided.`
    });
    return {
      templatePack: null,
      templatePackResolved: {}
    };
  }

  const resolveEntry = (value: unknown, field: 'defaultEntry' | 'overrideEntry') => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
      pushConfigError({
        configErrors,
        code: 'module_template_pack_invalid',
        moduleId,
        moduleDir,
        message: `Module ${moduleId} templatePack.${field} must be a non-empty string when provided.`
      });
      return undefined;
    }

    return value.trim();
  };

  const defaultEntry = resolveEntry(templatePack.defaultEntry, 'defaultEntry');
  const overrideEntry = resolveEntry(templatePack.overrideEntry, 'overrideEntry');
  if (!defaultEntry && !overrideEntry) {
    pushConfigError({
      configErrors,
      code: 'module_template_pack_invalid',
      moduleId,
      moduleDir,
      message: `Module ${moduleId} templatePack must include defaultEntry or overrideEntry.`
    });
    return {
      templatePack: null,
      templatePackResolved: {}
    };
  }

  const contractRange =
    typeof templatePack.contractRange === 'string' &&
    templatePack.contractRange.trim().length > 0
      ? templatePack.contractRange.trim()
      : undefined;

  return {
    templatePack: {
      ...(defaultEntry ? { defaultEntry } : {}),
      ...(overrideEntry ? { overrideEntry } : {}),
      ...(contractRange ? { contractRange } : {})
    },
    templatePackResolved: {
      ...(defaultEntry
        ? { defaultEntryAbsolute: resolveRelativePath(moduleDir, defaultEntry) }
        : {}),
      ...(overrideEntry
        ? { overrideEntryAbsolute: resolveRelativePath(moduleDir, overrideEntry) }
        : {})
    }
  };
}

function discoverSourcePackageTargets({
  rootDir,
  modulesDir,
  onlyModuleId,
  strictCompatibility,
  hostSdkVersion,
  hostPeerVersions,
  warnings,
  configErrors,
  compatibilityErrors
}: {
  rootDir: string;
  modulesDir: string;
  onlyModuleId?: string;
  strictCompatibility: boolean;
  hostSdkVersion: string | null;
  hostPeerVersions: HostCriticalPeerVersions;
  warnings: string[];
  configErrors: ModuleBuildConfigError[];
  compatibilityErrors: string[];
}) {
  const targets: SourcePackageTarget[] = [];
  let filteredModuleMatched = false;
  let filteredModuleWasSourcePackage = false;

  const moduleDirs = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(modulesDir, entry.name));

  for (const moduleDir of moduleDirs) {
    const moduleJson = loadModuleJson(moduleDir);
    if (!moduleJson?.moduleId) {
      continue;
    }

    if (onlyModuleId && moduleJson.moduleId !== onlyModuleId) {
      continue;
    }

    if (onlyModuleId && moduleJson.moduleId === onlyModuleId) {
      filteredModuleMatched = true;
    }

    const moduleMode = asModuleMode(moduleJson.moduleMode);
    if (moduleMode !== 'source-package') {
      continue;
    }

    filteredModuleWasSourcePackage = true;

    const entryRaw = typeof moduleJson.entry === 'string' ? moduleJson.entry.trim() : '';
    if (!entryRaw) {
      pushConfigError({
        configErrors,
        code: 'module_entry_missing',
        moduleId: moduleJson.moduleId,
        moduleDir,
        message: `Module ${moduleJson.moduleId} (moduleMode="source-package") must declare entry in module.json.`
      });
      continue;
    }

    const buildCommandRaw =
      typeof moduleJson.buildCommand === 'string'
        ? moduleJson.buildCommand.trim()
        : '';
    if (!buildCommandRaw) {
      pushConfigError({
        configErrors,
        code: 'module_build_command_missing',
        moduleId: moduleJson.moduleId,
        moduleDir,
        message: `Module ${moduleJson.moduleId} (moduleMode="source-package") must declare buildCommand in module.json.`
      });
      continue;
    }

    const sdkRangeRaw =
      typeof moduleJson.sdkRange === 'string' ? moduleJson.sdkRange.trim() : '';
    if (!sdkRangeRaw) {
      const message = `Module ${moduleJson.moduleId} is missing sdkRange in module.json.`;
      if (strictCompatibility) {
        compatibilityErrors.push(message);
      } else {
        warnings.push(message);
      }
    } else if (hostSdkVersion) {
      const matchesRange = isSemverRangeSatisfied(hostSdkVersion, sdkRangeRaw);
      if (matchesRange === null) {
        const message = `Module ${moduleJson.moduleId} declares invalid sdkRange="${sdkRangeRaw}".`;
        if (strictCompatibility) {
          compatibilityErrors.push(message);
        } else {
          warnings.push(message);
        }
      } else if (!matchesRange) {
        const message = `Module ${moduleJson.moduleId} sdkRange="${sdkRangeRaw}" is incompatible with host SDK ${hostSdkVersion}.`;
        if (strictCompatibility) {
          compatibilityErrors.push(message);
        } else {
          warnings.push(message);
        }
      }
    } else {
      warnings.push(
        `Module ${moduleJson.moduleId} declares sdkRange="${sdkRangeRaw}" but host SDK version is unavailable; compatibility check skipped.`
      );
    }

    const modulePackageJson = loadModulePackageJson({
      moduleId: moduleJson.moduleId,
      moduleDir,
      configErrors
    });
    if (!modulePackageJson) {
      continue;
    }

    validateSourcePackageCriticalPeers({
      moduleId: moduleJson.moduleId,
      modulePackageJson,
      hostPeerVersions,
      strictCompatibility,
      warnings,
      compatibilityErrors
    });

    const templatePack = resolveSourcePackageTemplatePack({
      moduleId: moduleJson.moduleId,
      moduleDir,
      moduleJson,
      configErrors
    });

    targets.push({
      moduleId: moduleJson.moduleId,
      moduleDir,
      entry: entryRaw,
      entryAbsolute: resolveRelativePath(moduleDir, entryRaw),
      buildCommand: buildCommandRaw,
      testCommand:
        typeof moduleJson.testCommand === 'string' &&
        moduleJson.testCommand.trim()
          ? moduleJson.testCommand.trim()
          : null,
      sdkRange: sdkRangeRaw,
      templatePack: templatePack.templatePack,
      templatePackResolved: templatePack.templatePackResolved
    });
  }

  if (onlyModuleId && !filteredModuleMatched) {
    pushConfigError({
      configErrors,
      code: 'module_filter_not_found',
      moduleId: onlyModuleId,
      moduleDir: toPosixPath(path.relative(rootDir, modulesDir)),
      message: `Module filter --module=${onlyModuleId} did not match any module.`
    });
  }

  if (onlyModuleId && filteredModuleMatched && !filteredModuleWasSourcePackage) {
    pushConfigError({
      configErrors,
      code: 'module_filter_not_source_package',
      moduleId: onlyModuleId,
      moduleDir: toPosixPath(path.relative(rootDir, modulesDir)),
      message: `Module ${onlyModuleId} is not moduleMode="source-package".`
    });
  }

  targets.sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  return targets;
}

function runShellCommand({
  moduleDir,
  command
}: {
  moduleDir: string;
  command: string;
}) {
  const result = spawnSync(command, {
    cwd: moduleDir,
    shell: true,
    stdio: 'pipe',
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}

function runBuildCommand({
  moduleId: _moduleId,
  moduleDir,
  buildCommand
}: {
  moduleId: string;
  moduleDir: string;
  buildCommand: string;
}) {
  return runShellCommand({ moduleDir, command: buildCommand });
}

function runTestCommand({
  moduleId: _moduleId,
  moduleDir,
  testCommand
}: {
  moduleId: string;
  moduleDir: string;
  testCommand: string;
}) {
  return runShellCommand({ moduleDir, command: testCommand });
}

function ensureOutputDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function runModulesBuild(
  options: ModulesBuildOptions = {}
): ModulesBuildResult {
  const rootDir = options.rootDir ?? process.cwd();
  const modulesDir = resolveModulesDir(rootDir, options.modulesDir ?? null);
  const warnings: string[] = [];
  const configErrors: ModuleBuildConfigError[] = [];
  const compatibilityErrors: string[] = [];
  const strictCompatibility = resolveStrictCompatibility(options);
  const runTests = options.runTests ?? true;
  const dryRun = options.dryRun ?? false;
  const onlyModuleId = options.onlyModuleId ?? null;
  const hostSdkVersion =
    typeof options.hostSdkVersion === 'string'
      ? options.hostSdkVersion.trim() || null
      : loadHostSdkVersion(rootDir, warnings);
  const hostPeerVersions = loadHostCriticalPeerVersions({
    rootDir,
    hostSdkVersion,
    hostPeerOverrides: options.hostPeerVersions,
    warnings
  });
  const commandRunner = options.commandRunner ?? runBuildCommand;
  const testCommandRunner = options.testCommandRunner ?? runTestCommand;
  const builtModules: ModuleBuildEvidence[] = [];

  if (modulesDir && fs.existsSync(modulesDir)) {
    const targets = discoverSourcePackageTargets({
      rootDir,
      modulesDir,
      onlyModuleId: options.onlyModuleId,
      strictCompatibility,
      hostSdkVersion,
      hostPeerVersions,
      warnings,
      configErrors,
      compatibilityErrors
    });

    if (configErrors.length > 0) {
      const details = configErrors.map((error) => `- ${error.message}`).join('\n');
      throw new Error(`[modules-build] module config validation failed:\n${details}`);
    }

    if (strictCompatibility && compatibilityErrors.length > 0) {
      const details = compatibilityErrors.map((error) => `- ${error}`).join('\n');
      throw new Error(
        `[modules-build] strict SDK compatibility failed:\n${details}`
      );
    }

    for (const target of targets) {
      let builtAt: string | null = null;
      let testedAt: string | null = null;

      if (!dryRun) {
        const result = commandRunner({
          moduleId: target.moduleId,
          moduleDir: target.moduleDir,
          buildCommand: target.buildCommand
        });

        if (result.exitCode !== 0) {
          const output = [result.stdout?.trim(), result.stderr?.trim()]
            .filter(Boolean)
            .join('\n');
          throw new Error(
            `[modules-build] build failed for ${target.moduleId} (exitCode=${result.exitCode}).${output ? `\n${output}` : ''}`
          );
        }

        if (!fs.existsSync(target.entryAbsolute)) {
          throw new Error(
            `[modules-build] build finished for ${target.moduleId} but entry "${target.entry}" was not found.`
          );
        }

        const templatePackPaths = [
          {
            field: 'defaultEntry',
            absolute: target.templatePackResolved.defaultEntryAbsolute
          },
          {
            field: 'overrideEntry',
            absolute: target.templatePackResolved.overrideEntryAbsolute
          }
        ] as const;

        for (const packPath of templatePackPaths) {
          if (!packPath.absolute) {
            continue;
          }

          if (!fs.existsSync(packPath.absolute)) {
            throw new Error(
              `[modules-build] build finished for ${target.moduleId} but templatePack.${packPath.field}="${target.templatePack?.[packPath.field] ?? ''}" was not found.`
            );
          }
        }

        builtAt = new Date().toISOString();

        if (runTests && target.testCommand) {
          const testResult = testCommandRunner({
            moduleId: target.moduleId,
            moduleDir: target.moduleDir,
            testCommand: target.testCommand
          });

          if (testResult.exitCode !== 0) {
            const output = [testResult.stdout?.trim(), testResult.stderr?.trim()]
              .filter(Boolean)
              .join('\n');
            throw new Error(
              `[modules-build] tests failed for ${target.moduleId} (exitCode=${testResult.exitCode}).${output ? `\n${output}` : ''}`
            );
          }

          testedAt = new Date().toISOString();
        }
      }

      builtModules.push({
        moduleId: target.moduleId,
        moduleDir: toPosixPath(path.relative(rootDir, target.moduleDir)),
        entry: target.entry,
        buildCommand: target.buildCommand,
        testCommand: target.testCommand,
        sdkRange: target.sdkRange,
        templatePack: target.templatePack,
        builtAt,
        testedAt,
        dryRun
      });
    }
  }

  const outputPath = path.join(
    rootDir,
    'lib',
    'modules',
    'build-evidence.generated.json'
  );
  if (options.writeEvidence !== false) {
    ensureOutputDir(outputPath);
    fs.writeFileSync(
      outputPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          hostSdkVersion,
          strictCompatibility,
          runTests,
          dryRun,
          modules: builtModules
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  if (warnings.length && options.logWarnings !== false) {
    console.warn('[modules-build] warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  return {
    rootDir,
    modulesDir,
    hostSdkVersion,
    strictCompatibility,
    runTests,
    dryRun,
    onlyModuleId,
    outputPath,
    warnings,
    configErrors,
    compatibilityErrors,
    builtModules
  };
}

function parseCliArgs(argv: string[]) {
  let strictCompatibility: boolean | undefined;
  let runTests: boolean | undefined;
  let dryRun = false;
  let onlyModuleId: string | undefined;
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
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--no-tests') {
      runTests = false;
      continue;
    }
    if (arg === '--with-tests') {
      runTests = true;
      continue;
    }
    if (arg.startsWith('--module=')) {
      const value = arg.slice('--module='.length).trim();
      if (value) {
        onlyModuleId = value;
      }
      continue;
    }
    if (arg.startsWith('--sdk-version=')) {
      const value = arg.slice('--sdk-version='.length).trim();
      hostSdkVersion = value || null;
    }
  }

  return {
    dryRun,
    ...(strictCompatibility === undefined ? {} : { strictCompatibility }),
    ...(runTests === undefined ? {} : { runTests }),
    ...(onlyModuleId ? { onlyModuleId } : {}),
    ...(hostSdkVersion === undefined ? {} : { hostSdkVersion })
  } as Pick<
    ModulesBuildOptions,
    | 'dryRun'
    | 'strictCompatibility'
    | 'runTests'
    | 'onlyModuleId'
    | 'hostSdkVersion'
  >;
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  try {
    runModulesBuild(parseCliArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
