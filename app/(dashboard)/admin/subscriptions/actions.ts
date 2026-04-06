'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  subscriptionAssignments,
  subscriptionTemplateFeatures,
  subscriptionTemplates,
  teams,
  users
} from '@/lib/db/schema';
import {
  getActiveTeamSubscriptionAssignment,
  getActiveUserSubscriptionAssignment,
  getSubscriptionTemplateById,
  getSubscriptionTemplateWithFeaturesById
} from '@/lib/db/queries';
import {
  revalidateAdminBilling,
  revalidateAdminSuscriptions,
  revalidateAdminUsers,
  revalidateAdminSubscriptions,
  revalidateDashboard,
  revalidatePricing
} from '../actions/shared';
import { adminAction, adminValidatedAction } from '../controller';
import { SUBSCRIPTION_BILLING_INTERVAL_SET } from '@/lib/payments/subscription-intervals';
import { SUBSCRIPTION_FEATURE_VALUE_TYPE_SET } from '@/lib/payments/subscription-feature-types';
import { SUBSCRIPTION_TARGET_SCOPE_SET } from '@/lib/payments/subscription-scopes';
import {
  getManagedSubscriptionFeatureDefinition,
  isManagedSubscriptionFeatureInputValid,
  normalizeManagedSubscriptionFeature
} from '@/lib/features/catalog';
import {
  createCheckoutTemplateSnapshot,
  emitTemplateActiveSubscriptionsUpdateRequestedEvent,
  emitTemplatePricingChangedEvent,
  hasCheckoutTemplatePricingChanged
} from '@/lib/payments/checkout-system';
import { isSubscriptionMutationBlocked } from '@/lib/payments/subscription-single-writer';
import {
  FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID,
  FREE_USER_SUBSCRIPTION_TEMPLATE_ID,
  getReservedFreeTemplateRequiredFeatures,
  normalizeSubscriptionTemplatePublicationStatus
} from '@/lib/payments/subscription-default-templates';
import {
  activateSubscriptionAssignment,
  replaceWithReservedFreeSubscriptionAssignment,
} from '@/lib/payments/subscription-assignments';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { buildAdminTeamSubscriptionUpdate } from './form-utils';
import {
  createAdminDeleteSubscriptionTemplateBuildFormBase,
  createAdminRequestTemplateActiveUpdateBuildFormBase
} from './forms';
import { createAdminSubscriptionInvalidFactory } from './validation';
import {
  createAdminClearOrganizationSubscriptionBuildFormBase,
  createAdminManageOrganizationSubscriptionBuildFormBase,
  createAdminUpdateUserSubscriptionBuildFormBase
} from '../suscriptions/forms';

function normalizeTemplateBillingInterval(input: string) {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return 'monthly';
  }

  if (SUBSCRIPTION_BILLING_INTERVAL_SET.has(normalized)) {
    return normalized;
  }

  return null;
}

function normalizeTemplateTargetScope(
  input: string
): 'user' | 'organization' | null {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return 'organization';
  }

  if (SUBSCRIPTION_TARGET_SCOPE_SET.has(normalized)) {
    return normalized as 'user' | 'organization';
  }

  return null;
}

