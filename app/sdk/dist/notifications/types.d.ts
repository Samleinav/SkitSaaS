export type SdkNotificationTone = 'success' | 'error' | 'info' | 'warning';
export type SdkNotificationTargetArea = 'auto' | 'admin' | 'dashboard' | 'both';
export type SdkNotificationArea = 'admin' | 'dashboard';
export type SdkNotificationAudienceType = 'global' | 'direct';
export type SdkNotificationTeamRecipients = 'members' | 'owner' | 'all';
export type SdkNotificationAudience = {
    type: 'global';
} | {
    type: 'users';
    userIds: number[];
} | {
    type: 'team';
    teamId: number;
    recipients?: SdkNotificationTeamRecipients;
};
export type SdkNotificationRecord = {
    id: number;
    title: string | null;
    message: string;
    tone: SdkNotificationTone;
    area: SdkNotificationTargetArea;
    audienceType: SdkNotificationAudienceType;
    source: string | null;
    metadata: unknown;
    startsAt: string;
    expiresAt: string | null;
    createdAt: string;
    readAt: string | null;
    dismissedAt: string | null;
};
export type SdkCreateNotificationInput = {
    audience?: SdkNotificationAudience;
    title?: string | null;
    message: string;
    tone?: SdkNotificationTone | null;
    area?: SdkNotificationTargetArea | null;
    source?: string | null;
    metadata?: unknown;
    startsAt?: Date | string | null;
    expiresAt?: Date | string | null;
    createdByUserId?: number | null;
};
export type SdkCreateNotificationResult = {
    notificationId: number;
    audienceType: SdkNotificationAudienceType;
    recipientUserIds: number[];
};
