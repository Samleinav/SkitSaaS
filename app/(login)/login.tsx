'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Playfair_Display, Space_Grotesk } from 'next/font/google';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon } from 'lucide-react';
import { signInAdmin, signInDashboard, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import { useAreaMessages } from '@/lib/i18n/client';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
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

type LoginProviderOption = {
  providerId: string;
  displayName: string;
  kind: string;
  startPath: string;
};

export function Login({
  mode = 'signin',
  allowModeSwitch = true,
  signInPath = '/login',
  signUpPath = '/sign-up',
  themeId = null,
  authArea = 'dashboard',
  allowPasswordLogin = true,
  providerOptions = []
}: {
  mode?: 'signin' | 'signup';
  allowModeSwitch?: boolean;
  signInPath?: string;
  signUpPath?: string;
  themeId?: string | null;
  authArea?: 'dashboard' | 'admin';
  allowPasswordLogin?: boolean;
  providerOptions?: LoginProviderOption[];
}) {
  const messages = useAreaMessages('login');
  const auth = messages.auth;
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const templateId = searchParams.get('templateId');
  const inviteId = searchParams.get('inviteId');
  const signInAction = authArea === 'admin' ? signInAdmin : signInDashboard;
  const [state, formAction] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signInAction : signUp,
    { error: '' }
  );
  const showPasswordForm = allowPasswordLogin;
  const showExternalProviders = mode === 'signin' && providerOptions.length > 0;
  const showModeSwitch = allowModeSwitch && allowPasswordLogin;
  const switchModePath = mode === 'signin' ? signUpPath : signInPath;
  const switchModeParams = new URLSearchParams();
  if (redirect) {
    switchModeParams.set('redirect', redirect);
  }
  if (templateId) {
    switchModeParams.set('templateId', templateId);
  }
  const switchModeHref = switchModeParams.size
    ? `${switchModePath}?${switchModeParams.toString()}`
    : switchModePath;

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
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher
            area="login"
            triggerClassName="rounded-sm border-amber-200/20 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-900 hover:text-amber-100"
          />
        </div>

        <div className="marketing-panel rounded-2xl p-6 sm:p-8">
          <div className="flex justify-center">
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/30 bg-amber-200/10">
              <CircleIcon className="h-5 w-5 text-amber-100" />
              <span className="absolute -inset-1 rounded-full border border-amber-200/20" />
            </span>
          </div>

          <h2 className="mt-6 text-center font-[family-name:var(--font-auth-serif)] text-3xl font-semibold text-zinc-100">
            {mode === 'signin' ? auth.signInTitle : auth.signUpTitle}
          </h2>

          {showPasswordForm ? (
            <form className="mt-8 space-y-6" action={formAction}>
              <input type="hidden" name="redirect" value={redirect || ''} />
              <input type="hidden" name="templateId" value={templateId || ''} />
              <input type="hidden" name="inviteId" value={inviteId || ''} />

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                  {auth.email}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state.email}
                  required
                  maxLength={50}
                  className="h-11 rounded-sm border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-amber-200/40 focus-visible:ring-amber-200/35"
                  placeholder={auth.emailPlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                  {auth.password}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  defaultValue={state.password}
                  required
                  minLength={8}
                  maxLength={100}
                  className="h-11 rounded-sm border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-amber-200/40 focus-visible:ring-amber-200/35"
                  placeholder={auth.passwordPlaceholder}
                />
              </div>

              {state?.error ? <div className="text-sm text-red-300">{state.error}</div> : null}

              <ThemedAsyncSubmitButton
                themeId={themeId}
                slot={mode === 'signin' ? 'login.signin.submit' : 'login.signup.submit'}
                idleLabel={mode === 'signin' ? auth.signIn : auth.signUp}
                pendingLabel={auth.loading}
                className="h-11 w-full rounded-sm border border-amber-200/30 bg-amber-200/10 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase transition-colors hover:bg-amber-200 hover:text-black"
              />
            </form>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="rounded-sm border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300">
                {mode === 'signin'
                  ? auth.passwordSignInDisabled
                  : auth.passwordSignUpDisabled}
              </div>
              {state?.error ? <div className="text-sm text-red-300">{state.error}</div> : null}
            </div>
          )}

          {showExternalProviders ? (
            <div className="mt-6 space-y-3">
              {providerOptions.map((provider) => (
                <Link
                  key={provider.providerId}
                  href={`${provider.startPath}?area=${authArea}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-sm border border-zinc-700 bg-zinc-900/70 px-4 text-xs font-semibold tracking-[0.15em] text-zinc-200 uppercase transition-colors hover:border-amber-200/30 hover:text-amber-100"
                >
                  {auth.continueWith} {provider.displayName}
                </Link>
              ))}
            </div>
          ) : null}

          {!showPasswordForm && mode === 'signin' && !showExternalProviders ? (
            <p className="mt-6 text-sm text-zinc-400">{auth.noExternalProviders}</p>
          ) : null}

          {showModeSwitch ? (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-[#0c0c0c] px-3 text-zinc-500">
                    {mode === 'signin' ? auth.newToPlatform : auth.alreadyHaveAccount}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={switchModeHref}
                  className="inline-flex h-11 w-full items-center justify-center rounded-sm border border-zinc-700 bg-zinc-900/70 px-4 text-xs font-semibold tracking-[0.15em] text-zinc-300 uppercase transition-colors hover:border-amber-200/30 hover:text-amber-100"
                >
                  {mode === 'signin' ? auth.createAccount : auth.signInExisting}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
