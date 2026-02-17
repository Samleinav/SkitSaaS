---
name: saas-planning
description: Crea y mantiene planes de implementacion para este repo usando sprints, checklist accionable, comandos de validacion y estrategia de pruebas. Usa esta skill cuando el usuario pida roadmap, plan por fases, hardening plan, migration plan, o ejecucion ordenada de tareas. Enfatiza arquitectura module-first, compatibilidad con y sin modulo, uso de SDK en lugar de dependencias directas del core, y reglas de template system (CTC) para admin/dashboard/frontend.
---

# SaaS Planning Skill

Define planes ejecutables en `plans/*.md` para este proyecto, con prioridad clara, archivos objetivo, pruebas y criterios de cierre.

## Resultado esperado

Entregar un archivo de plan en `plans/<nombre>.md` con:

1. Objetivo y alcance.
2. Fases o sprints con prioridades.
3. Checklist por tarea.
4. Comandos de validacion por tarea.
5. Criterios de cierre y riesgos.

## Reglas de proceso

1. Leer contexto del repo antes de planificar:
- `AGENTS.md`
- planes existentes relacionados en `plans/*.md`
- docs tecnicos relevantes (`docs/env-variables.md`, `docs/database-model.md`, `docs/modules/*`)
- usar `docs/features.md` solo para capacidades de suscripciones/cuotas, no para documentar modulos, themes o features generales de app

2. Planificar por sprints cortos y verificables:
- usar bloques de prioridad (`P0`, `P1`, `P2`)
- cada sprint debe ser entregable por si solo
- cada tarea debe tener una validacion concreta

3. No dejar checklist ambiguos:
- evitar items como "mejorar seguridad"
- usar items verificables ("agregar `state` one-time y test de replay")

4. Incluir archivos objetivo por tarea:
- listar rutas exactas que se tocaran
- separar core, modulo, docs y tests

5. Incluir comandos de prueba por tarea:
- comando minimo rapido (targeted)
- comando de tipo y lint
- comando global opcional

6. Mantener ownership documental por modulo:
- cada modulo debe tener `modules/<moduleId>/README.md`
- el README del modulo debe documentar TODO lo necesario del modulo: objetivo, alcance, configuracion, env vars, i18n, db/migraciones, endpoints/rutas, permisos, templates UI, pruebas y troubleshooting
- evitar expandir docs del core para detalles internos de modulos, salvo cambios de contrato/plataforma compartida

## Estructura recomendada del plan

Usar esta plantilla base:

