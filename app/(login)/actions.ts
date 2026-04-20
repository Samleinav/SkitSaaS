'use server';

import { z } from 'zod';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db/drizzle';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  User,
  users,
  teams,
  teamMembers,
  subscriptionAssignments,
  subscriptionTemplateFeatures,
  activityLogs,
  passwordResetTokens,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations
} from '@/lib/db/schema';
import { sendPasswordResetEmail } from '@/lib/email/password-reset';
import {
  clearSession,
  comparePasswords,
  hashPassword,
  setSession
} from '@/lib/auth/session';
import { createAuthAuditLog } from '@/lib/auth/audit';
import {
  evaluateBreakGlassPasswordPolicy,
  registerBreakGlassPasswordFailure,
  clearBreakGlassPasswordFailureState,
  resolveClientIpAddress
} from '@/lib/auth/break-glass';
import { enrichUser } from '@skitsaas/sdk';
import { isPasswordLoginAllowedForArea } from '@/lib/auth/login-policy';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import {
  activateReservedFreeSubscriptionAssignment,
  activateSubscriptionAssignment
} from '@/lib/payments/subscription-assignments';
import { sendTeamInvitationEmail } from '@/lib/email/invitations';
import {
  getSelfServiceSubscriptionTemplateById,
  getUser,
  getUserWithTeam
} from '@/lib/db/queries';
import { getActionTranslator } from '@/lib/i18n/server';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import { resolveRoleRedirect } from '@/lib/portals/role-routing';
import { areTeamsEnabled } from '@/lib/organizations/config';
import { createFeatureController } from '@/lib/features/controller';
import {
  canAddTeamMemberBySubscription,
  getTeamMemberLimitBySubscriptionFeatureController
} from '@/lib/organizations/subscription-limit-values';
import { buildDefaultTeamNameFromEmail } from '@/lib/organizations/default-team-name';
import { FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID } from '@/lib/payments/subscription-default-templates';
import { getSubscriptionSignupFlowForScope } from '@/lib/payments/subscription-signup-policy';
import { createSignupIntentCheckout } from '@/lib/payments/signup-intents';
import { buildSoftDeletedEmailSql } from '@/lib/db/user-soft-delete';

async function getTeamMemberLimitForSignUpInvitation({
  executor,
  teamId
}: {
  executor: Pick<typeof db, 'select'>;
  teamId: number;
}) {
  const [assignment] = await executor
    .select({
      templateId: subscriptionAssignments.subscriptionTemplateId
    })
    .from(subscriptionAssignments)
    .where(
      and(
        eq(subscriptionAssignments.targetType, 'team'),
        eq(subscriptionAssignments.targetTeamId, teamId),
        isNull(subscriptionAssignments.effectiveTo)
      )
    )
    .limit(1);

  const subscriptionTemplateId =
    assignment?.templateId ?? FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;

  const features = await executor
    .select({
      key: subscriptionTemplateFeatures.featureKey,
      value: subscriptionTemplateFeatures.featureValue
    })
    .from(subscriptionTemplateFeatures)
    .where(eq(subscriptionTemplateFeatures.templateId, subscriptionTemplateId));

  return getTeamMemberLimitBySubscriptionFeatureController(
    createFeatureController(features)
  );
}

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string,
  options?: {
    executor?: Pick<typeof db, 'insert'>;
  }
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  const executor = options?.executor ?? db;
  await executor.insert(activityLogs).values(newActivity);
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
  template: {
    id: number;
    name: string;
  } | null;
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

type AuthArea = 'admin' | 'dashboard';

function resolveSignInSource(authArea: AuthArea) {
  return authArea === 'admin' ? '/admin/login' : '/login';
}

async function auditBreakGlassSignInEvent({
  action,
  status,
  reason,
  email,
  source,
  ipAddress,
  metadata
}: {
  action: 'attempt' | 'blocked' | 'failed' | 'lockout' | 'success';
  status: 'info' | 'warning' | 'failed' | 'success';
  reason: string;
  email: string;
  source: string;
  ipAddress: string | null;
  metadata?: Record<string, unknown>;
}) {
  await createSysActivityLog({
    eventType: 'auth.break_glass.password',
    eventCategory: 'auth',
    action,
    status,
    actorEmail: email,
    source,
    ipAddress,
    message: reason,
    metadata
  });
}

