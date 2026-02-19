'use client';

import { ThemeTemplate } from '@/components/ui/theme-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAreaMessages } from '@/lib/i18n/client';

export default function ActivityPageSkeleton() {
  const messages = useAreaMessages('dashboard');
  const fallbackPage = (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium text-foreground lg:text-2xl">
        {messages.activity.title}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{messages.activity.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[88px]" />
      </Card>
    </section>
  );

  return (
    <ThemeTemplate
      id="page.dashboard.activity.loading"
      data={{
        title: messages.activity.title,
        description: messages.activity.recentActivity
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeTemplate>
  );
}
