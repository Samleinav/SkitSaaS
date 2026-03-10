# Skill: create-rate-limit

Agrega rate limiting a un endpoint de API en SkitSaaS.

## Instrucciones

El usuario te dará contexto sobre el endpoint y la estrategia deseada. Tú debes:

1. Leer el archivo del endpoint antes de editar.
2. Elegir la estrategia correcta según el contexto (IP, usuario, plan, rol).
3. Elegir el import correcto según la regla SDK-first (ver abajo).
4. Nunca over-engineerear — si el default por IP alcanza, úsalo.

---

## Regla de independencia de módulos — CRÍTICO

Los módulos (`modules/<id>/src/`) deben ser **completamente independientes del core host**.

| Contexto | Imports permitidos | Imports PROHIBIDOS |
|----------|-------------------|-------------------|
| **Módulo source-package** | `@skitsaas/sdk`, `@skitsaas/sdk/server` | ❌ `@/lib/*` — todo |
| **Módulo source-host** | `@skitsaas/sdk` + `@/lib/` (pero rompe portabilidad) | Evitar `@/lib/` si el módulo puede ser source-package |
| **Core host (routes, api-routes, lib/)** | `@/lib/*`, `@skitsaas/sdk` | — |

**Para rate limiting en módulos:** usar `withRateLimit` de `@skitsaas/sdk` únicamente. El control de acceso por rol se hace vía `auth: 'admin'` + `roles: [...]` en `createModuleApiRouter`, NO con `withRateLimit` + `@/lib/`.

## Regla SDK-first — ¿De dónde importar?

| Contexto | Import correcto |
|----------|----------------|
| Módulo (source-package) | `import { withRateLimit } from '@skitsaas/sdk'` |
| Core host (quiere userId de JWT sin resolveContext) | `import { withRateLimit, checkRateLimit } from '@/lib/routing/rate-limit'` |
| Auth endpoints de core | `import { checkAuthRateLimit } from '@/lib/auth/rate-limit'` |

**Regla simple:** Si el código vive en `modules/`, sólo SDK. Si vive en `lib/` o `app/api/`, puede usar `@/lib/`.

---

## Defaults ya activos — verificar antes de agregar uno nuevo

Antes de crear un rate limit, verificar si el endpoint ya tiene uno por herencia:

| Scope | Límite | Activado en |
|-------|--------|-------------|
| Rutas `.auth('user')` (cualquier endpoint autenticado) | 60 req / 60 s por `userId` o IP | `lib/routing/area-setup.ts` automático |
| Form preflight `/api/forms/validate` | 30 req / 60 s por `userId` o IP | `sdk-server-bootstrap.ts` |
| Auth endpoints (`/api/auth/*/start`, `/api/auth/*/callback`) | 10 req / min por IP | `lib/auth/rate-limit.ts` |

Si el endpoint ya hereda un límite razonable, **no agregar otro** — sólo sobreescribir si la ruta necesita un límite más estricto o con lógica diferente.

## Sistema de rate limit — referencia rápida

### Estrategias disponibles

#### 1. Por IP + endpoint (default — sin configuración extra)

```ts
import { withRateLimit } from '@skitsaas/sdk'

export const POST = withRateLimit(
  { limit: 5, windowSeconds: 60 },
  async (request) => {
    return Response.json({ ok: true })
  }
)
```

#### 2. Por usuario autenticado

`userId` disponible en `@/lib/routing/rate-limit` vía JWT (sin DB). En SDK, usar `resolveContext` hook.

**Opción SDK (recomendada para módulos y código compartido):**

```ts
import { withRateLimit } from '@skitsaas/sdk'
// Si es módulo source-package:
import { getUser } from '@skitsaas/sdk/server'

export const POST = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:${ctx.endpoint}`,
    limit: 100,
    windowSeconds: 3600,
    resolveContext: async (request) => {
      // source-package: usar getUser() del SDK
      const user = await getUser()
      return { userId: user?.id }
    }
  },
  async (request) => {
    return Response.json({ ok: true })
  }
)
```

**Opción host (core-only, userId del JWT gratis):**

```ts
import { withRateLimit } from '@/lib/routing/rate-limit'
import { withApiProxy } from '@/lib/routing/with-api-proxy'
import { proxyApiAuth } from '@/lib/routing/proxies'

export const POST = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:${ctx.endpoint}`,
    limit: 100,
    windowSeconds: 3600
  },
  withApiProxy([proxyApiAuth], async (request) => {
    return Response.json({ ok: true })
  })
)
```

#### 3. Por plan de suscripción

`plan` requiere resolveContext (DB lookup).

