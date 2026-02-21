# mod.commerce.products

Backend-first module for commerce product catalog and lifecycle.

## Current scope

- module registration and runtime wiring
- API handler with admin product CRUD endpoints
- admin module pages for product list/create/edit
- DB schema + migrations for product persistence

## API routes

- Health: `GET /api/modules/mod.commerce.products/health`
- List products: `GET /api/modules/mod.commerce.products/products`
- Get product: `GET /api/modules/mod.commerce.products/products/:productId`
- Create product: `POST /api/modules/mod.commerce.products/products`
- Update product: `PATCH /api/modules/mod.commerce.products/products/:productId`
- Publish product: `POST /api/modules/mod.commerce.products/products/:productId/publish`
- Unpublish product: `POST /api/modules/mod.commerce.products/products/:productId/unpublish`

## Admin routes

- Alias root: `/admin/products`
- Create page: `/admin/products/create`
- Edit page: `/admin/products/:productId/edit`

## Runtime config and env

- This module currently has no dedicated `MOD_COMMERCE_PRODUCTS_*` env override matrix.
- Runtime behavior is driven by persisted product data and host-level module enable/disable state.

## Database assets

- schema: `db/schema.ts`
- migrations: `db/migrations/*`

## UI planning decisions (Sprint 6, 2026-02-17)

- Admin product CRUD UI ownership stays in this module.
- Canonical admin alias strategy is locked to:
  - `/admin/products`
  - `/admin/products/create`
  - `/admin/products/[productId]/edit`
- Core checkout remains outside this module (`/checkout/[checkoutToken]`).
- This module keeps no dashboard/frontend pages in the first UI sprint.

## Admin IA backlog (implementation-ready)

- `/admin/products`:
  - list products with DataTable (sort/search/column visibility)
  - toolbar filters for `kind` and `publication` status
  - row actions: edit, publish, unpublish
- `/admin/products/create`:
  - create form with type-specific validation:
    - `subscription`: requires `subscriptionTemplateId`, forbids one-time price field
    - `one_time`: requires active price/currency fields, forbids subscription template
    - one-time price input is decimal money (`priceAmount`, e.g. `19.99`) converted to cents in server actions
    - no provider/providerPriceId fields in admin form
- `/admin/products/[productId]/edit`:
  - same contract as create, with optimistic publish/unpublish controls

## Template contract (implemented, theme-first)

Page wrappers:

- `page.admin.products`
- `page.admin.products.create`
- `page.admin.products.edit`

Granular sections:

- `section.admin.products.table`
- `section.admin.products.form`

Current payload keys:

- `page.admin.products`: `title`, `description`, `createHref`, `createLabel`
- `page.admin.products.create`: `title`, `description`, `submitLabel`
- `page.admin.products.edit`: `title`, `description`, `productId`, `submitLabel`
- `section.admin.products.table`: `total`, `columns`, `rowCount`
- `section.admin.products.form`: `mode`, `productType`, `canPublish`

Resolution policy:

- Keep default CTC precedence (`theme_area_override` before `module_default`).
- Current implementation uses `ThemeCodeTemplate` wrappers with local fallback UI.
- No `module_override` or `lockTemplate` is used by default for this module UI.
- Optional `templatePack.defaults` can be added later only as fallback when theme has no template.

## i18n baseline (implemented)

Current file:

- `modules/mod.commerce.products/i18n/admin/en.json`
- `modules/mod.commerce.products/i18n/admin/es.json`

Implemented key namespaces:

- `products.page.list.*`
- `products.page.create.*`
- `products.page.edit.*`
- `products.page.notFound.*`
- `products.filters.*`
- `products.table.*`
- `products.form.*`
- `products.publication.*`
- `products.kind.*`
- `products.state.*`
- `products.feedback.*`

## Validation/test backlog

- Existing API coverage anchor:
  - `tests/modules/mod-commerce-products-api.test.ts`
- Planned UI-focused coverage:
  - admin page rendering and action-state tests for create/edit/publish transitions
  - negative path tests for type mismatch (`subscription` vs `one_time`) and missing required fields

## Module-off behavior

- If module is disabled/uninstalled, `/admin/products*` aliases must fail closed via module dispatcher fallback.
- Core admin and checkout routes remain operational without this module.

## Troubleshooting

- Product list empty: verify module is enabled and at least one product exists in module tables.
- Publish/unpublish action rejected: confirm admin auth/session and product ownership state.
- Type mismatch (`subscription` vs `one_time`): validate form payload matches server-side type constraints.
