import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUiAsyncSubmitButtonTemplatePayload } from '../../lib/templates/ui-async-submit-button-payload';

test('normalizeUiAsyncSubmitButtonTemplatePayload returns empty object for invalid payloads', () => {
  assert.deepEqual(normalizeUiAsyncSubmitButtonTemplatePayload(null), {});
  assert.deepEqual(normalizeUiAsyncSubmitButtonTemplatePayload(undefined), {});
  assert.deepEqual(normalizeUiAsyncSubmitButtonTemplatePayload('invalid'), {});
  assert.deepEqual(normalizeUiAsyncSubmitButtonTemplatePayload([]), {});
});

test('normalizeUiAsyncSubmitButtonTemplatePayload trims known class fields', () => {
  const payload = normalizeUiAsyncSubmitButtonTemplatePayload({
    className: '  rounded-md border  ',
    iconClassName: '  text-primary  ',
    unknown: 'ignored'
  });

  assert.deepEqual(payload, {
    className: 'rounded-md border',
    iconClassName: 'text-primary'
  });
});

