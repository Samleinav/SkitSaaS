import type { FormReader } from '@/lib/actions/controller';
import type {
  PaymentOrderSource,
  PaymentOrderStatus
} from '@/lib/payments/orders';

export type PaymentOrderProvider = 'stripe' | 'paypal' | 'system';

export const ORDER_STATUSES = [
  'pending',
  'received',
  'canceled',
  'failed'
] as const satisfies readonly PaymentOrderStatus[];

export const ORDER_PROVIDERS = [
  'stripe',
  'paypal',
  'system'
] as const satisfies readonly PaymentOrderProvider[];

export const ADMIN_MANUAL_ORDER_SOURCE: PaymentOrderSource = 'dashboard';
export const ADMIN_MANUAL_ORDER_EVENT_TYPE = 'order.created.manual';

const ORDER_STATUS_SET = new Set<PaymentOrderStatus>(ORDER_STATUSES);
const ORDER_SOURCE_SET = new Set<PaymentOrderSource>([
  'checkout',
  'webhook',
  'dashboard',
  'system'
]);
const ORDER_PROVIDER_SET = new Set<PaymentOrderProvider>(ORDER_PROVIDERS);

export type AdminPaymentOrderInput = {
  provider: PaymentOrderProvider;
  status: PaymentOrderStatus;
  source: PaymentOrderSource;
  eventType: string;
  teamId: number | null;
  subscriptionTemplateId: number | null;
  paymentMethod: string | null;
  planName: string | null;
  providerPlanId: string | null;
  externalOrderId: string | null;
  externalPaymentId: string | null;
  amount: number | null;
  currency: string | null;
  message: string | null;
};

type ComparableAdminPaymentOrder = Omit<
  AdminPaymentOrderInput,
  'provider' | 'status' | 'source'
> & {
  provider: string;
  status: string;
  source: string;
};

function normalizeOptionalText(input: string, maxLength: number) {
  const normalized = input.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function parseOptionalPositiveInt(raw: string) {
  if (!raw) {
    return {
      valid: true,
      value: null
    } as const;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return {
      valid: false,
      value: null
    } as const;
  }

  return {
    valid: true,
    value: parsed
  } as const;
}

function parseOptionalAmount(rawCents: string, rawMajor: string) {
  if (rawMajor) {
    const normalizedMajor = rawMajor.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalizedMajor)) {
      return {
        valid: false,
        value: null
      } as const;
    }

    const parsedMajor = Number(normalizedMajor);
    if (!Number.isFinite(parsedMajor) || parsedMajor < 0) {
      return {
        valid: false,
        value: null
      } as const;
    }

    const cents = Math.round(parsedMajor * 100);
    if (!Number.isSafeInteger(cents)) {
      return {
        valid: false,
        value: null
      } as const;
    }

    return {
      valid: true,
      value: cents
    } as const;
  }

  if (!rawCents) {
    return {
      valid: true,
      value: null
    } as const;
  }

  if (!/^\d+$/.test(rawCents)) {
    return {
      valid: false,
      value: null
    } as const;
  }

  const parsed = Number(rawCents);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return {
      valid: false,
      value: null
    } as const;
  }

  return {
    valid: true,
    value: parsed
  } as const;
}

function normalizeCurrency(raw: string) {
  if (!raw.trim()) {
    return {
      valid: true,
      value: null
    } as const;
  }

  const normalized = raw.trim().toUpperCase();
  if (!/^[A-Z]{3,10}$/.test(normalized)) {
    return {
      valid: false,
      value: null
    } as const;
  }

  return {
    valid: true,
    value: normalized
  } as const;
}

type ParseAdminPaymentOrderInputOptions = {
  defaultSource?: PaymentOrderSource;
  defaultEventType?: string;
};

export function parseAdminPaymentOrderInput(
  form: Pick<FormReader, 'lower' | 'string'>,
  options: ParseAdminPaymentOrderInputOptions = {}
) {
  const providerInput = form.lower('provider');
  const statusInput = form.lower('status') as PaymentOrderStatus;
  const sourceInput = options.defaultSource || form.lower('source');
  const eventType = normalizeOptionalText(
    options.defaultEventType || form.string('eventType'),
    120
  );

  if (
    !ORDER_PROVIDER_SET.has(providerInput as PaymentOrderProvider) ||
    !ORDER_STATUS_SET.has(statusInput) ||
    !ORDER_SOURCE_SET.has(sourceInput as PaymentOrderSource) ||
    !eventType
  ) {
    return {
      valid: false,
      value: null
    } as const;
  }

  const teamIdPayload = parseOptionalPositiveInt(form.string('teamId'));
  const templateIdPayload = parseOptionalPositiveInt(
    form.string('subscriptionTemplateId')
  );
  const amountPayload = parseOptionalAmount(
    form.string('amount'),
    form.string('amountMajor')
  );
  const currencyPayload = normalizeCurrency(form.string('currency'));

  if (
    !teamIdPayload.valid ||
    !templateIdPayload.valid ||
    !amountPayload.valid ||
    !currencyPayload.valid
  ) {
    return {
      valid: false,
      value: null
    } as const;
  }

  return {
    valid: true,
    value: {
      provider: providerInput as PaymentOrderProvider,
      status: statusInput,
      source: sourceInput as PaymentOrderSource,
      eventType,
      teamId: teamIdPayload.value,
      subscriptionTemplateId: templateIdPayload.value,
      paymentMethod: normalizeOptionalText(form.string('paymentMethod'), 60),
      planName: normalizeOptionalText(form.string('planName'), 100),
      providerPlanId: normalizeOptionalText(form.string('providerPlanId'), 255),
      externalOrderId: normalizeOptionalText(form.string('externalOrderId'), 255),
      externalPaymentId: normalizeOptionalText(form.string('externalPaymentId'), 255),
      amount: amountPayload.value,
      currency: currencyPayload.value,
      message: normalizeOptionalText(form.string('message'), 1000)
    } satisfies AdminPaymentOrderInput
  } as const;
}

export function collectChangedFields(
  before: ComparableAdminPaymentOrder,
  after: ComparableAdminPaymentOrder
) {
  const keys: Array<keyof ComparableAdminPaymentOrder> = [
    'provider',
    'status',
    'source',
    'eventType',
    'teamId',
    'subscriptionTemplateId',
    'paymentMethod',
    'planName',
    'providerPlanId',
    'externalOrderId',
    'externalPaymentId',
    'amount',
    'currency',
    'message'
  ];

  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of keys) {
    if (before[key] !== after[key]) {
      changes[key] = {
        from: before[key],
        to: after[key]
      };
    }
  }

  return changes;
}

export function mapOrderStatusToLogStatus(status: PaymentOrderStatus) {
  if (status === 'received') {
    return 'success' as const;
  }

  if (status === 'failed') {
    return 'failed' as const;
  }

  return 'info' as const;
}

export function toTemplateAmountLabel(priceCents: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase() || 'USD';
  return `${(priceCents / 100).toFixed(2)} ${normalizedCurrency}`;
}