function normalizeTemplateCategoryKey(input: string, fallbackName: string) {
  const source = (input || '').trim() || fallbackName.trim();
  if (!source) {
    return null;
  }

  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 120);

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeCurrency(input: string) {
  const normalized = input.trim().toUpperCase();
  if (!normalized) {
    return 'USD';
  }

  if (!/^[A-Z]{3,10}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function parsePriceToCents(input: string) {
  const normalized = input.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function parseOptionalTemplateId(raw: string) {
  if (!raw) {
    return { valid: true, value: null } as const;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { valid: false, value: null } as const;
  }

  return { valid: true, value: parsed } as const;
}

function normalizeSource(input: string, fallback: string) {
  const normalized = input.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, 120);
}

function getReservedTemplateScope(templateId: number) {
  if (templateId === FREE_USER_SUBSCRIPTION_TEMPLATE_ID) {
    return 'user' as const;
  }

  if (templateId === FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID) {
    return 'organization' as const;
  }

  return null;
}

type ParsedTemplateFeature = {
  featureKey: string;
  featureLabel: string;
  valueType: string;
  featureValue: string | null;
  valueLabel: string | null;
  isPublic: boolean;
};

type TemplateFeatureSeed = {
  key: string;
  label: string;
  valueType: string;
  value: string | null;
  valueLabel: string | null;
  isPublic: boolean;
};

function mapTemplateFeaturesByKey(
  features: Array<{
    key: string;
    label: string;
    valueType: string;
    value: string | null;
    valueLabel: string | null;
    isPublic: boolean;
  }>
) {
  return new Map<string, TemplateFeatureSeed>(
    features.map((feature) => [
      feature.key,
      {
        key: feature.key,
        label: feature.label,
        valueType: feature.valueType,
        value: feature.value,
        valueLabel: feature.valueLabel,
        isPublic: feature.isPublic
      }
    ])
  );
}

function mapRequiredTemplateFeatures(
  templateId: number | null | undefined
) {
  return new Map<string, TemplateFeatureSeed>(
    getReservedFreeTemplateRequiredFeatures(templateId).map((feature) => [
      feature.key,
      {
        key: feature.key,
        label: feature.label,
        valueType: feature.valueType,
        value: feature.value,
        valueLabel: feature.valueLabel,
        isPublic: feature.isPublic
      }
    ])
  );
}

function toParsedTemplateFeature(feature: TemplateFeatureSeed): ParsedTemplateFeature {
  return {
    featureKey: feature.key,
    featureLabel: feature.label,
    valueType: feature.valueType,
    featureValue: feature.value,
    valueLabel: feature.valueLabel,
    isPublic: feature.isPublic
  };
}

function parseTemplateFeatures(
  formData: FormData,
  targetScope: 'user' | 'organization',
  options?: {
    preservedFeaturesByKey?: Map<string, TemplateFeatureSeed>;
    requiredFeaturesByKey?: Map<string, TemplateFeatureSeed>;
  }
) {
  const rowIds = formData
    .getAll('featureRowId')
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  const uniqueRowIds = Array.from(new Set(rowIds));

  const featuresMap = new Map<string, ParsedTemplateFeature>();
  let hasInvalidManagedFeatureInput = false;

  for (const rowId of uniqueRowIds) {
    const featureKey = String(formData.get(`featureKey_${rowId}`) || '').trim();
    const featureLabel = String(formData.get(`featureLabel_${rowId}`) || '').trim();
    const valueTypeInput = String(formData.get(`featureValueType_${rowId}`) || '')
      .trim()
      .toLowerCase();
    const valueType = SUBSCRIPTION_FEATURE_VALUE_TYPE_SET.has(valueTypeInput)
      ? valueTypeInput
      : 'text';
    const featureValueRaw = String(formData.get(`featureValue_${rowId}`) || '').trim();
    const valueLabelRaw = String(formData.get(`featureValueLabel_${rowId}`) || '').trim();
    const isPublic = formData.get(`featureIsPublic_${rowId}`) === 'on';

    if (!featureKey) {
      continue;
    }

    const managedDefinition = getManagedSubscriptionFeatureDefinition(featureKey);
    const normalizedManagedKey = managedDefinition?.key ?? featureKey;
    const preservedFeature =
      options?.preservedFeaturesByKey?.get(normalizedManagedKey) ??
      options?.requiredFeaturesByKey?.get(normalizedManagedKey) ??
      null;
    const featureValueInput =
      featureValueRaw.length > 0 ? featureValueRaw : preservedFeature?.value ?? null;
    const valueLabelInput =
      valueLabelRaw.length > 0
        ? valueLabelRaw
        : preservedFeature?.valueLabel ?? null;

    if (managedDefinition) {
      if (managedDefinition.targetScope !== targetScope) {
        continue;
      }

      if (
        !isManagedSubscriptionFeatureInputValid(
          managedDefinition,
          featureValueRaw || null
        )
      ) {
        hasInvalidManagedFeatureInput = true;
        continue;
      }
    }

    const managedFeature = normalizeManagedSubscriptionFeature({
      featureKey,
      featureLabel,
      valueType,
      featureValue: featureValueInput,
      valueLabel: valueLabelInput,
      isPublic
    }, { targetScope });

    if (managedFeature) {
      const hasManagedPayload =
        managedFeature.valueType === 'null' ||
        managedFeature.featureValue !== null ||
        managedFeature.valueLabel !== null;

      if (!hasManagedPayload) {
        continue;
      }

      featuresMap.set(managedFeature.featureKey, managedFeature);
      continue;
    }

    if (getManagedSubscriptionFeatureDefinition(featureKey)) {
      // Managed features are scope-bound; ignore mismatched scope rows.
      continue;
    }

    if (!featureLabel) {
      continue;
    }

    if (valueType === 'null') {
      featuresMap.set(featureKey, {
        featureKey,
        featureLabel,
        valueType,
        featureValue: null,
        valueLabel: null,
        isPublic
      });
      continue;
    }

    const featureValue = featureValueRaw || null;
    const valueLabel = valueLabelRaw || featureValueRaw || null;

    if (!featureValue && !valueLabel) {
      continue;
    }

    featuresMap.set(featureKey, {
      featureKey,
      featureLabel,
      valueType,
      featureValue,
      valueLabel,
      isPublic
    });
  }

  if (options?.requiredFeaturesByKey) {
    for (const [featureKey, requiredFeature] of options.requiredFeaturesByKey) {
      if (featuresMap.has(featureKey)) {
        continue;
      }

      const preservedFeature = options.preservedFeaturesByKey?.get(featureKey);
      featuresMap.set(
        featureKey,
        toParsedTemplateFeature(preservedFeature ?? requiredFeature)
      );
    }
  }

  return {
    features: Array.from(featuresMap.values()),
    hasInvalidManagedFeatureInput
  };
}

const adminRequestTemplateActiveUpdateBuildForm =
  createAdminRequestTemplateActiveUpdateBuildFormBase();
const adminDeleteSubscriptionTemplateBuildForm =
  createAdminDeleteSubscriptionTemplateBuildFormBase();
const adminUpdateUserSubscriptionBuildForm =
  createAdminUpdateUserSubscriptionBuildFormBase();
const adminManageOrganizationSubscriptionBuildForm =
  createAdminManageOrganizationSubscriptionBuildFormBase();
const adminClearOrganizationSubscriptionBuildForm =
  createAdminClearOrganizationSubscriptionBuildFormBase();

export const createSubscriptionTemplateAction = adminAction(
  async ({ form, formData }) => {
    const name = form.string('name');
    const targetScopeInput = form.string('targetScope');
    const targetScope = normalizeTemplateTargetScope(targetScopeInput);
    const publicationStatus = normalizeSubscriptionTemplatePublicationStatus(
      form.string('publicationStatus')
    );
    const categoryKey = normalizeTemplateCategoryKey(
      form.string('categoryKey'),
      name
    );
    const hierarchyRank = form.integer('hierarchyRank') ?? 0;
    const billingIntervalInput = form.string('billingInterval');
    const billingInterval = normalizeTemplateBillingInterval(billingIntervalInput);
    const priceCents = parsePriceToCents(form.string('price'));
    const compareAtPriceRaw = form.string('compareAtPrice');
    const compareAtPriceCents = compareAtPriceRaw
      ? parsePriceToCents(compareAtPriceRaw)
      : null;
    const trialPeriodDays = Math.max(0, form.integer('trialPeriodDays') ?? 0);
    const currency = normalizeCurrency(form.string('currency'));

    if (
      !name ||
      !targetScope ||
      !publicationStatus ||
      !categoryKey ||
      !billingInterval ||
      priceCents === null ||
      !currency
    ) {
      return false;
    }

    if (
      compareAtPriceRaw &&
      (compareAtPriceCents === null || compareAtPriceCents <= priceCents)
    ) {
      return false;
    }

    const parsedFeatures = parseTemplateFeatures(formData, targetScope);
    if (parsedFeatures.hasInvalidManagedFeatureInput) {
      return false;
    }

    const [createdTemplate] = await db
      .insert(subscriptionTemplates)
      .values({
        name,
        targetScope,
        publicationStatus,
        categoryKey,
        hierarchyRank,
        billingInterval,
        priceCents,
        compareAtPriceCents,
        currency,
        trialPeriodDays,
        updatedAt: new Date()
      })
      .returning({ id: subscriptionTemplates.id });

    // NOTE: Provider-specific plans are intentionally provisioned on-demand
    // during checkout (e.g., Stripe). This keeps templates provider-agnostic.
    const featuresToInsert = parsedFeatures.features;

    if (featuresToInsert.length > 0) {
      await db.insert(subscriptionTemplateFeatures).values(
        featuresToInsert.map((feature) => ({
          templateId: createdTemplate.id,
          featureKey: feature.featureKey,
          featureLabel: feature.featureLabel,
          valueType: feature.valueType,
          featureValue: feature.featureValue,
          valueLabel: feature.valueLabel,
          isPublic: feature.isPublic,
          updatedAt: new Date()
        }))
      );
    }

    await emitEventAsync(
      EVENT_HOOKS.adminSubscriptionTemplateCreated,
      {
        templateId: createdTemplate.id,
        name,
        targetScope,
        billingInterval,
        priceCents,
        currency
      },
      { source: '/admin/subscriptions/templates' }
    );
  },
  {
    revalidate: [
      revalidateAdminSubscriptions,
      revalidateAdminBilling,
      revalidatePricing
    ]
  }
);

export const updateSubscriptionTemplateAction = adminAction(
  async ({ user: currentUser, form, formData }) => {
    const templateId = form.positiveInt('templateId');
    const name = form.string('name');
    const targetScopeInput = form.string('targetScope');
    const targetScope = normalizeTemplateTargetScope(targetScopeInput);
    const publicationStatus = normalizeSubscriptionTemplatePublicationStatus(
      form.string('publicationStatus')
    );
    const categoryKey = normalizeTemplateCategoryKey(
      form.string('categoryKey'),
      name
    );
    const hierarchyRank = form.integer('hierarchyRank') ?? 0;
    const billingIntervalInput = form.string('billingInterval');
    const billingInterval = normalizeTemplateBillingInterval(billingIntervalInput);
    const priceCents = parsePriceToCents(form.string('price'));
    const compareAtPriceRaw = form.string('compareAtPrice');
    const compareAtPriceCents = compareAtPriceRaw
      ? parsePriceToCents(compareAtPriceRaw)
      : null;
    const trialPeriodDays = Math.max(0, form.integer('trialPeriodDays') ?? 0);
    const currency = normalizeCurrency(form.string('currency'));

    if (
      !templateId ||
      !name ||
      !targetScope ||
      !publicationStatus ||
      !categoryKey ||
      !billingInterval ||
      priceCents === null ||
      !currency
    ) {
      return false;
    }

    const currentTemplate = await getSubscriptionTemplateWithFeaturesById(templateId);
    if (!currentTemplate) {
      return false;
    }

    const reservedTemplateScope = getReservedTemplateScope(currentTemplate.id);
    if (reservedTemplateScope && targetScope !== reservedTemplateScope) {
      return false;
    }

    if (
      compareAtPriceRaw &&
      (compareAtPriceCents === null || compareAtPriceCents <= priceCents)
    ) {
      return false;
    }

    const parsedFeatures = parseTemplateFeatures(formData, targetScope, {
      preservedFeaturesByKey: mapTemplateFeaturesByKey(currentTemplate.features),
      requiredFeaturesByKey: mapRequiredTemplateFeatures(templateId)
    });
    if (parsedFeatures.hasInvalidManagedFeatureInput) {
      return false;
    }

    const updatedAt = new Date();

    await db
      .update(subscriptionTemplates)
      .set({
        name,
        targetScope,
        publicationStatus,
        categoryKey,
        hierarchyRank,
        billingInterval,
        priceCents,
        compareAtPriceCents,
        currency,
        trialPeriodDays,
        updatedAt
      })
      .where(eq(subscriptionTemplates.id, templateId));

    // NOTE: Future bulk synchronizers can diff template versions against
    // provider plans and decide whether to migrate or keep legacy plans.

    await db
      .delete(subscriptionTemplateFeatures)
      .where(eq(subscriptionTemplateFeatures.templateId, templateId));

    const featuresToInsert = parsedFeatures.features;
    if (featuresToInsert.length > 0) {
      await db.insert(subscriptionTemplateFeatures).values(
        featuresToInsert.map((feature) => ({
          templateId,
          featureKey: feature.featureKey,
          featureLabel: feature.featureLabel,
          valueType: feature.valueType,
          featureValue: feature.featureValue,
          valueLabel: feature.valueLabel,
          isPublic: feature.isPublic,
          updatedAt: new Date()
        }))
      );
    }

    const updatedTemplate = {
      ...currentTemplate,
      name,
      targetScope,
      publicationStatus,
      categoryKey,
      hierarchyRank,
      billingInterval,
      priceCents,
      compareAtPriceCents,
      currency,
      trialPeriodDays,
      updatedAt
    };

    if (hasCheckoutTemplatePricingChanged(currentTemplate, updatedTemplate)) {
      await emitEventAsync(
        EVENT_HOOKS.adminSubscriptionTemplatePricingChanged,
        {
          templateId,
          name,
          previous: {
            priceCents: currentTemplate.priceCents,
            compareAtPriceCents: currentTemplate.compareAtPriceCents,
            currency: currentTemplate.currency,
            billingInterval: currentTemplate.billingInterval,
            trialPeriodDays: currentTemplate.trialPeriodDays
          },
          next: {
            priceCents,
            compareAtPriceCents,
            currency,
            billingInterval,
            trialPeriodDays
          }
        },
        {
          actorUserId: currentUser.id,
          actorEmail: currentUser.email,
          actorRole: currentUser.role,
          source: `/admin/subscriptions/templates/${templateId}/edit`
        }
      );

      await emitTemplatePricingChangedEvent({
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        source: `/admin/subscriptions/templates/${templateId}/edit`,
        templateId,
        templateName: updatedTemplate.name,
        previousSnapshot: createCheckoutTemplateSnapshot(currentTemplate),
        currentSnapshot: createCheckoutTemplateSnapshot(updatedTemplate)
      });
    }

    await emitEventAsync(
      EVENT_HOOKS.adminSubscriptionTemplateUpdated,
      {
        templateId,
        name,
        targetScope,
        billingInterval,
        priceCents,
        currency
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        source: `/admin/subscriptions/templates/${templateId}/edit`
      }
    );
  },
  {
    revalidate: [
      revalidateAdminSubscriptions,
      revalidateAdminBilling,
      revalidatePricing
    ]
  }
);

export const requestTemplateActiveSubscriptionsUpdateAction = adminValidatedAction(
  adminRequestTemplateActiveUpdateBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminSubscriptionInvalidFactory(values);
    const templateId =
      typeof values.templateId === 'number' && values.templateId > 0
        ? values.templateId
        : null;

    if (!templateId) {
      return invalid({
        templateId: ['A valid template is required.']
      });
    }

    const template = await getSubscriptionTemplateById(templateId);
    if (!template) {
      return invalid({
        templateId: ['Selected template was not found.']
      });
    }

    await emitTemplateActiveSubscriptionsUpdateRequestedEvent({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      source: `/admin/subscriptions/templates/${templateId}/edit`,
      templateId: template.id,
      templateName: template.name,
      templateSnapshot: createCheckoutTemplateSnapshot(template),
      reason: 'manual_admin_request'
    });

    await emitEventAsync(
      EVENT_HOOKS.adminSubscriptionsActiveUpdateRequested,
      {
        templateId: template.id,
        templateName: template.name,
        reason: 'manual_admin_request'
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        source: `/admin/subscriptions/templates/${templateId}/edit`
      }
    );
  },
  {
    revalidate: [revalidateAdminSubscriptions, revalidateAdminBilling]
  }
);

export const deleteSubscriptionTemplateAction = adminValidatedAction(
  adminDeleteSubscriptionTemplateBuildForm,
  async ({ values }) => {
    const invalid = await createAdminSubscriptionInvalidFactory(values);
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.delete_subscription_template_action'
      )
    ) {
      return false;
    }

    const templateId =
      typeof values.templateId === 'number' && values.templateId > 0
        ? values.templateId
        : null;
    if (!templateId) {
      return invalid({
        templateId: ['A valid template is required.']
      });
    }

    if (
      templateId === FREE_USER_SUBSCRIPTION_TEMPLATE_ID ||
      templateId === FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID
    ) {
      return invalid({
        templateId: ['Reserved free templates cannot be deleted.']
      });
    }

    await db
      .delete(subscriptionTemplateFeatures)
      .where(eq(subscriptionTemplateFeatures.templateId, templateId));

    await db
      .update(subscriptionAssignments)
      .set({
        status: 'canceled',
        effectiveTo: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(subscriptionAssignments.subscriptionTemplateId, templateId),
          isNull(subscriptionAssignments.effectiveTo)
        )
      );

    await db
      .delete(subscriptionTemplates)
      .where(eq(subscriptionTemplates.id, templateId));
  },
  {
    revalidate: [
      revalidateAdminSubscriptions,
      revalidateAdminBilling,
      revalidateDashboard,
      revalidatePricing
    ]
  }
);

