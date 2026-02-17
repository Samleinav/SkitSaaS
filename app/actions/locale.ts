'use server';

import { cookies } from 'next/headers';
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  resolveLocale
} from '@/lib/i18n/config';

export async function setLocaleAction(nextLocale: string) {
  const locale = resolveLocale(nextLocale);
  const cookieStore = await cookies();

  cookieStore.set({
    name: LOCALE_COOKIE_NAME,
    value: locale,
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}
