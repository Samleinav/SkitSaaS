'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';
import {
  createSubscriptionTemplateAction,
  updateSubscriptionTemplateAction
} from '../actions';
import { useAreaMessages } from '@/lib/i18n/client';
import { SUBSCRIPTION_BILLING_INTERVALS } from '@/lib/payments/subscription-intervals';
import { SUBSCRIPTION_TARGET_SCOPES } from '@/lib/payments/subscription-scopes';
import {
  SUBSCRIPTION_FEATURE_VALUE_TYPES,
  type SubscriptionFeatureValueType
} from '@/lib/payments/subscription-feature-types';

type EditableSubscriptionTemplate = {
  id: number;
  name: string;
  targetScope: string;
  categoryKey: string;
  hierarchyRank: number;
  billingInterval: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  trialPeriodDays: number;
  features: Array<{
    id: number;
    key: string;
    label: string;
    valueType: string;
    value: string | null;
    valueLabel: string | null;
    isPublic: boolean;
  }>;
};

type FeatureRow = {
  id: string;
  key: string;
  label: string;
  valueType: SubscriptionFeatureValueType;
  value: string;
  valueLabel: string;
  isPublic: boolean;
};

type SubscriptionTemplateFormProps = {
  mode?: 'create' | 'update';
  template?: EditableSubscriptionTemplate;
};

