# Skill: create-datatable

Crea un nuevo BuildTable (datatable) en SkitSaaS usando el sistema SDK-first `defineBuildTable`.

## Instrucciones

El usuario te dará contexto sobre la tabla (área, entidad, columnas, fuente de datos, acciones). Tú debes:

1. Leer los archivos relevantes antes de editar.
2. Crear o modificar solo los archivos necesarios.
3. Distinguir entre tabla local (datos en prop) y tabla remota (`source.url`).
4. No inventes columnas ni rutas que el usuario no haya especificado.

---

## Sistema BuildTable — referencia rápida

### Imports principales

```ts
// Contrato SDK
import {
  defineBuildTable,
  buildTableColumn,
  buildTableAction,
  buildTableFilter,
  withBuildTableData,
  withBuildTableQuery,
  composeBuildTableDefinition,
  parseBuildTableQueryState,
  resolveBuildTableView
} from '@skitsaas/sdk'

// Renderer
import { DataTable } from '@skitsaas/sdk'           // portable (módulos)
import { DataTable } from '@/components/ui/data-table' // host adapter (core)
```

---

## Tabla local (datos pasados como prop)

```ts
// columns.tsx o page.tsx
import { defineBuildTable, buildTableColumn, buildTableAction, withBuildTableData } from '@skitsaas/sdk'

const tableDefinition = defineBuildTable({
  header: {
    title: 'Elementos',
    description: 'Listado de elementos del sistema.'
  },
  columns: [
    buildTableColumn.text({
      key: 'name',
      label: 'Nombre',
      sortable: true
    }),
    buildTableColumn.text({
      key: 'status',
      label: 'Estado'
    }),
    buildTableColumn.text({
      key: 'createdAt',
      label: 'Creado',
      sortable: true
    }),
    buildTableColumn.actions({
      items: [
        buildTableAction.link({
          label: 'Editar',
          href: (row) => Routes.admin.items.edit.with({ id: row.id })
        }),
        buildTableAction.request({
          label: 'Eliminar',
          method: 'DELETE',
          url: (row) => `/api/admin/items/${row.id}`,
          confirm: {
            title: '¿Eliminar elemento?',
            description: 'Esta acción no se puede deshacer.',
            confirmLabel: 'Sí, eliminar'
          }
        })
      ]
    })
  ]
})

// En la página (server component)
const items = await db.select()...
const definition = withBuildTableData(tableDefinition, items)

// Renderizar
<DataTable definition={definition} />
```

---

## Tabla remota (carga desde API)

```ts
import { defineBuildTable, buildTableColumn, buildTableFilter } from '@skitsaas/sdk'

const tableDefinition = defineBuildTable({
  header: {
    title: 'Usuarios',
    description: 'Todos los usuarios del sistema.'
  },
  source: {
    url: '/api/admin/users',       // endpoint que acepta query params de BuildTable
    method: 'GET',
    responseKey: 'items',          // clave en la respuesta donde están los rows
    totalKey: 'total'              // clave para el total de registros
  },
  toolbar: {
    search: {
      placeholder: 'Buscar por nombre o email...',
      paramKey: 'search'
    },
    filters: [
      buildTableFilter.select({
        label: 'Estado',
        paramKey: 'status',
        options: [
          { value: 'active', label: 'Activo' },
          { value: 'inactive', label: 'Inactivo' }
        ]
      })
    ]
  },
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50]
  },
  columns: [
    buildTableColumn.text({ key: 'name', label: 'Nombre', sortable: true }),
    buildTableColumn.text({ key: 'email', label: 'Email' }),
    buildTableColumn.text({ key: 'role', label: 'Rol' }),
    buildTableColumn.actions({
      items: [
        buildTableAction.link({
          label: 'Ver',
          href: (row) => `/admin/users/${row.id}`
        }),
        buildTableAction.request({
          label: 'Desactivar',
          method: 'PATCH',
          url: (row) => `/api/admin/users/${row.id}`,
          body: { status: 'inactive' },
          confirm: {
            title: '¿Desactivar usuario?',
            confirmLabel: 'Desactivar'
          }
        })
      ]
    })
  ]
})

// En la página — no necesita datos, los carga remotamente
<DataTable definition={tableDefinition} />
```

---

## API endpoint para tabla remota

```ts
// app/api/admin/users/route.ts
import { withApiProxy } from '@/lib/routing/with-api-proxy'
import { proxyApiAdmin } from '@/lib/routing/proxies'
import { parseBuildTableQueryState } from '@skitsaas/sdk'

export const GET = withApiProxy([proxyApiAdmin], async (request) => {
  const queryState = parseBuildTableQueryState(
    new URL(request.url).searchParams
  )

  // Aplicar search, sort, pagination a la query DB
  const { page, pageSize, sortKey, sortDir, search } = queryState

  const [items, total] = await Promise.all([
    db.select()
      .from(users)
      .where(search ? ilike(users.name, `%${search}%`) : undefined)
      .orderBy(sortDir === 'asc' ? asc(users[sortKey]) : desc(users[sortKey]))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: count() }).from(users).then(r => r[0]?.count ?? 0)
  ])

  return Response.json({ items, total })
})
```

