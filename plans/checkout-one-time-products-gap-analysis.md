# Analisis Operativo: Admin Products + One-Time Module + Checkout Core

Status: Draft  
Fecha: 2026-02-18  
Autor: Codex (analisis estatico, sin cambios de codigo)

## Objetivo de este documento

Consolidar en un solo backlog priorizado:

- Lo que hoy existe en UI/module/checkout.
- Lo que esta desalineado con el objetivo operativo solicitado.
- Que deberia hacer realmente el sistema.
- Evidencia trazable por archivo/linea.

## Objetivo operativo requerido (target)

1. En one-time NO se debe elegir Stripe o PayPal en product/cart/order.
2. Checkout debe recibir una `order` y mostrar metodos disponibles dinamicamente por `orderType`.
3. Una `subscription order`:
   - acepta exactamente 1 suscripcion,
   - no acepta productos one-time.
4. Una `one_time order`:
   - puede tener N productos (line items),
   - checkout muestra resumen de items y metodos de pago one-time.
5. En admin products:
   - usar DataTable (no tabla HTML basica),
   - quitar filtros manuales actuales de `kind/publication` y usar filtros DataTable,
   - `priceCurrency` debe ser `Select`,
   - monto en dolares (no campo en centavos para usuario admin),
   - eliminar `priceProvider` y `providerPriceId` del formulario.
6. En one-time debe existir doble entrada:
   - `Add to cart` puede seguir usando `/products/cart` y `/products/order` (cuando aplique),
   - `Buy now` debe saltar `/cart` + `/order` y enviar directo a `/checkout/[checkoutToken]`.
7. En suscripciones el flujo se mantiene directo a checkout:
   - `/pricing` -> `/checkout/[checkoutToken]` (sin cart ni order resume).

## Resumen ejecutivo

- Checkout core SI es order-first y SI separa `subscription` vs `one_time`.
- Checkout de suscripcion SI carga features del template antes de pago.
- El modulo one-time actual esta fuertemente acoplado a `provider` (selector + validacion + filtros), lo cual contradice el objetivo de metodos dinamicos.
- El modelo actual de orden one-time no representa un carrito real de N productos en tabla de line items; usa snapshot singular en metadata.
- El `buy now` one-time hoy no es directo: primero lleva a `/products/order` y recien desde ahi redirige a checkout.
- Admin products usa tabla/filtros manuales y contrato de pricing orientado a proveedor/cents, no a UX operativa de catalogo + checkout dinamico.

## Prioridades (backlog de correccion)

## P0-1: Remover provider-locking en one-time (bloqueador principal)

### Estado actual (evidencia)

- UI cart/order fuerza selector de proveedor:
  - `modules/mod.commerce.one-time-payments/src/pages.tsx:627`
  - `modules/mod.commerce.one-time-payments/src/pages.tsx:630`
  - `modules/mod.commerce.one-time-payments/src/pages.tsx:798`
  - `modules/mod.commerce.one-time-payments/src/pages.tsx:801`
- Action envia `provider` al crear intent:
  - `modules/mod.commerce.one-time-payments/src/actions.ts:86`
  - `modules/mod.commerce.one-time-payments/src/actions.ts:120`
- Validator exige provider (`stripe|paypal`):
  - `modules/mod.commerce.one-time-payments/src/validators.ts:185`
  - `modules/mod.commerce.one-time-payments/src/validators.ts:189`
- Checkout methods API filtra por `metadata.oneTime.provider`:
  - `app/api/checkout/methods/route.ts:48`
  - `app/api/checkout/methods/route.ts:61`
  - `app/api/checkout/methods/route.ts:74`
