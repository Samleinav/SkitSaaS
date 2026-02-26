type BuildPasswordResetEmailInput = {
  resetUrl: string;
  expiresInMinutes?: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildPasswordResetEmail({
  resetUrl,
  expiresInMinutes = 60
}: BuildPasswordResetEmailInput) {
  const subject = 'Reset your password';

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
                  We received a request to reset your password. Click the link below to choose a new one.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;">
                  This link expires in <strong>${expiresInMinutes} minutes</strong>.
                </p>
                <p style="margin:16px 0 0;">
                  <a href="${escapeHtml(resetUrl)}" style="color:#111827;font-weight:600;">Reset password</a>
                </p>
                <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
                  If you did not request a password reset, you can safely ignore this email.
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
    'We received a request to reset your password.',
    `Open the link below to choose a new one. This link expires in ${expiresInMinutes} minutes.`,
    '',
    resetUrl,
    '',
    'If you did not request a password reset, you can safely ignore this email.'
  ].join('\n');

  return {
    subject,
    html,
    text
  };
}
