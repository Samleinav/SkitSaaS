import type { CheckoutTemplateSnapshot } from '@/lib/payments/checkout-system';

type BuildTemplatePricingChangedEmailInput = {
  templateName: string;
  previousSnapshot: CheckoutTemplateSnapshot;
  currentSnapshot: CheckoutTemplateSnapshot;
  recipientName?: string | null;
  impactedOrganizationNames?: string[];
  pricingUrl?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeInterval(value: string) {
  const interval = value.trim().toLowerCase();
  if (!interval) {
    return 'custom';
  }

  return interval;
}

function formatMoney(cents: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${normalizedCurrency}`;
  }
}

function describeSnapshot(snapshot: CheckoutTemplateSnapshot) {
  const priceLabel = formatMoney(snapshot.priceCents, snapshot.currency);
  const intervalLabel = normalizeInterval(snapshot.billingInterval);
  const trialLabel =
    snapshot.trialPeriodDays > 0
      ? `${snapshot.trialPeriodDays} day trial`
      : 'no trial';

  return `${priceLabel} / ${intervalLabel} (${trialLabel})`;
}

function formatOrganizationsLabel(organizationNames: string[]) {
  if (organizationNames.length === 0) {
    return '';
  }

  const visible = organizationNames.slice(0, 4);
  const remaining = organizationNames.length - visible.length;
  if (remaining > 0) {
    return `${visible.join(', ')} and ${remaining} more`;
  }

  return visible.join(', ');
}

export function buildTemplatePricingChangedEmail({
  templateName,
  previousSnapshot,
  currentSnapshot,
  recipientName = null,
  impactedOrganizationNames = [],
  pricingUrl = null
}: BuildTemplatePricingChangedEmailInput) {
  const templateLabel = templateName.trim() || 'your plan';
  const greeting = recipientName?.trim()
    ? `Hi ${recipientName.trim()},`
    : 'Hi,';

  const previousLabel = describeSnapshot(previousSnapshot);
  const currentLabel = describeSnapshot(currentSnapshot);
  const organizationLabel = formatOrganizationsLabel(impactedOrganizationNames);
  const hasOrganizations = Boolean(organizationLabel);
  const subject = `[Action Required] Pricing update for ${templateLabel}`;

  const pricingLink = pricingUrl
    ? `<p style="margin:16px 0 0;">
         <a href="${escapeHtml(pricingUrl)}" style="color:#111827;font-weight:600;">Review plans and pricing</a>
       </p>`
    : '';

  const organizationsHtml = hasOrganizations
    ? `<p style="margin:16px 0 0;">
         Affected organizations: <strong>${escapeHtml(organizationLabel)}</strong>.
       </p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:24px;">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 12px;font-size:14px;line-height:22px;">
                  The pricing settings for <strong>${escapeHtml(templateLabel)}</strong> were updated.
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:22px;">
                  Previous: <strong>${escapeHtml(previousLabel)}</strong>
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:22px;">
                  New: <strong>${escapeHtml(currentLabel)}</strong>
                </p>
                <p style="margin:16px 0 0;font-size:14px;line-height:22px;">
                  Existing active subscriptions are not migrated automatically. Please review and confirm if you want to continue under the updated pricing.
                </p>
                ${organizationsHtml}
                ${pricingLink}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    greeting,
    '',
    `The pricing settings for ${templateLabel} were updated.`,
    `Previous: ${previousLabel}`,
    `New: ${currentLabel}`,
    '',
    'Existing active subscriptions are not migrated automatically. Please review and confirm if you want to continue under the updated pricing.'
  ];

  if (hasOrganizations) {
    textLines.push('', `Affected organizations: ${organizationLabel}.`);
  }

  if (pricingUrl) {
    textLines.push('', `Review plans and pricing: ${pricingUrl}`);
  }

  return {
    subject,
    html,
    text: textLines.join('\n')
  };
}
