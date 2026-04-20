# Plan: SaaS Audit, Bugs, and Performance Hardening

Status: In progress
Start date: 2026-04-20
Current phase: P0 batch 1 validated
Last review: 2026-04-20

## Objective

Convertir la auditoría reciente en una secuencia de trabajo concreta para:

1. corregir bugs reales del core SaaS
2. cerrar inconsistencias de backoffice antes de seguir ampliando superficie
3. reducir costos innecesarios de render y consulta en admin/dashboard
4. preparar el terreno para un hardening más serio de seguridad y despliegue

La meta no es solo "optimizar un poco", sino dejar el producto más confiable
para:

- despliegues con datos reales
- crecimiento de volumen en admin
- despliegues split-role con RLS
- futuras features sin arrastrar deuda estructural

## Scope

- admin summary y widgets del dashboard
- consultas y renders de admin con sobrecarga evitable
- mutaciones críticas de cuenta en dashboard y auth legacy
- consistencia de soft delete de usuarios
- groundwork para compatibilidad real con RLS
- plan de continuación para paginación remota y consultas grandes

## Out of Scope

- reescribir todo el runtime de auth en una sola tanda
- migrar ya todas las tablas admin a BuildTable remoto
- rediseñar el frontend comercial completo
- rehacer por completo el modelo de equipos, membresías y contexto activo
- introducir observabilidad externa o tracing distribuido en esta fase

## Current Assessment

Estado confirmado en la auditoría:

- existe una base técnica sólida de proxies, wrappers y docs
- los checks actuales de governance pasan, pero no cubren los gaps de RLS real
- el backoffice todavía hace varias cargas "todo en memoria" que van a doler al
  crecer
- algunas mutaciones de cuenta pueden quedar a medias porque actualizan varias
  piezas fuera de una transacción
- el dashboard admin resume suscripciones con una visión incompleta en escenarios
  `targetType='user'`
- el borrado de cuenta usa una estrategia de renombrado de email que puede
  fallar con correos cercanos al límite de `varchar(255)`

## Priority Order

1. P0 - Fixes de consistencia funcional y bugs reales
2. P0 - Reducción de overfetch innecesario en admin crítico
3. P1 - Compatibilidad operativa real con RLS y split-role deployment
4. P1 - Paginación remota / server-driven para admin pesado
5. P2 - Limpieza estructural y optimización secundaria

## Task 1 (P0): Fix Admin Summary Consistency

Status: In progress

### Risk

Las métricas del dashboard admin pueden inducir decisiones erróneas si el
producto se usa en modo `user` o mixto y el resumen cuenta solo parte de las
suscripciones activas.

### Target files

- `lib/db/queries.admin.ts`
- `app/(dashboard)/admin/page.tsx`
- `docs/reference/01-platform-capabilities.md`
- `.agents/docs/skitsaas/reference/platform-capabilities.md`

### Checklist

- [x] Hacer que el resumen admin cuente asignaciones activas sin asumir solo
      `targetType='team'`
- [ ] Verificar que los KPIs del admin no contradicen las pantallas de
      suscripciones por scope
- [x] Reducir la carga del widget de recent activity para pedir solo lo que
      realmente se renderiza

### Validation checklist

- [ ] `/admin` muestra métricas coherentes cuando hay asignaciones de usuario
- [x] recent activity no consulta 120 filas para pintar 4

## Task 2 (P0): Make Account Mutations Atomic

Status: In progress

### Risk

Actualizar contraseña, cuenta o borrado de usuario fuera de transacción deja la
puerta abierta a estados parciales:

- usuario actualizado sin activity log
- cuenta marcada como borrada sin limpiar membresía
- fallos intermedios difíciles de auditar y reproducir

### Target files

- `app/(dashboard)/dashboard/account-activity.ts`
- `app/(dashboard)/dashboard/general/actions.ts`
- `app/(dashboard)/dashboard/security/actions.ts`
- `app/(login)/actions.ts`
- `lib/db/*`

### Checklist

