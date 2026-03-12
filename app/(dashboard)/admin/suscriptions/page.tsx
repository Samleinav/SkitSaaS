import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildQueryString(
  searchParams: Record<string, string | string[] | undefined>
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value) {
      query.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) {
          query.append(key, entry);
        }
      }
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export default async function LegacyAdminSuscriptionsPage({
  searchParams
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  redirect(`/admin/subscriptions${buildQueryString(resolvedSearchParams)}`);
}
