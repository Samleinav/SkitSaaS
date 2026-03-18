import {
  TemplateBuildForm,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_MODULE_ID
} from '../../constants';
import { updateExampleSuiteSettingsAdminAction } from '../../actions';
import { getExampleSuiteSettings } from '../../data';
import { createExampleSuiteSettingsFormDefinition } from '../../forms';
import {
  ExampleSuiteActionLink,
  ExampleSuitePanel,
  ExampleSuiteShell
} from '../../showcase-shell';
import { getExampleSuiteAdminTranslator } from './shared';

export async function renderExampleSuiteAdminSettingsPage() {
  const t = await getExampleSuiteAdminTranslator();
  const settings = await getExampleSuiteSettings();
  const baseSettingsForm = createExampleSuiteSettingsFormDefinition();
  const settingsForm = composeBuildFormDefinition(baseSettingsForm, {
    request: {
      action: updateExampleSuiteSettingsAdminAction,
      method: 'post'
    },
    submit: {
      ...baseSettingsForm.submit,
      secondaryActions: [
        {
          label: t('Back'),
          href: EXAMPLE_SUITE_ADMIN_ALIAS
        }
      ]
    },
    values: {
      allowDashboardCreate: settings.allowDashboardCreate,
      apiWriteMode: settings.apiWriteMode,
      defaultStatus: settings.defaultStatus
    }
  });

  return (
    <ExampleSuiteShell
      eyebrow={t('Settings flow')}
      title={t('Module settings')}
      description={t(
        'These values are persisted in mod_example_suite_settings and reused by admin, dashboard and API handlers.'
      )}
      actions={
        <ExampleSuiteActionLink
          href={EXAMPLE_SUITE_ADMIN_ALIAS}
          label={t('Back to module')}
        />
      }
    >
      <ExampleSuitePanel
        eyebrow={t('Settings')}
        title={t('Shared runtime options')}
        description={t(
          'A single SDK form controls write permissions and defaults across all example routes.'
        )}
      >
        <TemplateBuildForm
          definition={settingsForm}
          area="admin"
          route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/settings`}
          moduleId={EXAMPLE_SUITE_MODULE_ID}
          slot="mod.example.suite.admin.settings.form"
        />
      </ExampleSuitePanel>
    </ExampleSuiteShell>
  );
}
