import { NextRequest, NextResponse } from 'next/server';
import { sfiles } from '@/lib/sfiles';
import { getSfilesActor } from '@/lib/sfiles/api-actor';
import type { SFileVisibility } from '@skitsaas/sdk/sfiles';

// GET /api/sfiles?folder=/&page=1&limit=50
export async function GET(request: NextRequest) {
  const actor = await getSfilesActor();
  if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const folder = searchParams.get('folder') ?? '/';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)));
  const includeDeleted = actor.isAdmin && searchParams.get('includeDeleted') === 'true';

  const result = await sfiles.list(actor, { folder, page, limit, includeDeleted });
  return NextResponse.json({ ok: true, data: result });
}

// POST /api/sfiles  (multipart/form-data: file, folder?, visibility?)
export async function POST(request: NextRequest) {
  const actor = await getSfilesActor();
  if (!actor) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid multipart request' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Missing file field' }, { status: 400 });
  }

  const folder = (formData.get('folder') as string | null) ?? '/';
  const visibility = (formData.get('visibility') as SFileVisibility | null) ?? 'private';

  const created = await sfiles.upload(file, file.name, { folder, visibility }, actor);
  return NextResponse.json({ ok: true, data: created }, { status: 201 });
}
