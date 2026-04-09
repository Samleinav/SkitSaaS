import {
  asc,
  desc,
  and,
  eq,
  isNull,
  or,
  sql,
  inArray
} from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  authSessions,
  appConfigs,
  paymentOrders,
  subscriptionAssignments,
  subscriptionTemplateFeatures,
  subscriptionTemplates,
  teamMembers,
  teams,
  users
} from './schema';
import { cookies } from 'next/headers';
import {
  isSessionExpired,
  tryVerifyToken
} from '@/lib/auth/session';
import { ensurePersistedAuthSessionActive } from '@/lib/auth/session-store';
import { mapLegacyProviderToNamespace } from '@/lib/config/app-config';
import {
  SUBSCRIPTION_BILLING_INTERVAL_SORT_WEIGHT,
  type SubscriptionBillingInterval
} from '@/lib/payments/subscription-intervals';
import {
  SUBSCRIPTION_TARGET_SCOPE_SORT_WEIGHT,
  type SubscriptionTargetScope
} from '@/lib/payments/subscription-scopes';
import {
  FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID,
  FREE_USER_SUBSCRIPTION_TEMPLATE_ID,
  isSubscriptionTemplateSelfServiceEligible,
  type SubscriptionTemplatePublicationStatus
} from '@/lib/payments/subscription-default-templates';
import { areTeamsEnabled } from '@/lib/organizations/config';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await tryVerifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (isSessionExpired(sessionData)) {
    return null;
  }

  if (sessionData.sessionId) {
    const [activeSession] = await db
      .select({
        id: authSessions.id,
        sessionId: authSessions.sessionId,
        tokenJti: authSessions.tokenJti,
        status: authSessions.status,
        expiresAt: authSessions.expiresAt,
        revokedAt: authSessions.revokedAt
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.sessionId, sessionData.sessionId),
          eq(authSessions.userId, sessionData.user.id)
        )
      )
      .limit(1);

    if (
      !(await ensurePersistedAuthSessionActive(activeSession ?? null, {
        tokenJti: sessionData.jti,
        sessionId: sessionData.sessionId
      }))
    ) {
      return null;
    }
  }

  const user = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, sessionData.user.id),
        isNull(users.deletedAt),
        eq(users.accountStatus, 'active')
      )
    )
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getTeamById(teamId: number) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  if (!areTeamsEnabled()) {
    return null;
  }

  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  const team = result?.team;
  if (!team) {
    return null;
  }

  const assignment = await getActiveTeamSubscriptionAssignment(team.id);

  return {
    ...team,
    paymentProvider: assignment?.paymentProvider ?? null,
    providerReferenceId: assignment?.providerReferenceId ?? null,
    providerPlanId: assignment?.providerPlanId ?? null,
    planName: assignment?.planName ?? null,
    subscriptionStatus: assignment?.status ?? null,
    subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null,
    subscriptionTemplateName: assignment?.templateName ?? null,
    subscriptionTemplateInterval: assignment?.templateInterval ?? null,
    subscriptionTemplateCurrency: assignment?.templateCurrency ?? null,
    subscriptionTemplatePriceCents: assignment?.templatePriceCents ?? null,
    subscriptionCurrentPeriodStart: assignment?.currentPeriodStart ?? null,
    subscriptionCurrentPeriodEnd: assignment?.currentPeriodEnd ?? null,
    subscriptionTrialEndsAt: assignment?.trialEndsAt ?? null,
    subscriptionCancelAtPeriodEnd: assignment?.cancelAtPeriodEnd ?? null,
    subscriptionCanceledAt: assignment?.canceledAt ?? null
  };
}

export async function getOrganizationCountForUser(userId: number) {
  if (!areTeamsEnabled()) {
    return 0;
  }

  const [result] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  return result?.count ?? 0;
}

export async function getCurrentUserOrganizationCount() {
  const user = await getUser();
  if (!user) {
    return 0;
  }

  return getOrganizationCountForUser(user.id);
}

type ActiveUserSubscriptionAssignment = {
  id: number;
  targetUserId: number;
  subscriptionTemplateId: number;
  paymentProvider: string | null;
  providerReferenceId: string | null;
  providerPlanId: string | null;
  status: string;
  planName: string | null;
  templateName: string | null;
  templateInterval: string | null;
  templateCurrency: string | null;
  templatePriceCents: number | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean | null;
  canceledAt: Date | null;
};

