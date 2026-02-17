# Plan: Theme System Simplification (Build-Time Only)

Estado: En progreso (fase de saturacion UI template)
Inicio: 2026-02-13
Owner: Core platform
Ultima actualizacion: 2026-02-15

## Avance inicial (2026-02-13)
- Se publico ADR: `docs/theme-build-time-only-adr.md`.
- Se documento contrato ENV objetivo y alias de compatibilidad en `docs/env-variables.md`.
- Se agrego nota de transicion en `docs/modules/08-themes.md` para alinear runtime actual vs target build-time.
- Sprint 2 (parcial ejecutado):
  - `lib/theme-runtime.ts` ahora resuelve seleccion por ENV y no lee `app_themes`/`user_theme_preferences`.
  - `FF_USE_THEME_RUNTIME` quedo deprecado/no operativo para activacion.
  - `/admin/app-config/theme` se desactivo (redirect a `/admin/app-config/general`) y se removieron acciones de policy theme.
  - `themes:prepare` emite warnings de compat para `THEME_ADMIN_DEFAULT`, `THEME_DASHBOARD_DEFAULT`, `FF_USE_THEME_RUNTIME`.
- Sprint 3 (completado):
  - `themes:prepare` genera `lib/themes/selection.generated.ts`.
  - Build valida seleccion por area (`admin`, `dashboard`, `frontend`) y falla si falta theme o si no es compatible.
  - Se definio decision operativa: `code-registry.generated.ts` mantiene todos los packs descubiertos (`THEME_CODE_REGISTRY_SCOPE="all"`).
  - Se mejoro reporte de errores de seleccion para incluir area/theme/env.
- Sprint 5 (parcial):
  - Resolver server-side de templates ya acepta prioridad configurable `theme|module` para `admin/dashboard`, alimentada por `THEME_TEMPLATE_PRIORITY`.
  - `themes:prepare` ahora valida templates de host requeridos para themes seleccionados en `admin/dashboard` y falla build con error explicito.
  - Se enforcea baseline obligatorio `theme.first.backoffice` en build (presencia + cobertura de templates criticos).
  - `ThemeCodeTemplate` emite error de desarrollo estandarizado (`template_not_found`) cuando falta template/registro y aplica fallback.
- Sprint 4 (completado):
  - Se definio contrato tipado de rutas frontend (`lib/themes/frontend-routes-contract.ts`) con `path`, `loader`, `metadata?`.
  - `themes:prepare` ahora genera `lib/themes/frontend-routes.generated.ts` y valida que el theme frontend seleccionado exponga `routes.ts[x]`.
  - Frontend usa dispatcher unico `ThemeFrontendRoute` + `resolveFrontendThemeRoute` y deja de depender de `ThemeCodeTemplate` en `layout/page/pricing/not-found`.
  - `not-found` frontend se resuelve por ruta de theme (`/404`) con fallback explicito.
  - Frontend ahora resuelve assets (`globalCss` y `favicon`) exclusivamente desde `config.ts` (`ThemeConfig.assets`).
  - Admin/Dashboard/Login/NotFound ahora resuelven assets/templates exclusivamente desde `config.ts` (`ThemeConfig.assets`).
- Migracion de compatibilidad completada:
  - `theme.first.backoffice` y `theme.pilot.admin` ahora exponen `config.ts` canonico.
  - `theme.first.backoffice` y `theme.first.frontend` ya no declaran `entryAssets/assets.json`; assets de area quedan en `ThemeConfig.assets`.
  - Se removio compatibilidad de `theme.config.ts[x]` en `themes:prepare` (solo `config.ts[x]`).
  - Se removio compatibilidad runtime de `entryAssets/assets.json` en `lib/themes/assets.ts`.
  - `pnpm themes:prepare` ya no reporta warnings de `theme.config.ts[x]` para los themes activos.
