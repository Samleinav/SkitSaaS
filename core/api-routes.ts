import '@/lib/routing/area-setup';
import { RouteApi } from '@skitsaas/sdk';

/**
 * Core host API route metadata.
 *
 * Edge-safe: metadata only — no DB access, no handler imports allowed here.
 * This file is imported from both core/routes.ts (edge context) and bridge files (Node.js).
 *
 * Handler attachment happens in each app/api/*\/route.ts bridge file via .handler(fn).
 * Only add an entry here when the corresponding bridge file is also on the dispatcher.
 */
export const CoreApiRoutes = {
  // ─── User / Team ───────────────────────────────────────────────────────────
  user: {
    get: RouteApi('/user').GET().auth('user').name('api.user.get'),
  },
  team: {
    get: RouteApi('/team').GET().auth('user').name('api.team.get'),
  },
  notifications: {
    list: RouteApi('/notifications')
      .GET()
      .auth('user')
      .name('api.notifications.list'),
    read: RouteApi('/notifications/read')
      .POST()
      .auth('user')
      .rateLimit({ limit: 60, windowSeconds: 60 })
      .name('api.notifications.read'),
    dismiss: RouteApi('/notifications/dismiss')
      .POST()
      .auth('user')
      .rateLimit({ limit: 60, windowSeconds: 60 })
      .name('api.notifications.dismiss'),
  },

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    /** Clears the session cookie. No auth required — works for expired sessions too. */
    signOut: RouteApi('/auth/sign-out').POST().name('api.auth.sign-out'),
    /** Lists enabled auth provider configurations. Admin only. */
    providers: RouteApi('/auth/providers').GET().auth('admin').name('api.auth.providers'),
  },

  // ─── Forms ─────────────────────────────────────────────────────────────────
  forms: {
    /**
     * BuildForm preflight / validation endpoint.
     * Auth is conditional on the form's access scope.
     * Apply proxyBuildFormValidateAccess as preDispatch in the bridge file.
     */
    validate: RouteApi('/forms/validate').POST()
      .rateLimit({ limit: 30, windowSeconds: 60 })
      .name('api.forms.validate'),
  },

  // ─── Search ────────────────────────────────────────────────────────────────
  search: {
    query: RouteApi('/search')
      .GET()
      .rateLimit({ limit: 60, windowSeconds: 60 })
      .name('api.search.query'),
  },

  // ─── Checkout ──────────────────────────────────────────────────────────────
  checkout: {
    /**
     * Session auth is conditional here:
     * - authenticated self-service calls are allowed
     * - guest access is allowed only for live signup-intent checkout tokens
     */
    methods: RouteApi('/checkout/methods')
      .GET()
      .rateLimit({ limit: 30, windowSeconds: 60 })
      .name('api.checkout.methods'),
    /**
     * Session auth is conditional here:
     * - authenticated self-service calls are allowed
     * - guest access is allowed only for live signup-intent checkout tokens
     */
    pay: RouteApi('/checkout/{checkoutToken}/pay/{paymentMethodId}')
      .POST()
      .rateLimit({ limit: 5, windowSeconds: 60 })
      .name('api.checkout.pay'),
    /** cancel.get / cancel.post — auth is conditional on payment method owner type */
    cancel: {
      get: RouteApi('/checkout/methods/{paymentMethodId}/cancel').GET()
        .rateLimit({ limit: 30, windowSeconds: 60 })
        .name('api.checkout.cancel.get'),
      post: RouteApi('/checkout/methods/{paymentMethodId}/cancel').POST()
        .rateLimit({ limit: 30, windowSeconds: 60 })
        .name('api.checkout.cancel.post'),
    },
    /** return.get / return.post — no session auth (payment gateway redirect) */
    return: {
      get: RouteApi('/checkout/methods/{paymentMethodId}/return').GET()
        .rateLimit({ limit: 30, windowSeconds: 60 })
        .name('api.checkout.return.get'),
      post: RouteApi('/checkout/methods/{paymentMethodId}/return').POST()
        .rateLimit({ limit: 30, windowSeconds: 60 })
        .name('api.checkout.return.post'),
    },
    /** webhook — no session auth; signature verification in handler */
    webhook: RouteApi('/checkout/methods/{paymentMethodId}/webhook').POST()
      .rateLimit({ limit: 100, windowSeconds: 60 })
      .name('api.checkout.webhook'),
  },

  // ─── Stripe (legacy compatibility) ─────────────────────────────────────────
  stripe: {
    /** Legacy Stripe checkout return — rate-limited, no session auth */
    checkout: RouteApi('/stripe/checkout').GET()
      .rateLimit({ limit: 20, windowSeconds: 60 })
      .name('api.stripe.checkout'),
    /** Stripe webhook — rate-limited, signature verification in handler */
    webhook: RouteApi('/stripe/webhook').POST()
      .rateLimit({ limit: 200, windowSeconds: 60 })
      .name('api.stripe.webhook'),
  },

  // ─── PayPal (legacy compatibility) ─────────────────────────────────────────
  paypal: {
    plan: RouteApi('/paypal/plan').POST().auth('user').name('api.paypal.plan'),
    /**
     * Legacy return wrapper. Kept sessionless so guest signup-intent browser
     * returns can still converge through the compatibility path.
     */
    checkout: RouteApi('/paypal/checkout')
      .POST()
      .rateLimit({ limit: 30, windowSeconds: 60 })
      .name('api.paypal.checkout'),
    cancel: RouteApi('/paypal/checkout/cancel').POST().auth('user').name('api.paypal.cancel'),
    /** webhook — no session auth; signature verification in handler */
    webhook: RouteApi('/paypal/webhook').POST()
      .rateLimit({ limit: 200, windowSeconds: 60 })
      .name('api.paypal.webhook'),
  },

  // ─── Sfiles ────────────────────────────────────────────────────────────────
  sfiles: {
    list: RouteApi('/sfiles').GET().auth('user').name('api.sfiles.list'),
    upload: RouteApi('/sfiles').POST().auth('user').name('api.sfiles.upload'),
    search: RouteApi('/sfiles/search').GET().auth('user').name('api.sfiles.search'),
    get: RouteApi('/sfiles/{id}').GET().auth('user').name('api.sfiles.get'),
    delete: RouteApi('/sfiles/{id}').DELETE().auth('user').name('api.sfiles.delete'),
    update: RouteApi('/sfiles/{id}').PATCH().auth('user').name('api.sfiles.update'),
    url: RouteApi('/sfiles/{id}/url').GET().auth('user').name('api.sfiles.url'),
    permissions: RouteApi('/sfiles/{id}/permissions').GET().auth('user').name('api.sfiles.permissions'),
    setPermissions: RouteApi('/sfiles/{id}/permissions').PUT().auth('user').name('api.sfiles.setPermissions'),
    zip: RouteApi('/sfiles/zip').POST().auth('user').name('api.sfiles.zip'),
  },
} as const;