async function auditPasswordSignInEvent({
  action,
  status,
  reason,
  email,
  source,
  ipAddress,
  actorUserId = null,
  actorRole = null,
  metadata
}: {
  action: string;
  status: 'info' | 'success' | 'warning' | 'failed';
  reason: string;
  email: string;
  source: string;
  ipAddress: string | null;
  actorUserId?: number | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await createAuthAuditLog({
    eventType: 'auth.password_sign_in',
    action,
    status,
    actorUserId,
    actorEmail: email,
    actorRole,
    source,
    ipAddress,
    message: reason,
    metadata
  });
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

async function signInByArea(
  data: z.infer<typeof signInSchema>,
  formData: FormData,
  authArea: AuthArea
) {
  const { email, password } = data;
  const signInSource = resolveSignInSource(authArea);
  const t = await getActionTranslator();
  const requestHeaders = await headers();
  const ipAddress = resolveClientIpAddress({
    xForwardedFor: requestHeaders.get('x-forwarded-for'),
    xRealIp: requestHeaders.get('x-real-ip')
  });
  const userAgent = requestHeaders.get('user-agent');

  if (!isPasswordLoginAllowedForArea(authArea)) {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: 'password_method_disabled' },
      { source: signInSource }
    );
    await auditPasswordSignInEvent({
      action: 'blocked',
      status: 'warning',
      reason: 'password_method_disabled',
      email,
      source: signInSource,
      ipAddress,
      metadata: {
        authArea
      }
    });
    return {
      error: t('Password sign-in is disabled for this area. Use an enabled provider.'),
      email,
      password
    };
  }
  const isAdminArea = authArea === 'admin';
  const breakGlassDecision = isAdminArea
    ? evaluateBreakGlassPasswordPolicy({
        email,
        ipAddress
      })
    : null;

  if (breakGlassDecision?.isBreakGlassUser) {
    await auditBreakGlassSignInEvent({
      action: 'attempt',
      status: 'info',
      reason: 'password_attempt',
      email,
      source: signInSource,
      ipAddress,
      metadata: {
        authArea,
        allowed: breakGlassDecision.allowed
      }
    });
  }

  if (breakGlassDecision && !breakGlassDecision.allowed) {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: `break_glass_${breakGlassDecision.reason}` },
      { source: signInSource }
    );
    await auditBreakGlassSignInEvent({
      action: 'blocked',
      status: 'warning',
      reason: breakGlassDecision.reason,
      email,
      source: signInSource,
      ipAddress,
      metadata: {
        authArea,
        retryAfterSeconds: breakGlassDecision.retryAfterSeconds
      }
    });
    return {
      error:
        breakGlassDecision.reason === 'locked_out'
          ? t('Too many failed attempts. Try again later or use passkey sign-in.')
          : t('Password sign-in is disabled for this account. Use passkey sign-in.'),
      email,
      password
    };
  }

  await emitEventAsync(
    EVENT_HOOKS.authSignInAttempt,
    { email },
    { source: signInSource }
  );

  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    const failureState = isAdminArea
      ? registerBreakGlassPasswordFailure({ email, ipAddress })
      : null;
    if (failureState?.isBreakGlassUser) {
      await auditBreakGlassSignInEvent({
        action: 'failed',
        status: 'warning',
        reason: 'user_not_found',
        email,
        source: signInSource,
        ipAddress,
        metadata: {
          authArea,
          attempts: failureState.attempts,
          maxAttempts: failureState.maxAttempts
        }
      });
      if (failureState.isLocked) {
        await auditBreakGlassSignInEvent({
          action: 'lockout',
          status: 'failed',
          reason: 'locked_out',
          email,
          source: signInSource,
          ipAddress,
          metadata: {
            authArea,
            attempts: failureState.attempts,
            retryAfterSeconds: failureState.retryAfterSeconds,
            lockoutUntil: failureState.lockoutUntilIso
          }
        });
      }
    }

    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      {
        email,
        reason:
          failureState?.isLocked === true
            ? 'break_glass_locked_out'
            : 'user_not_found'
      },
      { source: signInSource }
    );
    await auditPasswordSignInEvent({
      action: failureState?.isLocked ? 'lockout' : 'failed',
      status: failureState?.isLocked ? 'failed' : 'warning',
      reason:
        failureState?.isLocked === true
          ? 'break_glass_locked_out'
          : 'user_not_found',
      email,
      source: signInSource,
      ipAddress,
      metadata: {
        authArea
      }
    });

    if (failureState?.isLocked) {
      return {
        error: t('Too many failed attempts. Try again later or use passkey sign-in.'),
        email,
        password
      };
    }

    return {
      error: t('Invalid email or password. Please try again.'),
      email,
      password
    };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    const failureState = isAdminArea
      ? registerBreakGlassPasswordFailure({ email, ipAddress })
      : null;
    if (failureState?.isBreakGlassUser) {
      await auditBreakGlassSignInEvent({
        action: 'failed',
        status: 'warning',
        reason: 'invalid_password',
        email,
        source: signInSource,
        ipAddress,
        metadata: {
          authArea,
          attempts: failureState.attempts,
          maxAttempts: failureState.maxAttempts
        }
      });
      if (failureState.isLocked) {
        await auditBreakGlassSignInEvent({
          action: 'lockout',
          status: 'failed',
          reason: 'locked_out',
          email,
          source: signInSource,
          ipAddress,
          metadata: {
            authArea,
            attempts: failureState.attempts,
            retryAfterSeconds: failureState.retryAfterSeconds,
            lockoutUntil: failureState.lockoutUntilIso
          }
        });
      }
    }

    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      {
        email,
        reason:
          failureState?.isLocked === true
            ? 'break_glass_locked_out'
            : 'invalid_password'
      },
      { source: signInSource }
    );
    await auditPasswordSignInEvent({
      action: failureState?.isLocked ? 'lockout' : 'failed',
      status: failureState?.isLocked ? 'failed' : 'warning',
      reason:
        failureState?.isLocked === true
          ? 'break_glass_locked_out'
          : 'invalid_password',
      email,
      source: signInSource,
      ipAddress,
      metadata: {
        authArea
      }
    });

    if (failureState?.isLocked) {
      return {
        error: t('Too many failed attempts. Try again later or use passkey sign-in.'),
        email,
        password
      };
    }

    return {
      error: t('Invalid email or password. Please try again.'),
      email,
      password
    };
  }

  if (foundUser.deletedAt) {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: 'account_deleted' },
      { source: signInSource }
    );
    await auditPasswordSignInEvent({
      action: 'failed',
      status: 'warning',
      reason: 'account_deleted',
      email,
      source: signInSource,
      ipAddress,
      metadata: {
        authArea
      }
    });
    return {
      error: t('This account has been deleted. Contact support for assistance.'),
      email,
      password
    };
  }

  if (foundUser.accountStatus === 'banned') {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: 'account_banned' },
      { source: signInSource }
    );
    await auditPasswordSignInEvent({
      action: 'failed',
      status: 'warning',
      reason: 'account_banned',
      email,
      source: signInSource,
      ipAddress,
      actorUserId: foundUser.id,
      actorRole: foundUser.role,
      metadata: {
        authArea
      }
    });
    return {
      error: t('This account is banned. Contact support for assistance.'),
      email,
      password
    };
  }

  if (foundUser.accountStatus === 'suspended') {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: 'account_suspended' },
      { source: signInSource }
    );
    await auditPasswordSignInEvent({
      action: 'failed',
      status: 'warning',
      reason: 'account_suspended',
      email,
      source: signInSource,
      ipAddress,
      actorUserId: foundUser.id,
      actorRole: foundUser.role,
      metadata: {
        authArea
      }
    });
    return {
      error: t('This account is suspended. Contact support for assistance.'),
      email,
      password
    };
  }

  if (isAdminArea) {
    clearBreakGlassPasswordFailureState({ email, ipAddress });
  }

  const canAccessAdmin = enrichUser(foundUser).isAdmin();
  if (authArea === 'admin' && !canAccessAdmin) {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: 'admin_access_required' },
      { source: signInSource }
    );
    await auditPasswordSignInEvent({
      action: 'blocked',
      status: 'warning',
      reason: 'admin_access_required',
      email,
      source: signInSource,
      ipAddress,
      actorUserId: foundUser.id,
      actorRole: foundUser.role,
      metadata: {
        authArea
      }
    });
    return {
      error: t('This account does not have admin access. Sign in from /login instead.'),
      email,
      password
    };
  }

  if (breakGlassDecision?.isBreakGlassUser) {
    await auditBreakGlassSignInEvent({
      action: 'success',
      status: 'warning',
      reason: 'password_sign_in_allowed',
      email,
      source: signInSource,
      ipAddress,
      metadata: {
        authArea
      }
    });
  }

  await Promise.all([
    setSession(foundUser, {
      ipAddress,
      userAgent,
      metadata: {
        authArea
      }
    }),
    logActivity(
      foundTeam?.id,
      foundUser.id,
      ActivityType.SIGN_IN,
      ipAddress ?? undefined
    )
  ]);

  await emitEventAsync(
    EVENT_HOOKS.authSignInSuccess,
    { userId: foundUser.id, teamId: foundTeam?.id ?? null },
    {
      actorUserId: foundUser.id,
      actorEmail: foundUser.email,
      actorRole: foundUser.role,
      teamId: foundTeam?.id ?? null,
      source: signInSource
    }
  );
  await auditPasswordSignInEvent({
    action: 'success',
    status: 'success',
    reason: 'password_sign_in_allowed',
    email: foundUser.email,
    source: signInSource,
    ipAddress,
    actorUserId: foundUser.id,
    actorRole: foundUser.role,
    metadata: {
      authArea,
      teamId: foundTeam?.id ?? null
    }
  });

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const templateId = Number(formData.get('templateId'));
    if (!Number.isInteger(templateId) || templateId <= 0) {
      redirect('/pricing');
    }

    const template = await getSelfServiceSubscriptionTemplateById(templateId);
    if (!template) {
      redirect('/pricing');
    }

    return createCheckoutSession({ team: foundTeam, template });
  }

  redirect(resolveRoleRedirect(foundUser.role, authArea === 'admin' && canAccessAdmin));
}

