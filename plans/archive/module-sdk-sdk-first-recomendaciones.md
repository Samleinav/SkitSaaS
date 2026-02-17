# Plan de recomendaciones: SDK-first para modulos y host en el mismo nivel

## Estado

- Documento de recomendaciones tecnicas.
- Sin cambios de codigo en runtime en esta entrega.

## Objetivo

Definir una estrategia para que:

1. El host (`app/lib`) y los modulos consuman el mismo contrato publico del SDK.
2. Los modulos dejen de depender de imports internos `@/...` del proyecto raiz.
3. Se mantenga separacion clara entre APIs publicas de extension y logica privada del host.

## Decision recomendada (resumen)

Adoptar un modelo **SDK-first con adapters**, no un modelo de "mover todo `lib` al SDK".

- `@skitsaas/sdk`: contrato publico estable (tipos y primitives de extension).
- `@skitsaas/sdk/server`: capa de acceso a capacidades del host via adapters configurables.
- `lib/*` del host: logica interna privada (pagos, modelos core, orquestacion interna), no expuesta directamente a modulos.

## Diagnostico actual (confirmado)

## 1) Duplicacion de contratos host/SDK

- Manifest duplicado:
  - `app/sdk/src/modules/manifest.ts`
  - `lib/modules/manifest.ts`
- Controller de actions duplicado:
  - `app/sdk/src/server.ts`
  - `lib/actions/controller.ts`
- Tipos de eventos e i18n tambien estan duplicados en host y SDK.

Impacto:

- Riesgo de drift.
- Mayor costo de mantenimiento por cambios en dos lugares.

## 2) Dependencia fuerte de modulos al host

`mod.example.suite` usa imports internos del proyecto raiz:

- Auth/usuario del host.
- DB client/schema del host.
- UI components del host.
- `next/cache` y `next/navigation` directamente en acciones del modulo.

Impacto:

- El modulo no es portable como paquete independiente real.
- Vender/precompilar modulo implica acoplamiento oculto al host actual.

## 3) Superficie SDK server incompleta en runtime real

Existe `configureEventEmitter` y `configureModuleConfig` en SDK, pero no estan siendo configurados/consumidos por modulos del repo.

Impacto:

- El SDK existe, pero no es la ruta principal de desarrollo.
- Los modulos siguen resolviendo necesidades via `@/...`.

## 4) Documentacion con inconsistencias de API

- Se documenta `upsertAppConfigValue`, pero en host existe `upsertAppConfigEntry`.
- Se menciona `sdkRange` en docs, pero `modules:prepare` no valida compatibilidad.

Impacto:

- Riesgo de onboarding incorrecto y fallas de integracion tardias.

## Arquitectura objetivo recomendada

## Capas

1. **SDK publico (estable)**
- Tipos de manifest, routes, events, i18n.
- Contratos de action/controller.
- Contratos de adapters (auth, config, revalidate, observabilidad).

2. **SDK server bridge (estable)**
- Funciones que usan adapters configurados por host:
  - session/auth
  - module config
  - event emit
  - cache revalidation
  - request/body parsing helpers

3. **Host privado (no SDK)**
- Dominio interno: pagos, subscriptions, tablas core, workflows internos.
- Solo expone capacidades necesarias al SDK via adapters.

4. **Modulo independiente**
- Dependencia principal: `@skitsaas/sdk` y `@skitsaas/sdk/server`.
- Sin imports directos a `@/lib/*` ni `@/app/*`.

## Matriz de recomendaciones (que va y que no va al SDK)

## Migrar al SDK (publico)

- `ModuleManifest`, `ModuleRouteContext`, alias/nav/widget contracts.
- Tipos de eventos (`EventPayload`, `ModuleEventContext`, hooks catalog).
- Tipos i18n de modulos.
- `createServerActionController` y parsers de `FormData`.
- Contratos de adapters:
  - `configureAuthAdapter`
  - `configureRevalidationAdapter`
  - `configureConfigAdapter`
  - `configureEventAdapter`

## Mantener host-only (privado)