- Checkout page aplica el mismo filtro:
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:174`
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:184`
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:190`
- Module payment-method start rechaza mismatch por provider:
  - `modules/mod.commerce.one-time-payments/src/api-handler.ts:293`
  - `modules/mod.commerce.one-time-payments/src/api-handler.ts:396`
  - `tests/modules/mod-commerce-onetime-api.test.ts:432`

### Gap vs objetivo

Hoy se elige proveedor antes de checkout. El objetivo requiere NO elegir proveedor; checkout debe decidir metodos disponibles por registro de metodos y `orderType`.

### Requerimiento real

- Eliminar provider como input funcional en catalog/cart/order.
- Eliminar filtro runtime de metodos por `oneTime.provider`.
- Mantener seleccion de metodo solo dentro de checkout (por `paymentMethodId`).

### Criterios de aceptacion

- No existe `<select name="provider">` en cart/order one-time.
- `createOneTimeCheckoutIntent` no requiere `provider`.
- `GET /api/checkout/methods` para one_time no depende de `metadata.oneTime.provider`.
- Iniciar pago depende solo del metodo elegido en checkout (`/pay/[paymentMethodId]`).

## P0-2: Modelo de orden one-time no soporta N productos por order

### Estado actual (evidencia)

- `checkout_orders` guarda snapshot agregado (amount/currency/planName/metadata), sin tabla de items:
  - `lib/db/schema.ts:247`
  - `lib/db/schema.ts:270`
  - `lib/db/schema.ts:273`
- Metadata one-time es singular (`productId`, `quantity`, etc.):
  - `lib/payments/checkout-orders.ts:55`
  - `lib/payments/checkout-orders.ts:59`
  - `lib/payments/checkout-orders.ts:61`
- Creacion de one-time order recibe `amount` y `currency` (no line-items):
  - `lib/payments/checkout-orders.ts:935`
  - `lib/payments/checkout-orders.ts:942`
  - `lib/payments/checkout-orders.ts:956`
- Snapshot one-time serializa un solo producto:
  - `lib/payments/checkout-orders.ts:1006`
  - `lib/payments/checkout-orders.ts:1018`
  - `lib/payments/checkout-orders.ts:1028`

### Gap vs objetivo

Tu objetivo requiere `1 order -> N productos` para one-time. El modelo actual no expresa line items en entidad dedicada y opera con snapshot singular.

### Requerimiento real

- Definir estructura de order items para one-time.
- Enforzar que `subscription order` no mezcle items one-time.
- Mantener `orderType` como selector de flujo de checkout.

### Criterios de aceptacion

- Existe representacion explicita de N items por one-time order (persistente).
- Checkout one-time renderiza lista de items y totales desde esa estructura.
- Restriccion de mezcla: subscription order no puede incluir items one-time.

## P0-3: Contrato de pricing de admin products no es operativo para el target

### Estado actual (evidencia)

- Form create/edit usa `priceCurrency` como texto libre:
  - `modules/mod.commerce.products/src/pages.tsx:984`
  - `modules/mod.commerce.products/src/pages.tsx:1200`
- Form create/edit usa cents (`priceUnitAmountCents`):
  - `modules/mod.commerce.products/src/pages.tsx:996`
  - `modules/mod.commerce.products/src/pages.tsx:1212`
  - `modules/mod.commerce.products/i18n/admin/en.json:61`
- Form create/edit expone provider + providerPriceId:
  - `modules/mod.commerce.products/src/pages.tsx:1010`
  - `modules/mod.commerce.products/src/pages.tsx:1021`
  - `modules/mod.commerce.products/src/pages.tsx:1227`
  - `modules/mod.commerce.products/src/pages.tsx:1238`
- Actions/validators/schema sostienen ese contrato:
  - `modules/mod.commerce.products/src/actions.ts:91`
  - `modules/mod.commerce.products/src/actions.ts:92`
  - `modules/mod.commerce.products/src/actions.ts:93`
  - `modules/mod.commerce.products/src/actions.ts:114`
  - `modules/mod.commerce.products/db/schema.ts:70`
  - `modules/mod.commerce.products/db/schema.ts:72`
  - `modules/mod.commerce.products/db/schema.ts:73`

### Gap vs objetivo

Admin hoy define precio por proveedor y en cents. Tu target requiere pricing de producto neutral al proveedor y UX en dolares.

### Requerimiento real

- `priceCurrency` con `Select` (lista controlada).
- `priceAmount` en unidad monetaria visible (ej. USD 19.99), con conversion interna segura.
- Remover `priceProvider` y `providerPriceId` de create/edit.

### Criterios de aceptacion

- Form admin no pide provider/providerPriceId.
- Campo de monto visible en dolares, validado con precision adecuada.
- Persistencia mantiene consistencia monetaria (sin romper integridad actual).

## P0-4: Provider debe resolverse en start-payment (late binding), no en intent inicial

### Estado actual (evidencia)

- El intent one-time persiste `provider` como campo obligatorio de dominio:
  - `modules/mod.commerce.one-time-payments/db/schema.ts:37`
  - `modules/mod.commerce.one-time-payments/src/types.ts:20`
  - `modules/mod.commerce.one-time-payments/src/types.ts:34`
- El validator exige `provider` antes de crear intent:
  - `modules/mod.commerce.one-time-payments/src/validators.ts:185`
  - `modules/mod.commerce.one-time-payments/src/validators.ts:189`
- El create intent guarda `provider` en estado inicial:
  - `modules/mod.commerce.one-time-payments/src/data.ts:907`
- El dispatcher de metodo falla por mismatch de provider en intent:
  - `modules/mod.commerce.one-time-payments/src/api-handler.ts:293`
  - `modules/mod.commerce.one-time-payments/src/api-handler.ts:396`

### Gap vs objetivo

Si se elimina selector de provider en UX, el dominio actual queda inconsistente porque exige provider en intent antes de entrar a checkout.

### Requerimiento real

- Crear intent one-time sin provider bloqueado.
- Resolver provider solamente cuando el usuario elige `paymentMethodId` dentro de checkout.
- Persistir provider seleccionado en transicion de start-payment (no en create intent).

### Criterios de aceptacion

- `createOneTimeCheckoutIntent` funciona sin `provider`.
- `intent.provider` deja de ser requisito en estado inicial (nullable o derivado posterior).
- Los handlers `payment-methods/*/start` no dependen de mismatch contra provider preseleccionado.

## P0-5: Flujo `buy now` one-time debe crear checkout directo (sin cart/order)

### Estado actual (evidencia)

- La card de catalogo construye `orderPath` y enlaza `buy now` a `/products/order`, no a `/checkout/[token]`:
  - `modules/mod.commerce.one-time-payments/src/pages.tsx:395`
  - `modules/mod.commerce.one-time-payments/src/pages.tsx:425`
- La redireccion a checkout ocurre despues de submit en la pagina `/products/order`:
  - `modules/mod.commerce.one-time-payments/src/pages.tsx:780`
  - `modules/mod.commerce.one-time-payments/src/actions.ts:148`
  - `modules/mod.commerce.one-time-payments/src/actions.ts:161`
- En suscripciones, el flujo ya es directo a checkout desde pricing:
  - `lib/payments/actions.ts:271`

### Gap vs objetivo

El comportamiento actual agrega una pantalla intermedia (`/products/order`) para `buy now`; el objetivo requiere salto directo a checkout tokenizado para one-time (igual que subscriptions, pero con orden one-time).

### Requerimiento real

- Mantener dos entradas en one-time:
  - `Add to cart` (flujo carrito/resumen cuando aplique),
  - `Buy now` (handoff directo a checkout).
- `Buy now` debe crear la `checkout order` one-time sin pasar por `/products/cart` ni `/products/order`.
- El handoff directo debe respetar la regla de no seleccionar provider antes de checkout.

### Criterios de aceptacion

- Desde `/products`, `Buy now` redirige a `/checkout/[checkoutToken]` en un solo paso.
- `Buy now` no renderiza `/products/cart` ni `/products/order` como paso intermedio.
- Suscripciones mantienen `/pricing` -> `/checkout/[checkoutToken]` sin cambios de flujo.

## P1-1: Admin products list debe migrar a DataTable host (no tabla HTML manual)

### Estado actual (evidencia)

- Lista usa filtros GET y tabla HTML:
  - `modules/mod.commerce.products/src/pages.tsx:693`
  - `modules/mod.commerce.products/src/pages.tsx:717`
  - `modules/mod.commerce.products/src/pages.tsx:771`
- Filtrado es local en memoria sobre `limit: 300`:
  - `modules/mod.commerce.products/src/pages.tsx:654`
  - `modules/mod.commerce.products/src/pages.tsx:685`
- Infra de DataTable ya existe en host:
  - `components/ui/data-table.tsx:58`
  - `components/ui/data-table.tsx:81`
  - `app/(dashboard)/admin/users/users-data-table.tsx:25`
  - `tests/sdk/datatables-crud.test.ts:4`

### Gap vs objetivo

La vista actual no aprovecha DataTable (filtro/sort/paginacion/visibilidad de columnas), y los filtros `kind/publication` quedan fuera de la experiencia estandar.

### Requerimiento real

- Reemplazar tabla manual por `DataTable`.
- Integrar filtros de `kind/publication` como filtros de columnas/DataTable.
- Evitar filtro en memoria para dataset creciente.

### Criterios de aceptacion

- Home admin products renderiza con `DataTable`.
- Filtros de kind/publication viven en toolbar/filtros de DataTable.
- Remover bloque de filtros GET manuales actuales.

## P1-2: Checkout core valida bien la separacion subscription vs one_time (base util)

### Estado actual (evidencia)

- Route de pago es dinamica por metodo (`pay/[paymentMethodId]`):
  - `app/api/checkout/[checkoutToken]/pay/[paymentMethodId]/route.ts:22`
  - `app/api/checkout/[checkoutToken]/pay/[paymentMethodId]/route.ts:73`
- Checkout page acepta `subscription` o `one_time`:
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:147`
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:153`
- Para suscripcion, carga template y features publicas:
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:155`
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:359`
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx:362`
- Capacidad por order type en metodos:
  - `lib/payments/payment-methods.ts:89`
  - `lib/payments/payment-methods.ts:105`
  - `lib/payments/payment-methods.ts:208`

### Lectura operativa

Esta base es compatible con tu direccion de arquitectura. El problema principal no es el core order-first, sino el acoplamiento por provider dentro del modulo one-time.

## P1-3: `providerPriceId` hoy no dirige el start checkout one-time

### Estado actual (evidencia)

- Stripe start usa `price_data` con snapshot (currency + unit_amount):
  - `modules/mod.commerce.one-time-payments/src/checkout/stripe.ts:159`
  - `modules/mod.commerce.one-time-payments/src/checkout/stripe.ts:161`
- PayPal start usa amount/currency snapshot:
  - `modules/mod.commerce.one-time-payments/src/checkout/paypal.ts:152`
  - `modules/mod.commerce.one-time-payments/src/checkout/paypal.ts:153`
- `providerPriceId` aparece en webhooks como `providerPlanId`:
  - `modules/mod.commerce.one-time-payments/src/webhooks/stripe.ts:332`
  - `modules/mod.commerce.one-time-payments/src/webhooks/paypal.ts:408`

### Gap vs objetivo

Si el producto no debe estar acoplado a proveedor, `providerPriceId` pierde sentido funcional en admin product form.

## P1-4: Falta trazabilidad fuerte `intent/fulfillment -> checkout order`

### Estado actual (evidencia)

- `mod_commerce_onetime_fulfillments` tiene columna `order_id`, pero el alta inicial guarda `null`:
  - `modules/mod.commerce.one-time-payments/db/schema.ts:121`
  - `modules/mod.commerce.one-time-payments/src/data.ts:1287`
- Los webhooks sincronizan estado de checkout por `providerSessionId`, pero no consolidan link persistente de fulfillment con order:
  - `modules/mod.commerce.one-time-payments/src/webhooks/stripe.ts:118`
  - `modules/mod.commerce.one-time-payments/src/webhooks/paypal.ts:157`

### Gap vs objetivo

Sin link estable `order_id`, soporte operativo/auditoria queda fragmentado (intent, fulfillment y core checkout/order en registros separados sin relacion fuerte).

### Requerimiento real

- Persistir `orderId` en fulfillment cuando exista checkout order asociado.
- Mantener reconciliacion idempotente para eventos repetidos.

### Criterios de aceptacion

- Fulfillment final (`paid/failed/canceled/refunded`) referencia `orderId` cuando proviene de core checkout.
- Una consulta unica permite navegar intent -> fulfillment -> order sin inferencias por metadata.

## P1-5: Migracion de metadata/order model requiere compatibilidad explicita

### Estado actual (evidencia)

- El metadata schema version esta fijo en `1` y se parsea de forma tolerante:
  - `lib/payments/checkout-orders.ts:35`
  - `lib/payments/checkout-orders.ts:193`
  - `lib/payments/checkout-orders.ts:1005`
- El flujo actual depende de metadata singular one-time (`productId`, `quantity`, `provider`):
  - `lib/payments/checkout-orders.ts:55`
  - `lib/payments/checkout-orders.ts:59`
  - `lib/payments/checkout-orders.ts:63`

### Gap vs objetivo

Pasar a line-items y provider late-binding sin estrategia de compatibilidad puede romper checkouts en curso y replays webhook.

### Requerimiento real

- Definir migracion por version de metadata (lectura backward compatible).
- Mantener compatibilidad temporal para tokens/intsents ya emitidos.
- Declarar fecha/criterio de retiro del formato legado.

### Criterios de aceptacion

- Checkout renderiza y procesa tanto formato legado como nuevo durante ventana de migracion.
- Webhooks no fallan por payloads/order metadata pre-migracion.

## P2-1: Regla "1 subscription = 1 order" no esta forzada de forma estricta global

### Estado actual (evidencia)

- Hay reuso de checkout order solo en ciertos estados/contexto:
  - `lib/payments/checkout-orders.ts:533`
  - `lib/payments/checkout-orders.ts:550`
  - `lib/payments/checkout-orders.ts:560`
- Si no reusa, crea nuevas checkout orders:
  - `lib/payments/checkout-orders.ts:751`
- No hay constraint de unicidad global sobre tu regla de negocio en `checkout_orders`:
  - `lib/db/schema.ts:247`

### Gap vs objetivo

Tu regla es de negocio fuerte; hoy se cumple parcialmente por logica de reuso, no por invariante global.

## P2-2: Plan vigente contiene decisiones que hoy contradicen el objetivo actual

### Estado actual (evidencia)

- Plan marca como completado definir selector de provider:
  - `plans/checkout-modules-one-time-products-plan.md:399`

### Gap vs objetivo

Ese criterio ya no es valido con la direccion actual ("no elegir Stripe/PayPal antes de checkout").

### Requerimiento real

- Actualizar plan y checklist para quitar dependencias de provider selector.

## Estado actual vs comportamiento requerido (matriz corta)

| Tema | Estado actual | Requerido |
| --- | --- | --- |
| Seleccion de provider one-time | Se elige en cart/order | No se elige; checkout decide metodos dinamicos |
| Entrada one-time `buy now` | `/products` -> `/products/order` -> `/checkout/[token]` | `/products` -> `/checkout/[token]` directo |
| Entrada subscription | `/pricing` -> `/checkout/[token]` | Mantener directo (`/pricing` -> `/checkout/[token]`) |
| Checkout one-time | Filtra metodos por `metadata.oneTime.provider` | Filtra por capacidad/orderType, no por provider fijo |
| Modelo one-time | Snapshot singular en metadata | N line-items por order |
| Admin products table | Tabla HTML + filtros GET | DataTable con filtros/sort/paginacion |
| Currency input | Texto libre | Select controlado |
| Amount input | Cents en UI | Dolares en UI (conversion interna) |
| Product-provider fields | `priceProvider` + `providerPriceId` | Remover del flujo admin |
| Binding de provider one-time | Se define al crear intent | Se define al iniciar metodo de pago en checkout |
| Trazabilidad fulfillment-order | `orderId` no consolidado | `orderId` persistido y auditable |
| Compatibilidad de migracion | Implicita/no declarada | Estrategia versionada y backward compatible |

## Riesgos de no corregir P0

- Incoherencia funcional: UX promete libertad de metodos pero flujo bloquea por provider.
- Friccion de compra: `buy now` agrega una pantalla intermedia innecesaria para compras directas.
- Escalabilidad limitada: no existe base real para carrito de multiples items.
- Deuda operativa: admin configura campos sin impacto funcional claro (provider/providerPriceId).
- Riesgo de regresion al quitar provider sin late-binding: intents pueden quedar sin ruta de start valida.
- Trazabilidad incompleta ante incidentes: dificil correlacion entre webhook, fulfillment y order real.

## Orden recomendado de ejecucion (sin codigo en este documento)

1. Cerrar definicion de dominio order/item (P0-2) y reglas de mezcla.
2. Resolver provider one-time como late-binding en start-payment (P0-4).
3. Desacoplar provider del flujo one-time en UX y filtros checkout (P0-1).
4. Implementar handoff directo de `buy now` a checkout tokenizado (P0-5).
5. Ajustar contrato admin pricing (P0-3).
6. Consolidar trazabilidad fulfillment -> order (P1-4).
7. Migrar lista admin products a DataTable y filtros nativos (P1-1).
8. Ejecutar estrategia de compatibilidad/migracion metadata (P1-5).
9. Endurecer invariantes subscription-order y actualizar plan base vigente (P2-1, P2-2).

## Nota de alcance

Este archivo documenta analisis y backlog de correccion.  
No se realizaron cambios de codigo ni migraciones en esta tarea.
