# Skill: create-proxy

Crea una función proxy custom para el sistema de rutas de SkitSaaS.

## Instrucciones

El usuario te dará contexto sobre qué debe verificar el proxy (feature flag, plan activo, rate limit, permiso especial, etc.). Tú debes:

1. Leer `lib/routing/proxies.ts` antes de editar.
2. Agregar la función al final del archivo, manteniendo el estilo existente.
3. Si el proxy necesita lógica DB, usar dynamic imports como las funciones existentes.
4. Si es para API (retorna JSON), seguir el patrón `proxyApiAdmin`/`proxyApiAuth`.
5. Si es para páginas (retorna redirect), seguir el patrón `proxyAdmin`/`proxyAuth`.

---

## ¿Dónde aplica el sistema de proxies?

| Contexto | ¿Puede usar proxies custom? | Alternativa |
|----------|-----------------------------|-------------|
| Core host (`lib/routing/proxies.ts`) | ✅ Sí — aquí viven los proxies | — |
| Módulo source-host (routes.ts) | ✅ Sí — puede importar `@/lib/routing/proxies` | — |
| Módulo source-package | ❌ No puede importar `@/lib/` | Usar `auth`/`roles` en `createModuleApiRouter` |
| Rate limiting en módulo | ❌ No usar proxyRateLimit custom | `import { withRateLimit } from '@skitsaas/sdk'` |

Los proxies del sistema (`RouteProxyFn`) solo corren en `proxy.ts` (middleware). Para proteger **API route handlers** (no páginas), usar `withApiProxy` y `withRateLimit` directamente en el handler.

---

## Contrato RouteProxyFn

```ts
type RouteProxyFn = (request: NextRequest) => Promise<NextResponse | null>
// null        → pasar al siguiente proxy en la cadena (continuar)
// NextResponse → short-circuit: redirect, 401, 403, 404, etc.
```

El proxy **siempre retorna `null` si pasa** — nunca retorna `NextResponse.next()` directamente (eso lo hace `executeProxyChain` al final de la cadena).

---

## Patrones disponibles

### Proxy de página (redirect en fallo)

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { RouteProxyFn } from '@skitsaas/sdk';

/**
 * Requiere que el usuario tenga el feature flag activo.
 * Redirige a /dashboard si no lo tiene.
 */
export const proxyFeatureFlag = (flag: string): RouteProxyFn =>
  async (request: NextRequest) => {
    const cookieValue = request.cookies.get('session')?.value;
    if (!cookieValue) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Verificar sesión primero (proxyAuth ya corrió antes, pero se puede re-usar verifySessionCookie)
    // O acceder a datos de la sesión del request headers si el host los propaga

    // Ejemplo: leer feature flag desde DB
    const { db } = await import('@/lib/db/drizzle');
    const { userFeatureFlags } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');

    // Obtener userId del payload JWT (ya validado por proxyAuth anterior en la cadena)
    const userId = getUserIdFromRequest(request); // adaptar según cómo el host propaga el userId
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const row = await db
      .select()
      .from(userFeatureFlags)
      .where(and(eq(userFeatureFlags.userId, userId), eq(userFeatureFlags.flag, flag)))
      .limit(1);

    if (row.length === 0) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return null; // continuar
  };
```

### Proxy de API (JSON en fallo)

```ts
/**
 * Requiere un plan activo con acceso al feature.
 * Retorna 403 JSON si el plan no lo incluye.
 */
export const proxyRequiresPlan = (planFeature: string): RouteProxyFn =>
  async (request: NextRequest) => {
    // ... verificar plan ...
    if (!hasPlanFeature) {
      return NextResponse.json(
        { error: 'Your plan does not include this feature.' },
        { status: 403 }
      );
    }

    return null; // continuar
  };
```

### Proxy de rate limit (página o API)

```ts
/**
 * Rate limit básico por IP usando un header de conteo externo.
 * Para uso con CDN/WAF que inyecten X-RateLimit-Remaining.
 */
export const proxyRateLimit: RouteProxyFn = async (request: NextRequest) => {
  const remaining = request.headers.get('x-ratelimit-remaining');
  if (remaining !== null && parseInt(remaining, 10) <= 0) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: {
          'Retry-After': request.headers.get('x-ratelimit-reset') ?? '60'
        }
      }
    );
  }

  return null;
};
```

### Proxy de estado de módulo activo

```ts
/**
 * Verifica que el módulo esté activo en la DB antes de servir la ruta.
 * Retorna 404 si el módulo está desactivado.
 */
