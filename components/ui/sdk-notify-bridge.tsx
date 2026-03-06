'use client';

import * as React from 'react';
import {
  SDK_NOTIFY_EVENT,
  type SdkNotifyInput
} from '@skitsaas/sdk';
import { useNotify } from '@/components/ui/notify';

export function SdkNotifyBridge() {
  const hostNotify = useNotify();

  React.useEffect(() => {
    function handleSdkNotify(event: Event) {
      const detail = (event as CustomEvent<SdkNotifyInput>).detail;
      if (!detail?.message) {
        return;
      }

      hostNotify.notify({
        title: detail.title,
        message: detail.message,
        tone: detail.tone,
        durationMs: detail.durationMs
      });
    }

    window.addEventListener(SDK_NOTIFY_EVENT, handleSdkNotify as EventListener);
    return () => {
      window.removeEventListener(
        SDK_NOTIFY_EVENT,
        handleSdkNotify as EventListener
      );
    };
  }, [hostNotify]);

  return null;
}
