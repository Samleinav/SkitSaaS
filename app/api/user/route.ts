import { withApiProxy } from '@/lib/routing/with-api-proxy';
import { proxyApiAuth } from '@/lib/routing/proxies';
import { getUser } from '@/lib/db/queries';

export const GET = withApiProxy([proxyApiAuth], async () => {
  const user = await getUser();
  return Response.json(user);
});
