'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@skitsaas/sdk';
import { ScientistApiRoutes, ScientistDashboardRoutes } from '../routes';
import type { ScientistRunMode } from '../types';

type CreateSessionResponse = {
  session?: {
    id: number;
  };
  error?: string;
};

export function ScientistSessionCreateForm() {
  const t = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<ScientistRunMode>('research_query');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsPending(true);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(String(ScientistApiRoutes.sessionCreate), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title,
              mode,
            }),
          });
          const data = (await response.json()) as CreateSessionResponse;

          if (!response.ok || !data.session?.id) {
            throw new Error(data.error || t('Unable to create session.'));
          }

          setTitle('');
          router.push(
            ScientistDashboardRoutes.session.with({ sessionId: data.session.id })
          );
          router.refresh();
        } catch (submitError) {
          setError(
            submitError instanceof Error
              ? submitError.message
              : t('Unable to create session.')
          );
        } finally {
          setIsPending(false);
        }
      })();
    });
  }

  return (
    <form className="grid gap-3 md:grid-cols-[2fr,1fr,auto]" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm text-slate-700">
        <span>{t('Session title')}</span>
        <input
          className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-sky-500"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={3}
          maxLength={240}
          placeholder="Metformin + PCOS + insulin resistance"
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-700">
        <span>{t('Mode')}</span>
        <select
          className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-sky-500"
          value={mode}
          onChange={(event) => setMode(event.target.value as ScientistRunMode)}
        >
          <option value="research_query">research_query</option>
          <option value="document_analysis">document_analysis</option>
          <option value="clinical_case">clinical_case</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="mt-auto inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t('Creating session...') : t('Create session')}
      </button>

      {error ? (
        <p className="md:col-span-3 text-sm text-rose-700">{error}</p>
      ) : null}
    </form>
  );
}