**🟢 Módulo source-package (SDK only):**

```ts
import { withRateLimit } from '@skitsaas/sdk'
import { getUser, getAdminDb } from '@skitsaas/sdk/server'

export const POST = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:mi-endpoint`,
    limit: (ctx) => {
      const limits: Record<string, number> = { pro: 1000, basic: 200, free: 20 }
      return limits[ctx.plan ?? 'free'] ?? 20
    },
    windowSeconds: 3600,
    resolveContext: async () => {
      const user = await getUser()
      if (!user?.id) return {}
      const db = await getAdminDb()
      const row = await db.query.subscriptionAssignments.findFirst({
        where: (t, { eq }) => eq(t.userId, user.id),
        columns: { planSlug: true }
      })
      return { plan: row?.planSlug ?? 'free' }
    }
  },
  async (request) => {
    return Response.json({ ok: true })
  }
)
```

**🔵 Core host only (puede usar `@/lib/`):**

```ts
import { withRateLimit } from '@/lib/routing/rate-limit'
import { withApiProxy } from '@/lib/routing/with-api-proxy'
import { proxyApiAuth } from '@/lib/routing/proxies'
import { getSession } from '@/lib/auth/session'
import { getUserActivePlanName } from '@/lib/db/queries'

export const POST = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:mi-endpoint`,
    limit: (ctx) => ({ pro: 1000, basic: 200, free: 20 }[ctx.plan ?? 'free'] ?? 20),
    windowSeconds: 3600,
    resolveContext: async () => {
      const session = await getSession()
      if (!session?.user.id) return {}
      const plan = await getUserActivePlanName(session.user.id)
      return { plan: plan ?? 'free' }
    }
  },
  withApiProxy([proxyApiAuth], async (request) => {
    return Response.json({ ok: true })
  })
)
```

#### 4. Por rol (admin vs usuario regular)

> **Nota para módulos:** el control de acceso por rol se hace con `auth: 'admin'` + `roles: [...]` en `createModuleApiRouter`, no con rate limiting. El rate limit por rol aplica cuando quieres **límites distintos** para distintos roles (no bloqueo total).

**🟢 Módulo source-package (SDK only) — límites diferenciados por rol:**

```ts
import { withRateLimit } from '@skitsaas/sdk'
import { getUser } from '@skitsaas/sdk/server'

export const GET = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:${ctx.endpoint}`,
    // Comparar el rol directamente — no depender de @/lib/runtime-config/roles
    limit: (ctx) => (ctx.role === 'admin' || ctx.role === 'owner' ? 500 : 50),
    windowSeconds: 60,
    resolveContext: async () => {
      const user = await getUser()
      return { role: user?.role ?? undefined }
    }
  },
  async (request) => {
    return Response.json({ ok: true })
  }
)
```

**🔵 Core host only — usa `getAdminAreaRoles()` para respetar la config centralizada:**

```ts
import { withRateLimit } from '@/lib/routing/rate-limit'
import { withApiProxy } from '@/lib/routing/with-api-proxy'
import { proxyApiAuth } from '@/lib/routing/proxies'
import { getAdminAreaRoles } from '@/lib/runtime-config/roles'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/db/queries'

const adminRoles = getAdminAreaRoles() // lee de app.config.ts

export const GET = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:${ctx.endpoint}`,
    limit: (ctx) => (adminRoles.has(ctx.role ?? '') ? 500 : 50),
    windowSeconds: 60,
    resolveContext: async () => {
      const session = await getSession()
      if (!session?.user.id) return {}
      const user = await getUserById(session.user.id)
      return { role: user?.role ?? undefined }
    }
  },
  withApiProxy([proxyApiAuth], async (request) => {
    return Response.json({ ok: true })
  })
)
```

#### 5. Completamente custom (Redis, Upstash, lógica propia)

```ts
import { withRateLimit } from '@skitsaas/sdk'

export const POST = withRateLimit(
  async (ctx) => {
    const key = `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 60)
    return {
      limited: count > 50,
      retryAfterSeconds: count > 50 ? 60 : undefined
    }
  },
  async (request) => {
    return Response.json({ ok: true })
  }
)
```

#### 6. Composición: rate limit + auth proxy juntos

> 🔵 **Core host only** — `withApiProxy`, `proxyApiAdmin`, `proxyApiAuth` son `@/lib/`. En módulos, el auth se declara en el router (`auth: 'admin'`), no en el handler.

`withRateLimit` y `withApiProxy` son wrappers independientes — rate limit primero (más barato):

```ts
// 🔵 Core host only
import { withRateLimit } from '@skitsaas/sdk'
import { withApiProxy } from '@/lib/routing/with-api-proxy'
import { proxyApiAdmin } from '@/lib/routing/proxies'

