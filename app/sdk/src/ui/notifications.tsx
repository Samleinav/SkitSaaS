'use client';

import * as React from 'react';
import type {
  SdkNotificationArea,
  SdkNotificationRecord
} from '../notifications/types.js';

export type UseNotificationsOptions = {
  area?: SdkNotificationArea | 'auto';
  enabled?: boolean;
  includeRead?: boolean;
  limit?: number;
  pollIntervalMs?: number;
};

export type UseNotificationsResult = {
  items: SdkNotificationRecord[];
  unreadItems: SdkNotificationRecord[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markRead: (input: number | number[]) => Promise<number>;
  dismiss: (input: number | number[]) => Promise<number>;
};

const DEFAULT_NOTIFICATIONS_LIMIT = 25;
const DEFAULT_NOTIFICATIONS_POLL_INTERVAL_MS = 15000;

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export function resolveSdkNotificationAreaFromPath(
  pathname: string | null | undefined
): SdkNotificationArea | null {
  const normalizedPath = toTrimmedString(pathname).toLowerCase();
  if (!normalizedPath) {
    return null;
  }

  if (normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) {
    return 'admin';
  }

  if (
    normalizedPath === '/dashboard' ||
    normalizedPath.startsWith('/dashboard/')
  ) {
    return 'dashboard';
  }

  return null;
}

export function normalizeSdkNotificationIds(input: number | number[]) {
  const values = Array.isArray(input) ? input : [input];

  return Array.from(
    new Set(
      values.filter(
        (value) => typeof value === 'number' && Number.isInteger(value) && value > 0
      )
    )
  ).sort((left, right) => left - right);
}

export function buildSdkNotificationsUrl({
  area,
  includeRead = false,
  limit = DEFAULT_NOTIFICATIONS_LIMIT
}: {
  area: SdkNotificationArea;
  includeRead?: boolean;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('area', area);

  if (includeRead) {
    searchParams.set('includeRead', '1');
  }

  if (Number.isInteger(limit) && limit > 0) {
    searchParams.set(
      'limit',
      String(Math.min(limit, 100))
    );
  }

  const query = searchParams.toString();
  return query ? `/api/notifications?${query}` : '/api/notifications';
}

function resolveRequestedArea(area: UseNotificationsOptions['area']) {
  if (area === 'admin' || area === 'dashboard') {
    return area;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return resolveSdkNotificationAreaFromPath(window.location.pathname);
}

async function parseMutationResponse(response: Response) {
  try {
    return (await response.json()) as {
      updatedCount?: unknown;
      error?: unknown;
    };
  } catch {
    return null;
  }
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsResult {
  const {
    area = 'auto',
    enabled = true,
    includeRead = false,
    limit = DEFAULT_NOTIFICATIONS_LIMIT,
    pollIntervalMs = DEFAULT_NOTIFICATIONS_POLL_INTERVAL_MS
  } = options;
  const [items, setItems] = React.useState<SdkNotificationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const requestIdRef = React.useRef(0);
  const itemsRef = React.useRef<SdkNotificationRecord[]>([]);

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const refresh = React.useCallback(async () => {
    const currentArea = resolveRequestedArea(area);
    if (!enabled || !currentArea || typeof window === 'undefined') {
      React.startTransition(() => {
        setItems([]);
        setError(null);
        setIsLoading(false);
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(itemsRef.current.length === 0);

    try {
      const response = await fetch(
        buildSdkNotificationsUrl({
          area: currentArea,
          includeRead,
          limit
        }),
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          },
          cache: 'no-store'
        }
      );

      const body = (await response.json()) as {
        items?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        const message =
          typeof body?.error === 'string'
            ? body.error
            : 'Unable to load notifications.';
        throw new Error(message);
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextItems = Array.isArray(body?.items)
        ? (body.items as SdkNotificationRecord[])
        : [];

      React.startTransition(() => {
        setItems(nextItems);
        setError(null);
        setIsLoading(false);
      });
    } catch (cause) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextError =
        cause instanceof Error
          ? cause
          : new Error('Unable to load notifications.');

      React.startTransition(() => {
        setError(nextError);
        setIsLoading(false);
      });
    }
  }, [area, enabled, includeRead, limit]);

  const mutateNotifications = React.useCallback(
    async (path: string, input: number | number[]) => {
      const currentArea = resolveRequestedArea(area);
      const ids = normalizeSdkNotificationIds(input);
      if (!enabled || !currentArea || ids.length === 0) {
        return 0;
      }

      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          ids,
          area: currentArea
        })
      });

      const body = await parseMutationResponse(response);
      if (!response.ok) {
        const message =
          typeof body?.error === 'string'
            ? body.error
            : 'Unable to update notifications.';
        throw new Error(message);
      }

      await refresh();
      return typeof body?.updatedCount === 'number' ? body.updatedCount : 0;
    },
    [area, enabled, refresh]
  );

  const markRead = React.useCallback(
    async (input: number | number[]) =>
      mutateNotifications('/api/notifications/read', input),
    [mutateNotifications]
  );

  const dismiss = React.useCallback(
    async (input: number | number[]) =>
      mutateNotifications('/api/notifications/dismiss', input),
    [mutateNotifications]
  );

  React.useEffect(() => {
    void refresh();

    if (
      !enabled ||
      !Number.isInteger(pollIntervalMs) ||
      pollIntervalMs <= 0 ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, pollIntervalMs, refresh]);

  const unreadItems = React.useMemo(
    () => items.filter((item) => !item.readAt),
    [items]
  );

  return {
    items,
    unreadItems,
    isLoading,
    error,
    refresh,
    markRead,
    dismiss
  };
}
