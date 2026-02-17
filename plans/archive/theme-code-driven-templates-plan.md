# Plan 3: Malleable Code-Driven Templates

Estado: Archivado
Dependencia previa: `plans/archive/component-template-controller-plan.md` (evoluciona el sistema de templates)
Inicio: 2026-02-11
Fase actual: `Archivado por simplificacion de alcance`
Ultima verificacion: 2026-02-13

## Objetivo
Transformar el sistema de templates para que sea **basado en cÃ³digo (.tsx)** en lugar de solo configuraciÃ³n (JSON payloads), y habilitar que cada theme maneje **sus propias dependencias** de paquetes (MUI, Ant Design, Chakra, etc.) de forma independiente.

Resultado esperado: poder tener un theme `tailwind-admin` y un theme `mui-admin`, y cambiar entre ellos con solo modificar la configuraciÃ³n del theme activo.

---

## Problema Actual
El sistema actual (Plan 2) resuelve templates como *configuraciÃ³n y payloads* (ej: clases CSS en `templates.json`).
- **LimitaciÃ³n estructural**: No permite cambiar la estructura HTML/lÃ³gica interna de un componente sin hackear el componente host.
- **LimitaciÃ³n de dependencias**: Todos los themes dependen de los paquetes del proyecto raÃ­z (Tailwind/shadcn). No hay forma de usar MUI o cualquier otra librerÃ­a de UI desde un theme.
- **Frontend limitado**: Los themes frontend no pueden definir layouts/secciones completas; solo inyectan payloads cosmÃ©ticos.

---

## Nueva Arquitectura: Code-Driven Templates

### 1. Estructura de Archivos del Theme

```
themes/
  mui-admin/
    package.json          # Dependencias propias: @mui/material, @emotion/react
    theme.json            # Metadatos estÃ¡ticos (themeId, areas, version) â€” sin cambios
    theme.config.ts       # Config runtime: providers, wrappers, setup de librerÃ­a
    tokens.css            # Variables CSS (puede estar vacÃ­o si la lib maneja todo)
    global.css            # (nuevo) estilos globales del theme/area
    assets/               # (nuevo) favicon y otros assets de head
    templates/
      ui.table.tsx        # Tabla usando MUI DataGrid
      ui.button.tsx       # Button MUI
      ui.sidebar.tsx      # Sidebar custom
      system.not-found.tsx # (nuevo) not-found por area

  tailwind-clean/
    package.json          # Sin deps extra (usa Tailwind del root)
    theme.json
    theme.config.ts
    tokens.css
    global.css
    assets/
    templates/
      ui.table.tsx        # Tabla con clases Tailwind
      ui.button.tsx       # Button Tailwind
      system.not-found.tsx
```

### 2. GestiÃ³n de Dependencias (Workspace Pattern)

#### `pnpm-workspace.yaml` (modificaciÃ³n)
```yaml
packages:
  - "app/sdk"
  - "themes/*"      # <-- cada theme es un workspace package
```

#### `themes/mui-admin/package.json` (ejemplo)
```json
{
  "name": "@themes/mui-admin",
  "private": true,
  "version": "1.0.0",
  "dependencies": {
    "@mui/material": "^7.0.0",
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^16.0.0"
  }
}
```

**Reglas de dependencias:**
- **`dependencies`**: LibrerÃ­as de UI propias del theme (MUI, AntD, Framer Motion, etc.)
- **`peerDependencies`**: React, React-DOM, Next.js (las provee el proyecto raÃ­z)
- **Prohibido**: No duplicar paquetes del root que no sean de UI (drizzle, stripe, etc.)

**ResoluciÃ³n**: `pnpm install` en la raÃ­z instala las deps de todos los workspace packages. Next.js/Turbopack puede resolver imports desde `themes/mui-admin/templates/ui.table.tsx` â†’ `@mui/material` porque pnpm lo enlaza correctamente.

