'use client';
export const SDK_NOTIFY_EVENT = 'skitsaas:sdk-notify';
export function sdkNotify(input) {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(new CustomEvent(SDK_NOTIFY_EVENT, {
        detail: input
    }));
}
export const notify = {
    notify(input) {
        sdkNotify(input);
    },
    success(message, input) {
        sdkNotify({ ...input, message, tone: 'success' });
    },
    error(message, input) {
        sdkNotify({ ...input, message, tone: 'error' });
    },
    info(message, input) {
        sdkNotify({ ...input, message, tone: 'info' });
    },
    warning(message, input) {
        sdkNotify({ ...input, message, tone: 'warning' });
    }
};
