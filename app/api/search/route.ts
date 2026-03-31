import { NextResponse } from 'next/server';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { querySearch } from '@/lib/search/runtime';

export const GET = withApiRouteEntries(
  CoreApiRoutes.search.query.handler(async (request: Request) => {
    const searchParams = new URL(request.url).searchParams;
    const query = searchParams.get('q');
    const path = searchParams.get('path');
    const limitRaw = Number(searchParams.get('limit') ?? '');
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

    const payload = await querySearch({
      query,
      path,
      limit
    });

    return NextResponse.json({
      ok: true,
      data: payload
    });
  })
);
