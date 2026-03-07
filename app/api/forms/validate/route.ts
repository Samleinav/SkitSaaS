import { handleBuildFormPreflightRequest } from '@/lib/forms/preflight';

export async function POST(request: Request) {
  return handleBuildFormPreflightRequest(request);
}
