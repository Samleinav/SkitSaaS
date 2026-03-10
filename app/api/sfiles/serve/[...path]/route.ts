import { NextRequest, NextResponse } from 'next/server';
import { lookup } from 'mime-types';
import { getSfilesConfig } from '@/lib/sfiles/config';
import { getSfilesActor } from '@/lib/sfiles/api-actor';
import { searchSfiles } from '@/lib/sfiles/db';
import { canAccess } from '@/lib/sfiles/permissions';
import { LocalAdapter } from '@/lib/sfiles/adapters/local';

// GET /api/sfiles/serve/[...path]
// Streams a local file to the client after permission check.
// Only works when SFILES_BACKEND=local.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const config = getSfilesConfig();
  if (config.backend !== 'local') {
    return NextResponse.json(
      { ok: false, error: 'File serving is only available for local backend' },
      { status: 400 }
    );
  }

  const { path: pathSegments } = await params;
  const storagePath = pathSegments.join('/');

  // Find the file record by path
  const results = await searchSfiles({ query: storagePath, page: 1, limit: 1 });
  const file = results.find((f) => f.path === storagePath);

  if (!file) {
    return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
  }

  // Public files don't require auth
  if (file.visibility !== 'public') {
    const actor = await getSfilesActor();
    if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (!canAccess(file, actor, [])) {
      return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
    }
  }

  const adapter = new LocalAdapter(config);
  let buffer: Buffer;
  try {
    buffer = await adapter.load(storagePath);
  } catch {
    return NextResponse.json({ ok: false, error: 'File not found on disk' }, { status: 404 });
  }

  const mimeType = (lookup(file.name) || file.mimeType || 'application/octet-stream') as string;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(buffer.byteLength),
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
