import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale
} from '@/lib/i18n/config';
import { coreMessagesByArea } from '../core-messages.generated';
import type { AdminMessages } from './admin';
import type { DashboardMessages } from './dashboard';
import type { GlobalMessages } from './global';
import type { LoginMessages } from './login';
import type {
  ModuleI18nNamespace,
  ModuleMessageTree
} from '@/lib/i18n/module-messages';
import { moduleMessagesByArea } from './modules.generated';

type CoreAreaMessagesMap = {
  global: GlobalMessages;
  dashboard: DashboardMessages;
  admin: AdminMessages;
  login: LoginMessages;
};

export type ModuleMessagesRoot = {
  mod: Record<ModuleI18nNamespace, ModuleMessageTree>;
};

export type AreaMessagesMap = {
  global: GlobalMessages & ModuleMessagesRoot;
  dashboard: DashboardMessages & ModuleMessagesRoot;
  admin: AdminMessages & ModuleMessagesRoot;
  login: LoginMessages & ModuleMessagesRoot;
};

export type I18nArea = keyof AreaMessagesMap;

const typedCoreMessagesByArea: {
  [K in I18nArea]: Partial<Record<AppLocale, CoreAreaMessagesMap[K]>>;
} = coreMessagesByArea as {
  [K in I18nArea]: Partial<Record<AppLocale, CoreAreaMessagesMap[K]>>;
};

function mergeModuleMessages<TMessages>(
  messages: TMessages,
  area: I18nArea,
  locale: AppLocale
): TMessages & ModuleMessagesRoot {
  const mod = moduleMessagesByArea[area]?.[locale] ?? {};
  return {
    ...(messages as TMessages),
    mod
  };
}

function getCoreMessages<TArea extends I18nArea>(
  area: TArea,
  locale: AppLocale
): CoreAreaMessagesMap[TArea] {
  const areaMessages = typedCoreMessagesByArea[area];
  const fallbackMessages = areaMessages[DEFAULT_LOCALE];
  if (fallbackMessages) {
    return areaMessages[locale] ?? fallbackMessages;
  }

  throw new Error(
    `Missing default core messages for area "${area}" and locale "${DEFAULT_LOCALE}".`
  );
}

function getModuleMessages(area: I18nArea, locale: AppLocale) {
  const areaMessages = moduleMessagesByArea[area] ?? {};
  return areaMessages[locale] ?? areaMessages[DEFAULT_LOCALE] ?? {};
}

export function getAreaMessages<TArea extends I18nArea>(
  area: TArea,
  locale: AppLocale
): AreaMessagesMap[TArea] {
  const core = getCoreMessages(area, locale) as AreaMessagesMap[TArea];
  return {
    ...core,
    mod: getModuleMessages(area, locale)
  };
}

function translateMessageTree<T>(
  value: T,
  translate: (message: string) => string
): T {
  if (typeof value === 'string') {
    return translate(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => translateMessageTree(item, translate)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        translateMessageTree(nestedValue, translate)
      ])
    ) as T;
  }

  return value;
}

export function getAreaMessagesFromTranslator<TArea extends I18nArea>(
  area: TArea,
  translate: (message: string) => string
): AreaMessagesMap[TArea] {
  return translateMessageTree(
    getAreaMessages(area, DEFAULT_LOCALE),
    translate
  ) as AreaMessagesMap[TArea];
}

export const messagesByArea: {
  [K in I18nArea]: Record<string, AreaMessagesMap[K]>;
} = {
  global: Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      mergeModuleMessages(getCoreMessages('global', locale), 'global', locale)
    ])
  ) as Record<string, AreaMessagesMap['global']>,
  dashboard: Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      mergeModuleMessages(
        getCoreMessages('dashboard', locale),
        'dashboard',
        locale
      )
    ])
  ) as Record<string, AreaMessagesMap['dashboard']>,
  admin: Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      mergeModuleMessages(getCoreMessages('admin', locale), 'admin', locale)
    ])
  ) as Record<string, AreaMessagesMap['admin']>,
  login: Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      mergeModuleMessages(getCoreMessages('login', locale), 'login', locale)
    ])
  ) as Record<string, AreaMessagesMap['login']>
};
