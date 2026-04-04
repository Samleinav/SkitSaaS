import type { ModuleManifest } from './manifest';
import mod_mod_contact from '@/modules/mod.contact/src/manifest';
import mod_mod_example_admin from '@/modules/mod.example.admin/src/manifest';
import mod_mod_example_api from '@/modules/mod.example.api/src/manifest';
import mod_mod_example_dashboard from '@/modules/mod.example.dashboard/src/manifest';
import mod_mod_example_package from '@/modules/mod.example.package/dist/manifest';
import mod_mod_example_portal from '@/modules/mod.example.portal/src/manifest';
import mod_mod_example_suite from '@/modules/mod.example.suite/src/manifest';

export const EXTERNAL_MODULES: ModuleManifest[] = [
  mod_mod_contact, mod_mod_example_admin, mod_mod_example_api, mod_mod_example_dashboard, mod_mod_example_package, mod_mod_example_portal, mod_mod_example_suite
];

export const EXTERNAL_MODULE_META = [
  { moduleId: "mod.contact", mode: "source-host", entry: "@/modules/mod.contact/src/manifest", sdkRange: "^1.9.0", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.contact/db/migrations"} },
  { moduleId: "mod.example.admin", mode: "source-host", entry: "@/modules/mod.example.admin/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.api", mode: "source-host", entry: "@/modules/mod.example.api/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.dashboard", mode: "source-host", entry: "@/modules/mod.example.dashboard/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.package", mode: "source-package", entry: "@/modules/mod.example.package/dist/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: {"defaultEntryPath":"modules/mod.example.package/dist/templates/defaults.json","overrideEntryPath":"modules/mod.example.package/dist/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.package/db/migrations"} },
  { moduleId: "mod.example.portal", mode: "source-host", entry: "@/modules/mod.example.portal/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.suite", mode: "source-host", entry: "@/modules/mod.example.suite/src/manifest", sdkRange: "^1.9.0", sdkCompatible: true, additionalLocales: [], languagePack: {"scopes":["shared-flat","module-flat"]}, templatePack: {"defaultEntryPath":"modules/mod.example.suite/src/templates/defaults.json","overrideEntryPath":"modules/mod.example.suite/src/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.suite/db/migrations"} }
];
