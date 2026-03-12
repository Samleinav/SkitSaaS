import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  AdminMetricCard,
  AdminPageShell
} from '../../admin-page-shell';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  getAllSubscriptionTemplatesForAdmin
} from '@/lib/db/queries.admin';
import { requireAdminAccess } from '../../guards';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { TemplateTable } from '@/components/ui/template-table';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export default async function AdminSubscriptionTemplatesPage() {
  const messages = await getServerMessages('admin');
  const subscriptionsPage = messages.subscriptionsPage;
  await requireAdminAccess();
  const templates = await getAllSubscriptionTemplatesForAdmin();
  const themeSelection = await getThemeSelectionForArea('admin');
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
        label={subscriptionsPage.templatesTitle}
        value={templates.length}
      />
      <AdminMetricCard
        label={messages.templateForm.scopes.organization}
        value={organizationTemplates}
      />
      <AdminMetricCard
        label={messages.templateForm.scopes.user}
        value={userTemplates}
      />
      <AdminMetricCard
        label={subscriptionsPage.columns.publicFeatures}
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
      title={subscriptionsPage.templatesTitle}
      description={subscriptionsPage.templatesDescription}
      actions={
        <Button asChild size="sm" className="rounded-lg">
          <Link href="/admin/subscriptions/templates/create">{subscriptionsPage.create}</Link>
        </Button>
      }
      metrics={metricsSlot}
    >
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {subscriptionsPage.noTemplates}
        </p>
      ) : (
        <TemplateTable area="admin" route="/admin/subscriptions/templates">
          <TableHeader>
            <TableRow>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.name',
                  fallback: <>{subscriptionsPage.columns.name}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.scope',
                  fallback: <>{subscriptionsPage.columns.scope}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.category',
                  fallback: <>{messages.templateForm.categoryKeyLabel}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.rank',
                  fallback: <>{messages.templateForm.hierarchyRankLabel}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.interval',
                  fallback: <>{subscriptionsPage.columns.interval}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.price',
                  fallback: <>{subscriptionsPage.columns.price}</>
                })}
              </TableHead>
              <TableHead>
                {resolveTableCellSlot({
                  slot: 'header.public-features',
                  fallback: <>{subscriptionsPage.columns.publicFeatures}</>
                })}
              </TableHead>
              <TableHead className="text-right">
                {resolveTableCellSlot({
                  slot: 'header.actions',
                  fallback: <>{subscriptionsPage.columns.actions}</>
                })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => {
              const intervalLabel =
                messages.templateForm.intervals[
                  template.billingInterval as keyof typeof messages.templateForm.intervals
                ] || template.billingInterval;
              const scopeLabel =
                messages.templateForm.scopes[
                  template.targetScope as keyof typeof messages.templateForm.scopes
                ] || template.targetScope;
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
                            {subscriptionsPage.edit}
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
        title: subscriptionsPage.templatesTitle,
        description: subscriptionsPage.templatesDescription
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
