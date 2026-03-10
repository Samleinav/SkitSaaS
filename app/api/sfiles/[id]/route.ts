import { NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

function fileError(err: unknown) {
  if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === 'NOT_FOUND') {
    return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
  }
  if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === 'FORBIDDEN') {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }
  throw err;
}

// GET /api/sfiles/:id
export const GET = withApiRouteEntries(
  CoreApiRoutes.sfiles.get.handler(async (_request: Request, params) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const fileId = Number(params.id);
    if (!Number.isInteger(fileId) || fileId < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid file ID' }, { status: 400 });
    }

    try {
      const file = await sfiles.get(actor, fileId);
      return NextResponse.json({ ok: true, data: file });
    } catch (err) {
      return fileError(err);
    }
  })
);

// DELETE /api/sfiles/:id
export const DELETE = withApiRouteEntries(
  CoreApiRoutes.sfiles.delete.handler(async (_request: Request, params) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const fileId = Number(params.id);
    if (!Number.isInteger(fileId) || fileId < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid file ID' }, { status: 400 });
    }

    try {
      await sfiles.delete(actor, fileId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return fileError(err);
    }
  })
);

// PATCH /api/sfiles/:id  — body: { name?: string } | { folder?: string }
export const PATCH = withApiRouteEntries(
  CoreApiRoutes.sfiles.update.handler(async (request: Request, params) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const fileId = Number(params.id);
    if (!Number.isInteger(fileId) || fileId < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid file ID' }, { status: 400 });
    }

    let body: { name?: string; folder?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    try {
      if (body.name !== undefined) {
        const updated = await sfiles.rename(actor, fileId, { name: body.name });
        return NextResponse.json({ ok: true, data: updated });
      }
      if (body.folder !== undefined) {
        const updated = await sfiles.move(actor, fileId, { folder: body.folder });
        return NextResponse.json({ ok: true, data: updated });
      }
      return NextResponse.json(
        { ok: false, error: 'Provide name or folder to update' },
        { status: 400 }
      );
    } catch (err) {
      return fileError(err);
    }
  })
);