- Sprint 6 (parcial ejecutado):
  - Host routes/layouts ya no dependen de `featureFlags.useThemeRuntime`; seleccion de area se resuelve siempre por `getThemeSelectionForArea(...)`.
  - Docs de themes/ops/modelo de datos marcan `app_themes` y `user_theme_preferences` como legacy.
  - Runbook operativo actualizado a flujo `ENV -> themes:prepare -> build -> deploy`.
- Sprint 7 (completado):
  - Cobertura unitaria validada para prioridad `theme|module` en `tests/templates/template-controller.test.ts`.
  - Smoke por rutas clave de rollout (`/`, `/admin`, `/dashboard`, `/login`, `/admin/login`) agregado en `tests/theme/theme-rollout-smoke.test.ts`.
  - Guardas de hidratacion/recoverable validadas con asserts de contrato en `app/layout.tsx` y `lib/theme-runtime.ts`.
  - Suite de smoke/contratos en verde + `tsc --noEmit` en verde.
  - `app/(dashboard)/admin/layout.tsx` simplificado: se removieron `BasicAdminLayout`/`ProAdminLayout` del host y se delego composicion del shell al template `layout.admin.shell` via slots (`navSlot`, `breadcrumbSlot`, `controlsSlot`, `contentSlot`).
  - `themes/first-backoffice/templates/admin/layout.admin.shell.tsx` ahora consume slots y controla estructura del shell admin desde el theme.
  - Se agregaron templates CTC para controles de host en `theme.first.backoffice`: `ui.theme-toggle` y `ui.language-switcher`.
  - `app/(dashboard)/admin/layout.tsx` y `app/(dashboard)/dashboard/layout-client.tsx` ya consumen esos controles via template (`ThemeCodeTemplate`/`ThemeTemplate`) con fallback seguro.
  - `app/(dashboard)/dashboard/layout.tsx` y `themes/first-backoffice/templates/dashboard/layout.dashboard.shell.tsx` ahora siguen patron de slot (`contentSlot`) + metadata (`layoutStyle`, `mode`).
- Sprint 8 (en progreso - saturacion UI template):
  - Se agregaron wrappers cliente para UI template runtime:
    - `components/ui/themed-async-submit-button.tsx`
    - `components/ui/themed-confirm-submit-button.tsx`
  - Se migraron usos directos restantes en cliente a wrappers template:
    - `app/(dashboard)/dashboard/home-core.tsx`
    - `app/(dashboard)/dashboard/security/page.tsx`
    - `app/(dashboard)/admin/subscriptions/template-form.tsx`
    - `app/(dashboard)/admin/orders/create/create-order-form.tsx`
  - `theme.first.backoffice` ahora incluye code templates para:
    - `ui.async-submit-button`
    - `ui.alert-dialog`
    - `ui.dialog`
  - Se migro primera ola de bypasses UI:
    - submits manuales en `dashboard/general`, `dashboard/security`, `dashboard/subscriptions`, `frontend/pricing`, `login`
    - dialogos admin directos en `admin/users/create-user-dialog` y `admin/payments/payment-data-columns`
  - Se migro segunda ola puntual:
    - `components/layout/user-menu.tsx` (removido submit ad-hoc)
  - Se agrego guardrail de contrato para evitar reintroducir `type="submit"` fuera de wrappers template base.
  - Se removio restriccion de override para `ui.alert-dialog` en `lib/templates/theme-pack.ts` para permitir override via `entryTemplates` cuando un theme lo declare.
  - Baseline obligatorio de backoffice actualizado para exigir tambien:
    - `ui.async-submit-button`
    - `ui.alert-dialog`
    - `ui.theme-toggle`
    - `ui.language-switcher`
  - Auditoria de cobertura UI (2026-02-15):
    - Gaps bloqueantes detectados en `dashboard` (paginas sin `ThemeCodeTemplate`):
      - `app/(dashboard)/dashboard/activity/page.tsx`
      - `app/(dashboard)/dashboard/general/page.tsx`
      - `app/(dashboard)/dashboard/security/page.tsx`
      - `app/(dashboard)/dashboard/subscriptions/page.tsx`
    - Gap de shell compartido fuera de CTC para area privada:
      - `app/(dashboard)/layout.tsx` (header compartido hardcoded)
      - `components/layout/user-menu.tsx` (UI no modelada por template id)
    - Matriz de required/contract incompleta para dashboard:
      - `lib/themes/required-code-templates.ts` solo exige `page.dashboard.home`.
      - `tests/theme/theme-route-smoke.test.ts` y `tests/theme/theme-slot-data-contract.test.ts` aun no exigen wrappers de `general/activity/security/subscriptions`.
    - Inventario de UI granular aun no templateado por id dedicado (hoy solo customizable indirectamente via page override):
      - `app/(dashboard)/admin/admin-dashboard/modules.tsx`
      - `app/(dashboard)/admin/admin-dashboard/activity-volume-chart.tsx`
      - `app/(dashboard)/admin/app-config/section-nav.client.tsx`
      - `app/(dashboard)/admin/logs/log-columns.tsx`
      - `app/(dashboard)/admin/orders/order-columns.tsx`
      - `app/(dashboard)/admin/subscriptions/columns.tsx`
      - `app/(dashboard)/admin/suscriptions/user-subscriptions-columns.tsx`
      - `app/(dashboard)/admin/users/columns.tsx`
      - `app/(dashboard)/dashboard/activity/loading.tsx`
