/**
 * Admin-only database queries.
 *
 * All functions here use `adminDb` — a Drizzle client connected with the
 * `saas_admin` Postgres role that bypasses RLS and has access to every table.
 *
 * NEVER import this file from dashboard/, frontend, or lib/ shared code.
 * It is only for app/(dashboard)/admin/ and app/(login)/ (auth flow).
 */
import {
  asc,
  desc,
  and,
  eq,
  gte,
  ilike,
  like,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  inArray
} from 'drizzle-orm';
import { adminDb } from './drizzle';
import {
  appConfigs,
  appModules,
  checkoutPaymentAttemptLogs,
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
import {
  mapLegacyProviderToNamespace,
  mapNamespaceToLegacyProvider
} from '@/lib/config/app-config';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  isSubscriptionTemplateVisibleInAdminCatalog,
  type SubscriptionTemplatePublicationStatus
} from '@/lib/payments/subscription-default-templates';

// ─── Internal types ────────────────────────────────────────────────────────────

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

export type AdminSystemActivityLogQuery = {
  limit?: number;
  eventCategory?: string | null;
  status?: string | null;
  requestId?: string | null;
  actorUserId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  search?: string | null;
};

export type AdminSystemActivityLogRecord = {
  id: number;
  eventType: string;
  eventCategory: string;
  action: string;
  status: string;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetUserId: number | null;
  teamId: number | null;
  teamName: string | null;
  entityType: string | null;
  entityId: string | null;
  source: string | null;
  ipAddress: string | null;
  requestId: string | null;
  message: string | null;
  metadata: string | null;
  createdAt: Date;
};

function normalizeAdminSystemActivityLogQuery(
  optionsOrLimit: number | AdminSystemActivityLogQuery | undefined
) {
  if (typeof optionsOrLimit === 'number') {
    return {
      limit: Math.max(1, Math.min(optionsOrLimit, 1000))
    } satisfies Required<Pick<AdminSystemActivityLogQuery, 'limit'>> &
      Omit<AdminSystemActivityLogQuery, 'limit'>;
  }

  const options = optionsOrLimit ?? {};
  const limit =
    typeof options.limit === 'number'
      ? Math.max(1, Math.min(options.limit, 1000))
      : 200;

  const normalizeText = (value: string | null | undefined) => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  };

  return {
    limit,
    eventCategory: normalizeText(options.eventCategory),
    status: normalizeText(options.status),
    requestId: normalizeText(options.requestId),
    actorUserId:
      typeof options.actorUserId === 'number' &&
      Number.isInteger(options.actorUserId) &&
      options.actorUserId > 0
        ? options.actorUserId
        : null,
    entityType: normalizeText(options.entityType),
    entityId: normalizeText(options.entityId),
    search: normalizeText(options.search)
  };
}

// ─── Internal helpers (use adminDb) ────────────────────────────────────────────

