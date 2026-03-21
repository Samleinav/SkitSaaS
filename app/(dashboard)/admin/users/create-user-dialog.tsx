import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { BuildModal } from '@/components/ui/build-modal';
import { AdminCreateUserForm } from './create-user-form';
import type { AdminUsersCopy } from './i18n';

type UserTemplateOption = {
  id: number;
  name: string;
  billingInterval: string;
  priceCents: number;
  currency: string;
};

type AdminCreateUserDialogProps = {
  copy: AdminUsersCopy;
  userTemplateOptions: UserTemplateOption[];
  locale: string;
  themeId: string | null;
};

export function AdminCreateUserDialog({
  copy,
  userTemplateOptions,
  locale,
  themeId
}: AdminCreateUserDialogProps) {
  const fallbackDialog = (
    <BuildModal
      definition={{
        kind: 'dialog',
        triggerLabel: copy.newUser,
        triggerSize: 'sm',
        title: copy.createTitle,
        description: copy.createDescription
      }}
      themeId={themeId}
      area="admin"
      slot="admin.users.create-user-dialog"
    >
      <AdminCreateUserForm
        copy={copy.usersCreateForm}
        userTemplateOptions={userTemplateOptions}
        locale={locale}
      />
    </BuildModal>
  );

  return (
    <ThemeCodeTemplate
      id="ui.dialog"
      themeId={themeId}
      data={{
        area: 'admin',
        slot: 'admin.users.create-user-dialog'
      }}
      fallback={fallbackDialog}
    >
      {fallbackDialog}
    </ThemeCodeTemplate>
  );
}
