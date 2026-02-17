---
title: Commerce Products Module
sidebar_position: 15
---

# Commerce Products Module

`mod.commerce.products` is the backend owner of the product catalog used by checkout flows.

Current scope is backend-only (no admin/frontend pages yet).

## Module contract

- Module ID: `mod.commerce.products`
- Mode: `source-host`
- Entry: `modules/mod.commerce.products/src/manifest.ts`
- API handler: `modules/mod.commerce.products/src/api-handler.ts`
- DB owner:
  - `mod_commerce_products`
  - `mod_commerce_product_prices`
  - `mod_commerce_product_publication`

`module.json` declares DB migrations via:

- `db.schemaVersion=1`
- `db.migrationsDir="db/migrations"`

## Product kinds

Supported kinds:

- `subscription`
- `one_time`

Rules:

- `subscription`:
  - requires `subscriptionTemplateId`
  - rejects `price` payload in create/update requests
- `one_time`:
  - requires own price payload on create
  - rejects `subscriptionTemplateId`

## API surface (phase 1)

Base path:

- `/api/modules/mod.commerce.products/*`

Routes:

- `GET /health`
- `GET /products`
- `GET /products/:productId`
- `POST /products`
- `PATCH /products/:productId`
- `POST /products/:productId/publish`
- `POST /products/:productId/unpublish`

Auth:

- `GET /health` is public
- all product routes are `auth: 'admin'`

## Publication and price behavior

Publication state is persisted in `mod_commerce_product_publication`.

One-time publication guard:

- publishing a `one_time` product without an active price returns
  `one_time_product_missing_active_price` (HTTP `409` in API).

Price versioning:

- when price is updated for `one_time`, existing active prices are deactivated
- a new active row is inserted with new `effectiveFrom`

## Error model highlights

Common mutation error codes mapped by API handler:

- `duplicate_product_key` -> `409`
- `not_found` -> `404`
- `one_time_product_missing_active_price` -> `409`
- validation/domain input errors -> `400`

## Tests

Current module test coverage:

- `tests/modules/mod-commerce-products-validation.test.ts`
  - validator rules for kind constraints and publication payload
- `tests/modules/mod-commerce-products-api.test.ts`
  - `401/403` admin auth behavior
  - mutation error status mapping (including publication transition guard)

## Future UI/template readiness

UI is not implemented in this phase, but module is planned to be template-compatible when routes/components are added.

Recommended future component IDs:

- `mod.commerce.products.admin.product-form`
- `mod.commerce.products.admin.product-table`
- `mod.commerce.products.frontend.product-card`

Expected areas for future UI:

- admin management: `area='admin'`
- public catalog/checkout previews: `area='frontend'`

