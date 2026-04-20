import type { DataTableLabels } from '@/components/ui/data-table';
import type { Translator } from '@/lib/i18n/translator';
import type { SubscriptionTemplateFormCopy } from './forms';

export type AdminOrganizationSubscriptionsTableCopy = {
  teamHeader: string;
  membersHeader: string;
  providerHeader: string;
  statusHeader: string;
  planHeader: string;
  idsHeader: string;
  actionsHeader: string;
  createdLabel: string;
  none: string;
  free: string;
  noTemplate: string;
  stripe: string;
  paypal: string;
  trialing: string;
  active: string;
  unpaid: string;
  canceled: string;
  edit: string;
  filterPlaceholder: string;
};

export type AdminUserSubscriptionsTableCopy = {
  userHeader: string;
  unnamedUser: string;
  roleHeader: string;
  statusHeader: string;
  subscriptionHeader: string;
  organizationsHeader: string;
  actionsHeader: string;
  organizationsCount: string;
  noSubscription: string;
  edit: string;
  filterPlaceholder: string;
  statusActive: string;
  statusSuspended: string;
  statusBanned: string;
  statusDeleted: string;
};

export type AdminSubscriptionsCopy = {
  title: string;
  templatesTitle: string;
  newOrder: string;
  scopes: {
    user: string;
    organization: string;
  };
  organizationDescription: string;
  userDescription: string;
  userSectionDescription: string;
  userMetrics: {
    totalUsers: string;
    usersWithSubscription: string;
    activeUsers: string;
    withoutSubscription: string;
  };
  organizationMetrics: {
    payingTeams: string;
    payingTeamsHint: string;
    activeSubscriptions: string;
    trialingSubscriptions: string;
    issueSubscriptions: string;
  };
  organizationTable: AdminOrganizationSubscriptionsTableCopy;
  userTable: AdminUserSubscriptionsTableCopy;
  dataTable: DataTableLabels;
};

export function createAdminSubscriptionsCopy(
  t: Translator
): AdminSubscriptionsCopy {
  return {
    title: t('Subscriptions'),
    templatesTitle: t('Subscription Templates'),
    newOrder: t('New order'),
    scopes: {
      user: t('User'),
      organization: t('Organization')
    },
    organizationDescription: t('Manage team subscriptions and billing status.'),
    userDescription: t(
      'Review user subscription assignment and organization memberships.'
    ),
    userSectionDescription: t('Filter by email...'),
    userMetrics: {
      totalUsers: t('Users'),
      usersWithSubscription: t('Managed user plans'),
      activeUsers: t('Active accounts'),
      withoutSubscription: t('Default tier')
    },
    organizationMetrics: {
      payingTeams: t('Paying teams'),
      payingTeamsHint: t('Teams with Stripe/PayPal provider assigned'),
      activeSubscriptions: t('Active subscriptions'),
      trialingSubscriptions: t('Trialing subscriptions'),
      issueSubscriptions: t('Unpaid or canceled')
    },
    organizationTable: {
      teamHeader: t('Team'),
      membersHeader: t('Members'),
      providerHeader: t('Provider'),
      statusHeader: t('Status'),
      planHeader: t('Plan'),
      idsHeader: t('IDs'),
      actionsHeader: t('Actions'),
      createdLabel: t('Created'),
      none: t('none'),
      free: t('Free'),
      noTemplate: t('Default tier'),
      stripe: t('stripe'),
      paypal: t('paypal'),
      trialing: t('trialing'),
      active: t('active'),
      unpaid: t('unpaid'),
      canceled: t('canceled'),
      edit: t('Edit'),
      filterPlaceholder: t('Filter by team...')
    },
    userTable: {
      userHeader: t('User'),
      unnamedUser: t('Unnamed user'),
      roleHeader: t('Role'),
      statusHeader: t('Status'),
      subscriptionHeader: t('User subscription'),
      organizationsHeader: t('Organizations'),
      actionsHeader: t('Actions'),
      organizationsCount: t('{count} total • {owned} owner'),
      noSubscription: t('No subscription'),
      edit: t('Edit'),
      filterPlaceholder: t('Filter by email...'),
      statusActive: t('Active'),
      statusSuspended: t('Suspended'),
      statusBanned: t('Banned'),
      statusDeleted: t('Deleted')
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

export function getAdminSubscriptionScopeLabels(
  t: Translator
): SubscriptionTemplateFormCopy['scopeLabels'] {
  return {
    user: t('User'),
    organization: t('Organization')
  };
}

export function getAdminSubscriptionIntervalLabels(
  t: Translator
): SubscriptionTemplateFormCopy['intervalLabels'] {
  return {
    daily: t('Daily'),
    weekly: t('Weekly'),
    monthly: t('Monthly'),
    quarterly: t('Quarterly'),
    semiannual: t('Semi-annual'),
    yearly: t('Yearly')
  };
}

export function createAdminSubscriptionTemplateFormCopy(
  t: Translator
): SubscriptionTemplateFormCopy {
  return {
    planSectionTitle: t('Plan settings'),
    templateNameLabel: t('Template name'),
    templateNamePlaceholder: t('Template name'),
    targetScopeLabel: t('Subscription scope'),
    publicationStatusLabel: t('Publication status'),
    categoryKeyLabel: t('Category key'),
    categoryKeyPlaceholder: t('Category key (e.g. team.pro)'),
    hierarchyRankLabel: t('Hierarchy rank'),
    hierarchyRankPlaceholder: t('Hierarchy rank (higher means bigger plan)'),
    scopeLabels: getAdminSubscriptionScopeLabels(t),
    publicationStatusLabels: {
      draft: t('Draft'),
      published: t('Published')
    },
    billingIntervalLabel: t('Billing interval'),
    intervalLabels: getAdminSubscriptionIntervalLabels(t),
    priceLabel: t('Price'),
    pricePlaceholder: t('Price (e.g. 19.99)'),
    compareAtPriceLabel: t('Compare at price'),
    compareAtPricePlaceholder: t('Compare at price (optional)'),
    currencyLabel: t('Currency'),
    currencyPlaceholder: t('Currency (USD)'),
    trialDaysLabel: t('Trial days'),
    trialDaysPlaceholder: t('Trial days'),
    featuresSectionTitle: t('Template features'),
    featuresSectionHint: t(
      'Only rows marked as public are shown on the pricing page.'
    ),
    featureKeyLabel: t('Key'),
    featureOrderLabel: t('Order'),
    featureLabelLabel: t('Label'),
    featureTypeLabel: t('Value type'),
    featureValueLabel: t('Value'),
    featureValueLabelLabel: t('Public value label'),
    featurePublicLabel: t('Public'),
    featureKeyPlaceholder: t('feature key'),
    featureOrderPlaceholder: t('10'),
    featureLabelPlaceholder: t('Feature label'),
    featureValuePlaceholder: t('feature value'),
    featureValueLabelPlaceholder: t('Shown value label'),
    addFeature: t('Add feature'),
    removeFeature: t('Remove'),
    valueTypeLabels: {
      text: t('Text'),
      number: t('Number'),
      boolean: t('Boolean'),
      null: t('No value')
    }
  };
}
