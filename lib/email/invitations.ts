import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  sendSmtpEmail,
  type SendSmtpEmailInput,
  type SendSmtpEmailResult
} from '@/lib/email/smtp';
import { buildTeamInvitationEmail } from '@/lib/email/templates/template-invitation';

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

export function buildInvitationSignUpUrl({
  inviteId,
  baseUrl = process.env.BASE_URL ?? null
}: {
  inviteId: number;
  baseUrl?: string | null;
}) {
  if (!Number.isInteger(inviteId) || inviteId <= 0) {
    throw new Error('inviteId must be a positive integer.');
  }

  const signUpUrl = new URL('/sign-up', resolveBaseUrl(baseUrl));
  signUpUrl.searchParams.set('inviteId', String(inviteId));
  return signUpUrl.toString();
}

export type SendTeamInvitationEmailInput = {
  inviteId: number;
  recipientEmail: string;
  role: 'member' | 'owner';
  teamName?: string | null;
  inviterName?: string | null;
  baseUrl?: string | null;
};

type SendTeamInvitationEmailDependencies = {
  sendEmail?: (input: SendSmtpEmailInput) => Promise<SendSmtpEmailResult>;
};

export type SendTeamInvitationEmailResult = {
  inviteUrl: string;
  emailResult: SendSmtpEmailResult;
};

export async function sendTeamInvitationEmail(
  {
    inviteId,
    recipientEmail,
    role,
    teamName = null,
    inviterName = null,
    baseUrl = process.env.BASE_URL ?? null
  }: SendTeamInvitationEmailInput,
  dependencies: SendTeamInvitationEmailDependencies = {}
): Promise<SendTeamInvitationEmailResult> {
  const inviteUrl = buildInvitationSignUpUrl({ inviteId, baseUrl });
  const template = buildTeamInvitationEmail({
    inviteUrl,
    role,
    teamName,
    inviterName
  });
  const sendEmail = dependencies.sendEmail ?? sendSmtpEmail;
  const emailResult = await sendEmail({
    eventType: EVENT_HOOKS.dashboardTeamMemberInvited,
    recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    source: '/dashboard',
    metadata: {
      inviteId,
      inviteUrl,
      role,
      teamName: teamName ?? null,
      inviterName: inviterName ?? null
    }
  });

  return {
    inviteUrl,
    emailResult
  };
}
