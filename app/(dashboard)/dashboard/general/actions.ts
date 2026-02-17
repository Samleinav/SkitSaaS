'use server';

import { updateAccount as updateAccountBase } from '@/app/(login)/actions';

export async function updateAccount(
  ...args: Parameters<typeof updateAccountBase>
) {
  return updateAccountBase(...args);
}