- `lib/payments/*`
- `lib/db/schema.ts` core y entidades no-extensibles
- queries internas de negocio core
- feature flags internos de operaciones

## Compartir como kernel interno (opcional, no publico)

Si se requiere evitar duplicaciones entre host y SDK sin exponer de mas, crear un paquete interno (ejemplo: `@skitsaas/kernel-ext`) consumido por:

- `app/sdk/*`
- `lib/modules/*`
- `lib/actions/*`

Este paquete no se publica para terceros; solo evita drift interno.

## Roadmap recomendado (orden de ejecucion)

## Fase 1 - Fuente unica de verdad de contratos (P0)

1. Eliminar duplicacion de `manifest`, `events`, `i18n`, `controller`.
2. Elegir fuente unica:
- opcion A: SDK como source-of-truth, host importa desde SDK.
- opcion B: kernel interno source-of-truth, SDK reexporta.
3. Ajustar tests de contrato/runtime.

Salida:

- No hay definiciones duplicadas de contrato en host y SDK.

## Fase 2 - SDK server adapters completos (P0)

1. Extender `@skitsaas/sdk/server` con:
- auth/session (`requireUser`, `requireAdmin`, `getUser`)
- revalidation (`revalidatePath`, lote de paths)
- request helpers (`readJson`, `readForm`, `readQuery`)
2. Configurar adapters en bootstrap del host (server-only).
3. Agregar smoke tests de "adapter no configurado" y "adapter configurado".

Salida:

- Un modulo puede resolver auth/config/revalidate sin imports `@/...`.

## Fase 3 - Migrar modulo piloto a SDK-first (P0)

1. Migrar `mod.example.suite` para remover imports `@/...`.
2. Encapsular acceso DB/config/auth mediante SDK server adapters.
3. Mantener compatibilidad funcional de rutas admin/dashboard/api/widgets.

Salida:

- `mod.example.suite` funciona sin depender de rutas internas del host.

## Fase 4 - Endurecimiento de distribucion marketplace (P1)

1. Validar `sdkRange` durante `modules:prepare`.
2. Definir politica de compatibilidad semver y errores bloqueantes.
3. Documentar diferencias entre modulo `source` y `prebuilt`.
4. Definir matriz de soporte de peers externos (`react`, `next`, etc.).

Salida:

- Integracion de modulos externos con chequeos de compatibilidad previos al build.

## Fase 5 - Documentacion y adopcion interna (P0)

1. Corregir docs de config/actions/routing para API real.
2. Publicar guia "como migrar modulo host-coupled a SDK-first".
3. Actualizar `docs/modules/*`, `docs/sdk/*`, `AGENTS.md` si cambian convenciones.

Salida:

- Onboarding de modulos independientes sin depender de conocimiento interno del host.

## Riesgos y mitigaciones

1. Riesgo: SDK crece demasiado.
- Mitigacion: separar API publica minima vs extensiones avanzadas.

2. Riesgo: romper modulos existentes.
- Mitigacion: capa de compatibilidad temporal y deprecaciones graduales.

3. Riesgo: filtracion de internals del host.
- Mitigacion: exponer solo interfaces de capacidad (adapters), no objetos internos.

4. Riesgo: drift de docs vs implementacion.
- Mitigacion: checklist obligatoria de docs en PR de cambios SDK/runtime.

## Criterios de finalizacion

1. Modulos del repo no usan imports `@/lib/*` ni `@/app/*`.
2. Host y modulos usan el mismo contrato SDK para manifest/actions/events/i18n.
3. `modules:prepare` valida compatibilidad `sdkRange`.
4. Tests de runtime y modulo piloto pasan en modo source y prebuilt.
5. Docs reflejan APIs y convenciones reales.

## Acciones inmediatas sugeridas

1. Ejecutar Fase 1 con alcance reducido (manifest + controller primero).
2. Luego Fase 2 (adapters de auth/revalidate/config) antes de migrar mas modulos.
3. Usar `mod.example.suite` como prueba de independencia total y baseline para marketplace.