function nextFeatureRowId() {
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function createEmptyFeatureRow(): FeatureRow {
  return {
    id: nextFeatureRowId(),
    key: '',
    label: '',
    valueType: 'text',
    value: '',
    valueLabel: '',
    isPublic: true
  };
}

function toFeatureRows(template?: EditableSubscriptionTemplate): FeatureRow[] {
  if (!template || template.features.length === 0) {
    return [createEmptyFeatureRow()];
  }

  return template.features.map((feature) => ({
    id: String(feature.id),
    key: feature.key,
    label: feature.label || feature.key,
    valueType: SUBSCRIPTION_FEATURE_VALUE_TYPES.includes(
      feature.valueType as SubscriptionFeatureValueType
    )
      ? (feature.valueType as SubscriptionFeatureValueType)
      : 'text',
    value: feature.value || '',
    valueLabel: feature.valueLabel || '',
    isPublic: feature.isPublic
  }));
}

function toMoneyInput(cents: number | null | undefined) {
  if (cents === null || cents === undefined) {
    return '';
  }

  return (cents / 100).toFixed(2);
}

export function SubscriptionTemplateForm({
  mode = 'create',
  template
}: SubscriptionTemplateFormProps) {
  const messages = useAreaMessages('admin');
  const templateForm = messages.templateForm;
  const [rows, setRows] = useState<FeatureRow[]>(() => toFeatureRows(template));
  const action =
    mode === 'update'
      ? updateSubscriptionTemplateAction
      : createSubscriptionTemplateAction;
  const submitLabel =
    mode === 'update' ? templateForm.updateTemplate : templateForm.createTemplate;
  const pendingSubmitLabel = `${submitLabel}...`;

  return (
    <form action={action} className="space-y-6">
      {mode === 'update' && template ? (
        <input type="hidden" name="templateId" value={template.id} />
      ) : null}

      <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
        <h3 className="text-sm font-medium text-foreground">
          {templateForm.planSectionTitle}
        </h3>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="template-name">{templateForm.templateNameLabel}</Label>
            <Input
              id="template-name"
              name="name"
              required
              placeholder={templateForm.templateNamePlaceholder}
              defaultValue={template?.name || ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-target-scope">{templateForm.targetScopeLabel}</Label>
            <select
              id="template-target-scope"
              name="targetScope"
              defaultValue={template?.targetScope || 'organization'}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {SUBSCRIPTION_TARGET_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {templateForm.scopes[scope]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-category-key">{templateForm.categoryKeyLabel}</Label>
            <Input
              id="template-category-key"
              name="categoryKey"
              required
              placeholder={templateForm.categoryKeyPlaceholder}
              defaultValue={template?.categoryKey || ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-hierarchy-rank">{templateForm.hierarchyRankLabel}</Label>
            <Input
              id="template-hierarchy-rank"
              name="hierarchyRank"
              type="number"
              step={1}
              placeholder={templateForm.hierarchyRankPlaceholder}
              defaultValue={template?.hierarchyRank ?? 0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-billing-interval">
              {templateForm.billingIntervalLabel}
            </Label>
            <select
              id="template-billing-interval"
              name="billingInterval"
              defaultValue={template?.billingInterval || 'monthly'}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {SUBSCRIPTION_BILLING_INTERVALS.map((interval) => (
                <option key={interval} value={interval}>
                  {templateForm.intervals[interval]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-price">{templateForm.priceLabel}</Label>
            <Input
              id="template-price"
              name="price"
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder={templateForm.pricePlaceholder}
              defaultValue={toMoneyInput(template?.priceCents)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-compare-at-price">{templateForm.compareAtPriceLabel}</Label>
            <Input
              id="template-compare-at-price"
              name="compareAtPrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder={templateForm.compareAtPricePlaceholder}
              defaultValue={toMoneyInput(template?.compareAtPriceCents)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-currency">{templateForm.currencyLabel}</Label>
            <Input
              id="template-currency"
              name="currency"
              placeholder={templateForm.currencyPlaceholder}
              defaultValue={template?.currency || 'USD'}
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-trial-days">{templateForm.trialDaysLabel}</Label>
            <Input
              id="template-trial-days"
              name="trialPeriodDays"
              type="number"
              min={0}
              placeholder={templateForm.trialDaysPlaceholder}
              defaultValue={template?.trialPeriodDays ?? 0}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">
            {templateForm.featuresSectionTitle}
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRows((prev) => [...prev, createEmptyFeatureRow()])}
          >
            {templateForm.addFeature}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{templateForm.featuresSectionHint}</p>

        <div className="overflow-x-auto rounded-md border border-border/70">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 text-left">{templateForm.featureKeyLabel}</th>
                <th className="px-3 py-2 text-left">{templateForm.featureLabelLabel}</th>
                <th className="px-3 py-2 text-left">{templateForm.featureTypeLabel}</th>
                <th className="px-3 py-2 text-left">{templateForm.featureValueLabel}</th>
                <th className="px-3 py-2 text-left">{templateForm.featureValueLabelLabel}</th>
                <th className="px-3 py-2 text-center">{templateForm.featurePublicLabel}</th>
                <th className="px-3 py-2 text-right">{templateForm.actionsLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isNullType = row.valueType === 'null';

                return (
                  <tr key={row.id} className="border-t border-border/70">
                    <td className="px-3 py-2">
                      <input type="hidden" name="featureRowId" value={row.id} />
                      <Input
                        name={`featureKey_${row.id}`}
                        value={row.key}
                        placeholder={templateForm.featureKeyPlaceholder}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, key: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        name={`featureLabel_${row.id}`}
                        value={row.label}
                        placeholder={templateForm.featureLabelPlaceholder}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, label: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        name={`featureValueType_${row.id}`}
                        value={row.valueType}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    valueType: event.target.value as SubscriptionFeatureValueType,
                                    value:
                                      event.target.value === 'null' ? '' : item.value,
                                    valueLabel:
                                      event.target.value === 'null' ? '' : item.valueLabel
                                  }
                                : item
                            )
                          )
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                      >
                        {SUBSCRIPTION_FEATURE_VALUE_TYPES.map((valueType) => (
                          <option key={valueType} value={valueType}>
                            {templateForm.valueTypes[valueType]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        name={`featureValue_${row.id}`}
                        value={row.value}
                        placeholder={templateForm.featureValuePlaceholder}
                        disabled={isNullType}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, value: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        name={`featureValueLabel_${row.id}`}
                        value={row.valueLabel}
                        placeholder={templateForm.featureValueLabelPlaceholder}
                        disabled={isNullType}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, valueLabel: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        name={`featureIsPublic_${row.id}`}
                        checked={row.isPublic}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, isPublic: event.target.checked }
                                : item
                            )
                          )
                        }
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setRows((prev) =>
                            prev.length === 1
                              ? prev
                              : prev.filter((item) => item.id !== row.id)
                          )
                        }
                      >
                        {templateForm.remove}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <ThemedAsyncSubmitButton
          variant="outline"
          idleLabel={submitLabel}
          pendingLabel={pendingSubmitLabel}
          area="admin"
          slot="admin.subscriptions.template-form.submit"
        />
      </div>
    </form>
  );
}
