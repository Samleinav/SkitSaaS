import { getServerTranslator } from '@/lib/i18n/server';

export default async function DashboardHomeNoContext() {
  const t = await getServerTranslator({ area: 'dashboard' });

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm">
      <div className="mx-auto max-w-2xl space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('No dashboard modules available')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            'Your account does not have a standalone dashboard experience configured yet.'
          )}
        </p>
      </div>
    </section>
  );
}
