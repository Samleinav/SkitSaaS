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
