# Plan 2: Component Template Controller

Estado: Activo
Dependencia previa: `plans/archive/theme-modular-system-plan.md`
Bloquea: integracion completa de templates por theme/modulo
Inicio: 2026-02-11
Fase actual: `Fase 5 - Migracion de componentes reales + QA`

## Objetivo
Crear un controlador central que resuelva el template final de cada componente
antes de renderizar, permitiendo combinacion entre:

- defaults core,
- templates de theme activo,
- templates de modulo.

## Relacion con Plan 1
Este plan comienza despues de tener:

- area `frontend` separada,
- registro de themes,
- seleccion de theme por area operativa.

Sin eso, la resolucion de templates no es determinista.

## Reglas de resolucion
Para cada `componentId`, resolver en este orden:

1. `moduleOverride` (override explicito del modulo),
2. `themeAreaOverride` (theme activo del area),
3. `themeGlobalOverride`,
4. `moduleDefault`,
5. `coreDefault`.

Regla adicional:
- si un componente esta marcado `lockTemplate=true` por el modulo, no aceptar override externo (salvo politica admin forzada).

## Modelo de packs

### Theme template pack
- `themes/<themeId>/templates/*`
- Registrado por `componentId`.
- Puede incluir wrappers, estructura HTML y clases.

### Module template pack
- `modules/<moduleId>/src/templates/*` (`source-host`)
- `modules/<moduleId>/dist/templates/*` (`source-package`)
- Declarado en manifest del modulo (campo nuevo a definir).

## API minima propuesta
- `resolveTemplate(componentId, context)`
- `renderWithTemplate(componentId, context, fallbackRender)`
- `registerCoreTemplates(...)`
- `registerThemeTemplates(themeId, ...)`
- `registerModuleTemplates(moduleId, ...)`

`context` minimo:
- `area`
- `themeId`
- `moduleId` (opcional)
- `route`
- `flags` (`lockTemplate`, etc.)

## Componentes piloto (fase inicial)
- `ui.table`
- `ui.alert-dialog`
- `ui.async-submit-button`

## Fases y checklist

## Fase 0: Contrato tecnico
- [x] Definir `componentId` naming convention.
- [x] Definir tipos `TemplateResolverContext` y `TemplateEntry`.
- [x] Definir politica de compatibilidad semver del contrato.
- [x] Definir lista de componentes bloqueables (`lockTemplate`).
- [x] Aprobar matriz de precedencia.

Entregable:
- Contrato del CTC aprobado.

## Fase 1: Core controller
- [x] Implementar registro core en host.
- [x] Implementar `resolveTemplate` con precedencia.
- [x] Implementar fallback a `coreDefault`.
- [x] Instrumentar trazas de resolucion (debug/metrics).
- [x] Proveer helper para render seguro.

Entregable:
- CTC funcional en modo core-only.

## Fase 2: Integracion con themes
- [x] Conectar CTC con theme activo de area (Plan 1).
- [x] Cargar templates de theme por area.
- [x] Habilitar fallback a templates globales del theme.
- [x] Validar conflictos de `componentId`.
- [x] Implementar politica de denegacion para componentes criticos.

Entregable:
- Themes aplican templates a componentes.

## Fase 3: Integracion con modulos
- [x] Extender manifest de modulo con `templatePack` (campo nuevo).
- [x] Soporte para `source-host`.
- [x] Soporte para `source-package` en build/prepare.
- [x] Permitir que modulo:
  - use templates del theme activo,
  - o provea su propio pack default/override.
- [x] Validar colisiones y compatibilidad.

Entregable:
- Modulos integrados al CTC.

## Fase 4: SDK y tooling
- [x] Exponer tipos base de `templatePack` en SDK (`@skitsaas/sdk`).
- [x] Actualizar pipeline para validacion de template packs.
- [x] Agregar checks en `modules:build`/`modules:prepare`.
- [x] Versionar contrato para `source-package`.
- [x] Actualizar template de modulo en docs.

Entregable:
- Tooling completo para autores de modulos.

## Fase 5: Migracion de componentes reales + QA
- [x] Migrar `ui.table`.
- [x] Migrar `ui.alert-dialog`.
- [x] Migrar `ui.async-submit-button`.
- [x] Tests unitarios de precedencia y fallback.
- [x] Tests integracion host + modulo + theme.
- [x] Revisar performance y caching.

Entregable:
- CTC en produccion para componentes piloto.

## Casos funcionales a validar
- [x] Theme frontend define template de `ui.table` y se usa en area `frontend` de CTC.
- [x] Theme admin define `ui.table` distinto al dashboard.
- [x] Modulo usa template del theme activo sin registrar propio.
- [x] Modulo registra template propio y overridea al theme.
- [x] Componente bloqueado ignora override no permitido.

## Riesgos y mitigaciones
- Riesgo: explosivo de variantes por area/theme/modulo.
  - Mitigacion: contrato estricto + componente piloto primero.
- Riesgo: regresiones visuales por precedence.
  - Mitigacion: snapshots y pruebas visuales basicas.
- Riesgo: coupling fuerte con internals del host.
  - Mitigacion: superficie SDK y prohibicion de imports internos en modulos.

## Criterio de cierre
- Resolver templates consistentemente por area/theme/modulo.
- Modo `source-package` soportado sin imports internos `@/...`.
- Precedencia, locking y fallback cubiertos con tests.
- Documentacion de autor y runtime actualizada.
