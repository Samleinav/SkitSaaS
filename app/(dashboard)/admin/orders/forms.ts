import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  defineBuildForm,
  validationCondition,
  withBuildFormValidation
} from '@skitsaas/sdk';
import {
  ORDER_PROVIDERS,
  ORDER_STATUSES,
  type PaymentOrderProvider
} from './form-utils';

export type OrderFormCopy = {
  targetTypeLabel: string;
  targetTypes: { team: string; user: string };
  providerLabel: string;
  statusLabel: string;
  eventTypeLabel: string;
  userIdLabel: string;
  userIdHint: string;
  teamIdLabel: string;
  teamIdHint: string;
  templateIdLabel: string;
  templateIdHint: string;
  paymentMethodLabel: string;
  planNameLabel: string;
  amountMajorLabel: string;
  amountMajorHint: string;
  currencyLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
  providerPlanIdLabel: string;
  externalPaymentIdLabel: string;
  externalOrderIdLabel: string;
  statusLabels: {
    pending: string;
    received: string;
    canceled: string;
    failed: string;
  };
};

export const DEFAULT_ORDER_FORM_COPY: OrderFormCopy = {
  targetTypeLabel: 'Subscription target',
  targetTypes: { team: 'Organization / Team', user: 'User' },
  providerLabel: 'Provider',
  statusLabel: 'Status',
  eventTypeLabel: 'Event type',
  userIdLabel: 'User',
  userIdHint: 'Choose the user who receives the user-scope subscription.',
  teamIdLabel: 'Team',
  teamIdHint: 'Choose the team that receives the organization-scope subscription.',
  templateIdLabel: 'Subscription template',
  templateIdHint: 'Required. Filtered by selected target scope.',
  paymentMethodLabel: 'Payment method',
  planNameLabel: 'Plan name',
  amountMajorLabel: 'Amount',
  amountMajorHint: 'Use decimal format (e.g. 10.50).',
  currencyLabel: 'Currency',
  messageLabel: 'Message',
  messagePlaceholder: 'Optional context for event execution',
  providerPlanIdLabel: 'Provider plan ID',
  externalPaymentIdLabel: 'External payment ID',
  externalOrderIdLabel: 'External order ID',
  statusLabels: {
    pending: 'Pending',
    received: 'Received',
    canceled: 'Canceled',
    failed: 'Failed'
  }
};

// ─── Create Order Form ────────────────────────────────────────────────────────

export function createAdminCreateOrderBuildFormBase({
  copy = DEFAULT_ORDER_FORM_COPY
}: {
  copy?: OrderFormCopy;
} = {}) {
  const statusOptions = ORDER_STATUSES.map((s) => ({
    value: s,
    label: copy.statusLabels[s]
  }));

  const providerOptions = ORDER_PROVIDERS.map((p) => ({ value: p, label: p }));

  const targetTypeOptions = [
    { value: 'team', label: copy.targetTypes.team },
    { value: 'user', label: copy.targetTypes.user }
  ];

  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-create-order-form',
      sections: [
        {
          id: 'target',
          title: 'Subscription target',
          columns: 2,
          fields: [
            buildFormField.select({
              name: 'targetType',
              label: copy.targetTypeLabel,
              colSpan: 'full',
              options: targetTypeOptions
            }),
            buildFormField.select({
              name: 'userId',
              label: copy.userIdLabel,
              description: copy.userIdHint,
              placeholder: '—',
              optionsKey: 'userOptions'
            }),
            buildFormField.select({
              name: 'teamId',
              label: copy.teamIdLabel,
              description: copy.teamIdHint,
              placeholder: '—',
              optionsKey: 'teamOptions'
            }),
            buildFormField.select({
              name: 'subscriptionTemplateId',
              label: copy.templateIdLabel,
              description: copy.templateIdHint,
              required: true,
              colSpan: 'full',
              placeholder: '—',
              optionsKey: 'templateOptions'
            })
          ]
        },
        {
          id: 'status',
          title: 'Status & Notes',
          columns: 2,
          fields: [
            buildFormField.select({
              name: 'status',
              label: copy.statusLabel,
              options: statusOptions
            }),
            buildFormField.select({
              name: 'provider',
              label: copy.providerLabel,
              options: providerOptions
            }),
            buildFormField.text({
              name: 'paymentMethod',
              label: copy.paymentMethodLabel,
              placeholder: 'e.g. card, bank transfer',
              maxLength: 60
            }),
            buildFormField.hidden({ name: 'eventType' })
          ]
        },
        {
          id: 'financial',
          title: 'Financial',
          columns: 2,
          fields: [
            buildFormField.number({
              name: 'amountMajor',
              label: copy.amountMajorLabel,
              description: copy.amountMajorHint,
              min: 0,
              step: 0.01
            }),
            buildFormField.text({
              name: 'currency',
              label: copy.currencyLabel,
              placeholder: 'USD',
              maxLength: 10
            })
          ]
        }
      ]
    }),
    buildFormValidationPreset.blur({
      subscriptionTemplateId: [buildFormRule.required()],
      userId: [
        buildFormRule.required({
          when: [validationCondition.equals('targetType', 'user')]
        })
      ],
      teamId: [
        buildFormRule.required({
          when: [validationCondition.equals('targetType', 'team')]
        })
      ]
    })
  );
}

