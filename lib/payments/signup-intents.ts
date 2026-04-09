import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  activityLogs,
  signupIntents,
  teamMembers,
  teams,
  users,
  type ActivityType,
  type NewActivityLog,
  type SubscriptionTemplate
} from '@/lib/db/schema';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { getSubscriptionTemplateById } from '@/lib/db/queries';
import {
  createSignupIntentSubscriptionCheckoutOrder,
  getCheckoutOrderByToken,
  isCheckoutOrderSignupIntent,
  resolveCheckoutOrderSignupIntentId,
  type CheckoutOrderWithMetadata
} from './checkout-orders';
import {
  activateSubscriptionAssignment,
  activateReservedFreeSubscriptionAssignment
} from './subscription-assignments';
import { getSubscriptionSignupFlowForScope } from './subscription-signup-policy';
import { buildDefaultTeamNameFromEmail } from '@/lib/organizations/default-team-name';

export type SignupIntentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'canceled';

const SIGNUP_INTENT_PAYPAL_CUSTOM_ID_PREFIX = 'signup-intent';
const DEFAULT_SIGNUP_INTENT_EXPIRES_IN_MS = 1000 * 60 * 60;

type SignupIntentRow = typeof signupIntents.$inferSelect;

type InitialSignupTemplate =
  | {
      id: number;
      name: string;
    }
  | null;

function resolveSignupIntentClosureStatus(
  checkoutStatus: string | null | undefined
): Extract<SignupIntentStatus, 'canceled' | 'expired'> | null {
  if (checkoutStatus === 'canceled' || checkoutStatus === 'expired') {
    return checkoutStatus;
  }

  return null;
}

