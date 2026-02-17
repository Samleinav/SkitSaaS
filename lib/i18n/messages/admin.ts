import type { AppLocale } from '@/lib/i18n/config';

export type AdminMessages = {
  language: {
    label: string;
    english: string;
    spanish: string;
  };
  layout: {
    title: string;
    description: string;
  };
  nav: {
    appConfig: string;
    users: string;
    subscriptions: string;
    billing: string;
    payments: string;
    orders: string;
    logs: string;
  };
  dashboardHome: {
    chart: {
      title: string;
      description: string;
      users: string;
      subscriptions: string;
      sales: string;
      salesHint: string;
      rangeFrom: string;
      rangeTo: string;
      last7Days: string;
      last30Days: string;
      last90Days: string;
      resetRange: string;
    };
    recent: {
      title: string;
      description: string;
    };
  };
  usersPage: {
    title: string;
    loading: string;
    filterPlaceholder: string;
    newUser: string;
    createTitle: string;
    createDescription: string;
  };
  usersTable: {
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
    save: string;
    archived: string;
    active: string;
    restore: string;
    archive: string;
    confirmArchiveTitle: string;
    confirmArchiveDescription: string;
    confirm: string;
    cancel: string;
  };
  usersCreateForm: {
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    roleLabel: string;
    roles: {
      member: string;
      owner: string;
      admin: string;
    };
    subscriptionLabel: string;
    noSubscription: string;
    create: string;
    creating: string;
  };
  userDetailPage: {
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
  subscriptionsPage: {
    loading: string;
    templatesTitle: string;
    templatesDescription: string;
    subscriptionsTitle: string;
    filterPlaceholder: string;
    noCustomFeatures: string;
    noTemplates: string;
    create: string;
    edit: string;
    createTitle: string;
    editTitle: string;
    backToTemplates: string;
    activeUpdateTitle: string;
    activeUpdateDescription: string;
    activeUpdateAction: string;
    activeUpdateActionPending: string;
    deleteHint: string;
    delete: string;
    confirmDeleteTitle: string;
    confirmDeleteDescription: string;
    confirm: string;
    cancel: string;
    columns: {
      name: string;
      scope: string;
      interval: string;
      price: string;
      publicFeatures: string;
      actions: string;
    };
  };
  subscriptionsTable: {
    teamHeader: string;
    membersHeader: string;
    providerHeader: string;
    statusHeader: string;
    planHeader: string;
    periodStartLabel: string;
    periodEndLabel: string;
    trialEndsLabel: string;
    cancelAtPeriodEndLabel: string;
    canceledAtLabel: string;
    idsHeader: string;
    actionsHeader: string;
    createdLabel: string;
    none: string;
    free: string;
    noTemplate: string;
    planNamePlaceholder: string;
    save: string;
    clear: string;
    confirmClearTitle: string;
    confirmClearDescription: string;
    confirm: string;
    cancel: string;
    stripe: string;
    paypal: string;
    trialing: string;
    active: string;
    unpaid: string;
    canceled: string;
  };
  templateForm: {
    planSectionTitle: string;
    templateNameLabel: string;
    templateNamePlaceholder: string;
    targetScopeLabel: string;
    categoryKeyLabel: string;
    categoryKeyPlaceholder: string;
    hierarchyRankLabel: string;
    hierarchyRankPlaceholder: string;
    scopes: {
      user: string;
      organization: string;
    };
    paymentProviderLabel: string;
    providerPlanIdLabel: string;
    providerPlanIdPlaceholder: string;
    billingIntervalLabel: string;
    priceLabel: string;
    pricePlaceholder: string;
    compareAtPriceLabel: string;
    compareAtPricePlaceholder: string;
    currencyLabel: string;
    currencyPlaceholder: string;
    trialDaysLabel: string;
    trialDaysPlaceholder: string;
    featuresSectionTitle: string;
    featuresSectionHint: string;
    featureKeyLabel: string;
    featureLabelLabel: string;
    featureTypeLabel: string;
    featureValueLabel: string;
    featureValueLabelLabel: string;
    featurePublicLabel: string;
    actionsLabel: string;
    customFeaturesLabel: string;
    featureKeyPlaceholder: string;
    featureLabelPlaceholder: string;
    featureValuePlaceholder: string;
    featureValueLabelPlaceholder: string;
    remove: string;
    addFeature: string;
    createTemplate: string;
    updateTemplate: string;
    none: string;
    stripe: string;
    paypal: string;
    intervals: {
      daily: string;
      weekly: string;
      monthly: string;
      quarterly: string;
      semiannual: string;
      yearly: string;
    };
    valueTypes: {
      text: string;
      number: string;
      boolean: string;
      null: string;
    };
  };
  appConfig: {
    title: string;
    description: string;
    navigationTitle: string;
    navigationDescription: string;
    backToAppConfig: string;
    envPriority: string;
    sections: {
      general: string;
      paymentMethods: string;
      email: string;
      theme: string;
    };
    sectionDescriptions: {
      general: string;
      paymentMethods: string;
      email: string;
      theme: string;
    };
    organization: {
      title: string;
      description: string;
      allowMultiOrganizationsLabel: string;
      allowMultiOrganizationsHint: string;
      maxOrganizationsPerUserLabel: string;
      maxOrganizationsPerUserHint: string;
      unlimitedPlaceholder: string;
    };
    email: {
      description: string;
      smtpConfigTitle: string;
      smtpConfigDescription: string;
      logsTitle: string;
      logsDescription: string;
      logsEmpty: string;
      status: {
        queued: string;
        sent: string;
        failed: string;
        skipped: string;
      };
      logsHeaders: {
        created: string;
        status: string;
        event: string;
        recipient: string;
        subject: string;
        source: string;
        message: string;
        details: string;
      };
    };
    theme: {
      title: string;
      description: string;
      modeLabel: string;
      modeHint: string;
      modes: {
        system: string;
        light: string;
        dark: string;
      };
      allowUserOverrideLabel: string;
      allowUserOverrideHint: string;
      adminDefaultLabel: string;
      dashboardDefaultLabel: string;
    };
    providers: {
      stripe: string;
      paypal: string;
    };
    envPrefix: string;
    overriddenByEnv: string;
    dbFallbackValue: string;
    sourcePrefix: string;
    save: string;
  };
  billingPage: {
    title: string;
    description: string;
    metrics: {
      payingTeams: string;
      payingTeamsHint: string;
      activeSubscriptions: string;
      trialingSubscriptions: string;
      issueSubscriptions: string;
    };
  };
  paymentsPage: {
    title: string;
    description: string;
    filterPlaceholder: string;
    metrics: {
      completedPayments: string;
      stripePayments: string;
      paypalPayments: string;
      missingReferencePayments: string;
      missingReferenceHint: string;
    };
    table: {
      paidAtHeader: string;
      whoHeader: string;
      reasonHeader: string;
      providerHeader: string;
      originHeader: string;
      typeHeader: string;
      amountHeader: string;
      paymentReferenceHeader: string;
      purchaseOrderHeader: string;
      actionsHeader: string;
      noTeam: string;
      none: string;
      checkout: string;
      webhook: string;
      dashboard: string;
      system: string;
      preview: string;
      closePreview: string;
      orderLabel: string;
      eventLabel: string;
      messageLabel: string;
      invoiceTitle: string;
      invoiceDescription: string;
    };
  };
  ordersPage: {
    title: string;
    description: string;
    filterPlaceholder: string;
    newOrder: string;
    createTitle: string;
    createDescription: string;
    editTitle: string;
    editDescription: string;
    legacySystemEventWarning: string;
    backToOrders: string;
    createOrder: string;
    creatingOrder: string;
    createdOrder: string;
    saveOrder: string;
    savingOrder: string;
    savedOrder: string;
    form: {
      targetTypeLabel: string;
      targetTypes: {
        team: string;
        user: string;
      };
      providerLabel: string;
      statusLabel: string;
      sourceLabel: string;
      eventTypeLabel: string;
      eventTypePlaceholder: string;
      eventTypeHint: string;
      userIdLabel: string;
      userIdHint: string;
      teamIdLabel: string;
      teamIdHint: string;
      templateIdLabel: string;
      templateIdHint: string;
      paymentMethodLabel: string;
      planNameLabel: string;
      providerPlanIdLabel: string;
      externalPaymentIdLabel: string;
      externalOrderIdLabel: string;
      amountMajorLabel: string;
      amountMajorHint: string;
      amountLabel: string;
      currencyLabel: string;
      messageLabel: string;
      messagePlaceholder: string;
    };
    metrics: {
      receivedOrders: string;
      pendingOrders: string;
      canceledOrders: string;
      failedOrders: string;
    };
    table: {
      updatedHeader: string;
      teamHeader: string;
      providerHeader: string;
      statusHeader: string;
      sourceHeader: string;
      methodHeader: string;
      planHeader: string;
      amountHeader: string;
      paymentReferenceHeader: string;
      orderReferenceHeader: string;
      eventHeader: string;
      messageHeader: string;
      actionsHeader: string;
      none: string;
      noTeam: string;
      pending: string;
      received: string;
      canceled: string;
      failed: string;
      checkout: string;
      webhook: string;
      dashboard: string;
      system: string;
      edit: string;
    };
  };
  logsPage: {
    title: string;
    description: string;
    tabs: {
      system: string;
      email: string;
    };
    filterPlaceholder: string;
    table: {
      createdHeader: string;
      eventHeader: string;
      categoryHeader: string;
      actionHeader: string;
      statusHeader: string;
      actorHeader: string;
      targetHeader: string;
      teamHeader: string;
      entityHeader: string;
      sourceHeader: string;
      ipHeader: string;
      messageHeader: string;
      noActor: string;
      noTarget: string;
      noTeam: string;
      noEntity: string;
      noSource: string;
      info: string;
      success: string;
      warning: string;
      failed: string;
    };
  };
  dataTable: {
    filterPlaceholder: string;
    columns: string;
    noResults: string;
    showingRows: string;
    previous: string;
    next: string;
  };
};

export const adminMessages: Record<AppLocale, AdminMessages> = {
  en: {
    language: {
      label: 'Language',
      english: 'English',
      spanish: 'Spanish'
    },
    layout: {
      title: 'Admin',
      description: 'Manage users, billing, payments, orders, and app configuration.'
    },
    nav: {
      appConfig: 'App Config',
      users: 'Users',
      subscriptions: 'Subscriptions',
      billing: 'Billing',
      payments: 'Payments',
      orders: 'Orders',
      logs: 'Logs'
    },
    dashboardHome: {
      chart: {
        title: 'Monthly growth',
        description:
          'Users, subscription events, and sales (received paid orders).',
        users: 'Users',
        subscriptions: 'Subscriptions',
        sales: 'Sales',
        salesHint: 'Sales = received orders with amount > 0',
        rangeFrom: 'From',
        rangeTo: 'To',
        last7Days: '7d',
        last30Days: '30d',
        last90Days: '90d',
        resetRange: 'Reset'
      },
      recent: {
        title: 'Recent logs',
        description: 'Latest platform events. Open full logs for more detail.'
      }
    },
    usersPage: {
      title: 'Users',
      loading: 'Loading users...',
      filterPlaceholder: 'Filter by email...',
      newUser: 'New user',
      createTitle: 'Create User',
      createDescription:
        'Provision a new account, assign role, and optionally attach a user subscription template.'
    },
    usersTable: {
      userHeader: 'User',
      unnamedUser: 'Unnamed user',
      roleHeader: 'Role',
      statusHeader: 'Status',
      subscriptionHeader: 'User subscription',
      organizationsHeader: 'Organizations',
      createdHeader: 'Created',
      actionsHeader: 'Actions',
      organizationsCount: '{count} total • {owned} owner',
      noSubscription: 'No subscription',
      manage: 'Manage',
      statusActive: 'Active',
      statusSuspended: 'Suspended',
      statusBanned: 'Banned',
      statusDeleted: 'Deleted',
      save: 'Save',
      archived: 'Archived',
      active: 'Active',
      restore: 'Restore',
      archive: 'Archive',
      confirmArchiveTitle: 'Archive this user?',
      confirmArchiveDescription:
        'The user will lose access until you restore the account.',
      confirm: 'Archive user',
      cancel: 'Cancel'
    },
    usersCreateForm: {
      nameLabel: 'Name',
      namePlaceholder: 'Optional display name',
      emailLabel: 'Email',
      emailPlaceholder: 'name@company.com',
      passwordLabel: 'Temporary password',
      passwordPlaceholder: 'At least 8 characters',
      roleLabel: 'Platform role',
      roles: {
        member: 'Member',
        owner: 'Owner',
        admin: 'Admin'
      },
      subscriptionLabel: 'User subscription template',
      noSubscription: 'No user subscription',
      create: 'Create user',
      creating: 'Creating user...'
    },
    userDetailPage: {
      title: 'User Management',
      description:
        'Edit profile data, moderation status, user subscription, organizations, and ownership transfer.',
      backToUsers: 'Back to users',
      userLabel: 'User',
      unnamedUser: 'Unnamed user',
      statusLabel: 'Status',
      noReason: 'No reason',
      organizationsLabel: 'Organizations',
      organizationCount: '{count} total • {owned} owned',
      createdUpdatedLabel: 'Audit',
      createdAtPrefix: 'Created:',
      updatedAtPrefix: 'Updated:',
      profileTitle: 'Profile',
      profileDescription: 'Update identity and user-level subscription assignment.',
      profileNameLabel: 'Name',
      profileEmailLabel: 'Email',
      profileRoleLabel: 'Platform role',
      profileSubscriptionLabel: 'User subscription template',
      saveProfile: 'Save profile',
      savingProfile: 'Saving profile...',
      profileDisabledForDeleted: 'Deleted accounts cannot be edited.',
      statusTitle: 'Moderation',
      statusDescription: 'Activate, suspend, or ban account access.',
      statusFieldLabel: 'Account status',
      statusReasonLabel: 'Reason (optional)',
      statusReasonPlaceholder: 'Reason shown in admin logs',
      saveStatus: 'Save status',
      savingStatus: 'Saving status...',
      statusSelfGuard: 'You cannot suspend or ban your own account.',
      status: {
        active: 'Active',
        suspended: 'Suspended',
        banned: 'Banned',
        deleted: 'Deleted'
      },
      roles: {
        member: 'Member',
        owner: 'Owner',
        admin: 'Admin'
      },
      relationshipsTitle: 'Subscriptions and Organizations',
      relationshipsDescription:
        'Review user subscription assignment and organization memberships.',
      userSubscriptionLabel: 'User subscription',
      noSubscription: 'No subscription assigned',
      organizationsTableTitle: 'Organization memberships',
      organizationHeaders: {
        name: 'Organization',
        membership: 'Membership role',
        subscription: 'Subscription',
        provider: 'Provider',
        status: 'Status'
      },
      noProvider: 'none',
      noStatus: 'free',
      noOrganizations: 'This user has no organization memberships.',
      deleteTitle: 'Delete User',
      deleteDescription:
        'Soft-delete this user and revoke access. Ownership transfer is required when the user owns organizations.',
      deleteHint:
        'Owned organizations: {owned}. Select a transfer user before deleting if owned is greater than zero.',
      transferLabel: 'Transfer owned organizations to',
      transferNone: 'No transfer',
      deleteReasonLabel: 'Delete reason (optional)',
      deleteReasonPlaceholder: 'Reason recorded in audit logs',
      deleteSelfGuard: 'You cannot delete your own account.',
      deleteButton: 'Delete user',
      confirmDeleteTitle: 'Delete this user account?',
      confirmDeleteDescription:
        'This action archives the user, removes memberships, and revokes access.',
      confirmDelete: 'Delete account',
      cancel: 'Cancel'
    },
    subscriptionsPage: {
      loading: 'Loading subscriptions...',
      templatesTitle: 'Subscription Templates',
      templatesDescription:
        'Create and manage reusable templates for pricing and billing operations.',
      subscriptionsTitle: 'Subscriptions',
      filterPlaceholder: 'Filter by team...',
      noCustomFeatures: 'No custom features',
      noTemplates: 'No templates created yet.',
      create: 'Create template',
      edit: 'Edit',
      createTitle: 'Create Subscription Template',
      editTitle: 'Edit Subscription Template',
      backToTemplates: 'Back to templates',
      activeUpdateTitle: 'Active Subscription Update',
      activeUpdateDescription:
        'Queue a manual migration task for active subscriptions using this template.',
      activeUpdateAction: 'Queue active updates',
      activeUpdateActionPending: 'Queueing updates...',
      deleteHint:
        'Deleting this template will unassign it from teams using it.',
      delete: 'Delete',
      confirmDeleteTitle: 'Delete this template?',
      confirmDeleteDescription:
        'Teams using this template will be moved to free until reassigned.',
      confirm: 'Delete template',
      cancel: 'Cancel',
      columns: {
        name: 'Name',
        scope: 'Scope',
        interval: 'Interval',
        price: 'Price',
        publicFeatures: 'Public features',
        actions: 'Actions'
      }
    },
    subscriptionsTable: {
      teamHeader: 'Team',
      membersHeader: 'Members',
      providerHeader: 'Provider',
      statusHeader: 'Status',
      planHeader: 'Plan',
      periodStartLabel: 'Period start',
      periodEndLabel: 'Period end',
      trialEndsLabel: 'Trial ends',
      cancelAtPeriodEndLabel: 'Cancel at period end',
      canceledAtLabel: 'Canceled at',
      idsHeader: 'IDs',
      actionsHeader: 'Actions',
      createdLabel: 'Created',
      none: 'none',
      free: 'Free',
      noTemplate: 'Free (no template)',
      planNamePlaceholder: 'Plan name',
      save: 'Save',
      clear: 'Clear',
      confirmClearTitle: 'Clear subscription for this team?',
      confirmClearDescription:
        'This removes provider references and returns the team to the free plan.',
      confirm: 'Clear subscription',
      cancel: 'Cancel',
      stripe: 'stripe',
      paypal: 'paypal',
      trialing: 'trialing',
      active: 'active',
      unpaid: 'unpaid',
      canceled: 'canceled'
    },
    templateForm: {
      planSectionTitle: 'Plan settings',
      templateNameLabel: 'Template name',
      templateNamePlaceholder: 'Template name',
      targetScopeLabel: 'Subscription scope',
      categoryKeyLabel: 'Category key',
      categoryKeyPlaceholder: 'Category key (e.g. team.pro)',
      hierarchyRankLabel: 'Hierarchy rank',
      hierarchyRankPlaceholder: 'Hierarchy rank (higher means bigger plan)',
      scopes: {
        user: 'User',
        organization: 'Organization'
      },
      paymentProviderLabel: 'Payment provider',
      providerPlanIdLabel: 'Provider plan id',
      providerPlanIdPlaceholder: 'Provider plan id (optional)',
      billingIntervalLabel: 'Billing interval',
      priceLabel: 'Price',
      pricePlaceholder: 'Price (e.g. 19.99)',
      compareAtPriceLabel: 'Compare at price',
      compareAtPricePlaceholder: 'Compare at price (optional)',
      currencyLabel: 'Currency',
      currencyPlaceholder: 'Currency (USD)',
      trialDaysLabel: 'Trial days',
      trialDaysPlaceholder: 'Trial days',
      featuresSectionTitle: 'Template features',
      featuresSectionHint:
        'Only rows marked as public are shown on the pricing page.',
      featureKeyLabel: 'Key',
      featureLabelLabel: 'Label',
      featureTypeLabel: 'Value type',
      featureValueLabel: 'Value',
      featureValueLabelLabel: 'Public value label',
      featurePublicLabel: 'Public',
      actionsLabel: 'Actions',
      customFeaturesLabel: 'Custom features / quotas (key-value)',
      featureKeyPlaceholder: 'feature key',
      featureLabelPlaceholder: 'Feature label',
      featureValuePlaceholder: 'feature value',
      featureValueLabelPlaceholder: 'Shown value label',
      remove: 'Remove',
      addFeature: 'Add feature',
      createTemplate: 'Create template',
      updateTemplate: 'Update template',
      none: 'none',
      stripe: 'stripe',
      paypal: 'paypal',
      intervals: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        semiannual: 'Semi-annual',
        yearly: 'Yearly'
      },
      valueTypes: {
        text: 'Text',
        number: 'Number',
        boolean: 'Boolean',
        null: 'No value'
      }
    },
      appConfig: {
        title: 'App Config',
        description:
          'Global runtime configuration shared between public pages and dashboard.',
        navigationTitle: 'Configuration sections',
        navigationDescription: 'Choose a section and manage runtime values.',
        backToAppConfig: 'Back App Config',
        envPriority:
          'Environment values have priority. DB values are used only when env is empty.',
        sections: {
          general: 'General',
          paymentMethods: 'Payment methods',
          email: 'Email',
          theme: 'Theme'
        },
        sectionDescriptions: {
          general: 'Core organization settings and shared behavior.',
          paymentMethods: 'Configure Stripe/PayPal runtime keys and provider options.',
          email: 'Configure SMTP delivery and inspect notification logs.',
          theme: 'Control theme mode and default experiences per area.'
        },
        organization: {
        title: 'Organizations',
        description: 'Control multi-organization limits per user.',
        allowMultiOrganizationsLabel: 'Allow multi organizations per user',
        allowMultiOrganizationsHint:
          'If disabled, each user can only belong to one organization.',
        maxOrganizationsPerUserLabel: 'Max organizations per user (optional)',
        maxOrganizationsPerUserHint:
          'Leave empty for unlimited when multi organizations are enabled.',
        unlimitedPlaceholder: 'Unlimited'
      },
      email: {
        description:
          'Configure external SMTP delivery and review outgoing notification logs.',
        smtpConfigTitle: 'SMTP Configuration',
        smtpConfigDescription:
          'Use an external SMTP provider. Local SMTP hosts are blocked.',
        logsTitle: 'Email Delivery Logs',
        logsDescription:
          'Track each outgoing notification, recipient, trigger event, and delivery status.',
        logsEmpty: 'No email logs recorded yet.',
        status: {
          queued: 'Queued',
          sent: 'Sent',
          failed: 'Failed',
          skipped: 'Skipped'
        },
        logsHeaders: {
          created: 'Created',
          status: 'Status',
          event: 'Event',
          recipient: 'Recipient',
          subject: 'Subject',
          source: 'Source',
          message: 'Message',
          details: 'Details'
        }
      },
      theme: {
        title: 'Theme policy',
        description:
          'Define the default theme per area and whether users can override it.',
        modeLabel: 'Theme mode',
        modeHint:
          'System follows the OS preference, light forces light, dark forces dark.',
        modes: {
          system: 'System',
          light: 'Light',
          dark: 'Dark'
        },
        allowUserOverrideLabel: 'Allow user override',
        allowUserOverrideHint:
          'When enabled, users can toggle their preferred theme in admin/dashboard.',
        adminDefaultLabel: 'Admin default theme',
        dashboardDefaultLabel: 'Dashboard default theme'
      },
      providers: {
        stripe: 'Stripe',
        paypal: 'PayPal'
      },
      envPrefix: 'ENV',
      overriddenByEnv: 'Overridden by env',
      dbFallbackValue: 'DB fallback value',
      sourcePrefix: 'Source',
      save: 'Save'
    },
    billingPage: {
      title: 'Billing',
      description: 'Manage team subscriptions and billing status.',
      metrics: {
        payingTeams: 'Paying teams',
        payingTeamsHint: 'Teams with Stripe/PayPal provider assigned',
        activeSubscriptions: 'Active subscriptions',
        trialingSubscriptions: 'Trialing subscriptions',
        issueSubscriptions: 'Unpaid or canceled'
      }
    },
    paymentsPage: {
      title: 'Completed Payments',
      description:
        'Successfully received payments with quick invoice preview and purchase-order relation.',
      filterPlaceholder: 'Filter by payer/team...',
      metrics: {
        completedPayments: 'Completed payments',
        stripePayments: 'Stripe payments',
        paypalPayments: 'PayPal payments',
        missingReferencePayments: 'Missing payment reference',
        missingReferenceHint: 'Orders without external payment ID'
      },
      table: {
        paidAtHeader: 'Paid at',
        whoHeader: 'Who',
        reasonHeader: 'Why',
        providerHeader: 'Provider',
        originHeader: 'Origin',
        typeHeader: 'Type',
        amountHeader: 'Amount',
        paymentReferenceHeader: 'Payment reference',
        purchaseOrderHeader: 'Purchase order',
        actionsHeader: 'Preview',
        noTeam: 'No team',
        none: 'none',
        checkout: 'checkout',
        webhook: 'webhook',
        dashboard: 'dashboard',
        system: 'system',
        preview: 'Preview',
        closePreview: 'Close',
        orderLabel: 'Order #{id}',
        eventLabel: 'Event',
        messageLabel: 'Message',
        invoiceTitle: 'Invoice preview',
        invoiceDescription:
          'Quick summary of who paid, why, when, amount, source, type, and references.'
      }
    },
    ordersPage: {
      title: 'Orders',
      description:
        'Unified order records from Stripe and PayPal with plan and payment method context.',
      filterPlaceholder: 'Filter by team...',
      newOrder: 'New order',
      createTitle: 'Create Manual Subscription Order',
      createDescription:
        'Create a manual subscription purchase order for a user or organization and trigger lifecycle events when status applies.',
      editTitle: 'Edit Order',
      editDescription:
        'Update order data and trigger related payment/order events after saving.',
      legacySystemEventWarning:
        'This record belongs to a template maintenance event. It is not a real checkout order.',
      backToOrders: 'Back to orders',
      createOrder: 'Create order',
      creatingOrder: 'Creating order...',
      createdOrder: 'Order created',
      saveOrder: 'Save order',
      savingOrder: 'Saving order...',
      savedOrder: 'Order saved',
      form: {
        targetTypeLabel: 'Subscription target',
        targetTypes: {
          team: 'Organization / Team',
          user: 'User'
        },
        providerLabel: 'Provider',
        statusLabel: 'Order status',
        sourceLabel: 'Source',
        eventTypeLabel: 'Event type',
        eventTypePlaceholder: 'checkout.completed',
        eventTypeHint:
          'Use checkout/webhook event names. Avoid template maintenance events for real orders.',
        userIdLabel: 'User (for user subscription)',
        userIdHint: 'Choose the user who receives the user-scope subscription.',
        teamIdLabel: 'Team (for organization subscription)',
        teamIdHint:
          'Choose the team that receives the organization-scope subscription.',
        templateIdLabel: 'Subscription template',
        templateIdHint:
          'Required. Templates are filtered by selected target scope.',
        paymentMethodLabel: 'Payment method',
        planNameLabel: 'Plan name',
        providerPlanIdLabel: 'Provider plan ID',
        externalPaymentIdLabel: 'External payment ID',
        externalOrderIdLabel: 'External order ID',
        amountMajorLabel: 'Amount',
        amountMajorHint: 'Use decimal format (for example, 10.50).',
        amountLabel: 'Amount (cents)',
        currencyLabel: 'Currency',
        messageLabel: 'Message',
        messagePlaceholder: 'Optional context for event execution'
      },
      metrics: {
        receivedOrders: 'Received',
        pendingOrders: 'Pending',
        canceledOrders: 'Canceled',
        failedOrders: 'Failed'
      },
      table: {
        updatedHeader: 'Updated',
        teamHeader: 'Team',
        providerHeader: 'Provider',
        statusHeader: 'Status',
        sourceHeader: 'Source',
        methodHeader: 'Payment method',
        planHeader: 'Plan',
        amountHeader: 'Amount',
        paymentReferenceHeader: 'Payment reference',
        orderReferenceHeader: 'Order reference',
        eventHeader: 'Event',
        messageHeader: 'Message',
        actionsHeader: 'Actions',
        none: 'none',
        noTeam: 'No team',
        pending: 'pending',
        received: 'received',
        canceled: 'canceled',
        failed: 'failed',
        checkout: 'checkout',
        webhook: 'webhook',
        dashboard: 'dashboard',
        system: 'system',
        edit: 'Edit'
      }
    },
    logsPage: {
      title: 'Logs',
      description:
        'Centralized view for system audit events and email delivery records.',
      tabs: {
        system: 'System logs',
        email: 'Email logs'
      },
      filterPlaceholder: 'Filter by event...',
      table: {
        createdHeader: 'Created',
        eventHeader: 'Event',
        categoryHeader: 'Category',
        actionHeader: 'Action',
        statusHeader: 'Status',
        actorHeader: 'Actor',
        targetHeader: 'Target',
        teamHeader: 'Team',
        entityHeader: 'Entity',
        sourceHeader: 'Source',
        ipHeader: 'IP',
        messageHeader: 'Message',
        noActor: 'System',
        noTarget: 'N/A',
        noTeam: 'No team',
        noEntity: '-',
        noSource: '-',
        info: 'info',
        success: 'success',
        warning: 'warning',
        failed: 'failed'
      }
    },
    dataTable: {
      filterPlaceholder: 'Filter...',
      columns: 'Columns',
      noResults: 'No results.',
      showingRows: 'Showing {shown} of {filtered} row(s).',
      previous: 'Previous',
      next: 'Next'
    }
  },
  es: {
    language: {
      label: 'Idioma',
      english: 'Ingles',
      spanish: 'Espanol'
    },
    layout: {
      title: 'Admin',
      description:
        'Gestiona usuarios, facturacion, pagos, ordenes y configuracion global.'
    },
    nav: {
      appConfig: 'App Config',
      users: 'Usuarios',
      subscriptions: 'Suscripciones',
      billing: 'Facturacion',
      payments: 'Pagos',
      orders: 'Ordenes',
      logs: 'Logs'
    },
    dashboardHome: {
      chart: {
        title: 'Crecimiento mensual',
        description:
          'Usuarios, eventos de suscripcion y ventas (ordenes pagadas recibidas).',
        users: 'Usuarios',
        subscriptions: 'Suscripciones',
        sales: 'Ventas',
        salesHint: 'Ventas = ordenes recibidas con monto > 0',
        rangeFrom: 'Desde',
        rangeTo: 'Hasta',
        last7Days: '7d',
        last30Days: '30d',
        last90Days: '90d',
        resetRange: 'Restablecer'
      },
      recent: {
        title: 'Logs recientes',
        description: 'Ultimos eventos de la plataforma. Abre logs para ver detalle completo.'
      }
    },
    usersPage: {
      title: 'Usuarios',
      loading: 'Cargando usuarios...',
      filterPlaceholder: 'Filtrar por correo...',
      newUser: 'Nuevo usuario',
      createTitle: 'Crear usuario',
      createDescription:
        'Crea una nueva cuenta, asigna rol y opcionalmente una plantilla de suscripcion por usuario.'
    },
    usersTable: {
      userHeader: 'Usuario',
      unnamedUser: 'Usuario sin nombre',
      roleHeader: 'Rol',
      statusHeader: 'Estado',
      subscriptionHeader: 'Suscripcion usuario',
      organizationsHeader: 'Organizaciones',
      createdHeader: 'Creado',
      actionsHeader: 'Acciones',
      organizationsCount: '{count} total • {owned} owner',
      noSubscription: 'Sin suscripcion',
      manage: 'Gestionar',
      statusActive: 'Activo',
      statusSuspended: 'Suspendido',
      statusBanned: 'Baneado',
      statusDeleted: 'Eliminado',
      save: 'Guardar',
      archived: 'Archivado',
      active: 'Activo',
      restore: 'Restaurar',
      archive: 'Archivar',
      confirmArchiveTitle: 'Archivar este usuario?',
      confirmArchiveDescription:
        'El usuario perdera acceso hasta que restaures la cuenta.',
      confirm: 'Archivar usuario',
      cancel: 'Cancelar'
    },
    usersCreateForm: {
      nameLabel: 'Nombre',
      namePlaceholder: 'Nombre visible opcional',
      emailLabel: 'Correo',
      emailPlaceholder: 'nombre@empresa.com',
      passwordLabel: 'Contrasena temporal',
      passwordPlaceholder: 'Minimo 8 caracteres',
      roleLabel: 'Rol de plataforma',
      roles: {
        member: 'Member',
        owner: 'Owner',
        admin: 'Admin'
      },
      subscriptionLabel: 'Plantilla de suscripcion usuario',
      noSubscription: 'Sin suscripcion usuario',
      create: 'Crear usuario',
      creating: 'Creando usuario...'
    },
    userDetailPage: {
      title: 'Gestion de usuario',
      description:
        'Edita datos del perfil, estado de moderacion, suscripcion por usuario, organizaciones y transferencia de ownership.',
      backToUsers: 'Volver a usuarios',
      userLabel: 'Usuario',
      unnamedUser: 'Usuario sin nombre',
      statusLabel: 'Estado',
      noReason: 'Sin motivo',
      organizationsLabel: 'Organizaciones',
      organizationCount: '{count} total • {owned} owner',
      createdUpdatedLabel: 'Auditoria',
      createdAtPrefix: 'Creado:',
      updatedAtPrefix: 'Actualizado:',
      profileTitle: 'Perfil',
      profileDescription:
        'Actualiza identidad y asignacion de suscripcion por usuario.',
      profileNameLabel: 'Nombre',
      profileEmailLabel: 'Correo',
      profileRoleLabel: 'Rol de plataforma',
      profileSubscriptionLabel: 'Plantilla de suscripcion usuario',
      saveProfile: 'Guardar perfil',
      savingProfile: 'Guardando perfil...',
      profileDisabledForDeleted: 'Las cuentas eliminadas no se pueden editar.',
      statusTitle: 'Moderacion',
      statusDescription: 'Activa, suspende o banea el acceso de la cuenta.',
      statusFieldLabel: 'Estado de cuenta',
      statusReasonLabel: 'Motivo (opcional)',
      statusReasonPlaceholder: 'Motivo visible en logs de admin',
      saveStatus: 'Guardar estado',
      savingStatus: 'Guardando estado...',
      statusSelfGuard: 'No puedes suspender ni banear tu propia cuenta.',
      status: {
        active: 'Activo',
        suspended: 'Suspendido',
        banned: 'Baneado',
        deleted: 'Eliminado'
      },
      roles: {
        member: 'Member',
        owner: 'Owner',
        admin: 'Admin'
      },
      relationshipsTitle: 'Suscripciones y Organizaciones',
      relationshipsDescription:
        'Revisa la suscripcion del usuario y sus membresias en organizaciones.',
      userSubscriptionLabel: 'Suscripcion usuario',
      noSubscription: 'Sin suscripcion asignada',
      organizationsTableTitle: 'Membresias en organizaciones',
      organizationHeaders: {
        name: 'Organizacion',
        membership: 'Rol de membresia',
        subscription: 'Suscripcion',
        provider: 'Proveedor',
        status: 'Estado'
      },
      noProvider: 'ninguno',
      noStatus: 'free',
      noOrganizations: 'Este usuario no tiene membresias en organizaciones.',
      deleteTitle: 'Eliminar usuario',
      deleteDescription:
        'Elimina de forma logica este usuario y revoca el acceso. Si tiene organizaciones propias debes transferir ownership.',
      deleteHint:
        'Organizaciones propias: {owned}. Selecciona un usuario de transferencia si owned es mayor que cero.',
      transferLabel: 'Transferir organizaciones propias a',
      transferNone: 'Sin transferencia',
      deleteReasonLabel: 'Motivo de eliminacion (opcional)',
      deleteReasonPlaceholder: 'Motivo registrado en logs de auditoria',
      deleteSelfGuard: 'No puedes eliminar tu propia cuenta.',
      deleteButton: 'Eliminar usuario',
      confirmDeleteTitle: 'Eliminar esta cuenta de usuario?',
      confirmDeleteDescription:
        'Esta accion archiva el usuario, quita membresias y revoca acceso.',
      confirmDelete: 'Eliminar cuenta',
      cancel: 'Cancelar'
    },
    subscriptionsPage: {
      loading: 'Cargando suscripciones...',
      templatesTitle: 'Plantillas de suscripcion',
      templatesDescription:
        'Crea y gestiona plantillas reutilizables para precios y facturacion.',
      subscriptionsTitle: 'Suscripciones',
      filterPlaceholder: 'Filtrar por equipo...',
      noCustomFeatures: 'Sin funcionalidades personalizadas',
      noTemplates: 'Aun no hay plantillas creadas.',
      create: 'Crear plantilla',
      edit: 'Editar',
      createTitle: 'Crear plantilla de suscripcion',
      editTitle: 'Editar plantilla de suscripcion',
      backToTemplates: 'Volver a plantillas',
      activeUpdateTitle: 'Actualizacion de suscripciones activas',
      activeUpdateDescription:
        'Encola una tarea de migracion manual para las suscripciones activas que usan esta plantilla.',
      activeUpdateAction: 'Encolar actualizaciones activas',
      activeUpdateActionPending: 'Encolando actualizaciones...',
      deleteHint:
        'Al eliminar esta plantilla se desasigna de los equipos que la usan.',
      delete: 'Eliminar',
      confirmDeleteTitle: 'Eliminar esta plantilla?',
      confirmDeleteDescription:
        'Los equipos que la usan volveran al plan gratis hasta reasignarla.',
      confirm: 'Eliminar plantilla',
      cancel: 'Cancelar',
      columns: {
        name: 'Nombre',
        scope: 'Alcance',
        interval: 'Intervalo',
        price: 'Precio',
        publicFeatures: 'Funciones publicas',
        actions: 'Acciones'
      }
    },
    subscriptionsTable: {
      teamHeader: 'Equipo',
      membersHeader: 'Miembros',
      providerHeader: 'Proveedor',
      statusHeader: 'Estado',
      planHeader: 'Plan',
      periodStartLabel: 'Inicio de periodo',
      periodEndLabel: 'Fin de periodo',
      trialEndsLabel: 'Fin de prueba',
      cancelAtPeriodEndLabel: 'Cancelar al final',
      canceledAtLabel: 'Cancelado en',
      idsHeader: 'IDs',
      actionsHeader: 'Acciones',
      createdLabel: 'Creado',
      none: 'ninguno',
      free: 'Gratis',
      noTemplate: 'Gratis (sin plantilla)',
      planNamePlaceholder: 'Nombre del plan',
      save: 'Guardar',
      clear: 'Limpiar',
      confirmClearTitle: 'Limpiar suscripcion de este equipo?',
      confirmClearDescription:
        'Esto borra referencias del proveedor y devuelve el equipo al plan gratis.',
      confirm: 'Limpiar suscripcion',
      cancel: 'Cancelar',
      stripe: 'stripe',
      paypal: 'paypal',
      trialing: 'en prueba',
      active: 'activa',
      unpaid: 'sin pagar',
      canceled: 'cancelada'
    },
    templateForm: {
      planSectionTitle: 'Configuracion del plan',
      templateNameLabel: 'Nombre de plantilla',
      templateNamePlaceholder: 'Nombre de plantilla',
      targetScopeLabel: 'Alcance de suscripcion',
      categoryKeyLabel: 'Clave de categoria',
      categoryKeyPlaceholder: 'Clave de categoria (ej. team.pro)',
      hierarchyRankLabel: 'Rango de jerarquia',
      hierarchyRankPlaceholder: 'Rango de jerarquia (mas alto = plan mayor)',
      scopes: {
        user: 'Usuario',
        organization: 'Organizacion'
      },
      paymentProviderLabel: 'Proveedor de pago',
      providerPlanIdLabel: 'ID de plan del proveedor',
      providerPlanIdPlaceholder: 'ID de plan del proveedor (opcional)',
      billingIntervalLabel: 'Intervalo de cobro',
      priceLabel: 'Precio',
      pricePlaceholder: 'Precio (ej. 19.99)',
      compareAtPriceLabel: 'Precio de referencia',
      compareAtPricePlaceholder: 'Precio de lista (opcional)',
      currencyLabel: 'Moneda',
      currencyPlaceholder: 'Moneda (USD)',
      trialDaysLabel: 'Dias de prueba',
      trialDaysPlaceholder: 'Dias de prueba',
      featuresSectionTitle: 'Funciones de la plantilla',
      featuresSectionHint:
        'Solo las filas marcadas como publicas se muestran en la pagina de precios.',
      featureKeyLabel: 'Clave',
      featureLabelLabel: 'Etiqueta',
      featureTypeLabel: 'Tipo de valor',
      featureValueLabel: 'Valor',
      featureValueLabelLabel: 'Etiqueta publica del valor',
      featurePublicLabel: 'Publico',
      actionsLabel: 'Acciones',
      customFeaturesLabel:
        'Funcionalidades/cuotas personalizadas (clave-valor)',
      featureKeyPlaceholder: 'clave',
      featureLabelPlaceholder: 'Etiqueta de la funcion',
      featureValuePlaceholder: 'valor',
      featureValueLabelPlaceholder: 'Etiqueta visible del valor',
      remove: 'Quitar',
      addFeature: 'Agregar funcionalidad',
      createTemplate: 'Crear plantilla',
      updateTemplate: 'Actualizar plantilla',
      none: 'ninguno',
      stripe: 'stripe',
      paypal: 'paypal',
      intervals: {
        daily: 'Diario',
        weekly: 'Semanal',
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        yearly: 'Anual'
      },
      valueTypes: {
        text: 'Texto',
        number: 'Numero',
        boolean: 'Booleano',
        null: 'Sin valor'
      }
    },
      appConfig: {
        title: 'App Config',
        description:
          'Configuracion global de runtime para frontend publico y dashboard.',
        navigationTitle: 'Secciones de configuracion',
        navigationDescription: 'Elige una seccion para gestionar valores de runtime.',
        backToAppConfig: 'Volver App Config',
        envPriority:
          'Los valores de entorno tienen prioridad. Los valores de DB se usan solo si el env esta vacio.',
        sections: {
          general: 'General',
          paymentMethods: 'Metodos de pago',
          email: 'Email',
          theme: 'Tema'
        },
        sectionDescriptions: {
          general: 'Ajustes base de organizaciones y comportamiento global.',
          paymentMethods: 'Configura claves runtime de Stripe/PayPal y opciones por proveedor.',
          email: 'Configura envio SMTP y revisa logs de notificaciones.',
          theme: 'Controla el modo de tema y el default por area.'
        },
        organization: {
        title: 'Organizaciones',
        description:
          'Controla los limites de multi-organizacion por usuario.',
        allowMultiOrganizationsLabel:
          'Permitir multiples organizaciones por usuario',
        allowMultiOrganizationsHint:
          'Si se desactiva, cada usuario solo puede pertenecer a una organizacion.',
        maxOrganizationsPerUserLabel:
          'Maximo de organizaciones por usuario (opcional)',
        maxOrganizationsPerUserHint:
          'Dejalo vacio para sin limite cuando multi-organizacion este habilitado.',
        unlimitedPlaceholder: 'Sin limite'
      },
      email: {
        description:
          'Configura el envio por SMTP externo y revisa los logs de notificaciones enviadas.',
        smtpConfigTitle: 'Configuracion SMTP',
        smtpConfigDescription:
          'Usa un proveedor SMTP externo. Los hosts SMTP locales estan bloqueados.',
        logsTitle: 'Logs de envio de email',
        logsDescription:
          'Registra cada notificacion enviada, destinatario, evento disparador y estado.',
        logsEmpty: 'Aun no hay logs de correos.',
        status: {
          queued: 'En cola',
          sent: 'Enviado',
          failed: 'Fallido',
          skipped: 'Omitido'
        },
        logsHeaders: {
          created: 'Creado',
          status: 'Estado',
          event: 'Evento',
          recipient: 'Destinatario',
          subject: 'Asunto',
          source: 'Origen',
          message: 'Mensaje',
          details: 'Detalles'
        }
      },
      theme: {
        title: 'Politica de tema',
        description:
          'Define el tema default por area y si los usuarios pueden hacer override.',
        modeLabel: 'Modo de tema',
        modeHint:
          'System sigue la preferencia del sistema operativo, light fuerza claro, dark fuerza oscuro.',
        modes: {
          system: 'Sistema',
          light: 'Claro',
          dark: 'Oscuro'
        },
        allowUserOverrideLabel: 'Permitir override por usuario',
        allowUserOverrideHint:
          'Cuando esta activo, los usuarios pueden cambiar su tema en admin/dashboard.',
        adminDefaultLabel: 'Tema default admin',
        dashboardDefaultLabel: 'Tema default dashboard'
      },
      providers: {
        stripe: 'Stripe',
        paypal: 'PayPal'
      },
      envPrefix: 'ENV',
      overriddenByEnv: 'Sobrescrito por env',
      dbFallbackValue: 'Valor fallback en DB',
      sourcePrefix: 'Fuente',
      save: 'Guardar'
    },
    billingPage: {
      title: 'Facturacion',
      description: 'Gestiona suscripciones de equipos y estado de facturacion.',
      metrics: {
        payingTeams: 'Equipos con pago',
        payingTeamsHint: 'Equipos con proveedor Stripe/PayPal asignado',
        activeSubscriptions: 'Suscripciones activas',
        trialingSubscriptions: 'Suscripciones en prueba',
        issueSubscriptions: 'Sin pagar o canceladas'
      }
    },
    paymentsPage: {
      title: 'Pagos realizados',
      description:
        'Pagos recibidos con preview rapido tipo invoice y relacion a orden de compra.',
      filterPlaceholder: 'Filtrar por pagador/equipo...',
      metrics: {
        completedPayments: 'Pagos realizados',
        stripePayments: 'Pagos Stripe',
        paypalPayments: 'Pagos PayPal',
        missingReferencePayments: 'Sin referencia de pago',
        missingReferenceHint: 'Ordenes sin ID externo de pago'
      },
      table: {
        paidAtHeader: 'Pagado',
        whoHeader: 'Quien',
        reasonHeader: 'Por que',
        providerHeader: 'Proveedor',
        originHeader: 'Origen',
        typeHeader: 'Tipo',
        amountHeader: 'Monto',
        paymentReferenceHeader: 'Referencia de pago',
        purchaseOrderHeader: 'Orden de compra',
        actionsHeader: 'Preview',
        noTeam: 'Sin equipo',
        none: 'ninguno',
        checkout: 'checkout',
        webhook: 'webhook',
        dashboard: 'dashboard',
        system: 'system',
        preview: 'Preview',
        closePreview: 'Cerrar',
        orderLabel: 'Orden #{id}',
        eventLabel: 'Evento',
        messageLabel: 'Mensaje',
        invoiceTitle: 'Preview de invoice',
        invoiceDescription:
          'Resumen rapido de quien, por que, cuando, monto, origen, tipo y referencias.'
      }
    },
    ordersPage: {
      title: 'Ordenes',
      description:
        'Registros unificados de ordenes en Stripe y PayPal con plan y metodo de pago.',
      filterPlaceholder: 'Filtrar por equipo...',
      newOrder: 'Nueva orden',
      createTitle: 'Crear orden manual de suscripcion',
      createDescription:
        'Crea una orden manual de compra de suscripcion para usuario u organizacion y ejecuta eventos de ciclo cuando aplique el estado.',
      editTitle: 'Editar orden',
      editDescription:
        'Actualiza los datos de la orden y ejecuta los eventos relacionados al guardar.',
      legacySystemEventWarning:
        'Este registro pertenece a un evento operativo de plantilla. No es una orden real de checkout.',
      backToOrders: 'Volver a ordenes',
      createOrder: 'Crear orden',
      creatingOrder: 'Creando orden...',
      createdOrder: 'Orden creada',
      saveOrder: 'Guardar orden',
      savingOrder: 'Guardando orden...',
      savedOrder: 'Orden guardada',
      form: {
        targetTypeLabel: 'Destino de la suscripcion',
        targetTypes: {
          team: 'Organizacion / Team',
          user: 'Usuario'
        },
        providerLabel: 'Proveedor',
        statusLabel: 'Estado de la orden',
        sourceLabel: 'Origen',
        eventTypeLabel: 'Tipo de evento',
        eventTypePlaceholder: 'checkout.completed',
        eventTypeHint:
          'Usa nombres de eventos de checkout/webhook. Evita eventos operativos de plantilla para ordenes reales.',
        userIdLabel: 'Usuario (suscripcion por usuario)',
        userIdHint:
          'Selecciona el usuario que recibira la suscripcion de alcance user.',
        teamIdLabel: 'Equipo (suscripcion por organizacion)',
        teamIdHint:
          'Selecciona el equipo que recibira la suscripcion de alcance organization.',
        templateIdLabel: 'Plantilla de suscripcion',
        templateIdHint:
          'Obligatorio. Las plantillas se filtran por el alcance seleccionado.',
        paymentMethodLabel: 'Metodo de pago',
        planNameLabel: 'Nombre del plan',
        providerPlanIdLabel: 'ID de plan del proveedor',
        externalPaymentIdLabel: 'ID externo de pago',
        externalOrderIdLabel: 'ID externo de orden',
        amountMajorLabel: 'Monto',
        amountMajorHint: 'Usa formato decimal (por ejemplo, 10.50).',
        amountLabel: 'Monto (centavos)',
        currencyLabel: 'Moneda',
        messageLabel: 'Mensaje',
        messagePlaceholder: 'Contexto opcional para ejecutar eventos'
      },
      metrics: {
        receivedOrders: 'Recibidas',
        pendingOrders: 'Pendientes',
        canceledOrders: 'Canceladas',
        failedOrders: 'Fallidas'
      },
      table: {
        updatedHeader: 'Actualizado',
        teamHeader: 'Equipo',
        providerHeader: 'Proveedor',
        statusHeader: 'Estado',
        sourceHeader: 'Origen',
        methodHeader: 'Metodo de pago',
        planHeader: 'Plan',
        amountHeader: 'Monto',
        paymentReferenceHeader: 'Referencia de pago',
        orderReferenceHeader: 'Referencia de orden',
        eventHeader: 'Evento',
        messageHeader: 'Mensaje',
        actionsHeader: 'Acciones',
        none: 'ninguno',
        noTeam: 'Sin equipo',
        pending: 'pendiente',
        received: 'recibida',
        canceled: 'cancelada',
        failed: 'fallida',
        checkout: 'checkout',
        webhook: 'webhook',
        dashboard: 'dashboard',
        system: 'system',
        edit: 'Editar'
      }
    },
    logsPage: {
      title: 'Logs',
      description:
        'Vista centralizada de auditoria del sistema y envios de email.',
      tabs: {
        system: 'Logs del sistema',
        email: 'Logs de email'
      },
      filterPlaceholder: 'Filtrar por evento...',
      table: {
        createdHeader: 'Creado',
        eventHeader: 'Evento',
        categoryHeader: 'Categoria',
        actionHeader: 'Accion',
        statusHeader: 'Estado',
        actorHeader: 'Actor',
        targetHeader: 'Objetivo',
        teamHeader: 'Equipo',
        entityHeader: 'Entidad',
        sourceHeader: 'Origen',
        ipHeader: 'IP',
        messageHeader: 'Mensaje',
        noActor: 'Sistema',
        noTarget: 'N/A',
        noTeam: 'Sin equipo',
        noEntity: '-',
        noSource: '-',
        info: 'info',
        success: 'exito',
        warning: 'aviso',
        failed: 'fallo'
      }
    },
    dataTable: {
      filterPlaceholder: 'Filtrar...',
      columns: 'Columnas',
      noResults: 'Sin resultados.',
      showingRows: 'Mostrando {shown} de {filtered} fila(s).',
      previous: 'Anterior',
      next: 'Siguiente'
    }
  }
};
