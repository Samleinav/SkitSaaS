# Skill: create-form

Crea un nuevo BuildForm en SkitSaaS — el sistema estándar de formularios SDK-first.

## Instrucciones

El usuario te dará contexto sobre el formulario a crear (área, campos, acción servidor, etc.). Tú debes:

1. Leer los archivos relevantes antes de editar.
2. Crear o modificar solo los archivos necesarios.
3. Seguir el orden de rollout recomendado.
4. No inventes campos ni lógica de negocio que el usuario no haya especificado.

---

## Sistema BuildForm — referencia rápida

### Imports principales

```ts
// Contrato SDK (cliente + servidor)
import {
  defineBuildForm,
  composeBuildFormDefinition,
  buildFormField,
  withBuildFormValues,
  withBuildFormValidation,
  defineValidatedBuildForm,
  buildFormValidationPreset,
  buildFormRule,
  dbRef,
  fieldRef
} from '@skitsaas/sdk'

// Renderer — core/host (source-host modules)
import { BuildForm } from '@/components/ui/build-form'
import { BuildModal } from '@/components/ui/build-modal'

// Validación servidor
import {
  createValidatedServerActionController
} from '@skitsaas/sdk/server'
```

---

## Estructura de un formulario completo

### 1. Definición del formulario (SDK)

```ts
// Puede vivir en la misma página o en un archivo separado como create-user-form.ts
import { defineBuildForm, buildFormField } from '@skitsaas/sdk'

export const createItemForm = defineBuildForm({
  id: 'admin-create-item',         // stable ID — requerido para preflight
  title: 'Crear elemento',
  description: 'Crea un nuevo elemento.',
  request: {
    action: createItemAction,
    method: 'post'
  },
  layout: { columns: 2 },
  fields: [
    buildFormField.text({
      name: 'name',
      label: 'Nombre',
      placeholder: 'Mi elemento',
      required: true
    }),
    buildFormField.textarea({
      name: 'description',
      label: 'Descripción',
      rows: 3,
      colSpan: 2
    }),
    buildFormField.select({
      name: 'status',
      label: 'Estado',
      defaultValue: 'active',
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' }
      ]
    }),
    buildFormField.checkbox({
      name: 'isPublic',
      label: '¿Público?',
      checkedValue: 'true',
      uncheckedValue: 'false'
    })
  ],
  submit: {
    idleLabel: 'Crear',
    pendingLabel: 'Creando...'
  }
})
```

### 2. Tipos de campos disponibles

| Builder | Input |
|---------|-------|
| `buildFormField.text(...)` | `<input type="text">` |
| `buildFormField.email(...)` | `<input type="email">` |
| `buildFormField.password(...)` | `<input type="password">` |
| `buildFormField.tel(...)` | `<input type="tel">` |
| `buildFormField.url(...)` | `<input type="url">` |
| `buildFormField.number(...)` | `<input type="number">` |
| `buildFormField.textarea(...)` | `<textarea>` |
| `buildFormField.select(...)` | `<select>` con `options` |
| `buildFormField.checkbox(...)` | `<input type="checkbox">` |
| `buildFormField.hidden(...)` | `<input type="hidden">` |

Opciones comunes: `name`, `label`, `description`, `placeholder`, `required`, `disabled`, `readOnly`, `defaultValue`, `colSpan`, `className`, `inputClassName`.

### 3. Renderizado en página

```tsx
// app/(dashboard)/admin/items/create/page.tsx
import { BuildForm } from '@/components/ui/build-form'
import { createItemForm } from './create-item-form'

export default function CreateItemPage() {
  return <BuildForm definition={createItemForm} />
}
```

---

## Formulario de edición (con prefill)

```ts
import { withBuildFormValues } from '@skitsaas/sdk'

// En el server component, cargar datos y aplicar valores
const baseEditForm = defineBuildForm({ ... })

const form = withBuildFormValues(baseEditForm, {
  name: item.name,
  description: item.description ?? '',
  status: item.status,
  isPublic: item.isPublic ? 'true' : 'false'
})

// Renderizar
<BuildForm definition={form} />
```

---

## Formulario con validación

### Validación local (browser-safe)

```ts
import { defineValidatedBuildForm, buildFormRule, buildFormValidationPreset } from '@skitsaas/sdk'

export const createItemForm = defineValidatedBuildForm(
  defineBuildForm({ ... }),
  {
    preset: buildFormValidationPreset.blur(),  // validateOn: ['blur']
    fields: {
      name:        [buildFormRule.required(), buildFormRule.minLength(3)],
      email:       [buildFormRule.required(), buildFormRule.email()],
      password:    [buildFormRule.required(), buildFormRule.minLength(8)],
      confirmPass: [buildFormRule.required(), buildFormRule.confirmed('password')]
    }
  }
)
```

### Validación con DB (preflight + servidor)

