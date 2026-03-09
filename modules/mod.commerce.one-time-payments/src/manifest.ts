import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';
import { commerceOneTimePaymentsApiHandler } from './api-handler';
import {
  COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS,
  COMMERCE_ONE_TIME_PAYMENTS_ROUTES,
  COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
  COMMERCE_ONE_TIME_PAYMENTS_MODULE_VERSION
} from './constants';
import {
  renderOneTimeProductsCartPage,
  renderOneTimeProductsCatalogPage,
  renderOneTimeProductsOrderPage
} from './pages';

const commerceOneTimePaymentsFrontendPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: ({ context }) => renderOneTimeProductsCatalogPage(context)
    },
    {
      path: '/cart',
      handler: ({ context }) => renderOneTimeProductsCartPage(context)
    },
    {
      path: '/order',
      handler: ({ context }) => renderOneTimeProductsOrderPage(context)
    }
  ]
});

export default defineModule({
  moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
  version: COMMERCE_ONE_TIME_PAYMENTS_MODULE_VERSION,
  displayName: 'Commerce One-Time Payments',
  description:
    'One-time catalog module with intent checkout integration and provider webhooks.',
  runtimeConfig: {
    title: 'One-Time Payments Runtime',
    description:
      'Fallback runtime values for provider enablement and credentials used by one-time checkout.',
    fields: [
      {
        namespace: 'payments.stripe',
        configKey: 'enabled',
        envKey: 'STRIPE_ENABLED',
        kind: 'boolean',
        label: 'Stripe enabled',
        description: 'Enable Stripe for one-time payment intents.',
        defaultValue: 'true'
      },
      {
        namespace: 'payments.stripe',
        configKey: 'secret_key',
        envKey: 'STRIPE_SECRET_KEY',
        kind: 'password',
        label: 'Stripe secret key',
        description: 'Server secret key used to create Stripe checkout sessions.',
        secret: true
      },
      {
        namespace: 'payments.stripe',
        configKey: 'webhook_secret',
        envKey: 'STRIPE_WEBHOOK_SECRET',
        kind: 'password',
        label: 'Stripe webhook secret',
        description: 'Webhook signing secret for Stripe events.',
        secret: true
      },
      {
        namespace: 'payments.paypal',
        configKey: 'enabled',
        envKey: 'PAYPAL_ENABLED',
        kind: 'boolean',
        label: 'PayPal enabled',
        description: 'Enable PayPal for one-time payment intents.',
        defaultValue: 'true'
      },
      {
        namespace: 'payments.paypal',
        configKey: 'environment',
        envKey: 'PAYPAL_ENVIRONMENT',
        kind: 'select',
        label: 'PayPal environment',
        description: 'Choose the PayPal environment used by the module.',
        defaultValue: 'sandbox',
        options: [
          {
            value: 'sandbox',
            label: 'Sandbox'
          },
          {
            value: 'production',
            label: 'Production'
          }
        ]
      },
      {
        namespace: 'payments.paypal',
        configKey: 'client_id',
        envKey: 'PAYPAL_CLIENT_ID',
        kind: 'text',
        label: 'PayPal client ID',
        description: 'Client ID used for PayPal API authentication.'
      },
      {
        namespace: 'payments.paypal',
        configKey: 'client_secret',
        envKey: 'PAYPAL_CLIENT_SECRET',
        kind: 'password',
        label: 'PayPal client secret',
        description: 'Client secret used for PayPal API authentication.',
        secret: true
      },
      {
        namespace: 'payments.paypal',
        configKey: 'webhook_id',
        envKey: 'PAYPAL_WEBHOOK_ID',
        kind: 'text',
        label: 'PayPal webhook ID',
        description: 'Webhook ID used to validate incoming PayPal events.'
      }
    ]
  },
  frontendRouteAliases: [COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS],
  frontendRouteAccess: 'user',
  paymentMethods: [
    {
      paymentMethodId: 'onetime-stripe',
      displayName: 'Stripe (One-time)',
      description: 'Stripe payment flow for one-time checkout orders.',
      order: 110,
      supportsOrderTypes: ['one_time'],
      routes: {
        startPath: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodStripeStart,
        cancelPath: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodStripeCancel
      },
      metadata: {
        provider: 'stripe'
      }
    },
    {
      paymentMethodId: 'onetime-paypal',
      displayName: 'PayPal (One-time)',
      description: 'PayPal payment flow for one-time checkout orders.',
      order: 120,
      supportsOrderTypes: ['one_time'],
      routes: {
        startPath: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodPayPalStart,
        cancelPath: COMMERCE_ONE_TIME_PAYMENTS_ROUTES.paymentMethodPayPalCancel
      },
      metadata: {
        provider: 'paypal'
      }
    }
  ],
  frontendPage: commerceOneTimePaymentsFrontendPage,
  apiHandler: commerceOneTimePaymentsApiHandler
} satisfies ModuleManifest);
