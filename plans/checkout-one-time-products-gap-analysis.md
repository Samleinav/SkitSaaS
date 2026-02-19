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
- El acoplamiento principal a `provider` en flujo one-time se redujo (sin selector en UI baseline y sin filtro provider en checkout), pero quedan contratos legacy internos.
- El modelo actual de orden one-time no representa un carrito real de N productos en tabla de line items; usa snapshot singular en metadata.
- El `buy now` one-time ya es directo (`/products` -> `/checkout/[checkoutToken]`).
- Admin products ya usa DataTable y formulario de precio en monto decimal + moneda select; quedan contratos legacy de provider en capas internas.

## Prioridades (backlog de correccion)

## P0-1: Remover provider-locking en one-time (bloqueador principal)

### Estado actual (evidencia)

- UI baseline one-time ya no expone selector de provider en catalog/order:
  - `modules/mod.commerce.one-time-payments/src/pages.tsx`
- Actions frontend crean intent en `core_checkout` con `provider: null`:
  - `modules/mod.commerce.one-time-payments/src/actions.ts`
- Validator ya no requiere provider para flujo baseline y defaultea a `core_checkout` cuando no hay `provider/checkoutMode`:
  - `modules/mod.commerce.one-time-payments/src/validators.ts`
  - `tests/modules/mod-commerce-onetime-validation.test.ts`
- Checkout methods API no filtra por `metadata.oneTime.provider`:
  - `app/api/checkout/methods/route.ts`
