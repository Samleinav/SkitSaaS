# Skill: create-route

Crea una nueva ruta tipada en el sistema de rutas de SkitSaaS usando `RouteBuilder`.

## Instrucciones

El usuario te dará información sobre la nueva ruta (área, path, nombre, proxies extra). Tú debes:

1. Leer los archivos relevantes antes de editar.
2. Agregar la ruta al lugar correcto.
3. Reconstruir el SDK si se modificó `app/sdk/src/`.

---

## Sistema de rutas — referencia rápida

### Factories disponibles (importar de `@skitsaas/sdk`)

| Factory | Prefijo | Proxies default |
|---------|---------|----------------|
| `RouteAdmin(path)` | `/admin` | `proxyAdmin` (session + DB admin role) |
| `RouteDashboard(path)` | `/dashboard` | `proxyAuth` (session + DB active user) |
| `RouteFrontend(path)` | *(ninguno)* | ninguno |
| `RouteApi(path)` | `/api` | ninguno |

### API de RouteBuilder

```ts
// Ruta simple nombrada
RouteAdmin('/users').name('admin.users')

// Ruta con parámetros
RouteAdmin('/users/{id}/edit').name('admin.user.edit')

// Ruta con proxies extra (inmutable — retorna nueva instancia)
RouteAdmin('/premium').proxy([proxyFeatureFlag('premium')]).name('admin.premium')

// Usar la ruta
Routes.admin.users                           // "/admin/users" — string-like
Routes.admin.users.with({ id: 5 })           // "/admin/users/5"
route('admin.users')                         // "/admin/users"
route('admin.user.edit', { id: 5 })          // "/admin/users/5/edit"
```

### Regla de naming

Usar dotted namespace: `<area>.<section>.<action>`

- Core: `admin.users`, `admin.subscriptions.edit`, `dashboard.general`
- Módulos: `<moduleId>.admin.home`, `<moduleId>.dashboard.item`

---

## Dónde agregar la ruta

### Ruta de core → `core/routes.ts`

```ts
// Dentro del objeto Routes apropiado:
export const Routes = {
  admin: {
    // ...
    myFeature: RouteAdmin('/my-feature').name('admin.my-feature'),
    // Si tiene sub-rutas:
    mySection: {
      home:   RouteAdmin('/my-section').name('admin.my-section'),
      create: RouteAdmin('/my-section/create').name('admin.my-section.create'),
      edit:   RouteAdmin('/my-section/{id}/edit').name('admin.my-section.edit'),
    },
  },
} as const
```

### Ruta de módulo → `modules/<moduleId>/src/routes.ts`

```ts
// Solo SDK — funciona igual para source-host y source-package
import { RouteAdmin, RouteDashboard } from '@skitsaas/sdk'

const ADMIN_BASE = '/custom/<module-slug>'

export const MyModuleRoutes = {
  admin: {
    home:   RouteAdmin(ADMIN_BASE).name('<moduleId>.admin.home'),
    create: RouteAdmin(`${ADMIN_BASE}/create`).name('<moduleId>.admin.create'),
    edit:   RouteAdmin(`${ADMIN_BASE}/edit/{id}`).name('<moduleId>.admin.edit'),
  },
  dashboard: {
    home: RouteDashboard(ADMIN_BASE).name('<moduleId>.dashboard.home'),
  },
  apiBase: `/api/modules/<moduleId>`
} as const
```

> `area-setup` no es necesario en módulos — el host lo ejecuta vía `all-routes.ts → core/routes.ts` antes de evaluar cualquier routes.ts de módulo.

Luego en `lib/routing/all-routes.ts`, descomentar o agregar el import:

```ts
import '@/../modules/<moduleId>/src/routes'
```

### Ruta de API (con protección por handler)

Registrar en `core/routes.ts` solo si se necesita la URL como constante nombrada:

```ts
api: {
  myEndpoint: RouteApi('/admin/my-endpoint').name('api.admin.my-endpoint'),
}
```

Proteger el handler en `app/api/.../route.ts`:

```ts
import { withApiProxy } from '@/lib/routing/with-api-proxy'
import { proxyApiAdmin } from '@/lib/routing/proxies'  // o proxyApiAuth

export const GET = withApiProxy([proxyApiAdmin], async (request) => {
  return Response.json({ ... })
})
```

---

## Checklist de implementación

- [ ] Elegir factory correcta: `RouteAdmin` / `RouteDashboard` / `RouteFrontend` / `RouteApi`
- [ ] Agregar al lugar correcto (`core/routes.ts` o `modules/<id>/src/routes.ts`)
- [ ] Llamar `.name('dotted.name')` con namespace claro
- [ ] Si necesita proxy extra: `.proxy([...])` antes de `.name()`
- [ ] Si el módulo necesita sus proxy chains en `proxy.ts`: agregar import a `lib/routing/all-routes.ts`
- [ ] Para API routes: usar `withApiProxy([proxyApiAdmin | proxyApiAuth])` en el handler
- [ ] Usar `Routes.area.section` en hrefs — nunca strings hardcodeados
- [ ] Si se modificó `app/sdk/src/`: rebuild con `cd app/sdk && npm run build`

---

## Archivos clave

- `core/routes.ts` — rutas core
- `lib/routing/area-setup.ts` — inyección de proxies (side-effect, primer import)
- `lib/routing/all-routes.ts` — entry point para proxy.ts
- `lib/routing/proxies.ts` — proxyAdmin, proxyAuth, proxyApiAdmin, proxyApiAuth
- `lib/routing/with-api-proxy.ts` — wrapper para route handlers de API
- `app/sdk/src/routing/area.ts` — factories RouteAdmin, RouteDashboard, RouteFrontend, RouteApi
- `docs/core/routing-system.md` — documentación completa

---

## Ejecutar ahora

Lee el request del usuario y ejecuta los pasos necesarios. Si el usuario no especificó algún dato (área, path, nombre), dedúcelo del contexto o pregunta solo lo imprescindible.
