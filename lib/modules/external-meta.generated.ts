export type ExternalModuleMetaEntry = {
  moduleId: string;
  mode: 'prebuilt' | 'source-host' | 'source-package';
  entry: string;
  sdkRange: string | null;
  sdkCompatible: boolean | null;
  additionalLocales: string[];
  languagePack: {
    scopes: string[];
  } | null;
  templatePack: {
    defaultEntryPath?: string;
    overrideEntryPath?: string;
    contractRange?: string;
  } | null;
  db: {
    schemaVersion: number;
    migrationsDir?: string;
    schemaEntry?: string;
    seedEntry?: string;
  } | null;
};

export const EXTERNAL_MODULE_META: ExternalModuleMetaEntry[] = [
  { moduleId: "mod.contact", mode: "source-host", entry: "@/modules/mod.contact/src/manifest", sdkRange: "^1.9.0", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: {"schemaVersion":1,"migrationsDir":"modules/mod.contact/db/migrations"} },
  { moduleId: "mod.example.admin", mode: "source-host", entry: "@/modules/mod.example.admin/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.api", mode: "source-host", entry: "@/modules/mod.example.api/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.dashboard", mode: "source-host", entry: "@/modules/mod.example.dashboard/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.package", mode: "source-package", entry: "@/modules/mod.example.package/dist/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: {"defaultEntryPath":"modules/mod.example.package/dist/templates/defaults.json","overrideEntryPath":"modules/mod.example.package/dist/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.package/db/migrations"} },
  { moduleId: "mod.example.portal", mode: "source-host", entry: "@/modules/mod.example.portal/src/manifest", sdkRange: "^1.7.1", sdkCompatible: true, additionalLocales: [], languagePack: null, templatePack: null, db: null },
  { moduleId: "mod.example.suite", mode: "source-host", entry: "@/modules/mod.example.suite/src/manifest", sdkRange: "^1.9.0", sdkCompatible: true, additionalLocales: [], languagePack: {"scopes":["shared-flat","module-flat"]}, templatePack: {"defaultEntryPath":"modules/mod.example.suite/src/templates/defaults.json","overrideEntryPath":"modules/mod.example.suite/src/templates/overrides.json","contractRange":"^1.0.0"}, db: {"schemaVersion":1,"migrationsDir":"modules/mod.example.suite/db/migrations"} }
];
