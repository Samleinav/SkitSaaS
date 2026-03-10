import { NextResponse } from 'next/server';
import { parseJsonBody } from '@skitsaas/sdk/server';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { getUser } from '@/lib/db/queries';
import { dismissNotificationsForUser } from '@/lib/notifications/service';
import {
  normalizeNotificationIds,
  normalizeNotificationRuntimeArea
} from '../shared';

type NotificationMutationBody = {
  ids?: unknown;
  area?: unknown;
};

export const POST = withApiRouteEntries(
  CoreApiRoutes.notifications.dismiss.handler(async (request: Request) => {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseJsonBody<NotificationMutationBody>(request);
    const area = normalizeNotificationRuntimeArea(body?.area);
    if (!area) {
      return NextResponse.json(
        { ok: false, error: 'Invalid area. Use "admin" or "dashboard".' },
        { status: 400 }
      );
    }

    const notificationIds = normalizeNotificationIds(body?.ids);
    if (notificationIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'At least one notification id is required.' },
        { status: 400 }
      );
    }

    const updatedCount = await dismissNotificationsForUser({
      userId: currentUser.id,
      userRole: currentUser.role,
      area,
      notificationIds
    });

    return NextResponse.json({
      ok: true,
      updatedCount
    });
  })
);
