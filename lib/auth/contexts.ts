import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers, type User } from '@/lib/db/schema';
import { areTeamsEnabled } from '@/lib/organizations/config';
import { enrichUser } from '@skitsaas/sdk';
import type { RoleContextAffinity } from '@/lib/runtime-config/types';
import appConfig from '@/app.config';

// UserContext is now defined in the SDK — re-exported here for backwards compat.
export type { UserContext } from '@skitsaas/sdk';
import type { UserContext } from '@skitsaas/sdk';

function getRoleContextAffinity(role: string): RoleContextAffinity | null {
  return appConfig.roles?.contextAffinity?.[role] ?? null;
}

type AuthenticatedDashboardContext = Exclude<UserContext, { type: 'public' }>;
type TeamDashboardContext = Extract<UserContext, { type: 'team_member' }>;
type StandaloneDashboardContext = Extract<UserContext, { type: 'standalone' }>;

export const authContextInternals = {
  async getTeamMembership(userId: number) {
    return db.query.teamMembers.findFirst({
      columns: {
        teamId: true,
        role: true
      },
      where: eq(teamMembers.userId, userId)
    });
  }
};

export async function getUserContext(user: User | null): Promise<UserContext> {
  if (!user) {
    return { type: 'public' };
  }

  // Admin-area roles always resolve to system_admin regardless of team membership.
  if (enrichUser(user).isAdmin()) {
    return { type: 'system_admin' };
  }

  // Respect contextAffinity declared in app.config.ts → roles.contextAffinity.
  const affinity = getRoleContextAffinity(user.role);

  if (affinity === 'standalone') {
    return { type: 'standalone', userId: user.id };
  }

  if (affinity === 'team_member') {
    // Role requires team context; fall back to standalone if not in a team.
    if (areTeamsEnabled()) {
      const teamMembership = await authContextInternals.getTeamMembership(user.id);
      if (teamMembership) {
        return {
          type: 'team_member',
          teamId: teamMembership.teamId,
          memberRole: teamMembership.role
        };
      }
    }
    return { type: 'standalone', userId: user.id };
  }

  // Default: detect context from team membership.
  if (!areTeamsEnabled()) {
    return { type: 'standalone', userId: user.id };
  }

  const teamMembership = await authContextInternals.getTeamMembership(user.id);
  if (teamMembership) {
    return {
      type: 'team_member',
      teamId: teamMembership.teamId,
      memberRole: teamMembership.role
    };
  }

  return { type: 'standalone', userId: user.id };
}

function redirectForInvalidDashboardContext(context: UserContext): never {
  if (context.type === 'system_admin') {
    redirect('/admin');
  }

  if (context.type === 'public') {
    redirect('/login');
  }

  redirect('/dashboard');
}

export async function requireAnyDashboardAccess(): Promise<{
  user: User;
  context: AuthenticatedDashboardContext;
}> {
  await connection();

  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const context = await getUserContext(user);
  if (context.type === 'public') {
    redirect('/login');
  }

  return {
    user,
    context
  };
}

export async function requireTeamDashboardAccess(): Promise<{
  user: User;
  context: TeamDashboardContext;
}> {
  const { user, context } = await requireAnyDashboardAccess();
  if (context.type !== 'team_member') {
    redirectForInvalidDashboardContext(context);
  }

  return {
    user,
    context
  };
}

export async function requireStandaloneDashboardAccess(): Promise<{
  user: User;
  context: StandaloneDashboardContext;
}> {
  const { user, context } = await requireAnyDashboardAccess();
  if (context.type !== 'standalone') {
    redirectForInvalidDashboardContext(context);
  }

  return {
    user,
    context
  };
}
