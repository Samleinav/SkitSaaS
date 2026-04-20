import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  dbRef,
  defineBuildForm,
  withBuildFormValidation
} from '@skitsaas/sdk';
import { SUBSCRIPTION_BILLING_INTERVALS } from '@/lib/payments/subscription-intervals';
import { SUBSCRIPTION_TARGET_SCOPES } from '@/lib/payments/subscription-scopes';
import { SUBSCRIPTION_FEATURE_VALUE_TYPES } from '@/lib/payments/subscription-feature-types';
import { SUBSCRIPTION_TEMPLATE_PUBLICATION_STATUSES } from '@/lib/payments/subscription-default-templates';

// ─── Subscription Template Form ───────────────────────────────────────────────

export type SubscriptionTemplateFormCopy = {
  planSectionTitle: string;
  templateNameLabel: string;
  templateNamePlaceholder: string;
  targetScopeLabel: string;
  publicationStatusLabel: string;
  categoryKeyLabel: string;
  categoryKeyPlaceholder: string;
  hierarchyRankLabel: string;
  hierarchyRankPlaceholder: string;
  scopeLabels: { user: string; organization: string };
  publicationStatusLabels: { draft: string; published: string };
  billingIntervalLabel: string;
  intervalLabels: Record<string, string>;
  priceLabel: string;
  pricePlaceholder: string;
  compareAtPriceLabel: string;
  compareAtPricePlaceholder: string;
  currencyLabel: string;
  currencyPlaceholder: string;
  trialDaysLabel: string;
  trialDaysPlaceholder: string;
  featuresSectionTitle: string;
  featuresSectionHint: string;
  featureKeyLabel: string;
  featureOrderLabel: string;
  featureLabelLabel: string;
  featureTypeLabel: string;
  featureValueLabel: string;
  featureValueLabelLabel: string;
  featurePublicLabel: string;
  featureKeyPlaceholder: string;
  featureOrderPlaceholder: string;
  featureLabelPlaceholder: string;
  featureValuePlaceholder: string;
  featureValueLabelPlaceholder: string;
  addFeature: string;
  removeFeature: string;
  valueTypeLabels: Record<string, string>;
};

export const DEFAULT_SUBSCRIPTION_TEMPLATE_FORM_COPY: SubscriptionTemplateFormCopy = {
  planSectionTitle: 'Plan details',
  templateNameLabel: 'Name',
  templateNamePlaceholder: 'e.g. Pro Monthly',
  targetScopeLabel: 'Target scope',
  publicationStatusLabel: 'Publication status',
  categoryKeyLabel: 'Category key',
  categoryKeyPlaceholder: 'e.g. pro',
  hierarchyRankLabel: 'Hierarchy rank',
  hierarchyRankPlaceholder: '0',
  scopeLabels: { user: 'User', organization: 'Organization / Team' },
  publicationStatusLabels: { draft: 'Draft', published: 'Published' },
  billingIntervalLabel: 'Billing interval',
  intervalLabels: {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    semiannual: 'Semiannual',
    yearly: 'Yearly'
  },
  priceLabel: 'Price',
  pricePlaceholder: '9.99',
  compareAtPriceLabel: 'Compare-at price',
  compareAtPricePlaceholder: '14.99',
  currencyLabel: 'Currency',
  currencyPlaceholder: 'USD',
  trialDaysLabel: 'Trial period (days)',
  trialDaysPlaceholder: '0',
  featuresSectionTitle: 'Features',
  featuresSectionHint: 'Define plan features. Rows with an empty key are ignored.',
  featureKeyLabel: 'Key',
  featureOrderLabel: 'Order',
  featureLabelLabel: 'Label',
  featureTypeLabel: 'Type',
  featureValueLabel: 'Value',
  featureValueLabelLabel: 'Value label',
  featurePublicLabel: 'Public',
  featureKeyPlaceholder: 'e.g. seats',
  featureOrderPlaceholder: '10',
  featureLabelPlaceholder: 'e.g. Team seats',
  featureValuePlaceholder: 'e.g. 10',
  featureValueLabelPlaceholder: 'e.g. 10 seats',
  addFeature: 'Add feature',
  removeFeature: 'Remove',
  valueTypeLabels: { text: 'Text', number: 'Number', boolean: 'Boolean', null: 'None' }
};

