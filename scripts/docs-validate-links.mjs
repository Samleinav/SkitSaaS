#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DOCS_ROOT = path.resolve(process.cwd(), 'docs');
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const MARKDOWN_LINK_REGEX = /\[[^\]]*]\(([^)]+)\)/g;

function isExternalLink(target) {
  return (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('#') ||
    target.startsWith('javascript:') ||
    target.startsWith('data:')
  );
}

function listMarkdownFiles(dirPath) {
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

    const extension = path.extname(entry.name).toLowerCase();
    if (MARKDOWN_EXTENSIONS.has(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function stripAnchorAndQuery(value) {
  const [withoutAnchor] = value.split('#', 1);
  const [withoutQuery] = withoutAnchor.split('?', 1);
  return withoutQuery;
}

function resolveLinkTarget(sourceFilePath, rawTarget) {
  const cleanTarget = stripAnchorAndQuery(rawTarget).trim();
  if (cleanTarget.length === 0) {
    return null;
  }

  if (rawTarget.startsWith('/')) {
    return path.join(DOCS_ROOT, cleanTarget);
  }

  return path.resolve(path.dirname(sourceFilePath), cleanTarget);
}

function validateFileLinks(filePath) {
  const relPath = path.relative(process.cwd(), filePath).replaceAll('\\', '/');
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const errors = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    MARKDOWN_LINK_REGEX.lastIndex = 0;
    const matches = line.matchAll(MARKDOWN_LINK_REGEX);

    for (const match of matches) {
      const rawTarget = match[1].trim();
      if (rawTarget.length === 0 || isExternalLink(rawTarget)) {
        continue;
      }

      const resolved = resolveLinkTarget(filePath, rawTarget);
      if (!resolved) {
        continue;
      }

      if (fs.existsSync(resolved)) {
        continue;
      }

      errors.push(
        `${relPath}:${lineIndex + 1} broken link "${rawTarget}" (resolved: ${path.relative(
          process.cwd(),
          resolved
        )}).`
      );
    }
  }

  return errors;
}

function main() {
  if (!fs.existsSync(DOCS_ROOT)) {
    console.error('[docs-validate-links] Missing docs directory.');
    process.exit(1);
  }

  const files = listMarkdownFiles(DOCS_ROOT);
  const errors = [];

  for (const file of files) {
    errors.push(...validateFileLinks(file));
  }

  if (errors.length > 0) {
    console.error('[docs-validate-links] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`[docs-validate-links] OK (${files.length} files checked).`);
}

main();

