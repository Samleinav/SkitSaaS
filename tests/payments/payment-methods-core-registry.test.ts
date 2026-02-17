import assert from 'node:assert/strict';
import test from 'node:test';
import * as paymentMethodsNamespace from '../../lib/payments/payment-methods';
import { featureFlags } from '../../lib/feature-flags';

type PaymentMethodsExports = {
  getCheckoutPaymentMethodRegistry: () => Promise<{
    methods: Array<{
      paymentMethodId: string;
      ownerType?: string;
      routes: {
        startPath: string;
        cancelPath: string | null;
        returnPath: string | null;
        webhookPath: string | null;
      };
    }>;
  }>;
  supportsCheckoutPaymentMethodOrderType: (
    paymentMethod: { supportsOrderTypes: Array<'subscription' | 'one_time'> },
    orderType: string
  ) => boolean;
};

const paymentMethodsCandidate =
  (paymentMethodsNamespace as unknown as Record<string, unknown>).default ??
  (paymentMethodsNamespace as unknown as Record<string, unknown>)['module.exports'] ??
  paymentMethodsNamespace;
const paymentMethods = paymentMethodsCandidate as PaymentMethodsExports;

test('core payment methods expose canonical checkout dispatcher routes', async () => {
  const runtimeFlags = featureFlags as unknown as { useAppModulesRuntime: boolean };
  const originalRuntime = runtimeFlags.useAppModulesRuntime;

  runtimeFlags.useAppModulesRuntime = false;
  try {
    const registry = await paymentMethods.getCheckoutPaymentMethodRegistry();
    const stripe = registry.methods.find((method) => method.paymentMethodId === 'stripe');
    const paypal = registry.methods.find((method) => method.paymentMethodId === 'paypal');

    assert.ok(stripe);
    assert.equal(stripe.routes.startPath, '/api/checkout/{checkoutToken}/pay/stripe');
    assert.equal(stripe.routes.returnPath, '/api/checkout/methods/stripe/return');
    assert.equal(stripe.routes.webhookPath, '/api/checkout/methods/stripe/webhook');

    assert.ok(paypal);
    assert.equal(paypal.routes.startPath, '/api/checkout/{checkoutToken}/pay/paypal');
    assert.equal(paypal.routes.cancelPath, '/api/checkout/methods/paypal/cancel');
    assert.equal(paypal.routes.returnPath, '/api/checkout/methods/paypal/return');
    assert.equal(paypal.routes.webhookPath, '/api/checkout/methods/paypal/webhook');

    const methodIds = registry.methods.map((method) => method.paymentMethodId).sort();
    assert.deepEqual(methodIds, ['paypal', 'stripe']);
    assert.equal(
      registry.methods.every((method) => method.ownerType !== 'module'),
      true
    );
  } finally {
    runtimeFlags.useAppModulesRuntime = originalRuntime;
  }
});

test('supportsCheckoutPaymentMethodOrderType enforces capability matching', () => {
  const method = {
    supportsOrderTypes: ['subscription'] as Array<'subscription' | 'one_time'>
  };

  assert.equal(
    paymentMethods.supportsCheckoutPaymentMethodOrderType(method, 'subscription'),
    true
  );
  assert.equal(
    paymentMethods.supportsCheckoutPaymentMethodOrderType(method, 'one_time'),
    false
  );
  assert.equal(
    paymentMethods.supportsCheckoutPaymentMethodOrderType(method, 'invalid'),
    false
  );
});
