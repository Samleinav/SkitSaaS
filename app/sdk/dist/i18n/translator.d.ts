import type { FlatTranslationsByLocale, Translator } from './types.js';
export type CreateTranslatorOptions = {
    translationsByLocale?: FlatTranslationsByLocale;
    defaultLocale?: string;
};
export declare function createTranslator(locale: string, options?: CreateTranslatorOptions): Translator;
