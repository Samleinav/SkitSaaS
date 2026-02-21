import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
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
};

export async function AdminCreateUserDialog({
  messages,
  userTemplateOptions,
  locale
}: AdminCreateUserDialogProps) {
  const fallbackDialog = (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">{messages.usersPage.newUser}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.usersPage.createTitle}</DialogTitle>
          <DialogDescription>{messages.usersPage.createDescription}</DialogDescription>
        </DialogHeader>
        <AdminCreateUserForm
          messages={messages}
          userTemplateOptions={userTemplateOptions}
          locale={locale}
        />
      </DialogContent>
    </Dialog>
  );

  return (
    <ThemeCodeTemplate
      id="ui.dialog"
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
