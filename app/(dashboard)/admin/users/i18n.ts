import type { DataTableLabels } from '@/components/ui/data-table';
import type { Translator } from '@/lib/i18n/translator';
import type { AdminCreateUserFormCopy } from './forms';

export type AdminUsersTableCopy = {
  userHeader: string;
  unnamedUser: string;
  roleHeader: string;
  statusHeader: string;
  subscriptionHeader: string;
  organizationsHeader: string;
  createdHeader: string;
  actionsHeader: string;
  organizationsCount: string;
  noSubscription: string;
  manage: string;
  statusActive: string;
  statusSuspended: string;
  statusBanned: string;
  statusDeleted: string;
};

export type AdminUsersCopy = {
  title: string;
  description: string;
  filterPlaceholder: string;
  newUser: string;
  createTitle: string;
  createDescription: string;
  usersTable: AdminUsersTableCopy;
  usersCreateForm: AdminCreateUserFormCopy;
  dataTable: DataTableLabels;
};

export type AdminUserDetailCopy = {
  title: string;
  description: string;
  backToUsers: string;
  userLabel: string;
  unnamedUser: string;
  statusLabel: string;
  noReason: string;
  organizationsLabel: string;
  organizationCount: string;
  createdUpdatedLabel: string;
  createdAtPrefix: string;
  updatedAtPrefix: string;
  profileTitle: string;
  profileDescription: string;
  profileNameLabel: string;
  profileEmailLabel: string;
  profileRoleLabel: string;
  profileSubscriptionLabel: string;
  saveProfile: string;
  savingProfile: string;
  profileDisabledForDeleted: string;
  statusTitle: string;
  statusDescription: string;
  statusFieldLabel: string;
  statusReasonLabel: string;
  statusReasonPlaceholder: string;
  saveStatus: string;
  savingStatus: string;
  statusSelfGuard: string;
  status: {
    active: string;
    suspended: string;
    banned: string;
    deleted: string;
  };
  roles: {
    member: string;
    owner: string;
    admin: string;
  };
  relationshipsTitle: string;
  relationshipsDescription: string;
  userSubscriptionLabel: string;
  noSubscription: string;
  organizationsTableTitle: string;
  organizationHeaders: {
    name: string;
    membership: string;
    subscription: string;
    provider: string;
    status: string;
  };
  noProvider: string;
  noStatus: string;
  noOrganizations: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteHint: string;
  transferLabel: string;
  transferNone: string;
  deleteReasonLabel: string;
  deleteReasonPlaceholder: string;
  deleteSelfGuard: string;
  deleteButton: string;
  confirmDeleteTitle: string;
  confirmDeleteDescription: string;
  confirmDelete: string;
  cancel: string;
};

export function createAdminUsersCopy(t: Translator): AdminUsersCopy {
  return {
    title: t('Users'),
    description: t(
      'Review platform accounts, roles, access status, and user-level subscription coverage from one shell.'
    ),
    filterPlaceholder: t('Filter by email...'),
    newUser: t('New user'),
    createTitle: t('Create User'),
    createDescription: t(
      'Provision a new account, assign role, and optionally attach a user subscription template.'
    ),
    usersTable: {
      userHeader: t('User'),
      unnamedUser: t('Unnamed user'),
      roleHeader: t('Role'),
      statusHeader: t('Status'),
      subscriptionHeader: t('User subscription'),
      organizationsHeader: t('Organizations'),
      createdHeader: t('Created'),
      actionsHeader: t('Actions'),
      organizationsCount: t('{count} total • {owned} owner'),
      noSubscription: t('No subscription'),
      manage: t('Manage'),
      statusActive: t('Active'),
      statusSuspended: t('Suspended'),
      statusBanned: t('Banned'),
      statusDeleted: t('Deleted')
    },
    usersCreateForm: {
      nameLabel: t('Name'),
      namePlaceholder: t('Optional display name'),
      emailLabel: t('Email'),
      emailPlaceholder: t('name@company.com'),
      passwordLabel: t('Temporary password'),
      passwordPlaceholder: t('At least 8 characters'),
      roleLabel: t('Platform role'),
      subscriptionLabel: t('User subscription template'),
      noSubscription: t('No user subscription'),
      create: t('Create user'),
      creating: t('Creating user...'),
      roles: {
        member: t('Member'),
        owner: t('Owner'),
        admin: t('Admin')
      }
    },
    dataTable: {
      filterPlaceholder: t('Filter...'),
      columns: t('Columns'),
      noResults: t('No results.'),
      showingRows: t('Showing {shown} of {filtered} row(s).'),
      previous: t('Previous'),
      next: t('Next')
    }
  };
}

