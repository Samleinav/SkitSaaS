'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import {
  getActiveUserSubscriptionAssignment,
  getSubscriptionTemplateById
} from '@/lib/db/queries';
import { teamMembers, teams, users } from '@/lib/db/schema';
import {
  activateSubscriptionAssignment,
  suspendSubscriptionAssignment
} from '@/lib/payments/subscription-assignments';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  USER_ACCOUNT_STATUSES,
  USER_ROLES,
  revalidateAdminUsers,
  revalidateDashboard
} from '../actions/shared';
import { adminAction } from '../controller';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function parseOptionalTemplateId(raw: string) {
  if (!raw) {
    return { value: null, valid: true } as const;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { value: null, valid: false } as const;
  }

  return { value: parsed, valid: true } as const;
}

function parseOptionalUserId(raw: string) {
  if (!raw) {
    return { value: null, valid: true } as const;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { value: null, valid: false } as const;
  }

  return { value: parsed, valid: true } as const;
}

async function resolveUserSubscriptionTemplate(templateId: number | null) {
  if (!templateId) {
    return null;
  }

  const template = await getSubscriptionTemplateById(templateId);
  if (!template || template.targetScope !== 'user') {
    return null;
  }

  return template;
}

function buildDefaultTeamName({
  name,
  email
}: {
  name: string;
  email: string;
}) {
  const nameSeed =
    name.trim() || email.split('@')[0]?.trim() || email.trim() || 'New user';

  return `${nameSeed.slice(0, 80)}'s Team`;
}

export const createUserAction = adminAction(
  async ({ user: currentUser, form }) => {
    const name = form.string('name');
    const email = normalizeEmail(form.string('email'));
    const password = form.string('password');
    const role = form.lower('role');
    const templateIdPayload = parseOptionalTemplateId(
      form.string('subscriptionTemplateId')
    );

    if (
      !email ||
      !EMAIL_REGEX.test(email) ||
      password.length < 8 ||
      !USER_ROLES.has(role) ||
      !templateIdPayload.valid
    ) {
      return false;
    }


    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      return false;
    }

    const template = await resolveUserSubscriptionTemplate(templateIdPayload.value);
    if (templateIdPayload.value && !template) {
      return false;
    }

    const passwordHash = await hashPassword(password);
    const teamName = buildDefaultTeamName({ name, email });

    let createdUserId = 0;

    await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          name: name || null,
          email,
          passwordHash,
          role,
          accountStatus: 'active',
          statusReason: null,
          updatedAt: new Date()
        })
        .returning({
          id: users.id
        });

      const [createdTeam] = await tx
        .insert(teams)
        .values({
          name: teamName,
          updatedAt: new Date()
        })
        .returning({ id: teams.id });

      await tx.insert(teamMembers).values({
        userId: createdUser.id,
        teamId: createdTeam.id,
        role: 'owner',
        joinedAt: new Date()
      });

      createdUserId = createdUser.id;
    });

    if (template?.id) {
      await activateSubscriptionAssignment({
        targetType: 'user',
        targetId: createdUserId,
        subscriptionTemplateId: template.id,
        paymentProvider: null,
        providerReferenceId: null,
        providerPlanId: null,
        status: 'active',
        planName: template.name,
        sourceOrderId: null
      });
    }

    await createSysActivityLog({
      eventType: 'admin.users.create',
      eventCategory: 'admin',
      action: 'create',
      status: 'success',
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetUserId: createdUserId,
      entityType: 'user',
      entityId: String(createdUserId),
      source: '/admin/users',
      message: 'Admin created a user account.',
      metadata: {
        role,
        subscriptionTemplateId: template?.id || null
      }
    });

    await emitEventAsync(
      EVENT_HOOKS.adminUsersCreated,
      {
        userId: createdUserId,
        role,
        subscriptionTemplateId: template?.id || null
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetUserId: createdUserId,
        source: '/admin/users'
      }
    );

    revalidatePath(`/admin/users/${createdUserId}`);
  },
  {
    revalidate: [revalidateAdminUsers, revalidateDashboard]
  }
);