- Sprint 9 (parcial ejecutado):
  - Dashboard pages ahora template-driven en host:
    - `page.dashboard.general`
    - `page.dashboard.activity`
    - `page.dashboard.security`
    - `page.dashboard.subscriptions`
    - `page.dashboard.activity.loading`
  - `theme.first.backoffice` ya expone templates equivalentes para esos ids.
  - Shell privado compartido (`app/(dashboard)/layout.tsx`) migro a header templateable:
    - `layout.private.header`
    - `ui.user-menu`
  - Contratos/smoke actualizados para exigir wrappers y snippets de nuevas rutas/components.
  - Granularidad UI fase 1 iniciada:
    - `app/(dashboard)/admin/page.tsx` ahora envuelve modulos core con template ids:
      - `section.admin.dashboard.overview`
      - `section.admin.dashboard.quick-links`
      - `section.admin.dashboard.recent-activity`
    - `app/(dashboard)/admin/app-config/section-nav.client.tsx` ahora usa:
      - `section.admin.app-config-nav.panel`
      - `section.admin.app-config-nav.item`
    - `theme.first.backoffice` ya incluye templates para esos ids + baseline requerido actualizado.
  - Granularidad UI fase 2 (datatable columns) ejecutada:
    - ids por tabla admin:
      - `section.admin.table.users.cell`
      - `section.admin.table.orders.cell`
      - `section.admin.table.subscriptions.cell`
      - `section.admin.table.subscriptions.templates.cell`
      - `section.admin.table.payments.cell`
      - `section.admin.table.logs.cell`
      - `section.admin.table.suscriptions.user.cell`
    - host column builders migrados a wrappers template (`AdminTableSlotTemplate`) en:
      - `app/(dashboard)/admin/users/columns.tsx`
      - `app/(dashboard)/admin/orders/order-columns.tsx`
      - `app/(dashboard)/admin/subscriptions/columns.tsx`
      - `app/(dashboard)/admin/payments/payment-data-columns.tsx`
      - `app/(dashboard)/admin/logs/log-columns.tsx`
      - `app/(dashboard)/admin/suscriptions/user-subscriptions-columns.tsx`
    - ids por tabla dashboard subscriptions:
      - `section.dashboard.table.subscriptions.organizations.cell`
      - `section.dashboard.table.subscriptions.payments.cell`
      - `section.dashboard.table.subscriptions.invoices.cell`
    - host column builders migrados a wrappers template (`DashboardTableSlotTemplate`) en:
      - `app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx`
      - `app/(dashboard)/dashboard/subscriptions/invoices-data-table.tsx`
  - Granularidad UI fase 3 (datatable controls) ejecutada:
    - nuevo id compartido: `ui.table.control` (slots `toolbar.*`, `body.empty`, `pagination.*`)
    - `components/ui/data-table.tsx` ahora envuelve controles (filtro, toggle de columnas, empty state y paginacion) con `ThemeTemplate` por slot y fallback seguro.
    - sub-slots internos del toggle de columnas tambien templateables:
      - `toolbar.columns-toggle.label`
      - `toolbar.columns-toggle.icon`
      - `toolbar.columns-toggle.menu-content`
      - `toolbar.columns-toggle.menu-item-label`
    - `theme.first.backoffice` ya expone `templates/ui.table.control.tsx`.

