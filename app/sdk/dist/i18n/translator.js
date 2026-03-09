export function createTranslator(locale, options = {}) {
    const { translationsByLocale = Object.create(null), defaultLocale = 'en' } = options;
    const localeTranslations = translationsByLocale[locale] ?? {};
    const defaultTranslations = locale === defaultLocale ? {} : (translationsByLocale[defaultLocale] ?? {});
    return (key) => localeTranslations[key] ?? defaultTranslations[key] ?? key;
}