function normalizeText(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeTargetScope(value: string | null | undefined) {
  if (value === 'user' || value === 'organization') {
    return value;
  }

  return null;
}

function normalizeStatus(
  value: string | null | undefined,
  fallback: 'free' | 'trialing' | 'active' | 'unpaid' | 'canceled' = 'active'
) {
  if (
    value === 'free' ||
    value === 'trialing' ||
    value === 'active' ||
    value === 'unpaid' ||
    value === 'canceled'
  ) {
    return value;
  }

  return fallback;
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

async function activateInitialSignupSubscriptionAssignment({
  executor,
  targetType,
  targetId,
  template
}: {
  executor: Pick<typeof db, 'select' | 'insert' | 'update'>;
  targetType: 'team' | 'user';
  targetId: number;
  template: InitialSignupTemplate;
}) {
  if (!template) {
    return activateReservedFreeSubscriptionAssignment(
      {
        targetType,
        targetId
      },
      {
        executor,
        emitEvents: false
      }
    );
  }

  return activateSubscriptionAssignment(
    {
      targetType,
      targetId,
      subscriptionTemplateId: template.id,
      paymentProvider: null,
      providerReferenceId: null,
      providerPlanId: null,
      status: 'free',
      planName: template.name,
      sourceOrderId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      canceledAt: null
    },
    {
      executor,
      emitEvents: false
    }
  );
}

async function logActivity(
  executor: Pick<typeof db, 'insert'>,
  teamId: number | null,
  userId: number,
  action: ActivityType
) {
  if (!teamId) {
    return;
  }

  const payload: NewActivityLog = {
    teamId,
    userId,
    action,
    ipAddress: ''
  };
  await executor.insert(activityLogs).values(payload);
}

async function resolveSupplementaryUserSignupTemplate() {
  const flow = await getSubscriptionSignupFlowForScope('user');
  if (flow.mode === 'direct' && flow.template) {
    return {
      id: flow.template.id,
      name: flow.template.name
    };
  }

  return null;
}

export async function createSignupIntentCheckout({
  email,
  passwordHash,
  targetScope,
  template,
  source = 'sign_up',
  expiresInMs = DEFAULT_SIGNUP_INTENT_EXPIRES_IN_MS
}: {
  email: string;
  passwordHash: string;
  targetScope: 'user' | 'organization';
  template: SubscriptionTemplate;
  source?: string;
  expiresInMs?: number;
}) {
  const normalizedEmail = normalizeText(email, 255);
  const normalizedPasswordHash = normalizeText(passwordHash, 255);
  const normalizedTargetScope = normalizeTargetScope(targetScope);
  if (!normalizedEmail || !normalizedPasswordHash || !normalizedTargetScope) {
    return null;
  }

  const expiresAt = new Date(
    Date.now() + Math.max(5 * 60 * 1000, expiresInMs)
  );
  const now = new Date();
  const [createdIntent] = await db
    .insert(signupIntents)
    .values({
      email: normalizedEmail,
      passwordHash: normalizedPasswordHash,
      status: 'pending',
      targetScope: normalizedTargetScope,
      subscriptionTemplateId: template.id,
      checkoutOrderId: null,
      createdUserId: null,
      createdTeamId: null,
      finalizedAt: null,
      expiresAt,
      createdAt: now,
      updatedAt: now
    })
    .returning();
  if (!createdIntent) {
    return null;
  }

  const checkoutOrder = await createSignupIntentSubscriptionCheckoutOrder({
    signupIntentId: createdIntent.id,
    email: normalizedEmail,
    targetScope: normalizedTargetScope,
    template,
    source,
    expiresInMs
  });

  if (!checkoutOrder) {
    await db
      .update(signupIntents)
      .set({
        status: 'failed',
        updatedAt: new Date()
      })
      .where(eq(signupIntents.id, createdIntent.id));
    return null;
  }

  const [updatedIntent] = await db
    .update(signupIntents)
    .set({
      checkoutOrderId: checkoutOrder.id,
      updatedAt: new Date()
    })
    .where(eq(signupIntents.id, createdIntent.id))
    .returning();

  return {
    signupIntent: updatedIntent ?? createdIntent,
    checkoutOrder
  };
}

export async function getSignupIntentCheckoutAccessByToken(checkoutToken: string) {
  const checkoutOrder = await getCheckoutOrderByToken(checkoutToken);
  if (!checkoutOrder || !isCheckoutOrderSignupIntent(checkoutOrder)) {
    return null;
  }

  const signupIntentId = resolveCheckoutOrderSignupIntentId(checkoutOrder);
  if (!signupIntentId) {
    return null;
  }

  const [signupIntent] = await db
    .select()
    .from(signupIntents)
    .where(eq(signupIntents.id, signupIntentId))
    .limit(1);
  if (!signupIntent) {
    return null;
  }

  if (
    signupIntent.checkoutOrderId &&
    signupIntent.checkoutOrderId !== checkoutOrder.id
  ) {
    return null;
  }

  const resolvedSignupIntent = await syncSignupIntentClosureStatus({
    checkoutOrder,
    signupIntent
  });

  return {
    checkoutOrder,
    signupIntent: resolvedSignupIntent ?? signupIntent
  };
}

export async function syncSignupIntentClosureStatus({
  checkoutOrder,
  signupIntent = null
}: {
  checkoutOrder: CheckoutOrderWithMetadata;
  signupIntent?: SignupIntentRow | null;
}) {
  const nextStatus = resolveSignupIntentClosureStatus(checkoutOrder.status);
  const signupIntentId =
    signupIntent?.id ?? resolveCheckoutOrderSignupIntentId(checkoutOrder);
  if (!nextStatus || !signupIntentId) {
    return signupIntent;
  }

  const currentSignupIntent =
    signupIntent ??
    (
      await db
        .select()
        .from(signupIntents)
        .where(eq(signupIntents.id, signupIntentId))
        .limit(1)
    )[0] ??
    null;
  if (!currentSignupIntent || currentSignupIntent.status !== 'pending') {
    return currentSignupIntent;
  }

  const [updatedIntent] = await db
    .update(signupIntents)
    .set({
      status: nextStatus,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(signupIntents.id, currentSignupIntent.id),
        eq(signupIntents.status, 'pending')
      )
    )
    .returning();

  return updatedIntent ?? currentSignupIntent;
}

export function buildPayPalSignupIntentCustomId({
  signupIntentId,
  checkoutToken
}: {
  signupIntentId: number;
  checkoutToken: string;
}) {
  const normalizedSignupIntentId = normalizePositiveInt(signupIntentId);
  const normalizedCheckoutToken = normalizeText(checkoutToken, 80);
  if (!normalizedSignupIntentId || !normalizedCheckoutToken) {
    return null;
  }

  return `${SIGNUP_INTENT_PAYPAL_CUSTOM_ID_PREFIX}:${normalizedSignupIntentId}:${normalizedCheckoutToken}`;
}

export function parsePayPalSignupIntentCustomId(value: string | null | undefined) {
  const normalizedValue = normalizeText(value, 255);
  if (!normalizedValue) {
    return null;
  }

  const [prefix, rawIntentId, rawCheckoutToken] = normalizedValue.split(':');
  const signupIntentId = Number(rawIntentId);
  const checkoutToken = normalizeText(rawCheckoutToken, 80);
  if (
    prefix !== SIGNUP_INTENT_PAYPAL_CUSTOM_ID_PREFIX ||
    !Number.isInteger(signupIntentId) ||
    signupIntentId <= 0 ||
    !checkoutToken
  ) {
    return null;
  }

  return {
    signupIntentId,
    checkoutToken
  };
}

async function loadCreatedSignupEntities(
  signupIntent: SignupIntentRow
) {
  const createdUserId = normalizePositiveInt(signupIntent.createdUserId);
  const createdTeamId = normalizePositiveInt(signupIntent.createdTeamId);

  const [createdUser] = createdUserId
    ? await db.select().from(users).where(eq(users.id, createdUserId)).limit(1)
    : [];
  const [createdTeam] = createdTeamId
    ? await db.select().from(teams).where(eq(teams.id, createdTeamId)).limit(1)
    : [];

  return {
    createdUser: createdUser ?? null,
    createdTeam: createdTeam ?? null
  };
}

export async function finalizeSignupIntentCheckout({
  checkoutOrder,
  paymentProvider,
  providerReferenceId,
  providerPlanId = null,
  paymentMethod = null,
  planName = null,
  subscriptionStatus = null,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  trialEndsAt = null,
  cancelAtPeriodEnd = null,
  canceledAt = null,
  source = '/checkout'
}: {
  checkoutOrder: CheckoutOrderWithMetadata;
  paymentProvider: 'stripe' | 'paypal';
  providerReferenceId: string | null;
  providerPlanId?: string | null;
  paymentMethod?: string | null;
  planName?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  trialEndsAt?: Date | string | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: Date | string | null;
  source?: string;
}) {
  const signupIntentId = resolveCheckoutOrderSignupIntentId(checkoutOrder);
  if (!signupIntentId) {
    return null;
  }

  const [currentIntent] = await db
    .select()
    .from(signupIntents)
    .where(eq(signupIntents.id, signupIntentId))
    .limit(1);
  if (!currentIntent) {
    return null;
  }

  if (
    currentIntent.checkoutOrderId &&
    currentIntent.checkoutOrderId !== checkoutOrder.id
  ) {
    return null;
  }

  if (
    currentIntent.status === 'completed' &&
    normalizePositiveInt(currentIntent.createdUserId)
  ) {
    const loaded = await loadCreatedSignupEntities(currentIntent);
    return {
      signupIntent: currentIntent,
      createdUser: loaded.createdUser,
      createdTeam: loaded.createdTeam,
      teamId: loaded.createdTeam?.id ?? null,
      createdNewTeam: Boolean(loaded.createdTeam),
      finalizedNow: false
    };
  }

  const normalizedTargetScope = normalizeTargetScope(currentIntent.targetScope);
  if (!normalizedTargetScope) {
    return null;
  }

  const template =
    (await getSubscriptionTemplateById(currentIntent.subscriptionTemplateId)) ?? null;
  if (!template || template.id !== checkoutOrder.subscriptionTemplateId) {
    return null;
  }

  const assignmentStatus = normalizeStatus(
    subscriptionStatus,
    template.priceCents > 0 ? 'active' : 'free'
  );
  const normalizedProviderReferenceId = normalizeText(providerReferenceId, 255);
  const normalizedProviderPlanId = normalizeText(providerPlanId, 255);
  const normalizedPaymentMethod = normalizeText(paymentMethod, 60);
  const normalizedPlanName = normalizeText(planName, 100) ?? template.name;
  const normalizedCurrentPeriodStart = normalizeDate(currentPeriodStart);
  const normalizedCurrentPeriodEnd = normalizeDate(currentPeriodEnd);
  const normalizedTrialEndsAt = normalizeDate(trialEndsAt);
  const normalizedCanceledAt = normalizeDate(canceledAt);

  const supplementaryUserTemplate =
    normalizedTargetScope === 'organization'
      ? await resolveSupplementaryUserSignupTemplate()
      : null;

  const provisioned = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from signup_intents where id = ${signupIntentId} for update`
    );

    const [lockedIntent] = await tx
      .select()
      .from(signupIntents)
      .where(eq(signupIntents.id, signupIntentId))
      .limit(1);
    if (!lockedIntent) {
      return null;
    }

    if (
      lockedIntent.status === 'completed' &&
      normalizePositiveInt(lockedIntent.createdUserId)
    ) {
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, lockedIntent.createdUserId!))
        .limit(1);
      const [existingTeam] = lockedIntent.createdTeamId
        ? await tx
            .select()
            .from(teams)
            .where(eq(teams.id, lockedIntent.createdTeamId))
            .limit(1)
        : [];

      return {
        signupIntent: lockedIntent,
        createdUser: existingUser ?? null,
        createdTeam: existingTeam ?? null,
        teamId: existingTeam?.id ?? null,
        createdNewTeam: Boolean(existingTeam),
        finalizedNow: false
      };
    }

    const [emailTakenUser] = await tx
      .select({
        id: users.id
      })
      .from(users)
      .where(eq(users.email, lockedIntent.email))
      .limit(1);
    if (emailTakenUser) {
      await tx
        .update(signupIntents)
        .set({
          status: 'failed',
          updatedAt: new Date()
        })
        .where(eq(signupIntents.id, lockedIntent.id));
      throw new Error('signup_intent_email_taken');
    }

    const [createdUser] = await tx
      .insert(users)
      .values({
        email: lockedIntent.email,
        passwordHash: lockedIntent.passwordHash,
        role: 'owner'
      })
      .returning();
    if (!createdUser) {
      throw new Error('signup_intent_user_create_failed');
    }

    let createdTeam: typeof teams.$inferSelect | null = null;
    let teamId: number | null = null;
    let createdNewTeam = false;

    if (normalizedTargetScope === 'organization') {
      await activateInitialSignupSubscriptionAssignment({
        executor: tx,
        targetType: 'user',
        targetId: createdUser.id,
        template: supplementaryUserTemplate
      });

      [createdTeam] = await tx
        .insert(teams)
        .values({
          name: buildDefaultTeamNameFromEmail(lockedIntent.email)
        })
        .returning();
      if (!createdTeam) {
        throw new Error('signup_intent_team_create_failed');
      }

      createdNewTeam = true;
      teamId = createdTeam.id;

      await tx.insert(teamMembers).values({
        userId: createdUser.id,
        teamId: createdTeam.id,
        role: 'owner'
      });

      await activateSubscriptionAssignment(
        {
          targetType: 'team',
          targetId: createdTeam.id,
          subscriptionTemplateId: template.id,
          paymentProvider,
          providerReferenceId: normalizedProviderReferenceId,
          providerPlanId: normalizedProviderPlanId,
          status: assignmentStatus,
          planName: normalizedPlanName,
          sourceOrderId: checkoutOrder.id,
          currentPeriodStart: normalizedCurrentPeriodStart,
          currentPeriodEnd: normalizedCurrentPeriodEnd,
          trialEndsAt: normalizedTrialEndsAt,
          cancelAtPeriodEnd,
          canceledAt: normalizedCanceledAt
        },
        {
          executor: tx,
          emitEvents: false
        }
      );

      await logActivity(
        tx,
        createdTeam.id,
        createdUser.id,
        'create_team' as ActivityType
      );
      await logActivity(tx, createdTeam.id, createdUser.id, 'sign_up' as ActivityType);
    } else {
      await activateSubscriptionAssignment(
        {
          targetType: 'user',
          targetId: createdUser.id,
          subscriptionTemplateId: template.id,
          paymentProvider,
          providerReferenceId: normalizedProviderReferenceId,
          providerPlanId: normalizedProviderPlanId,
          status: assignmentStatus,
          planName: normalizedPlanName,
          sourceOrderId: checkoutOrder.id,
          currentPeriodStart: normalizedCurrentPeriodStart,
          currentPeriodEnd: normalizedCurrentPeriodEnd,
          trialEndsAt: normalizedTrialEndsAt,
          cancelAtPeriodEnd,
          canceledAt: normalizedCanceledAt
        },
        {
          executor: tx,
          emitEvents: false
        }
      );
    }

    const [updatedIntent] = await tx
      .update(signupIntents)
      .set({
        status: 'completed',
        checkoutOrderId: lockedIntent.checkoutOrderId ?? checkoutOrder.id,
        createdUserId: createdUser.id,
        createdTeamId: teamId,
        finalizedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(signupIntents.id, lockedIntent.id))
      .returning();

    return {
      signupIntent: updatedIntent ?? lockedIntent,
      createdUser,
      createdTeam,
      teamId,
      createdNewTeam,
      finalizedNow: true
    };
  });

  if (!provisioned) {
    return null;
  }

  if (provisioned.finalizedNow && provisioned.createdUser) {
    if (provisioned.createdNewTeam && provisioned.teamId !== null) {
      await emitEventAsync(
        EVENT_HOOKS.authTeamCreated,
        {
          teamId: provisioned.teamId,
          teamName: provisioned.createdTeam?.name ?? null,
          userId: provisioned.createdUser.id
        },
        {
          actorUserId: provisioned.createdUser.id,
          actorEmail: provisioned.createdUser.email,
          actorRole: provisioned.createdUser.role,
          teamId: provisioned.teamId,
          source
        }
      );

      await emitEventAsync(
        EVENT_HOOKS.dashboardTeamsCreated,
        {
          teamId: provisioned.teamId,
          teamName: provisioned.createdTeam?.name ?? null,
          userId: provisioned.createdUser.id
        },
        {
          actorUserId: provisioned.createdUser.id,
          actorEmail: provisioned.createdUser.email,
          actorRole: provisioned.createdUser.role,
          teamId: provisioned.teamId,
          source
        }
      );
    }

    await emitEventAsync(
      EVENT_HOOKS.authSignUpCreated,
      {
        userId: provisioned.createdUser.id,
        teamId: provisioned.teamId,
        inviteId: null
      },
      {
        actorUserId: provisioned.createdUser.id,
        actorEmail: provisioned.createdUser.email,
        actorRole: provisioned.createdUser.role,
        teamId: provisioned.teamId,
        source
      }
    );
  }

  return provisioned;
}
