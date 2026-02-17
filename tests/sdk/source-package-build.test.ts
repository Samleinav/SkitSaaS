import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildSourcePackageModule } from '../../app/sdk/src/build';

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('buildSourcePackageModule transpiles ts/tsx and copies static assets', () => {
  const moduleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-build-module-'));
  const srcDir = path.join(moduleDir, 'src');

  writeFile(
    path.join(srcDir, 'manifest.ts'),
    "import { ExampleView } from './ui/example-view';\nexport default { moduleId: 'mod.test', version: '1.0.0', displayName: ExampleView.name };"
  );
  writeFile(
    path.join(srcDir, 'ui', 'example-view.tsx'),
    "export function ExampleView() { return <div>Hello</div>; }"
  );
  writeFile(
    path.join(srcDir, 'ui', 'theme.module.css'),
    '.root { color: #0f172a; }'
  );
  writeFile(path.join(srcDir, 'data.json'), '{"ok": true}');
  writeFile(path.join(srcDir, 'notes.md'), '# ignored');

  const result = buildSourcePackageModule({
    moduleId: 'mod.test',
    moduleDir
  });

  assert.equal(path.basename(result.manifestPath), 'manifest.js');
  assert.ok(fs.existsSync(path.join(moduleDir, 'dist', 'manifest.js')));
  assert.ok(fs.existsSync(path.join(moduleDir, 'dist', 'ui', 'example-view.js')));
  assert.ok(fs.existsSync(path.join(moduleDir, 'dist', 'ui', 'theme.module.css')));
  assert.ok(fs.existsSync(path.join(moduleDir, 'dist', 'data.json')));
  assert.equal(fs.existsSync(path.join(moduleDir, 'dist', 'notes.md')), false);
  assert.match(
    fs.readFileSync(path.join(moduleDir, 'dist', 'manifest.js'), 'utf8'),
    /from '\.\/ui\/example-view\.js'/
  );
  assert.equal(result.transpiledFileCount, 2);
  assert.equal(result.copiedFileCount, 2);
});

test('buildSourcePackageModule fails with module-tagged error when src is missing', () => {
  const moduleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-build-module-'));

  assert.throws(
    () =>
      buildSourcePackageModule({
        moduleId: 'mod.missing',
        moduleDir
      }),
    /\[mod\.missing\] src directory is missing/
  );
});