type ActiveTeamSubscriptionAssignment = {
  id: number;
  targetTeamId: number;
  subscriptionTemplateId: number;
  paymentProvider: string | null;
  providerReferenceId: string | null;
  providerPlanId: string | null;
  status: string;
  planName: string | null;
  templateName: string | null;
  templateInterval: string | null;
  templateCurrency: string | null;
  templatePriceCents: number | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean | null;
  canceledAt: Date | null;
};

async function getActiveUserSubscriptionAssignmentsByUserIds(userIds: number[]) {
  if (userIds.length === 0) {
    return [] as ActiveUserSubscriptionAssignment[];
  }

  const rows = await db
    .select({
      id: subscriptionAssignments.id,
      targetUserId: subscriptionAssignments.targetUserId,
      subscriptionTemplateId: subscriptionAssignments.subscriptionTemplateId,
      paymentProvider: subscriptionAssignments.paymentProvider,
      providerReferenceId: subscriptionAssignments.providerReferenceId,
      providerPlanId: subscriptionAssignments.providerPlanId,
      status: subscriptionAssignments.status,
      planName: subscriptionAssignments.planName,
      currentPeriodStart: subscriptionAssignments.currentPeriodStart,
      currentPeriodEnd: subscriptionAssignments.currentPeriodEnd,
      trialEndsAt: subscriptionAssignments.trialEndsAt,
      cancelAtPeriodEnd: subscriptionAssignments.cancelAtPeriodEnd,
      canceledAt: subscriptionAssignments.canceledAt,
      templateName: subscriptionTemplates.name,
      templateInterval: subscriptionTemplates.billingInterval,
      templateCurrency: subscriptionTemplates.currency,
      templatePriceCents: subscriptionTemplates.priceCents
    })
    .from(subscriptionAssignments)
    .leftJoin(
      subscriptionTemplates,
      eq(subscriptionAssignments.subscriptionTemplateId, subscriptionTemplates.id)
    )
    .where(
      and(
        eq(subscriptionAssignments.targetType, 'user'),
        isNull(subscriptionAssignments.effectiveTo),
        inArray(subscriptionAssignments.targetUserId, userIds)
      )
    );

  return rows
    .filter(
      (row): row is typeof row & { targetUserId: number } =>
        typeof row.targetUserId === 'number'
    )
    .map((row) => ({
      id: row.id,
      targetUserId: row.targetUserId,
      subscriptionTemplateId: row.subscriptionTemplateId,
      paymentProvider: row.paymentProvider,
      providerReferenceId: row.providerReferenceId,
      providerPlanId: row.providerPlanId,
      status: row.status,
      planName: row.planName,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      trialEndsAt: row.trialEndsAt,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      canceledAt: row.canceledAt,
      templateName: row.templateName,
      templateInterval: row.templateInterval,
      templateCurrency: row.templateCurrency,
      templatePriceCents: row.templatePriceCents
    }));
}

