# Plan: First Real Themes (Frontend + Admin/Dashboard + Login)

Estado: Completado
Dependencia previa:
- `plans/archive/frontend-module-routes-and-slots-plan.md`
- `plans/archive/theme-code-driven-templates-plan.md`
Inicio: 2026-02-12
Fase actual: `Cerrado`

## Objetivo
Crear el primer par de themes reales del sistema:

1. Theme frontend para `app/(frontend)`
2. Theme operativo para `app/(dashboard)/admin`, `app/(dashboard)/dashboard` y `app/(login)`

y migrar la UI actual de rutas host a templates de theme, manteniendo queries/actions/guards en host.

Adicionalmente, habilitar superficies base de theme por area:
- favicon por theme/area
- `global.css` por theme/area
- `not-found` por theme/area

## Resultado esperado
- Las rutas host siguen resolviendo auth, datos y acciones.
- Antes de renderizar, cada ruta construye un `view model` y renderiza template del theme.
- El theme controla presentacion, estructura y estilos de pantallas objetivo.
- Fallback seguro al render core si falta template o hay error.

## Alcance
En alcance:
- `app/(frontend)`
- `app/(dashboard)/admin`
- `app/(dashboard)/dashboard`
- `app/(login)`
- `themes/*` (nuevo theme frontend y nuevo theme admin/dashboard)
- Integracion de `ThemeTemplate` y/o CTC donde aplique
- Soporte de assets/superficies base por theme:
  - favicon
  - `global.css`
  - `not-found`
- Tests y docs tecnicos

Fuera de alcance (v1):
- Editor visual de themes en runtime
- Hot swap de theme sin rebuild
- Reescritura de actions/queries al theme
- Migracion de todos los componentes existentes a code-driven en una sola entrega

## Decision de arquitectura (confirmada)
Patron host -> theme:

1. Host resuelve auth + datos + acciones + permisos.
2. Host arma `view model` serializable por slot/pagina.
3. Host renderiza template del theme y le pasa `data`.
4. Si el template no existe o falla, fallback al render core.

Reglas:
- Logica de negocio nunca vive en `themes/*`.
- Themes no importan `@/lib/*` del host; usan SDK/public contract.
- Server actions quedan en host; templates reciben datos y callbacks permitidos por React/Next.
- El contrato entre modulo/theme/core se define por `componentId` y payload tipado.

## Entregables principales
1. Theme frontend inicial (pack nuevo).
2. Theme admin/dashboard/login inicial (pack nuevo).
3. Slots/template IDs de pagina y layout definidos.
4. Rutas host migradas para render via template con `data`.
5. Pruebas de fallback, rendering y regresion basica.
6. Documentacion de contrato de datos por template.
7. Soporte runtime para `favicon`, `global.css` y `not-found` por theme/area.

## Propuesta de packs iniciales
- `themes/first-frontend`
  - `themeId`: `theme.first.frontend`
  - `areas`: `["frontend"]`
- `themes/first-backoffice`
  - `themeId`: `theme.first.backoffice`
  - `areas`: `["admin", "dashboard", "login"]`

Nota:
- Nombres finales se pueden ajustar antes de implementacion.

## Inventario inicial para migracion
Frontend:
- `app/(frontend)/layout.tsx`
- `app/(frontend)/page.tsx`
- `app/(frontend)/pricing/page.tsx`

Admin/Dashboard:
- `app/(dashboard)/admin/layout.tsx`
- `app/(dashboard)/admin/page.tsx`
- `app/(dashboard)/dashboard/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`

Login:
- `app/(login)/login/page.tsx`
- `app/(login)/admin/login/page.tsx`
- `app/(login)/sign-up/page.tsx`

## Contratos de template (v1)
Slots/paginas prioritarias:
- `layout.frontend.shell`
- `page.frontend.home`
- `page.frontend.pricing`
- `layout.admin.shell`
- `page.admin.home`
- `layout.dashboard.shell`
- `page.dashboard.home`
- `page.login.user`
- `page.login.admin`
- `page.login.signup`
- `system.not-found`

Convencion de props:
- `data`: view model serializable
- `themeId`: inyectado por host/runtime
- `className`: opcional para wrappers

## Contrato por `componentId` (arranque inmediato)
Objetivo:
- Permitir que themes y modulos compartan primitives sin acoplarse a Tailwind/MUI.

Reglas:
- `componentId` compartidos para primitives del sistema: `ui.*`.
- `componentId` especificos por dominio de modulo: `mod.<dominio>.*`.
- `templateId` se usa para trazabilidad/versionado; la compatibilidad funcional se define por `componentId` + contrato `data/payload`.
- Todo `componentId` nuevo debe declarar esquema de `data/payload` y su normalizer.
- Evitar payloads acoplados a framework visual (clases exclusivas de Tailwind o componentes exclusivos de MUI) como requisito funcional.

## Fases y checklist