function buildSubscriptionTemplateSections(copy: SubscriptionTemplateFormCopy) {
  const targetScopeOptions = SUBSCRIPTION_TARGET_SCOPES.map((s) => ({
    value: s,
    label: copy.scopeLabels[s] ?? s
  }));
  const publicationStatusOptions = SUBSCRIPTION_TEMPLATE_PUBLICATION_STATUSES.map(
    (status) => ({
      value: status,
      label: copy.publicationStatusLabels[status] ?? status
    })
  );

  const billingIntervalOptions = SUBSCRIPTION_BILLING_INTERVALS.map((i) => ({
    value: i,
    label: copy.intervalLabels[i] ?? i
  }));

  const valueTypeOptions = SUBSCRIPTION_FEATURE_VALUE_TYPES.map((t) => ({
    value: t,
    label: copy.valueTypeLabels[t] ?? t
  }));

  return [
    {
      id: 'plan',
      title: copy.planSectionTitle,
      columns: 3 as const,
      fields: [
        buildFormField.text({
          name: 'name',
          label: copy.templateNameLabel,
          placeholder: copy.templateNamePlaceholder,
          required: true,
          maxLength: 120
        }),
        buildFormField.select({
          name: 'targetScope',
          label: copy.targetScopeLabel,
          options: targetScopeOptions
        }),
        buildFormField.select({
          name: 'publicationStatus',
          label: copy.publicationStatusLabel,
          options: publicationStatusOptions
        }),
        buildFormField.text({
          name: 'categoryKey',
          label: copy.categoryKeyLabel,
          placeholder: copy.categoryKeyPlaceholder,
          required: true,
          maxLength: 120
        }),
        buildFormField.number({
          name: 'hierarchyRank',
          label: copy.hierarchyRankLabel,
          placeholder: copy.hierarchyRankPlaceholder,
          min: 0,
          step: 1
        }),
        buildFormField.select({
          name: 'billingInterval',
          label: copy.billingIntervalLabel,
          options: billingIntervalOptions
        }),
        buildFormField.number({
          name: 'price',
          label: copy.priceLabel,
          placeholder: copy.pricePlaceholder,
          required: true,
          min: 0,
          step: 0.01
        }),
        buildFormField.number({
          name: 'compareAtPrice',
          label: copy.compareAtPriceLabel,
          placeholder: copy.compareAtPricePlaceholder,
          min: 0,
          step: 0.01
        }),
        buildFormField.text({
          name: 'currency',
          label: copy.currencyLabel,
          placeholder: copy.currencyPlaceholder,
          required: true,
          maxLength: 10,
          mask: 'upper'
        }),
        buildFormField.number({
          name: 'trialPeriodDays',
          label: copy.trialDaysLabel,
          placeholder: copy.trialDaysPlaceholder,
          min: 0,
          step: 1
        })
      ]
    },
    {
      id: 'features',
      title: copy.featuresSectionTitle,
      columns: 1 as const,
      fields: [
        buildFormField.repeater({
          name: 'featureRowId',
          description: copy.featuresSectionHint,
          addLabel: copy.addFeature,
          removeLabel: copy.removeFeature,
          minRows: 1,
          emptyRow: {
            featureValueType: 'text',
            featureIsPublic: true
          },
          subFields: [
            {
              name: 'featureKey',
              label: copy.featureKeyLabel,
              kind: 'text',
              placeholder: copy.featureKeyPlaceholder,
              maxLength: 120
            },
            {
              name: 'featureDisplayOrder',
              label: copy.featureOrderLabel,
              kind: 'number',
              placeholder: copy.featureOrderPlaceholder,
              min: 0,
              step: 1
            },
            {
              name: 'featureLabel',
              label: copy.featureLabelLabel,
              kind: 'text',
              placeholder: copy.featureLabelPlaceholder,
              maxLength: 120
            },
            {
              name: 'featureValueType',
              label: copy.featureTypeLabel,
              kind: 'select',
              options: valueTypeOptions
            },
            {
              name: 'featureValue',
              label: copy.featureValueLabel,
              kind: 'text',
              placeholder: copy.featureValuePlaceholder,
              maxLength: 255,
              disableWhen: { field: 'featureValueType', equals: 'null' }
            },
            {
              name: 'featureValueLabel',
              label: copy.featureValueLabelLabel,
              kind: 'text',
              placeholder: copy.featureValueLabelPlaceholder,
              maxLength: 255,
              disableWhen: { field: 'featureValueType', equals: 'null' }
            },
            {
              name: 'featureIsPublic',
              label: copy.featurePublicLabel,
              kind: 'checkbox'
            }
          ]
        })
      ]
    }
  ];
}

export function createAdminCreateSubscriptionTemplateBuildFormBase({
  copy = DEFAULT_SUBSCRIPTION_TEMPLATE_FORM_COPY
}: {
  copy?: SubscriptionTemplateFormCopy;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-create-subscription-template-form',
      sections: buildSubscriptionTemplateSections(copy)
    }),
    buildFormValidationPreset.blur({
      name: [buildFormRule.required()],
      price: [buildFormRule.required()],
      currency: [buildFormRule.required()]
    })
  );
}

export function createAdminEditSubscriptionTemplateBuildFormBase({
  copy = DEFAULT_SUBSCRIPTION_TEMPLATE_FORM_COPY
}: {
  copy?: SubscriptionTemplateFormCopy;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-edit-subscription-template-form',
      sections: [
        {
          id: 'hidden',
          columns: 1 as const,
          fields: [buildFormField.hidden({ name: 'templateId' })]
        },
        ...buildSubscriptionTemplateSections(copy)
      ]
    }),
    buildFormValidationPreset.blur({
      templateId: [buildFormRule.exists(dbRef('core.subscription_templates.any'))],
      name: [buildFormRule.required()],
      price: [buildFormRule.required()],
      currency: [buildFormRule.required()]
    })
  );
}

export function createAdminRequestTemplateActiveUpdateBuildFormBase() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-request-template-active-update-form',
      fields: [
        buildFormField.hidden({
          name: 'templateId'
        })
      ]
    }),
    buildFormValidationPreset.blur({
      templateId: [buildFormRule.exists(dbRef('core.subscription_templates.any'))]
    })
  );
}

export function createAdminDeleteSubscriptionTemplateBuildFormBase() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-delete-subscription-template-form',
      fields: [
        buildFormField.hidden({
          name: 'templateId'
        })
      ]
    }),
    buildFormValidationPreset.blur({
      templateId: [buildFormRule.exists(dbRef('core.subscription_templates.any'))]
    })
  );
}
