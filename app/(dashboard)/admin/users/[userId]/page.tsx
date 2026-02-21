import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { TemplateConfirmSubmitButton } from '@/components/ui/template-confirm-submit-button';
import {
  getAdminTransferCandidatesForUser,
  getAdminUserById,
  getAdminUserOrganizations,
  getUserSubscriptionTemplatesForAdmin
} from '@/lib/db/queries';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../guards';
import { formatDateTime } from '../../utils';
import {
  deleteUserAction,
  updateUserAccountStatusAction,
  updateUserProfileAction
} from '../actions';
import {
  getAdminUserStatusClassName,
  resolveAdminUserDisplayStatus
} from '../status';

function formatTemplatePrice({
  priceCents,
  currency,
  locale
}: {
  priceCents: number;
  currency: string;
  locale: string;
}) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(priceCents / 100);
}

export default async function AdminUserDetailsPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const { locale, messages } = await getServerLocaleAndMessages('admin');
  const usersDetail = messages.userDetailPage;
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';
  const currentUser = await requireAdminAccess();

  const { userId } = await params;
  const parsedUserId = Number(userId);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    notFound();
  }

  const [user, organizations, transferCandidates, userTemplateOptions] =
    await Promise.all([
      getAdminUserById(parsedUserId),
      getAdminUserOrganizations(parsedUserId),
      getAdminTransferCandidatesForUser(parsedUserId),
      getUserSubscriptionTemplatesForAdmin()
    ]);

  if (!user) {
    notFound();
  }

  const displayStatus = resolveAdminUserDisplayStatus({
    deletedAt: user.deletedAt,
    accountStatus: user.accountStatus
  });
  const normalizedAccountStatus =
    user.accountStatus === 'suspended' || user.accountStatus === 'banned'
      ? user.accountStatus
      : 'active';
  const isDeleted = displayStatus === 'deleted';
  const isSelfProfile = currentUser.id === user.id;

  const displayStatusLabel =
    displayStatus === 'suspended'
      ? usersDetail.status.suspended
      : displayStatus === 'banned'
        ? usersDetail.status.banned
        : displayStatus === 'deleted'
          ? usersDetail.status.deleted
          : usersDetail.status.active;

  const userSubscriptionLabel = user.subscriptionTemplateName
    ? `${user.subscriptionTemplateName} (${user.subscriptionTemplateInterval})`
    : usersDetail.noSubscription;

  const userSubscriptionPrice = user.subscriptionTemplateName
    ? formatTemplatePrice({
        priceCents: user.subscriptionTemplatePriceCents ?? 0,
        currency: user.subscriptionTemplateCurrency ?? 'USD',
        locale: dateLocale
      })
    : null;

  const saveProfileDisabled = isDeleted;
  const saveStatusDisabled = isDeleted || isSelfProfile;
  const deleteDisabled = isDeleted || isSelfProfile;
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{usersDetail.title}</CardTitle>
            <CardDescription>{usersDetail.description}</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/users">{usersDetail.backToUsers}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{usersDetail.userLabel}</p>
              <p className="font-medium">{user.name || usersDetail.unnamedUser}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{usersDetail.statusLabel}</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${getAdminUserStatusClassName(
                  displayStatus
                )}`}
              >
                {displayStatusLabel}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                {user.statusReason || usersDetail.noReason}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                {usersDetail.organizationsLabel}
              </p>
              <p className="font-medium">
                {usersDetail.organizationCount
                  .replace('{count}', String(user.organizationsCount))
                  .replace('{owned}', String(user.ownedOrganizationsCount))}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                {usersDetail.createdUpdatedLabel}
              </p>
              <p className="text-xs">
                {usersDetail.createdAtPrefix}{' '}
                {formatDateTime(user.createdAt, dateLocale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {usersDetail.updatedAtPrefix}{' '}
                {formatDateTime(user.updatedAt, dateLocale)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{usersDetail.profileTitle}</CardTitle>
          <CardDescription>{usersDetail.profileDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateUserProfileAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />

            <div className="space-y-2">
              <Label htmlFor="profile-name">{usersDetail.profileNameLabel}</Label>
              <Input
                id="profile-name"
                name="name"
                defaultValue={user.name || ''}
                maxLength={100}
                disabled={saveProfileDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">{usersDetail.profileEmailLabel}</Label>
              <Input
                id="profile-email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                maxLength={255}
                disabled={saveProfileDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-role">{usersDetail.profileRoleLabel}</Label>
              <select
                id="profile-role"
                name="role"
                defaultValue={user.role}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={saveProfileDisabled}
              >
                <option value="member">{usersDetail.roles.member}</option>
                <option value="owner">{usersDetail.roles.owner}</option>
                <option value="admin">{usersDetail.roles.admin}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-subscription">
                {usersDetail.profileSubscriptionLabel}
              </Label>
              <select
                id="profile-subscription"
                name="subscriptionTemplateId"
                defaultValue={user.subscriptionTemplateId || ''}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={saveProfileDisabled}
              >
                <option value="">{usersDetail.noSubscription}</option>
                {userTemplateOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {`${template.name} (${template.billingInterval})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <TemplateAsyncSubmitButton
                area="admin"
                route={`/admin/users/${user.id}`}
                idleLabel={usersDetail.saveProfile}
                pendingLabel={usersDetail.savingProfile}
                disabled={saveProfileDisabled}
              />
            </div>
          </form>
          {isDeleted ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {usersDetail.profileDisabledForDeleted}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{usersDetail.statusTitle}</CardTitle>
          <CardDescription>{usersDetail.statusDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateUserAccountStatusAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />

            <div className="space-y-2">
              <Label htmlFor="account-status">{usersDetail.statusFieldLabel}</Label>
              <select
                id="account-status"
                name="accountStatus"
                defaultValue={normalizedAccountStatus}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={saveStatusDisabled}
              >
                <option value="active">{usersDetail.status.active}</option>
                <option value="suspended">{usersDetail.status.suspended}</option>
                <option value="banned">{usersDetail.status.banned}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-reason">{usersDetail.statusReasonLabel}</Label>
              <Input
                id="status-reason"
                name="statusReason"
                defaultValue={user.statusReason || ''}
                placeholder={usersDetail.statusReasonPlaceholder}
                maxLength={250}
                disabled={saveStatusDisabled}
              />
            </div>

            <div className="md:col-span-2">
              <TemplateAsyncSubmitButton
                area="admin"
                route={`/admin/users/${user.id}`}
                idleLabel={usersDetail.saveStatus}
                pendingLabel={usersDetail.savingStatus}
                disabled={saveStatusDisabled}
              />
            </div>
          </form>
          {isSelfProfile ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {usersDetail.statusSelfGuard}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{usersDetail.relationshipsTitle}</CardTitle>
          <CardDescription>{usersDetail.relationshipsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              {usersDetail.userSubscriptionLabel}
            </p>
            <p className="font-medium">{userSubscriptionLabel}</p>
            {userSubscriptionPrice ? (
              <p className="text-xs text-muted-foreground">{userSubscriptionPrice}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{usersDetail.organizationsTableTitle}</p>
            {organizations.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        {usersDetail.organizationHeaders.name}
                      </th>
                      <th className="px-3 py-2 text-left">
                        {usersDetail.organizationHeaders.membership}
                      </th>
                      <th className="px-3 py-2 text-left">
                        {usersDetail.organizationHeaders.subscription}
                      </th>
                      <th className="px-3 py-2 text-left">
                        {usersDetail.organizationHeaders.provider}
                      </th>
                      <th className="px-3 py-2 text-left">
                        {usersDetail.organizationHeaders.status}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((organization) => (
                      <tr key={`${organization.teamId}-${organization.memberRole}`}>
                        <td className="border-t px-3 py-2">{organization.teamName}</td>
                        <td className="border-t px-3 py-2 capitalize">
                          {organization.memberRole}
                        </td>
                        <td className="border-t px-3 py-2">
                          {organization.subscriptionTemplateName ||
                            organization.planName ||
                            usersDetail.noSubscription}
                        </td>
                        <td className="border-t px-3 py-2">
                          {organization.paymentProvider || usersDetail.noProvider}
                        </td>
                        <td className="border-t px-3 py-2">
                          {organization.subscriptionStatus || usersDetail.noStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {usersDetail.noOrganizations}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>{usersDetail.deleteTitle}</CardTitle>
          <CardDescription>{usersDetail.deleteDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {usersDetail.deleteHint
              .replace('{owned}', String(user.ownedOrganizationsCount))}
          </p>
          <form id="delete-user-form" action={deleteUserAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />

            <div className="space-y-2">
              <Label htmlFor="transfer-user">{usersDetail.transferLabel}</Label>
              <select
                id="transfer-user"
                name="transferUserId"
                defaultValue=""
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required={user.ownedOrganizationsCount > 0}
                disabled={deleteDisabled}
              >
                <option value="">{usersDetail.transferNone}</option>
                {transferCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name || candidate.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-reason">{usersDetail.deleteReasonLabel}</Label>
              <Input
                id="delete-reason"
                name="statusReason"
                placeholder={usersDetail.deleteReasonPlaceholder}
                maxLength={250}
                disabled={deleteDisabled}
              />
            </div>
          </form>

          {isSelfProfile ? (
            <p className="text-xs text-muted-foreground">{usersDetail.deleteSelfGuard}</p>
          ) : null}

          <TemplateConfirmSubmitButton
            area="admin"
            route={`/admin/users/${user.id}`}
            formId="delete-user-form"
            title={usersDetail.confirmDeleteTitle}
            description={usersDetail.confirmDeleteDescription}
            triggerLabel={usersDetail.deleteButton}
            confirmLabel={usersDetail.confirmDelete}
            cancelLabel={usersDetail.cancel}
            triggerVariant="destructive"
            triggerSize="sm"
            disabled={deleteDisabled}
          />
        </CardContent>
      </Card>
    </div>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.user.detail"
      data={{
        title: usersDetail.title,
        description: usersDetail.description,
        userId: user.id
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
