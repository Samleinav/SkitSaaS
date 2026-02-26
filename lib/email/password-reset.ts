import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  sendSmtpEmail,
  type SendSmtpEmailInput,
  type SendSmtpEmailResult
} from '@/lib/email/smtp';
import { buildPasswordResetEmail } from '@/lib/email/templates/template-password-reset';

const DEFAULT_BASE_URL = 'http://localhost:3000';

function resolveBaseUrl(baseUrl: string | null | undefined) {
  const value = baseUrl?.trim();
  if (!value) {
    return DEFAULT_BASE_URL;
  }

  try {
    return new URL(value).toString();
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export function buildPasswordResetUrl({
  token,
  baseUrl = process.env.BASE_URL ?? null
}: {
  token: string;
  baseUrl?: string | null;
}) {
  const resetUrl = new URL(`/reset-password/${encodeURIComponent(token)}`, resolveBaseUrl(baseUrl));
  return resetUrl.toString();
}

export type SendPasswordResetEmailInput = {
  token: string;
  recipientEmail: string;
  recipientUserId?: number | null;
  expiresInMinutes?: number;
  baseUrl?: string | null;
};

type SendPasswordResetEmailDependencies = {
  sendEmail?: (input: SendSmtpEmailInput) => Promise<SendSmtpEmailResult>;
};

export type SendPasswordResetEmailResult = {
  resetUrl: string;
  emailResult: SendSmtpEmailResult;
};

export async function sendPasswordResetEmail(
  {
    token,
    recipientEmail,
    recipientUserId = null,
    expiresInMinutes = 60,
    baseUrl = process.env.BASE_URL ?? null
  }: SendPasswordResetEmailInput,
  dependencies: SendPasswordResetEmailDependencies = {}
): Promise<SendPasswordResetEmailResult> {
  const resetUrl = buildPasswordResetUrl({ token, baseUrl });
  const template = buildPasswordResetEmail({ resetUrl, expiresInMinutes });
  const sendEmail = dependencies.sendEmail ?? sendSmtpEmail;
  const emailResult = await sendEmail({
    eventType: EVENT_HOOKS.authPasswordResetRequested,
    recipientEmail,
    recipientUserId,
    subject: template.subject,
    html: template.html,
    text: template.text,
    source: '/forgot-password',
    metadata: {
      resetUrl,
      expiresInMinutes
    }
  });

  return {
    resetUrl,
    emailResult
  };
}
