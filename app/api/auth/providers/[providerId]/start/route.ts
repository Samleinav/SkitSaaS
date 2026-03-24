import '@/lib/modules/sdk-server-bootstrap';
import {
  getEnabledAuthProviderById,
  resolveAuthProviderActionSlug,
  resolveModuleApiHandler
} from '@/lib/modules/runtime';
import {
  applyAuthProviderRateLimit,
  attachPreparedAuthProviderHandoff,
  prepareAuthProviderHandoff,
  withAuthProviderStartState
} from '@/lib/auth/provider-handoff';

type RouteContext = {
  params: { providerId: string } | Promise<{ providerId: string }>;
};

async function handleProviderStart(request: Request, { params }: RouteContext) {
  const resolvedParams = await Promise.resolve(params);
  const providerId = resolvedParams.providerId;
  const rateLimitedResponse = await applyAuthProviderRateLimit(request, 'start', {
    providerId
  });
  if (rateLimitedResponse) {
    return rateLimitedResponse;
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

  const slug = resolveAuthProviderActionSlug(resolvedProvider.provider, 'start');
  if (!slug) {
    return Response.json(
      { error: 'Auth provider start route is not configured.' },
      { status: 404 }
    );
  }

  const handoff = await prepareAuthProviderHandoff({ providerId });

  const response = await resolveModuleApiHandler({
    moduleId: resolvedProvider.provider.moduleId,
    slug,
    request: withAuthProviderStartState(request, handoff.nonce)
  });

  if (!response) {
    return Response.json(
      { error: 'Auth provider start route is unavailable.' },
      { status: 404 }
    );
  }

  if (response.status >= 400) {
    return response;
  }

  return attachPreparedAuthProviderHandoff(response, {
    request,
    handoff
  });
}

export const GET = handleProviderStart;
export const POST = handleProviderStart;
