#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DOCS_SCOPE_DIRS = [
  path.resolve(process.cwd(), 'docs/core'),
  path.resolve(process.cwd(), 'docs/subscriptions'),
  path.resolve(process.cwd(), 'docs/operations'),
  path.resolve(process.cwd(), 'docs/extensions'),
  path.resolve(process.cwd(), 'docs/modules'),
  path.resolve(process.cwd(), 'docs/sdk'),
  path.resolve(process.cwd(), 'docs/skitsaas')
];
const APP_ROOT = path.resolve(process.cwd(), 'app');
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const ROUTE_REGEX = /\/[A-Za-z0-9_\-./:[\]]+/g;
const ROUTE_ALLOWED_ROOTS = new Set([
  'admin',
  'dashboard',
  'login',
  'sign-up',
  'sign-in',
  'pricing',
  'checkout',
  'contact-us',
  'modules'
]);

function listFilesRecursive(dirPath, fileFilterFn) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, fileFilterFn));
      continue;
    }

    if (entry.isFile() && fileFilterFn(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeRouteValue(value) {
  return value
    .trim()
    .replace(/[),.;:]+$/g, '')
    .split('?')[0]
    .split('#')[0];
}

function isRouteGroupSegment(segment) {
  return /^\(.*\)$/.test(segment);
}

function filePathToRoutePattern(filePath) {
  const relative = path.relative(APP_ROOT, filePath).replaceAll('\\', '/');
  const segments = relative.split('/');
  const filtered = segments.filter((segment) => !isRouteGroupSegment(segment));

  if (filtered.length === 0) {
    return null;
  }

  if (filtered[filtered.length - 1] !== 'page.tsx') {
    return null;
  }

  const routeSegments = filtered.slice(0, -1);
  if (routeSegments.length === 0) {
    return '/';
  }

  return `/${routeSegments.join('/')}`;
}

function isDynamicSegment(segment) {
  return /^\[[^./]+]$/.test(segment);
}

function isCatchAllSegment(segment) {
  return /^\[\.\.\.[^./]+]$/.test(segment);
}

function isOptionalCatchAllSegment(segment) {
  return /^\[\[\.\.\.[^./]+]]$/.test(segment);
}

function splitRoute(route) {
  if (route === '/') {
    return [];
  }

  return route.replace(/^\/+/, '').split('/').filter(Boolean);
}

function matchesRoutePattern(pattern, route) {
  const patternSegments = splitRoute(pattern);
  const routeSegments = splitRoute(route);

  function matchAt(patternIndex, routeIndex) {
    if (patternIndex === patternSegments.length && routeIndex === routeSegments.length) {
      return true;
    }

    if (patternIndex >= patternSegments.length) {
      return false;
    }

    const segment = patternSegments[patternIndex];

    if (isOptionalCatchAllSegment(segment)) {
      for (let nextRouteIndex = routeIndex; nextRouteIndex <= routeSegments.length; nextRouteIndex += 1) {
        if (matchAt(patternIndex + 1, nextRouteIndex)) {
          return true;
        }
      }
      return false;
    }

    if (isCatchAllSegment(segment)) {
      for (let nextRouteIndex = routeIndex + 1; nextRouteIndex <= routeSegments.length; nextRouteIndex += 1) {
        if (matchAt(patternIndex + 1, nextRouteIndex)) {
          return true;
        }
      }
      return false;
    }

    if (routeIndex >= routeSegments.length) {
      return false;
    }

    if (isDynamicSegment(segment)) {
      return matchAt(patternIndex + 1, routeIndex + 1);
    }

    if (segment !== routeSegments[routeIndex]) {
      return false;
    }

    return matchAt(patternIndex + 1, routeIndex + 1);
  }

  return matchAt(0, 0);
}

function shouldValidateDocRoute(route) {
  if (!route.startsWith('/')) {
    return false;
  }

  if (route === '/' || route.startsWith('/api/')) {
    return false;
  }

  if (route.includes('*') || route.includes(':') || route.includes('.ts')) {
    return false;
  }

  const firstSegment = route.replace(/^\/+/, '').split('/')[0] ?? '';
  return ROUTE_ALLOWED_ROOTS.has(firstSegment);
}

function validateDocFile(filePath, routePatterns) {
  const relPath = path.relative(process.cwd(), filePath).replaceAll('\\', '/');
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const errors = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const matches = line.matchAll(ROUTE_REGEX);

    for (const match of matches) {
      const route = normalizeRouteValue(match[0]);
      if (!shouldValidateDocRoute(route)) {
        continue;
      }

      const exists = routePatterns.some((pattern) => matchesRoutePattern(pattern, route));
      if (!exists) {
        errors.push(
          `${relPath}:${lineIndex + 1} unknown page route reference "${route}".`
        );
      }
    }
  }

  return errors;
}

function main() {
  const pageFiles = listFilesRecursive(
    APP_ROOT,
    (filePath) => filePath.replaceAll('\\', '/').endsWith('/page.tsx')
  );
  const routePatterns = pageFiles
    .map((filePath) => filePathToRoutePattern(filePath))
    .filter(Boolean);

  const docFiles = DOCS_SCOPE_DIRS.flatMap((dirPath) =>
    listFilesRecursive(dirPath, (filePath) =>
      MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    )
  );

  const errors = [];
  for (const docFilePath of docFiles) {
    errors.push(...validateDocFile(docFilePath, routePatterns));
  }

  if (errors.length > 0) {
    console.error('[docs-validate-page-routes] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `[docs-validate-page-routes] OK (${docFiles.length} files checked, ${routePatterns.length} route patterns).`
  );
}

main();
