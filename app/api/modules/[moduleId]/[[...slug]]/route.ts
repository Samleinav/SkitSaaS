import '@/lib/modules/sdk-server-bootstrap';
import { resolveModuleApiHandler } from '@/lib/modules/runtime';
import {
  isAreaEnabled,
  resolveModuleApiSurfaceArea
} from '@/lib/config/runtime-surface';

type RouteContext = {
  params: { moduleId: string; slug?: string[] } | Promise<{ moduleId: string; slug?: string[] }>;
};

async function handleModuleRequest(
  request: Request,
  { params }: RouteContext
) {
  const resolvedParams = await Promise.resolve(params);
  const area = resolveModuleApiSurfaceArea(resolvedParams.slug);
  if (area && !isAreaEnabled(area)) {
    return Response.json({ error: 'Module area is disabled.' }, { status: 404 });
  }

  const response = await resolveModuleApiHandler({
    moduleId: resolvedParams.moduleId,
    slug: resolvedParams.slug,
    request
  });

  if (!response) {
    return Response.json({ error: 'Module route not found.' }, { status: 404 });
  }

  return response;
}

export const GET = handleModuleRequest;
export const POST = handleModuleRequest;
export const PUT = handleModuleRequest;
export const PATCH = handleModuleRequest;
export const DELETE = handleModuleRequest;
