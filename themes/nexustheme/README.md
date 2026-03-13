# Nexus Theme

Tema moderno para el SaaS Starter basado en el estilo de shadcn-dashboard con componentes personalizados y mejor jerarquía visual.

## Características

- **Container queries** para responsive interno
- **Gradientes sutiles** en cards
- **Metric cards** con trending badges y footers informativos
- **Page shell** con variantes y actions
- **Visual hierarchy** mejorada con spacing consistente

## Componentes

### NexusMetricCard

Tarjeta de métrica completa con soporte para trending, badges y footers.

```tsx
import { NexusMetricCard } from '@/themes/nexustheme/components';

<NexusMetricCard
  title="Total Revenue"
  value="$1,250.00"
  trend={{
    direction: 'up',
    value: '+12.5%'
  }}
  footer={{
    primary: 'Trending up this month',
    secondary: 'Visitors for the last 6 months'
  }}
  variant="gradient" // o 'default'
/>
```

### NexusSimpleMetricCard

Tarjeta de métrica simple sin extras.

```tsx
import { NexusSimpleMetricCard } from '@/themes/nexustheme/components';

<NexusSimpleMetricCard
  label="Active Users"
  value={1234}
  variant="gradient"
/>
```

### NexusPageShell

Contenedor de página con header y spacing consistente.

```tsx
import { NexusPageShell } from '@/themes/nexustheme/lib/page-shell';

<NexusPageShell
  title="Users"
  description="Manage user accounts and permissions"
  badge="Beta"
  actions={<Button>Create User</Button>}
  variant="default" // o 'compact' | 'spacious'
>
  {/* Contenido de la página */}
</NexusPageShell>
```

### NexusEmptyState

Componente de empty state moderno con icono, título, descripción y acción opcional.

```tsx
import { NexusEmptyState } from '@/themes/nexustheme/components';
import { Users } from 'lucide-react';

<NexusEmptyState
  icon={<Users className="h-12 w-12" />}
  title="No users found"
  description="Get started by creating your first user account."
  action={<Button>Create User</Button>}
  variant="default" // o 'subtle' | 'bordered'
/>
```

**Variants:**
- `default` - Con borde punteado y fondo sutil
- `subtle` - Sin borde, transparente
- `bordered` - Con borde sólido y fondo de card

### Loading States

Componentes de loading con gradientes animados (shimmer effect).

#### NexusMetricCardsLoading

```tsx
import { NexusMetricCardsLoading } from '@/themes/nexustheme/components';

<NexusMetricCardsLoading />
```

#### NexusTableLoading

```tsx
import { NexusTableLoading } from '@/themes/nexustheme/components';

<NexusTableLoading rows={5} />
```

#### NexusPageContentLoading

```tsx
import { NexusPageContentLoading } from '@/themes/nexustheme/components';

<NexusPageContentLoading />
```

#### NexusCardLoading

```tsx
import { NexusCardLoading } from '@/themes/nexustheme/components';

<NexusCardLoading />
```

#### NexusFormLoading

```tsx
import { NexusFormLoading } from '@/themes/nexustheme/components';

<NexusFormLoading />
```

### Skeleton

Skeleton mejorado con variante gradient para efecto shimmer.

```tsx
import { Skeleton } from '@/themes/nexustheme/components/ui/skeleton';

<Skeleton variant="gradient" className="h-8 w-32" />
<Skeleton variant="default" className="h-4 w-full" />
```

### Table Components

Sistema completo de tablas con container queries, responsive design y componentes auxiliares.

#### NexusTable

Contenedor principal de tabla con 3 variantes y container queries.

```tsx
import {
  NexusTable,
  NexusTableHeader,
  NexusTableBody,
  NexusTableRow,
  NexusTableHead,
  NexusTableCell
} from '@/themes/nexustheme/components';

<NexusTable variant="default">
  <NexusTableHeader>
    <NexusTableRow>
      <NexusTableHead sortable sorted="asc">Name</NexusTableHead>
      <NexusTableHead>Email</NexusTableHead>
      <NexusTableHead align="right">Status</NexusTableHead>
    </NexusTableRow>
  </NexusTableHeader>
  <NexusTableBody>
    <NexusTableRow clickable>
      <NexusTableCell>John Doe</NexusTableCell>
      <NexusTableCell truncate>john@example.com</NexusTableCell>
      <NexusTableCell align="right">Active</NexusTableCell>
    </NexusTableRow>
  </NexusTableBody>
</NexusTable>
```

