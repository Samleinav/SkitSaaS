import { NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

// POST /api/sfiles/zip  — body: { fileIds: number[], archiveName?: string }
export const POST = withApiRouteEntries(
  CoreApiRoutes.sfiles.zip.handler(async (request: Request) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    let body: { fileIds?: unknown; archiveName?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!Array.isArray(body.fileIds) || body.fileIds.some((v) => typeof v !== 'number')) {
      return NextResponse.json(
        { ok: false, error: 'fileIds must be an array of numbers' },
        { status: 400 }
      );
    }

    const archiveName =
      typeof body.archiveName === 'string' ? body.archiveName : 'archive.zip';

    try {
      const zipFile = await sfiles.zip(actor, {
        fileIds: body.fileIds as number[],
        archiveName,
      });
      return NextResponse.json({ ok: true, data: zipFile }, { status: 201 });
    } catch (err) {
      if (err instanceof Error) {
        const code = (err as NodeJS.ErrnoException & { code?: string }).code;
        if (code === 'NOT_FOUND') return NextResponse.json({ ok: false, error: err.message }, { status: 404 });
        if (code === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Access denied to one or more files' }, { status: 403 });
      }
      throw err;
    }
  })
);
