import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { HubPageProps } from '../../home/page';
import { HUB_MEMBERS } from '../../demo-data';

/**
 * Hub portal — member detail page.
 * Auth required: middleware enforces proxyAuth via HubRoutes.member.
 * Served at: /hub/members/{id}
 *
 * The `params` object contains extracted path parameters:
 *   params.id → the {id} segment from the route pattern
 */

export default function HubMemberDetailPage({ params }: HubPageProps) {
  const member = HUB_MEMBERS.find((entry) => entry.id === params.id);
  if (!member) return notFound();

  return (
    <div className="hub-shell">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/hub/members" className="hub-link">
          Members
        </Link>
        <span>/</span>
        <span className="text-slate-600">{member.name}</span>
      </div>

      <div className="hub-card">
        <div className="hub-card__body">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {member.name}
              </h1>
              <p className="text-sm text-slate-500">{member.role}</p>
            </div>
            <span className={`hub-status hub-status--${member.status}`}>
              {member.status}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</dt>
              <dd className="mt-1 text-sm text-slate-700">{member.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Joined</dt>
              <dd className="mt-1 text-sm text-slate-700">{member.joinedAt}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Bio</dt>
              <dd className="mt-1 text-sm text-slate-700">{member.bio}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="text-xs text-slate-300">
        Route params: {JSON.stringify(params)} · Member ID: {params.id}
      </div>
    </div>
  );
}
