import { redirect } from 'next/navigation';

export default async function LegacyAdminEditSubscriptionTemplatePage({
  params
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  redirect(`/admin/subscriptions/templates/${templateId}/edit`);
}
