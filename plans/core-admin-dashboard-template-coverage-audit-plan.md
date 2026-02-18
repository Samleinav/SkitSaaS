# Plan: Core Admin/Dashboard Theme Template Coverage Audit

Status: Completed
Start date: 2026-02-17
Current phase: Completed
Last review: 2026-02-17

## Objective
Verificar que el core de `admin/dashboard` renderiza mediante templates theme (CTC), identificar rutas con render directo en core y preparar remediacion ordenada.

## Scope
- Core host en `app/(dashboard)/**` para areas `admin` y `dashboard`.
- Wrappers CTC usados por rutas core: `ThemeCodeTemplate`, `ThemeTemplate`, `TemplateTable`, `TemplateAsyncSubmitButton`, `TemplateConfirmSubmitButton`.
- Cobertura de IDs contra `themes/first-backoffice/templates/*.tsx`.

## Out of Scope
- Frontend publico (`app/(frontend)`), excepto componentes compartidos ya usados por admin/dashboard.
- Cambios funcionales fuera de cobertura CTC (excepto hotfix visual de paridad en `/admin/app-config`).
- UI interna de modulos externos (module-owned pages/widgets), salvo su punto de entrada en core.

## Cross-plan alignment (2026-02-17)
- El plan `plans/checkout-modules-one-time-products-plan.md` (Sprint 6) define backlog UI module-owned para commerce.
- IDs CTC de commerce UI quedan fuera de este audit de core host y se consideran ownership de modulo:
  - Admin products: `page.admin.products`, `page.admin.products.create`, `page.admin.products.edit`, `section.admin.products.filters`, `section.admin.products.table`, `section.admin.products.form`
  - Frontend one-time: `page.frontend.products.catalog`, `page.frontend.products.cart`, `page.frontend.products.order`, `section.frontend.products.catalog.card`, `section.frontend.products.cart.summary`, `section.frontend.products.order.form`

## Priority Order
1. P0 - Cerrar huecos de rutas core con render directo sin template.
2. P1 - Consolidar contrato CTC/docs/tests para evitar regresiones.
3. P2 - Endurecer cobertura para extensiones modulares dinamicas.

## Active Sprint Snapshot
- [x] P0 - Corregir paridad visual de items en `/admin/app-config` para mantener el patron de widget menu de `/admin`.
- [x] P0 - Definir y cerrar estrategia final para wrapper compartido de `app/(dashboard)/layout.tsx`.
- [x] P1 - Formalizar excepcion de dispatchers modulares (`return content`) en docs/tests.
- [x] P1 - Cubrir widgets admin dinamicos con template host fallback (`section.admin.dashboard.module-widget`).
- [x] P1 - Endurecer guard de coverage de rutas core + excepciones de dispatcher.

## Coverage Legend
- `X`: cubierto por template en core y presente en `themes/first-backoffice`.
- `-`: no aplica por ser ruta de `redirect(...)` o route dispatcher de modulos (retorna `ReactNode` del modulo por diseno).
- vacio: ruta core con retorno directo sin template (gap a resolver).

## Route Checklist (Shared + Layout)

