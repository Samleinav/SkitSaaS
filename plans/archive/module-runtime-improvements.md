# Plan de mejoras para módulos (enterprise hardening)

## Objetivo

Elevar el runtime de módulos desde un modelo "plugin interno" a uno más robusto para operación enterprise (seguridad, performance, gobernanza y rutas legibles).

## Estado actual confirmado

- El menú de navegación usa `href` tal cual viene del manifiesto.
- El runtime solo resuelve páginas/API por dispatcher:
  - `/admin/modules/[moduleId]/[[...slug]]`
  - `/dashboard/modules/[moduleId]/[[...slug]]`
  - `/api/modules/[moduleId]/[[...slug]]`
- Consecuencia: si pones un `href` custom (por ejemplo `/admin/custom/href1`) en `adminNavItems`, el link se pinta en nav, pero será 404 si no existe una ruta Next.js que lo atienda.

## Fase 1 (P0) - Seguridad y consistencia

1. Endurecer validación de `ModuleManifest`.
- Validar `href` por área (`/admin/*`, `/dashboard/*`) y formato.
- Validar IDs duplicados de nav/widgets por módulo.
- Fallar `modules:prepare` ante manifiestos inválidos (no solo warning).

2. Enforce de compatibilidad SDK.
- Implementar validación real de `sdkRange` en `modules:prepare`.
- Bloquear módulos incompatibles con versión del host.

3. Política de auth para API de módulos.
- Agregar `apiPolicy` en manifest (`public | user | admin | apiKey`).
- Aplicar guard central en dispatcher API antes de ejecutar `apiHandler`.

4. Capa de auditoría.
- Registrar enable/disable/update con actor y motivo en `sys_activity_logs`.
- Correlacionar con `moduleId`, `requestId`, `eventId`.

## Fase 2 (P1) - Performance y resiliencia

1. Cache de estado de módulo habilitado.
- Evitar query por request para `isModuleEnabled`.
- Usar cache por `moduleId` con invalidación al hacer sync/toggle.

2. Indexado y queries de runtime.
- Revisar rutas calientes de `getEnabledModuleNavItems` y `getEnabledModuleManifests`.
- Mantener respuesta O(n) por módulo habilitado, evitando lecturas completas no necesarias.

3. Modo degradado controlado.
- Si falla DB de runtime, fallback configurable (`deny-by-default` en producción).
- Métricas y alertas explícitas por `module_dispatch.failed`.

## Fase 3 (P1/P2) - Rutas custom legibles

1. Mantener ruta canónica actual (compatibilidad).
- No romper dispatcher existente `/admin/modules/<moduleId>`.

2. Agregar aliases de rutas por módulo.
- Nuevo campo de manifest:
  - `adminRouteAliases?: string[]`
  - `dashboardRouteAliases?: string[]`
- Ejemplo: `'/admin/custom/href1'`.

3. Resolver alias en runtime.
- Crear ruta catch-all controlada:
  - `app/(dashboard)/admin/custom/[...alias]/page.tsx`
  - `app/(dashboard)/dashboard/custom/[...alias]/page.tsx`
- Resolver alias -> `(moduleId, slug)` y delegar en `resolveModulePage`.

4. Reglas de gobernanza de aliases.
- Unicidad global por área (sin colisiones).
- Bloqueo de prefijos reservados (`/admin/users`, `/admin/orders`, etc.).
- Validación en build (`modules:prepare`) y en sync (`modules:sync`).

## Fase 4 (P2) - Operación enterprise

1. Habilitación por tenant/entorno.
- Extender modelo de runtime para activación por organización/plan/entorno.

2. Version pinning y rollout progresivo.
- Permitir activar módulo por versión y canary por porcentaje.

3. Contrato de errores y SLO.
- Definir presupuesto de error por módulo.
- Alertas por latencia y tasa de fallos por `moduleId`.

## Cambios de datos propuestos

- Nueva tabla sugerida `app_module_routes`:
  - `module_id`, `area`, `route_path`, `is_primary`, `status`, `created_at`, `updated_at`
  - índices únicos por `(area, route_path)` y `(module_id, area, route_path)`

## Tests mínimos por fase

1. Manifest/prepare.
- Rechaza `href` inválido o alias en conflicto.
- Rechaza `sdkRange` incompatible.

2. Runtime routing.
- Alias válido renderiza página del módulo.
- Alias inválido retorna 404.
- Alias deshabilitado retorna 404.

3. Seguridad.
- `apiPolicy=admin` retorna 403 para usuario no admin.
- `apiPolicy=user` retorna 401 para no autenticado.

4. Performance.
- Bench simple de `resolveModulePage` con cache hit/miss.

## Criterios de salida

- Sin regresiones en rutas actuales de dispatcher.
- Alias custom operativos y auditables.
- Guard centralizado de auth para API modules.
- Validación estricta en pipeline (`modules:prepare`, `modules:sync`, tests).
