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

test('admin products DataTable avoids manual kind/publication toolbar selects', () => {
  const tableSource = readFile(
    'modules/mod.commerce.products/src/admin-products-data-table.tsx'
  );

  assert.doesNotMatch(tableSource, /kindFilter/);
  assert.doesNotMatch(tableSource, /publicationFilter/);
  assert.doesNotMatch(tableSource, /<select[\s\S]*subscription[\s\S]*<\/select>/);
  assert.doesNotMatch(tableSource, /<select[\s\S]*published[\s\S]*<\/select>/);
});

test('admin product actions convert decimal priceAmount to cents and persist provider as null', () => {
  const actionsSource = readFile('modules/mod.commerce.products/src/actions.ts');

  assert.match(actionsSource, /normalizePriceAmountToCents/);
  assert.match(actionsSource, /form\.string\('priceAmount'\)/);
  assert.match(actionsSource, /provider:\s*null/);
  assert.match(actionsSource, /providerPriceId:\s*null/);
});

test('admin products pages resolve template ids via ThemeCodeTemplate module fallback path', () => {
  const pagesSource = readFile('modules/mod.commerce.products/src/pages.tsx');

  assert.match(pagesSource, /moduleId=\{COMMERCE_PRODUCTS_MODULE_ID\}/);
  assert.doesNotMatch(pagesSource, /renderCommerceProductsModuleTemplate/);
  assert.match(pagesSource, /<ThemeCodeTemplate[\s\S]*id="page\.admin\.products"/);
  assert.match(
    pagesSource,
    /<ThemeCodeTemplate[\s\S]*id="page\.admin\.products\.create"/
  );
  assert.match(
    pagesSource,
    /<ThemeCodeTemplate[\s\S]*id="page\.admin\.products\.edit"/
  );
  assert.match(
    pagesSource,
    /<ThemeCodeTemplate[\s\S]*id="section\.admin\.products\.table"/
  );
  assert.match(
    pagesSource,
    /<ThemeCodeTemplate[\s\S]*id="section\.admin\.products\.form"/
  );
});

test('admin products module code templates live as individual template-id files', () => {
  const templateFiles = [
    'modules/mod.commerce.products/src/templates/page.admin.products.tsx',
    'modules/mod.commerce.products/src/templates/page.admin.products.create.tsx',
    'modules/mod.commerce.products/src/templates/page.admin.products.edit.tsx',
    'modules/mod.commerce.products/src/templates/section.admin.products.table.tsx',
    'modules/mod.commerce.products/src/templates/section.admin.products.form.tsx'
  ];

  for (const templateFile of templateFiles) {
    const templateSource = readFile(templateFile);
    assert.match(templateSource, /export default function/);
  }
});
