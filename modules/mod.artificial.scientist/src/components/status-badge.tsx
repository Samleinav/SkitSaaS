import type { ScientistAgentStatus, ScientistRunStatus } from '../types';

const STATUS_TONE: Record<
  ScientistRunStatus | ScientistAgentStatus,
  string
> = {
  queued: 'border-slate-300 bg-slate-100 text-slate-700',
  running: 'border-sky-200 bg-sky-50 text-sky-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  pending: 'border-slate-300 bg-slate-100 text-slate-700',
};

export function ScientistStatusBadge({
  status,
}: {
  status: ScientistRunStatus | ScientistAgentStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_TONE[status]}`}
    >
      {status}
    </span>
  );
}
