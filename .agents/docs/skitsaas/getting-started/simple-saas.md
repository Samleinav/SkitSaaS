---
title: "Simple SaaS"
sidebar_position: 0
---

# Simple SaaS

Use this page when the goal is to get one SkitSaaS deployment running locally
or in a simple production shape.

## Runtime Shape

In the simple deployment model, these surfaces all live in one app:

- admin
- dashboard
- frontend
- API

That makes it the easiest path for local development and for many early-stage
deployments.

## Prerequisites

- Node.js 20+
- `pnpm`
- PostgreSQL 15+

## Install Dependencies

```bash
pnpm install
```

## Configure Environment

Start from the example file:

```bash
cp .env.example .env
```

Minimum required values:

```bash
POSTGRES_URL=postgresql://user:password@localhost:5432/mydb
AUTH_SECRET=your-random-secret
BASE_URL=http://localhost:3000
```

If the product should run without teams or organizations:

```bash
TEAMS_ENABLED=false
```

## Set Up The Database

Normal baseline:

```bash
pnpm db:migrate
pnpm db:seed
```

Useful seed defaults:

- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`
- `SEED_TEAM_NAME`

Practical rule:

- in production-like environments, do not rely on default seed credentials

## Start The App

```bash
pnpm dev
```

Important note:

- `predev` runs generated-artifact preparation plus module migration/sync work

Current `predev` flow includes:

- generated artifact preparation
- `modules:migrate`
- `modules:sync`

## First Login

Main login surfaces:

- `/admin/login`
- `/login`

Admin area is for operators and backoffice runtime control.

Dashboard area is for normal product users and private feature surfaces.

## First Admin Tasks

Useful first configuration surfaces:

- `/admin/app-config`
- `/admin/app-config/payments-methods`
- `/admin/app-config/email`
- `/admin/modules`

## Local Build Sanity

Useful commands after the app boots:

```bash
pnpm typecheck
pnpm build
```

If you are validating docs, runtime metadata, or generated artifacts, also
consider:

```bash
pnpm modules:prepare
pnpm themes:prepare
pnpm i18n:prepare
```

## Production Baseline

Before going live, verify:

- `AUTH_SECRET` is strong
- `BASE_URL` matches the deployed domain
- seed credentials are not default
- SMTP is configured if email matters
- payment providers are configured if billing matters

## Related Docs

- `./multi-service.md`
- `../reference/env-and-runtime-config.md`
- `../reference/platform-capabilities.md`
