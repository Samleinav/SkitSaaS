import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_API_BASE,
  EXAMPLE_SUITE_DASHBOARD_ALIAS
} from '../../constants';
import {
  getExampleSuiteSettings,
  listExampleSuiteItemsForAdmin
} from '../../data';
import { ExampleSuiteAdminItemsDataTable } from '../../example-suite-data-tables';
import {
  ExampleSuiteActionLink,
  ExampleSuiteDetailList,
  ExampleSuitePanel,
  ExampleSuiteShell,
  ExampleSuiteSummary
} from '../../showcase-shell';
import {
  getExampleSuiteAdminTranslator,
  listExampleSuiteGovernanceRows,
  mapExampleSuiteGovernanceRows,
  mapExampleSuiteAdminTableRows
} from './shared';

export async function renderExampleSuiteAdminHomePage() {
  const t = await getExampleSuiteAdminTranslator();
  const [settings, items, governanceRows] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForAdmin(120),
    listExampleSuiteGovernanceRows()
  ]);
  const tableItems = mapExampleSuiteAdminTableRows(items);
  const governanceItems = mapExampleSuiteGovernanceRows(governanceRows);
  const activeCount = items.filter(
    (item) => item.status.trim().toLowerCase() === 'active'
  ).length;

  return (
    <ExampleSuiteShell
      eyebrow={t('Source-host comprehensive example')}
      title={t('Example Suite Admin')}
      description={t(
        'The admin route now shows the two main current patterns together: a real remote SDK DataTable backed by the module API and BuildForm flows rendered through the SDK bridge.'
      )}
      chips={[t('Remote DataTable'), t('SDK TemplateBuildForm'), t('Module shell')]}
      actions={
        <>
          <ExampleSuiteActionLink
            href={`${EXAMPLE_SUITE_ADMIN_ALIAS}/create`}
            label={t('Create Item')}
            tone="primary"
          />
          <ExampleSuiteActionLink
            href={`${EXAMPLE_SUITE_ADMIN_ALIAS}/settings`}
            label={t('Module Settings')}
          />
        </>
      }
    >
      <ExampleSuitePanel
        eyebrow={t('Summary')}
        title={t('Runtime snapshot')}
        description={`${t('API base')}: ${EXAMPLE_SUITE_API_BASE}`}
      >
        <ExampleSuiteSummary
          items={[
            { label: t('Records'), value: items.length },
            { label: t('Active records'), value: activeCount },
            {
              label: t('Dashboard create'),
              value: settings.allowDashboardCreate ? 'enabled' : 'disabled'
            },
            { label: t('API write mode'), value: settings.apiWriteMode },
            { label: t('Default status'), value: settings.defaultStatus },
            { label: t('Dashboard alias'), value: EXAMPLE_SUITE_DASHBOARD_ALIAS }
          ]}
        />
      </ExampleSuitePanel>

      <ExampleSuitePanel
        eyebrow={t('Remote table')}
        title={t('Stored items')}
        description={t('Backed by mod_example_suite_items and filtered through source.url.')}
      >
        {tableItems.length === 0 ? (
          <p className="example-suite-empty">
            {t('No items yet. Create one from the create route.')}
          </p>
        ) : (
          <ExampleSuiteAdminItemsDataTable items={tableItems} />
        )}
      </ExampleSuitePanel>

      <ExampleSuitePanel
        eyebrow={t('Governance evidence')}
        title={t('Portable governance read')}
        description={t(
          'This panel proves a module can inspect core operational evidence through the SDK without importing host internals.'
        )}
      >
        {governanceItems.length === 0 ? (
          <p className="example-suite-empty">
            {t('No recent system activity rows were returned.')}
          </p>
        ) : (
          <ExampleSuiteDetailList items={governanceItems} />
        )}
      </ExampleSuitePanel>
    </ExampleSuiteShell>
  );
}
