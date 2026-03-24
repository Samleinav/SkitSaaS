import '@/lib/modules/sdk-server-bootstrap';
import {
  getEnabledAuthProviderById,
  resolveAuthProviderActionSlug,
  resolveModuleApiHandler
} from '@/lib/modules/runtime';
import {
  applyAuthProviderRateLimit,
  clearAuthProviderHandoff,
  validateAuthProviderHandoff
} from '@/lib/auth/provider-handoff';

type RouteContext = {
  params: { providerId: string } | Promise<{ providerId: string }>;
};

async function handleProviderCallback(
  request: Request,
  { params }: RouteContext
) {
  const resolvedParams = await Promise.resolve(params);
  const providerId = resolvedParams.providerId;
  const rateLimitedResponse = await applyAuthProviderRateLimit(request, 'callback', {
    providerId
  });
  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const handoff = await validateAuthProviderHandoff(request, { providerId });
  if (!handoff.ok) {
    return handoff.response;
  }

  const resolvedProvider = await getEnabledAuthProviderById(
    providerId
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

  const slug = resolveAuthProviderActionSlug(
    resolvedProvider.provider,
    'callback'
  );
  if (!slug) {
    return Response.json(
      { error: 'Auth provider callback route is not configured.' },
      { status: 404 }
    );
  }

  const response = await resolveModuleApiHandler({
    moduleId: resolvedProvider.provider.moduleId,
    slug,
    request: handoff.request
  });

  if (!response) {
    return clearAuthProviderHandoff(
      Response.json(
        { error: 'Auth provider callback route is unavailable.' },
        { status: 404 }
      ),
      providerId
    );
  }

  return clearAuthProviderHandoff(response, providerId);
}

export const GET = handleProviderCallback;
export const POST = handleProviderCallback;
