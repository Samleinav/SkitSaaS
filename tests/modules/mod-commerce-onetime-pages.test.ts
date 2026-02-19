import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readFile(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  assert.ok(fs.existsSync(absolutePath), `Missing file: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

test('catalog buy now submits direct checkout action without cart/order hop', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /<form action=\{startOneTimeProductCheckoutAction\}>/
  );
  assert.match(
    pagesSource,
    /name="checkoutSource"\s+value="buy_now"/
  );
});

test('catalog page reads error search param and renders error state from route context', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /export async function renderOneTimeProductsCatalogPage\(context: ModuleRouteContext\)/
  );
  assert.match(
    pagesSource,
    /readSearchParam\(context,\s*'error'\)/
  );
});

test('order flow keeps checkout action with explicit order source marker', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /name="checkoutSource"\s+value="order"/
  );
});

test('cart to order flow preserves aggregated items query contract', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /name="items"\s+value=\{cartItemsParam\}/
  );
});

test('order checkout action posts lineItemsPayload for multi-item backend contract', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /name="lineItemsPayload"\s+value=\{lineItemsPayload\}/
  );
  assert.match(
    pagesSource,
    /name="cartItems"\s+value=\{cartItemsParam\}/
  );
});

test('order page guards empty aggregated carts before rendering checkout submit', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /if \(!firstItem \|\| !lineItemsPayload\)/
  );
});

test('order page blocks checkout submit when cart contains mixed currency items', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(pagesSource, /const hasMixedCurrency = orderCurrencies\.size > 1/);
  assert.match(pagesSource, /disabled=\{hasMixedCurrency\}/);
  assert.match(
    pagesSource,
    /moduleMessages\.order\.mixedCurrencyWarning/
  );
});

test('buy_now action failures resolve back to catalog path and preserve source metadata', () => {
  const actionsSource = readFile('modules/mod.commerce.one-time-payments/src/actions.ts');

  assert.match(
    actionsSource,
    /if \(source === 'buy_now'\)\s*\{\s*return buildCatalogPath\(error\);/s
  );
  assert.match(actionsSource, /frontend\.products\.buy_now/);
});

test('order action parses lineItems payload and forwards cart items contract', () => {
  const actionsSource = readFile('modules/mod.commerce.one-time-payments/src/actions.ts');

  assert.match(actionsSource, /parseLineItemsPayload/);
  assert.match(actionsSource, /const lineItems = parsedLineItemsPayload\.lineItems/);
  assert.match(actionsSource, /invalid_line_items/);
  assert.match(actionsSource, /items:\s*cartItemsQueryParam/);
});

test('manifest passes route context to catalog page handler', () => {
  const manifestSource = readFile('modules/mod.commerce.one-time-payments/src/manifest.ts');

  assert.match(
    manifestSource,
    /path:\s*'\/'[\s\S]*handler:\s*\(\{\s*context\s*\}\)\s*=>\s*renderOneTimeProductsCatalogPage\(context\)/
  );
});