export const proxyModuleEnabled = (moduleId: string): RouteProxyFn =>
  async (_request: NextRequest) => {
    const { db } = await import('@/lib/db/drizzle');
    const { appModules } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');

    const row = await db
      .select({ enabled: appModules.enabled })
      .from(appModules)
      .where(and(eq(appModules.moduleId, moduleId), eq(appModules.enabled, true)))
      .limit(1);

    if (row.length === 0) {
      const { NextResponse } = await import('next/server');
      return new NextResponse('Not Found', { status: 404 });
    }

    return null;
  };
```

---

## Cómo registrar el proxy en una ruta

### En rutas core (`core/routes.ts`)

```ts
import { proxyFeatureFlag } from '@/lib/routing/proxies'

// Extra sobre proxyAdmin (que ya está como default de RouteAdmin):
RouteAdmin('/premium-section')
  .proxy([proxyFeatureFlag('premium')])
  .name('admin.premium-section')
```

### En rutas de módulo (`modules/<id>/src/routes.ts`)

```ts
import '@/lib/routing/area-setup'  // siempre primero
import { RouteAdmin } from '@skitsaas/sdk'
import { proxyModuleEnabled } from '@/lib/routing/proxies'

RouteAdmin('/custom/my-module')
  .proxy([proxyModuleEnabled('mod.my-module')])
  .name('my-module.admin.home')
```

### Para activar el proxy en `proxy.ts`

Si el módulo registra su ruta con proxy extra en su `routes.ts`, asegurarse de importar ese archivo en `lib/routing/all-routes.ts`:

```ts
// lib/routing/all-routes.ts
import '@/core/routes'
import '@/../modules/mod.my-module/src/routes'  // activa los proxy extras de este módulo
```

---

## Reglas de diseño

| Regla | Motivo |
|-------|--------|
| **Siempre retornar `null` si pasa** | `executeProxyChain` en `lib/routing/proxies.ts` aplica `NextResponse.next()` al final |
| **Dynamic imports para DB** | El proxy corre en Edge Runtime (proxy.ts) — los imports estáticos de DB pueden fallar |
| **Páginas → redirect, APIs → JSON** | UX: una API nunca debe redirigir al browser a `/sign-in` |
| **Proxies son inmutables** | `RouteBuilder.proxy([...])` retorna nueva instancia — no mutes el builder original |
| **No duplicar lógica de auth** | Si la ruta ya tiene `proxyAdmin` como default, no volver a verificar sesión en tu proxy custom — confiar en el orden de la cadena |
| **Proxy factories con parámetros** | Cuando el mismo proxy se parametriza (ej. por flag, módulo, plan), usar función factory `proxyX(param): RouteProxyFn` |

---

## Checklist

- [ ] Definir la firma: `RouteProxyFn` o factory `(param) => RouteProxyFn`
- [ ] Usar dynamic imports para cualquier código que no sea Edge-safe
- [ ] Retornar `null` en el camino feliz
- [ ] Para páginas: `NextResponse.redirect(new URL('/ruta', request.url))`
- [ ] Para APIs: `NextResponse.json({ error: '...' }, { status: 4xx })`
- [ ] Agregar el proxy a la ruta con `.proxy([miProxy])` en `core/routes.ts` o en el routes.ts del módulo
- [ ] Si es para módulo: agregar import en `lib/routing/all-routes.ts`
- [ ] Exportar desde `lib/routing/proxies.ts`

---

## Archivos clave

- `lib/routing/proxies.ts` — donde viven todos los proxies del host
- `lib/routing/with-api-proxy.ts` — wrapper para proteger route handlers de API
- `lib/routing/area-setup.ts` — inyección de defaults (no editar proxies aquí)
- `lib/routing/all-routes.ts` — entry point para activar proxy chains de módulos
- `core/routes.ts` — donde se aplican `.proxy([...])` a rutas core
- `docs/core/routing-system.md` — documentación completa del sistema

---

## Ejecutar ahora

Lee el request del usuario y crea el proxy en `lib/routing/proxies.ts`. Si el usuario no especificó el comportamiento de fallo (redirect vs JSON, código de estado, URL de destino), dedúcelo del contexto (página → redirect, API → JSON 401/403).
