# Skill: module-feature

Agrega una feature completa a un módulo de SkitSaaS: rutas, formularios, datatables y API handler.

## Instrucciones

El usuario te dará contexto sobre el módulo y la feature. Tú debes:

1. Leer los archivos del módulo antes de editar.
2. Trabajar dentro de `modules/<moduleId>/src/` — nunca editar host internals desde aquí.
3. Usar **solo** `@skitsaas/sdk` y `@skitsaas/sdk/server` como imports externos del SDK.
4. Para source-host modules, `@/components/*` y `@/lib/routing/*` son accesibles.
5. Para source-package modules, **no se puede importar nada de `@/`** — usar solo SDK.
6. El módulo de referencia más completo es `modules/mod.example.suite/`.

---

## Estructura de un módulo source-host

```
modules/<moduleId>/src/
  manifest.ts         ← defineModule(...) + createModulePageRouter + createModuleApiRouter
  routes.ts           ← RouteAdmin / RouteDashboard — PRIMER import: area-setup
  constants.ts        ← IDs, constantes, helpers puros
  data.ts             ← queries DB con getAdminDb() del SDK
  forms.ts            ← definiciones BuildForm (SDK only)
  actions.ts          ← server actions con createServerActionController / createValidatedServerActionController
  api-handler.ts      ← createModuleApiRouter(...)
  pages/
    admin-pages.tsx   ← renderiza JSX server components para el área admin
    dashboard-pages.tsx
  widgets.tsx         ← widgets para el dashboard principal
```

---

## 1. Rutas del módulo

```ts
// modules/<id>/src/routes.ts  — igual para source-host y source-package
import { RouteAdmin, RouteDashboard } from '@skitsaas/sdk'

const ADMIN_BASE = '/custom/<slug>'
const DASHBOARD_BASE = '/custom/<slug>'

export const MyModuleRoutes = {
  admin: {
    home:   RouteAdmin(ADMIN_BASE).name('<id>.admin.home'),
    create: RouteAdmin(`${ADMIN_BASE}/create`).name('<id>.admin.create'),
    edit:   RouteAdmin(`${ADMIN_BASE}/edit/{itemId}`).name('<id>.admin.edit'),
  },
  dashboard: {
    home: RouteDashboard(DASHBOARD_BASE).name('<id>.dashboard.home'),
    item: RouteDashboard(`${DASHBOARD_BASE}/items/{itemId}`).name('<id>.dashboard.item'),
  },
  apiBase: `/api/modules/<moduleId>`
} as const
```

> `area-setup` (que inyecta `proxyAdmin`/`proxyAuth` como defaults) es responsabilidad del host — ya corre en `all-routes.ts → core/routes.ts` antes de que cualquier routes.ts de módulo se evalúe. El módulo no necesita importarlo.

Registrar en `lib/routing/all-routes.ts` para activar proxy chains:
```ts
import '@/../modules/<moduleId>/src/routes'
```

Y en el manifest, usar `String(MyModuleRoutes.admin.home)` para los aliases — **nunca strings hardcodeados**.

---

## 2. Formularios del módulo (forms.ts)

Solo SDK — sin imports de `@/components/*`:

```ts
// modules/<id>/src/forms.ts
import {
  defineBuildForm,
  buildFormField,
  buildFormValidationPreset,
  buildFormRule,
  withBuildFormValidation
} from '@skitsaas/sdk'

export function createMyItemFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: '<moduleId>-item-form',
      layout: { columns: 2 },
      fields: [
        buildFormField.text({
          name: 'title',
          label: 'Título',
          required: true,
          colSpan: 'full'
        }),
        buildFormField.select({
          name: 'status',
          label: 'Estado',
          options: [
            { value: 'active', label: 'Activo' },
            { value: 'draft', label: 'Borrador' }
          ]
        }),
        buildFormField.checkbox({
          name: 'isPublic',
          label: 'Público',
          checkedValue: 'true',
          uncheckedValue: 'false'
        })
      ]
    }),
    buildFormValidationPreset.blur({
      title:  [buildFormRule.required(), buildFormRule.maxLength(120)],
      status: [buildFormRule.required()]
    })
  )
}

// Variante edit con campo hidden id
export function createMyItemEditFormDefinition() {
  const base = createMyItemFormDefinition()
  return withBuildFormValidation(
    defineBuildForm({
      ...base,
      id: '<moduleId>-item-edit-form',
      fields: [
        buildFormField.hidden({ name: 'itemId' }),
        ...(base.fields ?? [])
      ]
    }),
    {
      ...base.validation,
      fields: {
        itemId: [buildFormRule.required(), buildFormRule.integer(), buildFormRule.min(1)],
        ...(base.validation.fields ?? {})
      }
    }
  )
}
```

