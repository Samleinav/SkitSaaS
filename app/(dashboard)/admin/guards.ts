import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getAdminAreaRoles } from '@/lib/runtime-config/roles';

export async function requireAdminAccess() {
  await connection();

  const currentUser = await getUser();
  if (!currentUser) {
    redirect('/admin/login');
  }

  if (!getAdminAreaRoles().has(currentUser.role)) {
    redirect('/dashboard');
  }

  return currentUser;
}
