import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { HubPageProps } from '../../home/page';

/**
 * Hub portal — member detail page.
 * Auth required: middleware enforces proxyAuth via HubRoutes.member.
 * Served at: /hub/members/{id}
 *
 * The `params` object contains extracted path parameters:
 *   params.id → the {id} segment from the route pattern
 */

const DEMO_MEMBERS: Record<string, {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
  status: string;
  email: string;
  bio: string;
}> = {
  '1': { id: '1', name: 'Alice Ramos', role: 'Admin', joinedAt: '2024-01-15', status: 'active', email: 'alice@example.com', bio: 'Portal administrator and community builder.' },
  '2': { id: '2', name: 'Ben Nakamura', role: 'Member', joinedAt: '2024-02-20', status: 'active', email: 'ben@example.com', bio: 'Joined to connect with the community.' },
  '3': { id: '3', name: 'Carla Osei', role: 'Member', joinedAt: '2024-03-05', status: 'inactive', email: 'carla@example.com', bio: 'Currently inactive.' },
  '4': { id: '4', name: 'Diego Silva', role: 'Moderator', joinedAt: '2024-03-18', status: 'active', email: 'diego@example.com', bio: 'Helps moderate community discussions.' },
};

export default function HubMemberDetailPage({ params }: HubPageProps) {
  // params.id is extracted by the portal dispatcher from the {id} pattern
  const member = DEMO_MEMBERS[params.id];
  if (!member) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/hub/members" className="hover:text-slate-700">
          Members
        </Link>
        <span>/</span>
        <span className="text-slate-600">{member.name}</span>
      </div>

      <div className="rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {member.name}
            </h1>
            <p className="text-sm text-slate-500">{member.role}</p>
          </div>
          <span
            className={
              member.status === 'active'
                ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'
                : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500'
            }
          >
            {member.status}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</dt>
            <dd className="mt-1 text-sm text-slate-700">{member.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">Joined</dt>
            <dd className="mt-1 text-sm text-slate-700">{member.joinedAt}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">Bio</dt>
            <dd className="mt-1 text-sm text-slate-700">{member.bio}</dd>
          </div>
        </dl>
      </div>

      <div className="text-xs text-slate-300">
        Route params: {JSON.stringify(params)} · Member ID: {params.id}
      </div>
    </div>
  );
}
