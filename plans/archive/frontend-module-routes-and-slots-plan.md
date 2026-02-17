# Plan Previo: Frontend Module Routes + Slots Contract

Estado: Completado
Inicio: 2026-02-12
Bloquea: `plans/archive/first-theme-frontend-admin-dashboard-plan.md`
Fase actual: `Cerrado`
Ultima verificacion: 2026-02-12

## Objetivo
Habilitar que modulos puedan:

1. Registrar rutas frontend (ejemplo: `/contact-us`, `/about`, `/plans`).
2. Integrarse con themes frontend sin import directo `theme -> module`.
3. Exponer contenido embebible por contrato (slots tipados), evitando shortcodes string fragiles.

## Contexto actual (verificado)
- `ModuleArea` ya fue extendido a `frontend` en SDK (`app/sdk/src/modules/manifest.ts`).
- `ModuleManifest` ya soporta `frontendPage`, `frontendRouteAliases`, `frontendNavItems`.
- `ModuleManifest` ya soporta `frontendRouteAccess` (`public` | `user` | `admin`).
- Runtime host ya resuelve paginas de modulo en `area: 'frontend'` (`lib/modules/runtime.ts`).
- Ya existe dispatcher canonical frontend: `app/(frontend)/modules/[moduleId]/[[...slug]]/page.tsx`.
- Ya existe alias resolver frontend: `app/(frontend)/[...moduleAlias]/page.tsx`.
- Dispatchers frontend aplican `frontendRouteAccess` con redireccion a `/login` o `/dashboard` segun politica.
- Runtime ya soporta `frontendSlots` por manifest y resolucion por prioridad (`target_module` -> `enabled_module` -> fallback).
- Validacion de aliases ya incluye `frontend` con rutas reservadas core (`lib/modules/routes.ts`).
- Suite base de runtime quedo cubierta con pruebas de frontend (`tests/modules/module-runtime.test.ts`).

## Decisiones de arquitectura (v1)

### Decision 1: Mantener host como duenio del router
- Las rutas reales siguen resolviendose en `app/(frontend)` del host.
- Modulos declaran rutas via manifest/SDK; el host despacha.
- No se habilita import directo de modulos dentro de themes como mecanismo principal.

### Decision 2: `routes.ts` por modulo + helper SDK
- Cada modulo puede tener `src/routes.ts` para declarar rutas frontend de forma intuitiva.
- El manifest del modulo consume ese registro.
- Se agrega helper SDK para router frontend (igual paradigma que admin/dashboard).

Propuesta de ergonomia:
- `createModulePageRouter(...)` reutilizable para frontend.
- helper opcional: `defineModuleRoutes({...})` para agrupar `frontend/admin/dashboard/api`.

### Decision 3: Integracion theme/modulo por slots contract, no shortcodes
- Evitar strings tipo `["mod.contact.us:form1"]` como contrato principal.
- Usar `slotId` tipado y registro runtime.
- Theme renderiza slot; host resuelve el provider modulo activo.

Ejemplo conceptual:
- `slotId`: `frontend.contact.form.primary`
- modulo `mod.contact.us` provee ese slot
- theme frontend decide donde renderizarlo en `page.contact`

## Por que no import directo `theme -> module`
- Acopla versionado y dependencias entre packs.
- Dificulta fallback cuando modulo no esta instalado/habilitado.
- Empeora mantenibilidad y compatibilidad entre multiples themes/modulos.

## Alcance
En alcance:
- SDK (`app/sdk/src/modules/manifest.ts`, `app/sdk/src/server.ts`)
- Runtime host (`lib/modules/runtime.ts`, resolver de aliases/rutas)
- Dispatcher frontend en `app/(frontend)` para rutas de modulos
- Validaciones de colision de rutas frontend
- Contrato de slots frontend (minimo viable)
- Tests y docs

Fuera de alcance (v1):
- CMS visual de paginas frontend
- Hot swap de rutas sin redeploy
- DSL avanzado de plantillas/shortcodes

## Contrato propuesto (v1)

### Module manifest (extension)
- `frontendPage?: ModulePageHandler`
- `frontendRouteAliases?: string[]`
- `frontendNavItems?: ModuleNavItem[]` (opcional)

