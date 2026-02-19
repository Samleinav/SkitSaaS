import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readFile(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  assert.ok(fs.existsSync(absolutePath), `Missing file: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

test('admin product forms use decimal priceAmount field and currency select', () => {
  const pagesSource = readFile('modules/mod.commerce.products/src/pages.tsx');

  assert.match(pagesSource, /<select\s+name="priceCurrency"/);
  assert.match(pagesSource, /name="priceAmount"/);
  assert.doesNotMatch(pagesSource, /name="priceUnitAmountCents"/);
});

test('admin product forms no longer expose provider fields', () => {
  const pagesSource = readFile('modules/mod.commerce.products/src/pages.tsx');

  assert.doesNotMatch(pagesSource, /name="priceProvider"/);
  assert.doesNotMatch(pagesSource, /name="priceProviderId"/);
});

test('admin products home uses DataTable and drops manual kind/publication GET filters', () => {
  const pagesSource = readFile('modules/mod.commerce.products/src/pages.tsx');
  const homeSection = pagesSource.split(
    'export async function renderCommerceProductsAdminCreatePage'
  )[0];

  assert.match(homeSection, /CommerceProductsAdminDataTable/);
  assert.doesNotMatch(homeSection, /name="published"/);
  assert.doesNotMatch(homeSection, /name="kind"/);
  assert.doesNotMatch(homeSection, /section\.admin\.products\.filters/);
});

test('admin product actions convert decimal priceAmount to cents and persist provider as null', () => {
  const actionsSource = readFile('modules/mod.commerce.products/src/actions.ts');

  assert.match(actionsSource, /normalizePriceAmountToCents/);
  assert.match(actionsSource, /form\.string\('priceAmount'\)/);
  assert.match(actionsSource, /provider:\s*null/);
  assert.match(actionsSource, /providerPriceId:\s*null/);
});
