import type { ModuleManifest } from './manifest';
import mod_mod_auth_enterprise_sso from '@/modulesprivate/mod.auth.enterprise-sso/src/manifest';
import mod_mod_auth_passkey from '@/modulesprivate/mod.auth.passkey/src/manifest';
import mod_mod_auth_social_logins from '@/modulesprivate/mod.auth.social-logins/src/manifest';
import mod_mod_commerce_one_time_payments from '@/modules/mod.commerce.one-time-payments/src/manifest';
import mod_mod_commerce_products from '@/modules/mod.commerce.products/src/manifest';
import mod_mod_example_admin from '@/modules/mod.example.admin/src/manifest';
import mod_mod_example_api from '@/modules/mod.example.api/src/manifest';
import mod_mod_example_dashboard from '@/modules/mod.example.dashboard/src/manifest';
import mod_mod_example_package from '@/modules/mod.example.package/dist/manifest';
import mod_mod_example_suite from '@/modules/mod.example.suite/src/manifest';

export const EXTERNAL_MODULES: ModuleManifest[] = [
  mod_mod_auth_enterprise_sso, mod_mod_auth_passkey, mod_mod_auth_social_logins, mod_mod_commerce_one_time_payments, mod_mod_commerce_products, mod_mod_example_admin, mod_mod_example_api, mod_mod_example_dashboard, mod_mod_example_package, mod_mod_example_suite
];

export const EXTERNAL_MODULE_META = [
  { moduleId: "mod.auth.enterprise-sso", mode: "source-host", entry: "@/modules/mod.auth.enterprise-sso/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.auth.enterprise-sso/db/migrations"} },
  { moduleId: "mod.auth.passkey", mode: "source-host", entry: "@/modules/mod.auth.passkey/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.auth.passkey/db/migrations"} },
  { moduleId: "mod.auth.social-logins", mode: "source-host", entry: "@/modules/mod.auth.social-logins/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.auth.social-logins/db/migrations"} },
  { moduleId: "mod.commerce.one-time-payments", mode: "source-host", entry: "@/modules/mod.commerce.one-time-payments/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.commerce.one-time-payments/db/migrations"} },
  { moduleId: "mod.commerce.products", mode: "source-host", entry: "@/modules/mod.commerce.products/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.commerce.products/db/migrations"} },
  { moduleId: "mod.example.admin", mode: "source-host", entry: "@/modules/mod.example.admin/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: null },
  { moduleId: "mod.example.api", mode: "source-host", entry: "@/modules/mod.example.api/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: null },
  { moduleId: "mod.example.dashboard", mode: "source-host", entry: "@/modules/mod.example.dashboard/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: null, db: null },
  { moduleId: "mod.example.package", mode: "source-package", entry: "@/modules/mod.example.package/dist/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: {"defaultEntryPath":"modules/mod.example.package/dist/templates/defaults.json","overrideEntryPath":"modules/mod.example.package/dist/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.package/db/migrations"} },
  { moduleId: "mod.example.suite", mode: "source-host", entry: "@/modules/mod.example.suite/src/manifest", sdkRange: "^0.1.0", sdkCompatible: true, templatePack: {"defaultEntryPath":"modules/mod.example.suite/src/templates/defaults.json","overrideEntryPath":"modules/mod.example.suite/src/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.suite/db/migrations"} }
];