async function getActiveTeamSubscriptionAssignmentsByTeamIds(teamIds: number[]) {
  if (teamIds.length === 0) {
    return [] as ActiveTeamSubscriptionAssignment[];
  }

  const rows = await db
    .select({
      id: subscriptionAssignments.id,
      targetTeamId: subscriptionAssignments.targetTeamId,
      subscriptionTemplateId: subscriptionAssignments.subscriptionTemplateId,
      paymentProvider: subscriptionAssignments.paymentProvider,
      providerReferenceId: subscriptionAssignments.providerReferenceId,
      providerPlanId: subscriptionAssignments.providerPlanId,
      status: subscriptionAssignments.status,
      planName: subscriptionAssignments.planName,
      currentPeriodStart: subscriptionAssignments.currentPeriodStart,
      currentPeriodEnd: subscriptionAssignments.currentPeriodEnd,
      trialEndsAt: subscriptionAssignments.trialEndsAt,
      cancelAtPeriodEnd: subscriptionAssignments.cancelAtPeriodEnd,
      canceledAt: subscriptionAssignments.canceledAt,
      templateName: subscriptionTemplates.name,
      templateInterval: subscriptionTemplates.billingInterval,
      templateCurrency: subscriptionTemplates.currency,
      templatePriceCents: subscriptionTemplates.priceCents
    })
    .from(subscriptionAssignments)
    .leftJoin(
      subscriptionTemplates,
      eq(subscriptionAssignments.subscriptionTemplateId, subscriptionTemplates.id)
    )
    .where(
      and(
        eq(subscriptionAssignments.targetType, 'team'),
        isNull(subscriptionAssignments.effectiveTo),
        inArray(subscriptionAssignments.targetTeamId, teamIds)
      )
    );

  return rows
    .filter(
      (row): row is typeof row & { targetTeamId: number } =>
        typeof row.targetTeamId === 'number'
    )
    .map((row) => ({
      id: row.id,
      targetTeamId: row.targetTeamId,
      subscriptionTemplateId: row.subscriptionTemplateId,
      paymentProvider: row.paymentProvider,
      providerReferenceId: row.providerReferenceId,
      providerPlanId: row.providerPlanId,
      status: row.status,
      planName: row.planName,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      trialEndsAt: row.trialEndsAt,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      canceledAt: row.canceledAt,
      templateName: row.templateName,
      templateInterval: row.templateInterval,
      templateCurrency: row.templateCurrency,
      templatePriceCents: row.templatePriceCents
    }));
}

export async function getActiveUserSubscriptionAssignment(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const assignments = await getActiveUserSubscriptionAssignmentsByUserIds([userId]);
  return assignments[0] ?? null;
}

export async function getActiveTeamSubscriptionAssignment(teamId: number) {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return null;
  }

  const assignments = await getActiveTeamSubscriptionAssignmentsByTeamIds([teamId]);
  return assignments[0] ?? null;
}

export async function getActiveTeamSubscriptionAssignmentByProviderReferenceId({
  provider,
  referenceId
}: {
  provider: string;
  referenceId: string;
}) {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedReference = referenceId.trim();
  if (!normalizedProvider || !normalizedReference) {
    return null;
  }

  const [row] = await db
    .select({
      targetTeamId: subscriptionAssignments.targetTeamId,
      subscriptionTemplateId: subscriptionAssignments.subscriptionTemplateId,
      paymentProvider: subscriptionAssignments.paymentProvider,
      providerReferenceId: subscriptionAssignments.providerReferenceId,
      providerPlanId: subscriptionAssignments.providerPlanId,
      status: subscriptionAssignments.status,
      planName: subscriptionAssignments.planName
    })
    .from(subscriptionAssignments)
    .where(
      and(
        eq(subscriptionAssignments.targetType, 'team'),
        isNull(subscriptionAssignments.effectiveTo),
        eq(subscriptionAssignments.paymentProvider, normalizedProvider),
        eq(subscriptionAssignments.providerReferenceId, normalizedReference)
      )
    )
    .limit(1);

  if (!row || typeof row.targetTeamId !== 'number') {
    return null;
  }

  return row;
}

export async function getActiveUserSubscriptionAssignmentByProviderReferenceId({
  provider,
  referenceId
}: {
  provider: string;
  referenceId: string;
}) {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedReference = referenceId.trim();
  if (!normalizedProvider || !normalizedReference) {
    return null;
  }

  const [row] = await db
    .select({
      targetUserId: subscriptionAssignments.targetUserId,
      subscriptionTemplateId: subscriptionAssignments.subscriptionTemplateId,
      paymentProvider: subscriptionAssignments.paymentProvider,
      providerReferenceId: subscriptionAssignments.providerReferenceId,
      providerPlanId: subscriptionAssignments.providerPlanId,
      status: subscriptionAssignments.status,
      planName: subscriptionAssignments.planName
    })
    .from(subscriptionAssignments)
    .where(
      and(
        eq(subscriptionAssignments.targetType, 'user'),
        isNull(subscriptionAssignments.effectiveTo),
        eq(subscriptionAssignments.paymentProvider, normalizedProvider),
        eq(subscriptionAssignments.providerReferenceId, normalizedReference)
      )
    )
    .limit(1);

  if (!row || typeof row.targetUserId !== 'number') {
    return null;
  }

  return row;
}