async function getActiveUserSubscriptionAssignmentsByUserIds(
  userIds: number[]
): Promise<ActiveUserSubscriptionAssignment[]> {
  if (userIds.length === 0) return [];

  const rows = await adminDb
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

async function getActiveTeamSubscriptionAssignmentsByTeamIds(
  teamIds: number[]
): Promise<ActiveTeamSubscriptionAssignment[]> {
  if (teamIds.length === 0) return [];

  const rows = await adminDb
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

function mapSubscriptionTemplateFeatures(
  features: Array<typeof subscriptionTemplateFeatures.$inferSelect>,
  templateId: number
) {
  return features
    .filter((f) => f.templateId === templateId)
    .map((f) => ({
      id: f.id,
      key: f.featureKey,
      label: f.featureLabel || f.featureKey,
      valueType: f.valueType,
      value: f.featureValue,
      valueLabel: f.valueLabel,
      isPublic: Boolean(f.isPublic),
      displayOrder: f.displayOrder
    }));
}

// ─── Dashboard analytics helpers ──────────────────────────────────────────────

function toDateBucketKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getAdminOperationalPaymentOrderWhereClause() {
  return and(
    sql`coalesce(${paymentOrders.eventType}, '') not like 'subscription.template.%'`,
    sql`lower(coalesce(${paymentOrders.message}, '')) not like 'paypal webhook event ignored.%'`
  );
}

function getEventBusEventId(metadata: string | null): string | null {
  if (!metadata) return null;
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
): Date[] {
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

// ─── Exported admin queries ────────────────────────────────────────────────────

export async function getAllUsersForAdmin() {
  const usersForAdmin = await adminDb
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      statusReason: users.statusReason,
      organizationsCount:
        sql<number>`cast(count(distinct ${teamMembers.teamId}) as int)`,
      ownedOrganizationsCount:
        sql<number>`cast(count(distinct case when ${teamMembers.role} = 'owner' then ${teamMembers.teamId} end) as int)`,
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
    assignments.map((a) => [a.targetUserId, a])
  );

  return usersForAdmin.map((row) => {
    const a = assignmentByUserId.get(row.id);
    return {
      ...row,
      subscriptionTemplateId: a?.subscriptionTemplateId ?? null,
      subscriptionTemplateName: a?.templateName ?? null,
      subscriptionTemplateInterval: a?.templateInterval ?? null,
      subscriptionTemplateCurrency: a?.templateCurrency ?? null,
      subscriptionTemplatePriceCents: a?.templatePriceCents ?? null,
      subscriptionStatus: a?.status ?? null,
      paymentProvider: a?.paymentProvider ?? null,
      providerReferenceId: a?.providerReferenceId ?? null,
      providerPlanId: a?.providerPlanId ?? null,
      subscriptionCurrentPeriodStart: a?.currentPeriodStart ?? null,
      subscriptionCurrentPeriodEnd: a?.currentPeriodEnd ?? null,
      subscriptionTrialEndsAt: a?.trialEndsAt ?? null,
      subscriptionCancelAtPeriodEnd: a?.cancelAtPeriodEnd ?? null,
      subscriptionCanceledAt: a?.canceledAt ?? null
    };
  });
}

export async function getAdminSubscriptionTargetIdsWithOrders() {
  const orders = await adminDb
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
    } else if (order.targetType === 'user' && order.targetUserId) {
      userIds.add(order.targetUserId);
    }
  }

  return { teamIds: Array.from(teamIds), userIds: Array.from(userIds) };
}

export async function getUserSubscriptionTemplatesForAdmin(
  options: Pick<AdminSubscriptionTemplateQueryOptions, 'includeReserved'> = {}
) {
  const templates = await adminDb
    .select({
      id: subscriptionTemplates.id,
      name: subscriptionTemplates.name,
      billingInterval: subscriptionTemplates.billingInterval,
      priceCents: subscriptionTemplates.priceCents,
      currency: subscriptionTemplates.currency
    })
    .from(subscriptionTemplates)
    .where(eq(subscriptionTemplates.targetScope, 'user'))
    .orderBy(asc(subscriptionTemplates.name), asc(subscriptionTemplates.billingInterval));

  return templates.filter((template) =>
    options.includeReserved
      ? true
      : isSubscriptionTemplateVisibleInAdminCatalog(template.id)
  );
}

type AdminSubscriptionTemplateQueryOptions = {
  includeReserved?: boolean;
  targetScope?: 'user' | 'organization';
  publicationStatus?: SubscriptionTemplatePublicationStatus;
};

export async function getAdminUserById(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const [result] = await adminDb
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
      ownedOrganizationsCount:
        sql<number>`cast(count(distinct case when ${teamMembers.role} = 'owner' then ${teamMembers.teamId} end) as int)`
    })
    .from(users)
    .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
    .where(eq(users.id, userId))
    .groupBy(users.id)
    .limit(1);

  if (!result) return null;

  const assignments = await getActiveUserSubscriptionAssignmentsByUserIds([userId]);
  const a = assignments[0];

  return {
    ...result,
    subscriptionTemplateId: a?.subscriptionTemplateId ?? null,
    subscriptionTemplateName: a?.templateName ?? null,
    subscriptionTemplateInterval: a?.templateInterval ?? null,
    subscriptionTemplateCurrency: a?.templateCurrency ?? null,
    subscriptionTemplatePriceCents: a?.templatePriceCents ?? null,
    subscriptionStatus: a?.status ?? null,
    paymentProvider: a?.paymentProvider ?? null,
    providerReferenceId: a?.providerReferenceId ?? null,
    providerPlanId: a?.providerPlanId ?? null,
    subscriptionCurrentPeriodStart: a?.currentPeriodStart ?? null,
    subscriptionCurrentPeriodEnd: a?.currentPeriodEnd ?? null,
    subscriptionTrialEndsAt: a?.trialEndsAt ?? null,
    subscriptionCancelAtPeriodEnd: a?.cancelAtPeriodEnd ?? null,
    subscriptionCanceledAt: a?.canceledAt ?? null
  };
}

