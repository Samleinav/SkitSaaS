import { NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

// GET /api/sfiles/:id/url?expires=3600
export const GET = withApiRouteEntries(
  CoreApiRoutes.sfiles.url.handler(async (request: Request, params) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const fileId = Number(params.id);
    if (!Number.isInteger(fileId) || fileId < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid file ID' }, { status: 400 });
    }

    const expiresParam = new URL(request.url).searchParams.get('expires');
    const expiresIn = expiresParam ? Number(expiresParam) : undefined;

    try {
      const url = await sfiles.getUrl(actor, fileId, { expiresIn });
      return NextResponse.json({ ok: true, data: { url } });
    } catch (err) {
      if (err instanceof Error) {
        const code = (err as NodeJS.ErrnoException & { code?: string }).code;
        if (code === 'NOT_FOUND') return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
        if (code === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
      }
      throw err;
    }
  })
);
