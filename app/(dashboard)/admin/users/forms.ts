import {
  buildFormField,
  buildFormValidationPreset,
  buildFormRule,
  dbRef,
  defineBuildForm,
  fieldRef,
  validationCondition,
  withBuildFormValidation
} from '@skitsaas/sdk';

export type AdminUserTemplateOption = {
  id: number;
  name: string;
  billingInterval: string;
  priceCents: number;
  currency: string;
};

export type AdminCreateUserFormCopy = {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  roleLabel: string;
  subscriptionLabel: string;
  noSubscription: string;
  roles: {
    member: string;
    owner: string;
    admin: string;
  };
};

export type AdminEditUserProfileFormCopy = {
  nameLabel: string;
  emailLabel: string;
  roleLabel: string;
  subscriptionLabel: string;
  noSubscription: string;
  roles: {
    member: string;
    owner: string;
    admin: string;
  };
};

export type AdminEditUserStatusFormCopy = {
  statusLabel: string;
  statusReasonLabel: string;
  statusReasonPlaceholder: string;
  status: {
    active: string;
    suspended: string;
    banned: string;
  };
};

export type AdminDeleteUserFormCopy = {
  transferLabel: string;
  transferNone: string;
  deleteReasonLabel: string;
  deleteReasonPlaceholder: string;
};

const DEFAULT_ADMIN_CREATE_USER_FORM_COPY: AdminCreateUserFormCopy = {
  nameLabel: 'Name',
  namePlaceholder: 'Optional display name',
  emailLabel: 'Email',
  emailPlaceholder: 'name@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'At least 8 characters',
  roleLabel: 'Role',
  subscriptionLabel: 'User subscription',
  noSubscription: 'No subscription',
  roles: {
    member: 'Member',
    owner: 'Owner',
    admin: 'Admin'
  }
};

const DEFAULT_ADMIN_EDIT_USER_PROFILE_FORM_COPY: AdminEditUserProfileFormCopy = {
  nameLabel: 'Name',
  emailLabel: 'Email',
  roleLabel: 'Role',
  subscriptionLabel: 'User subscription',
  noSubscription: 'No subscription',
  roles: {
    member: 'Member',
    owner: 'Owner',
    admin: 'Admin'
  }
};

const DEFAULT_ADMIN_EDIT_USER_STATUS_FORM_COPY: AdminEditUserStatusFormCopy = {
  statusLabel: 'Account status',
  statusReasonLabel: 'Reason',
  statusReasonPlaceholder: 'Optional reason for non-active statuses',
  status: {
    active: 'Active',
    suspended: 'Suspended',
    banned: 'Banned'
  }
};

const DEFAULT_ADMIN_DELETE_USER_FORM_COPY: AdminDeleteUserFormCopy = {
  transferLabel: 'Transfer owned organizations to',
  transferNone: 'Do not transfer',
  deleteReasonLabel: 'Delete reason',
  deleteReasonPlaceholder: 'Optional reason visible in audit logs'
};

function createAdminUserRoleOptions(
  roles: {
    member: string;
    owner: string;
    admin: string;
  }
) {
  return [
    {
      value: 'member',
      label: roles.member
    },
    {
      value: 'owner',
      label: roles.owner
    },
    {
      value: 'admin',
      label: roles.admin
    }
  ];
}

function createAdminUserStatusOptions(
  status: {
    active: string;
    suspended: string;
    banned: string;
  }
) {
  return [
    {
      value: 'active',
      label: status.active
    },
    {
      value: 'suspended',
      label: status.suspended
    },
    {
      value: 'banned',
      label: status.banned
    }
  ];
}

function formatTemplateOptionLabel(
  { name, billingInterval, priceCents, currency }: AdminUserTemplateOption,
  locale: string
) {
  const amount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(priceCents / 100);

  return `${name} - ${billingInterval} - ${amount}`;
}

export function createAdminCreateUserBuildFormBase({
  copy = DEFAULT_ADMIN_CREATE_USER_FORM_COPY,
  locale = 'en-US',
  userTemplateOptions = []
}: {
  copy?: AdminCreateUserFormCopy;
  locale?: string;
  userTemplateOptions?: AdminUserTemplateOption[];
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-create-user-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.text({
          name: 'name',
          label: copy.nameLabel,
          placeholder: copy.namePlaceholder,
          maxLength: 100
        }),
        buildFormField.email({
          name: 'email',
          label: copy.emailLabel,
          placeholder: copy.emailPlaceholder,
          required: true,
          maxLength: 255
        }),
        buildFormField.password({
          name: 'password',
          label: copy.passwordLabel,
          placeholder: copy.passwordPlaceholder,
          required: true,
          minLength: 8,
          maxLength: 100
        }),
        buildFormField.select({
          name: 'role',
          label: copy.roleLabel,
          defaultValue: 'member',
          options: createAdminUserRoleOptions(copy.roles)
        }),
        buildFormField.select({
          name: 'subscriptionTemplateId',
          label: copy.subscriptionLabel,
          placeholder: copy.noSubscription,
          colSpan: 'full',
          options: userTemplateOptions.map((template) => ({
            value: template.id,
            label: formatTemplateOptionLabel(template, locale)
          }))
        })
      ]
    }),
    buildFormValidationPreset.blur(
      {
        email: [
          buildFormRule.required(),
          buildFormRule.email(),
          buildFormRule.unique(dbRef('core.users.email'))
        ],
        password: [
          buildFormRule.required(),
          buildFormRule.minLength(8)
        ],
        role: [buildFormRule.required()],
        subscriptionTemplateId: [
          buildFormRule.exists(dbRef('core.subscription_templates.user'))
        ]
      },
      {
        preflight: true
      }
    )
  );
}

