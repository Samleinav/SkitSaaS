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
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import {
  getAdminTransferCandidatesForUser,
  getAdminUserById,
  getAdminUserOrganizations,
  getUserSubscriptionTemplatesForAdmin
} from '@/lib/db/queries.admin';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../guards';
import { formatDateTime } from '../../utils';
import {
  createAdminDeleteUserBuildFormBase,
  createAdminEditUserProfileBuildFormBase,
  createAdminEditUserStatusBuildFormBase
} from '../forms';
import {
  getAdminUserStatusClassName,
  resolveAdminUserDisplayStatus
} from '../status';
import { createAdminUserDetailCopy } from '../i18n';

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
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'admin' })
  ]);
  const usersDetail = createAdminUserDetailCopy(t);
  const dateLocale = getDateLocale(locale);
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
      getUserSubscriptionTemplatesForAdmin({ includeReserved: true })
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
  const userProfileForm = composeRegisteredBuildFormDefinition(
    'admin-edit-user-profile-form',
    createAdminEditUserProfileBuildFormBase({
      copy: {
        nameLabel: usersDetail.profileNameLabel,
        emailLabel: usersDetail.profileEmailLabel,
        roleLabel: usersDetail.profileRoleLabel,
        subscriptionLabel: usersDetail.profileSubscriptionLabel,
        noSubscription: usersDetail.noSubscription,
        roles: usersDetail.roles
      },
      locale: dateLocale,
      userTemplateOptions,
      disabled: saveProfileDisabled
    }),
    {
      submit: saveProfileDisabled
        ? undefined
        : {
            idleLabel: usersDetail.saveProfile,
            pendingLabel: usersDetail.savingProfile,
            align: 'start'
          },
      values: {
        userId: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        subscriptionTemplateId: user.subscriptionTemplateId ?? null
      }
    }
  );
  const userStatusForm = composeRegisteredBuildFormDefinition(
    'admin-update-user-status-form',
    createAdminEditUserStatusBuildFormBase({
      copy: {
        statusLabel: usersDetail.statusFieldLabel,
        statusReasonLabel: usersDetail.statusReasonLabel,
        statusReasonPlaceholder: usersDetail.statusReasonPlaceholder,
        status: {
          active: usersDetail.status.active,
          suspended: usersDetail.status.suspended,
          banned: usersDetail.status.banned
        }
      },
      disabled: saveStatusDisabled
    }),
    {
      submit: saveStatusDisabled
        ? undefined
        : {
            idleLabel: usersDetail.saveStatus,
            pendingLabel: usersDetail.savingStatus,
            align: 'start'
          },
      values: {
        userId: user.id,
        accountStatus: normalizedAccountStatus,
        statusReason: user.statusReason || ''
      }
    }
  );
  const userDeleteForm = composeRegisteredBuildFormDefinition(
    'admin-delete-user-form',
    createAdminDeleteUserBuildFormBase({
      copy: {
        transferLabel: usersDetail.transferLabel,
        transferNone: usersDetail.transferNone,
        deleteReasonLabel: usersDetail.deleteReasonLabel,
        deleteReasonPlaceholder: usersDetail.deleteReasonPlaceholder
      },
      transferCandidates,
      disabled: deleteDisabled
    }),
    {
      submit: deleteDisabled
        ? undefined
        : {
            idleLabel: usersDetail.deleteButton,
            pendingLabel: usersDetail.confirmDelete,
            align: 'start',
            variant: 'destructive',
            size: 'sm',
            confirm: {
              title: usersDetail.confirmDeleteTitle,
              description: usersDetail.confirmDeleteDescription,
              confirmLabel: usersDetail.confirmDelete,
              cancelLabel: usersDetail.cancel,
              triggerVariant: 'destructive',
              confirmVariant: 'destructive'
            }
          },
      values: {
        userId: user.id,
        requiresTransfer: user.ownedOrganizationsCount > 0 ? 'true' : 'false',
        transferUserId: '',
        statusReason: ''
      }
    }
  );

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
        <CardContent className="space-y-3">
          <TemplateBuildForm
            definition={userProfileForm}
            area="admin"
            route={`/admin/users/${user.id}`}
            slot="admin.users.detail.profile"
          />
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
        <CardContent className="space-y-3">
          <TemplateBuildForm
            definition={userStatusForm}
            area="admin"
            route={`/admin/users/${user.id}`}
            slot="admin.users.detail.status"
          />
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
          <TemplateBuildForm
            definition={userDeleteForm}
            area="admin"
            route={`/admin/users/${user.id}`}
            slot="admin.users.detail.delete"
          />

          {isSelfProfile ? (
            <p className="text-xs text-muted-foreground">{usersDetail.deleteSelfGuard}</p>
          ) : null}
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
