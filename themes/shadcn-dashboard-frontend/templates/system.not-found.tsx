import Link from 'next/link';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
};

function asNonEmptyString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export default function SystemNotFoundTemplate({
  data,
  className
}: TemplateProps) {
  const title = asNonEmptyString(data?.title, 'Page not found');
  const message = asNonEmptyString(
    data?.message,
    'This route is not available in the active frontend theme.'
  );

  return (
    <main
      className={className || 'mx-auto max-w-4xl px-4 py-20'}
      data-theme-template="system.not-found"
    >
      <section className="theme-shadcn-dashboard-panel rounded-3xl p-10 text-center">
        <p className="theme-shadcn-dashboard-kicker text-xs text-slate-500 dark:text-slate-400">
          404
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950 dark:text-slate-100">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-xs font-semibold tracking-[0.16em] text-primary-foreground uppercase transition hover:opacity-90"
        >
          Back Home
        </Link>
      </section>
    </main>
  );
}
