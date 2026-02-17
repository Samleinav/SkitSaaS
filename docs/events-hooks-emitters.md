---
title: Events and Hooks Emitters Checklist
sidebar_position: 15
---

# Events and Hooks Emitters 

Records **where each hook is emitted** (file + method).
Check the box after the emitter is added.

## Auth / Login

- [x] `auth.sign_in.attempt` -> `app/(login)/actions.ts` -> `signIn`
- [x] `auth.sign_in.success` -> `app/(login)/actions.ts` -> `signIn`
- [x] `auth.sign_in.failed` -> `app/(login)/actions.ts` -> `signIn`
- [x] `auth.sign_out` -> `app/(login)/actions.ts` -> `signOut`
- [x] `auth.sign_up.before_create` -> `app/(login)/actions.ts` -> `signUp`
- [x] `auth.sign_up.created` -> `app/(login)/actions.ts` -> `signUp`
- [x] `auth.sign_up.failed` -> `app/(login)/actions.ts` -> `signUp`
- [x] `auth.invitation.accepted` -> `app/(login)/actions.ts` -> `signUp`
- [x] `auth.team.created` -> `app/(login)/actions.ts` -> `signUp`

## Dashboard: Account + Teams

- [x] `dashboard.account.updated` -> `app/(login)/actions.ts` -> `updateAccount`
- [x] `dashboard.account.password.updated` -> `app/(login)/actions.ts` -> `updatePassword`
- [x] `dashboard.account.deleted` -> `app/(login)/actions.ts` -> `deleteAccount`
- [x] `dashboard.teams.created` -> `app/(login)/actions.ts` -> `signUp` (team creation path)
- [x] `dashboard.teams.member.invited` -> `app/(login)/actions.ts` -> `inviteTeamMember`
- [x] `dashboard.teams.member.removed` -> `app/(login)/actions.ts` -> `removeTeamMember`

## Dashboard: Subscriptions

- [x] `dashboard.subscriptions.organization.cancel_requested` -> `app/(dashboard)/dashboard/subscriptions/actions.ts` -> `manageOrganizationSubscriptionAction`
- [x] `dashboard.subscriptions.organization.canceled` -> `app/(dashboard)/dashboard/subscriptions/actions.ts` -> `manageOrganizationSubscriptionAction`
- [x] `dashboard.subscriptions.user.cancel_requested` -> `app/(dashboard)/dashboard/subscriptions/actions.ts` -> `cancelUserSubscriptionAction`
- [x] `dashboard.subscriptions.user.canceled` -> `app/(dashboard)/dashboard/subscriptions/actions.ts` -> `cancelUserSubscriptionAction`
- [x] `dashboard.subscriptions.portal.opened` -> `app/(dashboard)/dashboard/subscriptions/actions.ts` -> `manageOrganizationSubscriptionAction`

## Admin: Users

- [x] `admin.users.created` -> `app/(dashboard)/admin/users/actions.ts` -> `createUserAction`
- [x] `admin.users.updated` -> `app/(dashboard)/admin/users/actions.ts` -> `updateUserProfileAction`
- [x] `admin.users.status_changed` -> `app/(dashboard)/admin/users/actions.ts` -> `updateUserAccountStatusAction`
- [x] `admin.users.deleted` -> `app/(dashboard)/admin/users/actions.ts` -> `deleteUserAction`

## Admin: Orders

- [x] `admin.orders.before_create` -> `app/(dashboard)/admin/orders/actions.ts` -> `createPaymentOrderAction`
- [x] `admin.orders.created` -> `app/(dashboard)/admin/orders/actions.ts` -> `createPaymentOrderAction`
- [x] `admin.orders.before_update` -> `app/(dashboard)/admin/orders/actions.ts` -> `updatePaymentOrderAction`
- [x] `admin.orders.updated` -> `app/(dashboard)/admin/orders/actions.ts` -> `updatePaymentOrderAction`

## Admin: Subscriptions / Templates

