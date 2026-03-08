import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  dbRef,
  defineBuildForm,
  withBuildFormValidation
} from '@skitsaas/sdk';
import {
  ADMIN_TEAM_SUBSCRIPTION_PROVIDERS,
  ADMIN_TEAM_SUBSCRIPTION_STATUSES
} from '../subscriptions/form-utils';

export type AdminSubscriptionTemplateOption = {
  id: number;
  name: string;
  billingInterval: string;
};

export type AdminUserSubscriptionBuildFormCopy = {
  templateLabel: string;
  noTemplate: string;
};

export type AdminOrganizationSubscriptionBuildFormCopy = {
  providerLabel: string;
  statusLabel: string;
  templateLabel: string;
  noTemplate: string;
  providers: {
    none: string;
    stripe: string;
    paypal: string;
  };
  statuses: Record<(typeof ADMIN_TEAM_SUBSCRIPTION_STATUSES)[number], string>;
};

const DEFAULT_ADMIN_USER_SUBSCRIPTION_BUILD_FORM_COPY: AdminUserSubscriptionBuildFormCopy =
  {
    templateLabel: 'Subscription template',
    noTemplate: 'No subscription'
  };

const DEFAULT_ADMIN_ORGANIZATION_SUBSCRIPTION_BUILD_FORM_COPY: AdminOrganizationSubscriptionBuildFormCopy =
  {
    providerLabel: 'Payment provider',
    statusLabel: 'Subscription status',
    templateLabel: 'Subscription template',
    noTemplate: 'No subscription',
    providers: {
      none: 'None',
      stripe: 'Stripe',
      paypal: 'PayPal'
    },
    statuses: {
      free: 'Free',
      trialing: 'Trialing',
      active: 'Active',
      unpaid: 'Unpaid',
      canceled: 'Canceled'
    }
  };

function formatTemplateOptionLabel({
  name,
  billingInterval
}: AdminSubscriptionTemplateOption) {
  return `${name} (${billingInterval})`;
}

export function createAdminUpdateUserSubscriptionBuildFormBase({
  copy = DEFAULT_ADMIN_USER_SUBSCRIPTION_BUILD_FORM_COPY,
  templateOptions = [],
  disabled = false
}: {
  copy?: AdminUserSubscriptionBuildFormCopy;
  templateOptions?: AdminSubscriptionTemplateOption[];
  disabled?: boolean;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-update-user-subscription-form',
      layout: {
        columns: 1
      },
      fields: [
        buildFormField.hidden({
          name: 'userId'
        }),
        buildFormField.hidden({
          name: 'source'
        }),
        buildFormField.select({
          name: 'templateId',
          label: copy.templateLabel,
          placeholder: copy.noTemplate,
          options: templateOptions.map((template) => ({
            value: template.id,
            label: formatTemplateOptionLabel(template)
          })),
          disabled
        })
      ]
    }),
    buildFormValidationPreset.blur(
      {
        userId: [buildFormRule.required()],
        templateId: [buildFormRule.exists(dbRef('core.subscription_templates.user'))]
      },
      {
        preflight: true
      }
    )
  );
}

export function createAdminManageOrganizationSubscriptionBuildFormBase({
  copy = DEFAULT_ADMIN_ORGANIZATION_SUBSCRIPTION_BUILD_FORM_COPY,
  templateOptions = []
}: {
  copy?: AdminOrganizationSubscriptionBuildFormCopy;
  templateOptions?: AdminSubscriptionTemplateOption[];
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-manage-organization-subscription-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.hidden({
          name: 'teamId'
        }),
        buildFormField.hidden({
          name: 'source'
        }),
        buildFormField.select({
          name: 'paymentProvider',
          label: copy.providerLabel,
          options: [
            {
              value: '',
              label: copy.providers.none
            },
            ...ADMIN_TEAM_SUBSCRIPTION_PROVIDERS.map((provider) => ({
              value: provider,
              label: copy.providers[provider]
            }))
          ]
        }),
        buildFormField.select({
          name: 'subscriptionStatus',
          label: copy.statusLabel,
          options: ADMIN_TEAM_SUBSCRIPTION_STATUSES.map((status) => ({
            value: status,
            label: copy.statuses[status]
          }))
        }),
        buildFormField.select({
          name: 'templateId',
          label: copy.templateLabel,
          placeholder: copy.noTemplate,
          colSpan: 'full',
          options: templateOptions.map((template) => ({
            value: template.id,
            label: formatTemplateOptionLabel(template)
          }))
        })
      ]
    }),
    buildFormValidationPreset.blur(
      {
        teamId: [buildFormRule.required()],
        subscriptionStatus: [buildFormRule.required()],
        templateId: [
          buildFormRule.exists(dbRef('core.subscription_templates.organization'))
        ]
      },
      {
        preflight: true
      }
    )
  );
}

export function createAdminClearOrganizationSubscriptionBuildFormBase() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-clear-organization-subscription-form',
      fields: [
        buildFormField.hidden({
          name: 'teamId'
        }),
        buildFormField.hidden({
          name: 'source'
        })
      ]
    }),
    {
      fields: {
        teamId: [buildFormRule.required()]
      }
    }
  );
}