## Objetivo
Eliminar la seleccion runtime de themes y mover el sistema a build-time para simplificar arquitectura, reducir errores de render/hidratacion y tener comportamiento determinista por build.

Resultado esperado:
- Seleccion de theme por area solo por ENV.
- Sin UI web para cambiar themes.
- Frontend theme con rutas normales tipo Next.js, sin `templateId`.
- Admin/Dashboard con templates por `templateId` y prioridad configurable (`theme` o `module`).
- Build falla si falta un template requerido.

## Modelo final (resumen)
1. Build-time only: el build define themes activos y mapa de templates.
2. Runtime solo renderiza lo que ya quedo generado en build.
3. Frontend:
   - route-driven (`routes.ts`)
   - sin CTC templates
4. Admin/Dashboard:
   - template-driven (CTC)
   - resolver server-side con prioridad configurable

## Decisiones cerradas (target)
1. Seleccion de theme solo por ENV.
2. Sin runtime selection desde DB ni preferencias de usuario.
3. Frontend no usa CTC templates.
4. Admin y Dashboard si usan CTC templates.
5. Prioridad configurable por ENV:
   - `THEME_TEMPLATE_PRIORITY=theme|module`
   - default: `theme`
6. Theme default obligatorio para backoffice:
   - `theme.first.backoffice` en `admin` y `dashboard` cuando no se configure otro.
7. Si un `templateId` requerido no existe:
   - error de build (obligatorio)
   - en dev se puede mostrar error explicito adicional.
8. No usar `middleware.ts` de Next para render React.
   - El resolver vive en capa server-side de templates/render.

## Alcance
Incluye:
- Remover runtime de seleccion (`lib/theme-runtime.ts`, providers runtime, flags runtime, UI `/admin/app-config/theme`).
- Seleccion por ENV.
- Resolver de templates admin/dashboard con prioridad configurable.
- Frontend route registry por `routes.ts`.
- Assets de themes por `config.ts` (css/js/favicon/not-found).
- Tests, docs y cleanup.

No incluye:
- Rediseno visual de themes existentes.
- Cambios de negocio en pagos/modulos.
- Dynamic theme switching sin rebuild.

## Contrato objetivo de themes

### A) Frontend themes
- Directorio: `themes/<theme-frontend-id>/`
- Estructura:
  - `theme.json`
  - `config.ts` (assets y metadata de runtime)
  - `routes.ts` (registro de rutas frontend)
  - `frontend/**` (componentes/paginas frontend)
- Frontend no usa `templateId`.

### B) Admin/Dashboard themes
- Directorio: `themes/<theme-id>/`
- Estructura:
  - `theme.json`
  - `config.ts`
  - `templates/admin/*`
  - `templates/dashboard/*`
- Usa `templateId` y resolver de templates.

### Nota de transicion de archivos de config
- Canonico nuevo: `config.ts`.
- `theme.config.ts[x]` removido del pipeline de resolucion.