export async function getAdminUserOrganizations(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) return [];

  const organizations = await adminDb
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
  const assignmentByTeamId = new Map(assignments.map((a) => [a.targetTeamId, a]));

  return organizations.map((row) => {
    const a = assignmentByTeamId.get(row.teamId);
    return {
      ...row,
      paymentProvider: a?.paymentProvider ?? null,
      providerReferenceId: a?.providerReferenceId ?? null,
      providerPlanId: a?.providerPlanId ?? null,
      planName: a?.planName ?? null,
      subscriptionStatus: a?.status ?? null,
      subscriptionTemplateId: a?.subscriptionTemplateId ?? null,
      subscriptionTemplateName: a?.templateName ?? null,
      subscriptionTemplateInterval: a?.templateInterval ?? null,
      subscriptionTemplateCurrency: a?.templateCurrency ?? null,
      subscriptionTemplatePriceCents: a?.templatePriceCents ?? null,
      subscriptionCurrentPeriodStart: a?.currentPeriodStart ?? null,
      subscriptionCurrentPeriodEnd: a?.currentPeriodEnd ?? null,
      subscriptionTrialEndsAt: a?.trialEndsAt ?? null,
      subscriptionCancelAtPeriodEnd: a?.cancelAtPeriodEnd ?? null,
      subscriptionCanceledAt: a?.canceledAt ?? null
    };
  });
}

export async function getAdminTransferCandidatesForUser(excludeUserId: number) {
  return adminDb
    .select({ id: users.id, name: users.name, email: users.email })
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
  const teamsForAdmin = await adminDb
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
  const assignmentByTeamId = new Map(assignments.map((a) => [a.targetTeamId, a]));

  return teamsForAdmin.map((row) => {
    const a = assignmentByTeamId.get(row.id);
    return {
      ...row,
      paymentProvider: a?.paymentProvider ?? null,
      providerReferenceId: a?.providerReferenceId ?? null,
      providerPlanId: a?.providerPlanId ?? null,
      planName: a?.planName ?? null,
      subscriptionStatus: a?.status ?? null,
      subscriptionTemplateId: a?.subscriptionTemplateId ?? null,
      subscriptionTemplateName: a?.templateName ?? null,
      subscriptionTemplateInterval: a?.templateInterval ?? null,
      subscriptionTemplateCurrency: a?.templateCurrency ?? null,
      subscriptionTemplatePriceCents: a?.templatePriceCents ?? null,
      subscriptionCurrentPeriodStart: a?.currentPeriodStart ?? null,
      subscriptionCurrentPeriodEnd: a?.currentPeriodEnd ?? null,
      subscriptionTrialEndsAt: a?.trialEndsAt ?? null,
      subscriptionCancelAtPeriodEnd: a?.cancelAtPeriodEnd ?? null,
      subscriptionCanceledAt: a?.canceledAt ?? null
    };
  });
}

export async function getAdminTeamById(teamId: number) {
  if (!Number.isInteger(teamId) || teamId <= 0) return null;

  const [team] = await adminDb
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

  if (!team) return null;

  const assignments = await getActiveTeamSubscriptionAssignmentsByTeamIds([teamId]);
  const a = assignments[0];

  return {
    ...team,
    paymentProvider: a?.paymentProvider ?? null,
    providerReferenceId: a?.providerReferenceId ?? null,
    providerPlanId: a?.providerPlanId ?? null,
    planName: a?.planName ?? null,
    subscriptionStatus: a?.status ?? null,
    subscriptionTemplateId: a?.subscriptionTemplateId ?? null,
    subscriptionTemplateName: a?.templateName ?? null,
    subscriptionTemplateInterval: a?.templateInterval ?? null,
    subscriptionTemplateCurrency: a?.templateCurrency ?? null,
    subscriptionTemplatePriceCents: a?.templatePriceCents ?? null,
    subscriptionCurrentPeriodStart: a?.currentPeriodStart ?? null,
    subscriptionCurrentPeriodEnd: a?.currentPeriodEnd ?? null,
    subscriptionTrialEndsAt: a?.trialEndsAt ?? null,
    subscriptionCancelAtPeriodEnd: a?.cancelAtPeriodEnd ?? null,
    subscriptionCanceledAt: a?.canceledAt ?? null
  };
}

