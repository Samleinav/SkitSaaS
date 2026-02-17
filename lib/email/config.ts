import { getAppConfigValueFromDb, trimToNull } from '@/lib/config/app-config';

type EmailConfigDefinition = {
  provider: 'smtp';
  configKey: string;
  envKey: string;
  fallback?: string;
};

const EMAIL_CONFIG_DEFINITIONS = {
  smtpHost: {
    provider: 'smtp',
    configKey: 'host',
    envKey: 'SMTP_HOST'
  },
  smtpPort: {
    provider: 'smtp',
    configKey: 'port',
    envKey: 'SMTP_PORT',
    fallback: '587'
  },
  smtpSecure: {
    provider: 'smtp',
    configKey: 'secure',
    envKey: 'SMTP_SECURE',
    fallback: 'false'
  },
  smtpUser: {
    provider: 'smtp',
    configKey: 'user',
    envKey: 'SMTP_USER'
  },
  smtpPassword: {
    provider: 'smtp',
    configKey: 'password',
    envKey: 'SMTP_PASSWORD'
  },
  smtpFromEmail: {
    provider: 'smtp',
    configKey: 'from_email',
    envKey: 'SMTP_FROM_EMAIL'
  },
  smtpFromName: {
    provider: 'smtp',
    configKey: 'from_name',
    envKey: 'SMTP_FROM_NAME',
    fallback: 'SaaS Starter'
  },
  smtpReplyToEmail: {
    provider: 'smtp',
    configKey: 'reply_to_email',
    envKey: 'SMTP_REPLY_TO_EMAIL'
  }
} as const satisfies Record<string, EmailConfigDefinition>;

export type EmailConfigName = keyof typeof EMAIL_CONFIG_DEFINITIONS;

export type SmtpRuntimeConfig = {
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  fromEmail: string | null;
  fromName: string | null;
  replyToEmail: string | null;
  isLocalHost: boolean;
  isConfigured: boolean;
};

function getNonEmptyEnvValue(envKey: string) {
  return trimToNull(process.env[envKey]);
}

function parseBoolean(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

function parsePort(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return 587;
  }

  return parsed;
}

function isLocalSmtpHost(host: string | null) {
  if (!host) {
    return false;
  }

  const normalized = host.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  );
}

export async function getEmailConfigValue(configName: EmailConfigName) {
  const definition = EMAIL_CONFIG_DEFINITIONS[configName];
  const envValue = getNonEmptyEnvValue(definition.envKey);
  if (envValue) {
    return envValue;
  }

  try {
    const dbValue = await getAppConfigValueFromDb(
      'email.smtp',
      definition.configKey
    );
    if (dbValue) {
      return dbValue;
    }
  } catch {
    // If DB is unavailable, continue with fallback behavior.
  }

  return ('fallback' in definition ? definition.fallback : undefined) ?? null;
}

export async function getSmtpRuntimeConfig(): Promise<SmtpRuntimeConfig> {
  const [host, portRaw, secureRaw, user, password, fromEmail, fromName, replyToEmail] =
    await Promise.all([
      getEmailConfigValue('smtpHost'),
      getEmailConfigValue('smtpPort'),
      getEmailConfigValue('smtpSecure'),
      getEmailConfigValue('smtpUser'),
      getEmailConfigValue('smtpPassword'),
      getEmailConfigValue('smtpFromEmail'),
      getEmailConfigValue('smtpFromName'),
      getEmailConfigValue('smtpReplyToEmail')
    ]);

  const isLocalHost = isLocalSmtpHost(host);
  const hasAuthPair = (!user && !password) || Boolean(user && password);

  return {
    host,
    port: parsePort(portRaw),
    secure: parseBoolean(secureRaw),
    user,
    password,
    fromEmail,
    fromName,
    replyToEmail,
    isLocalHost,
    isConfigured: Boolean(host && fromEmail && hasAuthPair && !isLocalHost)
  };
}

export function getEmailConfigDefinitionsForAdmin() {
  return EMAIL_CONFIG_DEFINITIONS;
}
