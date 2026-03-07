import { db } from '@/lib/db/drizzle';
import { activityLogs, type ActivityType } from '@/lib/db/schema';

export async function createDashboardActivityLog({
  teamId,
  userId,
  action,
  ipAddress = ''
}: {
  teamId: number | null | undefined;
  userId: number;
  action: ActivityType;
  ipAddress?: string;
}) {
  if (teamId === null || teamId === undefined) {
    return;
  }

  await db.insert(activityLogs).values({
    teamId,
    userId,
    action,
    ipAddress
  });
}
