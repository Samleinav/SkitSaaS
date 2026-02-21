# Next.js S-Kit Saas

This is a starter template for building a SaaS application using **Next.js** with support for authentication, Stripe + PayPal integrations for payments, and a dashboard for logged-in users.

**Demo: [https://saas-starter-topaz-nine.vercel.app/](https://saas-starter-topaz-nine.vercel.app/)**

## Features

- Marketing landing page (`/`) with animated Terminal element
- Pricing page (`/pricing`) with Stripe Checkout and PayPal subscriptions
- Dashboard pages with CRUD operations on users/teams
- Admin area (`/admin`) with a modular dashboard plus users, subscriptions, billing, payments, orders, and app config
- Basic RBAC with Owner and Member roles
- Subscription management via subscription assignments + lifecycle projection
- SMTP email notifications with delivery logging
- Email/password authentication with JWTs stored to cookies
- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas
- Activity logging system for any user events
- Module runtime with dispatcher routes for admin/dashboard/api
- Theme runtime with global policy + per-user overrides

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) v16.1.6
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/) + [PayPal](https://paypal.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
git clone https://github.com/Samleinav/s-kit-saas.git
cd s-kit-saas
pnpm install
```

## Running Locally

Use the included setup script to create your `.env` file:

```bash
pnpm db:setup
```

During setup, you can choose whether to configure Stripe and/or PayPal now, or skip either one.

Run the database migrations and seed the database with a default user and team:

```bash
pnpm db:migrate
pnpm db:seed
```

This will create the following user and team:

- User: `test@test.com`
- Password: `admin123`

The seeded user has role `owner`, so it can access `/admin`.

You can also create new users through the `/sign-up` route.

Finally, run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

## Admin Dashboard Modules

- `/admin` now renders a modular admin dashboard.
- Module components live in `app/(dashboard)/admin/admin-dashboard/modules.tsx`.
- Default visibility is controlled in `app/(dashboard)/admin/admin-dashboard/config.ts`.
- Optional env override: `ADMIN_DASHBOARD_ENABLED_MODULES=overview,quickLinks,recentActivity`.

## Canary Evidence (Ops)

![Canary Evidence](https://github.com/Samleinav/s-kit-saas/actions/workflows/canary-evidence.yml/badge.svg)

- Scheduled canary evidence pack runs via GitHub Actions.
- Latest artifacts live under the `Canary Evidence` workflow.
- Runbook: `docs/operations/ops-canary-pack.md`.

## Technical Documentation

- Platform capabilities overview: `docs/core/platform-capabilities.md`
- Routing and actions architecture: `docs/core/architecture-routing-actions.md`
- Database model overview: `docs/core/database-model.md`
- Environment variables: `docs/core/env-variables.md`
- Module development (full series): `docs/modules/*`

## Quality Gate

- Local quality gate: `pnpm check`
- Includes: `pnpm lint`, `pnpm typecheck`, and `pnpm test`
- CI workflow: `.github/workflows/ci.yml` on `push`/`pull_request`
- For protected branches, require the GitHub status check `CI / check` before merge.

If Stripe is enabled, you can listen for Stripe webhooks locally through their CLI to handle subscription change events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

If PayPal is enabled, configure a webhook in your PayPal app that points to:

- `http://localhost:3000/api/paypal/webhook` for local testing
- `https://yourdomain.com/api/paypal/webhook` in production

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

For PayPal testing, use PayPal sandbox buyer/seller accounts from the PayPal developer dashboard.

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up production webhooks

#### Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

#### PayPal webhook

1. In PayPal developer dashboard, open your app and add a webhook.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/paypal/webhook`).
3. Copy the webhook ID and set it as `PAYPAL_WEBHOOK_ID`.

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.
4. This template includes a `vercel.json` build command that runs `pnpm db:migrate` automatically on **production** deployments before `next build` (no automatic seed in production).

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables.

1. `BASE_URL`: Set this to your production domain.
2. `POSTGRES_URL`: Set this to your production database URL.
3. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.
4. `APP_SURFACE_MODE` (optional): `full`, `dashboard-only`, or `admin-only` depending on the deployment surface.
5. `STRIPE_ENABLED` (optional): Toggle Stripe checkout on/off (leave empty to use DB config).
6. `STRIPE_SECRET_KEY` (optional): Set this only if Stripe payments are enabled.
7. `STRIPE_WEBHOOK_SECRET` (optional): Set this only if Stripe webhooks are enabled.
8. `PAYPAL_ENABLED` (optional): Toggle PayPal checkout on/off (leave empty to use DB config).
9. `PAYPAL_ENVIRONMENT` (optional): `sandbox` or `production` if PayPal is enabled.
10. `PAYPAL_CLIENT_ID` (optional): Required if PayPal is enabled.
11. `PAYPAL_CLIENT_SECRET` (optional): Required if PayPal is enabled.
12. `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (optional): Usually the same value as `PAYPAL_CLIENT_ID`.
13. `PAYPAL_WEBHOOK_ID` (optional): Needed to verify PayPal webhook signatures.
14. `PAYPAL_CURRENCY` (optional): Defaults to `USD`.
15. PayPal plan ids are created dynamically from subscription templates during checkout (no static plan env vars required).
16. You can also configure payment keys in `/admin/app-config/payments-methods`; env values always have priority over DB fallback values.
17. `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO_EMAIL` (optional): External SMTP delivery config. You can manage these in `/admin/app-config/email` and review delivery logs in `/admin/logs?tab=email`.
18. `ADMIN_DASHBOARD_ENABLED_MODULES` (optional): Comma-separated admin modules to show at `/admin`.
19. `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_TEAM_NAME` (optional): Seed controls for manual bootstrap.
20. `ALLOW_PRODUCTION_SEED` (optional): Must be `true` to allow `pnpm db:seed` in production-like environments.

### Optional one-time production bootstrap

If you need to create an initial admin user in production, run seed manually as a controlled one-time operation (never with defaults):

```bash
ALLOW_PRODUCTION_SEED=true SEED_USER_EMAIL=admin@yourdomain.com SEED_USER_PASSWORD='<strong-password>' pnpm db:seed
```

Then rotate/remove bootstrap credentials and disable the flag.

### Surface split deployments

You can run separate environments with different route surfaces:

- `APP_SURFACE_MODE=dashboard-only`: dashboard + frontend enabled, admin disabled.
- `APP_SURFACE_MODE=admin-only`: admin enabled, dashboard/frontend disabled.

For stronger isolation, pair this with separate DB roles/credentials and DB-level RLS policies per environment.


