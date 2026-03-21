import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import {
  createAdminCreateUserBuildFormBase,
  type AdminUserTemplateOption
} from './forms';
import type { AdminUsersCopy } from './i18n';

type AdminCreateUserFormProps = {
  copy: AdminUsersCopy['usersCreateForm'];
  userTemplateOptions: AdminUserTemplateOption[];
  locale: string;
};

export function AdminCreateUserForm({
  copy,
  userTemplateOptions,
  locale
}: AdminCreateUserFormProps) {
  const definition = composeRegisteredBuildFormDefinition(
    'admin-create-user-form',
    createAdminCreateUserBuildFormBase({
      copy,
      locale,
      userTemplateOptions
    }
    ),
    {
      submit: {
        idleLabel: copy.create,
        pendingLabel: copy.creating,
        align: 'start'
      }
    }
  );

  return (
    <TemplateBuildForm
      definition={definition}
      area="admin"
      route="/admin/users"
      slot="admin.users.create"
    />
  );
}
