export type ModuleRuntimeMode = 'db' | 'config' | 'hybrid';

export type ModuleFlags = Record<string, boolean>;

export type AppConfig = {
  projectName: string;
  moduleRuntimeMode: ModuleRuntimeMode;
  modules: ModuleFlags;
};

export type ResolvedAppConfig = {
  projectName: string;
  moduleRuntimeMode: ModuleRuntimeMode;
  modules: ModuleFlags;
};
