import '@/lib/modules/sdk-server-bootstrap';
import {
  getEnabledAuthProviderById,
  resolveAuthProviderActionSlug,
  resolveModuleApiHandler
} from '@/lib/modules/runtime';
import { applyAuthProviderRateLimit } from '@/lib/auth/provider-handoff';

type RouteContext = {
  params: { providerId: string } | Promise<{ providerId: string }>;
};

async function handleProviderStart(request: Request, { params }: RouteContext) {
  const rateLimitedResponse = await applyAuthProviderRateLimit(request, 'start');
  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const resolvedParams = await Promise.resolve(params);
  const resolvedProvider = await getEnabledAuthProviderById(
    resolvedParams.providerId
  );

  if (!resolvedProvider.provider) {
    if (resolvedProvider.issue) {
      return Response.json(
        {
          error: 'Auth provider is disabled due to registry conflict.',
          issue: resolvedProvider.issue
        },
        { status: 409 }
      );
    }

    return Response.json({ error: 'Auth provider not found.' }, { status: 404 });
  }

  const slug = resolveAuthProviderActionSlug(resolvedProvider.provider, 'start');
  if (!slug) {
    return Response.json(
      { error: 'Auth provider start route is not configured.' },
      { status: 404 }
    );
  }

  const response = await resolveModuleApiHandler({
    moduleId: resolvedProvider.provider.moduleId,
    slug,
    request
  });

  if (!response) {
    return Response.json(
      { error: 'Auth provider start route is unavailable.' },
      { status: 404 }
    );
  }

  return response;
}

export const GET = handleProviderStart;
export const POST = handleProviderStart;