export type DashboardSubscriptionUserSummary = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  subscriptionTemplateId: number | null;
  subscriptionTemplateName: string | null;
  subscriptionTemplateInterval: string | null;
  subscriptionTemplateCurrency: string | null;
  subscriptionTemplatePriceCents: number | null;
};

export type DashboardSubscriptionMembership = {
  teamId: number;
  teamName: string;
  memberRole: string;
  joinedAt: Date;
  paymentProvider: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
  subscriptionTemplateId: number | null;
  subscriptionTemplateName: string | null;
  subscriptionTemplateInterval: string | null;
  subscriptionTemplateCurrency: string | null;
  subscriptionTemplatePriceCents: number | null;
};

export type DashboardSubscriptionOrder = {
  id: number;
  provider: string;
  status: string;
  eventType: string;
  source: string;
  teamId: number | null;
  teamName: string | null;
  subscriptionTemplateId: number | null;
  templateName: string | null;
  paymentMethod: string | null;
  planName: string | null;
  providerPlanId: string | null;
  externalOrderId: string | null;
  externalPaymentId: string | null;
  amount: number | null;
  currency: string | null;
  message: string | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
  scopeType: 'team' | 'user' | 'unknown';
  scopeTeamId: number | null;
  scopeUserId: number | null;
};

export type DashboardSubscriptionManagementData = {
  user: DashboardSubscriptionUserSummary;
  memberships: DashboardSubscriptionMembership[];
  orders: DashboardSubscriptionOrder[];
};

function normalizeDashboardOrderLimit(limit: number | undefined) {
  if (!Number.isInteger(limit) || (limit ?? 0) <= 0) {
    return 250;
  }

  return Math.max(1, Math.min(limit as number, 1000));
}

