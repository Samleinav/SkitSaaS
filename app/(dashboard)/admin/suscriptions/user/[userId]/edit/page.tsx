import { redirect } from 'next/navigation';

export default async function LegacyAdminEditUserSubscriptionPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  redirect(`/admin/subscriptions/user/${userId}/edit`);
}
