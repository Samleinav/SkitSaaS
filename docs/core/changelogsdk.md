---
title: SDK Change Log
sidebar_position: 99
---

# SDK Change Log (`changelogsdk.md`)

Registro operativo de gaps y cambios aplicados al SDK antes de publicarlos.

Objetivo:
- no perder cambios de contrato SDK hechos para destrabar modulos
- facilitar documentacion/publicacion posterior
- mantener trazabilidad por sprint

## Regla de uso

Cada vez que aparezca un SDK-gap durante implementacion de modulos:
1. registrar el gap en este archivo
2. registrar el cambio aplicado (si se implementa)
3. marcar estado de publicacion (`pending_publish` o `published`)

## Formato de entrada

```md
## YYYY-MM-DD - <id corto>

- `status`: pending_publish | published
- `sprint`: sprint-x
- `module`: mod.algo
- `type`: gap | change
- `summary`: descripcion corta
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server | @skitsaas/sdk/db
- `files`: rutas clave tocadas
- `notes`: contexto/impacto
```

## Entries

## 2026-03-05 - sdk-standalone-contract-consumption

- `status`: pending_publish
- `sprint`: sprint-3
- `module`: mod.education.guardians
- `type`: change
- `summary`: consumo local del SDK con contratos standalone (`ModuleUserRole`, `userRoles`, `standaloneHomeComponent`, `standaloneNavItems`) para evitar imports directos al core
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `package.json`
  - `pnpm-lock.yaml`
  - `app/sdk/src/modules/manifest.ts` (contrato base ya presente)
  - `app/sdk/src/index.ts` (re-export de tipos)
- `notes`: la app ahora resuelve `@skitsaas/sdk` desde `file:app/sdk` en esta rama para desarrollar/publicar el cambio sin acoplar modulos al host

## 2026-03-05 - sdk-gap-log-policy

- `status`: pending_publish
- `sprint`: sprint-3
- `module`: cross-module-policy
- `type`: change
- `summary`: se establece politica de registrar todo SDK-gap/cambio en `docs/core/changelogsdk.md`
- `sdk_surface`: process
- `files`:
  - `docs/core/changelogsdk.md`
  - `plans/education-system/reference/module-boundary-guardrails.md`
  - `.agents/skills/module-boundary-guard/SKILL.md`
- `notes`: obligatorio para futuras iteraciones de sprints modulares

## 2026-03-05 - sdk-datatable-ui-export

