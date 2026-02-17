import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUiAlertDialogTemplatePayload } from '../../lib/templates/ui-alert-dialog-payload';

test('normalizeUiAlertDialogTemplatePayload returns empty object for invalid payloads', () => {
  assert.deepEqual(normalizeUiAlertDialogTemplatePayload(null), {});
  assert.deepEqual(normalizeUiAlertDialogTemplatePayload(undefined), {});
  assert.deepEqual(normalizeUiAlertDialogTemplatePayload('invalid'), {});
  assert.deepEqual(normalizeUiAlertDialogTemplatePayload([]), {});
});

test('normalizeUiAlertDialogTemplatePayload trims known class fields', () => {
  const payload = normalizeUiAlertDialogTemplatePayload({
    triggerClassName: '  w-full  ',
    contentClassName: '  max-w-xl  ',
    titleClassName: '  text-xl  ',
    descriptionClassName: '  text-sm  ',
    footerClassName: '  gap-4  ',
    cancelButtonClassName: '  min-w-24  ',
    confirmButtonClassName: '  min-w-24  ',
    unknown: 'ignored'
  });

  assert.deepEqual(payload, {
    triggerClassName: 'w-full',
    contentClassName: 'max-w-xl',
    titleClassName: 'text-xl',
    descriptionClassName: 'text-sm',
    footerClassName: 'gap-4',
    cancelButtonClassName: 'min-w-24',
    confirmButtonClassName: 'min-w-24'
  });
});