---

## 3. Acciones servidor (actions.ts)

```ts
// modules/<id>/src/actions.ts
'use server'
import {
  createValidatedServerActionController,
  requireUser
} from '@skitsaas/sdk/server'
import { composeBuildFormDefinition } from '@skitsaas/sdk'
import { createMyItemFormDefinition } from './forms'
import { createMyItem, updateMyItem, deleteMyItem } from './data'
import { revalidatePaths } from '@skitsaas/sdk/server'
import { MyModuleRoutes } from './routes'

// Create
const createController = createValidatedServerActionController(
  createMyItemFormDefinition()
)

export const createMyItemAction = createController.action(
  async ({ values }) => {
    const user = await requireUser<{ id: number }>()
    const item = await createMyItem({ ...values, ownerId: user.id })
    await revalidatePaths([String(MyModuleRoutes.admin.home)])
    return { ok: true, item }
  }
)

// Update
const updateController = createValidatedServerActionController(
  createMyItemEditFormDefinition()
)

export const updateMyItemAction = updateController.action(
  async ({ values }) => {
    await requireUser()
    const item = await updateMyItem(Number(values.itemId), values)
    await revalidatePaths([String(MyModuleRoutes.admin.home)])
    return { ok: true, item }
  }
)

// Delete (sin validación de form — solo hidden field)
export async function deleteMyItemAction(formData: FormData) {
  await requireUser()
  const id = Number(formData.get('itemId'))
  if (!id) return { ok: false }
  await deleteMyItem(id)
  await revalidatePaths([String(MyModuleRoutes.admin.home)])
  return { ok: true }
}
```

---

## 4. Datatables en módulos

### Source-host (acceso a host renderer)

```tsx
// modules/<id>/src/pages/admin-pages.tsx
import { DataTable } from '@/components/ui/data-table'  // host adapter
import {
  defineBuildTable,
  buildTableColumn,
  buildTableAction,
  withBuildTableData
} from '@skitsaas/sdk'
import { MyModuleRoutes } from '../routes'

const itemsTable = defineBuildTable({
  header: {
    title: 'Items',
    actions: [
      buildTableAction.link({
        label: 'Nuevo',
        href: MyModuleRoutes.admin.create
      })
    ]
  },
  columns: [
    buildTableColumn.text({ key: 'title', label: 'Título', sortable: true }),
    buildTableColumn.text({ key: 'status', label: 'Estado' }),
    buildTableColumn.actions({
      items: [
        buildTableAction.link({
          label: 'Editar',
          href: (row) => MyModuleRoutes.admin.edit.with({ itemId: row.id })
        }),
        buildTableAction.request({
          label: 'Eliminar',
          method: 'DELETE',
          url: (row) => `${MyModuleRoutes.apiBase}/items/${row.id}`,
          confirm: {
            title: '¿Eliminar item?',
            description: 'Esta acción no se puede deshacer.',
            confirmLabel: 'Sí, eliminar'
          }
        })
      ]
    })
  ]
})

export async function renderAdminHomePage() {
  const items = await listMyItems()
  const definition = withBuildTableData(itemsTable, items)
  return <DataTable definition={definition} />
}
```

### Source-package (solo SDK renderer)