export function createAdminEditUserProfileBuildFormBase({
  copy = DEFAULT_ADMIN_EDIT_USER_PROFILE_FORM_COPY,
  locale = 'en-US',
  userTemplateOptions = [],
  disabled = false
}: {
  copy?: AdminEditUserProfileFormCopy;
  locale?: string;
  userTemplateOptions?: AdminUserTemplateOption[];
  disabled?: boolean;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-edit-user-profile-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.hidden({
          name: 'userId'
        }),
        buildFormField.text({
          name: 'name',
          label: copy.nameLabel,
          maxLength: 100,
          disabled
        }),
        buildFormField.email({
          name: 'email',
          label: copy.emailLabel,
          required: true,
          maxLength: 255,
          disabled
        }),
        buildFormField.select({
          name: 'role',
          label: copy.roleLabel,
          options: createAdminUserRoleOptions(copy.roles),
          disabled
        }),
        buildFormField.select({
          name: 'subscriptionTemplateId',
          label: copy.subscriptionLabel,
          placeholder: copy.noSubscription,
          colSpan: 'full',
          options: userTemplateOptions.map((template) => ({
            value: template.id,
            label: formatTemplateOptionLabel(template, locale)
          })),
          disabled
        })
      ]
    }),
    buildFormValidationPreset.blur(
      {
        userId: [
          buildFormRule.required()
        ],
        email: [
          buildFormRule.required(),
          buildFormRule.email(),
          buildFormRule.unique(dbRef('core.users.email'), {
            ignore: fieldRef('userId')
          })
        ],
        role: [buildFormRule.required()],
        subscriptionTemplateId: [
          buildFormRule.exists(dbRef('core.subscription_templates.user'))
        ]
      },
      {
        preflight: true
      }
    )
  );
}

export function createAdminEditUserStatusBuildFormBase({
  copy = DEFAULT_ADMIN_EDIT_USER_STATUS_FORM_COPY,
  disabled = false
}: {
  copy?: AdminEditUserStatusFormCopy;
  disabled?: boolean;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-update-user-status-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.hidden({
          name: 'userId'
        }),
        buildFormField.select({
          name: 'accountStatus',
          label: copy.statusLabel,
          options: createAdminUserStatusOptions(copy.status),
          disabled
        }),
        buildFormField.text({
          name: 'statusReason',
          label: copy.statusReasonLabel,
          placeholder: copy.statusReasonPlaceholder,
          maxLength: 250,
          disabled
        })
      ]
    }),
    buildFormValidationPreset.blur({
        userId: [buildFormRule.required()],
        accountStatus: [buildFormRule.required()]
      })
  );
}

export function createAdminDeleteUserBuildFormBase({
  copy = DEFAULT_ADMIN_DELETE_USER_FORM_COPY,
  transferCandidates = [],
  disabled = false
}: {
  copy?: AdminDeleteUserFormCopy;
  transferCandidates?: Array<{
    id: number;
    name?: string | null;
    email: string;
  }>;
  disabled?: boolean;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-delete-user-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.hidden({
          name: 'userId'
        }),
        buildFormField.hidden({
          name: 'requiresTransfer'
        }),
        buildFormField.select({
          name: 'transferUserId',
          label: copy.transferLabel,
          placeholder: copy.transferNone,
          options: transferCandidates.map((candidate) => ({
            value: candidate.id,
            label: candidate.name || candidate.email
          })),
          disabled
        }),
        buildFormField.text({
          name: 'statusReason',
          label: copy.deleteReasonLabel,
          placeholder: copy.deleteReasonPlaceholder,
          maxLength: 250,
          disabled
        })
      ]
    }),
    buildFormValidationPreset.blur({
        userId: [buildFormRule.required()],
        transferUserId: [
          buildFormRule.required({
            when: [validationCondition.equals('requiresTransfer', 'true')]
          })
        ]
      })
  );
}