Nota:
- `ModuleArea` evoluciona para incluir `frontend`.
- Validar colisiones con rutas core y con aliases de otros modulos.

### SDK router helper
- Reusar `createModulePageRouter` para frontend.
- (Opcional) agregar helper ergonomico `defineModuleRoutes`.

### Slot contract (minimo)
- Nuevo registro runtime de slots frontend:
  - `slotId` (string tipado por convension)
  - `moduleId`
  - `handler/component`
- Resolucion por prioridad:
  1. provider del modulo objetivo de la ruta
  2. provider global de modulo habilitado (si aplica)
  3. fallback del host/theme

## Fases y checklist

### Fase 0: RFC y contrato
- [x] Confirmar campos de manifest frontend (`frontendPage`, `frontendRouteAliases`, `frontendNavItems`).
- [x] Definir convension de `routes.ts` por modulo.
- [x] Definir politica de colision de rutas frontend.
- [x] Definir contrato minimo de slots (`slotId`, payload, fallback).
- [x] Definir politica de auth para rutas frontend de modulo (public/user/admin por route).

Entregable:
- Contrato aprobado y documentado.

### Fase 1: SDK
- [x] Extender `ModuleArea` para incluir `frontend`.
- [x] Extender `ModuleManifest` con campos frontend.
- [x] Extender validaciones de aliases para frontend.
- [x] Exponer helpers SDK para declaracion de rutas frontend.
- [x] Actualizar `app/sdk/dist/*` con build del SDK.

Entregable:
- SDK listo para modulos con rutas frontend.

### Fase 2: Host runtime y dispatcher
- [x] Extender `resolveModulePage(...)` para `area: 'frontend'`.
- [x] Implementar dispatcher canonical frontend:
  - `app/(frontend)/modules/[moduleId]/[[...slug]]/page.tsx`
- [x] Implementar alias resolver frontend:
  - `app/(frontend)/[...moduleAlias]/page.tsx` (con guardas para no romper rutas core).
- [x] Integrar validacion de conflictos contra rutas core conocidas.
- [x] Integrar nav items frontend de modulos habilitados (si aplica).
- [x] Aplicar guard de auth frontend por manifest (`frontendRouteAccess`).

Entregable:
- Rutas frontend de modulos funcionando end-to-end.

### Fase 3: Slots frontend (MVP)
- [x] Crear contrato runtime de slots frontend (`slotId` + payload).
- [x] Registrar slot providers desde manifest/modulo.
- [x] Exponer helper host para render de slot con fallback.
- [x] Integrar 1 caso real: `frontend.contact.form.primary` con modulo frontend activo (`mod.example.dashboard` en entorno actual).

Entregable:
- Embebido modulo->theme frontend por slots, sin shortcode fragil.

### Fase 4: QA y docs
- [x] Tests: despacho por ruta canonical frontend.
- [x] Tests: aliases frontend y colisiones.
- [x] Tests: auth por ruta frontend de modulo.
- [x] Tests: slot render + fallback.
- [x] Docs:
  - `docs/modules/02-runtime-routing.md`
  - `docs/modules/08-themes.md`
  - nueva guia `docs/modules/frontend-routing-and-slots.md`
- [x] Actualizar `AGENTS.md` con nuevas convenciones de rutas frontend de modulos.

Entregable:
- Base estable para empezar migracion de themes frontend con modulos dinamicos.

## Riesgos y mitigacion
- Riesgo: catch-all frontend capture rutas no deseadas.
  - Mitigacion: resolver estaticas primero y validar aliases prohibidos.
- Riesgo: colision entre modulo y paginas core.
  - Mitigacion: bloqueador en validacion de manifest.
- Riesgo: acoplamiento theme/modulo por imports directos.
  - Mitigacion: contrato de slots + runtime resolver.

## Criterio de cierre
- [x] Modulo puede declarar `/contact-us` sin tocar codigo de pagina core.
- [x] Theme/frontend host puede renderizar slot de modulo por `slotId` (piloto: `frontend.contact.form.primary`).
- [x] Sin imports directos `theme -> module` para integracion principal.
- [x] Tests y docs en verde.
