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
import { requireAdminAccess } from '../../../guards';
import { createAdminCreateSubscriptionTemplateBuildFormBase } from '../../forms';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function AdminCreateSubscriptionTemplatePage() {
  const messages = await getServerMessages('admin');
  const subscriptionsPage = messages.subscriptionsPage;
  const tf = messages.templateForm;
  await requireAdminAccess();
  const themeSelection = await getThemeSelectionForArea('admin');

  const createTemplateForm = composeRegisteredBuildFormDefinition(
    'admin-create-subscription-template-form',
    createAdminCreateSubscriptionTemplateBuildFormBase({
      copy: {
        planSectionTitle: tf.planSectionTitle,
        templateNameLabel: tf.templateNameLabel,
        templateNamePlaceholder: tf.templateNamePlaceholder,
        targetScopeLabel: tf.targetScopeLabel,
        categoryKeyLabel: tf.categoryKeyLabel,
        categoryKeyPlaceholder: tf.categoryKeyPlaceholder,
        hierarchyRankLabel: tf.hierarchyRankLabel,
        hierarchyRankPlaceholder: tf.hierarchyRankPlaceholder,
        scopeLabels: tf.scopes,
        billingIntervalLabel: tf.billingIntervalLabel,
        intervalLabels: tf.intervals,
        priceLabel: tf.priceLabel,
        pricePlaceholder: tf.pricePlaceholder,
        compareAtPriceLabel: tf.compareAtPriceLabel,
        compareAtPricePlaceholder: tf.compareAtPricePlaceholder,
        currencyLabel: tf.currencyLabel,
        currencyPlaceholder: tf.currencyPlaceholder,
        trialDaysLabel: tf.trialDaysLabel,
        trialDaysPlaceholder: tf.trialDaysPlaceholder,
        featuresSectionTitle: tf.featuresSectionTitle,
        featuresSectionHint: tf.featuresSectionHint,
        featureKeyLabel: tf.featureKeyLabel,
        featureLabelLabel: tf.featureLabelLabel,
        featureTypeLabel: tf.featureTypeLabel,
        featureValueLabel: tf.featureValueLabel,
        featureValueLabelLabel: tf.featureValueLabelLabel,
        featurePublicLabel: tf.featurePublicLabel,
        featureKeyPlaceholder: tf.featureKeyPlaceholder,
        featureLabelPlaceholder: tf.featureLabelPlaceholder,
        featureValuePlaceholder: tf.featureValuePlaceholder,
        featureValueLabelPlaceholder: tf.featureValueLabelPlaceholder,
        addFeature: tf.addFeature,
        removeFeature: tf.remove,
        valueTypeLabels: tf.valueTypes
      }
    }),
    {
      submit: {
        idleLabel: tf.createTemplate,
        pendingLabel: `${tf.createTemplate}...`,
        align: 'end'
      },
      values: {
        targetScope: 'organization',
        billingInterval: 'monthly',
        currency: 'USD',
        hierarchyRank: 0,
        trialPeriodDays: 0
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{subscriptionsPage.createTitle}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions/templates">{subscriptionsPage.backToTemplates}</Link>
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
        title: subscriptionsPage.createTitle
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
