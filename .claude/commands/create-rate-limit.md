# Skill: create-rate-limit

Agrega rate limiting a un endpoint de API en SkitSaaS.

## Instrucciones

El usuario te dará contexto sobre el endpoint y la estrategia deseada. Tú debes:

1. Leer el archivo del endpoint antes de editar.
2. Elegir la estrategia correcta según el contexto (IP, usuario, plan, rol).
3. Elegir el import correcto según la regla SDK-first (ver abajo).
4. Nunca over-engineerear — si el default por IP alcanza, úsalo.

---

## Regla SDK-first — ¿De dónde importar?

| Contexto | Import correcto |
|----------|----------------|
| Módulo (source-package, prebuilt) | `import { withRateLimit } from '@skitsaas/sdk'` |
| Core host + módulo comparten la misma lógica | `import { withRateLimit } from '@skitsaas/sdk'` |
| Core host solo (y quiere userId de JWT gratis sin resolveContext) | `import { withRateLimit, checkRateLimit } from '@/lib/routing/rate-limit'` |
| Auth endpoints (login, callbacks) | `import { checkAuthRateLimit } from '@/lib/auth/rate-limit'` |

**Regla simple:** Usa `@skitsaas/sdk` siempre que sea posible. Usar `@/lib/routing/rate-limit` solo cuando necesites `resolveRateLimitContext()` (userId de JWT sin hook resolveContext).

---

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

`plan` requiere resolveContext (DB lookup). Válido en SDK y core.

```ts
import { withRateLimit } from '@skitsaas/sdk'
// source-package: importar del SDK; source-host: importar de @/lib/
import { getSession } from '@/lib/auth/session'
import { getUserActivePlanName } from '@/lib/db/queries'

export const POST = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:mi-endpoint`,
    limit: (ctx) => {
      const limits: Record<string, number> = { pro: 1000, basic: 200, free: 20 }
      return limits[ctx.plan ?? 'free'] ?? 20
    },
    windowSeconds: 3600,
    resolveContext: async (request) => {
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

`role` requiere resolveContext.

```ts
import { withRateLimit } from '@skitsaas/sdk'

export const GET = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:${ctx.endpoint}`,
    limit: (ctx) => (['admin', 'owner'].includes(ctx.role ?? '') ? 500 : 50),
    windowSeconds: 60,
    resolveContext: async (request) => {
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

`withRateLimit` y `withApiProxy` son wrappers independientes — rate limit primero (más barato):

```ts
import { withRateLimit } from '@skitsaas/sdk'
import { withApiProxy } from '@/lib/routing/with-api-proxy'
import { proxyApiAdmin } from '@/lib/routing/proxies'

export const POST = withRateLimit(
  { limit: 10, windowSeconds: 60 },           // 1. rate limit (rápido)
  withApiProxy([proxyApiAdmin], async (req) => { // 2. auth (DB)
    return Response.json({ ok: true })
  })
)
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
- `lib/auth/rate-limit.ts` — wrapper auth específico (`checkAuthRateLimit`, 10 req/min por IP)
- `lib/routing/with-api-proxy.ts` — se combina con withRateLimit
- `lib/routing/proxies.ts` — proxyApiAuth, proxyApiAdmin

---

## Checklist

- [ ] Elegir estrategia: IP / usuario / plan / rol / custom
- [ ] Elegir import: SDK (módulos + código compartido) vs host `@/lib/` (solo si necesitas JWT userId automático)
- [ ] Si usa `plan` o `role`: agregar `resolveContext` con el query correspondiente
- [ ] Poner `withRateLimit` antes de `withApiProxy` en la cadena (rate limit es más barato)
- [ ] Limits razonables: auth (5-10/min), API pública (20-50/min), API autenticada (100-1000/hora según plan)
- [ ] Para producción: configurar `configureRateLimitBackend` con Redis en el bootstrap

---

## Ejecutar ahora

Lee el endpoint indicado por el usuario y aplica la estrategia de rate limiting correcta.