```tsx
import { DataTable } from '@skitsaas/sdk'  // portable renderer
// El resto es igual — mismos builders, misma definición
```

### Tabla remota en módulo

```tsx
// Sin cargar datos en server — el DataTable los carga remotamente
const remoteTable = defineBuildTable({
  source: {
    url: `${MyModuleRoutes.apiBase}/items`,
    responseKey: 'items',
    totalKey: 'total'
  },
  toolbar: {
    search: { placeholder: 'Buscar...', paramKey: 'search' }
  },
  pagination: { defaultPageSize: 20 },
  columns: [ /* ... */ ]
})

// En la página — sin `withBuildTableData`, no necesita datos server-side
return <DataTable definition={remoteTable} />
```

El endpoint API del módulo debe aceptar los query params de BuildTable:

```ts
// En api-handler.ts, ruta GET /items:
import { parseBuildTableQueryState } from '@skitsaas/sdk'

{
  method: 'GET',
  path: '/items',
  handler: async ({ request }) => {
    const qs = new URL(request.url).searchParams
    const { page, pageSize, search, sortKey, sortDir } = parseBuildTableQueryState(qs)
    const items = await listMyItems({ page, pageSize, search, sortKey, sortDir })
    return Response.json({ items: items.data, total: items.total })
  }
}
```

---

## 5. Pages del módulo (renderizado)

```tsx
// modules/<id>/src/pages/admin-pages.tsx
import Link from 'next/link'
import { composeBuildFormDefinition } from '@skitsaas/sdk'
import { BuildForm } from '@/components/ui/build-form'          // source-host only
import { TemplateBuildForm } from '@/components/ui/template-build-form'
import { MyModuleRoutes } from '../routes'
import { createMyItemFormDefinition } from '../forms'
import { createMyItemAction } from '../actions'
import { listMyItems, getMyItemById } from '../data'

export async function renderAdminCreatePage() {
  const form = composeBuildFormDefinition(createMyItemFormDefinition(), {
    request: { action: createMyItemAction, method: 'post' },
    submit:  { idleLabel: 'Crear', pendingLabel: 'Creando...' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={MyModuleRoutes.admin.home}>← Volver</Link>
        <h1>Crear item</h1>
      </div>
      <BuildForm definition={form} />
    </div>
  )
}

export async function renderAdminEditPage(itemId: number) {
  const item = await getMyItemById(itemId)
  if (!item) return null  // 404

  const form = composeBuildFormDefinition(createMyItemEditFormDefinition(), {
    request: { action: updateMyItemAction, method: 'post' },
    submit:  { idleLabel: 'Guardar', pendingLabel: 'Guardando...' },
    values:  { itemId: item.id, title: item.title, status: item.status }
  })

  return <BuildForm definition={form} />
}
```

---

## 6. API Handler del módulo

```ts
// modules/<id>/src/api-handler.ts
import { createModuleApiRouter, parseJsonBody, requireUser } from '@skitsaas/sdk/server'

export const myModuleApiHandler = createModuleApiRouter({
  routes: [
    // Público
    {
      method: 'GET',
      path: '/items',
      handler: async ({ request }) => {
        const items = await listMyPublicItems()
        return Response.json({ items, total: items.length })
      }
    },
    // Autenticado
    {
      method: 'POST',
      path: '/items',
      auth: 'user',
      handler: async ({ request, user }) => {
        const body = await parseJsonBody(request)
        if (!body?.title) {
          return Response.json({ error: 'title requerido' }, { status: 400 })
        }
        const item = await createMyItem({ title: body.title, ownerId: user.id })
        return Response.json({ ok: true, item }, { status: 201 })
      }
    },
    // Admin only
    {
      method: 'DELETE',
      path: '/items/:itemId',
      auth: 'user',
      roles: ['admin', 'owner'],
      handler: async ({ params }) => {
        const id = parseInt(params.itemId ?? '', 10)
        if (!id) return Response.json({ error: 'id inválido' }, { status: 400 })
        await deleteMyItem(id)
        return Response.json({ ok: true })
      }
    }
  ]
})
```