---

## Tipos de columnas

| Builder | Uso |
|---------|-----|
| `buildTableColumn.text(...)` | Texto plano |
| `buildTableColumn.actions(...)` | Columna de acciones (links, botones, requests) |
| `buildTableColumn.custom(...)` | JSX personalizado — usar solo cuando los defaults no alcanzan |

Opciones comunes: `key`, `label`, `sortable`, `width`, `className`, `headerClassName`.

---

## Tipos de acciones de fila

| Builder | Uso |
|---------|-----|
| `buildTableAction.link(...)` | Navegación — `href` string o función `(row) => string` |
| `buildTableAction.button(...)` | Botón con `onClick` client-side |
| `buildTableAction.request(...)` | Mutación HTTP — admite `confirm` |
| `buildTableAction.custom(...)` | JSX personalizado |

`buildTableAction.request` opciones clave:
- `method`: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- `url`: string o `(row) => string`
- `body`: objeto estático o `(row) => object`
- `format`: `json` (default), `formData`, `searchParams`
- `confirm`: `{ title, description, confirmLabel, cancelLabel }`

---

## Acciones de header (botones globales)

```ts
header: {
  title: 'Elementos',
  actions: [
    buildTableAction.link({
      label: 'Nuevo elemento',
      href: Routes.admin.items.create
    })
  ]
}
```

---

## Acciones de toolbar

```ts
toolbar: {
  actions: [
    buildTableAction.request({
      label: 'Exportar',
      method: 'POST',
      url: '/api/admin/items/export'
    })
  ]
}
```

---

## Tabla con query state en server component

```ts
// page.tsx
import { parseBuildTableQueryState, resolveBuildTableView, withBuildTableData } from '@skitsaas/sdk'

export default async function ItemsPage({ searchParams }) {
  const queryState = parseBuildTableQueryState(
    new URLSearchParams(searchParams as Record<string, string>)
  )

  const allItems = await db.select().from(items)
  const view = resolveBuildTableView(allItems, queryState)

  const definition = withBuildTableData(tableDefinition, view.items)
  // view también tiene: page, pageSize, total, sortKey, sortDir

  return <DataTable definition={definition} />
}
```

---

## Renderer correcto según contexto

| Contexto | Import |
|----------|--------|
| Core host (admin/dashboard pages) | `import { DataTable } from '@/components/ui/data-table'` |
| Módulos source-host | `import { DataTable } from '@/components/ui/data-table'` |
| Módulos source-package (sin acceso a host) | `import { DataTable } from '@skitsaas/sdk'` |

---

## Checklist de implementación

- [ ] Decidir: ¿tabla local o remota (`source.url`)?
- [ ] Definir columnas con `buildTableColumn.*(...)`
- [ ] Agregar acciones de fila con `buildTableColumn.actions(...)`
- [ ] Si es remota: crear endpoint API + `parseBuildTableQueryState` en el handler
- [ ] Si es remota: proteger con `withApiProxy([proxyApiAdmin | proxyApiAuth])`
- [ ] Si es local con query: `parseBuildTableQueryState` + `resolveBuildTableView` en el server component
- [ ] Acciones destructivas: siempre con `confirm: { title, confirmLabel }`
- [ ] Importar `DataTable` del lugar correcto según el contexto
- [ ] Para acciones de request que mutan: considerar revalidación de path en el handler

---

## Archivos clave

- `app/sdk/src/datatables/definition.ts` — contrato BuildTable
- `app/sdk/src/datatables/state.ts` — resolveBuildTableView, normalizadores
- `app/sdk/src/datatables/query.ts` — parseBuildTableQueryState
- `app/sdk/src/datatables/remote.ts` — helpers para fuentes remotas
- `components/ui/data-table.tsx` — host adapter renderer
- `app/sdk/src/ui/data-table.tsx` — SDK portable renderer
- `docs/core/build-table-system.md` — documentación completa

## Ejemplos existentes

- `app/(dashboard)/admin/users/columns.tsx` — tabla local con acciones
- `app/(dashboard)/admin/payments/payment-data-columns.tsx` — tabla admin
- `app/(dashboard)/admin/logs/log-columns.tsx` — tabla de logs
- `app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx` — tabla dashboard
- `modules/mod.example.package/src/module-data-tables.jsx` — tabla de módulo source-package

---

## Ejecutar ahora

Lee el request del usuario y ejecuta los pasos necesarios. Si faltan datos (entidad, columnas, endpoint), dedúcelos del contexto o pregunta solo lo imprescindible.