export const signInDashboard = validatedAction(signInSchema, async (data, formData) =>
  signInByArea(data, formData, 'dashboard')
);

export const signInAdmin = validatedAction(signInSchema, async (data, formData) =>
  signInByArea(data, formData, 'admin')
);

// Backward-compatible alias used by existing login surface.
export const signIn = signInDashboard;

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;
  const teamsEnabled = areTeamsEnabled();
  const t = await getActionTranslator();
  const redirectTo = formData.get('redirect') as string | null;
  const requestedTemplateId = Number(formData.get('templateId'));
  const primarySignupScope = teamsEnabled ? 'organization' : 'user';
  let signupDefaultUserTemplate: { id: number; name: string } | null = null;
  let signupDefaultOrganizationTemplate: { id: number; name: string } | null =
    null;
  let skipCheckoutRedirectAfterSignUp = false;

  if (!isPasswordLoginAllowedForArea('dashboard')) {
    await emitEventAsync(
      EVENT_HOOKS.authSignUpFailed,
      { email, reason: 'password_method_disabled' },
      { source: '/sign-up' }
    );
    return {
      error: t('Account creation with password is disabled for this area.'),
      email,
      password
    };
  }

  if (inviteId && !teamsEnabled) {
    await emitEventAsync(
      EVENT_HOOKS.authSignUpFailed,
      { email, reason: 'teams_disabled' },
      { source: '/sign-up' }
    );
    return {
      error: t('Team invitations are disabled for this deployment.'),
      email,
      password
    };
  }

  await emitEventAsync(
    EVENT_HOOKS.authSignUpBeforeCreate,
    { email, inviteId: inviteId ?? null },
    { source: '/sign-up' }
  );

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    await emitEventAsync(
      EVENT_HOOKS.authSignUpFailed,
      { email, reason: 'email_exists' },
      { source: '/sign-up' }
    );
    return {
      error: t('Failed to create user. Please try again.'),
      email,
      password
    };
  }

  const passwordHash = await hashPassword(password);

  if (!inviteId) {
    const requestedTemplate =
      redirectTo === 'checkout' &&
      Number.isInteger(requestedTemplateId) &&
      requestedTemplateId > 0
        ? await getSelfServiceSubscriptionTemplateById(requestedTemplateId)
        : null;
    const primaryRequestedTemplate =
      requestedTemplate?.targetScope === primarySignupScope ? requestedTemplate : null;

    if (primaryRequestedTemplate) {
      if (primaryRequestedTemplate.priceCents > 0) {
        const startedCheckout = await createSignupIntentCheckout({
          email,
          passwordHash,
          targetScope: primarySignupScope,
          template: primaryRequestedTemplate,
          source: '/sign-up'
        });
        if (!startedCheckout) {
          await emitEventAsync(
            EVENT_HOOKS.authSignUpFailed,
            { email, reason: 'signup_paid_intent_create_failed' },
            { source: '/sign-up' }
          );
          return {
            error: t('Unable to prepare checkout. Please try again.'),
            email,
            password
          };
        }

        redirect(
          `/checkout/${encodeURIComponent(startedCheckout.checkoutOrder.checkoutToken)}`
        );
      }

      const selectedTemplate = {
        id: primaryRequestedTemplate.id,
        name: primaryRequestedTemplate.name
      };
      if (teamsEnabled) {
        signupDefaultOrganizationTemplate = selectedTemplate;
      } else {
        signupDefaultUserTemplate = selectedTemplate;
      }
      skipCheckoutRedirectAfterSignUp = true;
    } else {
      const signupFlow = await getSubscriptionSignupFlowForScope(primarySignupScope);

      if (signupFlow.mode === 'paid_checkout_required' && signupFlow.template) {
        const startedCheckout = await createSignupIntentCheckout({
          email,
          passwordHash,
          targetScope: primarySignupScope,
          template: signupFlow.template,
          source: '/sign-up'
        });
        if (!startedCheckout) {
          await emitEventAsync(
            EVENT_HOOKS.authSignUpFailed,
            { email, reason: 'signup_default_checkout_create_failed' },
            { source: '/sign-up' }
          );
          return {
            error: t('Unable to prepare checkout. Please try again.'),
            email,
            password
          };
        }

        redirect(
          `/checkout/${encodeURIComponent(startedCheckout.checkoutOrder.checkoutToken)}`
        );
      }

      if (signupFlow.mode === 'direct' && signupFlow.template) {
        if (teamsEnabled) {
          signupDefaultOrganizationTemplate = {
            id: signupFlow.template.id,
            name: signupFlow.template.name
          };
        } else {
          signupDefaultUserTemplate = {
            id: signupFlow.template.id,
            name: signupFlow.template.name
          };
        }
      }
    }
  }

  const SIGN_UP_FAILURE = {
    invalidInvite: 'invalid_invite',
    userCreateFailed: 'user_create_failed',
    teamCreateFailed: 'team_create_failed',
    teamMemberLimitReached: 'team_member_limit_reached'
  } as const;

  let teamId: number | null = null;
  let createdTeam: typeof teams.$inferSelect | null = null;
  let createdUser: User | null = null;
  let acceptedInvitationId: number | null = null;
  let createdNewTeam = false;

  try {
    const provisioned = await db.transaction(async (tx) => {
      let resolvedTeamId: number | null = null;
      let resolvedUserRole = 'owner';
      let resolvedTeam: typeof teams.$inferSelect | null = null;
      let invitationRecord: typeof invitations.$inferSelect | null = null;

      if (inviteId) {
        [invitationRecord] = await tx
          .select()
          .from(invitations)
          .where(
            and(
              eq(invitations.id, parseInt(inviteId, 10)),
              eq(invitations.email, email),
              eq(invitations.status, 'pending')
            )
          )
          .limit(1);

        if (!invitationRecord) {
          throw new Error(SIGN_UP_FAILURE.invalidInvite);
        }

        resolvedTeamId = invitationRecord.teamId;
        resolvedUserRole = invitationRecord.role;

        [resolvedTeam] = await tx
          .select()
          .from(teams)
          .where(eq(teams.id, resolvedTeamId))
          .limit(1);

        if (!resolvedTeam) {
          throw new Error(SIGN_UP_FAILURE.invalidInvite);
        }
      }

      const newUser: NewUser = {
        email,
        passwordHash,
        role: 'owner'
      };

      const [insertedUser] = await tx.insert(users).values(newUser).returning();
      if (!insertedUser) {
        throw new Error(SIGN_UP_FAILURE.userCreateFailed);
      }

      await activateInitialSignupSubscriptionAssignment(
        {
          executor: tx,
          targetType: 'user',
          targetId: insertedUser.id,
          template: signupDefaultUserTemplate
        },
      );

      if (!invitationRecord && teamsEnabled) {
        const newTeam: NewTeam = {
          name: buildDefaultTeamNameFromEmail(email)
        };

        [resolvedTeam] = await tx.insert(teams).values(newTeam).returning();
        if (!resolvedTeam) {
          throw new Error(SIGN_UP_FAILURE.teamCreateFailed);
        }

        resolvedTeamId = resolvedTeam.id;
        resolvedUserRole = 'owner';
        createdNewTeam = true;

        await activateInitialSignupSubscriptionAssignment(
          {
            executor: tx,
            targetType: 'team',
            targetId: resolvedTeam.id,
            template: signupDefaultOrganizationTemplate
          },
        );
      }

      if (resolvedTeamId !== null) {
        if (invitationRecord) {
          const [teamMemberCountRow, maxMembers] = await Promise.all([
            tx
              .select({
                count: sql<number>`cast(count(*) as int)`
              })
              .from(teamMembers)
              .where(eq(teamMembers.teamId, resolvedTeamId))
              .limit(1),
            getTeamMemberLimitForSignUpInvitation({
              executor: tx,
              teamId: resolvedTeamId
            })
          ]);

          const currentMemberCount = teamMemberCountRow[0]?.count ?? 0;
          if (
            !canAddTeamMemberBySubscription({
              currentMemberCount,
              maxMembers
            })
          ) {
            throw new Error(SIGN_UP_FAILURE.teamMemberLimitReached);
          }
        }

        const newTeamMember: NewTeamMember = {
          userId: insertedUser.id,
          teamId: resolvedTeamId,
          role: resolvedUserRole
        };

        await tx.insert(teamMembers).values(newTeamMember);
      }

      if (invitationRecord) {
        await tx
          .update(invitations)
          .set({ status: 'accepted' })
          .where(eq(invitations.id, invitationRecord.id));

        await logActivity(
          resolvedTeamId,
          insertedUser.id,
          ActivityType.ACCEPT_INVITATION,
          undefined,
          { executor: tx }
        );
      }

      if (createdNewTeam) {
        await logActivity(
          resolvedTeamId,
          insertedUser.id,
          ActivityType.CREATE_TEAM,
          undefined,
          { executor: tx }
        );
      }

      await logActivity(
        resolvedTeamId,
        insertedUser.id,
        ActivityType.SIGN_UP,
        undefined,
        { executor: tx }
      );

      return {
        createdUser: insertedUser,
        createdTeam: resolvedTeam,
        teamId: resolvedTeamId,
        invitationId: invitationRecord?.id ?? null,
        createdNewTeam
      };
    });

    createdUser = provisioned.createdUser;
    createdTeam = provisioned.createdTeam;
    teamId = provisioned.teamId;
    acceptedInvitationId = provisioned.invitationId;
    createdNewTeam = provisioned.createdNewTeam;
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : SIGN_UP_FAILURE.userCreateFailed;

    if (reason === SIGN_UP_FAILURE.invalidInvite) {
      return {
        error: t('Invalid or expired invitation.'),
        email,
        password
      };
    }

    if (reason === SIGN_UP_FAILURE.teamMemberLimitReached) {
      return {
        error: t('This team has reached its member limit.'),
        email,
        password
      };
    }

    await emitEventAsync(
      EVENT_HOOKS.authSignUpFailed,
      { email, reason },
      { source: '/sign-up' }
    );
    return {
      error: t('Failed to create user. Please try again.'),
      email,
      password
    };
  }

  if (!createdUser) {
    await emitEventAsync(
      EVENT_HOOKS.authSignUpFailed,
      { email, reason: SIGN_UP_FAILURE.userCreateFailed },
      { source: '/sign-up' }
    );
    return {
      error: t('Failed to create user. Please try again.'),
      email,
      password
    };
  }

  await setSession(createdUser);

  if (acceptedInvitationId && teamId !== null) {
    await emitEventAsync(
      EVENT_HOOKS.authInvitationAccepted,
      {
        inviteId: acceptedInvitationId,
        teamId,
        userId: createdUser.id,
        email
      },
      {
        actorUserId: createdUser.id,
        actorEmail: createdUser.email,
        actorRole: createdUser.role,
        teamId,
        source: '/sign-up'
      }
    );
  }

  if (createdNewTeam && teamId !== null) {
    await emitEventAsync(
      EVENT_HOOKS.authTeamCreated,
      { teamId, teamName: createdTeam?.name ?? null, userId: createdUser.id },
      {
        actorUserId: createdUser.id,
        actorEmail: createdUser.email,
        actorRole: createdUser.role,
        teamId,
        source: '/sign-up'
      }
    );

    await emitEventAsync(
      EVENT_HOOKS.dashboardTeamsCreated,
      { teamId, teamName: createdTeam?.name ?? null, userId: createdUser.id },
      {
        actorUserId: createdUser.id,
        actorEmail: createdUser.email,
        actorRole: createdUser.role,
        teamId,
        source: '/sign-up'
      }
    );
  }

  await emitEventAsync(
    EVENT_HOOKS.authSignUpCreated,
    {
      userId: createdUser.id,
      teamId,
      inviteId: inviteId ?? null
    },
    {
      actorUserId: createdUser.id,
      actorEmail: createdUser.email,
      actorRole: createdUser.role,
      teamId,
      source: '/sign-up'
    }
  );

  if (redirectTo === 'checkout' && !skipCheckoutRedirectAfterSignUp) {
    const templateId = Number(formData.get('templateId'));
    if (!Number.isInteger(templateId) || templateId <= 0) {
      redirect('/pricing');
    }

    const template = await getSelfServiceSubscriptionTemplateById(templateId);
    if (!template) {
      redirect('/pricing');
    }

    if (!createdTeam) {
      redirect('/pricing');
    }

    return createCheckoutSession({ team: createdTeam, template });
  }

  redirect('/dashboard');
});

