'use server';

import { db } from '@/lib/db/drizzle';
import { userThemePreferences } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { type ThemeArea, type ThemeMode } from '@/lib/theme';
import { revalidatePath } from 'next/cache';
import { getThemeConfigValue } from '@/lib/theme-config';

const ALLOWED_AREAS = new Set<ThemeArea>(['admin', 'dashboard', 'global']);
const ALLOWED_MODES = new Set<ThemeMode>(['system', 'light', 'dark']);

function parseBoolean(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

function normalizeThemeMode(value: string) {
  const normalized = value.trim().toLowerCase();
  if (ALLOWED_MODES.has(normalized as ThemeMode)) {
    return normalized as ThemeMode;
  }

  return null;
}

function normalizeThemeArea(value: string) {
  const normalized = value.trim().toLowerCase();
  if (ALLOWED_AREAS.has(normalized as ThemeArea)) {
    return normalized as ThemeArea;
  }

  return null;
}

export async function upsertUserThemePreferenceAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return false;
  }

  const allowOverrideValue = await getThemeConfigValue('allowUserOverride');
  if (!parseBoolean(allowOverrideValue)) {
    return false;
  }

  const area = normalizeThemeArea(String(formData.get('area') ?? ''));
  const mode = normalizeThemeMode(String(formData.get('mode') ?? ''));
  const themeKey = String(formData.get('themeKey') ?? '').trim();

  if (!area || !mode || !themeKey) {
    return false;
  }

  await db
    .insert(userThemePreferences)
    .values({
      userId: user.id,
      area,
      themeKey,
      mode,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [userThemePreferences.userId, userThemePreferences.area],
      set: {
        themeKey,
        mode,
        updatedAt: new Date()
      }
    });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return true;
}
