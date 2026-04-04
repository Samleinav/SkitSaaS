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
  path.resolve(process.cwd(), 'docs/audit'),
  path.resolve(process.cwd(), 'docs/skitsaas')
];
const INDEX_DOC_CANDIDATES = [
  path.resolve(process.cwd(), 'docs/00-documentation-index.md'),
  path.resolve(process.cwd(), 'docs/skitsaas/index.md')
];
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const CODE_SPAN_REGEX = /`([^`\r\n]+)`/g;

const REPO_PATH_PREFIXES = [
  'app/',
  'lib/',
  'components/',
  'scripts/',
  'tests/',
  'docs/',
  'modules/',
  'themes/',
  'plans/',
  'package.json'
];

function listMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeCandidate(rawValue) {
  return rawValue
    .trim()
    .replace(/[),.;:]+$/g, '')
    .replaceAll('\\', '/');
}

function shouldValidateCodeSpan(codeSpan) {
  if (codeSpan.length === 0) {
    return false;
  }

  if (codeSpan.includes('*') || codeSpan.includes('<') || codeSpan.includes('>')) {
    return false;
  }

  if (codeSpan.includes('...') || codeSpan.includes('|')) {
    return false;
  }

  if (/YYYY(-MM(-DD)?)?/i.test(codeSpan)) {
    return false;
  }

  if (codeSpan.includes(' ')) {
    return false;
  }

  return REPO_PATH_PREFIXES.some(
    (prefix) => codeSpan === prefix || codeSpan.startsWith(prefix)
  );
}

function existsRepoPath(repoRelativePath) {
  const normalized = repoRelativePath.replaceAll('/', path.sep);
  const fullPath = path.resolve(process.cwd(), normalized);
  return fs.existsSync(fullPath);
}

function validateFile(filePath) {
  const relFilePath = path.relative(process.cwd(), filePath).replaceAll('\\', '/');
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const errors = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    CODE_SPAN_REGEX.lastIndex = 0;
    const matches = line.matchAll(CODE_SPAN_REGEX);

    for (const match of matches) {
      const candidate = normalizeCandidate(match[1]);
      if (!shouldValidateCodeSpan(candidate)) {
        continue;
      }

      if (!existsRepoPath(candidate)) {
        errors.push(
          `${relFilePath}:${lineIndex + 1} missing repo path reference "${candidate}".`
        );
      }
    }
  }

  return errors;
}

function main() {
  const indexDocs = INDEX_DOC_CANDIDATES.filter((candidate) =>
    fs.existsSync(candidate)
  );
  const files = [
    ...DOCS_SCOPE_DIRS.flatMap((dirPath) => listMarkdownFiles(dirPath)),
    ...indexDocs
  ].filter((value, index, array) => array.indexOf(value) === index && fs.existsSync(value));

  const errors = [];
  for (const filePath of files) {
    errors.push(...validateFile(filePath));
  }

  if (errors.length > 0) {
    console.error('[docs-validate-code-paths] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`[docs-validate-code-paths] OK (${files.length} files checked).`);
}

main();
