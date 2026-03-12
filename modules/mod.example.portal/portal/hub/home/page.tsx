import Link from 'next/link';

/**
 * Hub portal — home page.
 * Public: no authentication required.
 * Served at: /hub
 */
export type HubPageProps = {
  slug: string[];
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default function HubHomePage({ searchParams }: HubPageProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome to the Hub
        </h1>
        <p className="text-slate-500">
          This is the public portal home page. No authentication required.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-5">
          <h2 className="mb-1 font-semibold text-slate-800">Members Area</h2>
          <p className="mb-4 text-sm text-slate-500">
            Requires authentication. Sign in to access the member directory.
          </p>
          <Link
            href="/hub/members"
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            View Members
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 p-5">
          <h2 className="mb-1 font-semibold text-slate-800">Portal Info</h2>
          <p className="mb-2 text-sm text-slate-500">
            This portal is served by <code className="text-xs">mod.example.portal</code> via
            the multi-portal system.
          </p>
          <dl className="space-y-1 text-xs text-slate-400">
            <div className="flex gap-2">
              <dt className="font-medium">Route:</dt>
              <dd>/hub/*</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Auth:</dt>
              <dd>public home, protected members</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Theme:</dt>
              <dd>raw (no theme pack)</dd>
            </div>
            {searchParams.debug === '1' && (
              <div className="mt-2 rounded bg-slate-100 p-2 font-mono">
                debug=1 via searchParams
              </div>
            )}
          </dl>
        </div>
      </section>
    </div>
  );
}