- [x] Permitir que los activity logs de dashboard usen el executor de una
      transacción existente
- [x] Agrupar update/log/delete relacionado en una sola transacción
- [x] Reutilizar el mismo patrón en los actions legacy que siguen vivos
- [x] Evitar duplicar lógica de soft delete insegura

### Validation checklist

- [x] update account y update password quedan en una transacción
- [x] delete account no deja update/log/delete repartidos en pasos sueltos
- [x] el código legacy y el dashboard convergen en la misma lógica crítica

## Task 3 (P0): Harden Soft Delete Email Rewriting

Status: In progress

### Risk

El patrón actual `CONCAT(email, '-', id, '-deleted')` puede romper por longitud,
justo en un flujo destructivo y sensible.

### Target files

- `app/(dashboard)/dashboard/security/actions.ts`
- `app/(login)/actions.ts`
- `lib/db/*`

### Checklist

- [x] Introducir una expresión reutilizable que preserve unicidad y respete
      `varchar(255)`
- [x] Aplicarla tanto en dashboard como en auth legacy

### Validation checklist

- [x] el email soft-deleted no excede 255 caracteres
- [x] sigue siendo único por `id`

## Task 4 (P1): RLS Runtime Readiness

Status: Pending

### Risk

La documentación y la migración describen un modelo con `saas_app`,
`saas_admin` y `withUserContext(...)`, pero el runtime actual todavía no usa
ese patrón de forma consistente. Eso puede romper el dashboard en despliegues
split-role reales.

### Target files

- `lib/db/with-user-context.ts`
- `lib/db/queries.ts`
- `app/(dashboard)/dashboard/controller.ts`
- `app/(dashboard)/dashboard/*/actions.ts`
- `lib/auth/*`
- `tests/db/*`
- `tests/auth/*`

### Checklist

- [ ] Definir qué queries deben ejecutarse bajo contexto RLS
- [ ] Resolver el caso base de `getUser()` / `auth_sessions` bajo split-role
- [ ] Introducir tests que fallen si `saas_app` opera sin `app.user_id`
- [ ] Documentar la decisión final si ciertas lecturas siguen usando `adminDb`

### Validation checklist

- [ ] existe al menos un smoke test o test de integración para RLS real
- [ ] el dashboard puede autenticar y leer datos bajo el modelo documentado

## Task 5 (P1): Remote Pagination for Heavy Admin Surfaces

Status: Pending

### Risk

Hoy varias pantallas admin cargan cientos o miles de filas y luego filtran en
memoria en server/client. Eso penaliza TTFB, memoria, serialización y UX al
crecer.

### Target files

- `app/(dashboard)/admin/users/*`
- `app/(dashboard)/admin/subscriptions/*`
- `app/(dashboard)/admin/orders/*`
- `app/(dashboard)/admin/payments/*`
- `app/(dashboard)/admin/logs/*`
- `lib/db/queries.admin.ts`
- `docs/datatables/*`
- `.agents/docs/skitsaas/datatables-and-remote-actions.md`

### Checklist

- [ ] Priorizar `/admin/users` y `/admin/subscriptions`
- [ ] Mover datasets grandes a paginación server-driven
- [ ] Mantener métricas separadas de la carga tabular
- [ ] Evitar `.map/.filter` masivos sobre listas completas antes de render

### Validation checklist

- [ ] las pantallas críticas dejan de depender de `getAll*()` para tablas largas
- [ ] el payload renderizado baja de forma visible en páginas admin grandes

## Implementation Notes

### Batch 1 target

La primera tanda de implementación ya aterrizó en este batch:

- fix de métricas admin para scopes de suscripción
- reducción de overfetch en recent activity de `/admin`
- transacciones para account update/password/delete
- helper compartido para soft delete email seguro

### Batch 2 target

La siguiente tanda debería cubrir:

- RLS runtime readiness
- revisión de `getUser()` y `auth_sessions`
- primera migración de tablas admin a carga remota

## Commands

- `pnpm typecheck`
- `pnpm restructure:governance-pack`
- `pnpm test`
