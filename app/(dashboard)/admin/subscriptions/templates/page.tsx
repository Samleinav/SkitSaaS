import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  AdminMetricCard,
  AdminPageShell
} from '../../admin-page-shell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  getAllSubscriptionTemplatesForAdmin
} from '@/lib/db/queries.admin';
import { requireAdminAccess } from '../../guards';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { TemplateTable } from '@/components/ui/template-table';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  getAdminSubscriptionIntervalLabels,
  getAdminSubscriptionScopeLabels
} from '../i18n';
import { isReservedBaselineSubscriptionTemplateId } from '@/lib/payments/subscription-default-templates';
import {
  AdminBaselineTemplatesDataTable,
  type AdminBaselineTemplateRow
} from './baseline-templates-data-table';

export default async function AdminSubscriptionTemplatesPage() {
  const t = await getServerTranslator({ area: 'admin' });
  await requireAdminAccess();
  const allTemplates = await getAllSubscriptionTemplatesForAdmin({
    includeReserved: true
  });
  const templates = allTemplates.filter(
    (template) => !isReservedBaselineSubscriptionTemplateId(template.id)
  );
  const baselineTemplates = allTemplates.filter((template) =>
    isReservedBaselineSubscriptionTemplateId(template.id)
  );
  const themeSelection = await getThemeSelectionForArea('admin');
  const scopeLabels = getAdminSubscriptionScopeLabels(t);
  const intervalLabels = getAdminSubscriptionIntervalLabels(t);
  const baselineTemplateRows: AdminBaselineTemplateRow[] =
    baselineTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      scope:
        template.targetScope === 'organization' ? 'organization' : 'user',
      scopeLabel:
        scopeLabels[template.targetScope as keyof typeof scopeLabels] ||
        template.targetScope,
      policyLabel: t('Internal baseline • draft only'),
      editHref: `/admin/subscriptions/templates/${template.id}/edit`
    }));
  const resolveTableCellSlot = ({
    slot,
    data,
    fallback
  }: {
    slot: string;
    data?: Record<string, unknown>;
    fallback: ReactNode;
  }) => {
    if (!themeSelection?.themeKey) {
      return fallback;
    }

    return (
      <ThemeCodeTemplate
        themeId={themeSelection.themeKey}
        id="section.admin.table.subscriptions.templates.cell"
        data={{
          slot,
          ...(data ?? {})
        }}
        fallback={fallback}
      >
        {fallback}
      </ThemeCodeTemplate>
    );
  };

  const organizationTemplates = templates.filter(
    (template) => template.targetScope === 'organization'
  ).length;
  const userTemplates = templates.filter(
    (template) => template.targetScope === 'user'
  ).length;
  const publicFeaturesCount = templates.reduce(
    (count, template) =>
      count + template.features.filter((feature) => feature.isPublic).length,
    0
  );
  const metricsFallback = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        label={t('Subscription Templates')}
        value={templates.length}
      />
      <AdminMetricCard
        label={scopeLabels.organization}
        value={organizationTemplates}
      />
      <AdminMetricCard
        label={scopeLabels.user}
        value={userTemplates}
      />
      <AdminMetricCard
        label={t('Public features')}
        value={publicFeaturesCount}
      />
    </div>
  );
  const metricsSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="section.admin.metrics-grid"
      data={{
        variant: 'subscriptions.templates',
        columns: 4
      }}
      fallback={metricsFallback}
    >
      {metricsFallback}
    </ThemeCodeTemplate>
  ) : (
    metricsFallback
  );

  const fallbackPage = (
    <AdminPageShell
      title={t('Subscription Templates')}
      description={t(
        'Manage the commercial template catalog used by pricing, manual orders, and self-service checkout.'
      )}
      actions={
        <Button asChild size="sm" className="rounded-lg">
          <Link href="/admin/subscriptions/templates/create">
            {t('Create template')}
          </Link>
        </Button>
      }
      metrics={metricsSlot}
    >
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('No commercial templates created yet.')}
        </p>
      ) : (
        <TemplateTable area="admin" route="/admin/subscriptions/templates">
          <TableHeader>
            <TableRow>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.name',
                  fallback: <>{t('Name')}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.scope',
                  fallback: <>{t('Scope')}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.status',
                  fallback: <>{t('Status')}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.category',
                  fallback: <>{t('Category key')}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.rank',
                  fallback: <>{t('Hierarchy rank')}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.interval',
                  fallback: <>{t('Interval')}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.price',
                  fallback: <>{t('Price')}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.public-features',
                  fallback: <>{t('Public features')}</>
                })}
              </TableHead>
              <TableHead className="text-right">
                {resolveTableCellSlot({
                  slot: 'header.actions',
                  fallback: <>{t('Actions')}</>
                })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => {
              const intervalLabel =
                intervalLabels[
                  template.billingInterval as keyof typeof intervalLabels
                ] || template.billingInterval;
              const scopeLabel =
                scopeLabels[template.targetScope as keyof typeof scopeLabels] ||
                template.targetScope;
              const publicationStatusLabel =
                template.publicationStatus === 'published'
                  ? t('Published')
                  : t('Draft');
              const templatePublicFeaturesCount = template.features.filter(
                (feature) => feature.isPublic
              ).length;

              return (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {resolveTableCellSlot({
                      slot: 'cell.name',
                      data: {
                        templateId: template.id
                      },
                      fallback: <>{template.name}</>
                    })}
                  </TableCell>
                  <TableCell>
                    {resolveTableCellSlot({
                      slot: 'cell.scope',
                      data: {
                        templateId: template.id,
                        scope: template.targetScope
                      },
                      fallback: <>{scopeLabel}</>
                    })}
                  </TableCell>
                  <TableCell>
                    {resolveTableCellSlot({
                      slot: 'cell.status',
                      data: {
                        templateId: template.id,
                        publicationStatus: template.publicationStatus
                      },
                      fallback: <>{publicationStatusLabel}</>
                    })}
                  </TableCell>
                  <TableCell>
                    {resolveTableCellSlot({
                      slot: 'cell.category',
                      data: {
                        templateId: template.id,
                        categoryKey: template.categoryKey
                      },
                      fallback: <>{template.categoryKey}</>
                    })}
                  </TableCell>
                  <TableCell>
                    {resolveTableCellSlot({
                      slot: 'cell.rank',
                      data: {
                        templateId: template.id,
                        hierarchyRank: template.hierarchyRank
                      },
                      fallback: <>{template.hierarchyRank}</>
                    })}
                  </TableCell>
                  <TableCell>
                    {resolveTableCellSlot({
                      slot: 'cell.interval',
                      data: {
                        templateId: template.id,
                        billingInterval: template.billingInterval
                      },
                      fallback: <>{intervalLabel}</>
                    })}
                  </TableCell>
                  <TableCell>
                    {resolveTableCellSlot({
                      slot: 'cell.price',
                      data: {
                        templateId: template.id,
                        currency: template.currency,
                        priceCents: template.priceCents
                      },
                      fallback: (
                        <>
                          {template.currency} {(template.priceCents / 100).toFixed(2)}
                        </>
                      )
                    })}
                  </TableCell>
                  <TableCell>
                    {resolveTableCellSlot({
                      slot: 'cell.public-features',
                      data: {
                        templateId: template.id,
                        publicFeaturesCount: templatePublicFeaturesCount
                      },
                      fallback: <>{templatePublicFeaturesCount}</>
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {resolveTableCellSlot({
                      slot: 'cell.actions.edit',
                      data: {
                        templateId: template.id
                      },
                      fallback: (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/subscriptions/templates/${template.id}/edit`}>
                            {t('Edit')}
                          </Link>
                        </Button>
                      )
                    })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TemplateTable>
      )}
      {baselineTemplates.length > 0 ? (
        <Card className="border-dashed border-border/70 bg-muted/10">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">{t('System baseline')}</CardTitle>
            <CardDescription>
              {t(
                'Reserved internal templates used for fallback and recovery access. They stay draft-only and are kept separate from the commercial catalog.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AdminBaselineTemplatesDataTable
              data={baselineTemplateRows}
              copy={{
                headers: {
                  name: t('Name'),
                  scope: t('Scope'),
                  policy: t('Policy'),
                  actions: t('Actions')
                },
                edit: t('Edit'),
                noResults: t('No baseline templates found.'),
                dataTable: {
                  filterPlaceholder: t('Filter...'),
                  columns: t('Columns'),
                  noResults: t('No results.'),
                  showingRows: t('Showing {shown} of {filtered} row(s).'),
                  previous: t('Previous'),
                  next: t('Next')
                }
              }}
              tableTemplate={{
                componentId: 'ui.table',
                area: 'admin'
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </AdminPageShell>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.subscriptions.templates"
      data={{
        title: t('Subscription Templates'),
        description: t(
          'Manage the commercial template catalog used by pricing, manual orders, and self-service checkout.'
        )
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