## Contrato de seleccion por ENV
Variables:
- `THEME_ADMIN=theme.first.backoffice`
- `THEME_DASHBOARD=theme.first.backoffice`
- `THEME_FRONTEND=theme.first.frontend`
- `THEME_TEMPLATE_PRIORITY=theme|module`

Compat temporal:
- `THEME_ADMIN_DEFAULT` -> `THEME_ADMIN`
- `THEME_DASHBOARD_DEFAULT` -> `THEME_DASHBOARD`

## Reglas de resolucion de templates (admin/dashboard)
Input:
- `area`
- `componentId` o `templateId`
- `moduleId`
- `route`

Output:
- template efectivo
- source (`theme` o `module`)
- trace de resolucion

Orden de resolucion:
- Si `THEME_TEMPLATE_PRIORITY=theme`:
  1. Theme template
  2. Module template
  3. Error (si era requerido)
- Si `THEME_TEMPLATE_PRIORITY=module`:
  1. Module template
  2. Theme template
  3. Error (si era requerido)

Regla para modulos:
- Un modulo puede seguir declarando sus templates.
- Si gana `theme`, el theme debe proveer override compatible para los `componentId` del modulo.

## Sprints y checklist

## Sprint 1: Congelar arquitectura y contratos
Objetivo: cerrar contratos finales y eliminar ambiguedades.

Checklist:
- [x] Publicar ADR corto de build-time only.
- [x] Confirmar contrato final de ENV.
- [x] Confirmar contrato final de `config.ts` y `routes.ts`.
- [x] Confirmar politica final de prioridad (`theme` default).
- [x] Definir reglas exactas de error de build por template faltante.
- [x] Definir estrategia de transicion para themes legacy (`classic-light` y otros).

Entregable:
- ADR + contratos aprobados.

## Sprint 2: Quitar runtime selection
Objetivo: eliminar rutas/codigo de seleccion dinamica.

Checklist:
- [x] Retirar lecturas de seleccion desde DB (`app_themes`, `user_theme_preferences`) para render normal.
- [x] Retirar dependencia operativa de `FF_USE_THEME_RUNTIME`.
- [x] Desactivar o eliminar `/admin/app-config/theme` y acciones asociadas.
- [x] Simplificar layouts/pages para usar solo theme de ENV.
- [x] Mantener compat temporal con flags/env viejas (warning en build).

Entregable:
- App sin runtime switching de theme.

## Sprint 3: Build pipeline de seleccion estatica
Objetivo: resolver y validar themes activos durante `themes:prepare`.

Checklist:
- [x] Generar `lib/themes/selection.generated.ts` desde ENV.
- [x] Validar que cada theme seleccionado exista y sea compatible.
- [x] Fallar build si falta theme para area obligatoria.
- [x] Definir si `code-registry.generated.ts` incluye solo themes activos o todos.
- [x] Reporte de errores de seleccion claro y accionable.

Entregable:
- Seleccion estatica reproducible por build.

## Sprint 4: Frontend route-driven (sin templates)
Objetivo: mover frontend al contrato de rutas por theme.

Checklist:
- [x] Definir tipado de `routes.ts` (path, loader, metadata opcional).
- [x] Generar registry frontend en build.
- [x] Implementar dispatcher frontend unico basado en registry.
- [x] Retirar dependencia de `ThemeCodeTemplate` en frontend pages.
- [x] Integrar assets frontend desde `config.ts`.
- [x] Resolver not-found frontend desde theme.

Entregable:
- Frontend route-driven sin template ids.

## Sprint 5: Resolver admin/dashboard y enforcement estricto
Objetivo: dejar CTC determinista con error temprano.

Checklist:
- [x] Consolidar resolver server-side con prioridad configurable.
- [x] Implementar validacion de `templateId` requeridos en build.
- [x] Fallar build si falta template critico del host.
- [x] Mantener `theme.first.backoffice` como baseline obligatorio.
- [x] Estandarizar error de desarrollo para template no encontrado.

Entregable:
- Admin/Dashboard template-driven y determinista.

