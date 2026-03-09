export type ModuleI18nNamespace = `mod.${string}`;
export type ModuleMessageTree = {
    [key: string]: string | ModuleMessageTree;
};
export type FlatTranslationsByLocale = Record<string, Record<string, string>>;
export type FlatTranslationConflict = {
    key: string;
    firstValue: string;
    secondValue: string;
    firstPath: string;
    secondPath: string;
};
export type Translator = (key: string) => string;
export type ModuleMessagesByLocale = Record<string, Record<ModuleI18nNamespace, ModuleMessageTree>>;
export type ModuleMessagesByArea<Area extends string = string> = Record<Area, ModuleMessagesByLocale>;
