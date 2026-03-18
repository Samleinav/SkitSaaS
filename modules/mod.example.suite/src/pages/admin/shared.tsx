import { getServerTranslator } from '@skitsaas/sdk/server';
import { EXAMPLE_SUITE_MODULE_ID } from '../../constants';
import { listExampleSuiteItemsForAdmin } from '../../data';
import { type ExampleSuiteAdminTableRow } from '../../example-suite-data-tables';

export function formatExampleSuiteAdminDate(value: Date) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

export function interpolateExampleSuiteAdminText(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  );
}

export function mapExampleSuiteAdminTableRows(
  items: Awaited<ReturnType<typeof listExampleSuiteItemsForAdmin>>
) {
  return items.map(
    (item) =>
      ({
        id: item.id,
        title: item.title,
        description: item.description ?? '-',
        status: item.status,
        priority: item.priority,
        visibilityLabel: item.isPublic ? 'public' : 'private',
        ownerLabel: item.ownerName || item.ownerEmail || '-',
        updatedAt: item.updatedAt.getTime(),
        updatedAtLabel: formatExampleSuiteAdminDate(item.updatedAt)
      }) satisfies ExampleSuiteAdminTableRow
  );
}

export async function getExampleSuiteAdminTranslator() {
  return getServerTranslator({ moduleId: EXAMPLE_SUITE_MODULE_ID });
}
