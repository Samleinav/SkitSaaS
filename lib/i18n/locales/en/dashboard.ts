import type { DashboardMessages } from '../../messages/dashboard';

const messages = {
  language: {
    label: 'Language'
  },
  layout: {
    settings: 'Settings',
    toggleSidebar: 'Toggle sidebar',
    nav: {
      team: 'Team',
      general: 'General',
      activity: 'Activity',
      security: 'Security',
      subscriptions: 'Subscriptions'
    }
  },
  homeNoContext: {
    title: 'No dashboard modules available',
    description: 'Your account does not have a standalone dashboard experience configured yet.'
  },
  team: {
    title: 'Team Settings',
    subscription: {
      title: 'Team Subscription',
      currentPlan: 'Current Plan',
      unknown: 'Unknown',
      free: 'Subscription Free',
      billedMonthly: 'Billed monthly',
      trialPeriod: 'Trial period',
      noActiveSubscription: 'No active subscription',
      manage: 'Manage Subscription',
      cancel: 'Cancel Subscription'
    },
    members: {
      title: 'Team Members',
      unknownUser: 'Unknown User',
      noMembers: 'No team members yet.',
      remove: 'Remove',
      removing: 'Removing...',
      confirmRemoveTitle: 'Remove this team member?',
      confirmRemoveDescription: 'This person will lose access to the team immediately.',
      confirm: 'Remove member',
      cancel: 'Cancel'
    },
    invite: {
      title: 'Invite Team Member',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter email',
      roleLabel: 'Role',
      member: 'Member',
      owner: 'Owner',
      inviting: 'Inviting...',
      inviteMember: 'Invite Member',
      ownerRequired: 'You must be a team owner to invite new members.'
    }
  },
  general: {
    title: 'General Settings',
    accountInformation: 'Account Information',
    name: 'Name',
    namePlaceholder: 'Enter your name',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    saving: 'Saving...',
    saveChanges: 'Save Changes'
  },
  subscriptions: {
    title: 'Subscription Management',
    description: 'Control your account subscription and each organization subscription from one place.',
    summary: {
      organizations: 'Organizations',
      paymentEvents: 'Payment events',
      invoices: 'Invoices'
    },
    teamFilter: {
      title: 'Team filter',
      label: 'View by team',
      allTeams: 'All teams',
      apply: 'Apply',
      clear: 'Clear',
      selected: 'Showing data for: {team}',
      allDescription: 'Showing data for all your teams and account scope.'
    },
    userPlan: {
      title: 'User subscription',
      noSubscription: 'No user subscription assigned.',
      activeSubscription: 'Active user subscription',
      plan: 'Plan',
      interval: 'Interval',
      amount: 'Amount',
      source: 'Source',
      sourceManual: 'Manual assignment',
      sourceSystem: 'Billing system',
      changePlanImmediate: 'Change plan now',
      changePlanPeriodEnd: 'Change plan at period end',
      cancel: 'Cancel user subscription',
      cancelPending: 'Canceling...',
      confirmCancelTitle: 'Cancel your user subscription?',
      confirmCancelDescription: 'This removes the user-level template assignment immediately.',
      confirmCancel: 'Yes, cancel',
      keep: 'Keep subscription'
    },
    organizationPolicy: {
      title: 'Organization limits',
      maxBySubscription: 'Max organizations (user subscription)',
      currentOrganizations: 'Current organizations',
      unlimited: 'Unlimited'
    },
    organizations: {
      title: 'Organization subscriptions',
      empty: 'No organization memberships found.',
      columns: {
        organization: 'Organization',
        role: 'Role',
        plan: 'Plan',
        provider: 'Provider',
        status: 'Status',
        joinedAt: 'Joined',
        actions: 'Actions'
      },
      owner: 'Owner',
      member: 'Member',
      noPlan: 'No plan',
      noProvider: 'No provider',
      noStatus: 'No status',
      manage: 'Manage',
      managePending: 'Opening...',
      changePlanImmediate: 'Change plan now',
      changePlanPeriodEnd: 'Change plan at period end',
      cancelPaypal: 'Cancel PayPal',
      cancelPaypalPending: 'Canceling...',
      confirmCancelTitle: 'Cancel this PayPal subscription?',
      confirmCancelDescription: 'This will cancel the organization PayPal subscription and revert to free status.',
      confirmCancel: 'Yes, cancel',
      keep: 'Keep subscription'
    },
    logs: {
      title: 'Payment logs',
      description: 'Recent payment events for your account and organizations.',
      empty: 'No payment events found.',
      filterPlaceholder: 'Filter by scope...',
      columns: {
        date: 'Date',
        scope: 'Scope',
        provider: 'Provider',
        status: 'Status',
        event: 'Event',
        amount: 'Amount',
        paymentRef: 'Payment reference',
        orderRef: 'Order reference'
      },
      accountScope: 'Account',
      unknownScope: 'Unknown scope'
    },
    invoices: {
      title: 'Invoices',
      description: 'Completed payments (invoice-style history).',
      empty: 'No invoices found.',
      filterPlaceholder: 'Filter by scope...',
      columns: {
        date: 'Date',
        scope: 'Scope',
        plan: 'Plan',
        provider: 'Provider',
        amount: 'Amount',
        reference: 'Reference'
      }
    },
    statuses: {
      active: 'Active',
      trialing: 'Trialing',
      unpaid: 'Unpaid',
      canceled: 'Canceled',
      free: 'Free',
      pending: 'Pending',
      received: 'Received',
      failed: 'Failed'
    },
    intervals: {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      semiannual: 'Semiannual',
      yearly: 'Yearly'
    },
    table: {
      showingRows: 'Showing {shown} of {filtered} rows',
      previous: 'Previous',
      next: 'Next'
    }
  },
  security: {
    title: 'Security Settings',
    passwordTitle: 'Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    updating: 'Updating...',
    updatePassword: 'Update Password',
    deleteAccountTitle: 'Delete Account',
    deleteWarning: 'Account deletion is non-reversable. Please proceed with caution.',
    confirmPassword: 'Confirm Password',
    deleting: 'Deleting...',
    deleteAccount: 'Delete Account',
    confirmDeleteTitle: 'Delete your account?',
    confirmDeleteDescription: 'This action is permanent and removes your account data.',
    confirm: 'Delete account',
    cancel: 'Cancel'
  },
  activity: {
    title: 'Activity Log',
    recentActivity: 'Recent Activity',
    time: {
      justNow: 'just now',
      minutesAgo: '{count} minutes ago',
      hoursAgo: '{count} hours ago',
      daysAgo: '{count} days ago'
    },
    actions: {
      signUp: 'You signed up',
      signIn: 'You signed in',
      signOut: 'You signed out',
      updatePassword: 'You changed your password',
      deleteAccount: 'You deleted your account',
      updateAccount: 'You updated your account',
      createTeam: 'You created a new team',
      removeTeamMember: 'You removed a team member',
      inviteTeamMember: 'You invited a team member',
      acceptInvitation: 'You accepted an invitation',
      resetPassword: 'You reset your password',
      unknown: 'Unknown action occurred'
    },
    fromIp: 'from IP',
    noActivityTitle: 'No activity yet',
    noActivityDescription: "When you perform actions like signing in or updating your account, they'll appear here."
  }
} satisfies DashboardMessages;

export default messages;
