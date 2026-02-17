# Plan 1: Theme Modular System

Estado: Activo
Inicio: 2026-02-11
Fase actual: `Cierre tecnico (listo para Plan 2)`
Dependencia previa: ninguna
Dependencia siguiente: `plans/archive/component-template-controller-plan.md`
RFC fase 0: `plans/archive/theme-modular-system-fase-0-rfc.md`

## Objetivo
Crear un sistema modular de themes por area con soporte real para:

- `admin`
- `dashboard`
- `frontend`
- `global`

y con capacidad de usar temas distintos por area o un mismo tema para varias areas.

## Decisiones de arquitectura

### Paquete de theme
Cada theme vive en `themes/<themeId>/` con al menos:

- `theme.json`
- `tokens.css` o `tokens.json`
- `templates/` (opcional en este plan, base para plan 2)
- `assets/` (opcional)

Ejemplo de `theme.json`:

```json
{
  "themeId": "theme.corporate.frontend",
  "version": "0.1.0",
  "areas": ["frontend"],
  "mode": "tokens",
  "entryTokens": "tokens.css"
}
```

### Alcance por area
- Un theme puede declarar una o varias areas en `areas`.
- El runtime selecciona el theme activo por area.
- `global` actua como fallback si un area no tiene theme dedicado.

### Diferencia frontend vs admin/dashboard
- `frontend`: `themes:prepare` genera artefacto consumible por `app/(frontend)` (mapa/registro o CSS generado).
- `admin` y `dashboard`: no exportan rutas ni paginas; se aplican por runtime de tema como tokens + metadatos + templates.

## Fases y checklist

## Fase 0: Contrato y RFC
- [x] Definir `ThemePackManifest` (campos obligatorios/opcionales).
- [x] Definir politica de versionado (`themeRange`/compatibilidad host).
- [x] Definir validaciones de `areas`.
- [x] Definir fallback `area -> global -> core`.
- [x] Escribir RFC en `plans/`.

Entregable:
- Contrato de theme pack aprobado.

## Fase 1: Segmentacion de rutas a `(frontend)`
- [x] Mover shell publico a `app/(frontend)`.
- [x] Mantener `/` y `/pricing` sin cambios de URL.
- [x] Dejar `app/(dashboard)` solo para privado.
- [x] Quitar layout condicional por `pathname` para publico/privado.
- [x] Separar login por area: `/login` (dashboard) y `/admin/login` (admin), con `/sign-in` como alias legacy.
- [x] Mantener `sign-up` en area `dashboard` (`/sign-up`).
- [x] Definir contrato de rutas auth futuras (`/recovery`, `/reset-password`, `/change-password`) con area default `dashboard` y variante `admin` opcional.
- [x] Validar que auth/private guards no se alteren.

Entregable:
- Layouts desacoplados por area.

## Fase 2: Registro de themes y pipeline
- [x] Crear script `themes:prepare` (y dejar `themes:build` opcional para casos que requieran compilacion previa).
- [x] Generar archivo de registro `lib/themes/external.generated.ts`.
- [x] Validar `theme.json` en todos los themes.
- [x] Detectar colisiones de `themeId`.
- [x] Validar compatibilidad de version.

Entregable:
- Registro de themes generado de forma determinista.

## Fase 3: Runtime de seleccion por area
- [x] Extender runtime para resolver `frontend` explicitamente.
- [x] Mantener compatibilidad temporal `public -> frontend` (si existe data legacy).
- [x] Resolver seleccion por area con prioridad:
  - user preference (si aplica),
  - policy default de area,
  - theme activo de area,
  - global,
  - core fallback.
- [x] Registrar fuente de resolucion para observabilidad.

Entregable:
- Seleccion de theme estable y trazable por area.

## Fase 4: Aplicacion de tokens
- [x] Aplicar tokens de theme en SSR (sin flicker).
- [x] Aplicar tokens en hydration client-safe.
- [x] Implementar carga de artefacto frontend en `app/(frontend)`.
- [x] Implementar carga de tokens en admin/dashboard por runtime provider.
- [x] Fallback inmediato si falla un pack.

Entregable:
- Tokens aplicados por area con degradacion segura.

## Fase 5: QA, docs y operaciones
- [x] Tests unitarios del selector por area y fallback.
- [x] Tests de integracion para frontend/admin/dashboard.
- [x] Actualizar docs:
  - `docs/modules/08-themes.md`
  - `docs/platform-capabilities.md`
  - `docs/env-variables.md`
- [x] Actualizar `AGENTS.md` si cambian convenciones/rutas.
- [x] Definir politica de bootstrap admin por entorno (seed owner para local, credenciales rotadas/no default en ambientes compartidos).
- [x] Definir runbook de rollback de themes.

Entregable:
- Sistema de themes modular operativo y documentado.

## Escenarios que debe cubrir
- [x] Theme A solo `admin`.
- [x] Theme B solo `dashboard`.
- [x] Theme C para `admin` + `dashboard`.
- [x] Theme D solo `frontend`.
- [x] Theme E `global` como fallback comun.

## Riesgos y mitigaciones
- Riesgo: migracion `public` a `frontend` rompe datos existentes.
  - Mitigacion: capa de compatibilidad temporal + migracion gradual.
- Riesgo: costo de carga de CSS/tokens en frontend.
  - Mitigacion: artefacto generado y cacheado.
- Riesgo: estados invalidos de configuracion por area.
  - Mitigacion: validacion estricta en `themes:prepare`.

## Criterio de cierre
- Theme activo configurable por area independiente.
- Frontend consumiendo pack modular desde `themes/*`.
- Admin/dashboard consumiendo runtime theme sin rutas extra.
- Documentacion y pruebas completas.
