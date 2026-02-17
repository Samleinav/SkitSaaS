# Plan: independencia de modulos + evolucion SDK + themes

## Estado

- Documento de planificacion inicial para ejecucion por fases.
- Sin cambios de codigo en este documento.

## Execution update (2026-02-09)

- [x] Fase 0 iniciada y congelada en `plans/module-sdk-fase-0-rfc.md`.
- [x] Se fijo requisito dual mode (`prebuild` + `hot/runtime`) como condicion de arquitectura.
- [x] Se agrego metadata DB de modulo al discovery (`scripts/modules-prepare.ts` + `EXTERNAL_MODULE_META.db`).
- [x] Se agrego scaffolding DB en `modules/mod.example.suite/db/`.
- [x] Se implemento `scripts/modules-migrate.ts` con tracking en `app_module_migrations`.
- [x] Se integro `modules:migrate` en `package.json` y `scripts/vercel-build.mjs`.
- [x] Se agrego test inicial del runner: `tests/modules/module-migrations-script.test.ts`.
- [x] Se actualizo documentacion tecnica inicial (`docs/modules/04-database-migrations.md`, `docs/modules/11-example-module.md`, `docs/sdk/00-overview.md`, `modules/README.md`).
- [x] `mod.example.suite/src/data.ts` ahora consume tablas desde `modules/mod.example.suite/db/schema.ts`.
- [x] `modules/mod.example.suite/README.md` actualizado al flujo de `pnpm modules:migrate`.
- [x] Se retiro la definicion legacy de tablas/relaciones/tipos `modExampleSuite*` desde `lib/db/schema.ts`.
- [x] Se normalizo el historial core: `0019_fearless_the_initiative` queda como placeholder legacy y el snapshot core deja de incluir tablas `mod_example_suite_*`.

## Objetivo

Disenar y ejecutar una migracion de arquitectura para que los modulos sean realmente independientes, con estas metas:

1. Que las tablas y assets de datos de cada modulo se definan dentro del propio modulo (no en `lib/db/schema.ts` central).
2. Que el runtime host pueda descubrir, validar y aplicar esquema/migraciones de modulos de forma segura.
3. Que el SDK provea primitives suficientes para reducir acoplamiento a `@/lib/*` y simplificar desarrollo de modulos.
4. Que themes y modulos converjan en un modelo similar de contrato/registro para mantenimiento mas simple.

## Contexto actual confirmado

- El modulo `mod.example.suite` define tablas en `modules/mod.example.suite/db/schema.ts` y su capa de datos ya no depende de tablas del schema central.
- La guia de modulos ya documenta `db/` por modulo; el historial core ya fue normalizado para que `suite` no vuelva a entrar en el baseline de schema central.
- Existe duplicacion de contratos entre host y SDK:
  - `lib/modules/manifest.ts` y `app/sdk/src/modules/manifest.ts`
  - `lib/actions/controller.ts` y parte de `app/sdk/src/server.ts`
- El modulo suite no usa helpers de `@skitsaas/sdk/server` para actions/config/eventos; depende de imports internos del host.
- Themes ya tienen runtime propio (`app_themes`, `user_theme_preferences`, `lib/theme-runtime.ts`) pero no comparten aun un modelo de contrato/registro tan formal como modulos externos.

## Alcance

- Runtime y pipeline de modulos (`scripts/modules-*`, `lib/modules/*`, `app/api/modules/*`, rutas dispatcher).
- Contrato SDK (`app/sdk/src/*`, `app/sdk/dist/*`) y sus limites publicos.
- Modelo de datos y migraciones para modulos.
- Convergencia de patrones con runtime de themes.
- Documentacion tecnica (`docs/modules/*`, `docs/sdk/*`, `docs/database-model.md`, `AGENTS.md` si aplica).

## Fuera de alcance

- Implementar marketplace remoto de plugins/themes.
- Carga de modulos en caliente en runtime sin build.
- Reescribir toda la capa de DB de core en esta iniciativa.

## Principios de diseno

