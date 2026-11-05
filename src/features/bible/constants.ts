export const DEFAULT_TRANSLATION = "lsg";
export const BIBLE_LANGUAGE = "fr";

/** Chapitre d'accueil d'un nouveau lecteur (docs/bible/BIBLE-READER-UX.md). */
export const DEFAULT_BOOK_SLUG = "jean";

export const HIGHLIGHT_COLORS = ["YELLOW", "GREEN", "BLUE", "PINK", "PURPLE"] as const;

export const NOTE_MAX_LENGTH = 5_000;
export const REFLECTION_MAX_LENGTH = 200;
export const SEARCH_QUERY_MAX_LENGTH = 200;
export const SEARCH_PAGE_SIZE = 20;
export const ANNOTATIONS_PAGE_SIZE = 20;

/** Une sélection au-delà de ce nombre de plages n'a pas d'usage réel et alourdirait la transaction. */
export const MAX_SELECTION_RANGES = 20;
export const MAX_VERSE_NUMBER = 200;
export const MAX_CHAPTER_NUMBER = 150;

export const READER_FONT_SIZES = [16, 18, 19, 20, 22, 24, 26, 28] as const;
export const READER_LINE_HEIGHTS = [1.5, 1.7, 1.9] as const;
export const READER_THEMES = ["SYSTEM", "LIGHT", "SEPIA", "DARK"] as const;
export const READER_FONTS = ["SERIF", "SANS"] as const;

export const READER_STORAGE_KEY = "eparole-reader-prefs";
export const READER_SHORTCUTS_KEY = "eparole-reader-shortcuts";

/** Emplacement de la barre d'actions, juste après le texte : l'ordre de tabulation suit ainsi la lecture. */
export const ACTIONS_SLOT_ID = "reader-actions";

export const DAILY_VERSE_MAX_DAYS_AHEAD = 90;
export const DAILY_VERSE_DUPLICATE_WINDOW_DAYS = 30;
export const DAILY_VERSE_TAG = "daily-verse";

export const bibleTag = (translationCode: string): string => `bible:${translationCode}`;
