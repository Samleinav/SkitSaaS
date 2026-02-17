creo que esto podemos crear un constructor datatables, que tambien maneje api requets por roles auth y propiedad de datos, donde al construir podamos definir el route api, y filtrar los y definir template o esperar template de theme? 


---
title: Archive - App Modular Plan
unlisted: true
---

# Plan de App Modular para `saas-starter`

> Nota: este documento es historico. La documentacion tecnica actual vive en:
> - `docs/modules/*`
> - `docs/platform-capabilities.md`

## Objetivo

Definir una arquitectura para agregar modulos (ej. `licenses-and-api-keys`) con:

- paginas en `/dashboard` y `/admin`
- endpoints API propios
- activacion/desactivacion por configuracion
- desinstalacion limpia (sin romper el core)

Tambien incluir una estrategia para manejar temas (theme) desde Admin.

---

## Estado actual (base real del repo)

- Ya existe modularidad parcial en `/admin` solo para widgets del dashboard (`admin-dashboard/modules.tsx`).
- Config runtime se guarda en `app_configs` (legacy `payment_provider_configs` ya retirado).
- Theme actual es client-side (localStorage + `ThemeToggle`), sin control global desde Admin.
- Nav de `/admin` y `/dashboard` esta hardcoded en componentes.

Esto sirve como base, pero no alcanza para modulos de dominio instalables/desinstalables.

---

## Principios de diseno

1. **Aislamiento por modulo**
   - Cada modulo tiene carpetas, datos y contratos propios.
2. **Registro central**
   - El core conoce modulos solo via manifest/registry.
3. **Fail-safe**
   - Si un modulo esta deshabilitado o falla, no rompe rutas core.
4. **Desinstalacion por niveles**
   - disable, uninstall (keep data), uninstall + purge.
5. **Compatibilidad con App Router**
   - Evitar dinamica no soportada; usar dispatchers y rutas namespaced.

---

## Arquitectura propuesta

## 1) Contrato de modulo (manifest)

Crear un contrato estandar para cualquier modulo:

- `id`, `version`, `displayName`
- `requiredRole` / `capabilities`
- `adminNavItems[]`, `dashboardNavItems[]`
- `adminRoutes[]`, `dashboardRoutes[]`, `apiRoutes[]`
- `configSchema` (keys permitidas y validacion)
- `featureKeys[]` (si usa cuotas/features)
- `lifecycleHooks` (onInstall, onEnable, onDisable, onUninstall)

Metodos/servicios sugeridos:

- `registerAppModule(manifest)`
- `getModuleManifest(moduleId)`
- `getEnabledModules(scope)`
- `validateModuleManifest(manifest)`

---

## 2) Registry central y loader

Crear un registry unico (build-time) con import estatico:

- `lib/modules/registry.ts` (solo manifests)
- `lib/modules/runtime.ts` (estado enabled/disabled desde DB/env)

Metodos sugeridos:

- `getAllModules()`
- `getEnabledModuleManifests()`
- `isModuleEnabled(moduleId)`
- `assertModuleEnabled(moduleId)`

Nota: no plugin remoto en runtime para esta fase. La prioridad es estabilidad y mantenibilidad.

---

## 3) Enrutamiento modular (UI + API)

Para desacoplar del filesystem routing de Next:

- Dashboard: `/dashboard/modules/[moduleId]/[[...slug]]`
- Admin: `/admin/modules/[moduleId]/[[...slug]]`
- API: `/api/modules/[moduleId]/[[...slug]]`

El dispatcher resuelve el handler/page desde el manifest del modulo.

Metodos sugeridos:

- `resolveModulePage({ area, moduleId, slug })`
- `resolveModuleApiHandler({ moduleId, slug, method })`
- `moduleNotFound()` (404 controlado)

Opcional despues: aliases amigables (`/admin/licenses`) apuntando al dispatcher.

---

## 4) Navegacion extensible

Mover nav hardcoded a un sistema combinado:

- Core nav base (items actuales)
- + nav items de modulos habilitados
- Orden configurable por `order` en manifest

Metodos sugeridos:

- `getAdminNavItems(messages)`
- `getDashboardNavItems(messages)`
- `getModuleNavItems(area, messages)`

---

## 5) Config runtime generalizada

Hoy `app_configs` es el storage canonico de runtime config. Para modulos/themes conviene mantener:

- `app_configs` (namespace, key, value, source, updatedAt)
- `app_modules` (moduleId, version, status, installedAt, enabledAt, disabledAt)

Convencion de namespace:

- `core.*`
- `theme.*`
- `module.<moduleId>.*`

Metodos sugeridos:

- `getRuntimeConfig(namespace, key)`
- `setRuntimeConfig(namespace, key, value)`
- `getModuleConfig(moduleId)`
- `setModuleConfig(moduleId, input)`