### 3. ConfiguraciÃ³n Dual: `theme.json` + `theme.config.ts`

Se mantienen **ambos archivos** con responsabilidades distintas:

| Archivo | CuÃ¡ndo se lee | PropÃ³sito |
|---|---|---|
| `theme.json` | Build-time (`themes:prepare`) | Metadatos estÃ¡ticos: `themeId`, `areas`, `version`, `entryTokens`. No requiere ejecutar cÃ³digo. |
| `theme.config.ts` | Runtime (render) | ConfiguraciÃ³n dinÃ¡mica: providers CSS-in-JS, theme MUI, font loaders, wrappers globales. |

#### `theme.config.ts` â€” Contrato propuesto

```typescript
// themes/mui-admin/theme.config.ts
import { defineThemeConfig } from '@skitsaas/sdk';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const muiTheme = createTheme({
  palette: { mode: 'dark', primary: { main: '#90caf9' } }
});

export default defineThemeConfig({
  // Wrapper que envuelve TODOS los templates de este theme
  // Ideal para CSS-in-JS providers, font injection, etc.
  Provider: ({ children }) => (
    <ThemeProvider theme={muiTheme}>
      {children}
    </ThemeProvider>
  ),

  // Assets globales del theme (fonts, scripts)
  head: {
    fonts: ['https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700'],
  },
});
```

**Â¿Por quÃ© `Provider`?**: MUI necesita un `<ThemeProvider>` para que sus componentes funcionen. Sin un wrapper, los `<Button>` de MUI no tendrÃ­an tema. Este Provider se inyecta automÃ¡ticamente cuando el theme estÃ¡ activo.

### 4. GeneraciÃ³n de Registro (Build-time) â€” Estado actual

Estado actual implementado: `themes:prepare` genera registro para themes con code templates (`templates/*.tsx`) y `theme.config.ts`.
Pendiente: filtrar por theme activo por area para evitar imports de themes inactivos.

El script `themes:prepare` se extiende para:
1. Leer `theme.json` de todos los themes (validaciÃ³n).
2. Escanear `templates/*.tsx`.
3. Generar registro de imports lazy por `themeId`.

```typescript
// lib/themes/code-registry.generated.ts (generado)
export const THEME_CODE_REGISTRY = {
  'theme.pilot.admin': {
    themeId: 'theme.pilot.admin',
    providerImport: () =>
      import('../../themes/pilot-admin/theme.config').then((m) => ({
        default: m.default?.Provider ?? (({ children }: any) => children),
      })),
    templates: {
      'ui.table': () => import('../../themes/pilot-admin/templates/ui.table'),
    },
  },
};
```

**Objetivo pendiente**: compilar/bundlear solo dependencias del theme activo. Hoy el registro se genera por `themeId` para todos los packs con templates de codigo.

**Trade-off**: Cambiar de theme requiere `pnpm themes:prepare` + restart del dev server (o rebuild). No es hot-swap en runtime.

### 5. Runtime: CÃ³mo se renderizan los templates

#### Componente Host: `<ThemeTemplate />`

```tsx
// Uso en app/(dashboard)/admin/users/page.tsx
import { ThemeTemplate } from '@/components/ui/theme-template';

export default async function UsersPage() {
  const users = await getUsers();
  const columns = getUserColumns();

  return (
    <ThemeTemplate
      id="ui.table"
      area="admin"
      data={{ columns, rows: users }}
      fallback={<DefaultTable columns={columns} rows={users} />}
    />
  );
}
```

El runtime de `<ThemeTemplate>`:
1. Lee el registro generado por `themeId`.
2. Si existe template code-driven â†’ lo renderiza dentro del Provider del theme.
3. Si no existe â†’ usa el `fallback` (componente core actual).
4. Si falla â†’ fallback automÃ¡tico.

---

## DiferenciaciÃ³n por Area