- Checkout page no filtra metodos por provider preseleccionado:
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx`
- Start handlers one-time aplican late-binding y rebind por metodo:
  - `modules/mod.commerce.one-time-payments/src/api-handler.ts`
  - `tests/modules/mod-commerce-onetime-api.test.ts`

### Gap vs objetivo

El bloqueo principal por seleccion previa de provider quedo mitigado en el baseline. Pendiente: remover deuda legacy (`provider_session`/campos provider) para consolidar un modelo totalmente provider-agnostic antes del checkout.

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

- Existe tabla dedicada de items por checkout order:
  - `lib/db/schema.ts:332`
  - `lib/db/migrations/0023_checkout_order_items.sql`
- La creacion de one-time order acepta `lineItems` y persiste `checkout_orders` + `checkout_order_items` en transaccion:
  - `lib/payments/checkout-orders.ts:1179`
  - `lib/payments/checkout-orders.ts:1331`
- Checkout one-time ya consume items persistidos para el resumen (con fallback legacy):
  - `app/(frontend)/checkout/[checkoutToken]/page.tsx`
- Metadata one-time sigue conservando campos singulares por compatibilidad backward:
  - `lib/payments/checkout-orders.ts:64`
  - `lib/payments/checkout-orders.ts:1316`

### Gap vs objetivo

El gap principal de persistencia/render de line items quedo cubierto. Falta cerrar el flujo completo de carrito multi-item (acumulacion de N productos antes de crear checkout) y la validacion de reglas de mezcla a nivel de dominio/entrada.

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

- Form create/edit ya usa `priceCurrency` con `select`:
  - `modules/mod.commerce.products/src/pages.tsx`
- Form create/edit ya usa `priceAmount` decimal (dinero visible) y no `priceUnitAmountCents`:
  - `modules/mod.commerce.products/src/pages.tsx`
  - `modules/mod.commerce.products/src/actions.ts`
- Form create/edit ya no expone `priceProvider` ni `providerPriceId`:
  - `modules/mod.commerce.products/src/pages.tsx`
  - `tests/modules/mod-commerce-products-pages.test.ts`
- Actions convierten `priceAmount` decimal a centavos y fuerzan `provider/providerPriceId` a `null`:
  - `modules/mod.commerce.products/src/actions.ts`
- Persistencia mantiene columnas provider/providerPriceId por compatibilidad de esquema:
  - `modules/mod.commerce.products/db/schema.ts`

### Gap vs objetivo

El gap principal de UX/admin para pricing quedo cubierto (select + monto decimal + sin provider fields en formulario). Pendiente: limpieza de contrato interno legado (`provider/providerPriceId`) en validadores/tipos/API y decision de migracion de columnas.

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
- El validator baseline ya no exige `provider` y defaultea a `core_checkout`:
  - `modules/mod.commerce.one-time-payments/src/validators.ts`
  - `tests/modules/mod-commerce-onetime-validation.test.ts`
- El create intent guarda `provider` en estado inicial:
  - `modules/mod.commerce.one-time-payments/src/data.ts:907`
- Start handlers one-time ya aplican rebind por metodo seleccionado:
  - `modules/mod.commerce.one-time-payments/src/api-handler.ts`
  - `modules/mod.commerce.one-time-payments/src/data.ts`
  - `tests/modules/mod-commerce-onetime-api.test.ts`

### Gap vs objetivo

El bloqueo principal por mismatch en `payment-methods/*/start` y el requisito de provider en entrada baseline quedaron resueltos, pero el modelo sigue cargando campos legacy de `provider` en intent/schema para compatibilidad.

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

- La card de catalogo ejecuta server action directa para checkout:
  - `modules/mod.commerce.one-time-payments/src/pages.tsx`
  - `tests/modules/mod-commerce-onetime-pages.test.ts`
- `buy_now` ya marca el source explicito en form/action:
  - `modules/mod.commerce.one-time-payments/src/pages.tsx`
  - `modules/mod.commerce.one-time-payments/src/actions.ts`
- En errores del flujo `buy_now`, la redireccion vuelve al catalogo (`/products`) en vez de `/products/order`:
  - `modules/mod.commerce.one-time-payments/src/actions.ts`
- En suscripciones, el flujo ya es directo a checkout desde pricing:
  - `lib/payments/actions.ts:271`

### Gap vs objetivo

El gap funcional principal de `buy_now` directo ya esta cubierto, incluyendo surface de error en `/products` a partir de `?error=` para evitar salto a `/products/order`.

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

- Home admin products ya usa `DataTable` host:
  - `modules/mod.commerce.products/src/pages.tsx`
  - `modules/mod.commerce.products/src/admin-products-data-table.tsx`
- Filtros manuales GET (`kind/publication`) fueron removidos del page server y ahora viven en toolbar de la tabla (estado cliente).
- Infra de DataTable ya existe en host:
  - `components/ui/data-table.tsx:58`
  - `components/ui/data-table.tsx:81`
  - `app/(dashboard)/admin/users/users-data-table.tsx:25`
  - `tests/sdk/datatables-crud.test.ts:4`
- La carga sigue siendo `listCommerceProducts({ limit: 300 })` (sin paginacion server-side aun).

### Gap vs objetivo

El gap principal de UX quedo cubierto (DataTable + filtros en toolbar + sin filtros GET manuales). Pendiente para escalabilidad: paginacion/filtro server-side para datasets > `limit` actual.

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

## P1-4: Trazabilidad `intent/fulfillment -> checkout order` (progreso)

### Estado actual (evidencia)

- `mod_commerce_onetime_fulfillments` persiste `order_id` cuando el webhook resuelve un checkout order asociado:
  - `modules/mod.commerce.one-time-payments/src/data.ts`
  - `modules/mod.commerce.one-time-payments/src/webhooks/stripe.ts`
  - `modules/mod.commerce.one-time-payments/src/webhooks/paypal.ts`
- La sincronizacion de estado de checkout y el registro de fulfillment ahora usan la misma resolucion de checkout order (evita correlacion solo por metadata implicita).

### Gap vs objetivo

El gap principal de persistencia de `order_id` quedo cubierto. Pendiente opcional: exponer una vista/consulta operativa dedicada para navegar `intent -> fulfillment -> checkout_order` sin leer payloads tecnicos.

### Requerimiento real

- Persistir `orderId` en fulfillment cuando exista checkout order asociado.
- Mantener reconciliacion idempotente para eventos repetidos.

### Criterios de aceptacion

- Fulfillment final (`paid/failed/canceled/refunded`) referencia `orderId` cuando proviene de core checkout.
- Una consulta unica permite navegar intent -> fulfillment -> order sin inferencias por metadata.

## P1-5: Migracion de metadata/order model requiere compatibilidad explicita

### Estado actual (evidencia)

- El parser de metadata ahora normaliza compatibilidad explicita:
  - infiere `schemaVersion` cuando falta en payload legado.
  - valida/normaliza envelope `oneTime` sin romper lecturas.
  - `lib/payments/checkout-orders.ts`
  - `tests/payments/checkout-orders.test.ts`
- El flujo actual depende de metadata singular one-time (`productId`, `quantity`, `provider`):
  - `lib/payments/checkout-orders.ts:55`
  - `lib/payments/checkout-orders.ts:59`
  - `lib/payments/checkout-orders.ts:63`

### Gap vs objetivo

La base de compatibilidad de lectura ya esta aplicada; pendiente definir retiro del formato legado singular y cerrar la ventana de coexistencia por version.

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
| Seleccion de provider one-time | No se elige en UI baseline (`/products*`); legacy API aun permite `provider_session` | No se elige; checkout decide metodos dinamicos |
| Entrada one-time `buy now` | `/products` -> `/checkout/[token]` directo (server action) | Mantener directo (`/products` -> `/checkout/[token]`) |
| Entrada subscription | `/pricing` -> `/checkout/[token]` | Mantener directo (`/pricing` -> `/checkout/[token]`) |
| Checkout one-time | Filtra metodos por capacidad/orderType | Filtra por capacidad/orderType, no por provider fijo |
| Modelo one-time | Line-items persistidos en `checkout_order_items` + fallback legacy | Completar carrito N-items end-to-end antes de checkout |
| Admin products table | DataTable host con filtros en toolbar (cliente) | DataTable con filtros/sort/paginacion |
| Currency input | Select controlado en create/edit | Select controlado |
| Amount input | Monto decimal visible (`priceAmount`) con conversion interna | Dolares en UI (conversion interna) |
| Product-provider fields | No se exponen en formulario admin (persisten columnas legacy) | Remover del flujo admin |
| Binding de provider one-time | Late-binding en `payment-methods/*/start`; intent inicial puede quedar unbound | Se define al iniciar metodo de pago en checkout |
| Trazabilidad fulfillment-order | `orderId` se persiste cuando existe checkout order enlazada | `orderId` persistido y auditable |
| Compatibilidad de migracion | Implicita/no declarada | Estrategia versionada y backward compatible |

## Riesgos de no corregir P0

- Escalabilidad limitada: no existe aun carrito multi-item end-to-end previo a checkout (aunque line-items ya existen en checkout order).
- Deuda operativa: contratos internos legacy (`provider_session`, `providerPriceId`) siguen en tipos/metadata.
- Riesgo de regresion en migracion: limpiar provider legacy sin ventana compat puede romper intents/checkouts en curso.
- Si no se agrega una vista/consulta operativa dedicada, la correlacion existe pero sigue siendo mas manual de lo ideal para soporte.

## Orden recomendado de ejecucion (sin codigo en este documento)

1. Cerrar definicion de dominio order/item (P0-2) y reglas de mezcla.
2. Resolver provider one-time como late-binding en start-payment (P0-4).
3. Desacoplar provider del flujo one-time en UX y filtros checkout (P0-1).
4. `buy_now` directo + surface de error en catalog (`/products`) (P0-5, completado).
5. Ajustar contrato admin pricing (P0-3).
6. Consolidar trazabilidad fulfillment -> order (P1-4, persistencia ya implementada; queda hardening operativo opcional).
7. Migrar lista admin products a DataTable y filtros nativos (P1-1).
8. Ejecutar estrategia de compatibilidad/migracion metadata (P1-5).
9. Endurecer invariantes subscription-order y actualizar plan base vigente (P2-1, P2-2).

## Nota de alcance

Este archivo documenta analisis y backlog de correccion y se mantiene actualizado junto con la ejecucion tecnica.