```ts
import { buildFormRule, dbRef, fieldRef, buildFormValidationPreset } from '@skitsaas/sdk'

// Para crear: unique check
fields: {
  email: [
    buildFormRule.required(),
    buildFormRule.email(),
    buildFormRule.unique(dbRef('core.users.email'))  // preflight + server
  ]
}

// Para editar: ignorar el registro actual
fields: {
  email: [
    buildFormRule.required(),
    buildFormRule.email(),
    buildFormRule.unique(dbRef('core.users.email'), { ignore: fieldRef('userId') })
  ]
}
```

Si se usa `dbRef(...)`, agregar a `lib/forms/db-registry.ts`:
```ts
'core.my-table.field': async ({ value }) => {
  const exists = await db.select()...
  return exists.length === 0  // true = pasa la validación unique
}
```

Y registrar en `lib/forms/registry-catalog.ts` si `preflight.enabled = true`.

---

## Acción servidor validada

```ts
// app/(dashboard)/admin/items/actions.ts
'use server'
import { createValidatedServerActionController } from '@skitsaas/sdk/server'
import { createItemForm } from './create-item-form'

const controller = createValidatedServerActionController(createItemForm)

export const createItemAction = controller.action(async ({ values, formData }) => {
  // values ya están validados
  await db.insert(items).values({ name: values.name, ... })
  return { success: true }
})
```

---

## Modal (dialog)

```ts
import { defineBuildModal } from '@skitsaas/sdk'
import { BuildModal } from '@/components/ui/build-modal'

// Modal con formulario adentro
const createModal = defineBuildModal({
  kind: 'dialog',
  title: 'Crear elemento',
  triggerLabel: 'Nuevo elemento',
  content: <BuildForm definition={createItemForm} />
})

// En la página
<BuildModal definition={createModal} />
```

## Modal confirm/delete

```ts
const deleteModal = defineBuildModal({
  kind: 'confirm',
  title: '¿Eliminar elemento?',
  description: 'Esta acción no se puede deshacer.',
  triggerLabel: 'Eliminar',
  triggerVariant: 'destructive',
  confirmLabel: 'Sí, eliminar',
  request: {
    action: deleteItemAction,
    method: 'post'
  }
})
```

O como `submit.confirm` dentro del formulario:

```ts
submit: {
  idleLabel: 'Eliminar',
  pendingLabel: 'Eliminando...',
  confirm: {
    title: '¿Eliminar?',
    description: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Sí, eliminar',
    cancelLabel: 'Cancelar'
  }
}
```

---

## `composeBuildFormDefinition` — atajo para request + values + submit

```ts
import { composeBuildFormDefinition } from '@skitsaas/sdk'

const form = composeBuildFormDefinition(baseForm, {
  request: { action: createItemAction, method: 'post' },
  submit:  { idleLabel: 'Guardar', pendingLabel: 'Guardando...' },
  values:  { name: item.name, status: item.status }
})
```

---

## Checklist de implementación

- [ ] Definir `formId` estable (ej. `'admin-create-item'`)
- [ ] Usar `defineBuildForm(...)` o `defineValidatedBuildForm(...)` en un archivo separado
- [ ] Elegir campos con `buildFormField.*(...)`
- [ ] Crear server action con `createValidatedServerActionController`
- [ ] Renderizar con `<BuildForm definition={...} />`
- [ ] Si usa prefill: `withBuildFormValues(form, data)`
- [ ] Si usa `dbRef(...)`: agregar resolver en `lib/forms/db-registry.ts`
- [ ] Si `preflight.enabled = true`: registrar en `lib/forms/registry-catalog.ts`
- [ ] Si es destructivo: agregar `submit.confirm` o usar `BuildModal kind='confirm'`
- [ ] Verificar que funciona con JS deshabilitado

---

## Archivos clave

- `app/sdk/src/forms.ts` — contrato SDK
- `app/sdk/src/form-validation.ts` — reglas de validación
- `lib/forms/registry-catalog.ts` — catálogo de formularios con preflight
- `lib/forms/db-registry.ts` — resolvers DB para `dbRef(...)`
- `lib/forms/registry.ts` — runtime de registro
- `components/ui/build-form.tsx` — renderer principal
- `components/ui/build-modal.tsx` — renderer modal
- `docs/core/form-build-system.md` — documentación completa

## Rollout recomendado

1. `create` — más fácil, sin prefill
2. `edit/profile` — añade `withBuildFormValues` y `fieldRef` ignore
3. `settings/update` — formularios agrupados en secciones
4. `delete/confirm` — flujos destructivos con `submit.confirm`
5. Formularios con client state pesado — solo si los anteriores están estables

---

## Ejecutar ahora

Lee el request del usuario y ejecuta los pasos necesarios. Si faltan datos (campos, acción servidor, área), dedúcelos del contexto o pregunta solo lo imprescindible.
