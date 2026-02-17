'use client';

import { useTransition } from 'react';
import { Check, Globe, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { setLocaleAction } from '@/app/actions/locale';
import { type AppLocale } from '@/lib/i18n/config';
import { useAreaMessages } from '@/lib/i18n/client';
import { type I18nArea } from '@/lib/i18n/messages';
import { useLocale } from './language-provider';

const LOCALE_OPTIONS: AppLocale[] = ['en', 'es'];

export function LanguageSwitcher({
  area,
  triggerClassName
}: {
  area: I18nArea;
  triggerClassName?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const locale = useLocale();
  const messages = useAreaMessages(area);
  const language = messages.language;

  const localeLabels: Record<AppLocale, string> = {
    en: language.english,
    es: language.spanish
  };

  const currentLabel = localeLabels[locale] ?? locale.toUpperCase();

  function handleChange(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    startTransition(async () => {
      await setLocaleAction(nextLocale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName}
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{language.label}:</span>
          <span>{currentLabel}</span>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={(event) => {
              event.preventDefault();
              handleChange(option);
            }}
            className="flex cursor-pointer items-center justify-between gap-3"
          >
            <span>{localeLabels[option]}</span>
            {locale === option ? <Check className="h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
