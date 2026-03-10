import { NextRequest, NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';

// GET /api/sfiles/search?q=query&folder=/&page=1&limit=50
export async function GET(request: NextRequest) {
  const actor = await getSfilesActor();
  if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q')?.trim() ?? '';
  if (!query) return NextResponse.json({ ok: false, error: 'Missing query parameter q' }, { status: 400 });

  const folder = searchParams.get('folder') ?? undefined;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));

  const results = await sfiles.search(actor, { query, folder, page, limit });
  return NextResponse.json({ ok: true, data: results });
}
