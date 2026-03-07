'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { comparePasswords, hashPassword, clearSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getUserWithTeam } from '@/lib/db/queries';
import { ActivityType, teamMembers, users } from '@/lib/db/schema';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { createDashboardActivityLog } from '../account-activity';
import {
  createDashboardAccountInvalidFactory,
  dashboardAccountValidationMessage
} from '../account-validation';
import { dashboardValidatedAction, revalidateDashboardRoot } from '../controller';
import {
  createDashboardDeleteAccountBuildFormBase,
  createDashboardUpdatePasswordBuildFormBase
} from './forms';

function revalidateDashboardSecurity() {
  revalidatePath('/dashboard/security');
}

const dashboardUpdatePasswordBuildForm =
  createDashboardUpdatePasswordBuildFormBase();
const dashboardDeleteAccountBuildForm =
  createDashboardDeleteAccountBuildFormBase();

export const updatePassword = dashboardValidatedAction(
  dashboardUpdatePasswordBuildForm,
  async ({ user, values }) => {
    const invalid = await createDashboardAccountInvalidFactory(values);
    const currentPassword =
      typeof values.currentPassword === 'string' ? values.currentPassword : '';
    const newPassword =
      typeof values.newPassword === 'string' ? values.newPassword : '';

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return invalid(
        {
          currentPassword: [
            dashboardAccountValidationMessage.currentPasswordInvalid()
          ]
        }
      );
    }

    if (currentPassword === newPassword) {
      return invalid(
        {
          newPassword: [dashboardAccountValidationMessage.newPasswordSame()]
        }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      createDashboardActivityLog({
        teamId: userWithTeam?.teamId,
        userId: user.id,
        action: ActivityType.UPDATE_PASSWORD
      })
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
  },
  {
    revalidate: [revalidateDashboardRoot, revalidateDashboardSecurity]
  }
);

export const deleteAccount = dashboardValidatedAction(
  dashboardDeleteAccountBuildForm,
  async ({ user, values }) => {
    const invalid = await createDashboardAccountInvalidFactory(values);
    const password = typeof values.password === 'string' ? values.password : '';

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return invalid(
        {
          password: [dashboardAccountValidationMessage.deletePasswordInvalid()]
        }
      );
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await createDashboardActivityLog({
      teamId: userWithTeam?.teamId,
      userId: user.id,
      action: ActivityType.DELETE_ACCOUNT
    });

    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`
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