export async function getAllSubscriptionTemplatesForAdmin(
  options: AdminSubscriptionTemplateQueryOptions = {}
) {
  const templates = await adminDb
    .select()
    .from(subscriptionTemplates)
    .orderBy(desc(subscriptionTemplates.createdAt));
  if (templates.length === 0) return [];

  const features = await adminDb
    .select()
    .from(subscriptionTemplateFeatures)
    .where(inArray(subscriptionTemplateFeatures.templateId, templates.map((t) => t.id)))
    .orderBy(
      asc(subscriptionTemplateFeatures.templateId),
      asc(subscriptionTemplateFeatures.displayOrder),
      asc(subscriptionTemplateFeatures.createdAt),
      asc(subscriptionTemplateFeatures.id)
    );

  return templates
    .map((t) => ({ ...t, features: mapSubscriptionTemplateFeatures(features, t.id) }))
    .filter((template) =>
      options.includeReserved
        ? true
        : isSubscriptionTemplateVisibleInAdminCatalog(template.id)
    )
    .filter((template) =>
      options.targetScope ? template.targetScope === options.targetScope : true
    )
    .filter((template) =>
      options.publicationStatus
        ? template.publicationStatus === options.publicationStatus
        : true
    );
}

export async function getPaymentProviderConfigsForAdmin() {
  const appRows = await adminDb
    .select({
      namespace: appConfigs.namespace,
      configKey: appConfigs.configKey,
      configValue: appConfigs.configValue
    })
    .from(appConfigs)
    .orderBy(appConfigs.namespace, appConfigs.configKey);

  const byProviderAndKey = new Map<string, { provider: string; configKey: string; configValue: string }>();

  for (const row of appRows) {
    const provider = mapNamespaceToLegacyProvider(row.namespace);
    const compositeKey = `${provider}:${row.configKey}`;
    byProviderAndKey.set(compositeKey, { provider, configKey: row.configKey, configValue: row.configValue });
  }

  return Array.from(byProviderAndKey.values()).sort((a, b) => {
    const byProvider = a.provider.localeCompare(b.provider);
    return byProvider !== 0 ? byProvider : a.configKey.localeCompare(b.configKey);
  });
}

export async function getAppConfigEntriesForAdmin() {
  return adminDb
    .select({
      namespace: appConfigs.namespace,
      configKey: appConfigs.configKey,
      configValue: appConfigs.configValue,
      isSecret: appConfigs.isSecret,
      updatedAt: appConfigs.updatedAt
    })
    .from(appConfigs)
    .orderBy(asc(appConfigs.namespace), asc(appConfigs.configKey));
}

export async function getAppModulesForAdmin() {
  return adminDb
    .select({
      moduleId: appModules.moduleId,
      version: appModules.version,
      status: appModules.status,
      installMode: appModules.installMode,
      installedAt: appModules.installedAt,
      enabledAt: appModules.enabledAt,
      disabledAt: appModules.disabledAt,
      uninstalledAt: appModules.uninstalledAt,
      updatedAt: appModules.updatedAt
    })
    .from(appModules)
    .orderBy(asc(appModules.moduleId));
}

