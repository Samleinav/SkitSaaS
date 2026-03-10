import type { SdkNotificationArea, SdkNotificationRecord } from '../notifications/types.js';
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
export declare function resolveSdkNotificationAreaFromPath(pathname: string | null | undefined): SdkNotificationArea | null;
export declare function normalizeSdkNotificationIds(input: number | number[]): number[];
export declare function buildSdkNotificationsUrl({ area, includeRead, limit }: {
    area: SdkNotificationArea;
    includeRead?: boolean;
    limit?: number;
}): string;
export declare function useNotifications(options?: UseNotificationsOptions): UseNotificationsResult;
