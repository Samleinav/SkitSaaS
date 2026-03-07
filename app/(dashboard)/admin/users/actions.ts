'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  buildFormValidationMessage,
  normalizeEmail,
  parseOptionalPositiveInt
} from '@skitsaas/sdk';
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
import { adminValidatedAction } from '../controller';
import {
  createAdminCreateUserBuildFormBase,
  createAdminDeleteUserBuildFormBase,
  createAdminEditUserStatusBuildFormBase,
  createAdminEditUserProfileBuildFormBase
} from './forms';
import {
  adminUserValidationMessage,
  createAdminUserInvalidFactory
} from './validation';

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

const adminCreateUserBuildForm = createAdminCreateUserBuildFormBase();
const adminDeleteUserBuildForm = createAdminDeleteUserBuildFormBase();
const adminEditUserProfileBuildForm = createAdminEditUserProfileBuildFormBase();
const adminEditUserStatusBuildForm = createAdminEditUserStatusBuildFormBase();

export const createUserAction = adminValidatedAction(
  adminCreateUserBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminUserInvalidFactory(values);
    const name = typeof values.name === 'string' ? values.name : '';
    const email = normalizeEmail(typeof values.email === 'string' ? values.email : '');
    const password =
      typeof values.password === 'string' ? values.password : '';
    const role = typeof values.role === 'string' ? values.role.trim().toLowerCase() : '';
    const templateIdPayload = parseOptionalPositiveInt(values.subscriptionTemplateId);

    if (!USER_ROLES.has(role)) {
      return invalid({
        role: [buildFormValidationMessage.invalidSelection('Role')]
      });
    }

    if (!templateIdPayload.valid) {
      return invalid({
        subscriptionTemplateId: [
          buildFormValidationMessage.invalidSelection('Subscription')
        ]
      });
    }

    const template = await resolveUserSubscriptionTemplate(templateIdPayload.value);
    if (templateIdPayload.value && !template) {
      return invalid({
        subscriptionTemplateId: [
          buildFormValidationMessage.recordNotFound('Subscription template')
        ]
      });
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

export const updateUserProfileAction = adminValidatedAction(
  adminEditUserProfileBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminUserInvalidFactory(values);
    const userIdPayload = parseOptionalPositiveInt(values.userId);
    const userId = userIdPayload.value;
    const name = typeof values.name === 'string' ? values.name : '';
    const email = normalizeEmail(typeof values.email === 'string' ? values.email : '');
    const role = typeof values.role === 'string' ? values.role.trim().toLowerCase() : '';
    const templateIdPayload = parseOptionalPositiveInt(values.subscriptionTemplateId);

    if (!userIdPayload.valid || !userId) {
      return invalid({
        userId: [buildFormValidationMessage.positiveInteger('User id')]
      });
    }

    if (!USER_ROLES.has(role)) {
      return invalid({
        role: [buildFormValidationMessage.invalidSelection('Role')]
      });
    }

    if (!templateIdPayload.valid) {
      return invalid({
        subscriptionTemplateId: [
          buildFormValidationMessage.invalidSelection('Subscription')
        ]
      });
    }

    if (currentUser.id === userId && role === 'member') {
      return invalid({
        role: [adminUserValidationMessage.selfDemote()]
      });
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
      return invalid({
        userId: [buildFormValidationMessage.recordNotFound('User')]
      });
    }

    const template = await resolveUserSubscriptionTemplate(templateIdPayload.value);
    if (templateIdPayload.value && !template) {
      return invalid({
        subscriptionTemplateId: [
          buildFormValidationMessage.recordNotFound('Subscription template')
        ]
      });
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

export const updateUserAccountStatusAction = adminValidatedAction(
  adminEditUserStatusBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminUserInvalidFactory(values);
    const userIdPayload = parseOptionalPositiveInt(values.userId);
    const userId = userIdPayload.value;
    const accountStatus =
      typeof values.accountStatus === 'string'
        ? values.accountStatus.trim().toLowerCase()
        : '';
    const statusReason =
      typeof values.statusReason === 'string' ? values.statusReason.trim() : '';

    if (!userIdPayload.valid || !userId) {
      return invalid({
        userId: [buildFormValidationMessage.positiveInteger('User id')]
      });
    }

    if (!USER_ACCOUNT_STATUSES.has(accountStatus)) {
      return invalid({
        accountStatus: [buildFormValidationMessage.invalidSelection('Account status')]
      });
    }

    if (currentUser.id === userId && accountStatus !== 'active') {
      return invalid({
        accountStatus: [adminUserValidationMessage.selfStatusChange()]
      });
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
      return invalid({
        userId: [buildFormValidationMessage.recordNotFound('User')]
      });
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

export const deleteUserAction = adminValidatedAction(
  adminDeleteUserBuildForm,
  async ({ user: currentUser, values }) => {
    const invalid = await createAdminUserInvalidFactory(values);
    const userIdPayload = parseOptionalPositiveInt(values.userId);
    const transferUserPayload = parseOptionalPositiveInt(values.transferUserId);
    const userId = userIdPayload.value;
    const statusReason =
      typeof values.statusReason === 'string' ? values.statusReason.trim() : '';

    if (!userIdPayload.valid || !userId) {
      return invalid({
        userId: [buildFormValidationMessage.positiveInteger('User id')]
      });
    }

    if (!transferUserPayload.valid) {
      return invalid({
        transferUserId: [buildFormValidationMessage.invalidSelection('Transfer user')]
      });
    }

    const transferUserId = transferUserPayload.value;

    if (currentUser.id === userId) {
      return invalid({
        userId: [adminUserValidationMessage.selfDelete()]
      });
    }

    if (transferUserId && transferUserId === userId) {
      return invalid({
        transferUserId: [adminUserValidationMessage.transferUserSameAsTarget()]
      });
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
      return invalid({
        userId: [buildFormValidationMessage.recordNotFound('User')]
      });
    }

    const ownedTeams = await db
      .select({
        teamId: teamMembers.teamId
      })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.role, 'owner')));

    if (ownedTeams.length > 0 && !transferUserId) {
      return invalid({
        transferUserId: [adminUserValidationMessage.transferUserRequired()]
      });
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
        return invalid({
          transferUserId: [adminUserValidationMessage.transferUserInactive()]
        });
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
