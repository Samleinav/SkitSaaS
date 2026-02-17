import { getAllSocialProviderSummaries } from './data';

export async function renderSocialLoginsAdminPage() {
  const providers = await getAllSocialProviderSummaries();
  const rows = providers.map((provider) => {
    const missing =
      provider.missingKeys.length > 0
        ? ` missing=[${provider.missingKeys.join(', ')}]`
        : '';
    return (
      `- ${provider.providerId}: ${provider.status}` +
      ` (enabled=${provider.enabled ? 'yes' : 'no'}` +
      `, connections=${provider.connectionCount ?? 'n/a'})` +
      missing
    );
  });

  return [
    'Social Logins Module',
    '',
    'Configured providers:',
    ...rows
  ].join('\n');
}

export async function renderSocialLoginsDashboardPage() {
  return [
    'Connected Social Accounts',
    '',
    'Use this section to connect or disconnect social providers for your account.'
  ].join('\n');
}
