import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const API_ROOT = path.join(process.cwd(), 'app/api');

type AllowlistedRoute = {
  reason: string;
  requiredSnippets: string[];
};

const ALLOWLIST: Record<string, AllowlistedRoute> = {
  'app/api/auth/providers/[providerId]/callback/route.ts': {
    reason: 'public auth provider callback is dispatched through the module auth runtime',
    requiredSnippets: ['resolveModuleApiHandler', 'applyAuthProviderRateLimit']
  },
  'app/api/auth/providers/[providerId]/start/route.ts': {
    reason: 'public auth provider handoff is dispatched through the module auth runtime with auth rate limiting',
    requiredSnippets: ['resolveModuleApiHandler', 'applyAuthProviderRateLimit']
  },
  'app/api/modules/[moduleId]/[[...slug]]/route.ts': {
    reason: 'module API dispatcher delegates auth/rate-limit/proxy enforcement to module route contracts',
    requiredSnippets: ['resolveModuleApiHandler']
  },
  'app/api/sfiles/serve/[...path]/route.ts': {
    reason: 'public-file serving route performs inline visibility and permission checks',
    requiredSnippets: ['getSfilesActor', 'canAccess', "file.visibility !== 'public'"]
  }
};

function collectRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function normalizeRelativePath(filePath: string) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function isWrappedApiRoute(source: string) {
  return source.includes('withApiRouteEntries(') || source.includes('withApiProxy(');
}

test('all app/api route handlers are wrapped or explicitly allowlisted', () => {
  const routeFiles = collectRouteFiles(API_ROOT);

  for (const allowlistedRoute of Object.keys(ALLOWLIST)) {
    assert.ok(
      routeFiles.some((filePath) => normalizeRelativePath(filePath) === allowlistedRoute),
      `Allowlisted API route no longer exists: ${allowlistedRoute}`
    );
  }

  for (const filePath of routeFiles) {
    const relativePath = normalizeRelativePath(filePath);
    const source = readFileSync(filePath, 'utf8');

    if (isWrappedApiRoute(source)) {
      continue;
    }

    const allowlistedRoute = ALLOWLIST[relativePath];
    assert.ok(
      allowlistedRoute,
      `API route must use withApiRouteEntries()/withApiProxy() or be explicitly allowlisted: ${relativePath}`
    );

    for (const snippet of allowlistedRoute.requiredSnippets) {
      assert.match(
        source,
        new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${relativePath} is allowlisted as "${allowlistedRoute.reason}" but is missing required snippet: ${snippet}`
      );
    }
  }
});
