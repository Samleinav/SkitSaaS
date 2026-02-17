'use client';

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAreaMessages } from '@/lib/i18n/client';

type NotifyTone = 'success' | 'error' | 'info' | 'warning';

type NotifyInput = {
  title?: string;
  message: string;
  tone?: NotifyTone;
  durationMs?: number;
};

type NotifyPresetInput = Omit<NotifyInput, 'message' | 'tone'>;

type NotifyItem = {
  id: string;
  title?: string;
  message: string;
  tone: NotifyTone;
};

type NotifyContextValue = {
  notify: (input: NotifyInput) => string;
  success: (message: string, input?: NotifyPresetInput) => string;
  error: (message: string, input?: NotifyPresetInput) => string;
  info: (message: string, input?: NotifyPresetInput) => string;
  warning: (message: string, input?: NotifyPresetInput) => string;
  dismiss: (id: string) => void;
};

const DEFAULT_DURATION_MS = 3200;
const NotifyContext = React.createContext<NotifyContextValue | null>(null);

function createNotifyId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getToneIcon(tone: NotifyTone) {
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

function getToneClassName(tone: NotifyTone) {
  if (tone === 'success') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100';
  }

  if (tone === 'error') {
    return 'border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100';
  }

  if (tone === 'warning') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100';
  }

  return 'border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100';
}

function getDefaultTitle(
  tone: NotifyTone,
  titles: {
    success: string;
    error: string;
    info: string;
    warning: string;
  }
) {
  if (tone === 'success') {
    return titles.success;
  }

  if (tone === 'error') {
    return titles.error;
  }

  if (tone === 'warning') {
    return titles.warning;
  }

  return titles.info;
}

function NotifyViewport({
  items,
  onDismiss,
  dismissAriaLabel
}: {
  items: NotifyItem[];
  onDismiss: (id: string) => void;
  dismissAriaLabel: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => {
        const Icon = getToneIcon(item.tone);

        return (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className={cn(
              'pointer-events-auto rounded-lg border p-3 shadow-lg backdrop-blur',
              getToneClassName(item.tone)
            )}
          >
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1 space-y-0.5">
                {item.title ? <p className="text-sm font-semibold">{item.title}</p> : null}
                <p className="text-sm">{item.message}</p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="rounded p-1 opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={dismissAriaLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const messages = useAreaMessages('global');
  const notifyMessages = messages.notify;
  const [items, setItems] = React.useState<NotifyItem[]>([]);
  const timersRef = React.useRef<Map<string, number>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));

    const timeoutId = timersRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = React.useCallback(
    ({ title, message, tone = 'info', durationMs = DEFAULT_DURATION_MS }: NotifyInput) => {
      const id = createNotifyId();
      const resolvedTitle =
        title ?? (tone === 'warning' || tone === 'error'
          ? getDefaultTitle(tone, notifyMessages.titles)
          : undefined);

      setItems((current) => [
        ...current,
        {
          id,
          title: resolvedTitle,
          message,
          tone
        }
      ]);

      if (durationMs > 0) {
        const timeoutId = window.setTimeout(() => dismiss(id), durationMs);
        timersRef.current.set(id, timeoutId);
      }

      return id;
    },
    [dismiss, notifyMessages.titles]
  );

  React.useEffect(
    () => () => {
      for (const timeoutId of timersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      timersRef.current.clear();
    },
    []
  );

  const value = React.useMemo<NotifyContextValue>(
    () => ({
      notify,
      success(message, input) {
        return notify({ ...input, message, tone: 'success' });
      },
      error(message, input) {
        return notify({ ...input, message, tone: 'error' });
      },
      info(message, input) {
        return notify({ ...input, message, tone: 'info' });
      },
      warning(message, input) {
        return notify({ ...input, message, tone: 'warning' });
      },
      dismiss
    }),
    [dismiss, notify]
  );

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <NotifyViewport
        items={items}
        onDismiss={dismiss}
        dismissAriaLabel={notifyMessages.dismissAria}
      />
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const context = React.useContext(NotifyContext);

  if (!context) {
    throw new Error('useNotify must be used within a NotifyProvider');
  }

  return context;
}
