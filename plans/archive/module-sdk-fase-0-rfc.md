# RFC Fase 0: modulos independientes + SDK-first (dual mode: prebuild y hot/runtime)

## Estado

- Fase 0 iniciada.
- Este documento congela decisiones base para arrancar Fase 1.
- No modifica comportamiento de runtime por si solo.

## Objetivo de la Fase 0

Definir el contrato tecnico para evolucionar a modulos realmente independientes, manteniendo **dos formas de carga** como soporte oficial:

1. `prebuild` en el mismo proyecto (source module o prebuilt module detectado por `modules:prepare`).
2. `hot/runtime` para activacion/desactivacion operativa sin rebuild (cuando el modulo ya existe en registry/runtime).

## Requisito clave (congelado)

No se aceptan decisiones que optimicen solo para hot/runtime ni solo para prebuild.
Toda propuesta de arquitectura en fases siguientes debe cubrir ambos caminos.

## Baseline actual (confirmado)

1. Descubrimiento de modulos por `scripts/modules-prepare.ts`:
- detecta `entry` (`dist/*`) y `sourceEntry` (`src/manifest.*`) desde `module.json`.
- genera `lib/modules/external.generated.ts`.
2. Integracion de runtime por `app_modules` + dispatcher:
- rutas por dispatcher y aliases.
- enable/disable por DB (sin rebuild).
3. Limite actual:
- tablas de modulos de ejemplo siguen en `lib/db/schema.ts` (no dentro del modulo).
- hay duplicacion de contratos host/SDK.

## Decisiones de arquitectura (Fase 0)

## D0.1 - Soporte dual de carga

Se mantiene modelo dual como contrato de plataforma:

1. `prebuild`:
- empaquetado source o dist dentro de `modules/`.
- inclusion via `modules:prepare` antes de `dev/build`.
2. `hot/runtime`:
- control operacional de estado (`enabled/disabled`) via `app_modules` y `modules:sync`.
- sin recompilar codigo de host para cambios de estado.

Nota:
- La incorporacion de **nuevo codigo** de modulo sigue pasando por prepare/build cuando corresponda.
- El control operacional en caliente aplica al estado del modulo ya registrado.

## D0.2 - Propiedad de datos por modulo

Las tablas y migraciones de cada modulo pasan a ser assets del modulo:

- `modules/<moduleId>/db/schema.ts` (opcional, si se usa ORM)
- `modules/<moduleId>/db/migrations/*` (obligatorio para cambios DB)
- `modules/<moduleId>/db/seed.ts` (opcional, idempotente)

El host conserva solo tablas core y tablas de runtime/plataforma.

## D0.3 - Estrategia de migraciones

Se adopta enfoque hibrido:

1. Core:
- mantiene su pipeline actual (`drizzle-kit`) para tablas core.
2. Modulos:
- migraciones SQL versionadas por modulo, ejecutadas por pipeline de modulos.

Razon:
- evita acoplar todo a un unico `schema.ts`.
- reduce colisiones y facilita empaquetado externo.

## D0.4 - Metadata minima en `module.json`

Se define metadata minima adicional para ciclo de vida de datos:

```json
{
  "moduleId": "mod.example.suite",
  "version": "0.1.0",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^0.1.0",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Campos finales pueden ajustarse en Fase 1, pero la necesidad de versionado DB queda congelada.

## D0.5 - SDK-first para modulos

El SDK debe cubrir el camino comun de desarrollo de modulos para evitar imports internos del host.

Minimo esperado de `@skitsaas/sdk/server`:

1. wrappers de actions (controller)
2. adapters de auth (`requireUser`/`requireAdmin`) configurados por host
3. config namespaced de modulo
4. emision de eventos
5. helpers de revalidacion/route context

## D0.6 - Convergencia con themes (por patron, no por mezcla de dominio)

Se unifica patron operativo donde aporte valor:

1. discovery + prepare
2. sync de estado
3. validaciones strict
4. observabilidad de lifecycle

Se mantiene separacion de dominio entre runtime de modulos y runtime de themes.

## Contrato operativo inicial por fase siguiente

## Para Fase 1 (DB por modulo)

1. `modules:prepare` debe descubrir metadata DB de modulo.
2. debe existir comando de migracion de modulos (o extension de comando existente).
3. si modulo `enabled` tiene migraciones pendientes, politica configurable:
- fail-fast en entornos strict
- warning controlado en entornos de desarrollo

## Para Fase 2 (runtime hardening)

1. registrar version de esquema aplicada por modulo.
2. trazabilidad de install/upgrade/failure.

## Para Fase 3 (SDK)

1. eliminar duplicacion host/SDK en manifest/controller.
2. documentar guia de migracion para modulos existentes.

## Matriz de compatibilidad requerida

| Escenario | Prebuild | Hot/runtime |
| --- | --- | --- |
| Source module en `modules/` | Soportado | Enable/disable sin rebuild |
| Prebuilt module (`dist/manifest.js`) | Soportado | Enable/disable sin rebuild |
| Cambio de estado de modulo existente | N/A | Soportado |
| Nuevo codigo de modulo no preparado aun | Requiere prepare/build | No aplica hasta preparar |

## Riesgos identificados en Fase 0

1. Confusion entre "hot toggle" y "hot code load".
2. Drift entre `module version` y `db schema version`.
3. Fragmentacion de APIs entre host y SDK.

## Mitigaciones definidas

1. Terminologia explicita en docs:
- "runtime toggle" para enable/disable.
- "prebuild integration" para incorporacion de codigo.
2. metadata DB obligatoria por modulo con validaciones en sync/startup.
3. una unica fuente de verdad para contratos compartidos.

## Checklist de salida Fase 0

- [x] requisito dual mode congelado (`prebuild` + `hot/runtime`).
- [x] decision de propiedad DB por modulo.
- [x] direccion de estrategia de migraciones definida (hibrida).
- [x] alcance minimo SDK-first definido.
- [x] convergencia module/theme acotada por patron.
- [ ] validacion final contra implementacion de Fase 1 (pendiente al iniciar Fase 1).

## Siguiente paso inmediato (arranque Fase 1)

1. Disenar estructura objetivo de `db/` dentro de modulo piloto (`mod.example.suite`).
2. Disenar cambios en `modules:prepare` para descubrir metadata DB.
3. Proponer comando de migracion de modulos y orden de ejecucion.