```md
# Plan: <titulo>

Status: In progress
Start date: <YYYY-MM-DD>
Current phase: <fase actual>
Last review: <YYYY-MM-DD>

## Objective
...

## Scope
...

## Out of Scope
...

## Priority Order
1. P0 - ...
2. P1 - ...

## Task N (Px): <titulo>

### Risk
...

### Target files
- `path/a.ts`
- `path/b.ts`

### Checklist
- [ ] ...
- [ ] ...

### Validation checklist
- [ ] ...
- [ ] ...

### Commands
- `pnpm exec tsc --noEmit`
- `npx tsx --test tests/<dominio>/*.test.ts`
- `pnpm exec eslint <rutas tocadas>`
```

## Politica de pruebas

Aplicar siempre:

1. Preferir actualizar test existente del dominio.
2. Crear test nuevo solo si no existe cobertura razonable.
3. Colocar tests en `tests/` (no dentro de `app/`).
4. Incluir casos positivos y negativos.
5. Incluir test de regresion para el bug/riesgo principal.

Comandos recomendados:

- Tipos: `pnpm exec tsc --noEmit`
- Tests foco: `npx tsx --test tests/<archivo>.test.ts`
- Lint foco: `pnpm exec eslint <rutas>`
- Suite completa: `pnpm check` (solo si no hay fallos ajenos ya conocidos)

Si hay fallos ajenos, documentar:

- que fallo es externo al alcance
- que validaciones parciales si pasaron
- que parte queda pendiente por ese bloqueo

## Guardrails module-first

Planificar cada feature con aislamiento de modulo:

1. El modulo debe contener su logica principal:
- `module.json`
- `README.md` (documentacion operativa y tecnica del modulo)
- `src/manifest.ts`
- `src/config.ts`
- `src/api-handler.ts` y/o `src/pages.ts`
- `db/schema.ts` y `db/migrations/*` si aplica
- tests del modulo

2. i18n obligatorio para modulo:
- incluir catalogo i18n por modulo (minimo `en.json`)
- ubicacion esperada (source-host): `modules/<moduleId>/i18n/<area>/<locale>.json`
- ubicacion esperada (source-package compilado): `modules/<moduleId>/dist/i18n/<area>/<locale>.json`
- no usar raw strings hardcodeados en UI, mensajes de error o textos de acciones
- las nuevas vistas admin/dashboard/frontend del modulo deben leer mensajes desde i18n

3. El core debe funcionar con y sin el modulo:
- no romper rutas core si modulo no existe o no esta enabled
- usar rutas/dispatchers del runtime de modulos en vez de imports directos del modulo
- fail-closed o fallback claro cuando el modulo no esta disponible

4. Preferir SDK sobre imports del core:
- usar `@skitsaas/sdk/server` y `@skitsaas/sdk/db` dentro de modulos
- si falta capacidad SDK, planear extension minima del SDK + bootstrap
- evitar acoplar modulo a utilidades internas del host

5. Incluir validacion explicita de "modulo ausente":
- respuesta esperada: `404`, `503` o fallback definido
- confirmar que el resto del sistema sigue operativo

## Guardrails CTC / templates

Cuando una tarea agrega UI nueva, planear CTC desde el inicio:

1. Definir templates del modulo y los componentes del modulo que los consumen en el render final.
   No asumir catalogo cerrado de componentes; el modulo puede crear sus propios componentes UI.
2. Registrar entradas del modulo en `ModuleManifest.templatePack`:
- `defaults` para base del modulo
- `overrides` solo cuando se necesita prioridad fuerte
   (si el contrato CTC activo requiere ids estructurados, seguir el contrato vigente del runtime).

3. En admin/dashboard:
- usar wrappers del sistema (`ThemeTemplate` o `ThemeCodeTemplate`) en render de paginas/secciones nuevas

4. En frontend:
- usar templates de componentes solo cuando aporte extensibilidad real
- permitir uso flexible por el dev en componentes frontend donde aplique

5. Compatibilidad theme vs modulo:
- preferencia de plan por defecto: dejar que el theme gobierne la UI
- aunque exista `module_override`, evitarlo como opcion por defecto y reservarlo para decisiones explicitas del dev
- `THEME_TEMPLATE_PRIORITY` debe mantenerse alineado con estrategia theme-first cuando no haya requisito fuerte contrario
- `lockTemplate=true` en componentes lockables bloquea override de theme salvo `adminForceOverride`
- tener presente que el theme puede centralizar overrides por modulo (por ejemplo, organizacion por `moduleId`) para mantener consistencia visual

6. Documentar nuevos template IDs, configuraciones, env, y detalles del modulo:
- documentarlos en `modules/<moduleId>/README.md`
- actualizar docs del core solo si cambia un contrato global del runtime/CTC

## DB y migraciones en planes

Si un modulo necesita persistencia:

1. Declarar `db` en `module.json` (`schemaVersion`, `migrationsDir`).
2. Agregar migracion incremental.
3. Incluir pruebas de compatibilidad y fallback si la tabla no existe aun.
4. Agregar comandos de pipeline en el plan:
- `pnpm modules:build`
- `pnpm modules:prepare`
- `pnpm modules:i18n`
- `pnpm modules:migrate`
- `pnpm modules:sync`

## Cierre del sprint

Antes de marcar una tarea como completa:

1. Checklist de implementacion en `x`.
2. Checklist de validacion en `x`.
3. Archivos docs/plan actualizados.
4. Riesgos abiertos listados de forma explicita.

Si no se puede cerrar, dejar:

- estado exacto
- bloqueo concreto
- siguiente accion sugerida
