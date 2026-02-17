# Plan Maestro: Theme Modular + Template Controller

Estado: Activo
Objetivo: coordinar 2 planes separados y secuenciales.

## Planes relacionados
1. `plans/archive/theme-modular-system-plan.md`
2. `plans/archive/component-template-controller-plan.md`

## Secuencia obligatoria
1. Ejecutar primero `Theme Modular System`.
2. Ejecutar despues `Component Template Controller`.

Motivo:
- El CTC depende de que exista seleccion de theme por area y registro de packs.

## Checklist maestro
- [x] Validar y aprobar arquitectura de `Theme Modular System`.
- [x] Completar fases 0-5 de `Theme Modular System`.
- [x] Validar compatibilidad de areas (`admin`, `dashboard`, `frontend`, `global`).
- [x] Validar pipeline de themes (`themes:prepare`; `themes:build` opcional segun pack).
- [x] Cerrar contrato auth themed (`/login`, `/admin/login`, `/sign-up`, `/recovery`, `/reset-password`, `/change-password`).
- [x] Definir politica de bootstrap admin por entorno (seed/dev vs hardening prod).
- [x] Aprobar contrato inicial de templates (`componentId`, precedence, lock).
- [x] Completar fases 0-5 de `Component Template Controller`.
- [x] Integrar soporte final para modulos `source-package`.
- [x] Actualizar documentacion tecnica y AGENTS.md.

## Reglas funcionales cerradas
- Un theme puede aplicar a `admin`, `dashboard`, `frontend`, o combinaciones.
- Puede existir un theme distinto por area.
- Themes frontend viven en `themes/<themeId>/theme.json` con `areas` que incluyan `frontend`.
- En `themes:prepare`, frontend genera artefacto consumible por `app/(frontend)` (registro/mapa de assets o CSS generado).
- Themes de `admin` y `dashboard` no generan rutas; se cargan por runtime como tokens/templates/componentes.
- Un modulo puede usar templates del theme activo.
- Un modulo tambien puede traer su propio template pack.

## Entregables finales
- `Theme Modular System` en produccion con areas separadas y fallback.
- `Component Template Controller` resolviendo templates con precedencia documentada.
- Compatibilidad para host + modulos (`source-host`, `source-package`).
