# RFC Fase 0: Theme Modular System por area

Estado: Borrador activo
Fecha inicio: 2026-02-11
Plan padre: `plans/archive/theme-modular-system-plan.md`

## Objetivo
Cerrar el contrato inicial para theme packs por area y habilitar la ejecucion de fases 1-5 sin ambiguedad.

## Decision 1: Contrato `ThemePackManifest`
Archivo: `themes/<themeId>/theme.json`

Campos obligatorios:
- `themeId`: string, formato `dot.case`, unico global.
- `version`: semver del pack.
- `areas`: arreglo con uno o mas valores permitidos (`admin`, `dashboard`, `frontend`, `global`).
- `mode`: `tokens` (v1).
- `entryTokens`: ruta relativa a `tokens.css` o `tokens.json`.
- `themeRange`: rango semver compatible con el runtime de themes del host.

Campos opcionales:
- `entryTemplates`: ruta relativa a carpeta o indice de templates.
- `entryAssets`: ruta relativa a assets estaticos.
- `displayName`: string para admin UX.
- `description`: string corto.
- `author`: metadata de publicacion.
- `tags`: arreglo de strings.

Ejemplo v1:

```json
{
  "themeId": "theme.corporate.frontend",
  "version": "0.1.0",
  "areas": ["frontend"],
  "mode": "tokens",
  "entryTokens": "tokens.css",
  "themeRange": "^1.0.0"
}
```

## Decision 2: Politica de versionado
- `version` representa la version del pack.
- `themeRange` representa compatibilidad contra contrato host de themes.
- El host publica una version de contrato de runtime (v1 inicial: `1.0.0`).
- `themes:prepare` valida compatibilidad en modo estricto por default.
- Se permitira modo diagnostico `--warn-compat` para no bloquear localmente.

## Decision 3: Validaciones de `areas`
- Set permitido: `admin`, `dashboard`, `frontend`, `global`.
- `areas` no puede ser vacio.
- `areas` no puede repetir valores.
- `themeId` no puede colisionar con otro pack.
- Un area puede tener varios packs instalados, pero solo uno activo por politica/runtime.
- Para transicion legacy, `public` no es valor valido en manifiesto nuevo.

## Decision 4: Fallback de seleccion
Orden definitivo por area:

1. user preference (si `allowUserOverride=true`)
2. policy default de area
3. theme activo de area
4. policy default `global`
5. theme activo `global`
6. core fallback

Notas:
- Compatibilidad temporal: resolucion legacy `public` se mapea a `frontend` durante migracion.
- Observabilidad: registrar `source` de resolucion para cada seleccion.

## Decision 5: Artefacto generado por `themes:prepare`
Salida esperada:
- `lib/themes/external.generated.ts` con registro determinista de packs.
- Metadatos minimos por pack: `themeId`, `version`, `areas`, `entryTokens`, `themeRange`.
- Orden estable por `themeId` para diffs limpios.

## Decision 6: Rutas de login por area de theme
- `site.com/login` usa area de theme `dashboard`.
- `site.com/admin/login` usa area de theme `admin`.
- `site.com/sign-in` queda como alias legacy hacia `/login`.
- `site.com/sign-up` usa area de theme `dashboard`.
- El area `frontend` no define login operativo propio.
- Si un theme aplica a `admin` y `dashboard`, puede reutilizar el mismo template.

## Decision 7: Auth lifecycle futuro y bootstrap admin
- Rutas auth previstas para evolucion:
  - `site.com/recovery`
  - `site.com/reset-password`
  - `site.com/change-password`
- Regla default: rutas auth no prefijadas por admin usan area `dashboard`.
- Variante admin opcional futura:
  - `site.com/admin/recovery`
  - `site.com/admin/change-password`
  - (si aplica) `site.com/admin/reset-password`
- Si existen variantes admin, el runtime debe resolver area `admin` por prefijo `/admin/*`.
- `frontend` no hospeda auth operativo; solo puede renderizar CTA/redirect o forms que postean al login dashboard.
- Bootstrap admin:
  - En local/dev, user seed con rol `owner` cubre acceso `/admin`.
  - En ambientes compartidos/prod, no usar credenciales default y exigir rotacion/inyeccion por env.

## Criterios de aprobacion Fase 0
- Contrato `ThemePackManifest` definido.
- Politica `version`/`themeRange` definida.
- Validaciones de `areas` definidas.
- Fallback `area -> global -> core` definido.
- RFC publicado y referenciado desde el plan.

## Pendientes para cierre formal
- Aprobar nombre final del campo de contrato host (`themeRange` confirmado).
- Definir CLI exacta de `themes:prepare` (`--strict-compat` vs flag implicito).
- Definir ubicacion final del tipo TS compartido (`lib/themes/manifest.ts` o equivalente).
