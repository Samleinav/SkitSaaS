import type { NextRequest } from 'next/server';
import { withApiProxy } from '@/lib/routing/with-api-proxy';
import { proxyApiAuth } from '@/lib/routing/proxies';
import { getTeamForUser } from '@/lib/db/queries';
import { areTeamsEnabled } from '@/lib/organizations/config';

const authorizedGet = withApiProxy([proxyApiAuth], async () => {
  const team = await getTeamForUser();
  return Response.json(team);
});

export async function GET(request: NextRequest) {
  if (!areTeamsEnabled()) {
    return Response.json({ error: 'Team system is disabled.' }, { status: 404 });
  }

  return authorizedGet(request);
}
