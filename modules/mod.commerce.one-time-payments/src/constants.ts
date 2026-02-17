export const COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID =
  'mod.commerce.one-time-payments';
export const COMMERCE_ONE_TIME_PAYMENTS_MODULE_VERSION = '0.1.0';
export const COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS = '/products';

export const COMMERCE_ONE_TIME_PAYMENTS_ROUTES = {
  health: '/health',
  checkoutSessions: '/checkout-sessions',
  intentById: '/intents/:intentId',
  paymentMethodStripeStart: '/payment-methods/stripe/start',
  paymentMethodStripeCancel: '/payment-methods/stripe/cancel',
  paymentMethodPayPalStart: '/payment-methods/paypal/start',
  paymentMethodPayPalCancel: '/payment-methods/paypal/cancel',
  webhookStripe: '/webhooks/stripe',
  webhookPayPal: '/webhooks/paypal'
} as const;

export const COMMERCE_ONE_TIME_PAYMENTS_EVENTS = {
  fulfillmentUpdated: 'mod.commerce.one-time-payments.fulfillment.updated'
} as const;
