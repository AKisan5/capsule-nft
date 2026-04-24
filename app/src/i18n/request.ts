import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import type { Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }

  const messages =
    locale === 'en'
      ? (await import('../../messages/en.json')).default
      : (await import('../../messages/ja.json')).default;

  return { locale: locale as Locale, messages };
});
