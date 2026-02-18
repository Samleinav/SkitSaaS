import {
  aliasedTable,
  asc,
  desc,
  and,
  eq,
  gte,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  inArray
} from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  authSessions,
  appConfigs,
  emailLogs,
  paymentLogs,
  paymentOrders,
  paymentTransactions,
  subscriptionAssignments,
  sysActivityLogs,
  subscriptionTemplateFeatures,
  subscriptionTemplates,
  teamMembers,
  teams,
  users
} from './schema';
import { cookies } from 'next/headers';
import {
  isPersistedSessionActive,
  isSessionExpired,
  tryVerifyToken
} from '@/lib/auth/session';
import {
  mapLegacyProviderToNamespace,
  mapNamespaceToLegacyProvider
} from '@/lib/config/app-config';
import {
  SUBSCRIPTION_BILLING_INTERVAL_SORT_WEIGHT,
  type SubscriptionBillingInterval
} from '@/lib/payments/subscription-intervals';
import {
  SUBSCRIPTION_TARGET_SCOPE_SORT_WEIGHT,
  type SubscriptionTargetScope
} from '@/lib/payments/subscription-scopes';
import { EVENT_HOOKS } from '@/lib/events/catalog';

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
      !isPersistedSessionActive(activeSession ?? null, {
        tokenJti: sessionData.jti
      })
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

export async function getAllUsersForAdmin() {
  const usersForAdmin = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      statusReason: users.statusReason,
      organizationsCount:
        sql<number>`cast(count(distinct ${teamMembers.teamId}) as int)`,
      ownedOrganizationsCount: sql<number>`cast(count(distinct case when ${teamMembers.role} = 'owner' then ${teamMembers.teamId} end) as int)`,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt
    })
    .from(users)
    .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  const assignments = await getActiveUserSubscriptionAssignmentsByUserIds(
    usersForAdmin.map((row) => row.id)
  );
  const assignmentByUserId = new Map(
    assignments.map((assignment) => [assignment.targetUserId, assignment])
  );

  const resolvedUsers = usersForAdmin.map((row) => {
    const assignment = assignmentByUserId.get(row.id);
    return {
      ...row,
      subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null,
      subscriptionTemplateName: assignment?.templateName ?? null
    };
  });

  return resolvedUsers;
}

export async function getAdminSubscriptionTargetIdsWithOrders() {
  const orders = await db
    .select({
      teamId: paymentOrders.teamId,
      targetType: paymentOrders.targetType,
      targetTeamId: paymentOrders.targetTeamId,
      targetUserId: paymentOrders.targetUserId
    })
    .from(paymentOrders)
    .where(
      and(
        eq(paymentOrders.orderType, 'subscription'),
        isNotNull(paymentOrders.subscriptionTemplateId),
        inArray(paymentOrders.provider, ['stripe', 'paypal']),
        inArray(paymentOrders.source, ['checkout', 'webhook', 'dashboard'])
      )
    );

  const teamIds = new Set<number>();
  const userIds = new Set<number>();

  for (const order of orders) {
    if (order.targetType === 'team' && order.targetTeamId) {
      teamIds.add(order.targetTeamId);
      continue;
    }

    if (order.targetType === 'user' && order.targetUserId) {
      userIds.add(order.targetUserId);
      continue;
    }
  }

  return {
    teamIds: Array.from(teamIds),
    userIds: Array.from(userIds)
  };
}

export async function getUserSubscriptionTemplatesForAdmin() {
  return db
    .select({
      id: subscriptionTemplates.id,
      name: subscriptionTemplates.name,
      billingInterval: subscriptionTemplates.billingInterval,
      priceCents: subscriptionTemplates.priceCents,
      currency: subscriptionTemplates.currency
    })
    .from(subscriptionTemplates)
    .where(eq(subscriptionTemplates.targetScope, 'user'))
    .orderBy(
      asc(subscriptionTemplates.name),
      asc(subscriptionTemplates.billingInterval)
    );
}

