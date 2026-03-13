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

Nota:
- este archivo conserva tanto cambios publicados como notas historicas de implementacion
- algunos snippets viejos muestran patrones que ya no son la guia preferida
- para el contrato vigente, tomar como fuente de verdad `docs/sdk/00-overview.md` y `docs/modules/07-api-modules.md`

---

## 2026-03-13 - sdk-routing-builder-lazy-next-server-import

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: Route builder role guards no longer import `next/server` eagerly, so source-package contract tests can import compiled manifests in plain Node without resolving Next runtime helpers up front.
- `sdk_surface`: `@skitsaas/sdk`
- `files`:
  - `app/sdk/src/routing/builder.ts`
  - `app/sdk/package.json`
  - `docs/reference/05-sdk-changelog.md`
- `notes`: |
    SDK v1.7.0 -> v1.7.1 (PATCH).

    `RouteBuilder.roles(...)` still returns the same runtime guard behavior, but
    the SDK now defers the Next runtime import until the guard actually runs and
    uses the Node-resolvable `next/server.js` entry. This keeps source-package
    contract tests plain-Node-safe when they only need to import a compiled
    module manifest and inspect its exported shape.

## 2026-03-13 - sdk-page-route-roles-and-bootstrap-hardening

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: Page and portal routes now support SDK `.roles(...)` guards, while host routing bootstrap was hardened so modules no longer need to import `@/lib/routing/area-setup` in `routes.ts`.
- `sdk_surface`: `@skitsaas/sdk`
- `files`:
  - `app/sdk/src/routing/builder.ts`
  - `app/sdk/src/routing/index.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/src/routing/api-route.ts`
  - `app/sdk/src/routing/portal.ts`
  - `lib/routing/area-setup.ts`
  - `core/api-routes.ts`
  - `lib/modules/registry.ts`
  - `lib/portals/all-portals.ts`
  - `lib/routing/with-api-route.ts`
- `notes`: |
    SDK v1.6.0 -> v1.7.0 (MINOR).

    Goal: remove a routing/bootstrap leak that forced module `routes.ts` files
    to import host internals just to get auth/role middleware wired correctly.

    New behavior:
    - page and portal route builders support `.roles('teacher', 'owner')`
    - host wires the actual DB-backed middleware through
      `configureRouteBuilderProxies({ roleCheck })`
    - typed API routes now fail closed when `.roles(...)` is declared but the
      host forgot to configure the role guard
    - host bootstrap now runs from host entrypoints used by middleware, module
      registry, portal registry, and API dispatchers

## 2026-03-13 - sdk-build-form-runtime-bridge

- `status`: published
- `sprint`: sprint-b
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: BuildForm now supports a host runtime bridge for source-package parity. The SDK adds `BuildFormUiAdapterProvider` for client render delegation and `TemplateBuildForm` plus `configureBuildFormUiTemplateResolver(...)` for host `ui.form` payload resolution.
- `sdk_surface`: `@skitsaas/sdk`, `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/ui/build-form-contract.ts`
  - `app/sdk/src/ui/build-form-adapter.tsx`
  - `app/sdk/src/ui/build-form-template-resolver.ts`
  - `app/sdk/src/ui/template-build-form.tsx`
  - `app/sdk/src/ui/build-form.tsx`
  - `app/sdk/src/ui/index.ts`
  - `app/sdk/src/index.ts`
  - `app/sdk/src/server.ts`
  - `components/ui/sdk-build-form-provider.tsx`
  - `lib/modules/sdk-server-bootstrap.ts`
- `notes`: |
    SDK v1.5.0 -> v1.6.0 (MINOR).

    Goal: keep source-package modules fully SDK-only while still allowing host
    parity when loaded inside SkitSaaS.

    Runtime split:
    - client: `BuildFormUiAdapterProvider` lets the host render SDK `BuildForm`
      instances through the host renderer
    - server: `TemplateBuildForm` asks the host for `ui.form` template payload
      metadata via `configureBuildFormUiTemplateResolver(...)`

    Fallback remains mandatory: if no adapter/resolver is configured, SDK
    `BuildForm` continues using its own renderer.

## 2026-03-11 - sdk-richuser-multirole-routing

