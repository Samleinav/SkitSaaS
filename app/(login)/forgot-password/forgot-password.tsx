'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Playfair_Display, Space_Grotesk } from 'next/font/google';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon } from 'lucide-react';
import { requestPasswordReset } from '../actions';
import { ActionState } from '@/lib/auth/middleware';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';

const authSans = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-auth-sans'
});
const authSerif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-auth-serif'
});

export function ForgotPassword({
  themeId = null
}: {
  themeId?: string | null;
}) {
  const t = useI18n({ area: 'login', themeId });

  const [state, formAction] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    { error: '' }
  );

  return (
    <div
      className={cn(
        'relative min-h-[100dvh] overflow-x-hidden bg-[#050505] text-zinc-100',
        authSans.variable,
        authSerif.variable
      )}
    >
      <div className="pointer-events-none absolute inset-0 marketing-grid opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-amber-300/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-yellow-100/10 blur-[140px]" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="marketing-panel rounded-2xl p-6 sm:p-8">
          <div className="flex justify-center">
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/30 bg-amber-200/10">
              <CircleIcon className="h-5 w-5 text-amber-100" />
              <span className="absolute -inset-1 rounded-full border border-amber-200/20" />
            </span>
          </div>

          <h2 className="mt-6 text-center font-[family-name:var(--font-auth-serif)] text-3xl font-semibold text-zinc-100">
            {t('Reset your password')}
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            {t("Enter your email and we'll send you a reset link.")}
          </p>

          {state?.success ? (
            <div className="mt-8 rounded-sm border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              {state.success}
            </div>
          ) : (
            <form className="mt-8 space-y-6" action={formAction}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                  {t('Email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  className="h-11 rounded-sm border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-amber-200/40 focus-visible:ring-amber-200/35"
                  placeholder={t('you@example.com')}
                />
              </div>

              {state?.error ? (
                <div className="text-sm text-red-300">{state.error}</div>
              ) : null}

              <ThemedAsyncSubmitButton
                themeId={themeId}
                slot="login.forgot-password.submit"
                idleLabel={t('Send reset link')}
                pendingLabel={t('Sending...')}
                className="h-11 w-full rounded-sm border border-amber-200/30 bg-amber-200/10 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase transition-colors hover:bg-amber-200 hover:text-black"
              />
            </form>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#0c0c0c] px-3 text-zinc-500">
                  {t('Remember your password?')}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-sm border border-zinc-700 bg-zinc-900/70 px-4 text-xs font-semibold tracking-[0.15em] text-zinc-300 uppercase transition-colors hover:border-amber-200/30 hover:text-amber-100"
              >
                {t('Back to sign in')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