**Variantes:**
- `default` - Border y shadow estándar
- `compact` - Espaciado reducido
- `bordered` - Border grueso y shadow más fuerte

**Features:**
- Container queries (`@container/table`) para responsive interno
- Rows clickable con hover states
- Selected state para rows
- Sortable headers con indicadores visuales
- Truncate automático para celdas largas
- Alineación flexible (left, center, right)

#### NexusTablePagination

Controles de paginación modernos para tablas.

```tsx
import { NexusTablePagination } from '@/themes/nexustheme/components';

<NexusTablePagination
  currentPage={2}
  totalPages={10}
  onPageChange={(page) => handlePageChange(page)}
  showPageInfo={true}
  pageInfoText="Page 2 of 10"
/>
```

#### NexusTableToolbar

Toolbar para búsqueda, filtros y acciones sobre la tabla.

```tsx
import { NexusTableToolbar } from '@/themes/nexustheme/components';

<NexusTableToolbar
  searchSlot={<Input placeholder="Search..." />}
  filterSlot={<Select>...</Select>}
  actionSlot={<Button>Add User</Button>}
/>
```

#### NexusTableEmpty

Empty state especializado para tablas sin datos.

```tsx
import { NexusTableEmpty } from '@/themes/nexustheme/components';
import { Users } from 'lucide-react';

<NexusTableEmpty
  icon={<Users className="h-10 w-10" />}
  title="No users found"
  description="Add your first user to get started."
  action={<Button>Add User</Button>}
/>
```

## Templates

### section.admin.metrics-grid

Grid de métricas con container queries y gradientes automáticos.

```tsx
// Uso desde template
<ThemeCodeTemplate
  themeId="theme.nexus"
  id="section.admin.metrics-grid"
  data={{
    variant: 'users',
    columns: 3
  }}
>
  <NexusSimpleMetricCard label="Active" value={120} />
  <NexusSimpleMetricCard label="Suspended" value={5} />
  <NexusSimpleMetricCard label="Banned" value={2} />
</ThemeCodeTemplate>
```

### Specialized Metric Templates

Templates específicos para diferentes áreas del admin que manejan automáticamente los datos y etiquetas.

#### section.admin.users.metrics

```tsx
<ThemeCodeTemplate
  themeId="theme.nexus"
  id="section.admin.users.metrics"
  data={{
    activeCount: 120,
    suspendedCount: 5,
    bannedCount: 2,
    activeLabel: 'Active Users',
    suspendedLabel: 'Suspended',
    bannedLabel: 'Banned'
  }}
/>
```

#### section.admin.orders.metrics

```tsx
<ThemeCodeTemplate
  themeId="theme.nexus"
  id="section.admin.orders.metrics"
  data={{
    pendingCount: 15,
    completedCount: 230,
    failedCount: 8,
    pendingLabel: 'Pending',
    completedLabel: 'Completed',
    failedLabel: 'Failed'
  }}
/>
```

#### section.admin.payments.metrics

```tsx
<ThemeCodeTemplate
  themeId="theme.nexus"
  id="section.admin.payments.metrics"
  data={{
    successfulCount: 450,
    pendingCount: 12,
    refundedCount: 3,
    successfulLabel: 'Successful',
    pendingLabel: 'Pending',
    refundedLabel: 'Refunded'
  }}
/>
```

#### section.admin.subscriptions.metrics

```tsx
<ThemeCodeTemplate
  themeId="theme.nexus"
  id="section.admin.subscriptions.metrics"
  data={{
    activeCount: 89,
    trialCount: 15,
    canceledCount: 7,
    activeLabel: 'Active',
    trialLabel: 'Trial',
    canceledLabel: 'Canceled'
  }}
/>
```

### page.admin.users

Plantilla de página con description automática.

```tsx
// El template ya incluye:
// - NexusPageShell con title y description
// - Spacing consistente
// - Visual hierarchy mejorada
```

## Diferencias con first-backoffice

