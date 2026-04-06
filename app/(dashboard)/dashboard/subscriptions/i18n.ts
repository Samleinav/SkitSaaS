import type { Translator } from '@/lib/i18n/translator';

export type DashboardSubscriptionsCopy = {
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
    maxBySubscription: string;
    currentOrganizations: string;
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
    manage: string;
    managePending: string;
    cancelPaypal: string;
    confirmCancelTitle: string;
    confirmCancelDescription: string;
    confirmCancel: string;
    keep: string;
    changePlanImmediate: string;
    changePlanPeriodEnd: string;
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
  intervals: Record<string, string>;
  table: {
    showingRows: string;
    previous: string;
    next: string;
  };
};

export function createDashboardSubscriptionsCopy(
  t: Translator
): DashboardSubscriptionsCopy {
  return {
    title: t('Subscription Management'),
    description: t(
      'Control your account subscription and each organization subscription from one place.'
    ),
    summary: {
      organizations: t('Organizations'),
      paymentEvents: t('Payment events'),
      invoices: t('Invoices')
    },
    teamFilter: {
      title: t('Team filter'),
      label: t('View by team'),
      allTeams: t('All teams'),
      apply: t('Apply'),
      clear: t('Clear'),
      selected: t('Showing data for: {team}'),
      allDescription: t('Showing data for all your teams and account scope.')
    },
    userPlan: {
      title: t('User subscription'),
      noSubscription: t('No user subscription assigned.'),
      activeSubscription: t('Active user subscription'),
      plan: t('Plan'),
      interval: t('Interval'),
      amount: t('Amount'),
      source: t('Source'),
      sourceManual: t('Manual assignment'),
      changePlanImmediate: t('Change plan now'),
      changePlanPeriodEnd: t('Change plan at period end'),
      cancel: t('Cancel user subscription'),
      cancelPending: t('Canceling...'),
      confirmCancelTitle: t('Cancel your user subscription?'),
      confirmCancelDescription: t(
        'This removes the user-level template assignment immediately.'
      ),
      confirmCancel: t('Yes, cancel'),
      keep: t('Keep subscription')
    },
    organizationPolicy: {
      title: t('Organization limits'),
      maxBySubscription: t('Max organizations (user subscription)'),
      currentOrganizations: t('Current organizations'),
      unlimited: t('Unlimited')
    },
    organizations: {
      title: t('Organization subscriptions'),
      empty: t('No organization memberships found.'),
      columns: {
        organization: t('Organization'),
        role: t('Role'),
        plan: t('Plan'),
        provider: t('Provider'),
        status: t('Status'),
        joinedAt: t('Joined'),
        actions: t('Actions')
      },
      owner: t('Owner'),
      member: t('Member'),
      noPlan: t('No plan'),
      noProvider: t('No provider'),
      manage: t('Manage'),
      managePending: t('Opening...'),
      cancelPaypal: t('Cancel PayPal'),
      confirmCancelTitle: t('Cancel this PayPal subscription?'),
      confirmCancelDescription: t(
        'This will cancel the organization PayPal subscription and revert to free status.'
      ),
      confirmCancel: t('Yes, cancel'),
      keep: t('Keep subscription'),
      changePlanImmediate: t('Change plan now'),
      changePlanPeriodEnd: t('Change plan at period end')
    },
    logs: {
      title: t('Payment logs'),
      description: t(
        'Recent payment events for your account and organizations.'
      ),
      empty: t('No payment events found.'),
      filterPlaceholder: t('Filter by scope...'),
      columns: {
        date: t('Date'),
        scope: t('Scope'),
        provider: t('Provider'),
        status: t('Status'),
        event: t('Event'),
        amount: t('Amount'),
        paymentRef: t('Payment reference'),
        orderRef: t('Order reference')
      },
      accountScope: t('Account'),
      unknownScope: t('Unknown scope')
    },
    invoices: {
      title: t('Invoices'),
      description: t('Completed payments (invoice-style history).'),
      empty: t('No invoices found.'),
      filterPlaceholder: t('Filter by scope...'),
      columns: {
        date: t('Date'),
        scope: t('Scope'),
        plan: t('Plan'),
        provider: t('Provider'),
        amount: t('Amount'),
        reference: t('Reference')
      }
    },
    statuses: {
      active: t('Active'),
      trialing: t('Trialing'),
      unpaid: t('Unpaid'),
      canceled: t('Canceled'),
      free: t('Free'),
      pending: t('Pending'),
      received: t('Received'),
      failed: t('Failed')
    },
    intervals: {
      daily: t('Daily'),
      weekly: t('Weekly'),
      monthly: t('Monthly'),
      quarterly: t('Quarterly'),
      semiannual: t('Semiannual'),
      yearly: t('Yearly')
    },
    table: {
      showingRows: t('Showing {shown} of {filtered} rows'),
      previous: t('Previous'),
      next: t('Next')
    }
  };
}
