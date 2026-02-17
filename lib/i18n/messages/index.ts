import { DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';
import { adminMessages, type AdminMessages } from './admin';
import { dashboardMessages, type DashboardMessages } from './dashboard';
import { globalMessages, type GlobalMessages } from './global';
import { loginMessages, type LoginMessages } from './login';
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

const coreMessagesByArea: {
  [K in I18nArea]: Record<AppLocale, CoreAreaMessagesMap[K]>;
} = {
  global: globalMessages,
  dashboard: dashboardMessages,
  admin: adminMessages,
  login: loginMessages
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
  const areaMessages = coreMessagesByArea[area];
  return areaMessages[locale] ?? areaMessages[DEFAULT_LOCALE];
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

export const messagesByArea: {
  [K in I18nArea]: Record<string, AreaMessagesMap[K]>;
} = {
  global: {
    en: mergeModuleMessages(coreMessagesByArea.global.en, 'global', 'en'),
    es: mergeModuleMessages(coreMessagesByArea.global.es, 'global', 'es')
  },
  dashboard: {
    en: mergeModuleMessages(coreMessagesByArea.dashboard.en, 'dashboard', 'en'),
    es: mergeModuleMessages(coreMessagesByArea.dashboard.es, 'dashboard', 'es')
  },
  admin: {
    en: mergeModuleMessages(coreMessagesByArea.admin.en, 'admin', 'en'),
    es: mergeModuleMessages(coreMessagesByArea.admin.es, 'admin', 'es')
  },
  login: {
    en: mergeModuleMessages(coreMessagesByArea.login.en, 'login', 'en'),
    es: mergeModuleMessages(coreMessagesByArea.login.es, 'login', 'es')
  }
};