1. Host delgado, modulo autonomo: el host coordina, el modulo define.
2. Contratos explicitos y versionados en SDK.
3. Compatibilidad progresiva: sin romper modulos existentes de golpe.
4. Validaciones strict en build/sync para prevenir drift.
5. Observabilidad y rollback claros por fase.

## Fase 0 - RFC de arquitectura (P0)

### Objetivo

Congelar decisiones de contrato antes de codificar.

### Tareas

1. Definir contrato de "modulo con datos propios":
- ruta estandar de esquema/migraciones dentro del modulo.
- capacidades permitidas (tablas, indices, FKs a core, seeds opcionales).
2. Definir modo de integracion con Drizzle:
- opcion A: agregador de esquemas generado en build.
- opcion B: migraciones SQL por modulo sin requerir `schema.ts` global.
3. Definir estrategia de versionado:
- `module.json` incluye `schemaVersion` y/o `migrationsVersion`.
- politica de compatibilidad con `sdkRange`.
4. Definir el limite del SDK server:
- auth helpers, action wrappers, config access, event emit, revalidation helpers.
5. Definir convergencia con themes:
- que se comparte como patron (registro/prepare/sync/contratos).
- que permanece separado por dominio.

### Entregables

- RFC tecnico en `docs/` o `plans/` con decisiones cerradas.
- Matriz de impacto (runtime, DB, SDK, docs, tests, operaciones).

### Criterio de salida

- No quedan decisiones estructurales ambiguas para Fase 1.

## Fase 1 - Base de datos por modulo (P0)

### Objetivo

Mover la propiedad de definicion de tablas al modulo sin perder trazabilidad operativa.

### Tareas

1. Estandar de estructura en cada modulo:
- `modules/<moduleId>/db/schema.ts` (si aplica ORM)
- `modules/<moduleId>/db/migrations/*` (SQL/versionado)
- `modules/<moduleId>/db/seed.ts` (opcional, idempotente)
2. Actualizar `modules:prepare` para descubrir metadata DB por modulo.
3. Crear pipeline de migracion de modulos:
- orden estable de ejecucion.
- bloqueo de colisiones de nombre de tabla.
- validacion de dependencias (FKs a core).
4. Ajustar `db:generate/db:migrate` para modo mixto:
- core migrations + module migrations.
5. Migrar `mod.example.suite` como modulo piloto:
- tablas y migraciones salen de `lib/db/schema.ts`.
- lectura/escritura conserva comportamiento.

### Entregables

- Convencion DB por modulo implementada.
- Suite ejemplo migrada como referencia.
- Script de verificacion de drift (registro vs DB).

### Criterio de salida

- Se puede instalar/actualizar modulo con sus propias migraciones sin tocar `lib/db/schema.ts` para ese modulo.

## Fase 2 - Endurecimiento runtime y operaciones (P0/P1)

### Objetivo

Evitar fallos de consistencia al operar modulos independientes.

### Tareas

1. Extender `modules:sync` para estado de datos:
- instalado/enabled y version de esquema aplicada.
2. Agregar chequeos pre-arranque:
- modulo enabled sin migraciones aplicadas => fail fast configurable.
3. Instrumentar observabilidad:
- logs y metricas de install/upgrade/failure por `moduleId`.
4. Definir rollback:
- disable seguro.
- uninstall keep-data.
- uninstall purge (si aplica).
5. Agregar smoke checks en scripts de runtime.

### Entregables

- Flujo de install/upgrade/disable con evidencias operativas.

### Criterio de salida

- Operaciones de ciclo de vida de modulo tienen estados y errores trazables.

## Fase 3 - Evolucion del SDK (P0)

### Objetivo

Reducir acoplamiento de modulos a internals del host y eliminar duplicacion de contratos.

### Tareas

1. Unificar fuente de verdad de tipos de manifest:
- generar tipo host desde SDK o extraer a paquete compartido interno.
2. Consolidar controller server:
- evitar duplicacion entre `lib/actions/controller.ts` y `app/sdk/src/server.ts`.
3. Expandir `@skitsaas/sdk/server` con primitives:
- `requireUser`/`requireAdmin` adapters configurables.
- `revalidatePath(s)` helper desacoplado.
- helper de parseo de request body (json/form).
- helper de route context utilities.
4. Definir superficie estable para config de modulo:
- lectura/escritura namespaced con validacion opcional.
5. Publicar guia de migracion:
- como convertir modulo que hoy usa `@/lib/*` a SDK-first.

