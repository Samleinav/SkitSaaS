export type AdminUserAccountStatus = 'active' | 'suspended' | 'banned';
export type AdminUserDisplayStatus = AdminUserAccountStatus | 'deleted';

export function resolveAdminUserDisplayStatus({
  deletedAt,
  accountStatus
}: {
  deletedAt: Date | null;
  accountStatus: string | null;
}): AdminUserDisplayStatus {
  if (deletedAt) {
    return 'deleted';
  }

  if (accountStatus === 'suspended') {
    return 'suspended';
  }

  if (accountStatus === 'banned') {
    return 'banned';
  }

  return 'active';
}

export function getAdminUserStatusClassName(status: AdminUserDisplayStatus) {
  if (status === 'suspended') {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (status === 'banned') {
    return 'bg-rose-100 text-rose-700';
  }

  if (status === 'deleted') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-green-100 text-green-700';
}