export async function getAdminUserById(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      statusReason: users.statusReason,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
      organizationsCount:
        sql<number>`cast(count(distinct ${teamMembers.teamId}) as int)`,
      ownedOrganizationsCount: sql<number>`cast(count(distinct case when ${teamMembers.role} = 'owner' then ${teamMembers.teamId} end) as int)`
    })
    .from(users)
    .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
    .where(eq(users.id, userId))
    .groupBy(users.id)
    .limit(1);

  if (!result) {
    return null;
  }

  const assignments = await getActiveUserSubscriptionAssignmentsByUserIds([userId]);
  const assignment = assignments[0];

  return {
    ...result,
    subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null,
    subscriptionTemplateName: assignment?.templateName ?? null,
    subscriptionTemplateInterval: assignment?.templateInterval ?? null,
    subscriptionTemplateCurrency: assignment?.templateCurrency ?? null,
    subscriptionTemplatePriceCents: assignment?.templatePriceCents ?? null
  };
}

export async function getAdminUserOrganizations(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return [];
  }

  const organizations = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      memberRole: teamMembers.role,
      joinedAt: teamMembers.joinedAt
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .orderBy(asc(teams.name), asc(teams.id));

  const assignments = await getActiveTeamSubscriptionAssignmentsByTeamIds(
    organizations.map((row) => row.teamId)
  );
  const assignmentByTeamId = new Map(
    assignments.map((assignment) => [assignment.targetTeamId, assignment])
  );

  const resolvedOrganizations = organizations.map((row) => {
    const assignment = assignmentByTeamId.get(row.teamId);
    return {
      ...row,
      paymentProvider: assignment?.paymentProvider ?? null,
      planName: assignment?.planName ?? null,
      subscriptionStatus: assignment?.status ?? null,
      subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null,
      subscriptionTemplateName: assignment?.templateName ?? null
    };
  });

  return resolvedOrganizations;
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

export async function getAdminTransferCandidatesForUser(excludeUserId: number) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email
    })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        eq(users.accountStatus, 'active'),
        ne(users.id, excludeUserId)
      )
    )
    .orderBy(asc(users.email));
}