`auth: 'user'` verifica sesión activa. `roles: ['admin','owner']` restringe al rol. Sin `auth`, la ruta es pública.

---

## 7. Manifest del módulo

```ts
// modules/<id>/src/manifest.ts
import { defineModule, type ModuleManifest } from '@skitsaas/sdk'
import { createModulePageRouter } from '@skitsaas/sdk/server'
import { MY_MODULE_ID } from './constants'
import { MyModuleRoutes } from './routes'
import { myModuleApiHandler } from './api-handler'
import { renderAdminHomePage, renderAdminCreatePage, renderAdminEditPage } from './pages/admin-pages'
import { renderDashboardHomePage } from './pages/dashboard-pages'

function toPositiveInt(v?: string) {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

const adminPage = createModulePageRouter({
  routes: [
    { path: '/',              handler: () => renderAdminHomePage() },
    { path: '/create',        handler: () => renderAdminCreatePage() },
    { path: '/edit/:itemId',  handler: ({ params }) => {
        const id = toPositiveInt(params.itemId)
        return id ? renderAdminEditPage(id) : null
      }
    }
  ]
})

const dashboardPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => renderDashboardHomePage() }
  ]
})

export default defineModule({
  moduleId: MY_MODULE_ID,
  version: '1.0.0',
  displayName: 'Mi Módulo',
  description: 'Descripción del módulo.',
  adminRouteAliases:     [String(MyModuleRoutes.admin.home)],
  dashboardRouteAliases: [String(MyModuleRoutes.dashboard.home)],
  adminNavItems: [{
    id: `${MY_MODULE_ID}.admin.nav`,
    href: String(MyModuleRoutes.admin.home),
    label: 'Mi Módulo',
    order: 90
  }],
  dashboardNavItems: [{
    id: `${MY_MODULE_ID}.dashboard.nav`,
    href: String(MyModuleRoutes.dashboard.home),
    label: 'Mi Módulo',
    order: 90
  }],
  adminPage,
  dashboardPage,
  apiHandler: myModuleApiHandler
} satisfies ModuleManifest)
```

---

## 8. Rate Limiting en módulos (SDK-first)

**Regla:** Siempre usar `@skitsaas/sdk` para rate limiting — funciona en source-host Y source-package.

### API endpoint con rate limit por IP (más simple)

```ts
// modules/<id>/src/api-handler.ts
import { withRateLimit } from '@skitsaas/sdk'
import { createModuleApiRouter } from '@skitsaas/sdk/server'

// Aplicar withRateLimit al handler de la ruta
const rateLimitedCreate = withRateLimit(
  { limit: 10, windowSeconds: 60 },
  async (request) => {
    // ... lógica del handler
    return Response.json({ ok: true })
  }
)

export const myModuleApiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'POST',
      path: '/items',
      auth: 'user',
      handler: ({ request }) => rateLimitedCreate(request)
    }
  ]
})
```

### Rate limit por plan de suscripción (desde módulo)

```ts
import { withRateLimit } from '@skitsaas/sdk'
import { getUser, getAdminDb } from '@skitsaas/sdk/server'

const planRateLimitedHandler = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:mi-endpoint`,
    limit: (ctx) => {
      const limits: Record<string, number> = { pro: 1000, basic: 200, free: 20 }
      return limits[ctx.plan ?? 'free'] ?? 20
    },
    windowSeconds: 3600,
    resolveContext: async (request) => {
      const user = await getUser()
      if (!user?.id) return {}
      // Consultar el plan del usuario usando getAdminDb()
      const db = await getAdminDb()
      const planRow = await db.query.subscriptionAssignments.findFirst({
        where: (t, { eq }) => eq(t.userId, user.id),
        columns: { planSlug: true }
      })
      return { plan: planRow?.planSlug ?? 'free' }
    }
  },
  async (request) => {
    return Response.json({ ok: true })
  }
)
```

### ¿Cuándo NO usar withRateLimit de SDK en un módulo?

Solo si necesitas lógica totalmente custom con Redis/Upstash. En ese caso, configura el backend **una vez** en el bootstrap del host:

```ts
// lib/modules/sdk-server-bootstrap.ts (host — se ejecuta una vez)
import { configureRateLimitBackend } from '@skitsaas/sdk'

