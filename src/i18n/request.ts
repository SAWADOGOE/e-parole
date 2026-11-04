import { getRequestConfig } from "next-intl/server";

export const DEFAULT_LOCALE = "fr";

/** Français par défaut, sans préfixe d'URL. L'anglais sera ajouté sous /en (docs/10, i18n). */
export default getRequestConfig(async () => {
  const messages = (await import(`./messages/${DEFAULT_LOCALE}.json`)) as { default: Record<string, unknown> };
  return {
    locale: DEFAULT_LOCALE,
    timeZone: "Africa/Ouagadougou",
    messages: messages.default,
  };
});
