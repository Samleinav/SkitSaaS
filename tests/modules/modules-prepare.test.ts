import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runModulesPrepare } from '../../scripts/modules-prepare';

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('modules:prepare generates imports without extensions', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-host',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.1.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  writeFile(
    path.join(modulesDir, 'mod.beta', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.beta',
      moduleMode: 'prebuilt',
      version: '1.0.0',
      entry: 'dist/manifest.js',
      sdkRange: '^0.1.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.beta', 'dist', 'manifest.js'),
    "export default { moduleId: 'mod.beta', version: '1.0.0', displayName: 'Beta' };"
  );

  const result = runModulesPrepare({
    rootDir: tempRoot,
    modulesDir,
    logWarnings: false
  });

  const outputPath = path.join(
    tempRoot,
    'lib',
    'modules',
    'external.generated.ts'
  );
  const output = fs.readFileSync(outputPath, 'utf8');

  assert.match(
    output,
    /from '@\/modules\/mod\.alpha\/src\/manifest';/
  );
  assert.match(output, /from '@\/modules\/mod\.beta\/dist\/manifest';/);
  assert.ok(!output.includes('manifest.ts'));
  assert.ok(!output.includes('manifest.js'));
  assert.equal(result.resolvedModules[0]?.mode, 'source-host');
  assert.equal(result.resolvedModules[1]?.mode, 'prebuilt');
});

test('modules:prepare rejects modules without moduleMode', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.1.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  assert.throws(
    () =>
      runModulesPrepare({
        rootDir: tempRoot,
        modulesDir,
        strictCompatibility: false,
        logWarnings: false
      }),
    /missing moduleMode/
  );
});

test('modules:prepare source-package does not fallback to source entry', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-package',
      version: '1.0.0',
      entry: 'dist/manifest.js',
      sourceEntry: 'src/manifest.ts',
      buildCommand: 'pnpm build',
      sdkRange: '^0.1.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  assert.throws(
    () =>
      runModulesPrepare({
        rootDir: tempRoot,
        modulesDir,
        strictCompatibility: false,
        logWarnings: false
      }),
    /entry="dist\/manifest\.js" does not exist/
  );
});

test('modules:prepare source-package requires buildCommand', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-package',
      version: '1.0.0',
      entry: 'dist/manifest.js',
      sdkRange: '^0.1.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'dist', 'manifest.js'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  assert.throws(
    () =>
      runModulesPrepare({
        rootDir: tempRoot,
        modulesDir,
        strictCompatibility: false,
        logWarnings: false
      }),
    /must declare buildCommand/
  );
});

test('modules:prepare strict mode rejects incompatible sdkRange', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-host',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.2.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  assert.throws(
    () =>
      runModulesPrepare({
        rootDir: tempRoot,
        modulesDir,
        hostSdkVersion: '0.1.0',
        strictCompatibility: true,
        logWarnings: false
      }),
    /strict SDK compatibility failed/
  );
});

test('modules:prepare strict mode rejects modules without sdkRange', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-host',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  assert.throws(
    () =>
      runModulesPrepare({
        rootDir: tempRoot,
        modulesDir,
        hostSdkVersion: '0.1.0',
        strictCompatibility: true,
        logWarnings: false
      }),
    /missing sdkRange/
  );
});

test('modules:prepare warning mode keeps module and reports sdk incompatibility', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-host',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.2.0'
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  const result = runModulesPrepare({
    rootDir: tempRoot,
    modulesDir,
    hostSdkVersion: '0.1.0',
    strictCompatibility: false,
    logWarnings: false
  });

  assert.equal(result.resolvedModules.length, 1);
  assert.equal(result.compatibilityErrors.length, 0);
  assert.equal(result.resolvedModules[0]?.sdkCompatible, false);
  assert.match(result.warnings.join('\n'), /sdkRange="\^0\.2\.0"/);
});

test('modules:prepare resolves module templatePack entries when paths exist', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-host',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.1.0',
      templatePack: {
        defaultEntry: 'src/templates/defaults.json',
        overrideEntry: 'src/templates/overrides.json',
        contractRange: '^1.0.0'
      }
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'templates', 'defaults.json'),
    '{}'
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'templates', 'overrides.json'),
    '{}'
  );

  const result = runModulesPrepare({
    rootDir: tempRoot,
    modulesDir,
    hostSdkVersion: '0.1.0',
    strictCompatibility: true,
    logWarnings: false
  });

  assert.equal(result.resolvedModules.length, 1);
  assert.deepEqual(result.resolvedModules[0]?.templatePack, {
    defaultEntryPath: 'modules/mod.alpha/src/templates/defaults.json',
    overrideEntryPath: 'modules/mod.alpha/src/templates/overrides.json',
    contractRange: '^1.0.0'
  });
});

test('modules:prepare rejects templatePack entries that do not exist', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-prepare-'));
  const modulesDir = path.join(tempRoot, 'modules');

  writeFile(
    path.join(modulesDir, 'mod.alpha', 'module.json'),
    JSON.stringify({
      moduleId: 'mod.alpha',
      moduleMode: 'source-host',
      version: '1.0.0',
      sourceEntry: 'src/manifest.ts',
      sdkRange: '^0.1.0',
      templatePack: {
        defaultEntry: 'src/templates/defaults.json'
      }
    })
  );
  writeFile(
    path.join(modulesDir, 'mod.alpha', 'src', 'manifest.ts'),
    "export default { moduleId: 'mod.alpha', version: '1.0.0', displayName: 'Alpha' };"
  );

  assert.throws(
    () =>
      runModulesPrepare({
        rootDir: tempRoot,
        modulesDir,
        hostSdkVersion: '0.1.0',
        strictCompatibility: true,
        logWarnings: false
      }),
    /templatePack\.defaultEntry=.*does not exist/
  );
});