| Route / Entry | Core file | Template IDs used | Covered |
| --- | --- | --- | --- |
| `(dashboard group layout)` | `app/(dashboard)/layout.tsx`, `app/(dashboard)/private-area-shell.tsx` | `layout.private.shell`, `layout.private.header`, `ui.language-switcher`, `ui.user-menu` | X |
| `PrivateAreaHeader` (shared) | `app/(dashboard)/private-area-header.tsx` | `layout.private.header`, `ui.language-switcher`, `ui.user-menu` | X |
| `/admin` layout | `app/(dashboard)/admin/layout.tsx` | `layout.admin.shell`, `section.admin.nav`, `section.admin.breadcrumb`, `ui.theme-toggle`, `ui.language-switcher` | X |
| `/admin/app-config` layout | `app/(dashboard)/admin/app-config/layout.tsx`, `app/(dashboard)/admin/app-config/section-nav.client.tsx` | `layout.admin.app-config.shell`, `section.admin.app-config-nav`, `section.admin.app-config-nav.panel`, `section.admin.app-config-nav.item` | X |
| `/dashboard` layout | `app/(dashboard)/dashboard/layout.tsx`, `app/(dashboard)/dashboard/layout-client.tsx` | `layout.dashboard.shell`, `ui.theme-toggle`, `ui.language-switcher` | X |
| `/admin` not-found | `app/(dashboard)/admin/not-found.tsx` | dynamic from assets config, fallback `system.not-found` | X |
| `/dashboard` not-found | `app/(dashboard)/dashboard/not-found.tsx` | dynamic from assets config, fallback `system.not-found` | X |
| `/dashboard/activity` loading | `app/(dashboard)/dashboard/activity/loading.tsx` | `page.dashboard.activity.loading` | X |

## Route Checklist (Admin)

| Route | Core file | Template IDs used | Covered |
| --- | --- | --- | --- |
| `/admin` | `app/(dashboard)/admin/page.tsx` | `page.admin.home`, `section.admin.dashboard.overview`, `section.admin.dashboard.quick-links`, `section.admin.dashboard.recent-activity` | X (core widgets) |
| `/admin/users` | `app/(dashboard)/admin/users/page.tsx`, `app/(dashboard)/admin/users/columns.tsx`, `app/(dashboard)/admin/users/create-user-dialog.tsx` | `page.admin.users`, `section.admin.metrics-grid`, `section.admin.table.users.cell`, `ui.table`, `ui.table.control`, `ui.dialog`, `ui.async-submit-button`, `ui.alert-dialog` | X |
| `/admin/users/[userId]` | `app/(dashboard)/admin/users/[userId]/page.tsx` | `page.admin.user.detail`, `ui.async-submit-button`, `ui.alert-dialog` | X |
| `/admin/logs` | `app/(dashboard)/admin/logs/page.tsx`, `app/(dashboard)/admin/logs/log-columns.tsx` | `page.admin.logs`, `section.admin.table.logs.cell`, `ui.table`, `ui.table.control` | X |
| `/admin/orders` | `app/(dashboard)/admin/orders/page.tsx`, `app/(dashboard)/admin/orders/order-columns.tsx` | `page.admin.orders`, `section.admin.metrics-grid`, `section.admin.table.orders.cell`, `ui.table`, `ui.table.control` | X |
| `/admin/orders/create` | `app/(dashboard)/admin/orders/create/page.tsx`, `app/(dashboard)/admin/orders/create/create-order-form.tsx` | `page.admin.orders.create`, `ui.async-submit-button` | X |
| `/admin/orders/[orderId]/edit` | `app/(dashboard)/admin/orders/[orderId]/edit/page.tsx` | `page.admin.orders.edit`, `ui.async-submit-button` | X |
| `/admin/payments` | `app/(dashboard)/admin/payments/page.tsx`, `app/(dashboard)/admin/payments/payment-data-columns.tsx` | `page.admin.payments`, `section.admin.metrics-grid`, `section.admin.table.payments.cell`, `ui.table`, `ui.table.control`, `ui.alert-dialog` | X |
| `/admin/subscriptions` | `app/(dashboard)/admin/subscriptions/page.tsx`, `app/(dashboard)/admin/subscriptions/columns.tsx` | `page.admin.subscriptions.templates`, `section.admin.table.subscriptions.templates.cell`, `section.admin.table.subscriptions.cell`, `ui.table`, `ui.table.control` | X |
| `/admin/subscriptions/create` | `app/(dashboard)/admin/subscriptions/create/page.tsx`, `app/(dashboard)/admin/subscriptions/template-form.tsx` | `page.admin.subscriptions.create`, `ui.async-submit-button` | X |
| `/admin/subscriptions/[templateId]/edit` | `app/(dashboard)/admin/subscriptions/[templateId]/edit/page.tsx` | `page.admin.subscriptions.edit`, `ui.async-submit-button`, `ui.alert-dialog` | X |
| `/admin/suscriptions` | `app/(dashboard)/admin/suscriptions/page.tsx`, `app/(dashboard)/admin/suscriptions/user-subscriptions-columns.tsx` | `page.admin.suscriptions`, `section.admin.metrics-grid`, `section.admin.table.suscriptions.user.cell`, `ui.table`, `ui.table.control` | X |
| `/admin/suscriptions/user/[userId]/edit` | `app/(dashboard)/admin/suscriptions/user/[userId]/edit/page.tsx` | `page.admin.suscriptions.user.edit`, `ui.async-submit-button` | X |
| `/admin/suscriptions/organization/[teamId]/edit` | `app/(dashboard)/admin/suscriptions/organization/[teamId]/edit/page.tsx` | `page.admin.suscriptions.organization.edit`, `ui.async-submit-button`, `ui.alert-dialog` | X |
| `/admin/app-config` | `app/(dashboard)/admin/app-config/page.tsx` | `page.admin.app-config.home` | X |
| `/admin/app-config/general` | `app/(dashboard)/admin/app-config/general/page.tsx` | `page.admin.app-config.general`, `ui.async-submit-button` | X |
| `/admin/app-config/payments-methods` | `app/(dashboard)/admin/app-config/payments-methods/page.tsx` | `page.admin.app-config.payment-methods`, `ui.async-submit-button` | X |
| `/admin/app-config/email` | `app/(dashboard)/admin/app-config/email/page.tsx` | `page.admin.app-config.email`, `ui.async-submit-button` | X |
| `/admin/app-config/theme` | `app/(dashboard)/admin/app-config/theme/page.tsx` | redirect-only a `/admin/app-config/general` | - |
| `/admin/billing` | `app/(dashboard)/admin/billing/page.tsx` | redirect-only a `/admin/suscriptions` | - |
| `/admin/modules/[moduleId]/[[...slug]]` | `app/(dashboard)/admin/modules/[moduleId]/[[...slug]]/page.tsx` | route dispatcher del runtime; retorna `resolveModulePage(...)` | - |
| `/admin/[...moduleAlias]` | `app/(dashboard)/admin/[...moduleAlias]/page.tsx` | alias dispatcher del runtime; retorna `resolveModulePageByPath(...)` | - |