export const updateUserSubscriptionAction = adminValidatedAction(
  adminUpdateUserSubscriptionBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminSubscriptionInvalidFactory(values);
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.update_user_subscription_action'
      )
    ) {
      return false;
    }

    const userId =
      typeof values.userId === 'number' && values.userId > 0
        ? values.userId
        : null;
    const templateId =
      typeof values.templateId === 'number' && values.templateId > 0
        ? values.templateId
        : null;
    const source = normalizeSource(
      typeof values.source === 'string' ? values.source : '',
      `/admin/subscriptions/user/${userId ?? 'unknown'}/edit`
    );

    if (!userId) {
      return invalid({
        userId: ['A valid user is required.']
      });
    }

    const [targetUser] = await db
      .select({
        id: users.id,
        email: users.email,
        deletedAt: users.deletedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser || targetUser.deletedAt) {
      return invalid({
        userId: ['Selected user was not found.']
      });
    }

    const template = templateId
      ? await getSubscriptionTemplateById(templateId)
      : null;

    if (templateId && (!template || template.targetScope !== 'user')) {
      return invalid({
        templateId: ['Selected subscription template was not found.']
      });
    }

    const currentAssignment = await getActiveUserSubscriptionAssignment(userId);

    if (template?.id) {
      await activateSubscriptionAssignment({
        targetType: 'user',
        targetId: userId,
        subscriptionTemplateId: template.id,
        paymentProvider: null,
        providerReferenceId: currentAssignment?.providerReferenceId ?? null,
        providerPlanId: currentAssignment?.providerPlanId ?? null,
        status: 'active',
        planName: template.name,
        sourceOrderId: null
      });
    } else if (currentAssignment) {
      await replaceWithReservedFreeSubscriptionAssignment({
        targetType: 'user',
        targetId: userId,
        closeStatus: 'canceled',
        sourceOrderId: null
      });
    }

    await createSysActivityLog({
      eventType: 'admin.subscriptions.user.update',
      eventCategory: 'admin',
      action: 'update',
      status: 'success',
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetUserId: userId,
      entityType: 'user_subscription',
      entityId: String(userId),
      source,
      message: 'Admin updated user subscription assignment.',
      metadata: {
        userEmail: targetUser.email,
        previousTemplateId: currentAssignment?.subscriptionTemplateId ?? null,
        nextTemplateId: template?.id || null
      }
    });

    await emitEventAsync(
      EVENT_HOOKS.adminSubscriptionsUserUpdated,
      {
        userId,
        previousTemplateId: currentAssignment?.subscriptionTemplateId ?? null,
        nextTemplateId: template?.id || null
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetUserId: userId,
        source
      }
    );
  },
  {
    revalidate: [
      revalidateAdminUsers,
      revalidateAdminSuscriptions,
      revalidateDashboard
    ]
  }
);

