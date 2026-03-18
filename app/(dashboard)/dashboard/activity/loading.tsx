'use client';

import { ThemeTemplate } from '@/components/ui/theme-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/client';

export default function ActivityPageSkeleton() {
  const t = useI18n({ area: 'dashboard' });
  const fallbackPage = (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium text-foreground lg:text-2xl">
        {t('Activity Log')}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent Activity')}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[88px]" />
      </Card>
    </section>
  );

  return (
    <ThemeTemplate
      id="page.dashboard.activity.loading"
      data={{
        title: t('Activity Log'),
        description: t('Recent Activity')
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeTemplate>
  );
}
