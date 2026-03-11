import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function requireAdminAccess() {
  await connection();

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/admin/login');
  }

  if (!currentUser.isAdmin()) {
    redirect('/dashboard');
  }

  return currentUser;
}
