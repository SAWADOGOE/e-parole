export const THEME_STORAGE_KEY = "eparole-theme";
export const THEMES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEMES)[number];
