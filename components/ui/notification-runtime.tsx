'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  resolveSdkNotificationAreaFromPath,
  useNotifications
} from '@skitsaas/sdk';
import { useNotify } from '@/components/ui/notify';

const TOAST_DURATION_MS = 5000;

export function NotificationRuntime() {
  const pathname = usePathname();
  const area = React.useMemo(
    () => resolveSdkNotificationAreaFromPath(pathname),
    [pathname]
  );
  const hostNotify = useNotify();
  const shownIdsRef = React.useRef<Set<number>>(new Set());
  const { unreadItems, markRead } = useNotifications({
    area: area ?? 'auto',
    enabled: area !== null
  });

  React.useEffect(() => {
    if (!area || unreadItems.length === 0) {
      return;
    }

    const pendingIds: number[] = [];
    for (const item of unreadItems) {
      if (shownIdsRef.current.has(item.id)) {
        continue;
      }

      shownIdsRef.current.add(item.id);
      pendingIds.push(item.id);
      hostNotify.notify({
        title: item.title ?? undefined,
        message: item.message,
        tone: item.tone,
        durationMs: TOAST_DURATION_MS
      });
    }

    if (pendingIds.length === 0) {
      return;
    }

    void markRead(pendingIds).catch(() => {
      for (const notificationId of pendingIds) {
        shownIdsRef.current.delete(notificationId);
      }
    });
  }, [area, hostNotify, markRead, unreadItems]);

  return null;
}
