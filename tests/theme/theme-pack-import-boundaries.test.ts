import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const THEME_ROOT = path.join(process.cwd(), 'themes');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walkThemeSourceFiles(directory: string, results: string[] = []) {
  if (!fs.existsSync(directory)) {
    return results;
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      walkThemeSourceFiles(absolutePath, results);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (SOURCE_EXTENSIONS.has(extension)) {
      results.push(absolutePath);
    }
  }

  return results;
}

test('theme source files do not import host aliases from @/*', () => {
  const files = walkThemeSourceFiles(THEME_ROOT);
  const forbiddenPatterns = [
    /from\s+['"]@\/[^'"]+['"]/g,
    /import\(\s*['"]@\/[^'"]+['"]\s*\)/g,
    /require\(\s*['"]@\/[^'"]+['"]\s*\)/g
  ];
  const violations: string[] = [];

  for (const absolutePath of files) {
    const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
    const fileContents = fs.readFileSync(absolutePath, 'utf8');

    for (const forbiddenPattern of forbiddenPatterns) {
      forbiddenPattern.lastIndex = 0;
      const matches = fileContents.match(forbiddenPattern);
      if (!matches) {
        continue;
      }

      for (const match of matches) {
        violations.push(`${relativePath}: ${match}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

