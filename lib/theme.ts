export type AppTheme = 'light' | 'dark';
export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeArea =
  | 'admin'
  | 'dashboard'
  | 'frontend'
  | 'public'
  | 'global';

export const THEME_STORAGE_KEY = 'saas-theme';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
export const THEME_POLICY_NAMESPACE = 'theme';
