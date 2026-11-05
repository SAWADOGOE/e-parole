const ACTIVE_VERSE = '#verses [tabindex="0"]';
const MAIN_CONTENT = "#contenu";

function focusSelector(selector: string): boolean {
  const element = document.querySelector<HTMLElement>(selector);
  element?.focus();
  return element !== null;
}

/** Rend le focus au verset actif, à défaut au contenu principal : il ne doit jamais retomber sur <body> (WCAG 2.4.3). */
export function focusFallback(): void {
  if (!focusSelector(ACTIVE_VERSE)) focusSelector(MAIN_CONTENT);
}

/** Rend le focus à l'élément d'origine s'il existe encore et reste utilisable. */
export function restoreFocus(target: Element | null): void {
  if (target instanceof HTMLElement && target.isConnected && !target.matches(":disabled") && target !== document.body) target.focus();
  else focusFallback();
}
