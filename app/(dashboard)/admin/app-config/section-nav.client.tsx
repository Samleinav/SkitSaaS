'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  CreditCard,
  Mail,
  Package,
  SlidersHorizontal
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemeRuntime } from '@/components/theme/theme-runtime-provider';
import { ThemeTemplate } from '@/components/ui/theme-template';
import { useAreaMessages } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

type AppConfigSectionKey = 'general' | 'paymentMethods' | 'email';

type AppConfigSectionItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  key?: AppConfigSectionKey;
  label?: string;
  description?: string;
};

export type AppConfigSectionExtraItem = {
  href: string;
  label: string;
  description?: string;
  icon?: 'settings' | 'payments' | 'email' | 'theme' | 'module';
};

const SECTION_ITEMS: AppConfigSectionItem[] = [
  {
    href: '/admin/app-config/general',
    icon: SlidersHorizontal,
    key: 'general'
  },
  {
    href: '/admin/app-config/payments-methods',
    icon: CreditCard,
    key: 'paymentMethods'
  },
  {
    href: '/admin/app-config/email',
    icon: Mail,
    key: 'email'
  }
];

const EXTRA_ICON_MAP: Record<
  NonNullable<AppConfigSectionExtraItem['icon']>,
  ComponentType<{ className?: string }>
> = {
  settings: SlidersHorizontal,
  payments: CreditCard,
  email: Mail,
  theme: SlidersHorizontal,
  module: Package
};

function resolveExtraIcon(icon?: AppConfigSectionExtraItem['icon']) {
  if (!icon) {
    return Package;
  }

  return EXTRA_ICON_MAP[icon] ?? Package;
}

export function AppConfigSectionNavClient({
  extraItems = []
}: {
  extraItems?: AppConfigSectionExtraItem[];
}) {
  const runtime = useThemeRuntime();
  const messages = useAreaMessages('admin');
  const pathname = usePathname();
  const appConfig = messages.appConfig;
  const isRootPage = pathname === '/admin/app-config';

  if (!isRootPage) {
    return null;
  }

  const resolvedExtraItems: AppConfigSectionItem[] = extraItems.map((item) => ({
    href: item.href,
    icon: resolveExtraIcon(item.icon),
    label: item.label,
    description: item.description ?? ''
  }));

  const items = [...SECTION_ITEMS, ...resolvedExtraItems];
  const fallbackPanel = (
    <Card className="border-border/70">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>{appConfig.navigationTitle}</CardTitle>
          <CardDescription>{appConfig.navigationDescription}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const label = item.label ?? (item.key ? appConfig.sections[item.key] : '');
          const description =
            item.description ??
            (item.key ? appConfig.sectionDescriptions[item.key] : '');
          const fallbackItem = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group block w-full rounded-xl border p-4 transition-colors',
                isActive
                  ? 'border-primary/25 bg-primary/10'
                  : 'border-border/70 bg-background/70 hover:bg-accent/40'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border',
                    isActive
                      ? 'border-primary/25 bg-background text-primary'
                      : 'border-border/70 bg-background text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{label}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
              </div>
            </Link>
          );

          return (
            <ThemeTemplate
              key={item.href}
              id="section.admin.app-config-nav.item"
              themeId={runtime?.themeKey ?? null}
              data={{
                area: 'admin',
                slot: 'app-config.nav.item',
                href: item.href,
                active: isActive
              }}
              fallback={fallbackItem}
            >
              {fallbackItem}
            </ThemeTemplate>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <ThemeTemplate
      id="section.admin.app-config-nav.panel"
      themeId={runtime?.themeKey ?? null}
      data={{
        area: 'admin',
        slot: 'app-config.nav.panel'
      }}
      fallback={fallbackPanel}
    >
      {fallbackPanel}
    </ThemeTemplate>
  );
}
