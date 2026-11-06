"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { POST_BODY_MAX } from "../../constants";
import { mentionSuggestionsAction } from "../../server/actions";

interface Suggestion {
  handle: string;
  displayName: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  help: string;
  placeholder: string;
  invalid: boolean;
}

/** Mot en cours de saisie s'il commence par @ (sinon null). */
function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)@([a-z0-9_]{1,30})$/i.exec(text.slice(0, caret));
  return match?.[2] ? { start: caret - match[2].length - 1, query: match[2] } : null;
}

/**
 * Zone de texte avec autocomplétion des @mentions (motif combobox : c'est une vraie liste de choix).
 * Les suggestions respectent le blocage et la découvrabilité côté serveur.
 */
export function MentionTextarea({ value, onChange, label, help, placeholder, invalid }: MentionTextareaProps) {
  const t = useTranslations("composer");
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<{ start: number; query: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => {
      void mentionSuggestionsAction({ query: query.query })
        .then((result) => {
          setSuggestions(result.ok ? result.data : []);
          setActive(0);
        })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const open = query !== null && suggestions.length > 0;

  function pick(suggestion: Suggestion): void {
    if (!query || !ref.current) return;
    const caret = ref.current.selectionStart;
    const next = `${value.slice(0, query.start)}@${suggestion.handle} ${value.slice(caret)}`;
    onChange(next.slice(0, POST_BODY_MAX));
    setQuery(null);
    setSuggestions([]);
    const position = query.start + suggestion.handle.length + 2;
    requestAnimationFrame(() => ref.current?.setSelectionRange(position, position));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current + (event.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      const suggestion = suggestions[active];
      if (suggestion) {
        event.preventDefault();
        pick(suggestion);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setQuery(null);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={`${id}-body`} className="text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        ref={ref}
        id={`${id}-body`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        aria-describedby={`${id}-help ${id}-count`}
        aria-invalid={invalid || undefined}
        value={value}
        maxLength={POST_BODY_MAX}
        rows={6}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery(mentionQuery(event.target.value, event.target.selectionStart));
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        className="min-h-36 rounded-sm border border-border-strong bg-bg-elevated px-3 py-2 text-lg text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <div id={`${id}-list`} role="listbox" aria-label={t("mentionsLabel")} hidden={!open} className="absolute top-full z-10 mt-1 w-full max-w-sm rounded-md border bg-bg-elevated p-1 shadow-sm">
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.handle}
            id={`${id}-option-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={index === active}
            onMouseDown={(event) => {
              event.preventDefault();
              pick(suggestion);
            }}
            className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-sm px-3 text-sm ${index === active ? "bg-bg-subtle" : ""}`}
          >
            <span className="font-medium text-fg">{suggestion.displayName}</span>
            <span className="text-muted">@{suggestion.handle}</span>
          </div>
        ))}
      </div>
      <p id={`${id}-help`} className="text-sm text-muted">
        {help}
      </p>
      <p id={`${id}-count`} className="text-right text-xs text-muted tabular-nums" aria-live="polite">
        {POST_BODY_MAX - value.length < 200 ? `${value.length} / ${POST_BODY_MAX}` : null}
      </p>
    </div>
  );
}