- `status`: published
- `sprint`: sprint-b
- `module`: core
- `type`: change
- `summary`: RichUser pattern + multi-role API routing. `enrichUser(user)` replaces all hardcoded role-string comparisons. `lib/runtime-config/roles.ts` deleted. `.roles('owner','teacher')` on API route builder.
- `sdk_surface`: `@skitsaas/sdk`, `@skitsaas/sdk/server`
- `files`:
  - `app/sdk/src/user-roles.ts` (new)
  - `app/sdk/src/routing/api-route.ts` (roles?, roleCheck, .roles() builder)
  - `app/sdk/src/index.ts` (enrichUser + types)
  - `app/sdk/src/server.ts` (configureUserRoles, configureUserContext, enrichUser)
  - `lib/auth/current-user.ts` (new — getCurrentUser, requireCurrentUser)
  - `lib/auth/contexts.ts` (UserContext re-exported from SDK)
  - `lib/routing/proxies.ts` (proxyApiRoles factory, enrichUser replaces getAdminAreaRoles)
  - `lib/routing/area-setup.ts` (roleCheck injected)
  - `lib/modules/sdk-server-bootstrap.ts` (configureUserRoles + configureUserContext)
  - `lib/runtime-config/roles.ts` (deleted)
- `notes`: |
    SDK v1.4.0 → v1.5.0 (MINOR).

    owner ≠ admin: default adminAreaRoles=['admin'], dashboardAreaRoles=['member','owner'].
    owner is team-level; admin is system-level. Never overlap.

    enrichUser() available client-side from @skitsaas/sdk (adapter not configured = uses defaults).
    getContext() server-side only (throws if called before configureUserContext).

    Multi-role routing: .auth('user').roles('owner','teacher') → proxyApiRoles runs after auth proxy.
    Requires configureApiAuthProxies({ roleCheck }) — wired in area-setup.ts.

---

## 2026-03-10 - sdk-gap-subscription-quota-controller

- `status`: published
- `sprint`: sprint-a
- `module`: cross-module-policy
- `type`: gap
- `summary`: no existe adapter SDK para que módulos verifiquen features habilitadas, lean límites de quota del plan asignado, ni trackeen y consuman usage — todo sin importar host internals
- `sdk_surface`: @skitsaas/sdk/server
- `files`:
  - `docs/reference/05-sdk-changelog.md`
  - `.agents/skills/mod-routing-api-permissions/SKILL.md`
- `notes`: |
    El gap cubre tres necesidades distintas que hoy no tienen contrato SDK:

    1. **Feature check** — ¿está habilitada la feature X para este team/user en su plan?
       Hoy: `getDashboardFeatureController` (host-only, forbidden en módulos).

    2. **Quota limit read** — ¿cuál es el límite del plan? (ej: pro=100/day, free=5/day)
       Hoy: no existe surface SDK.

    3. **Usage tracking** — ¿cuánto ha consumido este team en el periodo actual?
       Reducir usage en tres momentos distintos:
       - **intent** (proxy/middleware): reduce al entrar, bloquea si ya excedió
       - **success-only** (handler): reduce solo si la operación tuvo éxito
       - **async** (post-process): reduce después de un evento completado

    Workaround actual: usar `getModuleConfigValue` para feature flags module-owned
    bajo namespace `module.<moduleId>.*`, pero no resuelve quotas de suscripción.

    Implementado en SDK v1.4.0. Ver sección "Plan de implementación" para diseño completo.

    Archivos creados/modificados:
    - `app/sdk/src/subscription-features.ts` — adapter interface + types + service locator + checkFeature/getQuotaStatus/consumeQuota
    - `app/sdk/src/server.ts` — re-exports configureSubscriptionFeatures, checkFeature, getQuotaStatus, consumeQuota, QuotaExceededError
    - `app/sdk/src/index.ts` — re-exports public types (QuotaContext, FeatureCheckResult, QuotaStatus, ConsumeOptions, ConsumeResult, QuotaExceededError)
    - `lib/db/migrations/0027_quota_usage.sql` — tabla quota_usage
    - `lib/db/schema.ts` — quotaUsage table + relations + type exports
    - `lib/quota/service.ts` — implementación host del adapter (queries subscription_template_features + subscription_assignments + quota_usage)
    - `lib/modules/sdk-server-bootstrap.ts` — registra configureSubscriptionFeatures(quotaAdapter)

---

## Plan de implementación: sdk-gap-subscription-quota-controller

Nota historica:
- esta seccion preserva el plan original del gap
- los ejemplos usan `createModuleApiRouter(...)` porque fueron escritos antes de que `apiRoutes` tipados fuera la ruta preferida
- para implementaciones nuevas, usar `RouteApi(...).METHOD()` mas `apiRoutes` en el manifiesto salvo que se este documentando un flujo legacy

### Adapter interface (host-side)

