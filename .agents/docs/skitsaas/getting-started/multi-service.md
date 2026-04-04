---
title: "Multi-Service Deployment"
sidebar_position: 0
---

# Multi-Service Deployment

Use this page when the platform should be split across multiple services or
hosts instead of one Next.js deployment.

## When To Split

Common reasons to split services:

- admin must live on a private network or separate host
- API needs different scaling characteristics
- frontend needs a different deployment model than admin/dashboard
- compliance or isolation requirements demand separate hosts

If none of those are true yet, stay with the simple deployment first.

## Common Split Shapes

### App + Admin

Typical layout:

- app host for dashboard and frontend
- admin host for `/admin`

### App + Admin + API

Typical layout:

- app host for dashboard and frontend
- admin host for `/admin`
- API host for module/core API traffic

## Area Base Model

Route factories read their base from env-backed area configuration.

Important envs:

- `NEXT_PUBLIC_ROUTE_BASE_ADMIN`
- `NEXT_PUBLIC_ROUTE_BASE_DASHBOARD`
- `NEXT_PUBLIC_ROUTE_BASE_FRONTEND`
- `NEXT_PUBLIC_ROUTE_BASE_API`

Important rule:

- the configured value fully replaces the default base

That means the same code can target:

- same-host path prefixes
- dedicated subdomains
- separate origins

## Surface Mode

Use `APP_SURFACE_MODE` to limit what one deployment serves.

Current values:

- `full`
- `dashboard-only`
- `admin-only`

Typical usage:

- app host:
  `dashboard-only`
- admin host:
  `admin-only`

## Shared Cross-Service Requirements

Across split services, keep these aligned:

- PostgreSQL database
- `AUTH_SECRET`
- intended route-base env values

Those values are part of the shared runtime contract, not service-local trivia.

## API And CORS

When API traffic moves to a different origin, configure:

- `NEXT_PUBLIC_ROUTE_BASE_API`
- `ROUTE_API_CORS_ORIGINS`

Practical rule:

- if the browser will `fetch()` the API cross-origin, think about CORS at the
  same time as route base configuration

## Teams Toggle

If the product does not use teams:

```bash
TEAMS_ENABLED=false
```

That changes how you reason about:

- `/api/team`
- dashboard organization flows
- multi-organization UI

## Good Deployment Review Questions

When planning a split deployment, verify:

1. which surfaces each service should expose
2. which route-base envs each service must know
3. whether API CORS is needed
4. whether teams are enabled
5. whether login flows still resolve to the correct host and area

## Related Docs

- `./simple-saas.md`
- `../reference/env-and-runtime-config.md`
- `../routing-and-route-factories.md`
- `../proxies-and-api-security.md`
