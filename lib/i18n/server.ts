import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { type AppLocale, LOCALE_COOKIE_NAME, resolveLocale } from './config';
import {
  type AreaMessagesMap,
  type I18nArea,
  getAreaMessages
} from './messages';

export async function getRequestLocale(): Promise<AppLocale> {
  await connection();
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function getServerMessages<TArea extends I18nArea>(
  area: TArea
): Promise<AreaMessagesMap[TArea]> {
  const locale = await getRequestLocale();
  return getAreaMessages(area, locale);
}

export async function getServerLocaleAndMessages<TArea extends I18nArea>(
  area: TArea
): Promise<{ locale: AppLocale; messages: AreaMessagesMap[TArea] }> {
  const locale = await getRequestLocale();
  return {
    locale,
    messages: getAreaMessages(area, locale)
  };
}