Transicion recomendada (ya completada en este repo):

- Se retiro `payment_provider_configs`.
- Lecturas/escrituras van a `app_configs`.

---

## 6) Seguridad y permisos

Estandarizar wrappers para modulos:

- `moduleAdminAction(...)` (usa guard admin existente)
- `moduleDashboardAction(...)` (usa dashboard user existente)
- `moduleApiAction(...)` con politicas `public | user | admin | apiKey`

Integrar con `sys_activity_logs` para auditoria:

- enable/disable/uninstall de modulo
- cambios de config
- creacion/revocacion de API keys/licenses

---

## 7) Convenciones de datos por modulo

Cada modulo con tablas namespaced:

- `mod_<moduleId>_*`

Regla de retiro:

- `disable`: oculta rutas/nav y bloquea acciones
- `uninstall keep-data`: modulo fuera del registry activo pero datos quedan
- `uninstall purge`: drop/clean de tablas del modulo (accion explicita)

Esto evita coupling con tablas core.

---

## Modulo ejemplo: `licenses-and-api-keys`

## Alcance funcional (MVP)

- Admin:
  - ver y gestionar todas las licenses
  - ver, revocar, rotar API keys
  - politicas globales del modulo
- Dashboard:
  - gestionar keys del usuario o de su organizacion (segun rol)
  - ver uso reciente
- API:
  - endpoints protegidos por API key
  - validacion de scopes + expiracion + revocacion

## Modelo de datos sugerido

- `mod_licenses_api_keys_licenses`
- `mod_licenses_api_keys_api_keys`
  - guardar hash del secreto (nunca en texto plano)
  - `prefix` visible para UX/auditoria
  - `scopes`, `expiresAt`, `revokedAt`, `lastUsedAt`
- `mod_licenses_api_keys_key_usage_logs`

## Integraciones

- logs en `sys_activity_logs`
- feature flags/quotas (opcional):
  - `dashboard.user.api_keys.max`
  - `dashboard.organization.api_keys.max`
  - `dashboard.organization.licenses.enabled`

---

## Themes controlados desde Admin

## Objetivo

Pasar de toggle local a politica global configurable.

## Politica recomendada

- `theme.mode`: `system | light | dark`
- `theme.allowUserOverride`: `true | false`
- `theme.dashboardVariant`: opcional (si luego se quiere tematizar layouts)

## Resolucion de tema (prioridad)

1. Si `allowUserOverride = false` -> forzar `theme.mode`
2. Si `allowUserOverride = true`:
   - usar preferencia del usuario (cookie/localStorage sincronizados)
   - fallback a `theme.mode`
3. Si `theme.mode = system` -> usar media query

## UI Admin sugerida

- Nueva seccion en `/admin/app-config/theme`
- Inputs:
  - modo global
  - permitir override usuario
  - preview del estado efectivo

---

## Plan de implementacion por fases (sin codigo aun)

## Fase 1 - Fundacion modular

- contrato de modulo + registry + estado en DB
- dispatchers de rutas (`/admin/modules/*`, `/dashboard/modules/*`, `/api/modules/*`)
- nav extensible

## Fase 2 - Config runtime unificada

- `app_runtime_configs` + helpers
- migracion gradual de app-config actual

## Fase 3 - Modulo `licenses-and-api-keys` (MVP)

- entidades, UI admin/dashboard, API key auth, auditoria
- pruebas de flujo critico

## Fase 4 - Theme from Admin

- politica global de theme
- nueva seccion app-config
- sincronizacion cliente/servidor

## Fase 5 - Uninstall tooling

- comandos operativos:
  - `module enable <id>`
  - `module disable <id>`
  - `module uninstall <id> [--purge]`
- validaciones previas (dependencias, datos activos, confirmaciones)

---

## Pruebas y calidad (minimo recomendado)

- tests de contrato del registry (modulo valido/invalido)
- tests de dispatcher de rutas/API por modulo habilitado/deshabilitado
- tests de permisos (admin/dashboard/api key)
- tests de uninstall (disable y purge)
- tests de resolucion de theme (politica global vs override usuario)

---

## Riesgos y decisiones pendientes

- URL final de modulos: mantener prefijo `/modules` o usar aliases planos.
- Migrar todo app-config a tabla nueva vs convivir largo tiempo.
- Nivel de aislamiento para migrations por modulo (global drizzle vs scripts por modulo).
- Definir si modulo puede aportar webhooks/jobs en fase inicial o fase posterior.

---

## Resultado esperado

Con este plan, podras agregar un modulo como `licenses-and-api-keys` de forma predecible, con rutas admin/dashboard/API, control desde Admin, y desinstalacion segura sin afectar el core.
