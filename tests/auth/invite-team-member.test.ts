import assert from 'node:assert/strict';
import test from 'node:test';
import { EVENT_HOOKS } from '../../lib/events/catalog';
import {
  buildInvitationSignUpUrl,
  sendTeamInvitationEmail
} from '../../lib/email/invitations';
import type { SendSmtpEmailInput } from '../../lib/email/smtp';

test('buildInvitationSignUpUrl creates sign-up URL with inviteId query', () => {
  const inviteUrl = buildInvitationSignUpUrl({
    inviteId: 42,
    baseUrl: 'https://app.example.com'
  });

  assert.equal(inviteUrl, 'https://app.example.com/sign-up?inviteId=42');
});

test('buildInvitationSignUpUrl falls back to localhost for invalid BASE_URL', () => {
  const inviteUrl = buildInvitationSignUpUrl({
    inviteId: 7,
    baseUrl: 'not-a-valid-url'
  });

  assert.equal(inviteUrl, 'http://localhost:3000/sign-up?inviteId=7');
});

test('sendTeamInvitationEmail returns invite URL and forwards SMTP payload', async () => {
  const capturedPayloads: SendSmtpEmailInput[] = [];

  const result = await sendTeamInvitationEmail(
    {
      inviteId: 105,
      recipientEmail: 'invitee@example.com',
      role: 'owner',
      teamName: 'Core Team',
      inviterName: 'Alice Owner',
      baseUrl: 'https://saas.example.com'
    },
    {
      sendEmail: async (payload) => {
        capturedPayloads.push(payload);
        return {
          ok: true,
          messageId: 'msg_123',
          reason: null
        };
      }
    }
  );

  assert.equal(result.inviteUrl, 'https://saas.example.com/sign-up?inviteId=105');
  assert.equal(result.emailResult.ok, true);
  const [capturedPayload] = capturedPayloads;
  assert.ok(capturedPayload);
  assert.equal(capturedPayload.eventType, EVENT_HOOKS.dashboardTeamMemberInvited);
  assert.equal(capturedPayload.recipientEmail, 'invitee@example.com');
  assert.equal(capturedPayload.source, '/dashboard');
  assert.match(String(capturedPayload.subject), /Core Team/);
  assert.match(String(capturedPayload.html), /inviteId=105/);
});

test('sendTeamInvitationEmail keeps invitation flow stable when SMTP reports failure', async () => {
  const result = await sendTeamInvitationEmail(
    {
      inviteId: 9,
      recipientEmail: 'invitee@example.com',
      role: 'member',
      teamName: 'Acme',
      inviterName: 'Bob'
    },
    {
      sendEmail: async () => ({
        ok: false,
        messageId: null,
        reason: 'smtp_not_configured'
      })
    }
  );

  assert.equal(result.inviteUrl, 'http://localhost:3000/sign-up?inviteId=9');
  assert.equal(result.emailResult.ok, false);
  assert.equal(result.emailResult.reason, 'smtp_not_configured');
});
