# Plan: Core Admin/Dashboard Theme Template Coverage Audit

Status: In progress
Start date: 2026-02-17
Current phase: Audit checklist ready
Last review: 2026-02-17

## Objective
Verificar que el core de `admin/dashboard` renderiza mediante templates theme (CTC), identificar rutas con render directo en core y preparar remediacion ordenada.

## Scope
- Core host en `app/(dashboard)/**` para areas `admin` y `dashboard`.
- Wrappers CTC usados por rutas core: `ThemeCodeTemplate`, `ThemeTemplate`, `TemplateTable`, `TemplateAsyncSubmitButton`, `TemplateConfirmSubmitButton`.
- Cobertura de IDs contra `themes/first-backoffice/templates/*.tsx`.

## Out of Scope
- Frontend publico (`app/(frontend)`), excepto componentes compartidos ya usados por admin/dashboard.
- Implementacion de cambios funcionales o visuales en esta fase (solo analisis + plan).
- UI interna de modulos externos (module-owned pages/widgets), salvo su punto de entrada en core.

## Priority Order
1. P0 - Cerrar huecos de rutas core con render directo sin template.
2. P1 - Consolidar contrato CTC/docs/tests para evitar regresiones.
3. P2 - Endurecer cobertura para extensiones modulares dinamicas.

## Coverage Legend
- `X`: cubierto por template en core y presente en `themes/first-backoffice`.
- `-`: no aplica por ser ruta de `redirect(...)` o route dispatcher de modulos (retorna `ReactNode` del modulo por diseno).
- vacio: ruta core con retorno directo sin template (gap a resolver).

## Route Checklist (Shared + Layout)

| Route / Entry | Core file | Template IDs used | Covered |
| --- | --- | --- | --- |
| `(dashboard group layout)` | `app/(dashboard)/layout.tsx` | `layout.private.header`, `ui.language-switcher`, `ui.user-menu` (via `PrivateAreaHeader`), pero wrapper principal del layout sin template |  |
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

### Gap A (P0): shared dashboard-group layout wrapper is not template-driven
- File: `app/(dashboard)/layout.tsx`
- Current behavior: retorna `<section>...` directo y solo delega header a template.
- Impact: el wrapper raiz compartido de areas privadas no puede ser sobreescrito por theme.

### Decision Point B (P1): optional wrapper policy for module dispatcher routes
- Files:
  - `app/(dashboard)/admin/modules/[moduleId]/[[...slug]]/page.tsx`
  - `app/(dashboard)/admin/[...moduleAlias]/page.tsx`
  - `app/(dashboard)/dashboard/modules/[moduleId]/[[...slug]]/page.tsx`
  - `app/(dashboard)/dashboard/[...moduleAlias]/page.tsx`
- Current behavior: `return content;` directo desde runtime de modulos.
- Status: comportamiento intencional del contrato (`ModulePageHandler -> ReactNode | null`).
- Impact: no es bug de cobertura CTC del core; es una decision de arquitectura entre host shell vs autonomia del modulo.

### Gap C (P1): `/admin` external widget modules may bypass themed section IDs
- File: `app/(dashboard)/admin/page.tsx`
- Current behavior: solo `overview/quickLinks/recentActivity` mapean a `section.admin.dashboard.*`; widgets externos retornan fallback directo.
- Impact: cobertura parcial en dashboard admin cuando hay widgets de modulo dinamico.

## Template ID Availability Check (first-backoffice)
- IDs en uso auditados: `56`
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
- [ ] Definir `templateId` para wrapper compartido de `app/(dashboard)` (propuesto: `layout.private.shell`).

### Validation checklist
- [ ] Las rutas privadas siguen renderizando sin regresion visual/funcional.
- [ ] No hay renders directos no justificados en archivos de entry route.

### Commands
- `pnpm themes:prepare`
- `npx tsx --test tests/theme/theme-code-template.test.tsx`
- `npx tsx --test tests/theme/theme-route-smoke.test.ts`

## Task 1B (P1): Document Module Dispatcher Exception (By Design)

### Risk
Si no queda documentado, futuras auditorias pueden marcar falsos positivos de "return content" en routes de modulos.

### Target files
- `docs/modules/02-runtime-routing.md`
- `plans/core-admin-dashboard-template-coverage-audit-plan.md`
- (opcional) `tests/theme/<coverage-guard>.test.ts`

### Checklist
- [ ] Documentar explicitamente que los dispatchers `modules/*` y alias retornan `ReactNode` de handler de modulo.
- [ ] Registrar que `null` en handler modulo se interpreta como 404 por dispatcher.
- [ ] Mantener estas rutas como excepcion valida en checks automaticos de cobertura theme.

### Validation checklist
- [ ] Checklist de cobertura ya no marca dispatchers modulares como gap.
- [ ] Documentacion y tests de guardia usan la misma lista de excepciones.

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
- [ ] Definir estrategia para widgets dinamicos (`section.admin.dashboard.module-widget` o excepcion explicita).
- [ ] Alinear contrato de datos para widgets en theme.
- [ ] Documentar expectativa host vs modulo para widgets del dashboard admin.

### Validation checklist
- [ ] Con widgets externos activos, la ruta `/admin` conserva cobertura CTC definida.
- [ ] Sin widgets externos, no cambia el comportamiento actual.

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
- [ ] Crear test que inspeccione `app/(dashboard)/admin|dashboard` y exija template wrapper o excepcion permitida.
- [ ] Registrar lista de excepciones validas (`redirect-only`, `module-dispatcher`, si se mantiene).
- [ ] Actualizar docs con la regla de auditoria continua.

### Validation checklist
- [ ] El test falla al introducir un nuevo `return` JSX directo no justificado en rutas core.
- [ ] El test pasa con el estado final acordado.

### Commands
- `npx tsx --test tests/theme/<nuevo-archivo>.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint "tests/theme/<nuevo-archivo>.test.ts"`

## Closure Criteria
- [ ] Todas las rutas core con JSX en `app/(dashboard)` usan template wrapper o tienen excepcion aprobada/documentada.
- [ ] `themes/first-backoffice` cubre todos los `templateId` requeridos por admin/dashboard.
- [ ] Existe test automatizado para prevenir regresiones de cobertura.
- [ ] Docs de contrato/theme reflejan el estado final.

