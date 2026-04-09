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
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { SUBSCRIPTION_FEATURE_VALUE_TYPES } from '@/lib/payments/subscription-feature-types';
import type { SubscriptionFeatureValueType } from '@/lib/payments/subscription-feature-types';
import {
  getReservedBaselineTemplateRequiredFeatures,
  isReservedBaselineSubscriptionTemplateId
} from '@/lib/payments/subscription-default-templates';
import { createAdminSubscriptionTemplateFormCopy } from '../../../i18n';

export default async function AdminEditSubscriptionTemplatePage({
  params
}: {
  params: Promise<{ templateId: string }>;
}) {
  const t = await getServerTranslator({ area: 'admin' });
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
  const isReservedTemplate = isReservedBaselineSubscriptionTemplateId(template.id);
  const themeSelection = await getThemeSelectionForArea('admin');
  const lockedFeatureKeys = new Set(
    getReservedBaselineTemplateRequiredFeatures(template.id).map(
      (feature) => feature.key
    )
  );
  const scopeLabel =
    template.targetScope === 'organization' ? t('Organization') : t('User');
  const publicationStatusLabel =
    template.publicationStatus === 'published' ? t('Published') : t('Draft');

  const featureRows =
    template.features.length > 0
      ? template.features.map((f) => ({
          id: String(f.id),
          removable: !lockedFeatureKeys.has(f.key),
          lockedFields: lockedFeatureKeys.has(f.key)
            ? ['featureKey', 'featureValueType']
            : undefined,
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

  const baseEditTemplateForm = composeRegisteredBuildFormDefinition(
    'admin-edit-subscription-template-form',
    createAdminEditSubscriptionTemplateBuildFormBase({
      copy: createAdminSubscriptionTemplateFormCopy(t)
    }),
    {
      submit: {
        idleLabel: t('Update template'),
        pendingLabel: `${t('Update template')}...`,
        align: 'end'
      },
      values: {
        templateId: template.id,
        name: template.name,
        targetScope: template.targetScope,
        publicationStatus: template.publicationStatus,
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
  const editTemplateForm = isReservedTemplate
    ? {
        ...baseEditTemplateForm,
        sections: baseEditTemplateForm.sections?.map((section) => ({
          ...section,
          fields: section.fields.map((field) => {
            if (field.kind !== 'select') {
              return field;
            }

            if (field.name === 'targetScope') {
              return {
                ...field,
                options: [{ value: template.targetScope, label: scopeLabel }]
              };
            }

            if (field.name === 'publicationStatus') {
              return {
                ...field,
                options: [
                  {
                    value: template.publicationStatus,
                    label: `${publicationStatusLabel} (${t('Locked')})`
                  }
                ]
              };
            }

            return field;
          })
        }))
      }
    : baseEditTemplateForm;

  const requestActiveUpdateForm = composeRegisteredBuildFormDefinition(
    'admin-request-template-active-update-form',
    createAdminRequestTemplateActiveUpdateBuildFormBase(),
    {
      submit: {
        idleLabel: t('Queue active updates'),
        pendingLabel: t('Queueing updates...'),
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
        idleLabel: t('Delete'),
        pendingLabel: `${t('Delete')}...`,
        align: 'start',
        confirm: {
          title: t('Delete this template?'),
          description: t(
            'Teams using this template will be moved to free until reassigned.'
          ),
          confirmLabel: t('Delete template'),
          cancelLabel: t('Cancel'),
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
        <CardTitle>{t('Edit Subscription Template')}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions/templates">
            {t('Back to templates')}
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isReservedTemplate ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t(
              'This is a reserved system baseline template. You can tune labels, values, and policy data, but scope stays locked, baseline feature keys/types stay pinned, and the template cannot be deleted or published.'
            )}
          </div>
        ) : null}
        <div className="rounded-md border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">
            {t('Active Subscription Update')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              'Queue a manual migration task for active subscriptions using this template.'
            )}
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
        {isReservedTemplate ? null : (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="mb-3 text-sm text-red-700">
              {t(
                'Deleting this template will move active targets back to the reserved system baseline.'
              )}
            </p>
            <TemplateBuildForm
              definition={deleteTemplateForm}
              area="admin"
              route={`/admin/subscriptions/templates/${template.id}/edit`}
              slot="admin.subscriptions.template.delete"
            />
          </div>
        )}
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
        title: t('Edit Subscription Template')
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
