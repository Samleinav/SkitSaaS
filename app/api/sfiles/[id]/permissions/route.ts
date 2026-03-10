import { NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

function permError(err: unknown) {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException & { code?: string }).code;
    if (code === 'NOT_FOUND') return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
    if (code === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }
  throw err;
}

// GET /api/sfiles/:id/permissions
export const GET = withApiRouteEntries(
  CoreApiRoutes.sfiles.permissions.handler(async (_request: Request, params) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const fileId = Number(params.id);
    if (!Number.isInteger(fileId) || fileId < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid file ID' }, { status: 400 });
    }

    try {
      const permissions = await sfiles.getPermissions(actor, fileId);
      return NextResponse.json({ ok: true, data: permissions });
    } catch (err) {
      return permError(err);
    }
  })
);

// PUT /api/sfiles/:id/permissions  — body: { userIds: number[] }
export const PUT = withApiRouteEntries(
  CoreApiRoutes.sfiles.setPermissions.handler(async (request: Request, params) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const fileId = Number(params.id);
    if (!Number.isInteger(fileId) || fileId < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid file ID' }, { status: 400 });
    }

    let body: { userIds?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!Array.isArray(body.userIds) || body.userIds.some((v) => typeof v !== 'number')) {
      return NextResponse.json(
        { ok: false, error: 'userIds must be an array of numbers' },
        { status: 400 }
      );
    }

    try {
      await sfiles.setPermissions(actor, fileId, { userIds: body.userIds as number[] });
      return NextResponse.json({ ok: true });
    } catch (err) {
      return permError(err);
    }
  })
);
