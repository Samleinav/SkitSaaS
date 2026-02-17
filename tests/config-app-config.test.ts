import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inferAppConfigIsSecret,
  mapLegacyProviderToNamespace,
  mapNamespaceToLegacyProvider,
  trimToNull,
} from '@/lib/config/app-config';

test('mapLegacyProviderToNamespace maps known providers to expected namespaces', () => {
  assert.equal(mapLegacyProviderToNamespace('stripe'), 'payments.stripe');
  assert.equal(mapLegacyProviderToNamespace('paypal'), 'payments.paypal');
  assert.equal(mapLegacyProviderToNamespace('smtp'), 'email.smtp');
  assert.equal(
    mapLegacyProviderToNamespace('organization'),
    'organization.policy'
  );
});

test('mapLegacyProviderToNamespace uses legacy namespace for unknown providers', () => {
  assert.equal(mapLegacyProviderToNamespace('custom-provider'), 'legacy.custom-provider');
  assert.equal(mapLegacyProviderToNamespace('  '), 'legacy.unknown');
});

test('mapNamespaceToLegacyProvider maps known namespaces to providers', () => {
  assert.equal(mapNamespaceToLegacyProvider('payments.stripe'), 'stripe');
  assert.equal(mapNamespaceToLegacyProvider('payments.paypal'), 'paypal');
  assert.equal(mapNamespaceToLegacyProvider('email.smtp'), 'smtp');
  assert.equal(mapNamespaceToLegacyProvider('organization.policy'), 'organization');
});

test('mapNamespaceToLegacyProvider handles legacy and unknown namespaces', () => {
  assert.equal(mapNamespaceToLegacyProvider('legacy.custom-provider'), 'custom-provider');
  assert.equal(mapNamespaceToLegacyProvider('module.theme'), 'module_theme');
  assert.equal(mapNamespaceToLegacyProvider('  '), 'unknown');
});

test('inferAppConfigIsSecret detects sensitive keys', () => {
  assert.equal(inferAppConfigIsSecret('secret_key'), true);
  assert.equal(inferAppConfigIsSecret('password'), true);
  assert.equal(inferAppConfigIsSecret('token'), true);
  assert.equal(inferAppConfigIsSecret('from_email'), false);
});

test('trimToNull normalizes blank and non blank values', () => {
  assert.equal(trimToNull(undefined), null);
  assert.equal(trimToNull('   '), null);
  assert.equal(trimToNull('  value  '), 'value');
});
