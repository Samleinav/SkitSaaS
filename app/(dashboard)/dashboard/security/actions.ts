'use server';

import {
  deleteAccount as deleteAccountBase,
  updatePassword as updatePasswordBase
} from '@/app/(login)/actions';

export async function updatePassword(
  ...args: Parameters<typeof updatePasswordBase>
) {
  return updatePasswordBase(...args);
}

export async function deleteAccount(
  ...args: Parameters<typeof deleteAccountBase>
) {
  return deleteAccountBase(...args);
}