export async function getPaymentLogsForAdmin(limit = 200) {
  return adminDb
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

export async function getEmailLogsForAdmin(limit = 300) {
  return adminDb
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

export async function getPaymentOrdersForAdmin(limit = 300) {
  return adminDb
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
    .leftJoin(subscriptionTemplates, eq(paymentOrders.subscriptionTemplateId, subscriptionTemplates.id))
    .orderBy(desc(paymentOrders.updatedAt), desc(paymentOrders.createdAt))
    .limit(Math.max(1, Math.min(limit, 1000)));
}

export async function getPaymentTransactionsForAdmin(limit = 300) {
  return adminDb
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
    .leftJoin(subscriptionTemplates, eq(paymentOrders.subscriptionTemplateId, subscriptionTemplates.id))
    .where(
      and(
        inArray(paymentTransactions.provider, ['stripe', 'paypal']),
        eq(paymentTransactions.transactionType, 'sale')
      )
    )
    .orderBy(desc(paymentTransactions.occurredAt), desc(paymentTransactions.createdAt))
    .limit(Math.max(1, Math.min(limit, 1000)));
}

export async function getCheckoutCallbackAttemptsForAdmin(limit = 120) {
  return adminDb
    .select({
      id: checkoutPaymentAttemptLogs.id,
      checkoutOrderId: checkoutPaymentAttemptLogs.checkoutOrderId,
      checkoutToken: checkoutPaymentAttemptLogs.checkoutToken,
      paymentMethodId: checkoutPaymentAttemptLogs.paymentMethodId,
      provider: checkoutPaymentAttemptLogs.provider,
      ownerType: checkoutPaymentAttemptLogs.ownerType,
      moduleId: checkoutPaymentAttemptLogs.moduleId,
      orderType: checkoutPaymentAttemptLogs.orderType,
      source: checkoutPaymentAttemptLogs.source,
      eventType: checkoutPaymentAttemptLogs.eventType,
      status: checkoutPaymentAttemptLogs.status,
      teamId: checkoutPaymentAttemptLogs.teamId,
      targetType: checkoutPaymentAttemptLogs.targetType,
      targetTeamId: checkoutPaymentAttemptLogs.targetTeamId,
      targetUserId: checkoutPaymentAttemptLogs.targetUserId,
      providerSessionId: checkoutPaymentAttemptLogs.providerSessionId,
      providerReferenceId: checkoutPaymentAttemptLogs.providerReferenceId,
      externalOrderId: checkoutPaymentAttemptLogs.externalOrderId,
      externalPaymentId: checkoutPaymentAttemptLogs.externalPaymentId,
      message: checkoutPaymentAttemptLogs.message,
      metadata: checkoutPaymentAttemptLogs.metadata,
      createdAt: checkoutPaymentAttemptLogs.createdAt,
      teamName: teams.name
    })
    .from(checkoutPaymentAttemptLogs)
    .leftJoin(
      teams,
      eq(
        teams.id,
        sql<number>`coalesce(${checkoutPaymentAttemptLogs.teamId}, ${checkoutPaymentAttemptLogs.targetTeamId})`
      )
    )
    .where(
      and(
        or(
          like(checkoutPaymentAttemptLogs.eventType, 'return_%'),
          like(checkoutPaymentAttemptLogs.eventType, 'webhook_%')
        ),
        ne(checkoutPaymentAttemptLogs.eventType, 'return_received'),
        ne(checkoutPaymentAttemptLogs.eventType, 'webhook_received')
      )
    )
    .orderBy(
      desc(checkoutPaymentAttemptLogs.createdAt),
      desc(checkoutPaymentAttemptLogs.id)
    )
    .limit(Math.max(1, Math.min(limit, 500)));
}

export async function getPaymentOrderForAdminById(orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) return null;

  const [result] = await adminDb
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
    .leftJoin(subscriptionTemplates, eq(paymentOrders.subscriptionTemplateId, subscriptionTemplates.id))
    .where(eq(paymentOrders.id, orderId))
    .limit(1);

  return result ?? null;
}

export async function getPaymentOrderFormOptionsForAdmin() {
  const [teamOptions, templateOptions, userOptions] = await Promise.all([
    adminDb.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
    adminDb
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
    adminDb
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(isNull(users.deletedAt), eq(users.accountStatus, 'active')))
      .orderBy(asc(users.email))
  ]);

  return {
    teams: teamOptions,
    templates: templateOptions.filter((template) =>
      isSubscriptionTemplateVisibleInAdminCatalog(template.id)
    ),
    users: userOptions
  };
}

