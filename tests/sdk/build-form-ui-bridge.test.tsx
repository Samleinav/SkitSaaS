import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildFormField, defineBuildForm } from '../../app/sdk/src/forms';
import { BuildFormUiAdapterProvider } from '../../app/sdk/src/ui/build-form-adapter';
import { BuildForm } from '../../app/sdk/src/ui/build-form';
import { TemplateBuildForm } from '../../app/sdk/src/ui/template-build-form';
import { configureBuildFormUiTemplateResolver } from '../../app/sdk/src/ui/build-form-template-resolver';

const baseForm = defineBuildForm({
  id: 'sdk-ui-bridge-form',
  fields: [
    buildFormField.text({
      name: 'name',
      label: 'Name',
    }),
  ],
});

test('BuildForm delegates rendering to the host adapter provider when present', () => {
  const html = renderToStaticMarkup(
    <BuildFormUiAdapterProvider
      adapter={{
        renderBuildForm: ({ definition }) => (
          <div data-render-source="adapter" data-form-id={definition.id ?? ''} />
        ),
      }}
    >
      <BuildForm definition={baseForm} area="admin" />
    </BuildFormUiAdapterProvider>
  );

  assert.match(html, /data-render-source="adapter"/);
  assert.match(html, /data-form-id="sdk-ui-bridge-form"/);
});

test('BuildForm still prefers explicit templateRenderer over the host adapter provider', () => {
  const html = renderToStaticMarkup(
    <BuildFormUiAdapterProvider
      adapter={{
        renderBuildForm: () => <div data-render-source="adapter" />,
      }}
    >
      <BuildForm
        definition={baseForm}
        area="dashboard"
        templateRenderer={() => <div data-render-source="template-renderer" />}
      />
    </BuildFormUiAdapterProvider>
  );

  assert.match(html, /data-render-source="template-renderer"/);
  assert.doesNotMatch(html, /data-render-source="adapter"/);
});

test('TemplateBuildForm resolves template metadata through the configured server adapter', async () => {
  configureBuildFormUiTemplateResolver({
    resolveFormTemplate: async () => ({
      templateId: 'theme.test.ui.form',
      templateSource: 'theme_area_override',
      templateComponentId: 'ui.form',
      templatePayload: {
        titleClassName: 'title-hero',
      },
    }),
  });

  try {
    const rendered = await TemplateBuildForm({
      definition: baseForm,
      area: 'admin',
      route: '/admin/custom/test',
      moduleId: 'mod.example.portal',
    });

    const html = renderToStaticMarkup(
      <BuildFormUiAdapterProvider
        adapter={{
          renderBuildForm: ({
            templateId,
            templateSource,
            templateComponentId,
            templatePayload,
          }) => (
            <div
              data-template-id={templateId ?? ''}
              data-template-source={templateSource ?? ''}
              data-template-component={templateComponentId ?? ''}
              data-title-class={templatePayload?.titleClassName ?? ''}
            />
          ),
        }}
      >
        {rendered}
      </BuildFormUiAdapterProvider>
    );

    assert.match(html, /data-template-id="theme\.test\.ui\.form"/);
    assert.match(html, /data-template-source="theme_area_override"/);
    assert.match(html, /data-template-component="ui\.form"/);
    assert.match(html, /data-title-class="title-hero"/);
  } finally {
    configureBuildFormUiTemplateResolver(null);
  }
});
