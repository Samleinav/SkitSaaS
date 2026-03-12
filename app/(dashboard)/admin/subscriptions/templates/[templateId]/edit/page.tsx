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
import { requireAdminAccess } from '../../../../guards';
import {
  createAdminDeleteSubscriptionTemplateBuildFormBase,
  createAdminEditSubscriptionTemplateBuildFormBase,
  createAdminRequestTemplateActiveUpdateBuildFormBase
} from '../../../forms';
import {
  getSubscriptionTemplateWithFeaturesById
} from '@/lib/db/queries';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { SUBSCRIPTION_FEATURE_VALUE_TYPES } from '@/lib/payments/subscription-feature-types';
import type { SubscriptionFeatureValueType } from '@/lib/payments/subscription-feature-types';

export default async function AdminEditSubscriptionTemplatePage({
  params
}: {
  params: Promise<{ templateId: string }>;
}) {
  const messages = await getServerMessages('admin');
  const subscriptionsPage = messages.subscriptionsPage;
  const tf = messages.templateForm;
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

  const templateCopy = {
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
  };

  const featureRows =
    template.features.length > 0
      ? template.features.map((f) => ({
          id: String(f.id),
          featureKey: f.key,
          featureLabel: f.label || f.key,
          featureValueType: SUBSCRIPTION_FEATURE_VALUE_TYPES.includes(
            f.valueType as SubscriptionFeatureValueType
          )
            ? f.valueType
            : 'text',
          featureValue: f.value ?? '',
          featureValueLabel: f.valueLabel ?? '',
          featureIsPublic: f.isPublic
        }))
      : null;

  const editTemplateForm = composeRegisteredBuildFormDefinition(
    'admin-edit-subscription-template-form',
    createAdminEditSubscriptionTemplateBuildFormBase({ copy: templateCopy }),
    {
      submit: {
        idleLabel: tf.updateTemplate,
        pendingLabel: `${tf.updateTemplate}...`,
        align: 'end'
      },
      values: {
        templateId: template.id,
        name: template.name,
        targetScope: template.targetScope,
        categoryKey: template.categoryKey,
        hierarchyRank: template.hierarchyRank,
        billingInterval: template.billingInterval,
        price: (template.priceCents / 100).toFixed(2),
        compareAtPrice:
          template.compareAtPriceCents !== null
            ? (template.compareAtPriceCents / 100).toFixed(2)
            : '',
        currency: template.currency,
        trialPeriodDays: template.trialPeriodDays
      },
      ...(featureRows
        ? { repeaterRows: { featureRowId: featureRows } }
        : {})
    }
  );

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
          <Link href="/admin/subscriptions/templates">{subscriptionsPage.backToTemplates}</Link>
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
              route={`/admin/subscriptions/templates/${template.id}/edit`}
              slot="admin.subscriptions.template.active-update"
            />
          </div>
        </div>
        <TemplateBuildForm
          definition={editTemplateForm}
          area="admin"
          route={`/admin/subscriptions/templates/${template.id}/edit`}
          slot="admin.subscriptions.template.edit"
        />
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="mb-3 text-sm text-red-700">{subscriptionsPage.deleteHint}</p>
          <TemplateBuildForm
            definition={deleteTemplateForm}
            area="admin"
            route={`/admin/subscriptions/templates/${template.id}/edit`}
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
