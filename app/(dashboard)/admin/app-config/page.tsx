import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function AdminAppConfigPage() {
  const messages = await getServerMessages('admin');
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <Card>
      <CardHeader>
        <CardTitle>{messages.appConfig.title}</CardTitle>
        <CardDescription>{messages.appConfig.description}</CardDescription>
        <p className="text-xs text-muted-foreground">{messages.appConfig.envPriority}</p>
      </CardHeader>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.app-config.home"
      data={{
        title: messages.appConfig.title,
        description: messages.appConfig.description
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
