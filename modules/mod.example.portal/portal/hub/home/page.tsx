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
    <div className="hub-shell">
      <section className="hub-hero">
        <p className="hub-kicker">Portal showcase</p>
        <h1 className="hub-title">Welcome to the Hub</h1>
        <p className="hub-copy">
          This public page now uses module-owned portal styling so the portal reads
          as a distinct product surface rather than a frontend route with different copy.
        </p>
        <div className="hub-chip-row">
          <span className="hub-chip">Named portal</span>
          <span className="hub-chip">Own layout</span>
          <span className="hub-chip">Module CSS</span>
        </div>
      </section>

      <section className="hub-grid hub-grid--two">
        <article className="hub-card">
          <header className="hub-card__header">
            <p className="hub-card__eyebrow">Protected area</p>
            <h2 className="hub-card__title">Members Area</h2>
            <p className="hub-card__description">
              Requires authentication. Sign in to access the member directory and
              the portal-only DataTable example.
            </p>
          </header>
          <div className="hub-card__body">
            <Link href="/hub/members" className="hub-link">
              View Members
            </Link>
          </div>
        </article>

        <article className="hub-card">
          <header className="hub-card__header">
            <p className="hub-card__eyebrow">Portal info</p>
            <h2 className="hub-card__title">Portal runtime notes</h2>
            <p className="hub-card__description">
              This portal is served by <code>mod.example.portal</code> via the multi-portal system.
            </p>
          </header>
          <div className="hub-card__body">
            <dl className="space-y-2 text-sm text-slate-600">
              <div>
                <dt className="font-semibold">Route</dt>
                <dd>/hub/*</dd>
              </div>
              <div>
                <dt className="font-semibold">Auth</dt>
                <dd>public home, protected members</dd>
              </div>
              <div>
                <dt className="font-semibold">Theme</dt>
                <dd>module-owned portal shell</dd>
              </div>
              {searchParams.debug === '1' && (
                <div className="rounded-lg bg-sky-50 px-3 py-2 font-mono text-xs text-sky-700">
                  debug=1 via searchParams
                </div>
              )}
            </dl>
          </div>
        </article>
      </section>
    </div>
  );
}
