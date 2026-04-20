import { db } from '@/lib/db/drizzle';
import { activityLogs, type ActivityType } from '@/lib/db/schema';

export async function createDashboardActivityLog({
  teamId,
  userId,
  action,
  ipAddress = '',
  executor
}: {
  teamId: number | null | undefined;
  userId: number;
  action: ActivityType;
  ipAddress?: string;
  executor?: Pick<typeof db, 'insert'>;
}) {
  if (teamId === null || teamId === undefined) {
    return;
  }

  const targetExecutor = executor ?? db;

  await targetExecutor.insert(activityLogs).values({
    teamId,
    userId,
    action,
    ipAddress
  });
}