export const updateTeamSubscriptionAction = adminValidatedAction(
  adminManageOrganizationSubscriptionBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminSubscriptionInvalidFactory(values);
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.update_team_subscription_action'
      )
    ) {
      return false;
    }

    const teamId =
      typeof values.teamId === 'number' && values.teamId > 0
        ? values.teamId
        : null;
    const paymentProviderInput =
      typeof values.paymentProvider === 'string' ? values.paymentProvider : '';
    const subscriptionStatusInput =
      typeof values.subscriptionStatus === 'string'
        ? values.subscriptionStatus
        : '';
    const templateId =
      typeof values.templateId === 'number' && values.templateId > 0
        ? values.templateId
        : null;
    const source = normalizeSource(
      typeof values.source === 'string' ? values.source : '',
      `/admin/subscriptions/organization/${teamId ?? 'unknown'}/edit`
    );

    if (!teamId) {
      return invalid({
        teamId: ['A valid organization is required.']
      });
    }

    const [currentTeam] = await db
      .select({
        id: teams.id,
        name: teams.name
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!currentTeam) {
      return invalid({
        teamId: ['Selected organization was not found.']
      });
    }

    const currentAssignment = await getActiveTeamSubscriptionAssignment(teamId);

    const template = templateId
      ? await getSubscriptionTemplateById(templateId)
      : null;

    if (templateId && (!template || template.targetScope !== 'organization')) {
      return invalid({
        templateId: ['Selected subscription template was not found.']
      });
    }

    const resolvedUpdate = buildAdminTeamSubscriptionUpdate({
      paymentProviderInput,
      subscriptionStatusInput,
      template: template
        ? {
            id: template.id,
            name: template.name
          }
        : null,
      currentPlanName: currentAssignment?.planName ?? null
    });

    if (resolvedUpdate.subscriptionTemplateId) {
      await activateSubscriptionAssignment({
        targetType: 'team',
        targetId: teamId,
        subscriptionTemplateId: resolvedUpdate.subscriptionTemplateId,
        paymentProvider: resolvedUpdate.paymentProvider ?? null,
        providerReferenceId: currentAssignment?.providerReferenceId ?? null,
        providerPlanId: currentAssignment?.providerPlanId ?? null,
        status: resolvedUpdate.subscriptionStatus,
        planName: resolvedUpdate.planName ?? null,
        sourceOrderId: null
      });
    } else if (currentAssignment) {
      const suspendStatus =
        resolvedUpdate.subscriptionStatus === 'unpaid' ? 'unpaid' : 'canceled';
      await replaceWithReservedFreeSubscriptionAssignment({
        targetType: 'team',
        targetId: teamId,
        closeStatus: suspendStatus,
        sourceOrderId: null
      });
    }

    await createSysActivityLog({
      eventType: 'admin.subscriptions.organization.update',
      eventCategory: 'admin',
      action: 'update',
      status: 'success',
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      teamId,
      entityType: 'team_subscription',
      entityId: String(teamId),
      source,
      message: 'Admin updated organization subscription settings.',
      metadata: {
        teamName: currentTeam.name,
        previous: {
          paymentProvider: currentAssignment?.paymentProvider ?? null,
          subscriptionStatus: currentAssignment?.status ?? null,
          subscriptionTemplateId: currentAssignment?.subscriptionTemplateId ?? null,
          planName: currentAssignment?.planName ?? null
        },
        next: {
          paymentProvider: resolvedUpdate.paymentProvider ?? null,
          subscriptionStatus: resolvedUpdate.subscriptionStatus,
          subscriptionTemplateId: resolvedUpdate.subscriptionTemplateId,
          planName: resolvedUpdate.planName ?? null
        }
      }
    });

    await emitEventAsync(
      EVENT_HOOKS.adminSubscriptionsOrganizationUpdated,
      {
        teamId,
        previous: {
          paymentProvider: currentAssignment?.paymentProvider ?? null,
          subscriptionStatus: currentAssignment?.status ?? null,
          subscriptionTemplateId: currentAssignment?.subscriptionTemplateId ?? null,
          planName: currentAssignment?.planName ?? null
        },
        next: {
          paymentProvider: resolvedUpdate.paymentProvider ?? null,
          subscriptionStatus: resolvedUpdate.subscriptionStatus,
          subscriptionTemplateId: resolvedUpdate.subscriptionTemplateId,
          planName: resolvedUpdate.planName ?? null
        }
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        teamId,
        source
      }
    );
  },
  {
    revalidate: [
      revalidateAdminSubscriptions,
      revalidateAdminSuscriptions,
      revalidateAdminBilling,
      revalidateDashboard
    ]
  }
);

