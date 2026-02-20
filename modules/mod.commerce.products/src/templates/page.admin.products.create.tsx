import type { CommerceProductsModuleTemplateProps } from './template-types';
import { readString } from '@skitsaas/sdk';

export default function PageAdminProductsCreateTemplate({
  data,
  children
}: CommerceProductsModuleTemplateProps) {
  const eyebrow = readString(data, 'eyebrow');
  const title = readString(data, 'title');
  const description = readString(data, 'description');

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{eyebrow}</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-600">{description}</p>
      </header>
      {children}
    </main>
  );
}

