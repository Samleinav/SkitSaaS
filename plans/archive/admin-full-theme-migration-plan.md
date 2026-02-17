# Plan: Full Admin Theme Migration (`/admin` -> `theme.first.backoffice`)

Estado: En progreso
Inicio: 2026-02-13
Dependencias:
- `plans/archive/theme-code-driven-templates-plan.md`
- `plans/archive/first-theme-frontend-admin-dashboard-plan.md`

## Objetivo
Migrar **todo** `app/(dashboard)/admin` para que la capa visual renderice por templates de `theme.first.backoffice`, manteniendo logica de negocio en host.

Resultado objetivo:
- Cada `layout/page/not-found` de admin resuelve `ThemeCodeTemplate` con `componentId` propio.
- Cada ruta prepara `data` (view model serializable) y delega render al theme activo.
- La composicion de UI (nav, breadcrumb, secciones y metricas) tambien vive en templates del theme.
- Fallback seguro por ruta si falta template o falla import/render.

## Alcance (solo admin)
Incluye:
- `app/(dashboard)/admin/layout.tsx`, `page.tsx`, `not-found.tsx`
- Todo `app/(dashboard)/admin/**/page.tsx`
- `app/(dashboard)/admin/app-config/layout.tsx`
- Theme pack `themes/first-backoffice` (templates admin + componentes internos del theme)
- Tests y docs del contrato admin

Fuera de alcance en este plan:
- Migracion visual de `dashboard` (area cliente)
- Reescritura de actions/queries/guards
- Cambios funcionales de negocio (solo presentacion y contrato `data`)

## Decisiones de arquitectura (admin)
1. Patron host -> theme por ruta:
- host resuelve auth/guards, queries y server actions
- host arma `data` serializable
- host renderiza `ThemeCodeTemplate`
- theme define estructura/estilos

2. Componentes internos del theme (orden y escalabilidad):
- archivos entry de template: `themes/first-backoffice/templates/admin/*.tsx`
- subcomponentes internos del theme: `themes/first-backoffice/components/admin/**`
- evitar helpers `.tsx` no-entry dentro de `templates/` para no registrarlos como `componentId` accidentalmente

3. Contratos por `componentId`:
- nivel pagina/layout: `layout.admin.*`, `page.admin.*`
- nivel composicion obligatoria: `section.admin.*`
- primitives compartidos: `ui.*`
- se prioriza que el contrato funcional viva en `data` y no en clases CSS especificas

## Inventario actual analizado (`app/(dashboard)/admin`)

Rutas base:
- `/admin` -> `app/(dashboard)/admin/page.tsx` (ya themed: `page.admin.home`)
- `/admin` layout -> `app/(dashboard)/admin/layout.tsx` (ya themed: `layout.admin.shell`)
- `/admin/not-found` -> `app/(dashboard)/admin/not-found.tsx` (ya themed)

Rutas de dominio:
- `/admin/users` -> `app/(dashboard)/admin/users/page.tsx`
- `/admin/users/[userId]` -> `app/(dashboard)/admin/users/[userId]/page.tsx`
- `/admin/suscriptions` -> `app/(dashboard)/admin/suscriptions/page.tsx`
- `/admin/suscriptions/user/[userId]/edit` -> `app/(dashboard)/admin/suscriptions/user/[userId]/edit/page.tsx`
- `/admin/suscriptions/organization/[teamId]/edit` -> `app/(dashboard)/admin/suscriptions/organization/[teamId]/edit/page.tsx`
- `/admin/subscriptions` -> `app/(dashboard)/admin/subscriptions/page.tsx`
- `/admin/subscriptions/create` -> `app/(dashboard)/admin/subscriptions/create/page.tsx`
- `/admin/subscriptions/[templateId]/edit` -> `app/(dashboard)/admin/subscriptions/[templateId]/edit/page.tsx`
- `/admin/orders` -> `app/(dashboard)/admin/orders/page.tsx`
- `/admin/orders/create` -> `app/(dashboard)/admin/orders/create/page.tsx`
- `/admin/orders/[orderId]/edit` -> `app/(dashboard)/admin/orders/[orderId]/edit/page.tsx`
- `/admin/payments` -> `app/(dashboard)/admin/payments/page.tsx`
- `/admin/logs` -> `app/(dashboard)/admin/logs/page.tsx`
- `/admin/app-config` -> `app/(dashboard)/admin/app-config/page.tsx`
- `/admin/app-config/general` -> `app/(dashboard)/admin/app-config/general/page.tsx`
- `/admin/app-config/payments-methods` -> `app/(dashboard)/admin/app-config/payments-methods/page.tsx`
- `/admin/app-config/email` -> `app/(dashboard)/admin/app-config/email/page.tsx`
- `/admin/app-config/theme` -> `app/(dashboard)/admin/app-config/theme/page.tsx`
- `/admin/app-config` layout -> `app/(dashboard)/admin/app-config/layout.tsx`

