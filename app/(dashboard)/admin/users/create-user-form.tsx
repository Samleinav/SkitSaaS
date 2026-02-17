import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import { createUserAction } from '../actions';

type UserTemplateOption = {
  id: number;
  name: string;
  billingInterval: string;
  priceCents: number;
  currency: string;
};

type AdminCreateUserFormProps = {
  messages: AdminMessages;
  userTemplateOptions: UserTemplateOption[];
  locale: string;
};

function formatTemplateOptionLabel(
  { name, billingInterval, priceCents, currency }: UserTemplateOption,
  locale: string
) {
  const amount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(priceCents / 100);

  return `${name} - ${billingInterval} - ${amount}`;
}

export function AdminCreateUserForm({
  messages,
  userTemplateOptions,
  locale
}: AdminCreateUserFormProps) {
  const usersCreateForm = messages.usersCreateForm;

  return (
    <form action={createUserAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="create-user-name">{usersCreateForm.nameLabel}</Label>
        <Input
          id="create-user-name"
          name="name"
          placeholder={usersCreateForm.namePlaceholder}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-user-email">{usersCreateForm.emailLabel}</Label>
        <Input
          id="create-user-email"
          name="email"
          type="email"
          placeholder={usersCreateForm.emailPlaceholder}
          required
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-user-password">{usersCreateForm.passwordLabel}</Label>
        <Input
          id="create-user-password"
          name="password"
          type="password"
          minLength={8}
          maxLength={100}
          placeholder={usersCreateForm.passwordPlaceholder}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-user-role">{usersCreateForm.roleLabel}</Label>
        <select
          id="create-user-role"
          name="role"
          defaultValue="member"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="member">{usersCreateForm.roles.member}</option>
          <option value="owner">{usersCreateForm.roles.owner}</option>
          <option value="admin">{usersCreateForm.roles.admin}</option>
        </select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="create-user-subscription">
          {usersCreateForm.subscriptionLabel}
        </Label>
        <select
          id="create-user-subscription"
          name="subscriptionTemplateId"
          defaultValue=""
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{usersCreateForm.noSubscription}</option>
          {userTemplateOptions.map((template) => (
            <option key={template.id} value={template.id}>
              {formatTemplateOptionLabel(template, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <TemplateAsyncSubmitButton
          area="admin"
          route="/admin/users"
          idleLabel={usersCreateForm.create}
          pendingLabel={usersCreateForm.creating}
        />
      </div>
    </form>
  );
}