### Admin / Dashboard Themes
- **Alcance**: Componentes atÃ³micos y slots (tablas, botones, formularios, sidebars).
- **Contrato de datos**: Estricto. Un template `ui.table` DEBE recibir `{ columns, rows }` y renderizar una tabla funcional.
- **Ejemplo**: Theme MUI reescribe `ui.table` usando `<DataGrid>` con sorting/filtering nativo de MUI. Theme Tailwind usa `<table>` con clases utility.

### Frontend Themes
- **Alcance**: PÃ¡ginas y secciones completas (Hero, Features, Pricing, Header, Footer).
- **Contrato de datos**: Flexible. El template recibe `data` y decide cÃ³mo presentarlo.
- **Layout**: El theme frontend puede definir `layout.shell.tsx` que reemplaza el layout completo de `app/(frontend)`.
- **Diferencia clave**: En frontend, el theme "es" la aplicaciÃ³n visual. En admin/dashboard, el theme "viste" la aplicaciÃ³n.

```
themes/
  landing-starter/
    package.json
    theme.json              # areas: ["frontend"]
    theme.config.ts
    templates/
      layout.shell.tsx      # Header + Footer + main wrapper
      section.hero.tsx      # Hero section
      section.features.tsx  # Features grid
      section.pricing.tsx   # Pricing cards
      page.home.tsx         # ComposiciÃ³n completa de la home
```

---

## Fases y Checklist

### Fase 0: AnÃ¡lisis de compatibilidad
- [x] Verificar que Next.js 16 + Turbopack resuelve imports desde workspace packages (`themes/*`).
- [x] Verificar que dynamic imports desde `themes/*/templates/*.tsx` funcionan con code splitting.
- [ ] Verificar que CSS-in-JS (Emotion/MUI) funciona dentro de templates lazy-loaded.
- [ ] Documentar limitaciones de `'use client'` vs server components en templates.

### Fase 1: Workspace + Tooling
- [x] Modificar `pnpm-workspace.yaml` para incluir `themes/*`.
- [x] Crear esqueleto de `package.json` para themes existentes (sin deps extra).
- [x] Crear tipo `ThemeConfig` y helper `defineThemeConfig()` en `lib/themes/config.ts`.
- [x] Extender script `themes:prepare` para:
  - [x] Detectar `templates/` dir en cada theme.
  - [x] Escanear archivos `.tsx` y mapear a `componentId` por nombre de archivo.
  - [x] Generar `lib/themes/code-registry.generated.ts`.
  - [ ] Generar imports solo para themes activos.
- [x] Extender `themes:prepare` para registrar metadata de assets globales del theme (`global.css`, favicon/links de head, `system.not-found`).
- [x] Agregar `templates:prepare` al pipeline de `predev`/`prebuild` si es comando separado, o integrar en `themes:prepare` existente.

### Fase 2: Runtime `<ThemeTemplate />` + Provider
- [x] Crear `components/ui/theme-template.tsx`.
- [ ] Implementar resoluciÃ³n: registro code-driven â†’ CTC existente â†’ fallback.
- [x] Implementar wrapping con Provider del theme (si existe).
- [x] Suspense boundary para carga de templates lazy.
- [ ] Error boundary local con fallback a componente core.
- [x] Tipado genÃ©rico: `ThemeTemplate<TData>`.
- [x] Soporte runtime para `global.css` por area/theme activo.
- [x] Soporte runtime para favicon/head links por area/theme activo.
- [x] Soporte runtime para `system.not-found` por area con fallback seguro.

