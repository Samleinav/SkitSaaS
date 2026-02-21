# Plan: Quotas Consumibles por Suscripcion (Ledger + Ventanas por Periodo)

Status: In progress
Start date: 2026-02-21
Current phase: Definition (P0)
Last review: 2026-02-21

## Objective
Implementar una capa generica de cuotas consumibles para features `int`, con consumo real en runtime, auditoria por eventos e idempotencia, sin romper el modelo actual de features/quotas estaticas.

Objetivos concretos:
- mantener `subscription_template_features` como configuracion base del plan;
- introducir estado mutable de consumo en tablas dedicadas;
- exponer API de lectura/consumo/grant reutilizable por core y modulos;
- soportar evolucion futura de top-ups (ej. compra one-time `+1000` unidades).

## Scope
Incluye:
- modelo de datos para ventanas de cuota por periodo y ledger de eventos;
- servicio de dominio para snapshot, consumo, grant y ajustes idempotentes;
- integracion con `subscription_assignments` y periodo vigente;
- extension del catalogo de features para distinguir cuotas consumibles vs limites de estado;
- primera integracion de enforcement en acciones/flows seleccionados;
- pruebas unitarias/integracion y documentacion tecnica.

## Out of Scope
- rediseño completo de `/admin/subscriptions` en esta iteracion;
- reemplazar todas las validaciones de limites existentes en una sola entrega;
- motor de billing prorrateado avanzado por proveedor;
- UI analitica completa de historico/forecast de consumo.

## Priority Order
1. P0 - Fundacion de dominio y consistencia transaccional (DB + servicio + idempotencia).
2. P1 - Integracion funcional en checks/UI y operaciones admin.
3. P1 - Top-ups one-time de cuotas consumibles.
4. P2 - Hardening operativo, observabilidad y rollout gradual.

## Decisions Locked (2026-02-21)
- `subscription_template_features` permanece como fuente estatica del max/base; no almacenar `remaining` ahi.
- El estado mutable se mueve a tablas runtime con ledger append-only.
- Reset de consumo por apertura de nueva ventana de periodo (no "reset global a 0" por job ciego).
- El remanente efectivo se calcula como `base_units + granted_units - consumed_units`.

## Open Decisions (resolver antes de implementar P1)
- politica de carryover entre periodos (`none` por defecto vs parcial);
- ancla de ventana cuando `current_period_start/end` sea `null` (fallback policy);
- expiracion de top-ups (expiran al `period_end` o configurable);
- semantica en downgrade/upgrade a mitad de periodo (recalculo inmediato vs siguiente ventana);
- si la capa expone API publica para modulos o solo server-internal inicialmente.

## Task 1 (P0): Contrato de dominio para cuotas consumibles

### Risk
Alta: ambiguedad entre cuotas de estado (ej. team members actuales) y cuotas de consumo (ej. requests/minutos/creditos de uso).

### Target files
- `lib/features/catalog.ts`
- `lib/features/controller.ts`
- `lib/features/subscription.ts`
- `docs/subscriptions/features-and-quotas.md`

### Checklist
- [ ] Extender definicion de feature con metadato de modo de cuota:
  - `quotaMode: 'state_limit' | 'consumable'`.
- [ ] Mantener compatibilidad hacia atras (default `state_limit` para keys actuales).
- [ ] Definir contrato de API de consumo (tipos compartidos):
  - `QuotaSnapshot`
  - `ConsumeQuotaInput/Result`
  - `GrantQuotaInput/Result`
- [ ] Documentar que `can()/int()` siguen evaluando valor base y que consumo usa API dedicada.

### Validation checklist
- [ ] Tipos compilan sin romper callers actuales.
- [ ] Features existentes mantienen comportamiento previo.
- [ ] Documentacion refleja distincion `state_limit` vs `consumable`.

