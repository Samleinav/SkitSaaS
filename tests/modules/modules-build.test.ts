import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runModulesBuild } from '../../scripts/modules-build';

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

const HOST_PEER_VERSIONS = {
  react: '19.1.0',
  'react-dom': '19.1.0',
  next: '16.1.6',
  '@skitsaas/sdk': '0.1.0'
} as const;

function writeSourcePackageJson(
  moduleDir: string,
  peerDependencies?: Record<string, string>
) {
  writeFile(
    path.join(moduleDir, 'package.json'),
    JSON.stringify({
      name: path.basename(moduleDir),
      version: '1.0.0',
      peerDependencies: peerDependencies ?? {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        next: '^16.0.0',
        '@skitsaas/sdk': '^0.1.0'
      }
    })
  );
}

test('modules:build dry-run discovers source-package modules', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.host', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.host',
      moduleMode: 'source-host',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.1.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.pkg', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(path.join(modulesDir, 'mod.pkg'));

  const result = runModulesBuild({
    rootDir: tempRoot,
    modulesDir,
    dryRun: true,
    strictCompatibility: true,
    hostSdkVersion: '0.1.0',
    hostPeerVersions: HOST_PEER_VERSIONS,
    logWarnings: false
  });

  assert.equal(result.builtModules.length, 1);
  assert.equal(result.builtModules[0]?.moduleId, 'mod.pkg');
  assert.equal(result.builtModules[0]?.dryRun, true);
  assert.ok(fs.existsSync(result.outputPath));
});

test('modules:build supports --module filter for source-package modules', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(path.join(modulesDir, 'mod.alpha'));
  writeFile(
    path.join(modulesDir, 'mod.beta', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.beta',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(path.join(modulesDir, 'mod.beta'));

  const result = runModulesBuild({
    rootDir: tempRoot,
    modulesDir,
    onlyModuleId: 'mod.beta',
    dryRun: true,
    strictCompatibility: true,
    hostSdkVersion: '0.1.0',
    hostPeerVersions: HOST_PEER_VERSIONS,
    logWarnings: false
  });

  assert.equal(result.builtModules.length, 1);
  assert.equal(result.builtModules[0]?.moduleId, 'mod.beta');
});

test('modules:build rejects --module when target is not source-package', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.host', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.host',
      moduleMode: 'source-host',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.1.0'
    })
  );

  assert.throws(
    () =>
      runModulesBuild({
        rootDir: tempRoot,
        modulesDir,
        onlyModuleId: 'mod.host',
        dryRun: true,
        strictCompatibility: true,
        hostSdkVersion: '0.1.0',
        hostPeerVersions: HOST_PEER_VERSIONS,
        logWarnings: false
      }),
    /is not moduleMode="source-package"/
  );
});