configureRateLimitBackend(async (ctx) => {
  const key = ctx.customKey ?? `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 60)
  return { limited: count > 50, retryAfterSeconds: 60 }
})
// Ahora TODOS los withRateLimit del proyecto usan Redis automáticamente
```

---

## Tabla de imports por contexto

| Necesidad | Import correcto |
|-----------|----------------|
| Definir rutas | `@skitsaas/sdk` → `RouteAdmin`, `RouteDashboard` |
| Proxies de área (proxyAdmin/proxyAuth) | Automático — el host configura vía `all-routes.ts`; el módulo no hace nada |
| Formularios (contrato) | `@skitsaas/sdk` → `defineBuildForm`, `buildFormField`, etc. |
| Renderizar form (source-host) | `@/components/ui/build-form` → `BuildForm` |
| Renderizar form (source-package) | No disponible sin host — usar `TemplateBuildForm` o form nativo |
| Datatables (contrato) | `@skitsaas/sdk` → `defineBuildTable`, `buildTableColumn`, etc. |
| Renderizar tabla (source-host) | `@/components/ui/data-table` → `DataTable` |
| Renderizar tabla (source-package) | `@skitsaas/sdk` → `DataTable` |
| Auth en acciones | `@skitsaas/sdk/server` → `requireUser` |
| DB en datos | `@skitsaas/sdk/server` → `getAdminDb()` |
| API router | `@skitsaas/sdk/server` → `createModuleApiRouter` |
| Page router | `@skitsaas/sdk/server` → `createModulePageRouter` |
| Rate limiting (cualquier módulo) | `@skitsaas/sdk` → `withRateLimit`, `configureRateLimitBackend` |
| Rate limiting (core-only, userId de JWT gratis) | `@/lib/routing/rate-limit` → `withRateLimit`, `checkRateLimit` |
| Rate limiting auth endpoints | `@/lib/auth/rate-limit` → `checkAuthRateLimit` |

---

## Checklist de feature completa

- [ ] `routes.ts` — solo SDK; rutas nombradas con `.name('<id>.area.action')`
- [ ] `forms.ts` — solo imports de `@skitsaas/sdk`; `formId` estable
- [ ] `data.ts` — usa `getAdminDb()` del SDK para queries de tablas propias del módulo
- [ ] `actions.ts` — `'use server'`; usa `createValidatedServerActionController`
- [ ] `api-handler.ts` — `createModuleApiRouter` con `auth` en rutas protegidas
- [ ] `pages/` — usa las definiciones de `forms.ts` + `composeBuildFormDefinition`
- [ ] `manifest.ts` — `String(MyModuleRoutes.admin.home)` en aliases (no strings hardcodeados)
- [ ] Agregar import en `lib/routing/all-routes.ts` si el módulo necesita proxy chains custom
- [ ] Rate limiting: usar `withRateLimit` de `@skitsaas/sdk` (nunca de `@/lib/`) en módulos
- [ ] `pnpm modules:build` → `pnpm modules:prepare` tras cambios

---

## Módulo de referencia

`modules/mod.example.suite/` — implementación source-host completa con:
- forms.ts con validación local
- actions.ts con server action controller
- api-handler.ts con rutas public/auth/admin
- pages/admin-pages.tsx con BuildForm y datatables
- widgets.tsx con widgets para admin/dashboard home
- manifest.ts completo con templatePack

---

## Ejecutar ahora

Lee los archivos del módulo indicado por el usuario, luego implementa la feature descrita. Si el módulo no existe, crear la estructura desde cero siguiendo el patrón de `mod.example.suite`.
