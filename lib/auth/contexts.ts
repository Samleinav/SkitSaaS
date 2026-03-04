import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers, type User } from '@/lib/db/schema';

export type UserContext =
  | { type: 'system_admin' }
  | { type: 'team_member'; teamId: number; memberRole: string }
  | { type: 'standalone'; userId: number }
  | { type: 'public' };

type AuthenticatedDashboardContext = Exclude<UserContext, { type: 'public' }>;
type TeamDashboardContext = Extract<UserContext, { type: 'team_member' }>;
type StandaloneDashboardContext = Extract<UserContext, { type: 'standalone' }>;

async function getTeamMembership(userId: number) {
  return db.query.teamMembers.findFirst({
    columns: {
      teamId: true,
      role: true
    },
    where: eq(teamMembers.userId, userId)
  });
}

export async function getUserContext(user: User | null): Promise<UserContext> {
  if (!user) {
    return { type: 'public' };
  }

  if (user.role === 'admin') {
    return { type: 'system_admin' };
  }

  const teamMembership = await getTeamMembership(user.id);
  if (teamMembership) {
    return {
      type: 'team_member',
      teamId: teamMembership.teamId,
      memberRole: teamMembership.role
    };
  }

  return {
    type: 'standalone',
    userId: user.id
  };
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
