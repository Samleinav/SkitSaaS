export const AUTH_SOCIAL_LOGINS_MODULE_ID = 'mod.auth.social-logins';
export const AUTH_SOCIAL_LOGINS_MODULE_VERSION = '0.1.0';

export const AUTH_SOCIAL_LOGINS_ADMIN_ALIAS = '/admin/custom/auth-social-logins';
export const AUTH_SOCIAL_LOGINS_DASHBOARD_ALIAS =
  '/dashboard/custom/social-logins';

export const AUTH_SOCIAL_SUPPORTED_PROVIDERS = [
  'google',
  'github',
  'x'
] as const;

export type SocialProviderId = (typeof AUTH_SOCIAL_SUPPORTED_PROVIDERS)[number];

export const SOCIAL_AUTH_FLOW_VALUES = ['login', 'link'] as const;
export type SocialAuthFlow = (typeof SOCIAL_AUTH_FLOW_VALUES)[number];

export const SOCIAL_AUTH_AREAS = ['admin', 'dashboard'] as const;
export type SocialAuthArea = (typeof SOCIAL_AUTH_AREAS)[number];
