---
title: Module Configuration
sidebar_position: 5
---

# Module Configuration

Module configuration should live in `app_configs` with namespace:

```
module.<moduleId>.*
```

Examples:

- `module.mod.analytics.enabled`
- `module.mod.analytics.sample_rate`

## Read config

Use `getAppConfigValueFromDb` from `lib/config/app-config.ts`:

```ts
import { getAppConfigValueFromDb } from '@/lib/config/app-config';

const enabled =
  (await getAppConfigValueFromDb('module.mod.analytics', 'enabled')) === 'true';
```

## Write config

Use `upsertAppConfigValue` from `lib/config/app-config-writes.ts`:

```ts
import { upsertAppConfigValue } from '@/lib/config/app-config-writes';

await upsertAppConfigValue({
  namespace: 'module.mod.analytics',
  configKey: 'sample_rate',
  configValue: '0.25'
});
```

## Validation

Store values as strings. Validate and normalize in the module code. For structured config:

- use JSON in `config_value`
- parse and validate with `zod`
