type BuildTeamInvitationEmailInput = {
  inviteUrl: string;
  role: 'member' | 'owner';
  teamName?: string | null;
  inviterName?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeTeamName(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return 'your team';
  }

  return trimmed;
}

function normalizeInviterName(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return 'A team owner';
  }

  return trimmed;
}

function roleLabel(role: 'member' | 'owner') {
  return role === 'owner' ? 'Owner' : 'Member';
}

export function buildTeamInvitationEmail({
  inviteUrl,
  role,
  teamName = null,
  inviterName = null
}: BuildTeamInvitationEmailInput) {
  const resolvedTeamName = normalizeTeamName(teamName);
  const resolvedInviterName = normalizeInviterName(inviterName);
  const resolvedRoleLabel = roleLabel(role);
  const subject = `You're invited to join ${resolvedTeamName}`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:24px;">Hi,</p>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;">
                  <strong>${escapeHtml(resolvedInviterName)}</strong> invited you to join <strong>${escapeHtml(resolvedTeamName)}</strong> as <strong>${escapeHtml(resolvedRoleLabel)}</strong>.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;">
                  Click the link below to accept the invitation and finish your account setup.
                </p>
                <p style="margin:16px 0 0;">
                  <a href="${escapeHtml(inviteUrl)}" style="color:#111827;font-weight:600;">Accept invitation</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'Hi,',
    '',
    `${resolvedInviterName} invited you to join ${resolvedTeamName} as ${resolvedRoleLabel}.`,
    'Open the link below to accept the invitation and finish your account setup.',
    '',
    inviteUrl
  ].join('\n');

  return {
    subject,
    html,
    text
  };
}
