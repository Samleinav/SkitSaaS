import {
  TemplateBuildForm,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_DEFAULT_PRIORITY,
  EXAMPLE_SUITE_MODULE_ID
} from '../../constants';
import { createExampleSuiteItemAdminAction } from '../../actions';
import {
  getExampleSuiteSettings,
  listExampleSuiteItemsForAdmin
} from '../../data';
import { ExampleSuiteRecentItemsDataTable } from '../../example-suite-data-tables';
import { createExampleSuiteAdminItemFormDefinition } from '../../forms';
import {
  ExampleSuiteActionLink,
  ExampleSuitePanel,
  ExampleSuiteShell
} from '../../showcase-shell';
import {
  getExampleSuiteAdminTranslator,
  mapExampleSuiteAdminTableRows
} from './shared';

export async function renderExampleSuiteAdminCreatePage() {
  const t = await getExampleSuiteAdminTranslator();
  const [settings, latestItems] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForAdmin(10)
  ]);
  const recentItems = mapExampleSuiteAdminTableRows(latestItems);
  const createForm = composeBuildFormDefinition(
    {
      ...createExampleSuiteAdminItemFormDefinition(),
      id: 'example-suite-admin-create-form'
    },
    {
      request: {
        action: createExampleSuiteItemAdminAction,
        method: 'post'
      },
      submit: {
        idleLabel: 'Create',
        pendingLabel: 'Creating...',
        successLabel: 'Created',
        align: 'start',
        secondaryActions: [
          {
            label: 'Back',
            href: EXAMPLE_SUITE_ADMIN_ALIAS
          }
        ]
      },
      values: {
        status: settings.defaultStatus,
        priority: EXAMPLE_SUITE_DEFAULT_PRIORITY,
        isPublic: false
      }
    }
  );

  return (
    <ExampleSuiteShell
      eyebrow={t('Create flow')}
      title={t('Create admin record')}
      description={t(
        'This page keeps the module-owned validated action, but now the surrounding UI is module-owned and the companion table is an SDK local table.'
      )}
      chips={[t('Validated action'), t('Local companion table')]}
      actions={
        <ExampleSuiteActionLink
          href={EXAMPLE_SUITE_ADMIN_ALIAS}
          label={t('Back to module')}
        />
      }
    >
      <div className="example-suite-grid example-suite-grid--two">
        <ExampleSuitePanel
          eyebrow={t('FormBuilder')}
          title={t('Create item')}
          description={`${t('Default status')}: ${settings.defaultStatus}`}
        >
          <TemplateBuildForm
            definition={createForm}
            area="admin"
            route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/create`}
            moduleId={EXAMPLE_SUITE_MODULE_ID}
            slot="mod.example.suite.admin.create.form"
          />
        </ExampleSuitePanel>

        <ExampleSuitePanel
          eyebrow={t('Local table')}
          title={t('Recent records')}
          description={t('A smaller local DataTable for quick authoring reference.')}
        >
          {recentItems.length === 0 ? (
            <p className="example-suite-empty">{t('No records yet.')}</p>
          ) : (
            <ExampleSuiteRecentItemsDataTable items={recentItems} />
          )}
        </ExampleSuitePanel>
      </div>
    </ExampleSuiteShell>
  );
}
