import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../guards';
import { createAdminCreateSubscriptionTemplateBuildFormBase } from '../../forms';
import { createAdminSubscriptionTemplateFormCopy } from '../../i18n';

export default async function AdminCreateSubscriptionTemplatePage() {
  const t = await getServerTranslator({ area: 'admin' });
  await requireAdminAccess();
  const themeSelection = await getThemeSelectionForArea('admin');

  const createTemplateForm = composeRegisteredBuildFormDefinition(
    'admin-create-subscription-template-form',
    createAdminCreateSubscriptionTemplateBuildFormBase({
      copy: createAdminSubscriptionTemplateFormCopy(t)
    }),
    {
      values: {
        publicationStatus: 'draft'
      },
      submit: {
        idleLabel: t('Create template'),
        pendingLabel: `${t('Create template')}...`,
        align: 'end'
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{t('Create Subscription Template')}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions/templates">
            {t('Back to templates')}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <TemplateBuildForm
          definition={createTemplateForm}
          area="admin"
          route="/admin/subscriptions/templates/create"
          slot="admin.subscriptions.template.create"
        />
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.subscriptions.create"
      data={{
        title: t('Create Subscription Template')
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