- `status`: pending_publish
- `sprint`: sprint-5
- `module`: mod.education.attendance
- `type`: change
- `summary`: se agrega `DataTable` React al SDK para que modulos puedan renderizar tablas sin importar componentes del host
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/ui/data-table.tsx`
  - `app/sdk/src/ui/index.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/package.json`
  - `app/sdk/dist/*`
- `notes`: cierra el gap de UI tables para modulos source-host y evita imports directos a `@/components/ui/data-table`

## 2026-03-05 - sdk-gap-module-file-export

- `status`: pending_publish
- `sprint`: sprint-5
- `module`: mod.education.attendance
- `type`: gap
- `summary`: falta un contrato SDK para generacion/export de archivos de modulo hacia `mod.files` (pdf/listas/reportes)
- `sdk_surface`: @skitsaas/sdk/server
- `files`:
  - `docs/core/changelogsdk.md`
  - `mod.education.attendance`
- `notes`: hoy el modulo no puede subir un PDF a `mod.files` sin importar codigo directo del host o del modulo `mod.files`; requiere adapter o contrato de file storage en SDK/server

## 2026-03-05 - sdk-file-storage-adapter

- `status`: pending_publish
- `sprint`: sprint-5
- `module`: mod.education.attendance
- `type`: change
- `summary`: se agrega adapter de file storage a `@skitsaas/sdk/server` para subir archivos y resolver URLs firmadas desde modulos
- `sdk_surface`: @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/dist/server.*`
  - `lib/modules/sdk-server-bootstrap.ts`
  - `app/sdk/README.md`
- `notes`: el host conecta el adapter con `mod.files/src/service.ts`; esto destraba exportes PDF/reportes sin imports directos entre modulos

## 2026-03-05 - sdk-route-context-matched-alias

- `status`: pending_publish
- `sprint`: sprint-6
- `module`: mod.education.enrollment
- `type`: change
- `summary`: `ModuleRouteContext` expone `matchedAlias` para que un modulo distinga la alias amigable usada al entrar y pueda resolver dashboards multipath sin imports al host
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/modules/manifest.ts`
  - `app/sdk/dist/modules/manifest.*`
  - `lib/modules/runtime.ts`
  - `tests/modules/module-runtime.test.ts`
- `notes`: cierra el gap donde `resolveModulePageByPath()` resolvia la alias pero no la entregaba al handler; necesario para aliases como `/dashboard/enrollments` y `/dashboard/enrollment-reports` dentro del mismo modulo

## 2026-03-06 - sdk-client-notify-bridge

- `status`: pending_publish
- `sprint`: sprint-6
- `module`: cross-module-polish
- `type`: change
- `summary`: se agrega superficie cliente de notify en SDK con bridge por `CustomEvent` hacia el `NotifyProvider` del host para feedback/toasts en modulos sin imports directos al core
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/ui/notify.ts`
  - `app/sdk/src/ui/index.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/dist/*`
  - `components/ui/sdk-notify-bridge.tsx`
  - `app/layout.tsx`
- `notes`: permite a modulos cliente emitir `notify.success|error|warning|info` desde `@skitsaas/sdk`; el host resuelve la visualizacion real

## 2026-03-06 - sdk-structured-form-builder

- `status`: pending_publish
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agrega contrato estructurado de forms/modals al SDK con helpers de fields, prefills, request config y masks reutilizables
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/dist/forms.*`
  - `app/sdk/dist/index.*`
  - `app/sdk/README.md`
  - `docs/sdk/00-overview.md`
  - `docs/core/form-build-system.md`
  - `docs/modules/14-template-controller.md`
- `notes`: el host ahora puede renderizar forms consistentes desde definiciones SDK usando `TemplateBuildForm`, `BuildModal` y `ui.form`; el rollout inicial ya cubre core y `mod.example.suite`

## 2026-03-06 - sdk-build-form-validation-contract

- `status`: pending_publish
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agrega la primera capa de validacion estructurada para BuildForm con contrato canónico, runtime local browser-safe y helpers server-side de normalizacion/resultado
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/server.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/dist/form-validation.*`
  - `app/sdk/dist/server.*`
  - `app/sdk/dist/index.*`
  - `app/sdk/README.md`
  - `docs/sdk/00-overview.md`
- `notes`: cubre reglas comunes (`required`, `email`, `minLength`, `confirmed`, etc.), `dbRef`/`fieldRef`, resultados normalizados y fix de repeated fields en `FormData`; `unique`/`exists` quedan declarados pero todavia requieren compiler server/preflight para ser autoritativos

## 2026-03-07 - sdk-build-form-validation-messages

- `status`: pending_publish
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agregan helpers SDK para parseo y descriptores de mensajes de validacion reutilizables, dejando el copy final e i18n en el host
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/validation-messages.ts`
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/dist/validation-messages.*`
  - `app/sdk/dist/form-validation.*`
  - `app/sdk/dist/forms.*`
  - `app/sdk/dist/index.*`
  - `app/sdk/README.md`
  - `docs/sdk/00-overview.md`
  - `docs/core/form-build-system.md`
  - `app/(dashboard)/admin/users/actions.ts`
  - `app/(dashboard)/admin/users/validation.ts`
- `notes`: expone `normalizeEmail`, `parseOptionalPositiveInt`, `buildFormValidationMessage.*`, `createCatalogBuildFormValidationMessageResolver(...)` y `createBuildFormValidationResultFromFieldMessages(...)`; el piloto `admin/users` ahora usa descriptores y resolver por locale para evitar strings hardcodeados en actions

## 2026-03-07 - sdk-build-form-compose-presets

- `status`: pending_publish
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agregan helpers SDK para componer definiciones de forms y presets de validacion CRUD sin repetir request/prefills/submit ni bloques `client.validateOn`
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/dist/forms.*`
  - `app/sdk/dist/form-validation.*`
  - `app/sdk/dist/index.*`
  - `app/sdk/README.md`
  - `docs/sdk/00-overview.md`
  - `docs/core/form-build-system.md`
  - `app/(dashboard)/admin/users/create-user-form.tsx`
  - `app/(dashboard)/admin/users/[userId]/page.tsx`
  - `modules/mod.example.suite/README.md`
- `notes`: expone `composeBuildFormDefinition(...)` y `buildFormValidationPreset.blur(...)`; el host añade `composeRegisteredBuildFormDefinition(...)` para acoplar `formId` registrado con submit action canónica

## 2026-03-06 - sdk-build-form-vine-server-wrapper

- `status`: pending_publish
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agrega validacion server-side con VineJS y wrapper reutilizable de server actions para BuildForm
- `sdk_surface`: @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/package.json`
  - `app/sdk/dist/*`
  - `lib/actions/controller.ts`
  - `app/(dashboard)/admin/controller.ts`
  - `app/(dashboard)/dashboard/controller.ts`
- `notes`: incorpora `validateBuildFormOnServer(...)`, `createValidatedServerActionController(...)`, mapeo de errores VineJS a `fieldErrors/formError`, y deja un piloto en `mod.example.suite`; la hidratacion via `useActionState` sigue pendiente

## 2026-03-06 - sdk-build-form-db-preflight

- `status`: pending_publish
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agregan reglas DB-aware (`unique` / `exists`), preflight generico por API y compatibilidad completa con `useActionState` para hidratar errores server-side en BuildForm
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/dist/*`
  - `components/ui/build-form.tsx`
  - `lib/forms/db-registry.ts`
  - `lib/forms/preflight.ts`
  - `lib/forms/registry.ts`
  - `app/api/forms/validate/route.ts`
  - `app/(dashboard)/admin/users/forms.ts`
  - `app/(dashboard)/admin/users/actions.ts`
- `notes`: `BuildForm` ahora soporta preflight AJAX por field con debounce/cancelacion, el host resuelve `dbRef(...)` mediante un adapter server-side, y `/admin/users` ya usa `unique(core.users.email)` + `exists(core.subscription_templates.user)` como piloto core
