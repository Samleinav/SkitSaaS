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

test('catalog page exposes cart CTA and count when items query is present', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /const cartItemsParam = serializeCartItemsQueryParam\(currentCartItems\)/
  );
  assert.match(
    pagesSource,
    /const cartItemsCount = currentCartItems\.reduce/
  );
  assert.match(
    pagesSource,
    /const hasCartItems = cartItemsCount > 0/
  );
  assert.match(
    pagesSource,
    /moduleMessages\.catalog\.viewCart/
  );
  assert.match(
    pagesSource,
    /href=\{cartPath\}/
  );
});

test('catalog cards render in-cart state using current cart items', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /currentCartItems\.find\(\(item\) => item\.productId === product\.productId\)/
  );
  assert.match(
    pagesSource,
    /const inCartQuantity = existingCartItem\?\.quantity \?\? 0/
  );
  assert.match(
    pagesSource,
    /const isInCart = inCartQuantity > 0/
  );
  assert.match(
    pagesSource,
    /messages\.catalog\.inCartLabel/
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

test('cart page blocks continue action when cart contains mixed currency items', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(pagesSource, /const hasMixedCurrency = cartCurrencies\.size > 1/);
  assert.match(
    pagesSource,
    /<button[\s\S]*type="submit"[\s\S]*disabled=\{hasMixedCurrency\}/
  );
  assert.match(
    pagesSource,
    /moduleMessages\.cart\.mixedCurrencyWarning/
  );
});

test('cart and order pages surface unavailable-item warning when requested items are dropped', () => {
  const pagesSource = readFile('modules/mod.commerce.one-time-payments/src/pages.tsx');

  assert.match(
    pagesSource,
    /const hasUnavailableItems = requestedItems\.length > resolvedItems\.length/
  );
  assert.match(
    pagesSource,
    /moduleMessages\.cart\.unavailableItemsWarning/
  );
  assert.match(
    pagesSource,
    /moduleMessages\.order\.unavailableItemsWarning/
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
