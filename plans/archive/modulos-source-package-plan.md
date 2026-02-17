# Plan: Modulos `source-package` (build propio + consumo prebuilt)

## Estado

- Plan completo.
- Depende de la base del SDK definida en `plans/archive/sdk-evolucion-plan.md`.
- Avance inicial implementado (fase 1/2 completas + fase 3/4 operativas).
- Referencia completa disponible: `modules/mod.example.package` (`source-package` con `package.json` y build propio).
- Helper SDK agregado para simplificar build de modulos package: `@skitsaas/sdk/build` (`buildSourcePackageModule`) con soporte `.ts/.tsx`.
- Helpers SDK agregados para testing independiente de modulos package: `@skitsaas/sdk/testing` + `testCommand` opcional en `module.json` ejecutado por `modules:build`.

## Objetivo

Habilitar modulos con `package.json` propio que:

1. se validan contra compatibilidad del host/SDK,
2. se compilan antes del build principal,
3. se consumen en runtime como modulo compilado (`prebuilt`),
4. no requieren cargar source del modulo en el host.

## Alcance

- `scripts/modules-build.ts` (nuevo)
- `scripts/modules-prepare.ts` (ajustes de resolucion por modo)
- `package.json` (orden pipeline)
- `module.json` (metadata de modo y compatibilidad)
- tests de scripts en `tests/modules/*`
- docs de modulos y SDK

## Fuera de alcance

- Instalacion remota de modulos desde marketplace.
- Ejecucion de nuevo codigo en caliente sin build.
- Refactor completo de todos los modulos existentes en una sola iteracion.

## Modos oficiales de modulo

1. `prebuilt`
- Modulo ya compilado (`entry` en `dist/*`).

2. `source-host`
- Source sin package propio; compila con el host.

3. `source-package`
- Modulo con package propio; compila primero y luego se consume como prebuilt.

## Fase 1 - Contrato y metadata de modo (P0)

### Objetivo

Definir metadata minima para operar `source-package` sin ambiguedad.

### Tareas

- Definir `moduleMode` (`prebuilt`, `source-host`, `source-package`) en `module.json`.
- Definir campos obligatorios para `source-package`:
  - `entry`
  - `sdkRange`
  - build command esperado
- Definir regla de fallback:
  - para `source-package` no se permite fallback a source en runtime.

### Checklist

- [x] Metadata de modo definida y documentada.
- [x] Reglas de fallback definidas.
- [x] Errores de configuracion claramente tipados.

### Criterio de salida

`module.json` describe de forma determinista como se consume cada modulo.

## Fase 2 - Validacion de compatibilidad (P0)

### Objetivo

Evitar builds inconsistentes antes de compilar modulos.

### Tareas

- Validar `sdkRange` del modulo vs SDK del host.
- Validar peers criticos (`react`, `react-dom`, `next`, `@skitsaas/sdk`).
- Validar presencia de `entry` compilado al finalizar build.
- Definir modo estricto por default en CI.

### Checklist

- [x] Validacion de `sdkRange` implementada.
- [x] Validacion de peers criticos implementada.
- [x] Build falla si `entry` no existe.
- [x] Mensajes de error accionables para autor de modulo.

### Criterio de salida

Ningun modulo `source-package` pasa a `prepare` si no es compatible.

## Fase 3 - Pipeline `modules:build` (P0)

### Objetivo

Construir modulos con package propio antes del host.

### Tareas

- Crear `modules:build` para descubrir y compilar modulos `source-package`.
- Ejecutar install/build del modulo en forma controlada.
- Registrar evidencia de build (modulo, version, timestamp, entry).
- Soportar filtro por modulo (`--module=<id>`) y dry-run.

### Checklist

- [x] Script `modules:build` disponible.
- [x] Compila todos los `source-package` detectados.
- [x] Soporta filtro por modulo.
- [x] Soporta dry-run.

### Criterio de salida

El artefacto compilado existe y esta listo antes de `modules:prepare`.

## Fase 4 - Integracion con `modules:prepare` y build host (P0)

### Objetivo

Consumir artefacto compilado y bloquear source cuando corresponde.

### Tareas

- Ajustar `modules:prepare` para modo-aware:
  - `source-package` => solo `entry` compilado.
  - `source-host` => puede usar source.
- Integrar pipeline en `predev/prebuild`:
  - `modules:build -> modules:prepare -> modules:i18n -> modules:migrate -> modules:sync`.
- Alinear pipeline de despliegue.

### Checklist

- [x] `modules:prepare` respeta modo `source-package`.
- [x] Sin fallback a source en `source-package`.
- [x] `predev/prebuild` usan orden final.
- [x] Build host falla temprano ante modulo invalido.

### Criterio de salida

El host compila siempre con modulos package-build ya validados y compilados.

## Fase 5 - Pruebas, docs y adopcion (P0/P1)

### Objetivo

Cerrar adopcion con seguridad operativa.

### Tareas

- Agregar tests de discovery por modo y reglas de fallback.
- Agregar tests de validacion de compatibilidad.
- Actualizar `docs/modules/*` y `docs/sdk/*` con flujo final.
- Crear plantilla de modulo `source-package` (estructura minima).

### Checklist

- [x] Tests de scripts actualizados.
- [x] Docs del flujo `source-package` publicadas.
- [x] Template/checklist de autor de modulo disponible.

### Criterio de salida

Crear/publicar/usar un modulo `source-package` es reproducible en local y CI.

## Dependencias y bloqueadores

- SDK estabilizado (contratos/adapters/versionado).
- Definicion oficial de politica de peers y semver.
- Convencion final de ruta de artefacto (`dist/manifest.*`).

## Criterios globales de finalizacion

- [x] Modo `source-package` implementado de punta a punta.
- [x] Validaciones de compatibilidad activas antes del build host.
- [x] Runtime usa artefacto compilado y no source para ese modo.
- [x] Pipeline local/CI deterministico y documentado.