### Commands
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint lib/features/catalog.ts lib/features/controller.ts lib/features/subscription.ts`

## Task 2 (P0): Modelo de datos runtime (ventanas + ledger)

### Risk
Alta: concurrencia y doble consumo bajo carga.

### Target files
- `lib/db/schema.ts`
- `lib/db/migrations/0023_subscription_quota_consumption.sql` (nuevo)
- `docs/core/database-model.md`

### Checklist
- [ ] Crear tabla `subscription_quota_windows`:
  - `id`, `subscription_assignment_id`, `feature_key`
  - `period_start`, `period_end`
  - `base_units`, `granted_units`, `consumed_units`
  - `created_at`, `updated_at`
- [ ] Crear tabla `subscription_quota_events` (append-only):
  - `id`, `quota_window_id`, `event_type`
  - `units_delta` (signed)
  - `idempotency_key` (unique)
  - `source_order_id` nullable
  - `metadata`, `created_at`
- [ ] Constraints e indices:
  - unique por ventana (`assignment + feature_key + period_start`)
  - check de no-negativos en acumulados de ventana
  - indices por `feature_key`, `period_end`, `source_order_id`.
- [ ] Relacionar con `subscription_assignments` y `payment_orders` donde aplique.

### Validation checklist
- [ ] Migracion aplica/revierte en local.
- [ ] Unicidad de `idempotency_key` evita doble evento.
- [ ] DB garantiza integridad de acumulados basicos.

### Commands
- `pnpm db:migrate`
- `pnpm exec tsc --noEmit`

## Task 3 (P0): Servicio transaccional de consumo

### Risk
Alta: race conditions y resultados inconsistentes en consumo concurrente.

### Target files
- `lib/features/quota-consumption.ts` (nuevo)
- `lib/db/queries.ts`
- `tests/payments/subscription-quota-consumption.test.ts` (nuevo)

### Checklist
- [ ] Implementar `getQuotaSnapshot({ targetType, targetId, featureKey })`.
- [ ] Implementar `consumeQuota(...)` con transaccion + idempotencia:
  - validar disponibilidad;
  - incrementar `consumed_units` atomico;
  - registrar evento `consume`.
- [ ] Implementar `grantQuota(...)`:
  - incrementar `granted_units`;
  - registrar evento `grant`.
- [ ] Implementar `adjustQuota(...)` controlado para soporte/admin (evento `adjust`).
- [ ] Soportar `refund/reverse` (evento `refund`) sin romper invariantes.

### Validation checklist
- [ ] Consumir dos veces con misma `idempotencyKey` retorna mismo resultado.
- [ ] Consumo concurrente no deja `remaining < 0`.
- [ ] Snapshot refleja base + grants - consumed de forma consistente.

### Commands
- `npx tsx --test tests/payments/subscription-quota-consumption.test.ts`
- `pnpm exec tsc --noEmit`

## Task 4 (P0): Apertura/rotacion de ventanas por periodo de suscripcion

### Risk
Media: periodos nulos o cambios de assignment pueden desalinear el reset.

### Target files
- `lib/features/quota-consumption.ts`
- `lib/payments/subscription-assignments.ts`
- `lib/payments/order-subscription-events.ts`
- `tests/payments/subscription-quota-windowing.test.ts` (nuevo)

### Checklist
- [ ] Resolver ventana activa desde `subscription_assignments.current_period_start/end`.
- [ ] Crear ventana al primer acceso del periodo si no existe (lazy init).
- [ ] Abrir nueva ventana en cambio de periodo (consumo reinicia por nueva fila, no update destructivo).
- [ ] Definir fallback seguro cuando el assignment no trae periodo (policy documentada).
- [ ] Garantizar que cancel/suspend no borra historial.

### Validation checklist
- [ ] Cambio de periodo abre nueva ventana con `consumed_units=0`.
- [ ] Ventana vieja queda auditable e inmutable salvo ajustes permitidos.
- [ ] Flujos trial/active existentes no se rompen.

### Commands
- `npx tsx --test tests/payments/subscription-quota-windowing.test.ts`
- `npx tsx --test tests/payments/order-subscription-lifecycle.test.ts`
- `pnpm exec tsc --noEmit`

## Task 5 (P1): Integracion en checks y UX de remaining

### Risk
Media: mezclar de forma incorrecta quotas consumibles con limites de estado actuales.

### Target files
- `app/(dashboard)/dashboard/actions/team.ts` (solo si algun key pasa a consumable)
- `lib/organizations/subscription-limits.ts` (si aplica)
- `app/(dashboard)/dashboard/subscriptions/page.tsx`
- `app/(dashboard)/dashboard/subscriptions/actions.ts`
- `lib/i18n/messages/dashboard.ts`

### Checklist
- [ ] Crear helpers para mostrar `remaining`, `max`, `resetsAt`.
- [ ] Mantener checks existentes de `state_limit` sin cambios funcionales.
- [ ] Introducir checks de consumo solo para keys marcadas `consumable`.
- [ ] Exponer mensajes i18n para cuota insuficiente y fecha de reset.

### Validation checklist
- [ ] UI muestra remanente correcto por feature consumible.
- [ ] Rechazo de consumo sin saldo devuelve error funcional claro.
- [ ] No hay regresion en team members / organizations max (state limits).

### Commands
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint app/(dashboard)/dashboard/subscriptions/page.tsx app/(dashboard)/dashboard/subscriptions/actions.ts`

## Task 6 (P1): Top-up one-time (+N unidades) acoplado a ordenes

