import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { BuildModal } from '@/components/ui/build-modal';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import { AdminCreateUserForm } from './create-user-form';

type UserTemplateOption = {
  id: number;
  name: string;
  billingInterval: string;
  priceCents: number;
  currency: string;
};

type AdminCreateUserDialogProps = {
  messages: AdminMessages;
  userTemplateOptions: UserTemplateOption[];
  locale: string;
  themeId: string | null;
};

export function AdminCreateUserDialog({
  messages,
  userTemplateOptions,
  locale,
  themeId
}: AdminCreateUserDialogProps) {
  const fallbackDialog = (
    <BuildModal
      definition={{
        kind: 'dialog',
        triggerLabel: messages.usersPage.newUser,
        triggerSize: 'sm',
        title: messages.usersPage.createTitle,
        description: messages.usersPage.createDescription
      }}
      themeId={themeId}
      area="admin"
      slot="admin.users.create-user-dialog"
    >
      <AdminCreateUserForm
        messages={messages}
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
