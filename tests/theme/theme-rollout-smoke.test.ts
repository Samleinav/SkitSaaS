import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readFileOrThrow(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  assert.ok(fs.existsSync(absolutePath), `Missing file: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

test('rollout smoke keeps deterministic renderer contracts for critical area routes', () => {
  const routeContracts: Array<{
    filePath: string;
    areaSelection: string;
    rendererSnippet: string;
  }> = [
    {
      filePath: 'app/(frontend)/page.tsx',
      areaSelection: "getThemeSelectionForArea('frontend')",
      rendererSnippet: 'path="/"'
    },
    {
      filePath: 'app/(dashboard)/admin/page.tsx',
      areaSelection: "getThemeSelectionForArea('admin')",
      rendererSnippet: 'id="page.admin.home"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/page.tsx',
      areaSelection: "getThemeSelectionForArea('dashboard')",
      rendererSnippet: 'id="page.dashboard.home"'
    },
    {
      filePath: 'app/(login)/login/page.tsx',
      areaSelection: "getThemeSelectionForArea('dashboard')",
      rendererSnippet: 'id="page.login.user"'
    },
    {
      filePath: 'app/(login)/admin/login/page.tsx',
      areaSelection: "getThemeSelectionForArea('admin')",
      rendererSnippet: 'id="page.login.admin"'
    }
  ];

  for (const routeContract of routeContracts) {
    const fileContents = readFileOrThrow(routeContract.filePath);
    assert.ok(
      fileContents.includes(routeContract.areaSelection),
      `${routeContract.filePath} must resolve area selection: ${routeContract.areaSelection}`
    );
    assert.ok(
      fileContents.includes(routeContract.rendererSnippet),
      `${routeContract.filePath} missing renderer snippet: ${routeContract.rendererSnippet}`
    );
    assert.doesNotMatch(
      fileContents,
      /featureFlags\.useThemeRuntime/,
      `${routeContract.filePath} must not gate rendering behind legacy feature flag`
    );
  }
});

test('theme hydration guards keep root layout and runtime script resilient', () => {
  const rootLayout = readFileOrThrow('app/layout.tsx');
  const runtimeScript = readFileOrThrow('lib/theme-runtime.ts');

  assert.match(rootLayout, /suppressHydrationWarning/);
  assert.match(rootLayout, /<ThemeRuntimeScript\s*\/>/);
  assert.match(
    rootLayout,
    /<Suspense fallback=\{<RootLayoutSkeleton\s*\/>\}>/
  );
  assert.match(runtimeScript, /return `\(\(\) => \{\\n  try \{/);
  assert.match(runtimeScript, /} catch \(error\) \{/);
});