### Fase 0: Discovery y contratos
- [x] Confirmar naming final de theme packs (`themeId`, rutas de carpeta).
- [x] Confirmar lista minima de pantallas a migrar en v1.
- [x] Definir catalogo inicial de `componentId` para v1 (`ui.*` + `mod.<dominio>.*` candidatos).
- [x] Definir esquema `data` por cada slot/pagina objetivo.
- [x] Definir esquema `data/payload` por `componentId` (fuente de verdad para theme + modulo).
- [x] Definir contrato de surfaces base por area:
  - favicon (`head` links/icons por theme)
  - `global.css` (css global por theme/area)
  - `not-found` (template/system page por area)
- [x] Definir estrategia de compatibilidad con render actual (fallback por ruta).
- [x] Definir criterio de "done" por area.

Entregable:
- Contrato de templates v1 aprobado.

### Fase 1: Scaffold de themes
- [x] Crear `themes/first-frontend` con `theme.json`, `tokens.css`, `package.json`, `templates/`.
- [x] Crear `themes/first-backoffice` con `theme.json`, `tokens.css`, `package.json`, `templates/`.
- [x] Agregar `theme.config.ts` en ambos packs cuando aplique provider/head.
- [x] Definir estructura de assets por theme para surfaces base:
  - favicon(s)
  - `global.css`
  - template `system.not-found`
- [x] Validar `pnpm themes:prepare` sin errores.

Entregable:
- Packs creados y registrados en artefactos generados.

### Fase 2: Integracion host para render por templates
- [x] Introducir puntos de render por slot en rutas layout/page objetivo.
- [x] Preparar `view model` en host antes de render de template.
- [x] Integrar resolucion por `componentId` en slots clave para permitir override theme/modulo por contrato.
- [x] Integrar carga por area de `global.css` del theme activo.
- [x] Integrar favicon por area/theme activo en `head`.
- [x] Integrar resolucion `not-found` por area con fallback al `app/not-found.tsx` actual.
- [x] Mantener fallback core por ruta si falta template.
- [x] Asegurar que actions/queries quedan en host.

Entregable:
- Rutas objetivo con pipeline host -> template -> fallback.

### Fase 3: Migracion frontend v1
- [x] Migrar estructura de `layout.frontend.shell`.
- [x] Migrar `page.frontend.home`.
- [x] Migrar `page.frontend.pricing`.
- [x] Implementar `system.not-found` para area frontend.
- [x] Verificar i18n y theme tokens en frontend.

Entregable:
- Frontend renderizado por theme en rutas objetivo.

### Fase 4: Migracion admin/dashboard/login v1
- [x] Migrar `layout.admin.shell` y `page.admin.home`.
- [x] Migrar `layout.dashboard.shell` y `page.dashboard.home`.
- [x] Migrar `page.login.user`, `page.login.admin`, `page.login.signup`.
- [x] Implementar `system.not-found` para admin/dashboard.
- [x] Cubrir caso modulo sobre theme activo (theme override + module override/default segun precedencia).
- [x] Verificar guards, UX de formularios y acciones server.

Entregable:
- Admin/dashboard/login renderizados por theme en rutas objetivo.

### Fase 5: QA, docs y hardening
- [x] Tests: template presente -> render theme.
- [x] Tests: template ausente/error -> fallback core.
- [x] Tests: contratos de `data` por slot critico.
- [x] Tests: contratos por `componentId` (theme vs modulo).
- [x] Tests: `favicon`/`global.css`/`not-found` correctos segun area y theme activo.
- [x] Tests smoke para rutas clave (`/`, `/pricing`, `/admin`, `/dashboard`, `/login`, `/admin/login`).
- [x] Actualizar docs (`docs/modules/08-themes.md` y guia de autor de themes).
- [x] Actualizar docs con convencion `componentId` compartido (`ui.*`) vs especifico de modulo (`mod.*`).
- [x] Documentar contrato de surfaces base (`favicon`, `global.css`, `system.not-found`) para autores de themes.
- [x] Actualizar `AGENTS.md` con convenciones de template IDs de pagina/layout si cambian.

Entregable:
- Feature lista para rollout controlado.

## Dependencias y bloqueadores
Dependencias:
- `themes:prepare` y registro code-driven operativos.
- Contrato SDK para `theme.config.ts` y i18n de theme.

Bloqueadores potenciales:
- Diferencias server/client en templates con formularios.
- Props no serializables en `data`.
- Coupling accidental de themes a `@/lib/*`.

## Riesgos y mitigacion
- Riesgo: romper auth/guards al migrar layouts.
  - Mitigacion: mantener guards en host y solo mover presentacion.
- Riesgo: regresiones visuales en rutas criticas.
  - Mitigacion: rollout por area + fallback por ruta.
- Riesgo: data contract inestable entre host y template.
  - Mitigacion: tipos explicitos por slot + tests de contrato.

## Criterio de cierre
- [x] Frontend v1 renderiza por templates de `theme.first.frontend` con fallback seguro.
- [x] Admin/dashboard/login v1 renderizan por templates de `theme.first.backoffice` con fallback seguro.
- [x] `favicon`, `global.css` y `not-found` son resolubles por area/theme con fallback seguro.
- [x] No hay imports de host internals desde `themes/*`.
- [x] Tests de rutas criticas y fallback en verde.
- [x] Documentacion y AGENTS actualizados.
