import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUiTableTemplatePayload } from '../../lib/templates/ui-table-payload';

test('normalizeUiTableTemplatePayload returns empty object for invalid payloads', () => {
  assert.deepEqual(normalizeUiTableTemplatePayload(null), {});
  assert.deepEqual(normalizeUiTableTemplatePayload(undefined), {});
  assert.deepEqual(normalizeUiTableTemplatePayload('invalid'), {});
  assert.deepEqual(normalizeUiTableTemplatePayload([]), {});
});

test('normalizeUiTableTemplatePayload trims and keeps known class keys', () => {
  const payload = normalizeUiTableTemplatePayload({
    containerClassName: '  rounded-md border  ',
    tableClassName: '  text-xs  ',
    unknownKey: 'ignored'
  });

  assert.deepEqual(payload, {
    containerClassName: 'rounded-md border',
    tableClassName: 'text-xs'
  });
});

test('normalizeUiTableTemplatePayload drops empty class values', () => {
  const payload = normalizeUiTableTemplatePayload({
    containerClassName: '   ',
    tableClassName: '',
    other: 12
  });

  assert.deepEqual(payload, {
    containerClassName: undefined,
    tableClassName: undefined
  });
});

