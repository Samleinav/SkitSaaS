import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import {
  createDashboardUpdateAccountBuildFormBase
} from '@/app/(dashboard)/dashboard/general/forms';
import {
  createDashboardUpdatePasswordBuildFormBase
} from '@/app/(dashboard)/dashboard/security/forms';
import { requireAdminAccess } from '../guards';

export const metadata = { title: 'Account' };

export default async function AdminAccountPage() {
  const currentUser = await requireAdminAccess();
  const accountForm = composeRegisteredBuildFormDefinition(
    'dashboard-update-account-form',
    createDashboardUpdateAccountBuildFormBase({
      copy: {
        nameLabel: 'Name',
        namePlaceholder: 'Your name',
        emailLabel: 'Email',
        emailPlaceholder: 'your@email.com'
      }
    }),
    {
      submit: {
        idleLabel: 'Save Changes',
        pendingLabel: 'Saving...',
        align: 'start'
      },
      values: {
        userId: currentUser.id,
        name: currentUser.name ?? '',
        email: currentUser.email
      }
    }
  );
  const passwordForm = composeRegisteredBuildFormDefinition(
    'dashboard-update-password-form',
    createDashboardUpdatePasswordBuildFormBase({
      copy: {
        currentPasswordLabel: 'Current Password',
        newPasswordLabel: 'New Password',
        confirmPasswordLabel: 'Confirm New Password'
      }
    }),
    {
      submit: {
        idleLabel: 'Update Password',
        pendingLabel: 'Updating...',
        align: 'start'
      }
    }
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateBuildForm
            definition={accountForm}
            area="admin"
            route="/admin/account"
            slot="admin.account.profile"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateBuildForm
            definition={passwordForm}
            area="admin"
            route="/admin/account"
            slot="admin.account.password"
          />
        </CardContent>
      </Card>
    </div>
  );
}