// ─── Edit Order Form ──────────────────────────────────────────────────────────

export type AdminEditOrderFormCopy = Omit<
  OrderFormCopy,
  'targetTypeLabel' | 'targetTypes' | 'userIdLabel' | 'userIdHint'
>;

export function createAdminEditOrderBuildFormBase({
  copy = DEFAULT_ORDER_FORM_COPY
}: {
  copy?: AdminEditOrderFormCopy;
} = {}) {
  const statusOptions = ORDER_STATUSES.map((s) => ({
    value: s,
    label: copy.statusLabels[s]
  }));

  const providerOptions = ORDER_PROVIDERS.map((p: PaymentOrderProvider) => ({
    value: p,
    label: p
  }));

  return defineBuildForm({
    id: 'admin-edit-order-form',
    sections: [
      {
        id: 'status',
        title: 'Status & Metadata',
        columns: 2,
        fields: [
          buildFormField.hidden({ name: 'orderId' }),
          buildFormField.select({
            name: 'status',
            label: copy.statusLabel,
            options: statusOptions
          }),
          buildFormField.select({
            name: 'provider',
            label: copy.providerLabel,
            options: providerOptions
          }),
          buildFormField.text({
            name: 'paymentMethod',
            label: copy.paymentMethodLabel,
            placeholder: 'e.g. card, paypal',
            maxLength: 60
          }),
          buildFormField.text({
            name: 'planName',
            label: copy.planNameLabel,
            maxLength: 100
          }),
          buildFormField.textarea({
            name: 'message',
            label: copy.messageLabel,
            placeholder: copy.messagePlaceholder,
            colSpan: 'full',
            maxLength: 1000
          })
        ]
      },
      {
        id: 'assignment',
        title: 'Assignment',
        columns: 2,
        fields: [
          buildFormField.select({
            name: 'teamId',
            label: copy.teamIdLabel,
            description: copy.teamIdHint,
            placeholder: '—',
            optionsKey: 'teamOptions'
          }),
          buildFormField.select({
            name: 'subscriptionTemplateId',
            label: copy.templateIdLabel,
            description: copy.templateIdHint,
            placeholder: '—',
            optionsKey: 'templateOptions'
          })
        ]
      },
      {
        id: 'financial',
        title: 'Financial Details',
        columns: 2,
        fields: [
          buildFormField.number({
            name: 'amountMajor',
            label: copy.amountMajorLabel,
            description: copy.amountMajorHint,
            min: 0,
            step: 0.01
          }),
          buildFormField.text({
            name: 'currency',
            label: copy.currencyLabel,
            placeholder: 'USD',
            maxLength: 10
          }),
          // Provider IDs as read-only hidden (values preserved, not editable)
          buildFormField.hidden({ name: 'providerPlanId' }),
          buildFormField.hidden({ name: 'externalPaymentId' }),
          buildFormField.hidden({ name: 'externalOrderId' })
        ]
      }
    ]
  });
}
