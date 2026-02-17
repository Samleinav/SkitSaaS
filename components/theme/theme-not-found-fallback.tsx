import Link from 'next/link';
import { CircleIcon } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import type { I18nArea } from '@/lib/i18n/messages';

export function ThemeNotFoundFallback({
  title,
  description,
  backLabel,
  backHref = '/',
  switcherArea = 'global'
}: {
  title: string;
  description: string;
  backLabel: string;
  backHref?: string;
  switcherArea?: I18nArea;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <div className="max-w-md space-y-8 p-4 text-center">
        <div className="flex justify-end">
          <LanguageSwitcher area={switcherArea} />
        </div>
        <div className="flex justify-center">
          <CircleIcon className="size-12 text-orange-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          {title}
        </h1>
        <p className="text-base text-gray-500">{description}</p>
        <Link
          href={backHref}
          className="max-w-48 mx-auto flex justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
