import { NextResponse } from 'next/server';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { getUser } from '@/lib/db/queries';
import { listNotificationsForUser } from '@/lib/notifications/service';
import {
  normalizeNotificationLimit,
  normalizeNotificationRuntimeArea
} from './shared';

export const GET = withApiRouteEntries(
  CoreApiRoutes.notifications.list.handler(async (request: Request) => {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const area = normalizeNotificationRuntimeArea(searchParams.get('area'));
    if (!area) {
      return NextResponse.json(
        { ok: false, error: 'Invalid area. Use "admin" or "dashboard".' },
        { status: 400 }
      );
    }

    const items = await listNotificationsForUser({
      userId: currentUser.id,
      userRole: currentUser.role,
      area,
      includeRead: searchParams.get('includeRead') === '1',
      limit: normalizeNotificationLimit(searchParams.get('limit'))
    });

    return NextResponse.json({
      ok: true,
      items
    });
  })
);
