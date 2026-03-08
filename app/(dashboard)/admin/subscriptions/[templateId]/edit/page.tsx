import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { requireAdminAccess } from '../../../guards';
import { SubscriptionTemplateForm } from '../../template-form';
import {
  getSubscriptionTemplateWithFeaturesById
} from '@/lib/db/queries';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  createAdminDeleteSubscriptionTemplateBuildFormBase,
  createAdminRequestTemplateActiveUpdateBuildFormBase
} from '../../forms';

export default async function AdminEditSubscriptionTemplatePage({
  params
}: {
  params: Promise<{ templateId: string }>;
}) {
  const messages = await getServerMessages('admin');
  const subscriptionsPage = messages.subscriptionsPage;
  await requireAdminAccess();

  const { templateId } = await params;
  const parsedTemplateId = Number(templateId);
  if (!Number.isInteger(parsedTemplateId) || parsedTemplateId <= 0) {
    notFound();
  }

  const template = await getSubscriptionTemplateWithFeaturesById(parsedTemplateId);
  if (!template) {
    notFound();
  }
  const themeSelection = await getThemeSelectionForArea('admin');
  const requestActiveUpdateForm = composeRegisteredBuildFormDefinition(
    'admin-request-template-active-update-form',
    createAdminRequestTemplateActiveUpdateBuildFormBase(),
    {
      submit: {
        idleLabel: subscriptionsPage.activeUpdateAction,
        pendingLabel: subscriptionsPage.activeUpdateActionPending,
        align: 'end',
        size: 'sm',
        variant: 'outline'
      },
      values: {
        templateId: template.id
      }
    }
  );
  const deleteTemplateForm = composeRegisteredBuildFormDefinition(
    'admin-delete-subscription-template-form',
    createAdminDeleteSubscriptionTemplateBuildFormBase(),
    {
      submit: {
        idleLabel: subscriptionsPage.delete,
        pendingLabel: `${subscriptionsPage.delete}...`,
        align: 'start',
        confirm: {
          title: subscriptionsPage.confirmDeleteTitle,
          description: subscriptionsPage.confirmDeleteDescription,
          confirmLabel: subscriptionsPage.confirm,
          cancelLabel: subscriptionsPage.cancel,
          triggerVariant: 'destructive',
          confirmVariant: 'destructive'
        }
      },
      values: {
        templateId: template.id
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{subscriptionsPage.editTitle}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions">{subscriptionsPage.backToTemplates}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">
            {subscriptionsPage.activeUpdateTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {subscriptionsPage.activeUpdateDescription}
          </p>
          <div className="mt-3">
            <TemplateBuildForm
              definition={requestActiveUpdateForm}
              area="admin"
              route={`/admin/subscriptions/${template.id}/edit`}
              slot="admin.subscriptions.template.active-update"
            />
          </div>
        </div>
        <SubscriptionTemplateForm mode="update" template={template} />
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="mb-3 text-sm text-red-700">{subscriptionsPage.deleteHint}</p>
          <TemplateBuildForm
            definition={deleteTemplateForm}
            area="admin"
            route={`/admin/subscriptions/${template.id}/edit`}
            slot="admin.subscriptions.template.delete"
          />
        </div>
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.subscriptions.edit"
      data={{
        title: subscriptionsPage.editTitle
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
