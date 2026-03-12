import Link from 'next/link';
import type { HubPageProps } from '../home/page';

/**
 * Hub portal — members list page.
 * Auth required: middleware enforces proxyAuth via HubRoutes.members.
 * Served at: /hub/members
 */

// Demo data — replace with real DB query in production
const DEMO_MEMBERS = [
  { id: '1', name: 'Alice Ramos', role: 'Admin', joinedAt: '2024-01-15', status: 'active' },
  { id: '2', name: 'Ben Nakamura', role: 'Member', joinedAt: '2024-02-20', status: 'active' },
  { id: '3', name: 'Carla Osei', role: 'Member', joinedAt: '2024-03-05', status: 'inactive' },
  { id: '4', name: 'Diego Silva', role: 'Moderator', joinedAt: '2024-03-18', status: 'active' },
] as const;

export default function HubMembersPage({ searchParams }: HubPageProps) {
  const filter = typeof searchParams.status === 'string' ? searchParams.status : '';
  const members = filter
    ? DEMO_MEMBERS.filter((m) => m.status === filter)
    : DEMO_MEMBERS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Members</h1>
          <p className="text-sm text-slate-500">
            {members.length} member{members.length !== 1 ? 's' : ''}
            {filter ? ` · filtered by: ${filter}` : ''}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link
            href="/hub/members"
            className="rounded border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
          >
            All
          </Link>
          <Link
            href="/hub/members?status=active"
            className="rounded border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
          >
            Active
          </Link>
          <Link
            href="/hub/members?status=inactive"
            className="rounded border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
          >
            Inactive
          </Link>
        </div>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {members.map((member) => (
          <Link
            key={member.id}
            href={`/hub/members/${member.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-400">{member.role} · joined {member.joinedAt}</p>
            </div>
            <span
              className={
                member.status === 'active'
                  ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700'
                  : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500'
              }
            >
              {member.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
