export function createTranslator(locale, options = {}) {
    const { translationsByLocale = Object.create(null), defaultLocale = 'en' } = options;
    const localeTranslations = translationsByLocale[locale] ?? {};
    if (locale === defaultLocale) {
        return (key) => key;
    }
    return (key) => localeTranslations[key] ?? key;
}