```ts
// app/sdk/src/subscription-features.ts

export interface SubscriptionFeaturesAdapter {
  /** ¿Está habilitada la feature y cuál es su límite? null = sin límite */
  getFeatureLimit(
    featureKey: string,
    ctx: QuotaContext
  ): Promise<{ enabled: boolean; limit: number | null }>;

  /** Uso actual del periodo en curso */
  getUsage(
    featureKey: string,
    ctx: QuotaContext
  ): Promise<{ used: number; resetAt?: Date }>;

  /** Incrementar contador de uso. Retorna el nuevo total. */
  incrementUsage(
    featureKey: string,
    ctx: QuotaContext,
    amount: number
  ): Promise<{ used: number }>;
}

export type QuotaContext = {
  teamId?: number;
  userId?: number;
};
```

### SDK surface (`@skitsaas/sdk/server`)

```ts
// Configurar (host bootstrap, una vez)
configureSubscriptionFeatures(adapter: SubscriptionFeaturesAdapter): void

// Consultar desde módulo
checkFeature(featureKey: string, ctx: QuotaContext): Promise<FeatureCheckResult>
getQuotaStatus(featureKey: string, ctx: QuotaContext): Promise<QuotaStatus>
consumeQuota(featureKey: string, ctx: QuotaContext, options?: ConsumeOptions): Promise<ConsumeResult>

// Tipos
type FeatureCheckResult = {
  enabled: boolean;
  limit: number | null;    // null = sin límite
  remaining: number | null;
}

type QuotaStatus = {
  enabled: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt?: Date;
}

type ConsumeOptions = {
  amount?: number;  // default 1
}

type ConsumeResult = {
  ok: boolean;          // false si exceeded
  used: number;
  remaining: number | null;
  exceeded: boolean;
}
```

### Ejemplos de uso

#### 1. API endpoint con límites distintos por plan (pro=100/day, free=5/day)

```ts
// modules/mod.analytics/src/api/report.ts
import { getQuotaStatus, consumeQuota, requireUser } from '@skitsaas/sdk/server';

export const apiHandler = createModuleApiRouter({
  routes: [{
    method: 'POST',
    path: '/generate-report',
    auth: 'user',
    handler: async ({ user }) => {
      const quota = await getQuotaStatus('reports_daily', { teamId: user.teamId });

      // Feature deshabilitada en el plan
      if (!quota.enabled) {
        return Response.json({ error: 'feature_not_available' }, { status: 403 });
      }

      // Quota agotada (pro=100, free=5 — el límite viene del plan asignado)
      if (quota.remaining === 0) {
        return Response.json({
          error: 'quota_exceeded',
          limit: quota.limit,
          resetAt: quota.resetAt
        }, { status: 429 });
      }

      // Procesar
      const report = await generateReport(user.teamId);

      // Consumir quota SOLO si tuvo éxito
      await consumeQuota('reports_daily', { teamId: user.teamId });

      return Response.json({ ok: true, report });
    }
  }]
});
```

#### 2. Proxy / middleware: intent-based (reduce al entrar, bloquea si ya excedió)

```ts
// Útil para operaciones costosas donde el intento mismo consume (ej: llamadas a AI, SMS)
import { consumeQuota } from '@skitsaas/sdk/server';

handler: async ({ user, body }) => {
  // Consumir antes de procesar — si falla el handler, la quota ya se gastó
  const result = await consumeQuota('ai_requests_monthly', { teamId: user.teamId });

  if (!result.ok) {
    return Response.json({
      error: 'monthly_quota_exceeded',
      remaining: 0,
      resetAt: result.resetAt   // cuándo se resetea
    }, { status: 429 });
  }

  // Proceder — el crédito ya fue descontado
  const response = await callAiProvider(body.prompt);
  return Response.json({ ok: true, response });
}
```

#### 3. Event handler: consume quota después de un evento completado

```ts
// Útil para flujos asíncronos donde el consumo ocurre post-proceso
eventHandlers: [{
  id: 'mod.commerce.trackOrderQuota',
  hook: 'checkout.after_create_order',
  priority: 20,
  run: async (payload, context) => {
    // Solo consume si el pedido fue creado exitosamente
    if (payload.status === 'confirmed') {
      await consumeQuota('orders_monthly', { teamId: payload.teamId });
    }
  }
}]
```

#### 4. UI: mostrar badge de quota restante en dashboard

