import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { requireAdminAccess } from '../../guards';
import { SubscriptionTemplateForm } from '../template-form';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function AdminCreateSubscriptionTemplatePage() {
  const messages = await getServerMessages('admin');
  const subscriptionsPage = messages.subscriptionsPage;
  await requireAdminAccess();
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{subscriptionsPage.createTitle}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions">{subscriptionsPage.backToTemplates}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <SubscriptionTemplateForm mode="create" />
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.subscriptions.create"
      themeId={themeSelection.themeKey}
      data={{
        title: subscriptionsPage.createTitle
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