## Sprint 6: Cleanup, migracion y documentacion
Objetivo: cerrar deuda tecnica y actualizar guias.

Checklist:
- [x] Marcar `app_themes` y `user_theme_preferences` como legacy (o retirar en plan posterior).
- [x] Limpiar codigo runtime no usado (providers, acciones, helpers).
- [x] Actualizar `AGENTS.md`, docs de arquitectura y docs de themes.
- [x] Actualizar guia de authoring para frontend/admin/dashboard.
- [x] Crear runbook operativo: cambio de theme = cambiar ENV + rebuild.

Entregable:
- Codigo y docs alineados al nuevo modelo.

## Sprint 7: QA y rollout
Objetivo: validar estabilidad y preparar release.

Checklist:
- [x] Tests unitarios de resolver y prioridad `theme|module`.
- [x] Tests de build-fail por template faltante.
- [x] Smoke tests por area (`/`, `/admin`, `/dashboard`, `/login`, `/admin/login`).
- [x] Verificar assets por area desde `config.ts`.
- [x] Verificar que no haya recoverable Suspense errors por theme.
- [x] Plan de rollback documentado.

Entregable:
- Release candidate listo.

## Sprint 8: Saturacion UI Template (admin/dashboard)
Objetivo: eliminar bypasses UI restantes del host y volver templateable toda UI compartida usada por admin/dashboard (server + client).

Checklist:
- [x] Habilitar override CTC de `ui.alert-dialog` para themes via `entryTemplates`.
- [x] Introducir wrappers cliente para controles CTC UI reutilizables (`async submit`, `confirm dialog`).
- [x] Migrar usos directos restantes de `AsyncSubmitButton`/`ConfirmSubmitButton` en rutas cliente criticas.
- [x] Agregar code templates equivalentes en `theme.first.backoffice`.
- [x] Endurecer baseline requerido para componentes UI compartidos (`ui.async-submit-button`, `ui.alert-dialog`, `ui.theme-toggle`, `ui.language-switcher`).
- [x] Inventariar y migrar bypasses UI residuales de primera ola (`Button` submit manual + dialogos admin criticos) a wrappers template.
  - Migrados:
    - `app/(dashboard)/dashboard/general/page.tsx`
    - `app/(dashboard)/dashboard/security/page.tsx` (update password)
    - `app/(dashboard)/dashboard/subscriptions/page.tsx` (filtro team)
    - `app/(frontend)/pricing/submit-button.tsx`
    - `app/(login)/login.tsx`
    - `app/(dashboard)/admin/users/create-user-dialog.tsx`
    - `app/(dashboard)/admin/payments/payment-data-columns.tsx`
  - Nuevos componentes/template ids habilitados en esta ola:
    - `ui.dialog`
- [ ] Completar matriz de smoke/contract para forzar uso template en nuevas rutas UI.
- [x] Completar matriz de smoke/contract para forzar uso template en nuevas rutas UI.
  - Guardrail agregado en `tests/theme/theme-slot-data-contract.test.ts` para bloquear `type="submit"` fuera de wrappers base (`components/ui/async-submit-button.tsx`, `components/ui/confirm-submit-button.tsx`).
  - Guardrail agregado en `tests/theme/theme-slot-data-contract.test.ts` para exigir que cualquier import directo de `ui/dialog` o `ui/alert-dialog` en `app/` este envuelto por `ThemeCodeTemplate`/`ThemeTemplate` con `id="ui.dialog"` / `id="ui.alert-dialog"` + `fallback`.
- [x] Migrar bypasses UI residuales de segunda ola (`components/layout/user-menu.tsx`).
  - `components/layout/user-menu.tsx` ya no usa `form + button type="submit"` ad-hoc; ahora usa `DropdownMenuItem` con `onSelect` + `signOut`.

Entregable:
- Host admin/dashboard sin bypasses UI en componentes compartidos criticos.