### Risk
Alta: duplicados por reintentos webhook/return y reconciliacion de pagos.

### Target files
- `lib/payments/order-subscription-events.ts`
- `lib/payments/payment-methods.ts`
- `app/(dashboard)/admin/orders/actions.ts`
- `lib/features/quota-consumption.ts`
- `tests/payments/subscription-quota-topup-onetime.test.ts` (nuevo)

### Checklist
- [ ] Definir metadata canonica para top-up en `payment_orders`:
  - `featureKey`, `units`, `targetType`, `targetId`.
- [ ] Al confirmar pago one-time, emitir `grantQuota` con `idempotencyKey` derivada de order/payment.
- [ ] Prevenir doble grant en return+webhook (exactly-once funcional).
- [ ] Registrar auditoria en `sys_activity_logs`.

### Validation checklist
- [ ] Un pago one-time acredita unidades una sola vez.
- [ ] Replays del proveedor no incrementan saldo adicional.
- [ ] El remanente aumenta inmediatamente tras top-up exitoso.

### Commands
- `npx tsx --test tests/payments/subscription-quota-topup-onetime.test.ts`
- `npx tsx --test tests/payments/order-subscription-lifecycle.test.ts`
- `pnpm exec tsc --noEmit`

## Task 7 (P1): Operacion admin y soporte

### Risk
Media: ajustes manuales sin control pueden desalinear finanzas/soporte.

### Target files
- `app/(dashboard)/admin/subscriptions/actions.ts`
- `app/(dashboard)/admin/subscriptions/page.tsx`
- `app/(dashboard)/admin/logs/page.tsx`
- `lib/i18n/messages/admin.ts`
- `tests/payments/subscription-quota-admin-actions.test.ts` (nuevo)

### Checklist
- [ ] Agregar accion admin para ajuste manual con motivo obligatorio.
- [ ] Mostrar historial reciente de eventos por cuota en admin.
- [ ] Incluir guardrails de permisos y trazabilidad completa.
- [ ] Documentar runbook corto de soporte (cuando ajustar/refund).

### Validation checklist
- [ ] Solo `admin` puede ajustar cuotas.
- [ ] Cada ajuste queda con actor, motivo y delta.
- [ ] Vista admin no rompe rutas actuales de subscriptions/suscriptions.

### Commands
- `npx tsx --test tests/payments/subscription-quota-admin-actions.test.ts`
- `pnpm exec tsc --noEmit`

## Task 8 (P2): Documentacion, rollout y hardening

### Risk
Media: despliegue sin flags ni observabilidad complica rollback.

### Target files
- `docs/subscriptions/features-and-quotas.md`
- `docs/core/platform-capabilities.md`
- `docs/core/database-model.md`
- `docs/operations/ops-validation-pack.md`
- `AGENTS.md` (si cambia convencion de acciones/rutas)
- `plans/subscription-consumable-quotas-plan.md`

### Checklist
- [ ] Documentar contrato tecnico de cuotas consumibles y ejemplos.
- [ ] Definir estrategia rollout por feature flag (`off` -> `shadow` -> `enforced`).
- [ ] Definir metricas minimas:
  - intentos de consumo,
  - rechazos por saldo,
  - grants aplicados,
  - eventos idempotentes descartados.
- [ ] Documentar plan de rollback (desactivar enforcement y mantener ledger).

### Validation checklist
- [ ] Docs sin contradicciones con schema/runtime final.
- [ ] Existe runbook de validacion pre y post deploy.
- [ ] Riesgos abiertos quedan explicitados con owner.

### Commands
- `pnpm run docs:check`
- `pnpm exec tsc --noEmit`

## Test Strategy (cross-task)
- Reusar tests de `tests/payments/*` donde el flujo ya exista.
- Agregar tests nuevos para dominio de quota consumption:
  - idempotencia,
  - concurrencia,
  - rotacion de ventana,
  - top-up one-time,
  - ajustes admin.
- No ubicar tests dentro de `app/`; mantenerlos en `tests/`.

## Dependencies / Blockers
- Definir catalogo inicial de keys `consumable` (P0).
- Confirmar si algun modulo externo requiere API SDK de consumo en esta fase.
- Confirmar politica comercial de carryover y expiracion de top-ups.

## Completion Criteria
- [ ] Existe capa de cuotas consumibles separada de features estaticas.
- [ ] Consumo y grants son idempotentes y auditables.
- [ ] Reset por periodo funciona via ventanas, sin borrado destructivo.
- [ ] Queda habilitado el caso futuro "one-time +N" sin hacks sobre templates.
- [ ] Documentacion tecnica y pruebas quedan actualizadas.
