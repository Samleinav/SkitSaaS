type TemplateData = {
  message?: string;
  title?: string;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
};

export default function SystemNotFoundTemplate({
  data,
  className
}: TemplateProps) {
  const title = data?.title?.trim() || 'Not Found';
  const message = data?.message?.trim() || 'This backoffice route is not available.';

  return (
    <main
      className={className || 'mx-auto max-w-3xl px-4 py-20'}
    >
      <section className="theme-first-backoffice-panel rounded-xl p-8 text-center">
        <p className="text-xs tracking-[0.2em] uppercase opacity-70">404</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm opacity-80">{message}</p>
      </section>
    </main>
  );
}