### Entregables

- SDK con API minima suficiente para modulos reales.
- Host adaptado para configurar adapters SDK en bootstrap.

### Criterio de salida

- `mod.example.suite` puede ejecutarse con dependencia principal en SDK y minima dependencia interna del host.

## Fase 4 - Convergencia de patterns con themes (P1)

### Objetivo

Unificar experiencia de extensibilidad entre modulos y themes sin mezclar dominios.

### Tareas

1. Definir matriz comparativa Module Runtime vs Theme Runtime:
- discovery
- registry generated
- sync de estado
- validaciones de contrato
- observabilidad
2. Introducir scripts homogeneos donde aplique:
- prepare/sync/verify con convenciones similares.
3. Evaluar SDK para themes:
- tipos publicos de contrato de theme (si se decide abrirlos).
- helpers de config/theme policy si no exponen internals.
4. Alinear docs de themes con modelo final:
- runtime mode, policy, preferencias, integracion con host.

### Entregables

- Roadmap claro de convergencia module/theme.
- Decisiones sobre que va al SDK y que queda host-only.

### Criterio de salida

- Existe un patron comun de extensibilidad documentado y consistente.

## Fase 5 - Documentacion, pruebas y adopcion (P0/P1)

### Objetivo

Cerrar brecha entre arquitectura implementada y documentacion operable por terceros.

### Tareas

1. Actualizar docs de modulos:
- `docs/modules/04-database-migrations.md`
- `docs/modules/11-example-module.md`
- `docs/modules/03-permissions-actions.md`
- `docs/modules/05-config.md`
2. Actualizar docs SDK:
- `docs/sdk/00-overview.md`
- seccion de capacidades server + limites de contrato.
3. Actualizar docs plataforma/DB:
- `docs/database-model.md`
- `docs/platform-capabilities.md`
4. Actualizar `AGENTS.md` en secciones necesarias (arquitectura y convenciones).
5. Definir y ejecutar test plan:
- unit (validaciones, contratos, resolvers)
- integration (migraciones por modulo, sync/runtime)
- regression (rutas, actions, API, themes)

### Entregables

- Documentacion coherente con implementacion final.
- Suite de tests minima para evitar regresiones estructurales.

### Criterio de salida

- Onboarding tecnico de modulos independientes posible sin conocimiento interno del host.

## Dependencias

1. Decision de estrategia DB por modulo (agregador schema vs SQL-only migrations).
2. Acuerdo de superficie publica del SDK (que exponer y que no).
3. Definicion de bootstrap para configurar adapters SDK en host.
4. Alineacion de producto sobre nivel de extensibilidad de themes.

## Riesgos y mitigaciones

1. Riesgo: drift entre version del modulo y version de esquema en DB.
- Mitigacion: metadata de version + checks en startup/sync.
2. Riesgo: romper flujo actual de `drizzle-kit generate`.
- Mitigacion: migracion por etapas con modo legacy soportado temporalmente.
3. Riesgo: SDK demasiado grande o inestable.
- Mitigacion: versionado semantico + capa de adapters + guias de deprecacion.
4. Riesgo: complejidad operativa en upgrades.
- Mitigacion: comandos deterministicos + runbooks + evidencias automatizadas.

## Criterios globales de finalizacion

1. Los modulos pueden definir y migrar sus tablas desde su propio directorio.
2. El host valida y orquesta ciclo de vida de modulo con seguridad operativa.
3. El SDK cubre el flujo comun de desarrollo de modulo sin imports internos del host.
4. Themes y modulos comparten convenciones de extensibilidad donde aporta valor.
5. Documentacion y tests reflejan el estado real del sistema.

## Orden recomendado de ejecucion

1. Fase 0
2. Fase 1
3. Fase 3 (en paralelo parcial con Fase 2)
4. Fase 2
5. Fase 4
6. Fase 5
