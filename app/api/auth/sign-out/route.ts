import { NextResponse } from 'next/server';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { clearSession } from '@/lib/auth/session';

export const POST = withApiRouteEntries(
  CoreApiRoutes.auth.signOut.handler(async () => {
    await clearSession({ reason: 'manual_sign_out' });
    return NextResponse.json({ ok: true });
  })
);
