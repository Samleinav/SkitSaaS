# Plan: prioridad SDK package + modo modulos build con package propio

## Estado

- Documento de planificacion para ejecucion por fases.
- Sin cambios de codigo en esta entrega.

## Objetivo

Implementar el orden de trabajo solicitado:

1. **Primero** endurecer/evolucionar el paquete SDK para que sea la base comun.
2. **Despues** introducir el nuevo modo de modulos con `package.json` propio, validacion de dependencias y build previo al build del host.

Resultado esperado:

- Modulos con package propio pueden usar dependencias internas sin ensuciar el flujo del host.
- El host carga solo artefactos compilados cuando el modulo esta en modo package-build.

## Contexto y decision de arquitectura

Se formalizan 3 modos de modulo:

1. `prebuilt`
- El modulo ya viene compilado (`entry` en `dist/*`).
- El host solo integra y sincroniza.

2. `source-host`
- Modulo con codigo fuente sin package propio.
- Se compila junto al proyecto principal.
- Puede usar imports del host (modo legacy/controlado).

3. `source-package`
- Modulo con `package.json` propio y pipeline independiente.
- Se valida compatibilidad de dependencias.
- Se compila antes del host y se consume como artefacto `prebuilt`.
- En `modules:prepare`, para este modo se usa solo `entry` compilado y se ignora el source para runtime.

## Alcance

- `app/sdk/*` (API publica y server helpers para soportar el nuevo modo).
- `scripts/modules-*` para build/validacion/discovery.
- `module.json` (metadata de modo de build y reglas de consumo).
- Integracion en `package.json` (orden de comandos predev/prebuild).
- Documentacion tecnica en `docs/sdk/*` y `docs/modules/*`.

## Fuera de alcance

- Marketplace remoto y descarga dinamica en runtime.
- Carga dinamica de nuevo codigo sin pipeline de build.
- Reescritura completa de modulos existentes en una sola fase.

## Fase 1 - Prioridad alta: SDK package (P0)

### Objetivo

Dejar listo el SDK como contrato estable para soportar el nuevo modo `source-package`.

### Tareas

1. Definir contrato SDK para metadata de build de modulo:
- tipo para modo de modulo (`prebuilt`, `source-host`, `source-package`).
- tipo para metadata esperada en `module.json` (incluyendo compatibilidad SDK y entry compilado).
2. Extender `@skitsaas/sdk/server` con primitives minimas requeridas por modulos empaquetados:
- helpers/adapters de auth/session.
- helpers/adapters de revalidate.
- helpers/adapters de module config/event emit.
3. Unificar/ajustar tipados duplicados host/SDK (manifest/controller/event/i18n) en la ruta acordada.
4. Publicar contrato de compatibilidad:
- politica semver para SDK.
- campos obligatorios para modo `source-package`.

### Entregables

- Contrato SDK actualizado para soportar modos de modulo.
- Documentacion SDK de integracion para autores de modulos.

### Criterio de salida

- El SDK permite modelar y validar un modulo `source-package` sin depender de internals del host.

## Fase 2 - Modo modulos package-build (P0)

### Objetivo

Implementar el flujo de build de modulos con package propio y consumo como artefacto compilado.

### Tareas

1. Agregar comando `modules:build`:
- descubre modulos con `package.json` propio.
- ejecuta validaciones de compatibilidad.
- ejecuta build del modulo y genera artefacto compilado.
2. Definir validaciones de seguridad/compatibilidad previas al build:
- compatibilidad de `peerDependencies` criticas con host (`react`, `react-dom`, `next`, `@skitsaas/sdk`).
- validacion de `sdkRange` vs version SDK activa.
- validacion de `entry` de salida existente tras build.
3. Ajustar `modules:prepare`:
- en modo `source-package`, resolver solo `entry` compilado.
- reportar warning/error si intenta caer a source cuando el modo exige prebuilt.
4. Definir ubicacion de artefacto:
- preferencia: `modules/<moduleId>/dist/*` (o ruta declarada en metadata).
- metadata final reflejada en `external.generated.ts`.

### Entregables

- Pipeline `modules:build` integrado.
- Validaciones de compatibilidad activas.
- Discovery consumiendo artefacto compilado para `source-package`.

### Criterio de salida

- Un modulo `source-package` no se ejecuta desde source; solo desde build valido.

## Fase 3 - Integracion con build del host (P0)

### Objetivo

Enlazar el flujo de modulos al ciclo de build principal.

### Tareas

1. Orden de pipeline en `predev` y `prebuild`:
- `modules:build`
- `modules:prepare`
- `modules:i18n`
- `modules:migrate`
- `modules:sync`
2. Ajustar pipeline de despliegue (`vercel-build` y/o equivalente) con el mismo orden.
3. Definir modo estricto:
- fallar build host si un modulo `source-package` no valida o no compila.

### Entregables

- Flujo determinista en local/CI para modulos package-build.

### Criterio de salida

- El host siempre compila despues de tener modulos package-build validados y listos.

## Fase 4 - Pruebas y adopcion (P0/P1)

### Objetivo

Cubrir regresiones y habilitar adopcion gradual.

### Tareas

1. Tests de scripts:
- discovery por modo.
- validacion de deps/peers.
- fallback prohibido para `source-package`.
2. Test e2e tecnico de un modulo piloto con `package.json` propio.
3. Guia de migracion:
- de `source-host` a `source-package`.
- checklist para publicar modulo compilado.

### Entregables

- Suite minima de pruebas del nuevo pipeline.
- Documentacion de migracion para autores de modulos.

### Criterio de salida

- Flujo reproducible de creacion/build/publicacion de modulo package-build.

## Dependencias

1. Definicion final del contrato SDK (Fase 1).
2. Politica semver de compatibilidad (`sdkRange` y peers).
3. Convencion oficial de salida de build de modulo.

## Riesgos y mitigaciones

1. Riesgo: complejidad alta en autores de modulos.
- Mitigacion: templates y guia corta de `module.json + package.json`.

2. Riesgo: conflictos de dependencias entre host y modulo.
- Mitigacion: validacion previa estricta y reglas de `peerDependencies`.

3. Riesgo: artefactos desactualizados en `dist`.
- Mitigacion: checksum/timestamp y fail-fast cuando el build no corresponde.

4. Riesgo: mezclar accidentalmente `source-package` con source runtime.
- Mitigacion: `modules:prepare` bloquea fallback a source para ese modo.

## Criterios globales de finalizacion

1. SDK actualizado y documentado antes del rollout de modos.
2. Existen 3 modos formalizados y validados (`prebuilt`, `source-host`, `source-package`).
3. `source-package` compila y se consume como artefacto compilado, no source.
4. Build del host falla temprano ante incompatibilidades de modulo package-build.
5. Docs y pruebas cubren el flujo real.

## Orden recomendado de ejecucion

1. Fase 1 (SDK package) - prioridad absoluta.
2. Fase 2 (modules package-build).
3. Fase 3 (integracion con build host).
4. Fase 4 (tests + adopcion).
