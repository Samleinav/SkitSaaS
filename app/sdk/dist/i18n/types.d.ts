export type ModuleI18nNamespace = `mod.${string}`;
export type ModuleMessageTree = {
    [key: string]: string | ModuleMessageTree;
};
export type ModuleMessagesByLocale = Record<string, Record<ModuleI18nNamespace, ModuleMessageTree>>;
export type ModuleMessagesByArea<Area extends string = string> = Record<Area, ModuleMessagesByLocale>;
