# mod.commerce.products

Backend-first module scaffold for commerce product catalog.

Current scope in this scaffold:

- module registration and runtime wiring
- API handler with admin product CRUD endpoints

Planned implementation:

- automated tests for validators and API behavior
- publication conflict/state transition hardening extras if required by business rules

Database assets:

- schema: `db/schema.ts`
- migrations: `db/migrations/*`

Module routes:

- Health: `/api/modules/mod.commerce.products/health`
- List products: `GET /api/modules/mod.commerce.products/products`
- Get product: `GET /api/modules/mod.commerce.products/products/:productId`
- Create product: `POST /api/modules/mod.commerce.products/products`
- Update product: `PATCH /api/modules/mod.commerce.products/products/:productId`
- Publish product: `POST /api/modules/mod.commerce.products/products/:productId/publish`
- Unpublish product: `POST /api/modules/mod.commerce.products/products/:productId/unpublish`