### Fase 3: Piloto Admin con Lib Externa
- [ ] Crear theme `themes/mui-pilot/` con `package.json` + `@mui/material`.
- [ ] Implementar `theme.config.ts` con `ThemeProvider` de MUI.
- [ ] Crear `templates/ui.button.tsx` usando `<Button>` de MUI.
- [ ] Crear `templates/ui.table.tsx` usando `<DataGrid>` o table nativa MUI.
- [ ] Validar que `pnpm install` + `pnpm themes:prepare` + `pnpm dev` funciona sin errores.
- [ ] Validar que al cambiar el theme activo, los componentes MUI desaparecen y vuelve el core/Tailwind.
- [ ] Validar bundle size: MUI no debe aparecer en chunks cuando su theme no estÃ¡ activo.

### Fase 4: Piloto Frontend (Layouts + Secciones)
- [ ] Crear theme `themes/landing-starter/` con area `frontend`.
- [ ] Implementar `templates/layout.shell.tsx` (header + footer).
- [ ] Implementar `templates/section.hero.tsx` y `templates/page.home.tsx`.
- [ ] Conectar `app/(frontend)/layout.tsx` para usar layout del theme si existe.
- [ ] Validar que el theme frontend reemplaza la UI completa del area.

### Fase 5: MigraciÃ³n + Compatibilidad
- [x] Definir estrategia de migraciÃ³n para `templates.json` existentes.
  - OpciÃ³n A: Coexistencia (JSON payloads + code templates, code gana si existe).
  - OpciÃ³n B: MigraciÃ³n completa (convertir payloads a `.tsx` wrappers).
- [ ] Migrar themes existentes (`frontend-sandbox`, `pilot-admin`) al flujo code-driven completo.
- [ ] Actualizar `AGENTS.md` con nuevas convenciones.
- [x] Actualizar docs tÃ©cnicos.

### Fase 6: QA y DocumentaciÃ³n
- [ ] Tests: registro generado es correcto para theme activo.
- [ ] Tests: Provider se aplica correctamente.
- [ ] Tests: fallback funciona cuando template falla.
- [ ] Tests: cambio de theme activo regenera registro correcto.
- [x] Tests: `global.css` y favicon correctos por area/theme.
- [x] Tests: `system.not-found` por area/theme con fallback.
- [ ] GuÃ­a para autores de themes: "CÃ³mo crear un theme con dependencias propias".
- [ ] GuÃ­a de migraciÃ³n de `templates.json` a `templates/*.tsx`.

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | MitigaciÃ³n |
|---|---|---|
| CSS global de MUI/Emotion conflicta con Tailwind del root | Estilos rotos | Provider del theme aÃ­sla CSS-in-JS; Tailwind `@layer` previene colisiones |
| Bundle incluye deps de themes inactivos | Bundle inflado | Pendiente: filtrar registro por theme activo por area |
| `pnpm install` instala deps de todos los themes | Disco/CI lento | Aceptable en dev; en CI usar `--filter` si es crÃ­tico |
| Templates lazy-loaded causan flicker | UX degradada | Suspense con skeleton + prefetch en layout |
| Turbopack no resuelve workspace imports | Build falla | Fase 0 valida esto antes de implementar |
| Hot-swap de theme en runtime no posible | Requiere restart | Documentar como limitaciÃ³n conocida; aceptable para v1 |

---

## Preguntas Abiertas (estado)

1. **`theme.config.ts` en build-time o runtime**
   - Cerrado: runtime (lazy import desde `lib/themes/code-registry.generated.ts`).

2. **`package.json` obligatorio en themes**
   - Cerrado: si, minimo (`name`, `private`, `version`, `peerDependencies` base).

3. **Maximo de themes activos simultaneos**
   - Cerrado: 1 por area (admin, dashboard, frontend, global), segun Plan 1.
---

## Criterio de cierre
- [ ] Un theme con MUI puede reemplazar `ui.table` en admin, y al cambiar config vuelve el default Tailwind.
- [ ] Un theme frontend puede definir layout completo + secciones sin tocar `app/(frontend)`.
- [ ] Las dependencias de un theme inactivo no aparecen en el bundle de producciÃ³n.
- [ ] DocumentaciÃ³n y tests completos.
