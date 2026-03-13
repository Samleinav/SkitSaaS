import type { ModuleManifest } from './manifest';
import mod_mod_commerce_one_time_payments from '@/modules/mod.commerce.one-time-payments/src/manifest';
import mod_mod_commerce_products from '@/modules/mod.commerce.products/src/manifest';
import mod_mod_example_admin from '@/modules/mod.example.admin/src/manifest';
import mod_mod_example_api from '@/modules/mod.example.api/src/manifest';
import mod_mod_example_dashboard from '@/modules/mod.example.dashboard/src/manifest';
import mod_mod_example_package from '@/modules/mod.example.package/dist/manifest';
import mod_mod_example_portal from '@/modules/mod.example.portal/src/manifest';
import mod_mod_example_suite from '@/modules/mod.example.suite/src/manifest';

export const EXTERNAL_MODULES: ModuleManifest[] = [
  mod_mod_commerce_one_time_payments, mod_mod_commerce_products, mod_mod_example_admin, mod_mod_example_api, mod_mod_example_dashboard, mod_mod_example_package, mod_mod_example_portal, mod_mod_example_suite
];

export const EXTERNAL_MODULE_META = [
  { moduleId: "mod.commerce.one-time-payments", mode: "source-host", entry: "@/modules/mod.commerce.one-time-payments/src/manifest", sdkRange: "^1.3.5", sdkCompatible: true, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.commerce.one-time-payments/db/migrations"} },
  { moduleId: "mod.commerce.products", mode: "source-host", entry: "@/modules/mod.commerce.products/src/manifest", sdkRange: "^1.1.3", sdkCompatible: true, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.commerce.products/db/migrations"} },
  { moduleId: "mod.example.admin", mode: "source-host", entry: "@/modules/mod.example.admin/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, templatePack: null, db: null },
  { moduleId: "mod.example.api", mode: "source-host", entry: "@/modules/mod.example.api/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, templatePack: null, db: null },
  { moduleId: "mod.example.dashboard", mode: "source-host", entry: "@/modules/mod.example.dashboard/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, templatePack: null, db: null },
  { moduleId: "mod.example.package", mode: "source-package", entry: "@/modules/mod.example.package/dist/manifest", sdkRange: "^1.7.1", sdkCompatible: true, templatePack: {"defaultEntryPath":"modules/mod.example.package/dist/templates/defaults.json","overrideEntryPath":"modules/mod.example.package/dist/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.package/db/migrations"} },
  { moduleId: "mod.example.portal", mode: "source-host", entry: "@/modules/mod.example.portal/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, templatePack: null, db: null },
  { moduleId: "mod.example.suite", mode: "source-host", entry: "@/modules/mod.example.suite/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, templatePack: {"defaultEntryPath":"modules/mod.example.suite/src/templates/defaults.json","overrideEntryPath":"modules/mod.example.suite/src/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.suite/db/migrations"} }
];
