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
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  resolveLocale,
  type AppLocale
} from '@/lib/i18n/config';
import { getLocaleDisplayName } from '@/lib/i18n/formatting';
import { useI18n } from '@/lib/i18n/client';
import { type I18nArea } from '@/lib/i18n/messages';
import { useLocale } from './language-provider';

const LOCALE_OPTIONS = SUPPORTED_LOCALES;

function persistLocaleCookie(nextLocale: AppLocale) {
  const locale = resolveLocale(nextLocale);
  const cookieParts = [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    'Path=/',
    `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
    'SameSite=Lax'
  ];

  if (window.location.protocol === 'https:') {
    cookieParts.push('Secure');
  }

  document.cookie = cookieParts.join('; ');
}

export function LanguageSwitcher({
  area,
  themeId,
  triggerClassName
}: {
  area: I18nArea;
  themeId?: string | null;
  triggerClassName?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const locale = useLocale();
  const t = useI18n({ area, themeId });
  const currentLabel = getLocaleDisplayName(locale, locale);

  function handleChange(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    startTransition(() => {
      persistLocaleCookie(nextLocale);
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
          <span className="hidden sm:inline">{t('Language')}:</span>
          <span>{currentLabel}</span>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_OPTIONS.map((option) => {
          const optionLabel = getLocaleDisplayName(option, locale);

          return (
            <DropdownMenuItem
              key={option}
              onSelect={(event) => {
                event.preventDefault();
                handleChange(option);
              }}
              className="flex cursor-pointer items-center justify-between gap-3"
            >
              <span>{optionLabel}</span>
              {locale === option ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