```tsx
// modules/mod.analytics/src/components/quota-badge.tsx
'use client'
// El componente recibe quotaStatus como prop (cargado server-side en el page handler)
// No llama a getQuotaStatus client-side — eso es server-only

export function QuotaBadge({ used, limit, remaining }) {
  const pct = limit ? Math.round((used / limit) * 100) : 0;
  return (
    <div>
      <span>{used} / {limit ?? '∞'}</span>
      {pct > 80 && <span className="text-warning">Cerca del límite</span>}
    </div>
  );
}
```

### Host-side: tabla de uso sugerida

```sql
-- lib/db/migrations/XXXX_quota_usage.sql
CREATE TABLE quota_usage (
  id          SERIAL PRIMARY KEY,
  feature_key VARCHAR(128) NOT NULL,
  team_id     INTEGER REFERENCES teams(id),
  user_id     INTEGER REFERENCES users(id),
  period_key  VARCHAR(32) NOT NULL,  -- ej: '2026-03', '2026-03-10'
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (feature_key, team_id, user_id, period_key)
);
```

### Archivos a crear/modificar

```
app/sdk/src/subscription-features.ts   (nuevo — adapter interface + service locator)
app/sdk/src/server.ts                   (agregar configure + check + get + consume)
app/sdk/src/index.ts                    (re-export tipos públicos: QuotaContext, QuotaStatus, etc.)
lib/modules/sdk-server-bootstrap.ts    (configurar adapter con queries del host)
lib/db/migrations/XXXX_quota_usage.sql (nueva tabla)
lib/quota/service.ts                   (implementación del adapter en el host)
docs/modules/08-notifications.md       (cross-ref — notificaciones por quota warnings)
docs/reference/05-sdk-changelog.md     (este archivo)
```

---

## Published

## 2026-03-09 - sdk-build-form-repeater-field

- `status`: published
- `sprint`: sprint-11
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: se agrega tipo de campo `repeater` al FormBuilder para tablas de filas dinámicas con add/remove, sub-campos tipados y lógica de `disableWhen` por fila
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/index.ts`
  - `components/ui/build-form.tsx`
  - `lib/forms/runtime.ts`
  - `app/(dashboard)/admin/subscriptions/forms.ts`
- `notes`: `BuildFormRepeaterFieldDefinition` con `subFields`, `addLabel`, `removeLabel`, `minRows`, `emptyRow`; serialización `{name}[]` + `{subField}_{rowId}`; rollout en `/admin/subscriptions`

## 2026-03-09 - sdk-build-form-dynamic-options

- `status`: published
- `sprint`: sprint-11
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: soporte de opciones dinámicas (`optionsKey` / `dynamicOptions`) en campos `select` del FormBuilder
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `components/ui/build-form.tsx`
  - `lib/forms/definition.ts`
- `notes`: `BuildFormSelectFieldDefinition.optionsKey`; `BuildFormDefinition.dynamicOptions`; `withBuildFormDynamicOptions(...)`

## 2026-03-10 - sdk-persisted-notifications

- `status`: published
- `sprint`: sprint-11
- `module`: cross-module-notifications
- `type`: change
- `summary`: sistema de notificaciones persistentes — targeting global/usuario/team, área privada, superficie SDK cliente y server
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/notifications/types.ts`
  - `app/sdk/src/ui/notifications.tsx`
  - `app/sdk/src/server.ts`
  - `lib/notifications/service.ts`
  - `app/api/notifications/`
  - `components/ui/notification-runtime.tsx`
- `notes`: `useNotifications()`, `notifyGlobal/User/Users/Team/TeamMembers/TeamOwner()`, area `auto|admin|dashboard|both`

## 2026-03-06 - sdk-build-form-db-preflight

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: reglas DB-aware (`unique` / `exists`), preflight AJAX por field, compatibilidad con `useActionState`
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/src/form-validation.ts`
  - `lib/forms/db-registry.ts`
  - `lib/forms/preflight.ts`
  - `app/api/forms/validate/route.ts`
- `notes`: `configureBuildFormDbValidation(...)`, `dbRef(...)`, `fieldRef(...)`; piloto en `/admin/users`

## 2026-03-07 - sdk-build-form-compose-presets

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: helpers para componer definiciones de forms y presets de validación CRUD
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
  - `app/sdk/src/form-validation.ts`
- `notes`: `composeBuildFormDefinition(...)`, `buildFormValidationPreset.blur(...)`; host añade `composeRegisteredBuildFormDefinition(...)`

## 2026-03-07 - sdk-build-form-validation-messages

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: helpers para mensajes de validación reutilizables y resolvers por locale
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/validation-messages.ts`
  - `app/sdk/src/form-validation.ts`
