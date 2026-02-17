# Plan: Evolucion SDK (prioridad alta)

## Estado

- Plan completado y archivado el 9 de febrero de 2026.
- Documento enfocado solo en evolucion del SDK.
- Fase 1 iniciada y aplicada el 9 de febrero de 2026 (contratos base unificados via SDK).
- Fase 2 implementada el 9 de febrero de 2026 (auth/session, revalidation, bootstrap server-only, parse helpers) y extendida con adapter de DB + table lookup por alias/nombre y routers declarativos (`createModuleApiRouter`, `createModulePageRouter`) para eliminar boilerplate en modulo piloto.
- Fase 3 implementada el 9 de febrero de 2026 (politica semver documentada, `sdkRange` validado en `modules:prepare`, modo estricto bloqueante en pipeline).
- Fase 4 validada el 9 de febrero de 2026 (no regresion en dispatcher admin/dashboard/api con tests de runtime).
- Fase 5 completada el 9 de febrero de 2026 (docs SDK finalizadas + guia de migracion SDK-first + pruebas de contrato/adapters).

## Objetivo

Consolidar el SDK como contrato unico para host y modulos, eliminando duplicaciones y habilitando desarrollo SDK-first.

## Alcance

- `app/sdk/src/*`
- `app/sdk/dist/*`
- Contratos usados por runtime de modulos (manifest, events, i18n, server helpers)
- Integracion host para consumir el contrato SDK

## Fuera de alcance

- Pipeline de build de modulos `source-package` (se cubre en plan separado).
- Cambios funcionales de negocio (payments/subscriptions).
- Marketplace remoto.

## Principios

1. Una sola fuente de verdad de contratos.
2. API publica pequena y estable.
3. Host expone capacidades via adapters, no internals directos.

## Fase 1 - Contrato unico (P0)

### Objetivo

Eliminar duplicaciones entre host y SDK para contratos base.

### Tareas

- Unificar `ModuleManifest` y tipos de routing.
- Unificar tipos de eventos y catalogo de hooks.
- Unificar tipos de i18n de modulos.
- Unificar controller base de server actions.

### Checklist

- [x] Existe una sola fuente de verdad para manifest.
- [x] Existe una sola fuente de verdad para events.
- [x] Existe una sola fuente de verdad para i18n de modulos.
- [x] Existe una sola fuente de verdad para action controller.

### Criterio de salida

No hay archivos espejo host/SDK para estos contratos.

## Fase 2 - SDK server adapters (P0)

### Objetivo

Completar `@skitsaas/sdk/server` para uso real de modulos sin imports internos del host.

### Tareas

- Definir adapter de auth/session (`requireUser`, `requireAdmin`, `getUser`).
- Definir adapter de revalidation (`revalidatePath`, lote de paths).
- Definir adapter de module config (read/write namespaced).
- Definir adapter de event emit (sync/async).
- Exponer helpers de parseo `FormData`/`JSON` consistentes.
- Exponer helpers declarativos de rutas API/page para modulos (metodo, path, auth, roles).

### Checklist

- [x] Adapters definidos y tipados en SDK.
- [x] Errores claros cuando un adapter no esta configurado.
- [x] Host configura adapters en bootstrap server-only.
- [x] Modulo piloto puede usar SDK server sin `@/lib/*` para auth/session/revalidation (`data.ts` mantiene imports DB internos, fuera de Fase 2).
- [x] Router declarativo disponible para `apiHandler` y `adminPage/dashboardPage` en SDK server.

### Criterio de salida

Un modulo puede autenticarse/revalidar/emitir eventos/configurar sin imports internos del host.

## Fase 3 - Packaging y versionado SDK (P0)

### Objetivo

Formalizar versionado y compatibilidad para autores externos.

### Tareas

- Definir politica semver del SDK.
- Definir/validar `sdkRange` esperado en `module.json`.
- Revisar `exports`, `types`, `files` y entrypoints del package SDK.
- Agregar check de compatibilidad en scripts de preparacion/build.

### Checklist

- [x] Politica semver documentada.
- [x] `sdkRange` validado en pipeline.
- [x] Entry points del package claros (`.`, `./server`, `./db`).
- [x] Errores de incompatibilidad bloquean flujo en modo estricto.

### Criterio de salida

Compatibilidad SDK-modulo verificable antes de compilar host.

## Fase 4 - Migracion incremental (P0/P1)

### Objetivo

Migrar consumo interno al SDK sin romper runtime existente.

### Tareas

- Migrar host para consumir contratos unificados.
- Migrar `mod.example.suite` a SDK-first.
- Mantener compatibilidad temporal con modulos legacy.

### Checklist

- [x] Host usa contrato SDK unificado.
- [x] `mod.example.suite` deja dependencias directas `@/app/*` y `@/lib/*` donde aplique.
- [x] No hay regresion en dispatcher admin/dashboard/api.

### Criterio de salida

Host y modulo piloto operan sobre el mismo contrato SDK.

## Fase 5 - Documentacion y pruebas (P0)

### Objetivo

Alinear docs/tests con la superficie final del SDK.

### Tareas

- Actualizar `docs/sdk/00-overview.md`.
- Actualizar docs de modulos afectadas (`docs/modules/*`).
- Agregar/ajustar tests de contrato y adapters.

### Checklist

- [x] Documentacion SDK actualizada.
- [x] Guida de migracion SDK-first publicada.
- [x] Tests de contrato/adapters pasando.

### Criterio de salida

Onboarding SDK coherente con implementacion real.

## Dependencias y bloqueadores

- Aprobacion de API publica minima del SDK.
- Definicion de politica de compatibilidad (`sdkRange`).
- Disponibilidad de modulo piloto para migracion.

## Criterios globales de finalizacion

- [x] Contratos duplicados eliminados.
- [x] SDK server adapters completos y configurables.
- [x] Versionado/compatibilidad SDK formalizado.
- [x] Host + modulo piloto funcionando en modelo SDK-first.