test('modules:build executes build command and validates entry output', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');
  const moduleDir = path.join(modulesDir, 'mod.pkg');
  const entryPath = path.join(moduleDir, 'dist', 'manifest.js');
  const calls: Array<{ moduleId: string; buildCommand: string }> = [];

  writeFile(
    path.join(moduleDir, 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(moduleDir);

  const result = runModulesBuild({
    rootDir: tempRoot,
    modulesDir,
    dryRun: false,
    strictCompatibility: true,
    hostSdkVersion: '0.1.0',
    hostPeerVersions: HOST_PEER_VERSIONS,
    logWarnings: false,
    commandRunner: ({ moduleId, buildCommand }) => {
      calls.push({ moduleId, buildCommand });
      writeFile(
        entryPath,
        "export default { moduleId: 'mod.pkg', version: '1.0.0', displayName: 'Pkg' };"
      );
      return {
        exitCode: 0
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.moduleId, 'mod.pkg');
  assert.equal(calls[0]?.buildCommand, 'pnpm build');
  assert.ok(fs.existsSync(entryPath));
  assert.equal(result.builtModules.length, 1);
  assert.ok(result.builtModules[0]?.builtAt);
});

test('modules:build executes optional testCommand after build', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');
  const moduleDir = path.join(modulesDir, 'mod.pkg');
  const entryPath = path.join(moduleDir, 'dist', 'manifest.js');
  const calls: Array<{ kind: 'build' | 'test'; command: string }> = [];

  writeFile(
    path.join(moduleDir, 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      testCommand: 'pnpm test:module',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(moduleDir);

  const result = runModulesBuild({
    rootDir: tempRoot,
    modulesDir,
    dryRun: false,
    strictCompatibility: true,
    hostSdkVersion: '0.1.0',
    hostPeerVersions: HOST_PEER_VERSIONS,
    logWarnings: false,
    commandRunner: ({ buildCommand }) => {
      calls.push({ kind: 'build', command: buildCommand });
      writeFile(
        entryPath,
        "export default { moduleId: 'mod.pkg', version: '1.0.0', displayName: 'Pkg' };"
      );
      return {
        exitCode: 0
      };
    },
    testCommandRunner: ({ testCommand }) => {
      calls.push({ kind: 'test', command: testCommand });
      return {
        exitCode: 0
      };
    }
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls, [
    { kind: 'build', command: 'pnpm build' },
    { kind: 'test', command: 'pnpm test:module' }
  ]);
  assert.equal(result.builtModules[0]?.testCommand, 'pnpm test:module');
  assert.ok(result.builtModules[0]?.testedAt);
});

test('modules:build skips testCommand when runTests is false', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');
  const moduleDir = path.join(modulesDir, 'mod.pkg');
  const entryPath = path.join(moduleDir, 'dist', 'manifest.js');
  const calls: Array<{ kind: 'build' | 'test'; command: string }> = [];

  writeFile(
    path.join(moduleDir, 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      testCommand: 'pnpm test:module',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(moduleDir);

  const result = runModulesBuild({
    rootDir: tempRoot,
    modulesDir,
    dryRun: false,
    runTests: false,
    strictCompatibility: true,
    hostSdkVersion: '0.1.0',
    hostPeerVersions: HOST_PEER_VERSIONS,
    logWarnings: false,
    commandRunner: ({ buildCommand }) => {
      calls.push({ kind: 'build', command: buildCommand });
      writeFile(
        entryPath,
        "export default { moduleId: 'mod.pkg', version: '1.0.0', displayName: 'Pkg' };"
      );
      return {
        exitCode: 0
      };
    },
    testCommandRunner: ({ testCommand }) => {
      calls.push({ kind: 'test', command: testCommand });
      return {
        exitCode: 0
      };
    }
  });

  assert.deepEqual(calls, [{ kind: 'build', command: 'pnpm build' }]);
  assert.equal(result.runTests, false);
  assert.equal(result.builtModules[0]?.testedAt, null);
});

test('modules:build strict mode rejects incompatible sdkRange', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.pkg', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.2.0'
    })
  );
  writeSourcePackageJson(path.join(modulesDir, 'mod.pkg'));

  assert.throws(
    () =>
      runModulesBuild({
        rootDir: tempRoot,
        modulesDir,
        dryRun: true,
        strictCompatibility: true,
        hostSdkVersion: '0.1.0',
        hostPeerVersions: HOST_PEER_VERSIONS,
        logWarnings: false
      }),
    /strict SDK compatibility failed/
  );
});

test('modules:build strict mode rejects source-package modules without package.json', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.pkg', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );

  assert.throws(
    () =>
      runModulesBuild({
        rootDir: tempRoot,
        modulesDir,
        dryRun: true,
        strictCompatibility: true,
        hostSdkVersion: '0.1.0',
        hostPeerVersions: HOST_PEER_VERSIONS,
        logWarnings: false
      }),
    /must include package\.json/
  );
});

test('modules:build strict mode rejects missing critical peers', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.pkg', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(path.join(modulesDir, 'mod.pkg'), {
    react: '^19.0.0',
    'react-dom': '^19.0.0'
  });

  assert.throws(
    () =>
      runModulesBuild({
        rootDir: tempRoot,
        modulesDir,
        dryRun: true,
        strictCompatibility: true,
        hostSdkVersion: '0.1.0',
        hostPeerVersions: HOST_PEER_VERSIONS,
        logWarnings: false
      }),
    /must declare peerDependencies\.next/
  );
});