export const clearTeamSubscriptionAction = adminValidatedAction(
  adminClearOrganizationSubscriptionBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminSubscriptionInvalidFactory(values);
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.clear_team_subscription_action'
      )
    ) {
      return false;
    }

    const teamId =
      typeof values.teamId === 'number' && values.teamId > 0
        ? values.teamId
        : null;
    if (!teamId) {
      return invalid({
        teamId: ['A valid organization is required.']
      });
    }

    const source = normalizeSource(
      typeof values.source === 'string' ? values.source : '',
      `/admin/subscriptions/organization/${teamId}/edit`
    );

    const [currentTeam] = await db
      .select({
        id: teams.id,
        name: teams.name
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!currentTeam) {
      return invalid({
        teamId: ['Selected organization was not found.']
      });
    }

    const currentAssignment = await getActiveTeamSubscriptionAssignment(teamId);

    if (currentAssignment) {
      await replaceWithReservedFreeSubscriptionAssignment({
        targetType: 'team',
        targetId: teamId,
        closeStatus: 'canceled',
        sourceOrderId: null
      });
    }

    await createSysActivityLog({
      eventType: 'admin.subscriptions.organization.clear',
      eventCategory: 'admin',
      action: 'update',
      status: 'warning',
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      teamId,
      entityType: 'team_subscription',
      entityId: String(teamId),
      source,
      message: 'Admin cleared organization subscription settings.',
      metadata: {
        teamName: currentTeam.name,
        previous: {
          paymentProvider: currentAssignment?.paymentProvider ?? null,
          subscriptionStatus: currentAssignment?.status ?? null,
          subscriptionTemplateId: currentAssignment?.subscriptionTemplateId ?? null,
          planName: currentAssignment?.planName ?? null
        }
      }
    });

    await emitEventAsync(
      EVENT_HOOKS.adminSubscriptionsOrganizationCleared,
      {
        teamId,
        previous: {
          paymentProvider: currentAssignment?.paymentProvider ?? null,
          subscriptionStatus: currentAssignment?.status ?? null,
          subscriptionTemplateId: currentAssignment?.subscriptionTemplateId ?? null,
          planName: currentAssignment?.planName ?? null
        }
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        teamId,
        source
      }
    );
  },
  {
    revalidate: [
      revalidateAdminSubscriptions,
      revalidateAdminSuscriptions,
      revalidateAdminBilling,
      revalidateDashboard
    ]
  }
);
