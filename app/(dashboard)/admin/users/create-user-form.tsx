import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import {
  createAdminCreateUserBuildFormBase,
  type AdminUserTemplateOption
} from './forms';

type AdminCreateUserFormProps = {
  messages: AdminMessages;
  userTemplateOptions: AdminUserTemplateOption[];
  locale: string;
};

export function AdminCreateUserForm({
  messages,
  userTemplateOptions,
  locale
}: AdminCreateUserFormProps) {
  const usersCreateForm = messages.usersCreateForm;
  const definition = composeRegisteredBuildFormDefinition(
    'admin-create-user-form',
    createAdminCreateUserBuildFormBase({
      copy: usersCreateForm,
      locale,
      userTemplateOptions
    }
    ),
    {
      submit: {
        idleLabel: usersCreateForm.create,
        pendingLabel: usersCreateForm.creating,
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