Rutas especiales:
- `/admin/billing` -> redirect a `/admin/suscriptions`
- `/admin/modules/[moduleId]/[[...slug]]`
- `/admin/[...moduleAlias]`

## Mapa de `componentId` propuesto (admin)

Shells:
- `layout.admin.shell` (existente)
- `layout.admin.app-config.shell` (nuevo)

Paginas:
- `page.admin.home` (existente)
- `page.admin.users`
- `page.admin.user.detail`
- `page.admin.suscriptions`
- `page.admin.suscriptions.user.edit`
- `page.admin.suscriptions.organization.edit`
- `page.admin.subscriptions.templates`
- `page.admin.subscriptions.create`
- `page.admin.subscriptions.edit`
- `page.admin.orders`
- `page.admin.orders.create`
- `page.admin.orders.edit`
- `page.admin.payments`
- `page.admin.logs`
- `page.admin.app-config.home`
- `page.admin.app-config.general`
- `page.admin.app-config.payment-methods`
- `page.admin.app-config.email`
- `page.admin.app-config.theme`

Composicion obligatoria (diseno total, no opcional):
- `section.admin.nav`
- `section.admin.breadcrumb`
- `section.admin.app-config-nav`
- `section.admin.metrics-grid`

## Estrategia de migracion por ruta
Para cada ruta admin:
1. Mantener guard + queries + acciones en host.
2. Crear `fallback` con render actual.
3. Construir `data` serializable (sin funciones no serializables).
4. Renderizar `ThemeCodeTemplate` con `id` y `themeId`.
5. Validar fallback cuando no hay template.

## Fases y checklist

### Fase 0: Contratos y convenciones
- [x] Confirmar naming final de todos los `componentId` admin.
- [x] Definir esquema `data` minimo por cada pagina admin.
- [x] Definir esquema `data` por cada `section.admin.*` obligatorio:
  - `section.admin.nav`
  - `section.admin.breadcrumb`
  - `section.admin.app-config-nav`
  - `section.admin.metrics-grid`
- [x] Definir convencion de carpetas en theme:
  - entries en `templates/admin/*.tsx`
  - internos en `components/admin/**`
- [ ] Definir precedencia para rutas legacy (`suscriptions`) vs nuevas (`subscriptions`) sin romper UX.
- [x] Documentar contrato admin en `docs/modules/16-theme-authoring-guide.md` (seccion admin).

Entregable:
- contrato admin v1 aprobado.

### Fase 1: Scaffold de templates admin en `first-backoffice`
- [x] Crear entries faltantes en `themes/first-backoffice/templates/admin/*` para cada pagina objetivo.
- [x] Crear templates de seccion obligatorios:
  - `section.admin.nav`
  - `section.admin.breadcrumb`
  - `section.admin.app-config-nav`
  - `section.admin.metrics-grid`
- [x] Crear estructura `themes/first-backoffice/components/admin/**` para subcomponentes internos.
- [x] Mantener templates de login/not-found existentes sin regresion.
- [x] Ejecutar `pnpm themes:prepare` y validar code registry.

Entregable:
- estructura base del theme admin completa.

### Fase 2: Migracion de shell y composicion admin
- [x] Migrar `app/(dashboard)/admin/layout.tsx` para exponer `data` mas completo (nav, labels, modo).
- [x] Introducir `layout.admin.app-config.shell` en `app/(dashboard)/admin/app-config/layout.tsx`.
- [x] Migrar `AdminNav` a `section.admin.nav`.
- [x] Migrar `AdminBreadcrumb` a `section.admin.breadcrumb`.
- [x] Migrar `AppConfigSectionNav` a `section.admin.app-config-nav`.
- [x] Migrar tarjetas de metricas recurrentes a `section.admin.metrics-grid`.

