export type SdkNotifyTone = 'success' | 'error' | 'info' | 'warning';
export type SdkNotifyInput = {
    title?: string;
    message: string;
    tone?: SdkNotifyTone;
    durationMs?: number;
};
export declare const SDK_NOTIFY_EVENT = "skitsaas:sdk-notify";
export declare function sdkNotify(input: SdkNotifyInput): void;
export declare const notify: {
    notify(input: SdkNotifyInput): void;
    success(message: string, input?: Omit<SdkNotifyInput, "message" | "tone">): void;
    error(message: string, input?: Omit<SdkNotifyInput, "message" | "tone">): void;
    info(message: string, input?: Omit<SdkNotifyInput, "message" | "tone">): void;
    warning(message: string, input?: Omit<SdkNotifyInput, "message" | "tone">): void;
};
