# Plan: Jerarquia de Suscripciones + Free Trial Unico por Categoria

Status: In progress
Start date: 2026-02-17
Current phase: Task 8 (P1) - hardening de roles admin (`/admin` solo `admin`)
Last review: 2026-02-17

## Objective
Corregir el sistema de suscripciones para que:
- un target (equipo o usuario) no pueda reutilizar free trial indefinidamente;
- exista jerarquia real entre planes de una misma categoria;
- un cambio de plan superior se trate como upgrade (no como compra "nueva" sin contexto).

## Scope
Incluye:
- modelo de datos de templates para categoria/jerarquia;
- ledger de consumo de trial por target y categoria;
- enforcement en checkout core (Stripe y PayPal);
- clasificacion de cambio (upgrade/downgrade/lateral);
- ajustes de admin para gestionar categoria/jerarquia;
- pruebas de regresion del flujo trial -> cancelar -> resuscribir.

## Out of Scope
- reescribir totalmente el flujo de "plan change" del proveedor (API nativa Stripe/PayPal) en esta primera iteracion;
- rediseno visual completo de pricing/checkout;
- cambios de rutas canonicas.

## Priority Order
1. P0 - Seguridad funcional: bloquear reuse de trial y definir base de jerarquia.
2. P1 - UX y semantica de upgrade/downgrade en pricing/checkout/admin.
3. P1 - Hardening de acceso admin y separacion de roles global/team.
4. P2 - Hardening/rollout (observabilidad y refinamientos de migracion).

## Decisions Locked (2026-02-17)
- Bypass manual de trial: permitido solo para operadores de plataforma en flujo admin manual, con motivo obligatorio y auditoria (`trial_override`), desactivado por defecto.
- Lifecycle PayPal `no-trial`: estrategia base de reuso por fingerprint (A), con modo de escape en sandbox/dev para forzar creacion (B) cuando se necesite validacion/prototipo.
- Separacion de rol admin: `/admin` debe aceptar solo `users.role='admin'`; `owner` queda para contexto dashboard/team (no admin global).

## Current Findings (analisis del estado actual)
- `subscription_templates` no tiene campos de categoria ni ranking de jerarquia (`lib/db/schema.ts`).
- Stripe aplica trial solo por `template.trialPeriodDays` al crear session; no hay chequeo historico (`lib/payments/stripe.ts`).
- PayPal genera plan con trial embebido por template; no hay variante "sin trial" por elegibilidad (`lib/payments/paypal.ts`).
- No existe ledger de "trial ya usado".
- `createSubscriptionChangeRequest` soporta `upgrade|downgrade`, pero hoy los callers usan `plan_change` fijo (`app/api/stripe/checkout/route.ts`, `app/api/paypal/checkout/route.ts`).
- Pricing no diferencia current/upgrade/downgrade por categoria/jerarquia (`app/(frontend)/pricing/page.tsx`).
- El checkout self-service ahora aplica scope estricto en start: `team -> organization` y `user -> user`, evitando cobros fuera de scope y permitiendo checkout self-service de templates `targetScope='user'`.

## Task 1 (P0): Modelo de Datos y Migracion

### Risk
Alta: compatibilidad de datos existentes y consistencia de PayPal plan metadata.

### Target files
- `lib/db/schema.ts`
- `lib/db/migrations/0022_subscription_hierarchy_trial_guard.sql` (nuevo)
- `docs/database-model.md`

### Checklist
- [x] Agregar a `subscription_templates`:
- [x] `category_key` (string normalizada para familia de planes).
- [x] `hierarchy_rank` (int, mayor valor = plan superior).
- [x] Campos de cache PayPal para variante sin trial (si se adopta en P0): `paypal_plan_id_no_trial`, `paypal_plan_fingerprint_no_trial`.
- [x] Crear tabla `subscription_trial_usage` con target polimorfico (`team|user`) y `category_key`.
- [x] Crear unique index por target+categoria para enforcement O(1).
- [x] Definir constraints de integridad target team/user (alineado al patron de `subscription_assignments`).
- [x] Definir estrategia de backfill para templates existentes.

### Validation checklist
- [x] Migracion ejecuta clean en DB local.
- [x] Unique constraint bloquea segundo insert para misma categoria/target.
- [x] `drizzle` schema compila sin errores de tipos.

### Commands
- `pnpm db:migrate`
- `pnpm exec tsc --noEmit`

## Task 2 (P0): Policy Service de Suscripciones

### Risk
Media: reglas ambiguas entre categoria, intervalo y nivel jerarquico.

### Target files
- `lib/payments/subscription-policy.ts` (nuevo)
- `lib/db/queries.ts`
- `tests/payments/subscription-trial-policy.test.ts` (nuevo)

### Checklist
- [x] Implementar normalizacion de categoria (`category_key`) y comparacion segura.
- [x] Implementar clasificador de relacion entre template actual y solicitado:
- [x] `same_template`
- [x] `upgrade`
- [x] `downgrade`
- [x] `lateral_change`
- [x] `new_purchase`
- [x] Implementar resolver de target de trial (organization => team, user => user).
- [x] Implementar `isTrialEligible` con lookup por unique key.
- [x] Implementar `consumeTrialUsage` idempotente (upsert/no-op en conflicto).