export async function signOut() {
  const user = await getUser();

  if (user) {
    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
    await emitEventAsync(
      EVENT_HOOKS.authSignOut,
      { userId: user.id, teamId: userWithTeam?.teamId ?? null },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: userWithTeam?.teamId ?? null,
        source: '/sign-out'
      }
    );
  }

  await clearSession({ reason: 'manual_sign_out' });
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id))
      await logActivity(
        userWithTeam?.teamId,
        user.id,
        ActivityType.UPDATE_PASSWORD,
        undefined,
        { executor: tx }
      )
    })

    await emitEventAsync(
      EVENT_HOOKS.dashboardAccountPasswordUpdated,
      { userId: user.id },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: userWithTeam?.teamId ?? null,
        source: '/dashboard/security'
      }
    );

    return {
      success: 'Password updated successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await db.transaction(async (tx) => {
      await logActivity(
        userWithTeam?.teamId,
        user.id,
        ActivityType.DELETE_ACCOUNT,
        undefined,
        { executor: tx }
      )

      await tx
        .update(users)
        .set({
          deletedAt: sql`CURRENT_TIMESTAMP`,
          email: buildSoftDeletedEmailSql()
        })
        .where(eq(users.id, user.id))

      if (userWithTeam?.teamId) {
        await tx
          .delete(teamMembers)
          .where(
            and(
              eq(teamMembers.userId, user.id),
              eq(teamMembers.teamId, userWithTeam.teamId)
            )
          )
      }
    })

    await clearSession({ reason: 'account_deleted' });

    await emitEventAsync(
      EVENT_HOOKS.dashboardAccountDeleted,
      { userId: user.id },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: userWithTeam?.teamId ?? null,
        source: '/dashboard/security'
      }
    );
    redirect('/login');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await db.transaction(async (tx) => {
      await tx.update(users).set({ name, email }).where(eq(users.id, user.id))
      await logActivity(
        userWithTeam?.teamId,
        user.id,
        ActivityType.UPDATE_ACCOUNT,
        undefined,
        { executor: tx }
      )
    })

    await emitEventAsync(
      EVENT_HOOKS.dashboardAccountUpdated,
      { userId: user.id, name, email },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: userWithTeam?.teamId ?? null,
        source: '/dashboard/general'
      }
    );

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    await emitEventAsync(
      EVENT_HOOKS.dashboardTeamMemberRemoved,
      { teamId: userWithTeam.teamId, memberId },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: userWithTeam.teamId,
        source: '/dashboard'
      }
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    const [teamRow] = await db
      .select({
        name: teams.name
      })
      .from(teams)
      .where(eq(teams.id, userWithTeam.teamId))
      .limit(1);

    // Create a new invitation
    const [createdInvitation] = await db
      .insert(invitations)
      .values({
        teamId: userWithTeam.teamId,
        email,
        role,
        invitedBy: user.id,
        status: 'pending'
      })
      .returning({
        id: invitations.id
      });

    if (!createdInvitation) {
      return { error: 'Failed to create invitation. Please try again.' };
    }

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    await emitEventAsync(
      EVENT_HOOKS.dashboardTeamMemberInvited,
      { teamId: userWithTeam.teamId, email, role },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: userWithTeam.teamId,
        source: '/dashboard'
      }
    );

    try {
      await sendTeamInvitationEmail({
        inviteId: createdInvitation.id,
        recipientEmail: email,
        role,
        teamName: teamRow?.name ?? null,
        inviterName: user.name ?? user.email
      });
    } catch (error) {
      console.error('Failed to send invitation email', {
        teamId: userWithTeam.teamId,
        inviteId: createdInvitation.id,
        email,
        error
      });
    }

    return { success: 'Invitation sent successfully' };
  }
);

