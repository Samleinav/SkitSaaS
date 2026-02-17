'use client';

import { Suspense, useActionState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';
import { useAreaMessages } from '@/lib/i18n/client';
import { type User } from '@/lib/db/schema';
import { updateAccount } from '../actions';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = ''
}: AccountFormProps) {
  const messages = useAreaMessages('dashboard');
  const general = messages.general;

  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          {general.name}
        </Label>
        <Input
          id="name"
          name="name"
          placeholder={general.namePlaceholder}
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          {general.email}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={general.emailPlaceholder}
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

export default function GeneralPageClient() {
  const messages = useAreaMessages('dashboard');
  const general = messages.general;
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium text-foreground lg:text-2xl">
        {general.title}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{general.accountInformation}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error ? <p className="text-red-500 text-sm">{state.error}</p> : null}
            {state.success ? (
              <p className="text-green-500 text-sm">{state.success}</p>
            ) : null}
            <ThemedAsyncSubmitButton
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              idleLabel={general.saveChanges}
              pendingLabel={general.saving}
              slot="dashboard.general.update-account"
            />
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
