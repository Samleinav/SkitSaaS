import { getEnterpriseProviderSummaries } from './data';

export async function renderEnterpriseSsoAdminPage() {
  const summaries = await getEnterpriseProviderSummaries();

  if (!summaries.length) {
    return [
      'Enterprise SSO Module',
      '',
      'No tenants configured yet. Define AUTH_ENTERPRISE_SSO_TENANTS and tenant provider settings.'
    ].join('\n');
  }

  const rows = summaries.map((entry) => {
    const missing =
      entry.missingKeys.length > 0
        ? ` missing=[${entry.missingKeys.join(', ')}]`
        : '';
    return (
      `- tenant=${entry.tenantId}, provider=${entry.providerId}, status=${entry.status}` +
      ` (enabled=${entry.enabled ? 'yes' : 'no'}, connections=${entry.connectionCount ?? 'n/a'})` +
      missing
    );
  });

  return ['Enterprise SSO Module', '', 'Configured tenant providers:', ...rows].join(
    '\n'
  );
}

export async function renderEnterpriseSsoDashboardPage() {
  const summaries = await getEnterpriseProviderSummaries();
  const readyCount = summaries.filter((entry) => entry.status === 'ready').length;

  return [
    'Enterprise SSO',
    '',
    'Use enterprise identity providers (OIDC/SAML) configured for your tenant.',
    `Ready providers: ${readyCount}`
  ].join('\n');
}