export const POST = withRateLimit(
  { limit: 10, windowSeconds: 60 },              // 1. rate limit (sin DB — rápido)
  withApiProxy([proxyApiAdmin], async (req) => {  // 2. auth + JTI (DB)
    return Response.json({ ok: true })
  })
)
```

**Equivalente en módulo source-package** — el auth se declara en el router, rate limit es SDK puro:

```ts
// 🟢 Módulo source-package
// En manifest.ts / api-handler.ts:
createModuleApiRouter({
  routes: [
    {
      method: 'POST',
      path: '/items',
      auth: 'admin',           // auth manejado por el router, no por el handler
      handler: withRateLimit(  // rate limit SDK puro, sin @/lib/
        { limit: 10, windowSeconds: 60 },
        async ({ request }) => Response.json({ ok: true })
      )
    }
  ]
})
```

---

## Configurar backend distribuido (Redis/Upstash) — una vez en bootstrap

Para producción, configurar en `lib/modules/sdk-server-bootstrap.ts` o equivalente:

```ts
import { configureRateLimitBackend } from '@skitsaas/sdk'

// Cubre TODOS los withRateLimit del proyecto (core + todos los módulos)
configureRateLimitBackend(async (ctx) => {
  // ctx.customKey ya contiene la clave derivada por la config del endpoint
  const key = ctx.customKey ?? `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 60)
  return {
    limited: count > (ctx.plan === 'pro' ? 1000 : 50),
    retryAfterSeconds: 60
  }
})
```

Sin configurar: usa in-memory sliding window (funciona en single-instance / desarrollo).

---

## Qué está disponible en RateLimitContext

| Campo | Tipo | Disponible sin config | Fuente |
|-------|------|-----------------------|--------|
| `ip` | `string` | ✅ siempre | Headers (x-forwarded-for, cf-connecting-ip, etc.) |
| `endpoint` | `string` | ✅ siempre | `request.url` pathname |
| `method` | `string` | ✅ siempre | `request.method` |
| `userId` | `number?` | ⚠️ con resolveContext (SDK) o JWT decode automático (host) | SDK: hook; Host: JWT |
| `role` | `string?` | ❌ requiere `resolveContext` | DB lookup |
| `plan` | `string?` | ❌ requiere `resolveContext` | DB lookup (subscription_assignments) |
| `customKey` | `string?` | ❌ requiere `resolveContext` | lo que quieras |

---

## Archivos clave

- `@skitsaas/sdk` — `withRateLimit`, `checkRateLimit`, `configureRateLimitBackend`, `resolveClientIp` (SDK, disponible en todos los módulos)
- `lib/routing/rate-limit.ts` — wrapper host que agrega `resolveRateLimitContext` con userId de JWT
- `lib/routing/proxies.ts` — `proxyApiAuth`, `proxyApiAdmin`, **`proxyRateLimit(config)`** factory
- `lib/routing/area-setup.ts` — default rate limit en `.auth('user')` (60 req/60 s)
- `lib/auth/rate-limit.ts` — wrapper auth específico (`checkAuthRateLimit`, 10 req/min por IP)
- `lib/runtime-config/roles.ts` — `getAdminAreaRoles()` para limit diferenciado por rol
- `lib/routing/with-api-proxy.ts` — se combina con withRateLimit
- `lib/modules/sdk-server-bootstrap.ts` — configurar Redis backend + preflight rate limit

---

## Checklist

- [ ] ¿El endpoint está en un **módulo**? → Solo `@skitsaas/sdk`. Prohibido `@/lib/*`
- [ ] ¿El endpoint ya hereda un rate limit (`.auth('user')` o preflight)? → No agregar otro a menos que necesite límites distintos
- [ ] ¿El objetivo es bloquear por rol? → En módulos, usar `auth: 'admin'` + `roles` en el router, no withRateLimit
- [ ] Elegir estrategia: IP / usuario / plan / rol / custom
- [ ] Si usa `plan` o `role`: agregar `resolveContext` con el query correspondiente
- [ ] Poner `withRateLimit` antes de `withApiProxy` en la cadena (rate limit es más barato y sin DB)
- [ ] Limits razonables: auth (5-10/min), API pública (20-50/min), API autenticada (100-1000/hora según plan)
- [ ] Para producción: configurar `configureRateLimitBackend` con Redis en `sdk-server-bootstrap.ts`

---

## Ejecutar ahora

Lee el endpoint indicado por el usuario y aplica la estrategia de rate limiting correcta.