| Característica | first-backoffice | Nexus |
|---|---|---|
| Cards | Flat, color único | Gradientes sutiles |
| Metrics | Solo valor y label | Trending, badges, footers |
| Spacing | Básico | Container queries responsive |
| Typography | Estándar | Tabular nums, tracking optimizado |
| Visual hierarchy | Simple | Múltiples niveles de énfasis |
| Empty states | Texto simple | Iconos grandes, acciones, variants |
| Loading states | Pulse básico | Gradient shimmer animation |
| Skeletons | Single color | Gradient con shimmer effect |
| Tables | Básicas | 11 componentes, sortable, clickable, pagination |

## Ejemplos de uso

### Página de métricas completa

```tsx
// En app/(dashboard)/admin/users/page.tsx
const metricsSlot = (
  <ThemeCodeTemplate
    themeId="theme.nexus"
    id="section.admin.metrics-grid"
    data={{ variant: 'users', columns: 3 }}
  >
    <NexusMetricCard
      title="Active Users"
      value={activeCount}
      trend={{ direction: 'up', value: '+12%' }}
      footer={{
        primary: 'Strong growth this month',
        secondary: 'Compared to last period'
      }}
    />
    <NexusSimpleMetricCard label="Suspended" value={suspendedCount} />
    <NexusSimpleMetricCard label="Banned" value={bannedCount} />
  </ThemeCodeTemplate>
);
```

### Dashboard module con cards

Los modules del admin dashboard ya usan el estilo correcto con `ImpactMetricCard`. Los templates wrappean estos modules para agregar estilos adicionales cuando es necesario.

### Tabla completa con todas las features

Ejemplo de tabla con toolbar, paginación y empty state:

```tsx
import {
  NexusTable,
  NexusTableHeader,
  NexusTableBody,
  NexusTableRow,
  NexusTableHead,
  NexusTableCell,
  NexusTableToolbar,
  NexusTablePagination,
  NexusTableEmpty
} from '@/themes/nexustheme/components';

function UsersTable({ users, currentPage, totalPages }) {
  if (users.length === 0) {
    return (
      <NexusTable>
        <NexusTableEmpty
          icon={<Users className="h-10 w-10" />}
          title="No users found"
          description="Add your first user to get started."
          action={<Button>Add User</Button>}
        />
      </NexusTable>
    );
  }

  return (
    <NexusTable variant="default">
      <NexusTableToolbar
        searchSlot={<Input placeholder="Search users..." />}
        actionSlot={<Button>Add User</Button>}
      />

      <NexusTableHeader>
        <NexusTableRow>
          <NexusTableHead sortable sorted="asc">Name</NexusTableHead>
          <NexusTableHead>Email</NexusTableHead>
          <NexusTableHead>Role</NexusTableHead>
          <NexusTableHead align="right">Status</NexusTableHead>
        </NexusTableRow>
      </NexusTableHeader>

      <NexusTableBody>
        {users.map((user) => (
          <NexusTableRow key={user.id} clickable>
            <NexusTableCell className="font-medium">{user.name}</NexusTableCell>
            <NexusTableCell truncate>{user.email}</NexusTableCell>
            <NexusTableCell>{user.role}</NexusTableCell>
            <NexusTableCell align="right">
              <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                {user.status}
              </Badge>
            </NexusTableCell>
          </NexusTableRow>
        ))}
      </NexusTableBody>

      <NexusTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </NexusTable>
  );
}
```

## Completado ✅

1. ✅ **Metric Cards** - NexusMetricCard y NexusSimpleMetricCard con gradientes y container queries
2. ✅ **Page Shell** - NexusPageShell con variants, actions y badges
3. ✅ **Empty States** - NexusEmptyState con 3 variantes visuales
4. ✅ **Loading States** - 5 componentes de loading con gradient shimmer
5. ✅ **Specialized Templates** - Metric templates para users, orders, payments, subscriptions
6. ✅ **Enhanced Descriptions** - Mejores descripciones en todos los page templates
7. ✅ **Table System** - Sistema completo con 11 componentes:
   - NexusTable, Header, Body, Row, Head, Cell, Footer, Caption
   - NexusTablePagination con controles prev/next
   - NexusTableToolbar para search/filters/actions
   - NexusTableEmpty para estados sin datos

## Próximos pasos

1. **Dashboard widgets** - Mejorar visual hierarchy de los módulos del dashboard
2. **Form components** - Componentes de formulario con estilo Nexus
3. **Toast/Alert variants** - Notificaciones con estilo moderno
4. **Badge/Tag components** - Badges y tags con variantes
