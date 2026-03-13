import Link from 'next/link';
import type { HubPageProps } from '../home/page';
import { HUB_MEMBERS } from '../demo-data';
import { HubMembersDataTable } from '../data-tables';

/**
 * Hub portal — members list page.
 * Auth required: middleware enforces proxyAuth via HubRoutes.members.
 * Served at: /hub/members
 */

export default function HubMembersPage({ searchParams }: HubPageProps) {
  const filter = typeof searchParams.status === 'string' ? searchParams.status : '';
  const members = filter ? HUB_MEMBERS.filter((m) => m.status === filter) : HUB_MEMBERS;

  return (
    <div className="hub-shell">
      <section className="hub-hero">
        <p className="hub-kicker">Protected directory</p>
        <h1 className="hub-title">Members</h1>
        <p className="hub-copy">
          {members.length} member{members.length !== 1 ? 's' : ''}
          {filter ? ` filtered by ${filter}` : ''}. This is now a local SDK DataTable instead
          of a handwritten list.
        </p>
        <div className="hub-chip-row">
          <Link href="/hub/members" className="hub-link">
            All
          </Link>
          <Link href="/hub/members?status=active" className="hub-link">
            Active
          </Link>
          <Link href="/hub/members?status=inactive" className="hub-link">
            Inactive
          </Link>
        </div>
      </section>

      <article className="hub-card">
        <header className="hub-card__header">
          <p className="hub-card__eyebrow">Local DataTable</p>
          <h2 className="hub-card__title">Member directory</h2>
          <p className="hub-card__description">
            Replace the demo data with a real DB query if this portal becomes production-facing.
          </p>
        </header>
        <div className="hub-card__body">
          <HubMembersDataTable items={members} />
        </div>
      </article>
    </div>
  );
}
