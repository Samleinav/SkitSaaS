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
import {
  evaluateBreakGlassPasswordPolicy,
  registerBreakGlassPasswordFailure,
  clearBreakGlassPasswordFailureState,
  resolveClientIpAddress
} from '@/lib/auth/break-glass';
import { isPasswordLoginAllowedForArea } from '@/lib/auth/login-policy';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { sendTeamInvitationEmail } from '@/lib/email/invitations';
import {
  getSubscriptionTemplateById,
  getUser,
  getUserWithTeam
} from '@/lib/db/queries';
import { getActionTranslator } from '@/lib/i18n/server';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import { areTeamsEnabled } from '@/lib/organizations/config';

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
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
  await db.insert(activityLogs).values(newActivity);
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

  if (!isPasswordLoginAllowedForArea(authArea)) {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: 'password_method_disabled' },
      { source: signInSource }
    );
    return {
      error: t('Password sign-in is disabled for this area. Use an enabled provider.'),
      email,
      password
    };
  }

  const requestHeaders = await headers();
  const ipAddress = resolveClientIpAddress({
    xForwardedFor: requestHeaders.get('x-forwarded-for'),
    xRealIp: requestHeaders.get('x-real-ip')
  });
  const userAgent = requestHeaders.get('user-agent');
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
    return {
      error: t('This account is suspended. Contact support for assistance.'),
      email,
      password
    };
  }

  if (isAdminArea) {
    clearBreakGlassPasswordFailureState({ email, ipAddress });
  }

  const canAccessAdmin =
    foundUser.role === 'owner' || foundUser.role === 'admin';
  if (authArea === 'admin' && !canAccessAdmin) {
    await emitEventAsync(
      EVENT_HOOKS.authSignInFailed,
      { email, reason: 'admin_access_required' },
      { source: signInSource }
    );
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

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const templateId = Number(formData.get('templateId'));
    if (!Number.isInteger(templateId) || templateId <= 0) {
      redirect('/pricing');
    }

    const template = await getSubscriptionTemplateById(templateId);
    if (!template) {
      redirect('/pricing');
    }

    return createCheckoutSession({ team: foundTeam, template });
  }

  if (authArea === 'admin' && canAccessAdmin) {
    redirect('/admin');
  }

  redirect('/dashboard');
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

  const newUser: NewUser = {
    email,
    passwordHash,
    role: 'owner' // Default role, will be overridden if there's an invitation
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    await emitEventAsync(
      EVENT_HOOKS.authSignUpFailed,
      { email, reason: 'user_create_failed' },
      { source: '/sign-up' }
    );
    return {
      error: t('Failed to create user. Please try again.'),
      email,
      password
    };
  }

  let teamId: number | null = null;
  let userRole = 'owner';
  let createdTeam: typeof teams.$inferSelect | null = null;

  if (inviteId) {
    // Check if there's a valid invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(inviteId)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (invitation) {
      teamId = invitation.teamId;
      userRole = invitation.role;

      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));

      await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

      await emitEventAsync(
        EVENT_HOOKS.authInvitationAccepted,
        {
          inviteId: invitation.id,
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

      [createdTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
    } else {
      return {
        error: t('Invalid or expired invitation.'),
        email,
        password
      };
    }
  } else if (teamsEnabled) {
    // Create a new team if there's no invitation
    const newTeam: NewTeam = {
      name: `${email}'s Team`
    };

    [createdTeam] = await db.insert(teams).values(newTeam).returning();

    if (!createdTeam) {
      await emitEventAsync(
        EVENT_HOOKS.authSignUpFailed,
        { email, reason: 'team_create_failed' },
        { source: '/sign-up' }
      );
      return {
        error: t('Failed to create team. Please try again.'),
        email,
        password
      };
    }

    teamId = createdTeam.id;
    userRole = 'owner';

    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);

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

  const signUpOperations: Promise<unknown>[] = [
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
    setSession(createdUser)
  ];

  if (teamId !== null) {
    const newTeamMember: NewTeamMember = {
      userId: createdUser.id,
      teamId,
      role: userRole
    };
    signUpOperations.unshift(db.insert(teamMembers).values(newTeamMember));
  }

  await Promise.all(signUpOperations);

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

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const templateId = Number(formData.get('templateId'));
    if (!Number.isInteger(templateId) || templateId <= 0) {
      redirect('/pricing');
    }

    const template = await getSubscriptionTemplateById(templateId);
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
  const user = (await getUser()) as User;
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

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

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

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

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

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

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