test('modules:build strict mode rejects incompatible critical peers', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.pkg', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(path.join(modulesDir, 'mod.pkg'), {
    react: '^19.0.0',
    'react-dom': '^19.0.0',
    next: '^17.0.0',
    '@skitsaas/sdk': '^0.1.0'
  });

  assert.throws(
    () =>
      runModulesBuild({
        rootDir: tempRoot,
        modulesDir,
        dryRun: true,
        strictCompatibility: true,
        hostSdkVersion: '0.1.0',
        hostPeerVersions: HOST_PEER_VERSIONS,
        logWarnings: false
      }),
    /peerDependencies\.next="\^17\.0\.0" is incompatible/
  );
});

test('modules:build warning mode keeps module and reports peer incompatibility', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.pkg', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeSourcePackageJson(path.join(modulesDir, 'mod.pkg'), {
    react: '^19.0.0',
    'react-dom': '^19.0.0',
    next: '^17.0.0',
    '@skitsaas/sdk': '^0.1.0'
  });

  const result = runModulesBuild({
    rootDir: tempRoot,
    modulesDir,
    dryRun: true,
    strictCompatibility: false,
    hostSdkVersion: '0.1.0',
    hostPeerVersions: HOST_PEER_VERSIONS,
    logWarnings: false
  });

  assert.equal(result.builtModules.length, 1);
  assert.equal(result.compatibilityErrors.length, 0);
  assert.match(result.warnings.join('\n'), /peerDependencies\.next/);
});

test('modules:build validates templatePack output after build', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');
  const moduleDir = path.join(modulesDir, 'mod.pkg');
  const entryPath = path.join(moduleDir, 'dist', 'manifest.js');
  const defaultsPath = path.join(moduleDir, 'dist', 'templates', 'defaults.json');
  const overridesPath = path.join(moduleDir, 'dist', 'templates', 'overrides.json');

  writeFile(
    path.join(moduleDir, 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0',
      templatePack: {
        defaultEntry: 'dist/templates/defaults.json',
        overrideEntry: 'dist/templates/overrides.json',
        contractRange: '^1.0.0'
      }
    })
  );
  writeSourcePackageJson(moduleDir);

  const result = runModulesBuild({
    rootDir: tempRoot,
    modulesDir,
    dryRun: false,
    strictCompatibility: true,
    hostSdkVersion: '0.1.0',
    hostPeerVersions: HOST_PEER_VERSIONS,
    logWarnings: false,
    commandRunner: () => {
      writeFile(
        entryPath,
        "export default { moduleId: 'mod.pkg', version: '1.0.0', displayName: 'Pkg' };"
      );
      writeFile(defaultsPath, '{}');
      writeFile(overridesPath, '{}');
      return { exitCode: 0 };
    }
  });

  assert.equal(result.builtModules.length, 1);
  assert.deepEqual(result.builtModules[0]?.templatePack, {
    defaultEntry: 'dist/templates/defaults.json',
    overrideEntry: 'dist/templates/overrides.json',
    contractRange: '^1.0.0'
  });
});

test('modules:build fails when configured templatePack output is missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-build-'));
  const modulesDir = path.join(tempRoot, 'modules');
  const moduleDir = path.join(modulesDir, 'mod.pkg');
  const entryPath = path.join(moduleDir, 'dist', 'manifest.js');

  writeFile(
    path.join(moduleDir, 'module.json'),
    JSON.stringify({
      moduleId: 'mod.pkg',
      moduleMode: 'source-package',
      entry: 'dist/manifest.js',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0',
      templatePack: {
        defaultEntry: 'dist/templates/defaults.json'
      }
    })
  );
  writeSourcePackageJson(moduleDir);

  assert.throws(
    () =>
      runModulesBuild({
        rootDir: tempRoot,
        modulesDir,
        dryRun: false,
        strictCompatibility: true,
        hostSdkVersion: '0.1.0',
        hostPeerVersions: HOST_PEER_VERSIONS,
        logWarnings: false,
        commandRunner: () => {
          writeFile(
            entryPath,
            "export default { moduleId: 'mod.pkg', version: '1.0.0', displayName: 'Pkg' };"
          );
          return { exitCode: 0 };
        }
      }),
    /templatePack\.defaultEntry=.*was not found/
  );
});
