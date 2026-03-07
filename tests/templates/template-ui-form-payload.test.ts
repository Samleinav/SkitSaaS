import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUiFormTemplatePayload } from '../../lib/templates/ui-form-payload';

test('normalizeUiFormTemplatePayload returns empty object for invalid payloads', () => {
  assert.deepEqual(normalizeUiFormTemplatePayload(null), {});
  assert.deepEqual(normalizeUiFormTemplatePayload(undefined), {});
  assert.deepEqual(normalizeUiFormTemplatePayload('invalid'), {});
  assert.deepEqual(normalizeUiFormTemplatePayload([]), {});
});

test('normalizeUiFormTemplatePayload trims and keeps known class keys', () => {
  const payload = normalizeUiFormTemplatePayload({
    formClassName: '  space-y-6  ',
    sectionClassName: '  space-y-4  ',
    sectionDescriptionClassName: '  text-sm text-muted-foreground  ',
    fieldErrorTextClassName: '  text-red-600  ',
    inputClassName: '  h-10  ',
    checkboxWrapperClassName: '  bg-muted/20  ',
    formErrorClassName: '  bg-red-50  ',
    actionsClassName: '  justify-start  ',
    unknown: 'ignored'
  });

  assert.deepEqual(payload, {
    formClassName: 'space-y-6',
    headerClassName: undefined,
    titleClassName: undefined,
    descriptionClassName: undefined,
    sectionClassName: 'space-y-4',
    sectionHeaderClassName: undefined,
    sectionTitleClassName: undefined,
    sectionDescriptionClassName: 'text-sm text-muted-foreground',
    gridClassName: undefined,
    fieldClassName: undefined,
    labelClassName: undefined,
    descriptionTextClassName: undefined,
    fieldErrorTextClassName: 'text-red-600',
    inputClassName: 'h-10',
    textareaClassName: undefined,
    selectClassName: undefined,
    checkboxWrapperClassName: 'bg-muted/20',
    formErrorClassName: 'bg-red-50',
    actionsClassName: 'justify-start'
  });
});

test('normalizeUiFormTemplatePayload drops empty class values', () => {
  const payload = normalizeUiFormTemplatePayload({
    formClassName: '   ',
    gridClassName: '',
    selectClassName: '  '
  });

  assert.deepEqual(payload, {
    formClassName: undefined,
    headerClassName: undefined,
    titleClassName: undefined,
    descriptionClassName: undefined,
    sectionClassName: undefined,
    sectionHeaderClassName: undefined,
    sectionTitleClassName: undefined,
    sectionDescriptionClassName: undefined,
    gridClassName: undefined,
    fieldClassName: undefined,
    labelClassName: undefined,
    descriptionTextClassName: undefined,
    fieldErrorTextClassName: undefined,
    inputClassName: undefined,
    textareaClassName: undefined,
    selectClassName: undefined,
    checkboxWrapperClassName: undefined,
    formErrorClassName: undefined,
    actionsClassName: undefined
  });
});
