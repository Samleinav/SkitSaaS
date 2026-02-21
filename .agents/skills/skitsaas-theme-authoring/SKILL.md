---
name: skitsaas-theme-authoring
description: Crea y evoluciona theme packs para SkitSaaS (admin, dashboard y frontend) compatibles con el runtime CTC y el flujo build-time de themes. Usa este skill cuando se pida crear un theme nuevo, migrar templates externos (Tailwind/shadcn/Bootstrap), completar templates faltantes inventando componentes cuando no existan, organizar templates por modulos en /templates/mods/module-id, o validar que themes:prepare y tests de theme pasen.
---

# SkitSaaS Theme Authoring

## Objetivo

Crear y mantener themes para SkitSaaS con foco en:

- compatibilidad con `pnpm themes:prepare`
- cumplimiento del contrato CTC (`ThemeTemplate`/`ThemeCodeTemplate`)
- cobertura completa de `admin/dashboard` aunque haya que inventar componentes
- extensibilidad por modulos

## Referencias obligatorias antes de editar

Leer estos archivos primero:

- `AGENTS.md`
- `docs/modules/08-themes.md`
- `docs/modules/16-theme-authoring-guide.md`
- `docs/modules/14-template-controller.md`
- `lib/themes/manifest.ts`
- `lib/themes/required-code-templates.ts`
- `scripts/themes-prepare.ts`
- theme base actual: `themes/first-backoffice/*` y/o `themes/first-frontend/*`

## Flujo recomendado

### 1. Definir alcance del theme

Decidir area objetivo:

- `frontend`
- `admin`
- `dashboard`
- combinado (`admin` + `dashboard`)

Para backoffice (`admin/dashboard`), asumir desde el inicio que faltaran componentes y hay que crearlos.

Definir seleccion build-time:

- `THEME_ADMIN` para area `admin`
- `THEME_DASHBOARD` para area `dashboard`
- `THEME_FRONTEND` para area `frontend`

### 2. Crear estructura minima del pack

Ruta base:

- `themes/<theme-folder>/`

Archivos minimos:

- `package.json`
- `theme.json`
- `tokens.css`
- `config.ts`
- `templates/` (para code templates)
- `templates.json` (si aplica)
- `routes.ts` (solo para frontend route-driven)

Reglas:

- usar `defineThemeConfig` desde `@skitsaas/sdk`
- no importar host internals con `@/lib/*` dentro de `themes/*`
- evitar colisiones de ids/template names
- `theme.json` debe cumplir contrato: `themeId` dot.case (`theme.x.y`), `version` semver, `areas` validas (`admin|dashboard|frontend|global`), `mode="tokens"`, `entryTokens`, `themeRange`
- si el theme aplica a `frontend`, incluir `routes.ts[x]` para que `themes:prepare` no falle

### 3. Politica de componentes faltantes

Si no existe un componente requerido, crearlo.

Prioridad de stack visual:

1. Tailwind CSS + shadcn-style primitives (default)
2. mezclar utilidades del host y markup del template externo
3. Bootstrap solo cuando aporte valor real (layout/forms/utilities)

Si se usa Bootstrap:

- encapsular en `global.css` del theme bajo un namespace de clase raiz
- no contaminar estilos globales del host
- mantener tokens CSS del host (`--background`, `--foreground`, etc.) como fuente de color

### 4. Contrato de templates backoffice

Para `admin/dashboard`, cumplir IDs obligatorios de:

- `lib/themes/required-code-templates.ts`

Regla operativa:

- si un template no existe en el source externo, inventarlo con fallback visual coherente
- priorizar primero shell/layout/nav, luego paginas core, luego slots de tabla/ui
- considerar orden de resolucion CTC (`THEME_TEMPLATE_PRIORITY`): por defecto `theme -> module`; no depender de module templates para cubrir required IDs del host
- no romper el baseline `theme.first.backoffice`; `themes:prepare` lo exige con cobertura completa admin/dashboard

### 5. Regla para templates de modulos

Si hay templates por modulo, crear subdirectorio:

- `templates/mods/<moduleId>/`

Ejemplo:

- `templates/mods/mod.commerce.products/`

Importante:

- el registry de themes usa el nombre de archivo como `componentId` (sin carpeta)
- evitar colisiones entre modulos usando nombres de archivo unicos con prefijo del modulo
- ejemplo recomendado de nombre: `mod.commerce.products.section.admin.products.card.tsx`

### 6. Integracion visual con host

Mantener compatibilidad con las props `data` enviadas por host:

- no eliminar claves esperadas del contrato (`title`, `description`, `slot`, etc.)
- usar defaults robustos cuando falten datos
- conservar `children`/slots para contenido runtime y modulos
- si el theme define i18n, usar `i18n/<locale>.json` o `i18n/<area>/<locale>.json` con JSON valido

### 7. Validacion obligatoria

Ejecutar siempre:

```bash
pnpm themes:prepare
npx tsx --test tests/theme/theme-pack-manifest.test.ts
npx tsx --test tests/theme/themes-prepare.test.ts
npx tsx --test tests/theme/theme-route-smoke.test.ts
npx tsx --test tests/theme/theme-slot-data-contract.test.ts
npx tsx --test tests/theme/theme-pack-import-boundaries.test.ts
```

Para cambios grandes de assets/runtime:

```bash
npx tsx --test tests/theme/theme-assets-runtime.test.ts
npx tsx --test tests/theme/theme-code-template.test.tsx
npx tsx --test tests/theme/theme-runtime.test.ts
```

## Criterios de cierre

Marcar completado solo si:

- `themes:prepare` pasa sin errores
- no hay imports prohibidos (`@/*`) dentro del theme pack
- IDs requeridos de area estan cubiertos
- estilos no rompen otras areas
- docs de themes quedan actualizadas cuando cambia contrato/uso

## Guardrails de implementacion

- mantener ASCII por defecto en nuevos archivos
- no borrar ni revertir cambios del usuario fuera del alcance solicitado
- no copiar una app externa completa dentro del theme: extraer solo lo necesario
- priorizar consistencia de SkitSaaS sobre fidelidad pixel-perfect del template fuente
