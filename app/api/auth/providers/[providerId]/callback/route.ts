import {
  getEnabledAuthProviderById,
  resolveAuthProviderActionSlug,
  resolveModuleApiHandler
} from '@/lib/modules/runtime';

type RouteContext = {
  params: { providerId: string } | Promise<{ providerId: string }>;
};

async function handleProviderCallback(
  request: Request,
  { params }: RouteContext
) {
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
    request
  });

  if (!response) {
    return Response.json(
      { error: 'Auth provider callback route is unavailable.' },
      { status: 404 }
    );
  }

  return response;
}

export const GET = handleProviderCallback;
export const POST = handleProviderCallback;
