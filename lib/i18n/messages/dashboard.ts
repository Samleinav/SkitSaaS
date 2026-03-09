export type DashboardMessages = {
  language: {
    label: string;
  };
  layout: {
    settings: string;
    toggleSidebar: string;
    nav: {
      team: string;
      general: string;
      activity: string;
      security: string;
      subscriptions: string;
    };
  };
  homeNoContext: {
    title: string;
    description: string;
  };
  team: {
    title: string;
    subscription: {
      title: string;
      currentPlan: string;
      unknown: string;
      free: string;
      billedMonthly: string;
      trialPeriod: string;
      noActiveSubscription: string;
      manage: string;
      cancel: string;
    };
    members: {
      title: string;
      unknownUser: string;
      noMembers: string;
      remove: string;
      removing: string;
      confirmRemoveTitle: string;
      confirmRemoveDescription: string;
      confirm: string;
      cancel: string;
    };
    invite: {
      title: string;
      emailLabel: string;
      emailPlaceholder: string;
      roleLabel: string;
      member: string;
      owner: string;
      inviting: string;
      inviteMember: string;
      ownerRequired: string;
    };
  };
  general: {
    title: string;
    accountInformation: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    saving: string;
    saveChanges: string;
  };
  subscriptions: {
    title: string;
    description: string;
    summary: {
      organizations: string;
      paymentEvents: string;
      invoices: string;
    };
    teamFilter: {
      title: string;
      label: string;
      allTeams: string;
      apply: string;
      clear: string;
      selected: string;
      allDescription: string;
    };
    userPlan: {
      title: string;
      noSubscription: string;
      activeSubscription: string;
      plan: string;
      interval: string;
      amount: string;
      source: string;
      sourceManual: string;
      sourceSystem: string;
      changePlanImmediate: string;
      changePlanPeriodEnd: string;
      cancel: string;
      cancelPending: string;
      confirmCancelTitle: string;
      confirmCancelDescription: string;
      confirmCancel: string;
      keep: string;
    };
    organizationPolicy: {
      title: string;
      allowMultiOrganizations: string;
      maxByConfig: string;
      maxBySubscription: string;
      effectiveLimit: string;
      currentOrganizations: string;
      yes: string;
      no: string;
      unlimited: string;
    };
    organizations: {
      title: string;
      empty: string;
      columns: {
        organization: string;
        role: string;
        plan: string;
        provider: string;
        status: string;
        joinedAt: string;
        actions: string;
      };
      owner: string;
      member: string;
      noPlan: string;
      noProvider: string;
      noStatus: string;
      manage: string;
      managePending: string;
      changePlanImmediate: string;
      changePlanPeriodEnd: string;
      cancelPaypal: string;
      cancelPaypalPending: string;
      confirmCancelTitle: string;
      confirmCancelDescription: string;
      confirmCancel: string;
      keep: string;
    };
    logs: {
      title: string;
      description: string;
      empty: string;
      filterPlaceholder: string;
      columns: {
        date: string;
        scope: string;
        provider: string;
        status: string;
        event: string;
        amount: string;
        paymentRef: string;
        orderRef: string;
      };
      accountScope: string;
      unknownScope: string;
    };
    invoices: {
      title: string;
      description: string;
      empty: string;
      filterPlaceholder: string;
      columns: {
        date: string;
        scope: string;
        plan: string;
        provider: string;
        amount: string;
        reference: string;
      };
    };
    statuses: {
      active: string;
      trialing: string;
      unpaid: string;
      canceled: string;
      free: string;
      pending: string;
      received: string;
      failed: string;
    };
    intervals: {
      daily: string;
      weekly: string;
      monthly: string;
      quarterly: string;
      semiannual: string;
      yearly: string;
    };
    table: {
      showingRows: string;
      previous: string;
      next: string;
    };
  };
  security: {
    title: string;
    passwordTitle: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    updating: string;
    updatePassword: string;
    deleteAccountTitle: string;
    deleteWarning: string;
    confirmPassword: string;
    deleting: string;
    deleteAccount: string;
    confirmDeleteTitle: string;
    confirmDeleteDescription: string;
    confirm: string;
    cancel: string;
  };
  activity: {
    title: string;
    recentActivity: string;
    time: {
      justNow: string;
      minutesAgo: string;
      hoursAgo: string;
      daysAgo: string;
    };
    actions: {
      signUp: string;
      signIn: string;
      signOut: string;
      updatePassword: string;
      deleteAccount: string;
      updateAccount: string;
      createTeam: string;
      removeTeamMember: string;
      inviteTeamMember: string;
      acceptInvitation: string;
      resetPassword: string;
      unknown: string;
    };
    fromIp: string;
    noActivityTitle: string;
    noActivityDescription: string;
  };
};