### Validation checklist
- [x] Clasificador cubre casos positivos/negativos y mismatches de scope/categoria.
- [x] `isTrialEligible` responde correctamente con/ sin consumo previo.
- [x] `consumeTrialUsage` es idempotente.

### Commands
- `npx tsx --test tests/payments/subscription-trial-policy.test.ts`
- `pnpm exec tsc --noEmit`

## Task 3 (P0): Enforcement en Checkout Orders y Start de Pago

### Risk
Alta: cambios en metadata de checkout y compatibilidad con flujos existentes.

### Target files
- `lib/payments/actions.ts`
- `lib/payments/checkout-orders.ts`
- `lib/payments/payment-methods.ts`
- `lib/payments/stripe.ts`
- `lib/payments/paypal.ts`
- `app/api/paypal/plan/route.ts`
- `tests/payments/checkout-orders.test.ts`
- `tests/payments/subscription-checkout-scope-guard.test.ts` (nuevo)

### Checklist
- [x] Persistir en metadata de checkout: categoria, relacion de plan y `trialEligible`.
- [x] Bloquear en start de checkout self-service los templates fuera de scope del target actual (hoy: team -> solo `organization`).
- [x] Stripe: aplicar trial solo cuando `trialEligible=true`.
- [x] PayPal: seleccionar plan con trial o sin trial segun elegibilidad.
- [x] Mantener idempotencia de start (`provider_pending`) sin romper comportamiento actual.
- [x] Mantener soporte de rutas legacy (bridge) sin bifurcar reglas.

### Validation checklist
- [x] Reintento de start no cambia decision de trial para la misma checkout order.
- [x] Checkout de target con trial ya consumido inicia sin trial.
- [x] Checkout de template `targetScope='user'` en flujo team self-service se rechaza antes de cobro.
- [x] Tests de `checkout-orders` pasan con metadata extendida.

### Commands
- `npx tsx --test tests/payments/checkout-orders.test.ts`
- `npx tsx --test tests/payments/subscription-checkout-scope-guard.test.ts`
- `pnpm exec tsc --noEmit`

## Task 4 (P0): Consumo de Trial en Confirmacion y Bloqueo de Reuso

### Risk
Alta: idempotencia entre return/webhook y posibles carreras.

### Target files
- `lib/payments/order-subscription-events.ts`
- `lib/payments/payment-methods.ts`
- `app/api/checkout/methods/[paymentMethodId]/return/route.ts`
- `lib/payments/checkout-system.ts`
- `tests/payments/subscription-trial-once.test.ts` (nuevo)

### Checklist
- [x] Consumir trial en el punto de proyeccion lifecycle (activacion real), no solo en callback legacy de proveedor.
- [x] Garantizar idempotencia por unique index (sin dobles consumos).
- [x] Registrar logs de auditoria para `trial_consumed` y `trial_reuse_blocked`.
- [x] Cubrir regresion exacta reportada:
- [x] trial inicial OK
- [x] cancelacion
- [x] nuevo intento sin trial

### Validation checklist
- [x] El mismo target no recibe trial dos veces en misma categoria.
- [x] Cancelar y re-suscribir no vuelve a abrir trial.
- [x] Flujos sin trial previo siguen funcionando.
- [x] Callback (`return`) y webhook convergen al mismo resultado de trial consumido (sin duplicados).

### Commands
- `npx tsx --test tests/payments/subscription-trial-once.test.ts`
- `npx tsx --test tests/payments/order-subscription-lifecycle.test.ts`
- `pnpm exec tsc --noEmit`

## Task 5 (P1): Semantica de Upgrade/Downgrade en Cambio de Plan

### Risk
Media: UX confusa si no se comunica bien la relacion entre planes.

### Target files
- `lib/payments/subscription-change.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/paypal/checkout/route.ts`
- `app/(frontend)/pricing/page.tsx`
- `app/(frontend)/checkout/[checkoutToken]/page.tsx`
- `lib/i18n/messages/global.ts`

### Checklist
- [x] Usar clasificador para poblar `changeReason` real (`upgrade|downgrade|plan_change`).
- [x] Bloquear compra del mismo template activo (evitar no-op pago).
- [x] Marcar UI de pricing: `Current`, `Upgrade`, `Downgrade` segun categoria/jerarquia.
- [x] Mostrar en checkout resumen del tipo de cambio cuando aplique.
- [x] Mantener fallback seguro si faltan datos de categoria/jerarquia.

### Validation checklist
- [x] Se crea `subscription_change_request` con `changeReason` correcto.
- [x] Upgrade y downgrade se diferencian correctamente.
- [x] No se rompe el modo `period_end`.

### Commands
- `npx tsx --test tests/payments/subscription-change.test.ts`
- `pnpm exec tsc --noEmit`

## Task 6 (P1): Admin de Templates (categoria + jerarquia)

