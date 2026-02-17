import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEMPLATE_CONTRACT_VERSION,
  isTemplateContractRangeSatisfied,
  resolveTemplateContractCompatibility
} from '../../lib/templates/contract';

test('template contract range accepts exact version match', () => {
  const result = isTemplateContractRangeSatisfied(
    TEMPLATE_CONTRACT_VERSION,
    TEMPLATE_CONTRACT_VERSION
  );

  assert.equal(result, true);
});

test('template contract range accepts wildcard and caret compatible range', () => {
  assert.equal(
    isTemplateContractRangeSatisfied('*', TEMPLATE_CONTRACT_VERSION),
    true
  );
  assert.equal(
    isTemplateContractRangeSatisfied('^1.0.0', TEMPLATE_CONTRACT_VERSION),
    true
  );
});

test('template contract range rejects incompatible major range', () => {
  const result = isTemplateContractRangeSatisfied(
    '^2.0.0',
    TEMPLATE_CONTRACT_VERSION
  );

  assert.equal(result, false);
  assert.equal(
    resolveTemplateContractCompatibility('^2.0.0', TEMPLATE_CONTRACT_VERSION),
    'incompatible'
  );
});

test('template contract range returns invalid for malformed value', () => {
  const result = isTemplateContractRangeSatisfied(
    'invalid-range',
    TEMPLATE_CONTRACT_VERSION
  );

  assert.equal(result, null);
  assert.equal(
    resolveTemplateContractCompatibility(
      'invalid-range',
      TEMPLATE_CONTRACT_VERSION
    ),
    'invalid'
  );
});
