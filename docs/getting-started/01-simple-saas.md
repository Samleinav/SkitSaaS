---
title: "First Steps: Simple SaaS"
sidebar_position: 1
description: Get a single Next.js SaaS app running locally and in production — from clone to first login.
---

# First Steps: Simple SaaS

This guide gets you from zero to a working SaaS app on a single Next.js deployment. Everything — admin, dashboard, frontend, and API — runs from one server.

> **Multi-service deployment?** See [First Steps: Multi-Service](./02-multi-service.md) if you plan to split admin, API, or frontend into separate services from day one.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | |
| pnpm | 9+ | `npm i -g pnpm` |
| PostgreSQL | 15+ | Local or hosted (Supabase, Neon, Railway, etc.) |

---

## 1. Install dependencies

```bash
pnpm install
```

---

## 2. Configure environment

Copy the example file and fill in the required values:

```bash
cp .env.example .env
```

Minimum required variables:

```bash
# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/mydb

# Session secret — generate with: openssl rand -base64 32
AUTH_SECRET=your-random-secret-here

# Public base URL (no trailing slash)
BASE_URL=http://localhost:3000
```

Leave everything else at its default for local development. Payments, SMTP, and optional features can be configured later via the admin panel (`/admin/app-config`).

If your product does not use teams / organizations, add:

```bash
TEAMS_ENABLED=false
```

That keeps dashboard users in standalone mode, disables `/api/team`, and makes seed/sign-up skip the default team bootstrap.

---

## 3. Set up the database

Run migrations and seed the initial admin user:

```bash
pnpm db:migrate
pnpm db:seed
```

Seed defaults (override via `.env` if needed):

| Variable | Default |
|----------|---------|
| `SEED_USER_EMAIL` | `test@admin.com` |
| `SEED_USER_PASSWORD` | `admin123` |
| `SEED_TEAM_NAME` | `Test Team` |

> **Production warning**: the seed script rejects default credentials in production-like environments. Set strong values in `.env` before deploying.

---

## 4. Start the dev server

```bash
pnpm dev
```

The `predev` script runs automatically: it builds modules, prepares themes, runs module migrations, and syncs module state with the DB.

Open [http://localhost:3000](http://localhost:3000).

---

## 5. First login

Two separate login surfaces are available:

### Admin area

URL: `/admin/login`

Log in with the seed credentials (`test@admin.com` / `admin123`). This area is for platform operators:

- Manage users, teams, and subscriptions
- Configure payments, email (SMTP), and feature flags
- Enable/disable modules
- View activity logs

### Dashboard (user area)

URL: `/login` or `/sign-in`

The same seed credentials also work here for local testing. This area is for end-users of your SaaS product:

- Team and account management
- Subscription and billing self-service
- Module-provided features

Note: when `TEAMS_ENABLED=true`, the seeded admin user is also attached to the bootstrap team as membership role `owner`. If the dashboard UI shows `Owner`, that is the team role; access to `/admin` still comes from the global user role `admin`.

---

## 6. Configure your product

From the admin panel:

1. **`/admin/app-config`** — set your product name, logo, and general settings.
2. **`/admin/app-config/payments-methods`** — enable Stripe or PayPal if your product has paid plans.
3. **`/admin/app-config/email`** — configure SMTP for transactional emails.
4. **`/admin/modules`** — enable/disable modules and see their status.

---

## 7. Add your first module

Modules are the primary extension point. A module can add:

- Pages in the admin, dashboard, or frontend areas
- Typed API routes
- Nav items, widgets, events, and more

See [Module Runtime Overview](../modules/00-overview.md) and the [SDK Overview](../sdk/00-overview.md) to understand the host module surface.

---

## Production checklist

Before going live:

- [ ] Replace `AUTH_SECRET` with a strong random value (`openssl rand -base64 32`)
- [ ] Set `BASE_URL` to your production domain
- [ ] Change seed credentials (`SEED_USER_EMAIL`, `SEED_USER_PASSWORD`) before running `db:seed`
- [ ] Set `NODE_ENV=production` (or use `APP_ENV=production`)
- [ ] Configure SMTP for email delivery
- [ ] Enable and configure a payment provider if applicable
- [ ] Set `APP_SURFACE_MODE` to `dashboard-only` if admin should not be publicly reachable (route it through a private VPN instead)
- [ ] Run `pnpm build` and verify no TypeScript or lint errors

### Build for production

```bash
pnpm db:migrate          # run any pending migrations
pnpm build               # Next.js production build
pnpm start               # start the production server
```

Or use `pnpm build:vercel` for Vercel deployments (handles env detection automatically).
