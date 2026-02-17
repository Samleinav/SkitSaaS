---
title: Archive - Pending Tasks (Legacy)
unlisted: true
---

# Pendientes

## Restructure config/payments/subscriptions (en curso)

- [ ] Ejecutar rollout por sprints del plan de reestructuracion.
  - Coordinacion: `p_tasks_payments_subscriptions_config_restructure.md`.
  - Documentacion tecnica: `docs/platform-capabilities.md`, `docs/modules/*`, `docs/env-variables.md`.
- [x] Cerrar Sprint 1.
  - Hecho: flags (`lib/feature-flags.ts`), observabilidad (`lib/observability/migration-metrics.ts`) y migracion aditiva `0013_sprint1_additive_schema.sql`.
  - Validado en DB del entorno.
- [x] Cerrar Sprint 2.
  - Backfill/seed idempotente: `scripts/restructure-backfill.ts`.
  - Parity report: `scripts/restructure-parity-report.ts`.
  - Helpers de lectura compat: `lib/config/app-config.ts`.
  - Validacion ejecutada: `pnpm restructure:backfill` y `pnpm restructure:parity`.
- [x] Cerrar Sprint 3.
  - Implementado:
    - Dual-write app-config (`lib/config/app-config-writes.ts` + acciones admin).
    - Cola durable de replay (`dual_write_replay_queue` + `scripts/restructure-replay-worker.ts`).
    - Drift checker (`scripts/restructure-drift-check.ts`).
    - Persistencia de settlement en `payment_transactions` desde checkout/webhook/admin orders.
    - Gating de lifecycle por `order_type='subscription'` y proyeccion dual a `subscription_assignments`.
  - Validacion ejecutada: `pnpm db:migrate`, `pnpm build`, `pnpm restructure:replay`, `pnpm restructure:drift`.
  - Validado adicional: `pnpm restructure:failure-injection` (legacy OK + replay encolado + replay aplicado).
  - Mini runbook: archivado (usar `docs/ops-canary-pack.md` para checks actuales).
  - Burn-in completado y reemplazado por canary pack operativo.
- [x] Cerrar Sprint 4.
  - Implementado (read-cutover):
    - Lectura de config admin con preferencia `app_configs` (`lib/db/queries.ts`).
    - Guard de single-writer en mutaciones legacy de suscripciones (`lib/payments/subscription-single-writer.ts` + acciones/rutas clave).
    - Lecturas de suscripciones admin/dashboard con `subscription_assignments` (cutover permanente; flag retirado).
    - `/admin/payments` soporta lectura centrica en `payment_transactions` (cutover permanente; flag retirado).
    - Runtime orders sin regex de metadata para targets (`target_*` explicitos).
  - Activado:
    - runtime de modulos (manifests/registry/dispatch/nav/widgets).
    - runtime de themes (policy/default/user override).
  - Validacion:
    - pack de validacion Sprint 4: `docs/ops-validation-pack.md`.
    - ejecutado `pnpm restructure:module-runtime` (sin manifests faltantes).
    - admin smoke local ejecutado con cookie válida (rutas 200).
    - toggle de `ops.diagnostics` ejecutado local (enable/disable).
    - pendiente ejecutar parity UI + toggle de modulo en staging (ver pack).
- [x] Cerrar Sprint 5.
  - Implementado:
    - Removidas lecturas legacy de `payment_provider_configs`.
    - Eliminada resolucion por metadata en runtime para targets.
    - Shims de dual-write/replay retirados.
    - Guard de single-writer ahora siempre activo (solo lifecycle escribe).
    - Documentacion alineada a contract phase (`.env.example`, checklist, plan, pack Sprint 4).
    - Migracion contract generada: `lib/db/migrations/0015_wakeful_marrow.sql`.
    - Canary pack documentado: `docs/ops-canary-pack.md`.
  - Canary:
    - Evidencias capturadas: `docs/canary-reports/2026-02-05` (status `warning`, sin issues criticos).
- [x] Capturar snapshots base para:
  - `/admin/app-config/*`
  - `/admin/orders`
  - `/admin/payments`
  - `/admin/suscriptions`
  - `/dashboard/subscriptions`
- [x] Definir/crear rama final dedicada para esta migracion.
  - Rama creada: `feat/sprint1-restructure-foundation`.
  - Snapshots: `docs/baseline-snapshots/2026-02-05`.

## Checkout system (handoff a otros agentes)

- [x] Implementar notificacion por correo cuando cambie el precio/intervalo de una plantilla.
  - Implementado con SMTP externo en `queueTemplatePriceChangeNotificationEmails(...)` (`lib/payments/checkout-system.ts`).
  - Envio SMTP: `lib/email/smtp.ts`.
  - Log de envios: `lib/email/logs.ts` + tabla `email_logs` + vista admin `/admin/app-config/email`.
- [x] Implementar actualizacion manual de suscripciones activas asociadas a una plantilla.
  - Implementado en `queueManualActiveSubscriptionTemplateUpdate(...)` (`lib/payments/checkout-system.ts`).
  - Encola eventos operativos en `payment_orders/payment_logs` y genera resumen en `sys_activity_logs`.
- [x] Conectar UI en editar plantilla para disparar "Actualizar planes activos con esta plantilla".
  - Formulario conectado en `app/(dashboard)/admin/subscriptions/[templateId]/edit/page.tsx`.
  - Accion usada: `requestTemplateActiveSubscriptionsUpdateAction`.
- [x] Completar soporte de nuevos metodos de pago (adapters/provider handlers) sobre `recordCheckoutEvent(...)` en `lib/payments/checkout-system.ts`.
  - Adapter factory + convencion de metadata por proveedor: `createCheckoutEventProviderAdapter(...)`.
  - Adapters iniciales: `recordStripeCheckoutEvent(...)`, `recordPayPalCheckoutEvent(...)`, `recordSystemCheckoutEvent(...)`.
- [x] Agregar cobertura de pruebas para eventos de checkout administrativo.
  - Pruebas unitarias: `lib/payments/checkout-system.test.ts`.
  - Eventos cubiertos: `emitTemplatePricingChangedEvent(...)` y `emitTemplateActiveSubscriptionsUpdateRequestedEvent(...)`.