async function getPaymentOrdersForDashboardUser({
  userId,
  teamIds,
  limit
}: {
  userId: number;
  teamIds: number[];
  limit: number;
}): Promise<DashboardSubscriptionOrder[]> {
  const teamIdSet = new Set(teamIds);

  const [teamOrders, userOrders] = await Promise.all([
    teamIds.length > 0
      ? db
          .select({
            id: paymentOrders.id,
            provider: paymentOrders.provider,
            status: paymentOrders.status,
            eventType: paymentOrders.eventType,
            source: paymentOrders.source,
            teamId: paymentOrders.teamId,
            targetType: paymentOrders.targetType,
            targetTeamId: paymentOrders.targetTeamId,
            targetUserId: paymentOrders.targetUserId,
            teamName: teams.name,
            subscriptionTemplateId: paymentOrders.subscriptionTemplateId,
            templateName: subscriptionTemplates.name,
            paymentMethod: paymentOrders.paymentMethod,
            planName: paymentOrders.planName,
            providerPlanId: paymentOrders.providerPlanId,
            externalOrderId: paymentOrders.externalOrderId,
            externalPaymentId: paymentOrders.externalPaymentId,
            amount: paymentOrders.amount,
            currency: paymentOrders.currency,
            message: paymentOrders.message,
            metadata: paymentOrders.metadata,
            createdAt: paymentOrders.createdAt,
            updatedAt: paymentOrders.updatedAt
          })
          .from(paymentOrders)
          .leftJoin(teams, eq(paymentOrders.teamId, teams.id))
          .leftJoin(
            subscriptionTemplates,
            eq(paymentOrders.subscriptionTemplateId, subscriptionTemplates.id)
          )
          .where(
            and(
              eq(paymentOrders.orderType, 'subscription'),
              or(
                inArray(paymentOrders.teamId, teamIds),
                inArray(paymentOrders.targetTeamId, teamIds)
              )
            )
          )
          .orderBy(desc(paymentOrders.updatedAt), desc(paymentOrders.createdAt))
          .limit(limit)
      : Promise.resolve([]),
    db
      .select({
        id: paymentOrders.id,
        provider: paymentOrders.provider,
        status: paymentOrders.status,
        eventType: paymentOrders.eventType,
        source: paymentOrders.source,
        teamId: paymentOrders.teamId,
        targetType: paymentOrders.targetType,
        targetTeamId: paymentOrders.targetTeamId,
        targetUserId: paymentOrders.targetUserId,
        teamName: teams.name,
        subscriptionTemplateId: paymentOrders.subscriptionTemplateId,
        templateName: subscriptionTemplates.name,
        paymentMethod: paymentOrders.paymentMethod,
        planName: paymentOrders.planName,
        providerPlanId: paymentOrders.providerPlanId,
        externalOrderId: paymentOrders.externalOrderId,
        externalPaymentId: paymentOrders.externalPaymentId,
        amount: paymentOrders.amount,
        currency: paymentOrders.currency,
        message: paymentOrders.message,
        metadata: paymentOrders.metadata,
        createdAt: paymentOrders.createdAt,
        updatedAt: paymentOrders.updatedAt
      })
      .from(paymentOrders)
      .leftJoin(teams, eq(paymentOrders.teamId, teams.id))
      .leftJoin(
        subscriptionTemplates,
        eq(paymentOrders.subscriptionTemplateId, subscriptionTemplates.id)
      )
      .where(
        and(
          eq(paymentOrders.orderType, 'subscription'),
          eq(paymentOrders.targetType, 'user'),
          eq(paymentOrders.targetUserId, userId)
        )
      )
      .orderBy(desc(paymentOrders.updatedAt), desc(paymentOrders.createdAt))
      .limit(limit)
  ]);

  const orderMap = new Map<number, (typeof teamOrders)[number]>();
  for (const order of teamOrders) {
    orderMap.set(order.id, order);
  }
  for (const order of userOrders) {
    orderMap.set(order.id, order);
  }

  const scopedOrders: DashboardSubscriptionOrder[] = [];
  for (const order of orderMap.values()) {
    const hasTeamScope = Boolean(
      (order.targetType === 'team' &&
        order.targetTeamId &&
        teamIdSet.has(order.targetTeamId)) ||
        (order.teamId && teamIdSet.has(order.teamId))
    );
    const hasUserScope =
      order.targetType === 'user' && order.targetUserId === userId;

    if (!hasTeamScope && !hasUserScope) {
      continue;
    }

    scopedOrders.push({
      ...order,
      scopeType: hasTeamScope
        ? 'team'
        : hasUserScope
          ? 'user'
          : 'unknown',
      scopeTeamId: order.targetTeamId ?? order.teamId,
      scopeUserId: order.targetUserId
    });
  }

  return scopedOrders
    .sort((a, b) => {
      const byUpdated = b.updatedAt.getTime() - a.updatedAt.getTime();
      if (byUpdated !== 0) {
        return byUpdated;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit);
}

export async function getCurrentUserSubscriptionManagementData(options?: {
  orderLimit?: number;
}): Promise<DashboardSubscriptionManagementData | null> {
  const currentUser = await getUser();
  if (!currentUser) {
    return null;
  }

  const normalizedOrderLimit = normalizeDashboardOrderLimit(options?.orderLimit);

  const [[userSubscription], memberships] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1),
    db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        memberRole: teamMembers.role,
        joinedAt: teamMembers.joinedAt
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, currentUser.id))
      .orderBy(asc(teams.name), asc(teams.id))
  ]);

  const [userAssignments, teamAssignments] = await Promise.all([
    getActiveUserSubscriptionAssignmentsByUserIds([currentUser.id]),
    getActiveTeamSubscriptionAssignmentsByTeamIds(
      memberships.map((membership) => membership.teamId)
    )
  ]);
  const userAssignment = userAssignments[0];
  const teamAssignmentById = new Map(
    teamAssignments.map((assignment) => [assignment.targetTeamId, assignment])
  );

  const resolvedUserSubscription = userSubscription
    ? {
        ...userSubscription,
        subscriptionTemplateId: userAssignment?.subscriptionTemplateId ?? null,
        subscriptionTemplateName: userAssignment?.templateName ?? null,
        subscriptionTemplateInterval: userAssignment?.templateInterval ?? null,
        subscriptionTemplateCurrency: userAssignment?.templateCurrency ?? null,
        subscriptionTemplatePriceCents:
          userAssignment?.templatePriceCents ?? null
      }
    : null;

  const resolvedMemberships = memberships.map((membership) => {
    const assignment = teamAssignmentById.get(membership.teamId);
    return {
      ...membership,
      paymentProvider: assignment?.paymentProvider ?? null,
      planName: assignment?.planName ?? null,
      subscriptionStatus: assignment?.status ?? null,
      subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null,
      subscriptionTemplateName: assignment?.templateName ?? null,
      subscriptionTemplateInterval: assignment?.templateInterval ?? null,
      subscriptionTemplateCurrency: assignment?.templateCurrency ?? null,
      subscriptionTemplatePriceCents: assignment?.templatePriceCents ?? null
    };
  });

  const teamIds = resolvedMemberships.map((membership) => membership.teamId);
  const orders = await getPaymentOrdersForDashboardUser({
    userId: currentUser.id,
    teamIds,
    limit: normalizedOrderLimit
  });

  return {
    user: {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role,
      subscriptionTemplateId:
        resolvedUserSubscription?.subscriptionTemplateId ?? null,
      subscriptionTemplateName:
        resolvedUserSubscription?.subscriptionTemplateName ?? null,
      subscriptionTemplateInterval:
        resolvedUserSubscription?.subscriptionTemplateInterval ?? null,
      subscriptionTemplateCurrency:
        resolvedUserSubscription?.subscriptionTemplateCurrency ?? null,
      subscriptionTemplatePriceCents:
        resolvedUserSubscription?.subscriptionTemplatePriceCents ?? null
    },
    memberships: resolvedMemberships,
    orders
  };
}