const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const requestPasswordReset = validatedAction(
  requestPasswordResetSchema,
  async (data) => {
    const { email } = data;

    // Always return the same message to avoid leaking whether the email exists
    const genericSuccess = {
      success: 'If an account with that email exists, a reset link has been sent.'
    };

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      return genericSuccess;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    await emitEventAsync(
      EVENT_HOOKS.authPasswordResetRequested,
      { userId: user.id, email: user.email },
      {
        actorEmail: user.email,
        source: '/forgot-password'
      }
    );

    try {
      await sendPasswordResetEmail({
        token,
        recipientEmail: user.email,
        recipientUserId: user.id,
        expiresInMinutes: 60
      });
    } catch (error) {
      console.error('Failed to send password reset email', {
        userId: user.id,
        error
      });
    }

    return genericSuccess;
  }
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const resetPassword = validatedAction(
  resetPasswordSchema,
  async (data) => {
    const { token, newPassword, confirmPassword } = data;

    if (newPassword !== confirmPassword) {
      return {
        token,
        newPassword,
        confirmPassword,
        error: 'Passwords do not match.'
      };
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!resetToken) {
      return {
        token,
        newPassword,
        confirmPassword,
        error: 'This reset link is invalid or has expired.'
      };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash, updatedAt: now })
        .where(eq(users.id, resetToken.userId)),
      db
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.id, resetToken.id))
    ]);

    await emitEventAsync(
      EVENT_HOOKS.authPasswordResetCompleted,
      { userId: resetToken.userId },
      {
        source: '/reset-password'
      }
    );

    redirect('/login?reset=1');
  }
);
