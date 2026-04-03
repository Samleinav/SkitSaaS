import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defineModule,
  validateModuleManifest
} from '../../lib/modules/manifest';
import {
  buildPaymentMethodRegistry,
  type ModuleRuntimeRow
} from '../../lib/modules/runtime';

test('buildPaymentMethodRegistry resolves methods from enabled modules only', () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.pay.a',
      version: '1.0.0',
      displayName: 'Pay A',
      paymentMethods: [
        {
          paymentMethodId: 'walletx',
          displayName: 'Wallet X',
          supportsOrderTypes: ['subscription'],
          supportsTargetTypes: ['user'],
          routes: {
            startPath: '/payments/walletx/start',
            returnPath: '/payments/walletx/return',
            cancelPath: '/payments/walletx/cancel'
          }
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.pay.b',
      version: '1.0.0',
      displayName: 'Pay B',
      paymentMethods: [
        {
          paymentMethodId: 'wallety',
          displayName: 'Wallet Y',
          routes: {
            startPath: '/payments/wallety/start'
          }
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.pay.a',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.pay.b',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const registry = buildPaymentMethodRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });

  assert.equal(registry.issues.length, 0);
  assert.equal(registry.methods.length, 1);
  assert.equal(registry.methods[0]?.paymentMethodId, 'walletx');
  assert.equal(registry.methods[0]?.moduleId, 'mod.pay.a');
  assert.deepEqual(registry.methods[0]?.supportsOrderTypes, ['subscription']);
  assert.deepEqual(registry.methods[0]?.supportsTargetTypes, ['user']);
  assert.equal(registry.methods[0]?.routes.startPath, '/payments/walletx/start');
});

test('buildPaymentMethodRegistry defaults order and target types to full support', () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.pay.default',
      version: '1.0.0',
      displayName: 'Pay Default',
      paymentMethods: [
        {
          paymentMethodId: 'walletz',
          displayName: 'Wallet Z',
          routes: {
            startPath: '/payments/walletz/start'
          }
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.pay.default',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const registry = buildPaymentMethodRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });

  assert.equal(registry.methods.length, 1);
  assert.deepEqual(registry.methods[0]?.supportsOrderTypes, [
    'one_time',
    'subscription'
  ]);
  assert.deepEqual(registry.methods[0]?.supportsTargetTypes, ['team', 'user']);
});

test('buildPaymentMethodRegistry fails closed on duplicate payment method ids', () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.pay.alpha',
      version: '1.0.0',
      displayName: 'Pay Alpha',
      paymentMethods: [
        {
          paymentMethodId: 'walletx',
          routes: {
            startPath: '/payments/alpha/start'
          }
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.pay.beta',
      version: '1.0.0',
      displayName: 'Pay Beta',
      paymentMethods: [
        {
          paymentMethodId: 'walletx',
          routes: {
            startPath: '/payments/beta/start'
          }
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.pay.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.pay.beta',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const registry = buildPaymentMethodRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });

  assert.equal(registry.methods.length, 0);
  assert.equal(registry.issues.length, 1);
  assert.equal(registry.issues[0]?.code, 'duplicate_payment_method_id');
  assert.equal(registry.issues[0]?.paymentMethodId, 'walletx');
});

test('validateModuleManifest validates payment method definitions', () => {
  const errors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.pay.invalid',
      version: '1.0.0',
      displayName: 'Invalid Payments',
      paymentMethods: [
        {
          paymentMethodId: 'WalletX',
          routes: {
            startPath: '/payments/ok/start'
          }
        },
        {
          paymentMethodId: 'walletx',
          supportsOrderTypes: ['subscription', 'invalid' as 'subscription'],
          supportsTargetTypes: ['team', 'invalid' as 'team'],
          routes: {
            startPath: '/payments/ok/start'
          }
        },
        {
          paymentMethodId: 'wallety',
          routes: {
            startPath: 'payments/not-absolute'
          }
        },
        {
          paymentMethodId: 'walletx',
          routes: {
            startPath: '/payments/dup/start'
          }
        }
      ]
    })
  );

  assert.ok(errors.includes('module_payment_method_id_invalid:0'));
  assert.ok(errors.includes('module_payment_method_order_types_invalid:1'));
  assert.ok(errors.includes('module_payment_method_target_types_invalid:1'));
  assert.ok(errors.includes('module_payment_method_duplicate:walletx'));
  assert.ok(errors.includes('module_payment_method_start_path_invalid:2'));
});
