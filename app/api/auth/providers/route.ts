import { getUser } from '@/lib/db/queries';
import { getEnabledAuthProviderRegistry } from '@/lib/modules/runtime';

const ADMIN_ROLES = new Set(['admin']);

export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (!ADMIN_ROLES.has(user.role)) {
    return Response.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const registry = await getEnabledAuthProviderRegistry();

  return Response.json({
    ok: true,
    providerCount: registry.providers.length,
    providers: registry.providers,
    issues: registry.issues
  });
}
