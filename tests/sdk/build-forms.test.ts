import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBuildFormFieldMask,
  buildFormField,
  composeBuildFormDefinition,
  defineBuildForm,
  defineBuildFormSection,
  isBuildFormTruthyValue,
  normalizeBuildFormColumns,
  normalizeBuildFormGap,
  resolveBuildFormValue,
  toBuildFormValueString,
  withBuildFormRequest,
  withBuildFormValues
} from '../../app/sdk/src/forms';

test('build form helpers merge prefills and request metadata predictably', () => {
  const baseForm = defineBuildForm({
    id: 'test-form',
    fields: [
      buildFormField.text({
        name: 'title',
        label: 'Title'
      })
    ],
    sections: [
      defineBuildFormSection({
        id: 'main',
        title: 'Main',
        fields: [
          buildFormField.select({
            name: 'status',
            label: 'Status',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' }
            ]
          })
        ]
      })
    ],
    values: {
      status: 'draft'
    },
    request: {
      method: 'post'
    }
  });

  const withValues = withBuildFormValues(baseForm, {
    title: 'Launch checklist',
    enabled: true
  });
  const withRequest = withBuildFormRequest(withValues, {
    action: '/admin/items'
  });

  assert.deepEqual(withValues.values, {
    status: 'draft',
    title: 'Launch checklist',
    enabled: true
  });
  assert.equal(withRequest.request?.method, 'post');
  assert.equal(withRequest.request?.action, '/admin/items');
  assert.equal(
    resolveBuildFormValue({
      definition: withValues,
      fieldName: 'title'
    }),
    'Launch checklist'
  );
  assert.equal(
    resolveBuildFormValue({
      definition: withValues,
      fieldName: 'missing',
      fallback: 'fallback'
    }),
    'fallback'
  );
});

test('composeBuildFormDefinition applies request, values, and submit overrides together', () => {
  const baseForm = defineBuildForm({
    id: 'test-compose',
    fields: [
      buildFormField.text({
        name: 'title',
        label: 'Title'
      })
    ]
  });

  const composed = composeBuildFormDefinition(baseForm, {
    request: {
      action: '/admin/items',
      method: 'post'
    },
    submit: {
      idleLabel: 'Save',
      pendingLabel: 'Saving...'
    },
    values: {
      title: 'Checklist'
    }
  });

  assert.equal(composed.request?.action, '/admin/items');
  assert.equal(composed.request?.method, 'post');
  assert.equal(composed.submit?.idleLabel, 'Save');
  assert.equal(composed.values?.title, 'Checklist');
});

test('build form helpers normalize layout and value conversions', () => {
  assert.equal(normalizeBuildFormColumns(3), 3);
  assert.equal(normalizeBuildFormColumns(9, 2), 2);
  assert.equal(normalizeBuildFormGap('lg'), 'lg');
  assert.equal(normalizeBuildFormGap('wide', 'sm'), 'sm');

  assert.equal(toBuildFormValueString(undefined), '');
  assert.equal(toBuildFormValueString(null), '');
  assert.equal(toBuildFormValueString(true), 'true');
  assert.equal(toBuildFormValueString(42), '42');
  assert.equal(toBuildFormValueString('draft'), 'draft');
});

test('build form helpers resolve truthy values consistently for checkboxes', () => {
  assert.equal(isBuildFormTruthyValue(true), true);
  assert.equal(isBuildFormTruthyValue(1), true);
  assert.equal(isBuildFormTruthyValue('YES'), true);
  assert.equal(isBuildFormTruthyValue('on'), true);
  assert.equal(isBuildFormTruthyValue(false), false);
  assert.equal(isBuildFormTruthyValue(0), false);
  assert.equal(isBuildFormTruthyValue('false'), false);
  assert.equal(isBuildFormTruthyValue(undefined), false);
});

test('build form field masks normalize supported input variants', () => {
  assert.equal(applyBuildFormFieldMask('ab12-34', 'digits'), '1234');
  assert.equal(applyBuildFormFieldMask('12..34x', 'decimal'), '12.34');
  assert.equal(applyBuildFormFieldMask('12345678901', 'phone'), '(123) 456-7890');
  assert.equal(
    applyBuildFormFieldMask(' Hello__World !! ', 'slug'),
    'hello-world'
  );
  assert.equal(applyBuildFormFieldMask('admin', 'upper'), 'ADMIN');
  assert.equal(applyBuildFormFieldMask('ADMIN', 'lower'), 'admin');
});
