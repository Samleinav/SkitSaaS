import { Suspense } from 'react';
import AdminAccountPageClient from './account-page-client';
import { requireAdminAccess } from '../guards';

export const metadata = { title: 'Account' };

export default async function AdminAccountPage() {
  await requireAdminAccess();

  return (
    <Suspense>
      <AdminAccountPageClient />
    </Suspense>
  );
}
