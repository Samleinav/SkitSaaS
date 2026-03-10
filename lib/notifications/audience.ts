export type NotificationTeamRecipients = 'members' | 'owner' | 'all';

export type NotificationAudience =
  | {
      type: 'global';
    }
  | {
      type: 'users';
      userIds: number[];
    }
  | {
      type: 'team';
      teamId: number;
      recipients?: NotificationTeamRecipients;
    };

function toPositiveInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export function normalizeNotificationUserIds(userIds: number[]) {
  return Array.from(
    new Set(userIds.map((value) => toPositiveInt(value)).filter(Boolean) as number[])
  ).sort((left, right) => left - right);
}

export function normalizeNotificationTeamRecipients(
  value: unknown
): NotificationTeamRecipients {
  if (value === 'members' || value === 'owner' || value === 'all') {
    return value;
  }

  return 'all';
}

export async function resolveNotificationAudienceRecipientUserIds(
  audience: NotificationAudience,
  deps: {
    listTeamAudienceUserIds?: (
      teamId: number,
      recipients: NotificationTeamRecipients
    ) => Promise<number[]>;
  } = {}
) {
  if (audience.type === 'global') {
    return [];
  }

  if (audience.type === 'users') {
    return normalizeNotificationUserIds(audience.userIds);
  }

  const listTeamAudienceUserIds = deps.listTeamAudienceUserIds;
  if (!listTeamAudienceUserIds) {
    throw new Error(
      'resolveNotificationAudienceRecipientUserIds requires listTeamAudienceUserIds for team audiences.'
    );
  }

  return normalizeNotificationUserIds(
    await listTeamAudienceUserIds(
      audience.teamId,
      normalizeNotificationTeamRecipients(audience.recipients)
    )
  );
}