export const updateUserProfileAction = adminAction(
  async ({ user: currentUser, form }) => {
    const userId = form.positiveInt('userId');
    const name = form.string('name');
    const email = normalizeEmail(form.string('email'));
    const role = form.lower('role');
    const templateIdPayload = parseOptionalTemplateId(
      form.string('subscriptionTemplateId')
    );

    if (
      !userId ||
      !email ||
      !EMAIL_REGEX.test(email) ||
      !USER_ROLES.has(role) ||
      !templateIdPayload.valid
    ) {
      return false;
    }

    if (currentUser.id === userId && role === 'member') {
      return false;
    }

    const targetUser = await db
      .select({
        id: users.id,
        deletedAt: users.deletedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUser.length === 0 || targetUser[0].deletedAt) {
      return false;
    }

    const emailInUse = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, userId)))
      .limit(1);

    if (emailInUse.length > 0) {
      return false;
    }

    const template = await resolveUserSubscriptionTemplate(templateIdPayload.value);
    if (templateIdPayload.value && !template) {
      return false;
    }

    await db
      .update(users)
      .set({
        name: name || null,
        email,
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    const currentAssignment = await getActiveUserSubscriptionAssignment(userId);
    const nextSubscriptionTemplateId = template?.id || null;

    if (
      nextSubscriptionTemplateId !==
      (currentAssignment?.subscriptionTemplateId ?? null)
    ) {
      if (nextSubscriptionTemplateId && template) {
        await activateSubscriptionAssignment({
          targetType: 'user',
          targetId: userId,
          subscriptionTemplateId: nextSubscriptionTemplateId,
          paymentProvider: currentAssignment?.paymentProvider ?? null,
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
    }

    await createSysActivityLog({
      eventType: 'admin.users.update',
      eventCategory: 'admin',
      action: 'update',
      status: 'success',
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetUserId: userId,
      entityType: 'user',
      entityId: String(userId),
      source: `/admin/users/${userId}`,
      message: 'Admin updated user profile settings.',
      metadata: {
        role,
        subscriptionTemplateId: template?.id || null
      }
    });

    await emitEventAsync(
      EVENT_HOOKS.adminUsersUpdated,
      {
        userId,
        role,
        subscriptionTemplateId: template?.id || null
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetUserId: userId,
        source: `/admin/users/${userId}`
      }
    );

    revalidatePath(`/admin/users/${userId}`);
  },
  {
    revalidate: [revalidateAdminUsers, revalidateDashboard]
  }
);

export const updateUserAccountStatusAction = adminAction(
  async ({ user: currentUser, form }) => {
    const userId = form.positiveInt('userId');
    const accountStatus = form.lower('accountStatus');
    const statusReason = form.string('statusReason');

    if (!userId || !USER_ACCOUNT_STATUSES.has(accountStatus)) {
      return false;
    }

    if (currentUser.id === userId && accountStatus !== 'active') {
      return false;
    }

    const targetUser = await db
      .select({
        id: users.id,
        deletedAt: users.deletedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUser.length === 0 || targetUser[0].deletedAt) {
      return false;
    }

    const normalizedReason =
      accountStatus === 'active' ? null : statusReason || null;

    await db
      .update(users)
      .set({
        accountStatus,
        statusReason: normalizedReason,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    await createSysActivityLog({
      eventType: `admin.users.${accountStatus}`,
      eventCategory: 'admin',
      action: 'update',
      status: accountStatus === 'active' ? 'success' : 'warning',
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetUserId: userId,
      entityType: 'user',
      entityId: String(userId),
      source: `/admin/users/${userId}`,
      message: 'Admin updated user account status.',
      metadata: {
        accountStatus,
        statusReason: normalizedReason
      }
    });

    await emitEventAsync(
      EVENT_HOOKS.adminUsersStatusChanged,
      { userId, accountStatus, statusReason: normalizedReason },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetUserId: userId,
        source: `/admin/users/${userId}`
      }
    );

    revalidatePath(`/admin/users/${userId}`);
  },
  {
    revalidate: [revalidateAdminUsers, revalidateDashboard]
  }
);

export const deleteUserAction = adminAction(
  async ({ user: currentUser, form }) => {
    const userId = form.positiveInt('userId');
    const transferUserPayload = parseOptionalUserId(form.string('transferUserId'));
    const statusReason = form.string('statusReason');

    if (!userId || !transferUserPayload.valid) {
      return false;
    }

    const transferUserId = transferUserPayload.value;

    if (currentUser.id === userId) {
      return false;
    }

    if (transferUserId && transferUserId === userId) {
      return false;
    }

    const [targetUser] = await db
      .select({
        id: users.id,
        deletedAt: users.deletedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser || targetUser.deletedAt) {
      return false;
    }

    const ownedTeams = await db
      .select({
        teamId: teamMembers.teamId
      })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.role, 'owner')));

    if (ownedTeams.length > 0 && !transferUserId) {
      return false;
    }

    if (transferUserId) {
      const transferUser = await db
        .select({
          id: users.id
        })
        .from(users)
        .where(
          and(
            eq(users.id, transferUserId),
            isNull(users.deletedAt),
            eq(users.accountStatus, 'active')
          )
        )
        .limit(1);

      if (transferUser.length === 0) {
        return false;
      }
    }

    await db.transaction(async (tx) => {
      if (transferUserId) {
        for (const ownedTeam of ownedTeams) {
          const existingMembership = await tx
            .select({
              id: teamMembers.id,
              role: teamMembers.role
            })
            .from(teamMembers)
            .where(
              and(
                eq(teamMembers.userId, transferUserId),
                eq(teamMembers.teamId, ownedTeam.teamId)
              )
            )
            .limit(1);

          if (existingMembership.length > 0) {
            if (existingMembership[0].role !== 'owner') {
              await tx
                .update(teamMembers)
                .set({
                  role: 'owner'
                })
                .where(eq(teamMembers.id, existingMembership[0].id));
            }

            continue;
          }

          await tx.insert(teamMembers).values({
            userId: transferUserId,
            teamId: ownedTeam.teamId,
            role: 'owner',
            joinedAt: new Date()
          });
        }
      }

      await tx.delete(teamMembers).where(eq(teamMembers.userId, userId));

      await tx
        .update(users)
        .set({
          deletedAt: new Date(),
          accountStatus: 'banned',
          statusReason: statusReason || 'Deleted by admin',
          email: sql`CONCAT(${users.email}, '-', ${users.id}, '-deleted')`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    });

    const currentAssignment = await getActiveUserSubscriptionAssignment(userId);
    if (currentAssignment) {
      await suspendSubscriptionAssignment({
        targetType: 'user',
        targetId: userId,
        status: 'canceled',
        sourceOrderId: null
      });
    }

    await createSysActivityLog({
      eventType: 'admin.users.delete',
      eventCategory: 'admin',
      action: 'delete',
      status: 'warning',
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetUserId: userId,
      entityType: 'user',
      entityId: String(userId),
      source: `/admin/users/${userId}`,
      message: 'Admin soft-deleted user account.',
      metadata: {
        transferUserId,
        ownedTeamsTransferred: ownedTeams.length
      }
    });

    await emitEventAsync(
      EVENT_HOOKS.adminUsersDeleted,
      {
        userId,
        transferUserId,
        ownedTeamsTransferred: ownedTeams.length
      },
      {
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetUserId: userId,
        source: `/admin/users/${userId}`
      }
    );

    revalidatePath(`/admin/users/${userId}`);

    if (transferUserId) {
      revalidatePath(`/admin/users/${transferUserId}`);
    }
  },
  {
    revalidate: [revalidateAdminUsers, revalidateDashboard]
  }
);