Entregable:
- shell admin y sub-shell app-config 100% tematizados.

### Fase 3: Migracion de paginas de lectura/listado
- [x] `page.admin.users` (`/admin/users`)
- [x] `page.admin.suscriptions` (`/admin/suscriptions`)
- [x] `page.admin.subscriptions.templates` (`/admin/subscriptions`)
- [x] `page.admin.orders` (`/admin/orders`)
- [x] `page.admin.payments` (`/admin/payments`)
- [x] `page.admin.logs` (`/admin/logs`)
- [x] `page.admin.app-config.home` (`/admin/app-config`)

Entregable:
- listados/tablas principales renderizados por templates admin.

### Fase 4: Migracion de paginas de edicion/creacion
- [x] `page.admin.user.detail` (`/admin/users/[userId]`)
- [x] `page.admin.suscriptions.user.edit`
- [x] `page.admin.suscriptions.organization.edit`
- [x] `page.admin.subscriptions.create`
- [x] `page.admin.subscriptions.edit`
- [x] `page.admin.orders.create`
- [x] `page.admin.orders.edit`
- [x] `page.admin.app-config.general`
- [x] `page.admin.app-config.payment-methods`
- [x] `page.admin.app-config.email`
- [x] `page.admin.app-config.theme`

Entregable:
- formularios admin tematizados manteniendo acciones server en host.

### Fase 5: Rutas especiales y compatibilidad
- [x] Validar `/admin/billing` (redirect) sin cambios funcionales.
- [ ] Validar `/admin/modules/[moduleId]/[[...slug]]` con shell themed sin romper modulos.
- [ ] Validar `/admin/[...moduleAlias]` con shell themed sin romper alias.
- [ ] Revisar i18n admin en todos los `data` nuevos.

Entregable:
- cobertura total de rutas admin y compatibilidad con modulos.

Excepciones router-only explicitadas:
- `app/(dashboard)/admin/billing/page.tsx` (redirect server-side)
- `app/(dashboard)/admin/modules/[moduleId]/[[...slug]]/page.tsx` (dispatcher de modulos)
- `app/(dashboard)/admin/[...moduleAlias]/page.tsx` (resolver de alias de modulos)

### Fase 6: QA, tests y documentacion
- [x] Agregar test smoke de todos los `id="page.admin.*"` en rutas admin.
- [x] Agregar test smoke de `id="section.admin.*"` obligatorios.
- [x] Agregar test de contrato `data` por slot critico admin.
- [ ] Agregar test de fallback por ruta admin (template ausente/error).
- [x] Agregar test de boundary: sin imports `@/lib/*` en `themes/*`.
- [x] Actualizar docs de themes con catalogo admin.
- [ ] Actualizar `AGENTS.md` con lista final de templates admin si cambia.

Entregable:
- migracion admin lista para rollout.

## Criterio de cierre
- [x] Todas las rutas de `app/(dashboard)/admin/**/page.tsx` renderizan via `ThemeCodeTemplate` (o estan justificadas explicitamente como redirect/router-only).
- [x] `app/(dashboard)/admin/app-config/layout.tsx` usa `layout.admin.app-config.shell`.
- [x] `first-backoffice` contiene templates admin para todos los `componentId` definidos.
- [x] `section.admin.nav`, `section.admin.breadcrumb`, `section.admin.app-config-nav` y `section.admin.metrics-grid` estan migrados y activos.
- [ ] No quedan bloques visuales estructurales de admin renderizados fuera de templates del theme.
- [x] No hay acoplamiento de theme a host internals (`@/lib/*`, `@/app/*`).
- [ ] Tests admin de smoke/fallback/contrato en verde.
- [x] Documentacion actualizada.

## Riesgos y mitigacion
- Riesgo: payloads `data` demasiado grandes/no serializables.
  - Mitigacion: normalizar `data` por pagina y tiparlo explicitamente.
- Riesgo: regresiones en formularios de alta complejidad.
  - Mitigacion: migracion por fases (listados primero, forms despues) + fallback.
- Riesgo: conflicto `suscriptions` vs `subscriptions`.
  - Mitigacion: conservar compatibilidad de rutas actuales durante toda la migracion.