export async function getSubscriptionTemplateById(
  templateId: number,
  options?: {
    publicationStatus?: SubscriptionTemplatePublicationStatus;
  }
) {
  const conditions = [eq(subscriptionTemplates.id, templateId)];

  if (options?.publicationStatus) {
    conditions.push(
      eq(subscriptionTemplates.publicationStatus, options.publicationStatus)
    );
  }

  const result = await db
    .select()
    .from(subscriptionTemplates)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getSelfServiceSubscriptionTemplateById(templateId: number) {
  const template = await getSubscriptionTemplateById(templateId, {
    publicationStatus: 'published'
  });

  if (!template || !isSubscriptionTemplateSelfServiceEligible(template)) {
    return null;
  }

  return template;
}

function mapSubscriptionTemplateFeatures(
  features: Array<typeof subscriptionTemplateFeatures.$inferSelect>,
  templateId: number
) {
  return features
    .filter((feature) => feature.templateId === templateId)
    .map((feature) => ({
      id: feature.id,
      key: feature.featureKey,
      label: feature.featureLabel || feature.featureKey,
      valueType: feature.valueType,
      value: feature.featureValue,
      valueLabel: feature.valueLabel,
      isPublic: Boolean(feature.isPublic)
    }));
}

export async function getSubscriptionTemplateWithFeaturesById(templateId: number) {
  const template = await getSubscriptionTemplateById(templateId);
  if (!template) {
    return null;
  }

  const features = await db
    .select()
    .from(subscriptionTemplateFeatures)
    .where(eq(subscriptionTemplateFeatures.templateId, templateId))
    .orderBy(desc(subscriptionTemplateFeatures.createdAt));

  return {
    ...template,
    features: mapSubscriptionTemplateFeatures(features, template.id)
  };
}

export type SubscriptionTemplateFeatureEntry = {
  key: string;
  value: string | null;
};

export async function getSubscriptionTemplateFeatureEntries(templateId: number) {
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return [] as SubscriptionTemplateFeatureEntry[];
  }

  return db
    .select({
      key: subscriptionTemplateFeatures.featureKey,
      value: subscriptionTemplateFeatures.featureValue
    })
    .from(subscriptionTemplateFeatures)
    .where(eq(subscriptionTemplateFeatures.templateId, templateId))
    .orderBy(subscriptionTemplateFeatures.featureKey);
}

export async function getSubscriptionTemplateFeatureEntriesByScope({
  templateId,
  targetScope
}: {
  templateId: number;
  targetScope: SubscriptionTargetScope;
}) {
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return [] as SubscriptionTemplateFeatureEntry[];
  }

  return db
    .select({
      key: subscriptionTemplateFeatures.featureKey,
      value: subscriptionTemplateFeatures.featureValue
    })
    .from(subscriptionTemplateFeatures)
    .innerJoin(
      subscriptionTemplates,
      eq(subscriptionTemplates.id, subscriptionTemplateFeatures.templateId)
    )
    .where(
      and(
        eq(subscriptionTemplateFeatures.templateId, templateId),
        eq(subscriptionTemplates.targetScope, targetScope)
      )
    )
    .orderBy(subscriptionTemplateFeatures.featureKey);
}

