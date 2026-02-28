import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';

export async function POST() {
  await clearSession({ reason: 'manual_sign_out' });
  return NextResponse.json({ ok: true });
}