export async function getSystemActivityLogsForAdmin(
  optionsOrLimit: number | AdminSystemActivityLogQuery = 200
): Promise<AdminSystemActivityLogRecord[]> {
  const options = normalizeAdminSystemActivityLogQuery(optionsOrLimit);
  const filters = [
    options.eventCategory
      ? eq(sysActivityLogs.eventCategory, options.eventCategory)
      : undefined,
    options.status ? eq(sysActivityLogs.status, options.status) : undefined,
    options.requestId
      ? eq(sysActivityLogs.requestId, options.requestId)
      : undefined,
    options.actorUserId
      ? eq(sysActivityLogs.actorUserId, options.actorUserId)
      : undefined,
    options.entityType
      ? eq(sysActivityLogs.entityType, options.entityType)
      : undefined,
    options.entityId ? eq(sysActivityLogs.entityId, options.entityId) : undefined,
    options.search
      ? or(
          ilike(sysActivityLogs.eventType, `%${options.search}%`),
          ilike(sysActivityLogs.source, `%${options.search}%`),
          ilike(sysActivityLogs.requestId, `%${options.search}%`),
          ilike(sysActivityLogs.message, `%${options.search}%`)
        )
      : undefined
  ].filter(Boolean);

  return adminDb
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
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(sysActivityLogs.createdAt))
    .limit(options.limit);
}

// ─── Dashboard analytics ───────────────────────────────────────────────────────

export type AdminDashboardMonthlySeriesPoint = {
  date: string;
  users: number;
  subscriptions: number;
  sales: number;
};

const SUBSCRIPTION_ACTIVITY_EVENT_TYPES: string[] = [
  EVENT_HOOKS.subscriptionAssignmentActivated,
  EVENT_HOOKS.subscriptionAssignmentSuspended,
  EVENT_HOOKS.subscriptionAssignmentCanceled
];

export async function getAdminDashboardMonthlySeries(
  days = 30
): Promise<AdminDashboardMonthlySeriesPoint[]> {
  const safeDays = Math.max(7, Math.min(days, 90));
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const [userRows, subscriptionRows, salesRows] = await Promise.all([
    adminDb
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, startDate))),
    adminDb
      .select({ createdAt: sysActivityLogs.createdAt, metadata: sysActivityLogs.metadata })
      .from(sysActivityLogs)
      .where(
        and(
          gte(sysActivityLogs.createdAt, startDate),
          eq(sysActivityLogs.eventCategory, 'event_bus'),
          inArray(sysActivityLogs.eventType, SUBSCRIPTION_ACTIVITY_EVENT_TYPES),
          inArray(sysActivityLogs.action, ['emit', 'queue'])
        )
      ),
    adminDb
      .select({ createdAt: paymentOrders.createdAt })
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

  const buckets = new Map<string, { users: number; subscriptions: number; sales: number }>();
  for (let i = 0; i < safeDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    buckets.set(toDateBucketKey(d), { users: 0, subscriptions: 0, sales: 0 });
  }

  for (const row of userRows) {
    const bucket = buckets.get(toDateBucketKey(row.createdAt));
    if (bucket) bucket.users += 1;
  }

  for (const createdAt of dedupeSubscriptionActivityDates(subscriptionRows)) {
    const bucket = buckets.get(toDateBucketKey(createdAt));
    if (bucket) bucket.subscriptions += 1;
  }

  for (const row of salesRows) {
    const bucket = buckets.get(toDateBucketKey(row.createdAt));
    if (bucket) bucket.sales += 1;
  }

  return Array.from(buckets.entries()).map(([date, values]) => ({ date, ...values }));
}

export type AdminDashboardSummary = {
  totalUsers: number;
  totalTeams: number;
  activeSubscriptions: number;
  issueSubscriptions: number;
  pendingOrders: number;
  failedOrders: number;
};

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const [usersSummary, teamsSummary, subscriptionSummary, ordersSummary] = await Promise.all([
    adminDb
      .select({ totalUsers: sql<number>`cast(count(*) as int)` })
      .from(users)
      .where(isNull(users.deletedAt))
      .then((rows) => rows[0]),
    adminDb
      .select({ totalTeams: sql<number>`cast(count(*) as int)` })
      .from(teams)
      .then((rows) => rows[0]),
    adminDb
      .select({
        activeSubscriptions:
          sql<number>`cast(count(case when ${subscriptionAssignments.status} = 'active' then 1 end) as int)`,
        issueSubscriptions:
          sql<number>`cast(count(case when ${subscriptionAssignments.status} in ('unpaid', 'canceled') then 1 end) as int)`
      })
      .from(subscriptionAssignments)
      .where(isNull(subscriptionAssignments.effectiveTo))
      .then((rows) => rows[0]),
    adminDb
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
