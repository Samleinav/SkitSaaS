'use client';

export type SdkNotifyTone = 'success' | 'error' | 'info' | 'warning';

export type SdkNotifyInput = {
  title?: string;
  message: string;
  tone?: SdkNotifyTone;
  durationMs?: number;
};

export const SDK_NOTIFY_EVENT = 'skitsaas:sdk-notify';

export function sdkNotify(input: SdkNotifyInput) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<SdkNotifyInput>(SDK_NOTIFY_EVENT, {
      detail: input
    })
  );
}

export const notify = {
  notify(input: SdkNotifyInput) {
    sdkNotify(input);
  },
  success(message: string, input?: Omit<SdkNotifyInput, 'message' | 'tone'>) {
    sdkNotify({ ...input, message, tone: 'success' });
  },
  error(message: string, input?: Omit<SdkNotifyInput, 'message' | 'tone'>) {
    sdkNotify({ ...input, message, tone: 'error' });
  },
  info(message: string, input?: Omit<SdkNotifyInput, 'message' | 'tone'>) {
    sdkNotify({ ...input, message, tone: 'info' });
  },
  warning(message: string, input?: Omit<SdkNotifyInput, 'message' | 'tone'>) {
    sdkNotify({ ...input, message, tone: 'warning' });
  }
};
