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
  getSubscriptionTemplateById
} from '@/lib/db/queries';
import {
  revalidateAdminBilling,
  revalidateAdminSuscriptions,
  revalidateAdminUsers,
  revalidateAdminSubscriptions,
  revalidateDashboard,
  revalidatePricing
} from '../actions/shared';
import { adminAction } from '../controller';
import { SUBSCRIPTION_BILLING_INTERVAL_SET } from '@/lib/payments/subscription-intervals';
import { SUBSCRIPTION_FEATURE_VALUE_TYPE_SET } from '@/lib/payments/subscription-feature-types';
import { SUBSCRIPTION_TARGET_SCOPE_SET } from '@/lib/payments/subscription-scopes';
import {
  getManagedSubscriptionFeatureDefinition,
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
  activateSubscriptionAssignment,
  suspendSubscriptionAssignment
} from '@/lib/payments/subscription-assignments';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { buildAdminTeamSubscriptionUpdate } from './form-utils';

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

function parseTemplateFeatures(
  formData: FormData,
  targetScope: 'user' | 'organization'
) {
  const rowIds = formData
    .getAll('featureRowId')
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  const uniqueRowIds = Array.from(new Set(rowIds));

  const featuresMap = new Map<
    string,
    {
      featureKey: string;
      featureLabel: string;
      valueType: string;
      featureValue: string | null;
      valueLabel: string | null;
      isPublic: boolean;
    }
  >();

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

    const managedFeature = normalizeManagedSubscriptionFeature({
      featureKey,
      featureLabel,
      valueType,
      featureValue: featureValueRaw || null,
      valueLabel: valueLabelRaw || null,
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

  return Array.from(featuresMap.values());
}

export const createSubscriptionTemplateAction = adminAction(
  async ({ form, formData }) => {
    const name = form.string('name');
    const targetScopeInput = form.string('targetScope');
    const targetScope = normalizeTemplateTargetScope(targetScopeInput);
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

    const [createdTemplate] = await db
      .insert(subscriptionTemplates)
      .values({
        name,
        targetScope,
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

    const featuresToInsert = parseTemplateFeatures(formData, targetScope);

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
      { source: '/admin/subscriptions' }
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
      !categoryKey ||
      !billingInterval ||
      priceCents === null ||
      !currency
    ) {
      return false;
    }

    const currentTemplate = await getSubscriptionTemplateById(templateId);
    if (!currentTemplate) {
      return false;
    }

    if (
      compareAtPriceRaw &&
      (compareAtPriceCents === null || compareAtPriceCents <= priceCents)
    ) {
      return false;
    }

    const updatedAt = new Date();

    await db
      .update(subscriptionTemplates)
      .set({
        name,
        targetScope,
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

    const featuresToInsert = parseTemplateFeatures(formData, targetScope);
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
          source: `/admin/subscriptions/${templateId}/edit`
        }
      );

      await emitTemplatePricingChangedEvent({
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        source: `/admin/subscriptions/${templateId}/edit`,
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
        source: `/admin/subscriptions/${templateId}/edit`
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

export const requestTemplateActiveSubscriptionsUpdateAction = adminAction(
  async ({ user: currentUser, form }) => {
    const templateId = form.positiveInt('templateId');
    if (!templateId) {
      return false;
    }

    const template = await getSubscriptionTemplateById(templateId);
    if (!template) {
      return false;
    }

    await emitTemplateActiveSubscriptionsUpdateRequestedEvent({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      source: `/admin/subscriptions/${templateId}/edit`,
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
        source: `/admin/subscriptions/${templateId}/edit`
      }
    );
  },
  {
    revalidate: [revalidateAdminSubscriptions, revalidateAdminBilling]
  }
);

export const deleteSubscriptionTemplateAction = adminAction(
  async ({ form }) => {
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.delete_subscription_template_action'
      )
    ) {
      return false;
    }

    const templateId = form.positiveInt('templateId');
    if (!templateId) {
      return false;
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

export const updateUserSubscriptionAction = adminAction(
  async ({ user: currentUser, form }) => {
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.update_user_subscription_action'
      )
    ) {
      return false;
    }

    const userId = form.positiveInt('userId');
    const templatePayload = parseOptionalTemplateId(form.string('templateId'));

    if (!userId || !templatePayload.valid) {
      return false;
    }

    const source = normalizeSource(
      form.string('source'),
      `/admin/suscriptions/user/${userId}/edit`
    );

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
      return false;
    }

    const template = templatePayload.value
      ? await getSubscriptionTemplateById(templatePayload.value)
      : null;

    if (templatePayload.value && (!template || template.targetScope !== 'user')) {
      return false;
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
      await suspendSubscriptionAssignment({
        targetType: 'user',
        targetId: userId,
        status: 'canceled',
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

export const updateTeamSubscriptionAction = adminAction(
  async ({ user: currentUser, form }) => {
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.update_team_subscription_action'
      )
    ) {
      return false;
    }

    const teamId = form.positiveInt('teamId');
    const paymentProviderInput = form.lower('paymentProvider');
    const subscriptionStatusInput = form.lower('subscriptionStatus');
    const templatePayload = parseOptionalTemplateId(form.string('templateId'));
    const source = normalizeSource(
      form.string('source'),
      `/admin/suscriptions/organization/${teamId}/edit`
    );

    if (!teamId || !templatePayload.valid) {
      return false;
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
      return false;
    }

    const currentAssignment = await getActiveTeamSubscriptionAssignment(teamId);

    const template =
      templatePayload.value
        ? await getSubscriptionTemplateById(templatePayload.value)
        : null;

    if (template && template.targetScope !== 'organization') {
      return false;
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
      await suspendSubscriptionAssignment({
        targetType: 'team',
        targetId: teamId,
        status: suspendStatus,
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

export const clearTeamSubscriptionAction = adminAction(
  async ({ user: currentUser, form }) => {
    if (
      isSubscriptionMutationBlocked(
        'admin.subscriptions.clear_team_subscription_action'
      )
    ) {
      return false;
    }

    const teamId = form.positiveInt('teamId');
    if (!teamId) {
      return false;
    }

    const source = normalizeSource(
      form.string('source'),
      `/admin/suscriptions/organization/${teamId}/edit`
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
      return false;
    }

    const currentAssignment = await getActiveTeamSubscriptionAssignment(teamId);

    if (currentAssignment) {
      await suspendSubscriptionAssignment({
        targetType: 'team',
        targetId: teamId,
        status: 'canceled',
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