## Route Checklist (Dashboard)

| Route | Core file | Template IDs used | Covered |
| --- | --- | --- | --- |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/dashboard/home-core.tsx` | `page.dashboard.home`, `ui.async-submit-button`, `ui.alert-dialog` | X |
| `/dashboard/general` | `app/(dashboard)/dashboard/general/page.tsx`, `app/(dashboard)/dashboard/general/general-page-client.tsx` | `page.dashboard.general`, `ui.async-submit-button` | X |
| `/dashboard/security` | `app/(dashboard)/dashboard/security/page.tsx`, `app/(dashboard)/dashboard/security/security-page-client.tsx` | `page.dashboard.security`, `ui.async-submit-button`, `ui.alert-dialog` | X |
| `/dashboard/activity` | `app/(dashboard)/dashboard/activity/page.tsx` | `page.dashboard.activity` | X |
| `/dashboard/subscriptions` | `app/(dashboard)/dashboard/subscriptions/page.tsx`, `app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx`, `app/(dashboard)/dashboard/subscriptions/invoices-data-table.tsx` | `page.dashboard.subscriptions`, `section.dashboard.table.subscriptions.organizations.cell`, `section.dashboard.table.subscriptions.payments.cell`, `section.dashboard.table.subscriptions.invoices.cell`, `ui.table`, `ui.table.control`, `ui.async-submit-button`, `ui.alert-dialog` | X |
| `/dashboard/modules/[moduleId]/[[...slug]]` | `app/(dashboard)/dashboard/modules/[moduleId]/[[...slug]]/page.tsx` | route dispatcher del runtime; retorna `resolveModulePage(...)` | - |
| `/dashboard/[...moduleAlias]` | `app/(dashboard)/dashboard/[...moduleAlias]/page.tsx` | alias dispatcher del runtime; retorna `resolveModulePageByPath(...)` | - |

## Current Findings (Gaps)

### Closed A (P0): shared dashboard-group layout wrapper moved to themed shell
- Files:
  - `app/(dashboard)/layout.tsx`
  - `app/(dashboard)/private-area-shell.tsx`
  - `themes/first-backoffice/templates/layout.private.shell.tsx`
- Resolution: wrapper compartido ahora usa `ThemeTemplate id="layout.private.shell"` con seleccion de theme por area activa (`/admin` vs `/dashboard`).

### Closed B (P1): module dispatcher direct-render policy documented and guarded
- Files:
  - `docs/modules/02-runtime-routing.md`
  - `tests/theme/theme-route-smoke.test.ts`
- Resolution:
  - `modules/*` y alias en admin/dashboard quedan como excepcion CTC por contrato.
  - `return content;` se mantiene intencional cuando runtime resuelve page handler de modulo.
  - `null` se mantiene como señal de `notFound()` en dispatcher.

### Closed C (P1): `/admin` external widget modules now use template fallback ID
- Files:
  - `app/(dashboard)/admin/page.tsx`
  - `themes/first-backoffice/templates/admin/section.admin.dashboard.module-widget.tsx`
  - `tests/theme/theme-route-smoke.test.ts`
  - `tests/theme/theme-slot-data-contract.test.ts`
- Resolution:
  - widgets externos en `/admin` se envuelven con `ThemeCodeTemplate id="section.admin.dashboard.module-widget"`.
  - se expone contrato de datos base (`moduleWidgetId`, `moduleWidgetIndex`, `moduleWidgetKind`) para theming.
  - cobertura smoke/slot contract valida el wrapper y el ID del theme.

## Template ID Availability Check (first-backoffice)
- IDs en uso auditados: `58`
- IDs faltantes en `themes/first-backoffice/templates`: `0`
- IDs extra presentes y no usados en este alcance:
  - `page.admin.app-config.theme`
  - `page.login.user`
  - `page.login.admin`
  - `page.login.signup`

## Task 1 (P0): Close Direct-Render Gaps in Core Routes

### Risk
Cambiar wrappers de layout/dispatcher puede afectar composition con modulos y fallback actual.

### Target files
- `app/(dashboard)/layout.tsx`
- `themes/first-backoffice/templates/*` (nuevos IDs si se aprueba)

### Checklist
- [x] Definir `templateId` para wrapper compartido de `app/(dashboard)` (`layout.private.shell`).

### Validation checklist
- [x] Las rutas privadas siguen renderizando sin regresion visual/funcional.
- [x] No hay renders directos no justificados en archivos de entry route.

### Commands
- `pnpm themes:prepare`
- `npx tsx --test tests/theme/theme-code-template.test.tsx`
- `npx tsx --test tests/theme/theme-route-smoke.test.ts`

## Task 1A (P0): Restore App Config Menu Visual Parity

### Risk
Si los wrappers template cambian el flujo de layout (grid item vs inline child), los cards de navegacion se deforman al hidratar en cliente.

### Target files
- `app/(dashboard)/admin/app-config/section-nav.client.tsx`
- `themes/first-backoffice/templates/admin/section.admin.app-config-nav.item.tsx`
- `app/(dashboard)/admin/admin-dashboard/modules.tsx`

### Checklist
- [x] Identificar causa raiz del desajuste: wrapper de template en item alterando el comportamiento de grid.
- [x] Asegurar `Link` como bloque de ancho completo (`block w-full`) para no depender del contexto del parent.
- [x] Hacer el wrapper de theme `section.admin.app-config-nav.item` layout-transparent (`display: contents`).
- [x] Mantener consistencia de estilo en `quick-links` base de `/admin`.

### Validation checklist
- [x] Verificar visualmente que `/admin/app-config` mantiene cards iguales al widget menu de `/admin`.
- [x] Confirmar que `section.admin.app-config-nav.item` sigue activo en runtime (sin romper contrato CTC).

### Commands
- `pnpm exec eslint \"app/(dashboard)/admin/app-config/section-nav.client.tsx\" \"themes/first-backoffice/templates/admin/section.admin.app-config-nav.item.tsx\" \"app/(dashboard)/admin/admin-dashboard/modules.tsx\"`
- `npx tsx --test tests/theme/theme-route-smoke.test.ts`

## Task 1B (P1): Document Module Dispatcher Exception (By Design)

### Risk
Si no queda documentado, futuras auditorias pueden marcar falsos positivos de "return content" en routes de modulos.

### Target files
- `docs/modules/02-runtime-routing.md`
- `plans/core-admin-dashboard-template-coverage-audit-plan.md`
- (opcional) `tests/theme/<coverage-guard>.test.ts`

### Checklist
- [x] Documentar explicitamente que los dispatchers `modules/*` y alias retornan `ReactNode` de handler de modulo.
- [x] Registrar que `null` en handler modulo se interpreta como 404 por dispatcher.
- [x] Mantener estas rutas como excepcion valida en checks automaticos de cobertura theme.

### Validation checklist
- [x] Checklist de cobertura ya no marca dispatchers modulares como gap.
- [x] Documentacion y tests de guardia usan la misma lista de excepciones.

### Commands
- `npx tsx --test tests/modules/module-runtime.test.ts`
- `npx tsx --test tests/theme/<coverage-guard>.test.ts`

## Task 2 (P1): Harden Coverage for Dynamic Admin Widgets

### Risk
Widgets de modulo pueden saltarse secciones theme si no hay contrato template comun.

### Target files
- `app/(dashboard)/admin/page.tsx`
- `docs/modules/16-theme-authoring-guide.md`
- `tests/theme/theme-slot-data-contract.test.ts`

### Checklist
- [x] Definir estrategia para widgets dinamicos (`section.admin.dashboard.module-widget` o excepcion explicita).
- [x] Alinear contrato de datos para widgets en theme.
- [x] Documentar expectativa host vs modulo para widgets del dashboard admin.

### Validation checklist
- [x] Con widgets externos activos, la ruta `/admin` conserva cobertura CTC definida.
- [x] Sin widgets externos, no cambia el comportamiento actual.

### Commands
- `pnpm themes:prepare`
- `npx tsx --test tests/theme/theme-slot-data-contract.test.ts`
- `npx tsx --test tests/modules/module-runtime.test.ts`

## Task 3 (P1): Add Route Coverage Guard Test

### Risk
Sin test de guardia, nuevos renders directos pueden reintroducir deuda de tematizacion.

### Target files
- `tests/theme/` (nuevo test de cobertura de entry routes)
- `docs/modules/16-theme-authoring-guide.md`

### Checklist
- [x] Crear test que inspeccione `app/(dashboard)/admin|dashboard` y exija template wrapper o excepcion permitida.
- [x] Registrar lista de excepciones validas (`redirect-only`, `module-dispatcher`, si se mantiene).
- [x] Actualizar docs con la regla de auditoria continua.

### Validation checklist
- [x] El test falla al introducir un nuevo `return` JSX directo no justificado en rutas core.
- [x] El test pasa con el estado final acordado.

### Commands
- `npx tsx --test tests/theme/<nuevo-archivo>.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint "tests/theme/<nuevo-archivo>.test.ts"`

## Closure Criteria
- [x] Todas las rutas core con JSX en `app/(dashboard)` usan template wrapper o tienen excepcion aprobada/documentada.
- [x] `themes/first-backoffice` cubre todos los `templateId` requeridos por admin/dashboard.
- [x] Existe test automatizado para prevenir regresiones de cobertura.
- [x] Docs de contrato/theme reflejan el estado final.

