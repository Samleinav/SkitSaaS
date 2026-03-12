import { redirect } from 'next/navigation';

export default async function LegacyAdminEditOrganizationSubscriptionPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  redirect(`/admin/subscriptions/organization/${teamId}/edit`);
}
