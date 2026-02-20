import Link from 'next/link';
import type { CommerceProductsModuleTemplateProps } from './template-types';
import { readString } from '@skitsaas/sdk';

export default function PageAdminProductsTemplate({
  data,
  children
}: CommerceProductsModuleTemplateProps) {
  const eyebrow = readString(data, 'eyebrow');
  const title = readString(data, 'title');
  const description = readString(data, 'description');
  const createHref = readString(data, 'createHref');
  const createLabel = readString(data, 'createLabel');

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-zinc-500">{eyebrow}</p>
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          <p className="text-sm text-zinc-600">{description}</p>
        </div>
        {createHref && createLabel ? (
          <Link
            href={createHref}
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
          >
            {createLabel}
          </Link>
        ) : null}
      </header>
      {children}
    </main>
  );
}