### Risk
Media: errores de configuracion por parte de admin.

### Target files
- `app/(dashboard)/admin/subscriptions/template-form.tsx`
- `app/(dashboard)/admin/subscriptions/actions.ts`
- `app/(dashboard)/admin/subscriptions/page.tsx`
- `lib/i18n/messages/admin.ts`
- `tests/payments/admin-subscription-form-utils.test.ts`

### Checklist
- [x] Agregar campos `categoryKey` y `hierarchyRank` en create/edit de template.
- [x] Validar normalizacion y reglas minimas de negocio.
- [x] Exponer categoria/jerarquia en listado admin para inspeccion rapida.
- [x] Reusar i18n (`admin` area), sin strings hardcode.

### Validation checklist
- [x] Admin puede crear/editar templates con categoria/jerarquia validas.
- [x] Errores de validacion no rompen accion server.
- [x] i18n compila y se renderiza en `en`/`es`.

### Commands
- `npx tsx --test tests/payments/admin-subscription-form-utils.test.ts`
- `pnpm exec tsc --noEmit`

## Task 7 (P2): Documentacion, Rollout y Hardening

### Risk
Baja: deuda operativa si no se documenta migracion y comportamiento final.

### Target files
- `docs/features.md`
- `docs/platform-capabilities.md`
- `docs/database-model.md`
- `AGENTS.md` (solo si cambia arquitectura/rutas/convenciones)

### Checklist
- [x] Documentar regla: "1 trial por categoria y target".
- [x] Documentar semantica de jerarquia y clasificacion de cambio.
- [x] Documentar estrategia de backfill para templates existentes.
- [x] Agregar notas operativas para soporte (como explicar trial bloqueado).

### Validation checklist
- [x] Docs reflejan el contrato tecnico final.
- [x] No quedan contradicciones con el flujo checkout order-first.

### Commands
- `pnpm exec tsc --noEmit`

## Task 8 (P1): Hardening de Roles Admin (`/admin` solo `admin`)

### Risk
Alta: riesgo de lockout operativo si no se controla la transicion de usuarios `owner` existentes.

### Target files
- `app/(dashboard)/admin/guards.ts`
- `app/(dashboard)/admin/actions/shared.ts`
- `app/api/auth/providers/route.ts`
- `lib/modules/sdk-server-bootstrap.ts`
- `lib/modules/runtime.ts`
- `app/sdk/src/server.ts`
- `app/sdk/dist/server.js`
- `app/sdk/dist/server.d.ts`
- `AGENTS.md`
- `tests/auth/*` (agregar/ajustar cobertura de acceso admin por rol global)

### Checklist
- [ ] Definir regla unica: acceso a `/admin` y acciones admin solo para `users.role='admin'`.
- [ ] Confirmar que `team_members.role='owner'` no concede permisos admin globales.
- [ ] Aplicar cambio en guards y helpers admin core.
- [ ] Alinear politica admin en rutas/dispatch de modulos y SDK (defaults de `adminRoles`).
- [ ] Agregar estrategia de transicion para instancias existentes:
- [ ] validar que exista al menos un usuario `admin` antes de bloquear `owner` en `/admin`.
- [ ] documentar paso operativo (promocion owner -> admin) para ambientes existentes.
- [ ] Actualizar AGENTS/docs para explicitar separacion de roles global/team.

### Validation checklist
- [ ] Usuario global `admin` conserva acceso completo a `/admin`.
- [ ] Usuario global `owner` sin `admin` ya no puede entrar a `/admin`.
- [ ] Flujos de `/dashboard` y ownership de team no se rompen.
- [ ] Tests de guards/admin role policy en verde.

### Commands
- `npx tsx --test tests/auth/proxy-guards.test.ts`
- `pnpm exec tsc --noEmit`

## Open Decisions (bloqueos de diseno a resolver antes de implementar)
- [x] Politica default de `category_key` para templates legacy.
- [x] Si `hierarchy_rank` compara solo dentro de misma `billing_interval` o toda la categoria.
- [x] Momento exacto de consumo de trial: `start` vs `checkout completed`.
- [x] Si admin conserva bypass explicito para asignaciones manuales con trial.
- [x] Regla de mapping categoria/scope para checkout self-service mientras no exista compra self-service de templates `targetScope='user'`.
- [x] Politica de lifecycle de planes PayPal "sin trial" (rotacion/reuso) para evitar proliferacion de planes remotos.
- [ ] Estrategia final de rollout para eliminar `owner` de `/admin` sin lockout.

## Completion Criteria
- [x] Caso reportado queda cerrado: trial no reutilizable tras cancel/resubscribe en misma categoria.
- [x] El sistema determina upgrade/downgrade por jerarquia en templates de misma categoria.
- [x] Checkout core aplica trial de forma condicional para Stripe y PayPal.
- [x] Pruebas de regresion de pagos/suscripciones cubren trial unico y clasificacion de cambio.
- [x] Documentacion tecnica actualizada.
- [ ] `/admin` queda restringido a rol global `admin` sin romper dashboard/team ownership.
