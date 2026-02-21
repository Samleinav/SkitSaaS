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
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { TemplateConfirmSubmitButton } from '@/components/ui/template-confirm-submit-button';
import {
  deleteSubscriptionTemplateAction,
  requestTemplateActiveSubscriptionsUpdateAction
} from '../../actions';
import { requireAdminAccess } from '../../../guards';
import { SubscriptionTemplateForm } from '../../template-form';
import {
  getSubscriptionTemplateWithFeaturesById
} from '@/lib/db/queries';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

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
          <form
            action={requestTemplateActiveSubscriptionsUpdateAction}
            className="mt-3 flex justify-end"
          >
            <input type="hidden" name="templateId" value={template.id} />
            <TemplateAsyncSubmitButton
              area="admin"
              route={`/admin/subscriptions/${template.id}/edit`}
              size="sm"
              variant="outline"
              idleLabel={subscriptionsPage.activeUpdateAction}
              pendingLabel={subscriptionsPage.activeUpdateActionPending}
            />
          </form>
        </div>
        <SubscriptionTemplateForm mode="update" template={template} />
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="mb-3 text-sm text-red-700">{subscriptionsPage.deleteHint}</p>
          <form id="delete-subscription-template" action={deleteSubscriptionTemplateAction}>
            <input type="hidden" name="templateId" value={template.id} />
            <TemplateConfirmSubmitButton
              area="admin"
              route={`/admin/subscriptions/${template.id}/edit`}
              formId="delete-subscription-template"
              title={subscriptionsPage.confirmDeleteTitle}
              description={subscriptionsPage.confirmDeleteDescription}
              triggerLabel={subscriptionsPage.delete}
              confirmLabel={subscriptionsPage.confirm}
              cancelLabel={subscriptionsPage.cancel}
              triggerVariant="destructive"
              triggerSize="sm"
            />
          </form>
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
