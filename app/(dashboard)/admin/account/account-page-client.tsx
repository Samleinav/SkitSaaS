'use client';

import { Suspense, useActionState } from 'react';
import { Lock } from 'lucide-react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { type User } from '@/lib/db/schema';
import { updateAccount } from '@/app/(dashboard)/dashboard/general/actions';
import { updatePassword } from '@/app/(dashboard)/dashboard/security/actions';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AccountState = { name?: string; error?: string; success?: string };
type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

function ProfileFormFields({
  state,
  user
}: {
  state: AccountState;
  user?: User | null;
}) {
  return (
    <>
      <div>
        <Label htmlFor="admin-name" className="mb-2">Name</Label>
        <Input
          id="admin-name"
          name="name"
          placeholder="Your name"
          defaultValue={state.name ?? user?.name ?? ''}
          required
        />
      </div>
      <div>
        <Label htmlFor="admin-email" className="mb-2">Email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          placeholder="your@email.com"
          defaultValue={user?.email ?? ''}
          required
        />
      </div>
    </>
  );
}

function ProfileFormWithData({ state }: { state: AccountState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return <ProfileFormFields state={state} user={user} />;
}

export default function AdminAccountPageClient() {
  const [accountState, accountAction, isAccountPending] = useActionState<AccountState, FormData>(
    updateAccount,
    {}
  );
  const [passwordState, passwordAction, isPasswordPending] = useActionState<PasswordState, FormData>(
    updatePassword,
    {}
  );

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={accountAction}>
            <Suspense fallback={<ProfileFormFields state={accountState} />}>
              <ProfileFormWithData state={accountState} />
            </Suspense>
            {accountState.error && (
              <p className="text-sm text-destructive">{accountState.error}</p>
            )}
            {accountState.success && (
              <p className="text-sm text-green-500">{accountState.success}</p>
            )}
            <Button
              type="submit"
              disabled={isAccountPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isAccountPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={passwordAction}>
            <div>
              <Label htmlFor="admin-current-password" className="mb-2">Current Password</Label>
              <Input
                id="admin-current-password"
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
              <Label htmlFor="admin-new-password" className="mb-2">New Password</Label>
              <Input
                id="admin-new-password"
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
              <Label htmlFor="admin-confirm-password" className="mb-2">Confirm New Password</Label>
              <Input
                id="admin-confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.confirmPassword}
              />
            </div>
            {passwordState.error && (
              <p className="text-sm text-destructive">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-sm text-green-500">{passwordState.success}</p>
            )}
            <Button
              type="submit"
              disabled={isPasswordPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Lock className="mr-2 h-4 w-4" />
              {isPasswordPending ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
