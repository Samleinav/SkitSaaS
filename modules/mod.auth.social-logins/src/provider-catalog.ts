import type { SocialProviderId } from './constants';

export type SocialTokenAuthMethod = 'client_secret_post' | 'client_secret_basic';
export type SocialProfileFormat = 'openid_userinfo' | 'github' | 'x';

export type SocialProviderCatalogEntry = {
  providerId: SocialProviderId;
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  emailInfoUrl: string | null;
  defaultScopes: string[];
  defaultUsePkce: boolean;
  tokenAuthMethod: SocialTokenAuthMethod;
  profileFormat: SocialProfileFormat;
};

const PROVIDER_CATALOG: Record<SocialProviderId, SocialProviderCatalogEntry> = {
  google: {
    providerId: 'google',
    displayName: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    emailInfoUrl: null,
    defaultScopes: ['openid', 'email', 'profile'],
    defaultUsePkce: true,
    tokenAuthMethod: 'client_secret_post',
    profileFormat: 'openid_userinfo'
  },
  github: {
    providerId: 'github',
    displayName: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailInfoUrl: 'https://api.github.com/user/emails',
    defaultScopes: ['read:user', 'user:email'],
    defaultUsePkce: true,
    tokenAuthMethod: 'client_secret_post',
    profileFormat: 'github'
  },
  x: {
    providerId: 'x',
    displayName: 'X',
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    emailInfoUrl: null,
    defaultScopes: ['users.read', 'tweet.read', 'offline.access'],
    defaultUsePkce: true,
    tokenAuthMethod: 'client_secret_post',
    profileFormat: 'x'
  }
};

export function getSocialProviderCatalogEntry(providerId: SocialProviderId) {
  return PROVIDER_CATALOG[providerId];
}
