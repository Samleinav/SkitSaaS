import type { ReactNode } from 'react';

type ScientistModuleShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  notice?: ReactNode;
};

type ScientistPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function ScientistModuleShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  notice,
}: ScientistModuleShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,white_45%,#e0f2fe)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-5">{children}</div>
    </div>
  );
}

export function ScientistPanel({ title, description, children }: ScientistPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ScientistKeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-950">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