## Sprint 9: Cobertura Total UI admin/dashboard (todo UI -> template)
Objetivo: volver template-driven toda UI de admin/dashboard, incluyendo paginas dashboard faltantes y shell compartido privado.

Checklist:
- [x] Completar cobertura page-level en dashboard:
  - agregar wrappers `ThemeCodeTemplate` en:
    - `app/(dashboard)/dashboard/general/page.tsx` -> `page.dashboard.general`
    - `app/(dashboard)/dashboard/activity/page.tsx` -> `page.dashboard.activity`
    - `app/(dashboard)/dashboard/security/page.tsx` -> `page.dashboard.security`
    - `app/(dashboard)/dashboard/subscriptions/page.tsx` -> `page.dashboard.subscriptions`
- [x] Definir tratamiento de loading UI en dashboard:
  - `app/(dashboard)/dashboard/activity/loading.tsx` migro a template id dedicado `page.dashboard.activity.loading`.
- [x] Extender baseline obligatorio de dashboard en `lib/themes/required-code-templates.ts` con nuevos template ids.
- [x] Implementar templates equivalentes en `themes/first-backoffice/templates/dashboard/*` para todos los ids nuevos.
- [x] Cerrar gap de shell privado compartido:
  - header compartido modelado por template id `layout.private.header` via `app/(dashboard)/private-area-header.tsx`.
  - controles de header migrados a wrappers templateables por area/slot (`ui.language-switcher`, `ui.user-menu`).
- [x] Endurecer contrato de pruebas:
  - [x] ampliar `tests/theme/theme-route-smoke.test.ts` con nuevas rutas dashboard templateadas.
  - [x] ampliar `tests/theme/theme-slot-data-contract.test.ts` para exigir snippets/data/fallback de nuevas rutas dashboard (incluyendo loading).
  - [x] ampliar contratos para cubrir tambien shell privado compartido (`app/(dashboard)/private-area-header.tsx`).
- [x] Definir e iniciar fase de granularidad UI (component-level ids) para evitar dependencia de override completo de pagina:
  - [x] widgets admin home (overview/quick-links/recent-activity) con ids dedicados.
  - [x] nav sections app-config (`panel` + `item`) con ids dedicados.
  - [x] columnas datatable admin con ids dedicados por tabla (incluye `payments`).
  - [x] columnas datatable dashboard/subscriptions con ids dedicados por tabla (`payments`, `invoices`).
  - [x] controles datatable compartidos (`toolbar/filter/columns-toggle/empty/pagination`) con id dedicado `ui.table.control` y slots.

Entregable:
- Admin y dashboard con cobertura template end-to-end (page + shell compartido) y guardrails de contrato que eviten regresion.

## Criterios de cierre
- [x] No existe seleccion de theme por UI ni DB en runtime.
- [x] Seleccion de themes solo por ENV + build.
- [x] Frontend usa `routes.ts` y no usa template ids.
- [x] Admin/Dashboard renderizan por templates con prioridad configurable.
- [x] Build falla si falta template requerido.
- [x] `theme.first.backoffice` cubre baseline admin/dashboard.
- [x] Docs y tests actualizados en verde.

## Riesgos y mitigacion
- Riesgo: ruptura de themes legacy dependientes de DB runtime.
  Mitigacion: alias de ENV temporal + guia de migracion.

- Riesgo: mas friccion para cambiar theme.
  Mitigacion: runbook claro + script de validacion prebuild.

- Riesgo: conflictos entre templates de modulo y theme.
  Mitigacion: prioridad explicita por ENV + matrix de tests para ambos modos.

- Riesgo: confusion entre Next middleware y resolver de render.
  Mitigacion: documentar y forzar resolver server-side fuera de `middleware.ts`.

## Orden recomendado de ejecucion
1. Sprint 1
2. Sprint 2
3. Sprint 3
4. Sprint 5
5. Sprint 4
6. Sprint 6
7. Sprint 7
