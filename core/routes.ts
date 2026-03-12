/**
 * Central route registry for all core routes.
 *
 * The first import (area-setup) must run before any RouteAdmin/RouteDashboard
 * calls so the area-level proxy defaults are configured.
 *
 * WHAT TO REGISTER HERE:
 * - Section root routes (always)
 * - Routes linked from multiple places (worth a named constant)
 * - Routes that need per-route proxy extras via .proxy([...])
 *
 * SKIP registering:
 * - Parameterized sub-routes only used inline (e.g. build the URL where you need it:
 *   RouteAdmin('/subscriptions/user/{userId}/edit').with({ userId: 7 }))
 * - Module routes → go in modules/[mod]/src/routes.ts
 *
 * Usage:
 *   import { Routes } from '@/core/routes'
 *   <Link href={Routes.admin.users} />
 *   Routes.admin.orders.with({ orderId: 5 }) + '/edit'  // "/admin/orders/5/edit"
 *
 *   import { route } from '@skitsaas/sdk'
 *   route('admin.users')  // "/admin/users"
 */
import '@/lib/routing/area-setup'; // must be first — configures proxyAdmin/proxyAuth defaults
import {
  RouteAdmin,
  RouteArea,
  RouteDashboard,
  RouteFrontend,
  getAreaBases
} from '@skitsaas/sdk';
import { CoreApiRoutes } from './api-routes';

const RouteAdminPublic = (path: string) => RouteArea(getAreaBases().admin, [])(path);

export const Routes = {
  admin: {
    home:    RouteAdmin('/').name('admin.home'),
    // Admin auth pages must stay publicly reachable to avoid proxy redirect loops.
    login:   RouteAdminPublic('/login').name('admin.login'),
    account: RouteAdmin('/account').name('admin.account'),

    // App config section
    appConfig: {
      home:           RouteAdmin('/app-config').name('admin.app-config'),
      general:        RouteAdmin('/app-config/general').name('admin.app-config.general'),
      email:          RouteAdmin('/app-config/email').name('admin.app-config.email'),
      theme:          RouteAdmin('/app-config/theme').name('admin.app-config.theme'),
      paymentMethods: RouteAdmin('/app-config/payments-methods').name('admin.app-config.payment-methods'),
    },

    billing: RouteAdmin('/billing').name('admin.billing'),
    logs:    RouteAdmin('/logs').name('admin.logs'),
    modules: RouteAdmin('/modules').name('admin.modules'),
    payments: RouteAdmin('/payments').name('admin.payments'),

    // Users
    users: RouteAdmin('/users').name('admin.users'),

    // Subscription assignments and template management
    subscriptions: {
      home:     RouteAdmin('/subscriptions').name('admin.subscriptions'),
      orgEdit:  RouteAdmin('/subscriptions/organization/{teamId}/edit').name('admin.subscriptions.organization.edit'),
      userEdit: RouteAdmin('/subscriptions/user/{userId}/edit').name('admin.subscriptions.user.edit'),
      templates: {
        home:   RouteAdmin('/subscriptions/templates').name('admin.subscriptions.templates'),
        create: RouteAdmin('/subscriptions/templates/create').name('admin.subscriptions.templates.create'),
        edit:   RouteAdmin('/subscriptions/templates/{templateId}/edit').name('admin.subscriptions.templates.edit'),
      },
    },

    // Legacy misspelled subscription routes kept only for redirects/backwards compatibility.
    legacySuscriptions: {
      home:     RouteAdmin('/suscriptions').name('admin.suscriptions.legacy'),
      orgEdit:  RouteAdmin('/suscriptions/organization/{teamId}/edit').name('admin.suscriptions.legacy.organization.edit'),
      userEdit: RouteAdmin('/suscriptions/user/{userId}/edit').name('admin.suscriptions.legacy.user.edit'),
    },

    // Orders
    orders: {
      home:   RouteAdmin('/orders').name('admin.orders'),
      create: RouteAdmin('/orders/create').name('admin.orders.create'),
      edit:   RouteAdmin('/orders/{orderId}/edit').name('admin.orders.edit'),
    },
  },

  dashboard: {
    home:          RouteDashboard('/').name('dashboard.home'),
    general:       RouteDashboard('/general').name('dashboard.general'),
    activity:      RouteDashboard('/activity').name('dashboard.activity'),
    security:      RouteDashboard('/security').name('dashboard.security'),
    subscriptions: RouteDashboard('/subscriptions').name('dashboard.subscriptions'),
    modules:       RouteDashboard('/modules').name('dashboard.modules'),
  },

  frontend: {
    home:      RouteFrontend('/').name('frontend.home'),
    pricing:   RouteFrontend('/pricing').name('frontend.pricing'),
    checkout:  RouteFrontend('/checkout').name('frontend.checkout'),
    login:     RouteFrontend('/login').name('frontend.login'),
    signIn:    RouteFrontend('/sign-in').name('frontend.sign-in'),
    signUp:    RouteFrontend('/sign-up').name('frontend.sign-up'),
    contactUs: RouteFrontend('/contact-us').name('frontend.contact-us'),
  },

  api: CoreApiRoutes,
} as const;
