'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  normalizeEmail,
  parseOptionalPositiveInt
} from '@skitsaas/sdk';
import { db } from '@/lib/db/drizzle';
import { getUserWithTeam } from '@/lib/db/queries';
import { ActivityType, users } from '@/lib/db/schema';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { createDashboardActivityLog } from '../account-activity';
import {
  createDashboardAccountInvalidFactory,
  dashboardAccountValidationMessage
} from '../account-validation';
import { dashboardValidatedAction, revalidateDashboardRoot } from '../controller';
import { createDashboardUpdateAccountBuildFormBase } from './forms';

function revalidateDashboardGeneral() {
  revalidatePath('/dashboard/general');
}

const dashboardUpdateAccountBuildForm =
  createDashboardUpdateAccountBuildFormBase();

export const updateAccount = dashboardValidatedAction(
  dashboardUpdateAccountBuildForm,
  async ({ user, values }) => {
    const invalid = await createDashboardAccountInvalidFactory(values);
    const userIdPayload = parseOptionalPositiveInt(values.userId);
    const userId = userIdPayload.value;
    const name = typeof values.name === 'string' ? values.name.trim() : '';
    const email = normalizeEmail(values.email);

    if (!userIdPayload.valid || userId !== user.id) {
      return invalid({}, dashboardAccountValidationMessage.requestInvalid());
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      createDashboardActivityLog({
        teamId: userWithTeam?.teamId,
        userId: user.id,
        action: ActivityType.UPDATE_ACCOUNT
      })
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
  },
  {
    revalidate: [revalidateDashboardRoot, revalidateDashboardGeneral]
  }
);
