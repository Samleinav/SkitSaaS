'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@skitsaas/sdk';
import { ScientistApiRoutes, ScientistDashboardRoutes } from '../routes';
import type { ScientistModelTier } from '../types';

type RunLaunchResponse = {
  run?: {
    id: number;
  };
  error?: string;
};

export function ScientistRunLaunchForm({ sessionId }: { sessionId: number }) {
  const t = useI18n();
  const router = useRouter();
  const [rawQuery, setRawQuery] = useState('');
  const [focusOverride, setFocusOverride] = useState('');
  const [tier, setTier] = useState<ScientistModelTier>('standard');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsPending(true);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            ScientistApiRoutes.runCreate.with({ sessionId }),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                rawQuery,
                focusOverride,
                tier,
              }),
            }
          );
          const data = (await response.json()) as RunLaunchResponse;
          if (!response.ok || !data.run?.id) {
            throw new Error(data.error || t('Unable to start run.'));
          }

          setRawQuery('');
          setFocusOverride('');
          router.push(ScientistDashboardRoutes.run.with({ runId: data.run.id }));
          router.refresh();
        } catch (submitError) {
          setError(
            submitError instanceof Error
              ? submitError.message
              : t('Unable to start run.')
          );
        } finally {
          setIsPending(false);
        }
      })();
    });
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm text-slate-700">
        <span>{t('Research question')}</span>
        <textarea
          className="min-h-36 rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
          value={rawQuery}
          onChange={(event) => setRawQuery(event.target.value)}
          required
          minLength={8}
          placeholder="Compare metformin versus inositol for insulin resistance outcomes in PCOS."
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-700">
          <span>{t('Focus override')}</span>
          <input
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-sky-500"
            value={focusOverride}
            onChange={(event) => setFocusOverride(event.target.value)}
            placeholder={t('Optional branch or angle to emphasize')}
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span>{t('Tier')}</span>
          <select
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-sky-500"
            value={tier}
            onChange={(event) => setTier(event.target.value as ScientistModelTier)}
          >
            <option value="fast">fast</option>
            <option value="standard">standard</option>
            <option value="deep">deep</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t('Creating run...') : t('Start run')}
      </button>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