- [x] `admin.subscriptions.template.created` -> `app/(dashboard)/admin/subscriptions/actions.ts`
- [x] `admin.subscriptions.template.updated` -> `app/(dashboard)/admin/subscriptions/actions.ts`
- [x] `admin.subscriptions.template.pricing_changed` -> `app/(dashboard)/admin/subscriptions/actions.ts` -> `emitTemplatePricingChangedEvent`
- [x] `admin.subscriptions.active_update_requested` -> `app/(dashboard)/admin/subscriptions/actions.ts` -> `emitTemplateActiveSubscriptionsUpdateRequestedEvent`
- [x] `admin.subscriptions.organization.updated` -> `app/(dashboard)/admin/subscriptions/actions.ts`
- [x] `admin.subscriptions.organization.cleared` -> `app/(dashboard)/admin/subscriptions/actions.ts`
- [x] `admin.subscriptions.user.updated` -> `app/(dashboard)/admin/subscriptions/actions.ts`

## Admin: App Config

- [x] `admin.app_config.updated` -> `app/(dashboard)/admin/app-config/actions.ts`
- [x] `admin.payments.config.updated` -> `app/(dashboard)/admin/app-config/actions.ts`
- [x] `admin.email.config.updated` -> `app/(dashboard)/admin/app-config/actions.ts`
- [x] `admin.app_config.sections.compose` -> `app/(dashboard)/admin/app-config/section-nav.tsx`

## Nav Composition

- [x] `admin.nav.items.compose` -> `app/(dashboard)/admin/layout.tsx`
- [x] `dashboard.nav.items.compose` -> `app/(dashboard)/dashboard/layout.tsx`

## Checkout

- [x] `checkout.session.create.before` -> `lib/payments/stripe.ts` -> `createCheckoutSession` (Stripe)
- [x] `checkout.session.create.after` -> `lib/payments/stripe.ts` -> `createCheckoutSession` (Stripe)
- [x] `checkout.before_create_order` -> `lib/payments/checkout-system.ts` -> `recordCheckoutEvent`
- [x] `checkout.after_create_order` -> `lib/payments/checkout-system.ts` -> `recordCheckoutEvent`
- [x] `checkout.webhook.received` -> `app/api/stripe/webhook/route.ts` + `app/api/paypal/webhook/route.ts`
- [x] `checkout.webhook.processed` -> `app/api/stripe/webhook/route.ts` + `app/api/paypal/webhook/route.ts`
- [x] `checkout.webhook.failed` -> `app/api/stripe/webhook/route.ts` + `app/api/paypal/webhook/route.ts`
- [x] `checkout.change_request.created` -> `app/api/stripe/checkout/route.ts` + `app/api/paypal/checkout/route.ts`

## Payments / Orders

- [x] `payments.order.status_changed` -> `lib/payments/checkout-system.ts` -> `recordCheckoutEvent`
- [x] `payments.order.lifecycle.applied` -> `lib/payments/order-subscription-events.ts` -> `runPaymentOrderSubscriptionLifecycle`
- [x] `payments.transaction.recorded` -> `lib/payments/transactions.ts` -> `persistPaymentSettlementTransaction`

## Subscriptions

- [x] `subscriptions.assignment.activated` -> `lib/payments/subscription-assignments.ts` -> `activateSubscriptionAssignment`
- [x] `subscriptions.assignment.suspended` -> `lib/payments/subscription-assignments.ts` -> `suspendSubscriptionAssignment`
- [x] `subscriptions.assignment.canceled` -> `lib/payments/subscription-assignments.ts`
- [x] `subscriptions.change_request.created` -> `lib/payments/subscription-change.ts` -> `createSubscriptionChangeRequest`
- [x] `subscriptions.change_request.applied` -> `scripts/subscription-change-worker.ts`
- [x] `subscriptions.change_request.failed` -> `scripts/subscription-change-worker.ts`

## Email / SMTP

- [x] `email.smtp.before_send` -> `lib/email/smtp.ts` -> `sendSmtpEmail`
- [x] `email.smtp.sent` -> `lib/email/smtp.ts` -> `sendSmtpEmail`
- [x] `email.smtp.failed` -> `lib/email/smtp.ts` -> `sendSmtpEmail`