export async function getAllTeamsForAdmin() {
  const teamsForAdmin = await db
    .select({
      id: teams.id,
      name: teams.name,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      stripeCustomerId: teams.stripeCustomerId,
      stripeProductId: teams.stripeProductId,
      membersCount: sql<number>`cast(count(${teamMembers.id}) as int)`
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .groupBy(teams.id)
    .orderBy(desc(teams.createdAt));

  const assignments = await getActiveTeamSubscriptionAssignmentsByTeamIds(
    teamsForAdmin.map((row) => row.id)
  );
  const assignmentByTeamId = new Map(
    assignments.map((assignment) => [assignment.targetTeamId, assignment])
  );

  const resolvedTeams = teamsForAdmin.map((row) => {
    const assignment = assignmentByTeamId.get(row.id);
    return {
      ...row,
      paymentProvider: assignment?.paymentProvider ?? null,
      providerReferenceId: assignment?.providerReferenceId ?? null,
      providerPlanId: assignment?.providerPlanId ?? null,
      planName: assignment?.planName ?? null,
      subscriptionStatus: assignment?.status ?? null,
      subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null
    };
  });

  return resolvedTeams;
}

export async function getAdminTeamById(teamId: number) {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return null;
  }

  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      stripeCustomerId: teams.stripeCustomerId,
      stripeProductId: teams.stripeProductId,
      membersCount: sql<number>`cast(count(${teamMembers.id}) as int)`
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(eq(teams.id, teamId))
    .groupBy(teams.id)
    .limit(1);

  if (!team) {
    return null;
  }

  const assignments = await getActiveTeamSubscriptionAssignmentsByTeamIds([teamId]);
  const assignment = assignments[0];

  return {
    ...team,
    paymentProvider: assignment?.paymentProvider ?? null,
    providerReferenceId: assignment?.providerReferenceId ?? null,
    providerPlanId: assignment?.providerPlanId ?? null,
    planName: assignment?.planName ?? null,
    subscriptionStatus: assignment?.status ?? null,
    subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null,
    subscriptionTemplateName: assignment?.templateName ?? null,
    subscriptionCurrentPeriodStart: assignment?.currentPeriodStart ?? null,
    subscriptionCurrentPeriodEnd: assignment?.currentPeriodEnd ?? null,
    subscriptionTrialEndsAt: assignment?.trialEndsAt ?? null,
    subscriptionCancelAtPeriodEnd: assignment?.cancelAtPeriodEnd ?? null,
    subscriptionCanceledAt: assignment?.canceledAt ?? null
  };
}

export async function getSubscriptionTemplateById(templateId: number) {
  const result = await db
    .select()
    .from(subscriptionTemplates)
    .where(eq(subscriptionTemplates.id, templateId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
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
  const subscriptionTemplateId = assignments[0]?.subscriptionTemplateId ?? null;

  if (!subscriptionTemplateId) {
    return [] as SubscriptionTemplateFeatureEntry[];
  }

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
  const subscriptionTemplateId = assignments[0]?.subscriptionTemplateId ?? null;

  if (!subscriptionTemplateId) {
    return [] as SubscriptionTemplateFeatureEntry[];
  }

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

export async function getAllSubscriptionTemplatesForAdmin() {
  const templates = await db
    .select()
    .from(subscriptionTemplates)
    .orderBy(desc(subscriptionTemplates.createdAt));

  if (templates.length === 0) {
    return [];
  }

  const features = await db
    .select()
    .from(subscriptionTemplateFeatures)
    .where(
      inArray(
        subscriptionTemplateFeatures.templateId,
        templates.map((template) => template.id)
      )
    )
    .orderBy(desc(subscriptionTemplateFeatures.createdAt));

  return templates.map((template) => ({
    ...template,
    features: mapSubscriptionTemplateFeatures(features, template.id)
  }));
}

export async function getAllSubscriptionTemplatesForPricing() {
  const templates = await db.select().from(subscriptionTemplates);

  if (templates.length === 0) {
    return [];
  }

  const features = await db
    .select()
    .from(subscriptionTemplateFeatures)
    .where(
      inArray(
        subscriptionTemplateFeatures.templateId,
        templates.map((template) => template.id)
      )
    )
    .orderBy(desc(subscriptionTemplateFeatures.createdAt));

  return templates
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

export async function getPaymentProviderConfigsForAdmin() {
  const appRows = await db
    .select({
      namespace: appConfigs.namespace,
      configKey: appConfigs.configKey,
      configValue: appConfigs.configValue
    })
    .from(appConfigs)
    .orderBy(appConfigs.namespace, appConfigs.configKey);

  const byProviderAndKey = new Map<
    string,
    { provider: string; configKey: string; configValue: string }
  >();

  for (const row of appRows) {
    const provider = mapNamespaceToLegacyProvider(row.namespace);
    const compositeKey = `${provider}:${row.configKey}`;
    byProviderAndKey.set(compositeKey, {
      provider,
      configKey: row.configKey,
      configValue: row.configValue
    });
  }

  const rows = Array.from(byProviderAndKey.values()).sort((a, b) => {
    const byProvider = a.provider.localeCompare(b.provider);
    if (byProvider !== 0) {
      return byProvider;
    }

    return a.configKey.localeCompare(b.configKey);
  });

  return rows;
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

export async function getPaymentLogsForAdmin(limit: number = 200) {
  return db
    .select({
      id: paymentLogs.id,
      provider: paymentLogs.provider,
      eventType: paymentLogs.eventType,
      status: paymentLogs.status,
      teamId: paymentLogs.teamId,
      teamName: teams.name,
      externalId: paymentLogs.externalId,
      amount: paymentLogs.amount,
      currency: paymentLogs.currency,
      message: paymentLogs.message,
      payload: paymentLogs.payload,
      createdAt: paymentLogs.createdAt
    })
    .from(paymentLogs)
    .leftJoin(teams, eq(paymentLogs.teamId, teams.id))
    .orderBy(desc(paymentLogs.createdAt))
    .limit(Math.max(1, Math.min(limit, 500)));
}

export async function getEmailLogsForAdmin(limit: number = 300) {
  return db
    .select({
      id: emailLogs.id,
      provider: emailLogs.provider,
      eventType: emailLogs.eventType,
      status: emailLogs.status,
      recipientEmail: emailLogs.recipientEmail,
      recipientUserId: emailLogs.recipientUserId,
      recipientUserName: users.name,
      subject: emailLogs.subject,
      source: emailLogs.source,
      externalMessageId: emailLogs.externalMessageId,
      message: emailLogs.message,
      metadata: emailLogs.metadata,
      createdAt: emailLogs.createdAt,
      sentAt: emailLogs.sentAt
    })
    .from(emailLogs)
    .leftJoin(users, eq(emailLogs.recipientUserId, users.id))
    .orderBy(desc(emailLogs.createdAt))
    .limit(Math.max(1, Math.min(limit, 1000)));
}

export async function getPaymentOrdersForAdmin(limit: number = 300) {
  return db
    .select({
      id: paymentOrders.id,
      provider: paymentOrders.provider,
      status: paymentOrders.status,
      eventType: paymentOrders.eventType,
      source: paymentOrders.source,
      teamId: paymentOrders.teamId,
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
    .orderBy(desc(paymentOrders.updatedAt), desc(paymentOrders.createdAt))
    .limit(Math.max(1, Math.min(limit, 1000)));
}

export async function getPaymentTransactionsForAdmin(limit: number = 300) {
  return db
    .select({
      id: paymentTransactions.id,
      orderId: paymentTransactions.orderId,
      provider: paymentTransactions.provider,
      transactionType: paymentTransactions.transactionType,
      status: paymentTransactions.status,
      amount: paymentTransactions.amount,
      currency: paymentTransactions.currency,
      externalTransactionId: paymentTransactions.externalTransactionId,
      externalInvoiceId: paymentTransactions.externalInvoiceId,
      providerEventId: paymentTransactions.providerEventId,
      occurredAt: paymentTransactions.occurredAt,
      createdAt: paymentTransactions.createdAt,
      updatedAt: paymentTransactions.updatedAt,
      orderSource: paymentOrders.source,
      orderEventType: paymentOrders.eventType,
      orderTeamId: paymentOrders.teamId,
      teamName: teams.name,
      subscriptionTemplateId: paymentOrders.subscriptionTemplateId,
      templateName: subscriptionTemplates.name,
      paymentMethod: paymentOrders.paymentMethod,
      planName: paymentOrders.planName,
      providerPlanId: paymentOrders.providerPlanId,
      orderExternalOrderId: paymentOrders.externalOrderId,
      orderExternalPaymentId: paymentOrders.externalPaymentId,
      orderMessage: paymentOrders.message
    })
    .from(paymentTransactions)
    .leftJoin(paymentOrders, eq(paymentTransactions.orderId, paymentOrders.id))
    .leftJoin(teams, eq(paymentOrders.teamId, teams.id))
    .leftJoin(
      subscriptionTemplates,
      eq(paymentOrders.subscriptionTemplateId, subscriptionTemplates.id)
    )
    .where(
      and(
        inArray(paymentTransactions.provider, ['stripe', 'paypal']),
        eq(paymentTransactions.transactionType, 'sale')
      )
    )
    .orderBy(
      desc(paymentTransactions.occurredAt),
      desc(paymentTransactions.createdAt)
    )
    .limit(Math.max(1, Math.min(limit, 1000)));
}

export async function getPaymentOrderForAdminById(orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return null;
  }

  const [result] = await db
    .select({
      id: paymentOrders.id,
      provider: paymentOrders.provider,
      status: paymentOrders.status,
      eventType: paymentOrders.eventType,
      source: paymentOrders.source,
      teamId: paymentOrders.teamId,
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
    .where(eq(paymentOrders.id, orderId))
    .limit(1);

  return result || null;
}

export async function getPaymentOrderFormOptionsForAdmin() {
  const [teamOptions, templateOptions, userOptions] = await Promise.all([
    db
      .select({
        id: teams.id,
        name: teams.name
      })
      .from(teams)
      .orderBy(asc(teams.name)),
    db
      .select({
        id: subscriptionTemplates.id,
        name: subscriptionTemplates.name,
        targetScope: subscriptionTemplates.targetScope,
        billingInterval: subscriptionTemplates.billingInterval,
        priceCents: subscriptionTemplates.priceCents,
        currency: subscriptionTemplates.currency
      })
      .from(subscriptionTemplates)
      .orderBy(asc(subscriptionTemplates.name), asc(subscriptionTemplates.id)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          eq(users.accountStatus, 'active')
        )
      )
      .orderBy(asc(users.email))
  ]);

  return {
    teams: teamOptions,
    templates: templateOptions,
    users: userOptions
  };
}

export async function getSystemActivityLogsForAdmin(limit: number = 200) {
  return db
    .select({
      id: sysActivityLogs.id,
      eventType: sysActivityLogs.eventType,
      eventCategory: sysActivityLogs.eventCategory,
      action: sysActivityLogs.action,
      status: sysActivityLogs.status,
      actorUserId: sysActivityLogs.actorUserId,
      actorEmail: sysActivityLogs.actorEmail,
      actorRole: sysActivityLogs.actorRole,
      targetUserId: sysActivityLogs.targetUserId,
      teamId: sysActivityLogs.teamId,
      teamName: teams.name,
      entityType: sysActivityLogs.entityType,
      entityId: sysActivityLogs.entityId,
      source: sysActivityLogs.source,
      ipAddress: sysActivityLogs.ipAddress,
      requestId: sysActivityLogs.requestId,
      message: sysActivityLogs.message,
      metadata: sysActivityLogs.metadata,
      createdAt: sysActivityLogs.createdAt
    })
    .from(sysActivityLogs)
    .leftJoin(teams, eq(sysActivityLogs.teamId, teams.id))
    .orderBy(desc(sysActivityLogs.createdAt))
    .limit(Math.max(1, Math.min(limit, 1000)));
}

export type AdminDashboardSummary = {
  totalUsers: number;
  totalTeams: number;
  activeSubscriptions: number;
  issueSubscriptions: number;
  pendingOrders: number;
  failedOrders: number;
};

export type AdminDashboardMonthlySeriesPoint = {
  date: string;
  users: number;
  subscriptions: number;
  sales: number;
};

function toDateBucketKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

const SUBSCRIPTION_ACTIVITY_EVENT_TYPES: string[] = [
  EVENT_HOOKS.subscriptionAssignmentActivated,
  EVENT_HOOKS.subscriptionAssignmentSuspended,
  EVENT_HOOKS.subscriptionAssignmentCanceled
];

function getAdminOperationalPaymentOrderWhereClause() {
  return and(
    sql`coalesce(${paymentOrders.eventType}, '') not like 'subscription.template.%'`,
    sql`lower(coalesce(${paymentOrders.message}, '')) not like 'paypal webhook event ignored.%'`
  );
}

function getEventBusEventId(metadata: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata) as { eventId?: unknown };
    return typeof parsed.eventId === 'string' && parsed.eventId.trim()
      ? parsed.eventId
      : null;
  } catch {
    return null;
  }
}

function dedupeSubscriptionActivityDates(
  rows: Array<{ createdAt: Date; metadata: string | null }>
) {
  const eventIdToCreatedAt = new Map<string, Date>();
  const fallbackRows: Date[] = [];

  for (const row of rows) {
    const eventId = getEventBusEventId(row.metadata);
    if (!eventId) {
      fallbackRows.push(row.createdAt);
      continue;
    }

    const previous = eventIdToCreatedAt.get(eventId);
    if (!previous || row.createdAt < previous) {
      eventIdToCreatedAt.set(eventId, row.createdAt);
    }
  }

  return [...eventIdToCreatedAt.values(), ...fallbackRows];
}

export async function getAdminDashboardMonthlySeries(
  days: number = 30
): Promise<AdminDashboardMonthlySeriesPoint[]> {
  const safeDays = Math.max(7, Math.min(days, 90));
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const [userRows, subscriptionRows, salesRows] = await Promise.all([
    db
      .select({
        createdAt: users.createdAt
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          gte(users.createdAt, startDate)
        )
      ),
    db
      .select({
        createdAt: sysActivityLogs.createdAt,
        metadata: sysActivityLogs.metadata
      })
      .from(sysActivityLogs)
      .where(
        and(
          gte(sysActivityLogs.createdAt, startDate),
          eq(sysActivityLogs.eventCategory, 'event_bus'),
          inArray(sysActivityLogs.eventType, SUBSCRIPTION_ACTIVITY_EVENT_TYPES),
          inArray(sysActivityLogs.action, ['emit', 'queue'])
        )
      ),
    db
      .select({
        createdAt: paymentOrders.createdAt
      })
      .from(paymentOrders)
      .where(
        and(
          gte(paymentOrders.createdAt, startDate),
          sql`lower(coalesce(${paymentOrders.status}, '')) = 'received'`,
          sql`coalesce(${paymentOrders.amount}, 0) > 0`,
          getAdminOperationalPaymentOrderWhereClause()
        )
      )
  ]);

  const buckets = new Map<
    string,
    { users: number; subscriptions: number; sales: number }
  >();

  for (let index = 0; index < safeDays; index += 1) {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + index);
    buckets.set(toDateBucketKey(nextDate), {
      users: 0,
      subscriptions: 0,
      sales: 0
    });
  }

  for (const row of userRows) {
    const bucket = buckets.get(toDateBucketKey(row.createdAt));
    if (!bucket) {
      continue;
    }

    bucket.users += 1;
  }

  const dedupedSubscriptionActivityDates =
    dedupeSubscriptionActivityDates(subscriptionRows);

  for (const createdAt of dedupedSubscriptionActivityDates) {
    const bucket = buckets.get(toDateBucketKey(createdAt));
    if (!bucket) {
      continue;
    }

    bucket.subscriptions += 1;
  }

  for (const row of salesRows) {
    const bucket = buckets.get(toDateBucketKey(row.createdAt));
    if (!bucket) {
      continue;
    }

    bucket.sales += 1;
  }

  return Array.from(buckets.entries()).map(([date, values]) => ({
    date,
    users: values.users,
    subscriptions: values.subscriptions,
    sales: values.sales
  }));
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const [usersSummary, teamsSummary, subscriptionSummary, ordersSummary] =
    await Promise.all([
      db
        .select({
          totalUsers: sql<number>`cast(count(*) as int)`
        })
        .from(users)
        .where(isNull(users.deletedAt))
        .then((rows) => rows[0]),
      db
        .select({
          totalTeams: sql<number>`cast(count(*) as int)`
        })
        .from(teams)
        .then((rows) => rows[0]),
      db
        .select({
          activeSubscriptions:
            sql<number>`cast(count(case when ${subscriptionAssignments.status} = 'active' then 1 end) as int)`,
          issueSubscriptions:
            sql<number>`cast(count(case when ${subscriptionAssignments.status} in ('unpaid', 'canceled') then 1 end) as int)`
        })
        .from(subscriptionAssignments)
        .where(
          and(
            eq(subscriptionAssignments.targetType, 'team'),
            isNull(subscriptionAssignments.effectiveTo)
          )
        )
        .then((rows) => rows[0]),
      db
        .select({
          pendingOrders:
            sql<number>`cast(count(case when lower(coalesce(${paymentOrders.status}, '')) = 'pending' then 1 end) as int)`,
          failedOrders:
            sql<number>`cast(count(case when lower(coalesce(${paymentOrders.status}, '')) = 'failed' then 1 end) as int)`
        })
        .from(paymentOrders)
        .where(getAdminOperationalPaymentOrderWhereClause())
        .then((rows) => rows[0])
    ]);

  return {
    totalUsers: usersSummary?.totalUsers ?? 0,
    totalTeams: teamsSummary?.totalTeams ?? 0,
    activeSubscriptions: subscriptionSummary?.activeSubscriptions ?? 0,
    issueSubscriptions: subscriptionSummary?.issueSubscriptions ?? 0,
    pendingOrders: ordersSummary?.pendingOrders ?? 0,
    failedOrders: ordersSummary?.failedOrders ?? 0
  };
}
