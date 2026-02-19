import type { ReactNode } from 'react';
import type { PrivateLayoutMode } from '@/lib/layout/private-area';

export type TemplatePrivateArea = 'admin' | 'dashboard';
export type TemplateUiArea = TemplatePrivateArea | 'frontend' | 'global';

export type AdminNavTemplateChildItem = {
  href: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
};

export type AdminNavTemplateItem = {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
  children?: AdminNavTemplateChildItem[];
};

export type SectionAdminNavTemplateData = {
  variant?: 'basic' | 'pro';
  mode?: PrivateLayoutMode;
  moduleItemsCount?: number;
  navItems?: AdminNavTemplateItem[];
};

export type LayoutPrivateHeaderTemplateData = {
  area?: TemplatePrivateArea;
  controlsSlot?: ReactNode;
};

export type LayoutPrivateShellTemplateData = {
  area?: TemplatePrivateArea;
  route?: string | null;
};

export type UiTableControlTemplateData = {
  area?: TemplatePrivateArea | string | null;
  slot?: string | null;
  componentId?: string;
  templateId?: string | null;
  templateSource?: string | null;
  [key: string]: unknown;
};

export type UiLanguageSwitcherTemplateData = {
  area?: TemplateUiArea | string | null;
  slot?: string;
  variant?: string;
  mode?: PrivateLayoutMode | string;
};

export type UiThemeToggleTemplateData = {
  area?: TemplateUiArea | string | null;
  slot?: string;
  variant?: string;
  mode?: PrivateLayoutMode | string;
  showLabel?: boolean;
};

export type UiUserMenuTemplateData = {
  area?: TemplatePrivateArea | string | null;
  slot?: string;
  tone?: string;
};

export type TemplateDataById = {
  'section.admin.nav': SectionAdminNavTemplateData;
  'layout.private.header': LayoutPrivateHeaderTemplateData;
  'layout.private.shell': LayoutPrivateShellTemplateData;
  'ui.table.control': UiTableControlTemplateData;
  'ui.language-switcher': UiLanguageSwitcherTemplateData;
  'ui.theme-toggle': UiThemeToggleTemplateData;
  'ui.user-menu': UiUserMenuTemplateData;
};

export type TemplateDataForId<TId extends string> =
  TId extends keyof TemplateDataById
    ? TemplateDataById[TId]
    : unknown;