- `notes`: `normalizeEmail`, `parseOptionalPositiveInt`, `buildFormValidationMessage.*`, `createBuildFormValidationResultFromFieldMessages(...)`

## 2026-03-06 - sdk-build-form-validation-contract

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: primera capa de validación estructurada para BuildForm — runtime browser-safe y helpers server-side
- `sdk_surface`: @skitsaas/sdk | @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/form-validation.ts`
  - `app/sdk/src/server.ts`
- `notes`: reglas `required`, `email`, `minLength`, `confirmed`; `dbRef`/`fieldRef`; `unique`/`exists` declarados

## 2026-03-06 - sdk-build-form-vine-server-wrapper

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: validación server-side con VineJS y wrapper de server actions para BuildForm
- `sdk_surface`: @skitsaas/sdk/server
- `files`:
  - `app/sdk/src/server.ts`
  - `app/sdk/src/form-validation.ts`
- `notes`: `validateBuildFormOnServer(...)`, `createValidatedServerActionController(...)`; piloto en `mod.example.suite`

## 2026-03-06 - sdk-structured-form-builder

- `status`: published
- `sprint`: sprint-10
- `module`: cross-module-ui-contract
- `type`: change
- `summary`: contrato estructurado de forms/modals — fields, prefills, request config, masks
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/forms.ts`
- `notes`: `defineBuildForm`, `buildFormField.*`, `withBuildFormValues`, `defineBuildModal`

## 2026-03-06 - sdk-client-notify-bridge

- `status`: published
- `sprint`: sprint-6
- `module`: cross-module-polish
- `type`: change
- `summary`: superficie cliente de notify via `CustomEvent` hacia `NotifyProvider` del host — feedback/toasts sin imports directos
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/ui/notify.ts`
  - `components/ui/sdk-notify-bridge.tsx`
- `notes`: `notify.success|error|warning|info` desde `@skitsaas/sdk`

## 2026-03-05 - sdk-route-context-matched-alias

- `status`: published
- `sprint`: sprint-6
- `module`: mod.education.enrollment
- `type`: change
- `summary`: `ModuleRouteContext` expone `matchedAlias` para que un módulo distinga la alias amigable usada al entrar
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/modules/manifest.ts`
  - `lib/modules/runtime.ts`
  - `tests/modules/module-runtime.test.ts`
- `notes`: cierra gap donde `resolveModulePageByPath()` no entregaba la alias al handler

## 2026-03-05 - sdk-file-storage-adapter

- `status`: published
- `sprint`: sprint-5
- `module`: cross-module-files
- `type`: change
- `summary`: adapter de file storage completo en `@skitsaas/sdk/sfiles` — upload, list, get, getUrl, zip, permissions sin imports al host
- `sdk_surface`: @skitsaas/sdk/sfiles
- `files`:
  - `app/sdk/src/sfiles.ts`
  - `app/sdk/package.json` (entry `./sfiles`)
- `notes`: cierra `sdk-gap-module-file-export`; `ISfilesManager`, `SFilesAdapter`, service locator via `registerSfiles()`; módulos importan `{ sfiles } from '@skitsaas/sdk/sfiles'`

## 2026-03-05 - sdk-datatable-ui-export

- `status`: published
- `sprint`: sprint-5
- `module`: mod.education.attendance
- `type`: change
- `summary`: `DataTable` React exportado al SDK para que módulos rendericen tablas sin importar componentes del host
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `app/sdk/src/ui/data-table.tsx`
- `notes`: cierra gap de UI tables para módulos source-host

## 2026-03-05 - sdk-standalone-contract-consumption

- `status`: published
- `sprint`: sprint-3
- `module`: mod.education.guardians
- `type`: change
- `summary`: SDK resuelve desde `file:app/sdk` — módulos consumen contratos standalone sin acoplarse al host
- `sdk_surface`: @skitsaas/sdk
- `files`:
  - `package.json`
  - `app/sdk/src/modules/manifest.ts`
  - `app/sdk/src/index.ts`
- `notes`: `ModuleUserRole`, `userRoles`, `standaloneHomeComponent`, `standaloneNavItems`

## 2026-03-05 - sdk-gap-log-policy

- `status`: published
- `sprint`: sprint-3
- `module`: cross-module-policy
- `type`: change
- `summary`: política establecida: todo SDK-gap/cambio se registra en `docs/reference/05-sdk-changelog.md`
- `sdk_surface`: process
- `files`:
  - `docs/reference/05-sdk-changelog.md`
  - `.agents/skills/module-boundary-guard/SKILL.md`
- `notes`: obligatorio para futuras iteraciones de sprints modulares
