export const EVENT_HOOKS = {
  // Auth / login
  authSignInAttempt: 'auth.sign_in.attempt',
  authSignInSuccess: 'auth.sign_in.success',
  authSignInFailed: 'auth.sign_in.failed',
  authSignOut: 'auth.sign_out',
  authSignUpBeforeCreate: 'auth.sign_up.before_create',
  authSignUpCreated: 'auth.sign_up.created',
  authSignUpFailed: 'auth.sign_up.failed',
  authInvitationAccepted: 'auth.invitation.accepted',
  authTeamCreated: 'auth.team.created',

  // Dashboard account + teams
  dashboardAccountUpdated: 'dashboard.account.updated',
  dashboardAccountPasswordUpdated: 'dashboard.account.password.updated',
  dashboardAccountDeleted: 'dashboard.account.deleted',
  dashboardTeamsCreated: 'dashboard.teams.created',
  dashboardTeamMemberInvited: 'dashboard.teams.member.invited',
  dashboardTeamMemberRemoved: 'dashboard.teams.member.removed',

  // Dashboard subscriptions
  dashboardSubscriptionsOrganizationCancelRequested:
    'dashboard.subscriptions.organization.cancel_requested',
  dashboardSubscriptionsOrganizationCanceled:
    'dashboard.subscriptions.organization.canceled',
  dashboardSubscriptionsUserCancelRequested:
    'dashboard.subscriptions.user.cancel_requested',
  dashboardSubscriptionsUserCanceled: 'dashboard.subscriptions.user.canceled',
  dashboardSubscriptionsPortalOpened: 'dashboard.subscriptions.portal.opened',

  // Admin users
  adminUsersCreated: 'admin.users.created',
  adminUsersUpdated: 'admin.users.updated',
  adminUsersStatusChanged: 'admin.users.status_changed',
  adminUsersDeleted: 'admin.users.deleted',

  // Admin orders
  adminOrdersBeforeCreate: 'admin.orders.before_create',
  adminOrdersCreated: 'admin.orders.created',
  adminOrdersBeforeUpdate: 'admin.orders.before_update',
  adminOrdersUpdated: 'admin.orders.updated',

  // Admin subscriptions/templates
  adminSubscriptionTemplateCreated: 'admin.subscriptions.template.created',
  adminSubscriptionTemplateUpdated: 'admin.subscriptions.template.updated',
  adminSubscriptionTemplatePricingChanged:
    'admin.subscriptions.template.pricing_changed',
  adminSubscriptionsActiveUpdateRequested:
    'admin.subscriptions.active_update_requested',
  adminSubscriptionsOrganizationUpdated:
    'admin.subscriptions.organization.updated',
  adminSubscriptionsOrganizationCleared:
    'admin.subscriptions.organization.cleared',
  adminSubscriptionsUserUpdated: 'admin.subscriptions.user.updated',

  // Admin app config
  adminAppConfigUpdated: 'admin.app_config.updated',
  adminPaymentsConfigUpdated: 'admin.payments.config.updated',
  adminEmailConfigUpdated: 'admin.email.config.updated',
  adminThemePolicyUpdated: 'admin.theme.policy.updated',
  adminAppConfigSectionsCompose: 'admin.app_config.sections.compose',

  // Admin + dashboard nav composition
  adminNavItemsCompose: 'admin.nav.items.compose',
  dashboardNavItemsCompose: 'dashboard.nav.items.compose',

  // Checkout
  checkoutSessionCreateBefore: 'checkout.session.create.before',
  checkoutSessionCreateAfter: 'checkout.session.create.after',
  checkoutBeforeCreateOrder: 'checkout.before_create_order',
  checkoutAfterCreateOrder: 'checkout.after_create_order',
  checkoutWebhookReceived: 'checkout.webhook.received',
  checkoutWebhookProcessed: 'checkout.webhook.processed',
  checkoutWebhookFailed: 'checkout.webhook.failed',
  checkoutChangeRequestCreated: 'checkout.change_request.created',

  // Payments + orders
  paymentOrderStatusChanged: 'payments.order.status_changed',
  paymentOrderLifecycleApplied: 'payments.order.lifecycle.applied',
  paymentTransactionRecorded: 'payments.transaction.recorded',

  // Subscriptions
  subscriptionAssignmentActivated: 'subscriptions.assignment.activated',
  subscriptionAssignmentSuspended: 'subscriptions.assignment.suspended',
  subscriptionAssignmentCanceled: 'subscriptions.assignment.canceled',
  subscriptionChangeRequestCreated: 'subscriptions.change_request.created',
  subscriptionChangeRequestApplied: 'subscriptions.change_request.applied',
  subscriptionChangeRequestFailed: 'subscriptions.change_request.failed',

  // Email / SMTP
  emailSmtpBeforeSend: 'email.smtp.before_send',
  emailSmtpSent: 'email.smtp.sent',
  emailSmtpFailed: 'email.smtp.failed',

  // Legacy alias (keep until hooks are fully wired)
  subscriptionLifecycleApplied: 'subscription.lifecycle.applied'
} as const;

export type EventHook =
  | (typeof EVENT_HOOKS)[keyof typeof EVENT_HOOKS]
  | string;
