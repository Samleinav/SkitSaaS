import nodemailer from 'nodemailer';
import { getSmtpRuntimeConfig } from './config';
import { createEmailLog } from './logs';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';

export type SendSmtpEmailInput = {
  eventType: string;
  recipientEmail: string;
  recipientUserId?: number | null;
  subject: string;
  html: string;
  text?: string | null;
  source?: string | null;
  metadata?: unknown;
};

export type SendSmtpEmailResult = {
  ok: boolean;
  messageId: string | null;
  reason: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildFromValue({
  fromEmail,
  fromName
}: {
  fromEmail: string;
  fromName: string | null;
}) {
  if (!fromName) {
    return fromEmail;
  }

  const safeName = fromName.replaceAll('"', "'");
  return `"${safeName}" <${fromEmail}>`;
}

export async function sendSmtpEmail({
  eventType,
  recipientEmail,
  recipientUserId = null,
  subject,
  html,
  text = null,
  source = null,
  metadata
}: SendSmtpEmailInput): Promise<SendSmtpEmailResult> {
  const to = normalizeEmail(recipientEmail);
  if (!to || !to.includes('@')) {
    await emitEventAsync(
      EVENT_HOOKS.emailSmtpFailed,
      { eventType, recipientEmail, reason: 'invalid_recipient' },
      {
        targetUserId: recipientUserId ?? null,
        source: source ?? '/lib/email/smtp'
      }
    );
    await createEmailLog({
      eventType,
      status: 'failed',
      recipientEmail: recipientEmail || '-',
      recipientUserId,
      subject,
      source,
      message: 'Invalid recipient email address.',
      metadata
    });

    return {
      ok: false,
      messageId: null,
      reason: 'invalid_recipient'
    };
  }

  const smtpConfig = await getSmtpRuntimeConfig();
  if (smtpConfig.isLocalHost) {
    await emitEventAsync(
      EVENT_HOOKS.emailSmtpFailed,
      { eventType, recipientEmail: to, reason: 'local_smtp_blocked' },
      {
        targetUserId: recipientUserId ?? null,
        source: source ?? '/lib/email/smtp'
      }
    );
    await createEmailLog({
      eventType,
      status: 'failed',
      recipientEmail: to,
      recipientUserId,
      subject,
      source,
      message:
        'Local SMTP hosts are blocked. Configure an external SMTP provider.',
      metadata
    });

    return {
      ok: false,
      messageId: null,
      reason: 'local_smtp_blocked'
    };
  }

  if (!smtpConfig.isConfigured || !smtpConfig.host || !smtpConfig.fromEmail) {
    await emitEventAsync(
      EVENT_HOOKS.emailSmtpFailed,
      { eventType, recipientEmail: to, reason: 'smtp_not_configured' },
      {
        targetUserId: recipientUserId ?? null,
        source: source ?? '/lib/email/smtp'
      }
    );
    await createEmailLog({
      eventType,
      status: 'failed',
      recipientEmail: to,
      recipientUserId,
      subject,
      source,
      message:
        'SMTP configuration is incomplete. Set host, port, from_email, and auth if required.',
      metadata
    });

    return {
      ok: false,
      messageId: null,
      reason: 'smtp_not_configured'
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.user
      ? {
          user: smtpConfig.user,
          pass: smtpConfig.password || ''
        }
      : undefined,
    connectionTimeout: 15_000
  });

  const mutablePayload = {
    eventType,
    recipientEmail: to,
    recipientUserId,
    subject,
    html,
    text,
    source,
    metadata
  };

  await emitEvent(
    EVENT_HOOKS.emailSmtpBeforeSend,
    mutablePayload,
    {
      targetUserId: recipientUserId ?? null,
      source: source ?? '/lib/email/smtp'
    }
  );

  try {
    const result = await transporter.sendMail({
      from: buildFromValue({
        fromEmail: smtpConfig.fromEmail,
        fromName: smtpConfig.fromName
      }),
      to: normalizeEmail(mutablePayload.recipientEmail),
      subject: mutablePayload.subject,
      html: mutablePayload.html,
      text: mutablePayload.text || undefined,
      replyTo: smtpConfig.replyToEmail || undefined
    });

    await createEmailLog({
      eventType: mutablePayload.eventType,
      status: 'sent',
      recipientEmail: normalizeEmail(mutablePayload.recipientEmail),
      recipientUserId: mutablePayload.recipientUserId ?? null,
      subject: mutablePayload.subject,
      source: mutablePayload.source ?? source,
      externalMessageId: result.messageId,
      message: 'Email sent via SMTP.',
      metadata: {
        ...(mutablePayload.metadata &&
        typeof mutablePayload.metadata === 'object' &&
        !Array.isArray(mutablePayload.metadata)
          ? mutablePayload.metadata
          : { context: mutablePayload.metadata ?? null }),
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response
      },
      sentAt: new Date()
    });

    await emitEventAsync(
      EVENT_HOOKS.emailSmtpSent,
      {
        eventType: mutablePayload.eventType,
        recipientEmail: mutablePayload.recipientEmail,
        messageId: result.messageId
      },
      {
        targetUserId: mutablePayload.recipientUserId ?? null,
        source: mutablePayload.source ?? '/lib/email/smtp'
      }
    );

    return {
      ok: true,
      messageId: result.messageId || null,
      reason: null
    };
  } catch (error) {
    await emitEventAsync(
      EVENT_HOOKS.emailSmtpFailed,
      {
        eventType: mutablePayload.eventType,
        recipientEmail: mutablePayload.recipientEmail,
        reason: 'smtp_send_failed'
      },
      {
        targetUserId: mutablePayload.recipientUserId ?? null,
        source: mutablePayload.source ?? '/lib/email/smtp'
      }
    );
    await createEmailLog({
      eventType: mutablePayload.eventType,
      status: 'failed',
      recipientEmail: normalizeEmail(mutablePayload.recipientEmail),
      recipientUserId: mutablePayload.recipientUserId ?? null,
      subject: mutablePayload.subject,
      source: mutablePayload.source ?? source,
      message: toMessage(error),
      metadata: mutablePayload.metadata
    });

    return {
      ok: false,
      messageId: null,
      reason: 'smtp_send_failed'
    };
  }
}