export function createAdminUserDetailCopy(
  t: Translator
): AdminUserDetailCopy {
  return {
    title: t('User Management'),
    description: t(
      'Edit profile data, moderation status, user subscription, organizations, and ownership transfer.'
    ),
    backToUsers: t('Back to users'),
    userLabel: t('User'),
    unnamedUser: t('Unnamed user'),
    statusLabel: t('Status'),
    noReason: t('No reason'),
    organizationsLabel: t('Organizations'),
    organizationCount: t('{count} total • {owned} owned'),
    createdUpdatedLabel: t('Audit'),
    createdAtPrefix: t('Created:'),
    updatedAtPrefix: t('Updated:'),
    profileTitle: t('Profile'),
    profileDescription: t(
      'Update identity and user-level subscription assignment.'
    ),
    profileNameLabel: t('Name'),
    profileEmailLabel: t('Email'),
    profileRoleLabel: t('Platform role'),
    profileSubscriptionLabel: t('User subscription template'),
    saveProfile: t('Save profile'),
    savingProfile: t('Saving profile...'),
    profileDisabledForDeleted: t('Deleted accounts cannot be edited.'),
    statusTitle: t('Moderation'),
    statusDescription: t('Activate, suspend, or ban account access.'),
    statusFieldLabel: t('Account status'),
    statusReasonLabel: t('Reason (optional)'),
    statusReasonPlaceholder: t('Reason shown in admin logs'),
    saveStatus: t('Save status'),
    savingStatus: t('Saving status...'),
    statusSelfGuard: t('You cannot suspend or ban your own account.'),
    status: {
      active: t('Active'),
      suspended: t('Suspended'),
      banned: t('Banned'),
      deleted: t('Deleted')
    },
    roles: {
      member: t('Member'),
      owner: t('Owner'),
      admin: t('Admin')
    },
    relationshipsTitle: t('Subscriptions and Organizations'),
    relationshipsDescription: t(
      'Review user subscription assignment and organization memberships.'
    ),
    userSubscriptionLabel: t('User subscription'),
    noSubscription: t('No subscription assigned'),
    organizationsTableTitle: t('Organization memberships'),
    organizationHeaders: {
      name: t('Organization'),
      membership: t('Membership role'),
      subscription: t('Subscription'),
      provider: t('Provider'),
      status: t('Status')
    },
    noProvider: t('none'),
    noStatus: t('free'),
    noOrganizations: t('This user has no organization memberships.'),
    deleteTitle: t('Delete User'),
    deleteDescription: t(
      'Soft-delete this user and revoke access. Ownership transfer is required when the user owns organizations.'
    ),
    deleteHint: t(
      'Owned organizations: {owned}. Select a transfer user before deleting if owned is greater than zero.'
    ),
    transferLabel: t('Transfer owned organizations to'),
    transferNone: t('No transfer'),
    deleteReasonLabel: t('Delete reason (optional)'),
    deleteReasonPlaceholder: t('Reason recorded in audit logs'),
    deleteSelfGuard: t('You cannot delete your own account.'),
    deleteButton: t('Delete user'),
    confirmDeleteTitle: t('Delete this user account?'),
    confirmDeleteDescription: t(
      'This action archives the user, removes memberships, and revokes access.'
    ),
    confirmDelete: t('Delete account'),
    cancel: t('Cancel')
  };
}
