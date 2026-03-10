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
  mergeClassNames,
  type SdkNotificationRecord,
  useI18n,
  useNotifications
} from '@skitsaas/sdk';

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
    return 'border-emerald-200/80 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200';
  }

  if (tone === 'error') {
    return 'border-rose-200/80 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200';
  }

  if (tone === 'warning') {
    return 'border-amber-200/80 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100';
  }

  return 'border-sky-200/80 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-100';
}

export function FirstBackofficeNotificationCenter({
  area,
  themeId
}: PrivateNotificationCenterProps) {
  const t = useI18n({ themeId, area });
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { items, unreadItems, dismiss, markRead, isLoading, error } =
    useNotifications({
      area,
      includeRead: true
    });

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  const unreadCount = unreadItems.length;
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('Notifications')}
        className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/85 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-900/85 dark:text-slate-100"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
            {unreadLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-[70] mt-3 w-[24rem] overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/95">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('Notifications')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount > 0
                  ? t('Unread notifications')
                  : t('All caught up')}
              </p>
            </div>
            <div className="rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-300">
              {unreadCount} {t('new')}
            </div>
          </div>

          <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {isLoading && items.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200/80 bg-slate-50/90 px-4 py-6 text-sm text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400">
                {t('Loading notifications...')}
              </div>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200/80 bg-slate-50/90 px-4 py-6 text-sm text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400">
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
                  className={mergeClassNames(
                    'rounded-[1.5rem] border px-4 py-3 shadow-sm transition-colors',
                    isUnread
                      ? 'border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-950'
                      : 'border-slate-200/70 bg-slate-50/80 dark:border-slate-800/70 dark:bg-slate-900/70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={mergeClassNames(
                        'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border',
                        getNotificationToneClassName(item.tone)
                      )}
                    >
                      <ToneIcon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.title || t('System notification')}
                          </p>
                          {createdAtLabel ? (
                            <p className="mt-1 text-[11px] font-medium tracking-[0.14em] text-slate-400 uppercase dark:text-slate-500">
                              {createdAtLabel}
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            void dismiss(item.id);
                          }}
                          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          aria-label={t('Dismiss')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {item.message}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => {
                              void markRead(item.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase transition-colors hover:bg-slate-200 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            {t('Mark read')}
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-emerald-700 uppercase dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                            {t('Read')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
