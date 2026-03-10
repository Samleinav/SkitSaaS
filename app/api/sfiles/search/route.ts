import { NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

// GET /api/sfiles/search?q=query&folder=/&page=1&limit=50
export const GET = withApiRouteEntries(
  CoreApiRoutes.sfiles.search.handler(async (request: Request) => {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = new URL(request.url).searchParams;
    const query = searchParams.get('q')?.trim() ?? '';
    if (!query) return NextResponse.json({ ok: false, error: 'Missing query parameter q' }, { status: 400 });

    const folder = searchParams.get('folder') ?? undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));

    const results = await sfiles.search(actor, { query, folder, page, limit });
    return NextResponse.json({ ok: true, data: results });
  })
);
