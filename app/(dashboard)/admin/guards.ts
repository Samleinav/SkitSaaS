import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getUser } from '@/lib/db/queries';

const ALLOWED_ADMIN_ROLES = new Set(['admin']);

export async function requireAdminAccess() {
  await connection();

  const currentUser = await getUser();
  if (!currentUser) {
    redirect('/admin/login');
  }

  if (!ALLOWED_ADMIN_ROLES.has(currentUser.role)) {
    redirect('/dashboard');
  }

  return currentUser;
}
