import { NextRequest, NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';

// GET /api/sfiles/:id/url?expires=3600
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSfilesActor();
  if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isInteger(fileId) || fileId < 1) {
    return NextResponse.json({ ok: false, error: 'Invalid file ID' }, { status: 400 });
  }

  const expiresParam = request.nextUrl.searchParams.get('expires');
  const expiresIn = expiresParam ? Number(expiresParam) : undefined;

  try {
    const url = await sfiles.getUrl(actor, fileId, { expiresIn });
    return NextResponse.json({ ok: true, data: { url } });
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException & { code?: string }).code;
      if (code === 'NOT_FOUND') return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
      if (code === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
    }
    throw err;
  }
}