export async function getCurrentOrganizationSubscriptionTemplateFeatureEntries() {
  const team = await getTeamForUser();
  if (!team) {
    return [] as SubscriptionTemplateFeatureEntry[];
  }

  const assignments = await getActiveTeamSubscriptionAssignmentsByTeamIds([team.id]);
  const subscriptionTemplateId =
    assignments[0]?.subscriptionTemplateId ??
    FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;

  return getSubscriptionTemplateFeatureEntriesByScope({
    templateId: subscriptionTemplateId,
    targetScope: 'organization'
  });
}

export async function getCurrentUserSubscriptionTemplateFeatureEntries() {
  const user = await getUser();
  if (!user) {
    return [] as SubscriptionTemplateFeatureEntry[];
  }

  const assignments = await getActiveUserSubscriptionAssignmentsByUserIds([
    user.id
  ]);
  const subscriptionTemplateId =
    assignments[0]?.subscriptionTemplateId ?? FREE_USER_SUBSCRIPTION_TEMPLATE_ID;

  return getSubscriptionTemplateFeatureEntriesByScope({
    templateId: subscriptionTemplateId,
    targetScope: 'user'
  });
}

export async function getCurrentSubscriptionTemplateFeatureEntriesByScope(
  targetScope: SubscriptionTargetScope
) {
  if (targetScope === 'user') {
    return getCurrentUserSubscriptionTemplateFeatureEntries();
  }

  return getCurrentOrganizationSubscriptionTemplateFeatureEntries();
}

export async function getAllSubscriptionTemplatesForPricing() {
  const templates = await db
    .select()
    .from(subscriptionTemplates)
    .where(eq(subscriptionTemplates.publicationStatus, 'published'));

  const visibleTemplates = templates.filter((template) =>
    isSubscriptionTemplateSelfServiceEligible(template)
  );

  if (visibleTemplates.length === 0) {
    return [];
  }

  const features = await db
    .select()
    .from(subscriptionTemplateFeatures)
    .where(
      inArray(
        subscriptionTemplateFeatures.templateId,
        visibleTemplates.map((template) => template.id)
      )
    )
    .orderBy(desc(subscriptionTemplateFeatures.createdAt));

  return visibleTemplates
    .map((template) => ({
      ...template,
      features: mapSubscriptionTemplateFeatures(features, template.id)
    }))
    .sort((a, b) => {
      const byScopeWeight =
        (SUBSCRIPTION_TARGET_SCOPE_SORT_WEIGHT[
          a.targetScope as SubscriptionTargetScope
        ] ?? 999) -
        (SUBSCRIPTION_TARGET_SCOPE_SORT_WEIGHT[
          b.targetScope as SubscriptionTargetScope
        ] ?? 999);

      if (byScopeWeight !== 0) {
        return byScopeWeight;
      }

      const byName = a.name.localeCompare(b.name);
      if (byName !== 0) {
        return byName;
      }

      const byIntervalWeight =
        (SUBSCRIPTION_BILLING_INTERVAL_SORT_WEIGHT[
          a.billingInterval as SubscriptionBillingInterval
        ] ?? 999) -
        (SUBSCRIPTION_BILLING_INTERVAL_SORT_WEIGHT[
          b.billingInterval as SubscriptionBillingInterval
        ] ?? 999);

      if (byIntervalWeight !== 0) {
        return byIntervalWeight;
      }

      return a.priceCents - b.priceCents;
    });
}

export async function getPaymentProviderConfigValue(
  provider: string,
  configKey: string
) {
  const namespace = mapLegacyProviderToNamespace(provider);
  const [appResult] = await db
    .select({
      configValue: appConfigs.configValue
    })
    .from(appConfigs)
    .where(
      and(eq(appConfigs.namespace, namespace), eq(appConfigs.configKey, configKey))
    )
    .limit(1);

  return appResult?.configValue || null;
}

