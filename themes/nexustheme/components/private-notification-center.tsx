'use client';

import * as React from 'react';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  TriangleAlert,
  X
} from 'lucide-react';
import {
  type SdkNotificationRecord,
  useI18n,
  useNotifications
} from '@skitsaas/sdk';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

type PrivateNotificationCenterProps = {
  area: 'admin' | 'dashboard';
  themeId?: string;
};

function formatNotificationTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
}

function getNotificationToneIcon(tone: SdkNotificationRecord['tone']) {
  if (tone === 'success') {
    return CheckCircle2;
  }

  if (tone === 'error') {
    return AlertCircle;
  }

  if (tone === 'warning') {
    return TriangleAlert;
  }

  return Info;
}

function getNotificationToneClassName(tone: SdkNotificationRecord['tone']) {
  if (tone === 'success') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
  }

  if (tone === 'error') {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300';
  }

  if (tone === 'warning') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-200';
  }

  return 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-200';
}

export function NexusPrivateNotificationCenter({
  area,
  themeId
}: PrivateNotificationCenterProps) {
  const t = useI18n({ themeId, area });
  const [open, setOpen] = React.useState(false);
  const { items, unreadItems, dismiss, markRead, isLoading, error } =
    useNotifications({
      area,
      includeRead: true
    });
  const unreadCount = unreadItems.length;
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative rounded-xl border-border/70 bg-background/80"
          aria-label={t('Notifications')}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm">
              {unreadLabel}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[24rem] rounded-2xl border-border/70 bg-popover/98 p-0 shadow-2xl backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-popover-foreground">
              {t('Notifications')}
            </p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? t('Unread notifications')
                : t('All caught up')}
            </p>
          </div>
          <Badge variant="secondary">{unreadCount} {t('new')}</Badge>
        </div>

        <ScrollArea className="max-h-[26rem]">
          <div className="space-y-2 p-3">
            {isLoading && items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                {t('Loading notifications...')}
              </div>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                {error ? t('Unable to load notifications.') : t('No notifications available.')}
              </div>
            ) : null}

            {items.map((item: SdkNotificationRecord) => {
              const ToneIcon = getNotificationToneIcon(item.tone);
              const isUnread = !item.readAt;
              const createdAtLabel = formatNotificationTime(item.createdAt);

              return (
                <article
                  key={item.id}
                  className={cn(
                    'rounded-xl border p-3 shadow-sm',
                    isUnread
                      ? 'border-border/80 bg-background'
                      : 'border-border/60 bg-muted/35'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        getNotificationToneClassName(item.tone)
                      )}
                    >
                      <ToneIcon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-popover-foreground">
                            {item.title || t('System notification')}
                          </p>
                          {createdAtLabel ? (
                            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              {createdAtLabel}
                            </p>
                          ) : null}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => {
                            void dismiss(item.id);
                          }}
                          aria-label={t('Dismiss')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.message}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        {isUnread ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void markRead(item.id);
                            }}
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            {t('Mark read')}
                          </Button>
                        ) : (
                          <Badge variant="outline">{t('Read')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
