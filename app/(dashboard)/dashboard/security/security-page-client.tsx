'use client';

import { useActionState } from 'react';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';
import { ThemedConfirmSubmitButton } from '@/components/ui/themed-confirm-submit-button';
import { useAreaMessages } from '@/lib/i18n/client';
import { deleteAccount, updatePassword } from '../actions';

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

export default function SecurityPageClient() {
  const messages = useAreaMessages('dashboard');
  const security = messages.security;
  const [passwordState, passwordAction] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});

  const [deleteState, deleteAction, isDeletePending] = useActionState<
    DeleteState,
    FormData
  >(deleteAccount, {});

  function handleDeleteSubmit(event: React.FormEvent<HTMLFormElement>) {
    const submitEvent = event.nativeEvent as SubmitEvent;
    const submitter = submitEvent.submitter as HTMLElement | null;

    if (!submitter?.hasAttribute('data-confirm-submit')) {
      event.preventDefault();
    }
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium text-foreground lg:text-2xl">
        {security.title}
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{security.passwordTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={passwordAction}>
            <div>
              <Label htmlFor="current-password" className="mb-2">
                {security.currentPassword}
              </Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.currentPassword}
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="mb-2">
                {security.newPassword}
              </Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.newPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="mb-2">
                {security.confirmNewPassword}
              </Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.confirmPassword}
              />
            </div>
            {passwordState.error ? (
              <p className="text-red-500 text-sm">{passwordState.error}</p>
            ) : null}
            {passwordState.success ? (
              <p className="text-green-500 text-sm">{passwordState.success}</p>
            ) : null}
            <ThemedAsyncSubmitButton
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              idleLabel={security.updatePassword}
              idleIcon={<Lock className="mr-2 h-4 w-4" />}
              pendingLabel={security.updating}
              slot="dashboard.security.update-password"
            />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{security.deleteAccountTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {security.deleteWarning}
          </p>
          <form
            id="delete-account-form"
            action={deleteAction}
            className="space-y-4"
            onSubmit={handleDeleteSubmit}
          >
            <div>
              <Label htmlFor="delete-password" className="mb-2">
                {security.confirmPassword}
              </Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={deleteState.password}
              />
            </div>
            {deleteState.error ? (
              <p className="text-red-500 text-sm">{deleteState.error}</p>
            ) : null}
            <ThemedConfirmSubmitButton
              formId="delete-account-form"
              title={security.confirmDeleteTitle}
              description={security.confirmDeleteDescription}
              triggerLabel={security.deleteAccount}
              confirmLabel={security.confirm}
              cancelLabel={security.cancel}
              triggerVariant="destructive"
              triggerSize="default"
              disabled={isDeletePending}
              slot="dashboard.security.delete-account"
            />
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
