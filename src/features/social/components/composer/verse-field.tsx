"use client";

import { BookOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { previewVerseAction } from "../../server/actions";
import type { Draft } from "./use-draft";

export type ComposerVerse = NonNullable<Draft["verse"]>;

/**
 * Verset cité (US-5) : l'auteur choisit une référence ; le texte affiché vient de la base et ne peut pas être modifié.
 * Seules les coordonnées sont envoyées à la publication.
 */
export function VerseField({ verse, onChange }: { verse: ComposerVerse | null; onChange: (verse: ComposerVerse | null) => void }) {
  const t = useTranslations("composer");
  const id = useId();
  const [reference, setReference] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const remove = useRef<HTMLButtonElement>(null);
  const changed = useRef(false);
  // Le champ et la citation se remplacent : le focus suit (bouton « Retirer » après choix, champ après retrait).
  useEffect(() => {
    if (!changed.current) return;
    changed.current = false;
    (verse ? remove.current : input.current)?.focus();
  }, [verse]);
  const update = (next: ComposerVerse | null): void => {
    changed.current = true;
    onChange(next);
  };

  async function lookup(): Promise<void> {
    if (!reference.trim()) return;
    setBusy(true);
    setError(false);
    try {
      const result = await previewVerseAction({ reference });
      if (result.ok && result.data) {
        update({ ...result.data.verse, reference: result.data.reference, text: result.data.text, attribution: result.data.attribution });
        setReference("");
      } else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (verse) {
    return (
      <figure className="relative border-l-[3px] border-gold py-1 pr-12 pl-4">
        <blockquote lang="fr" className="font-serif text-lg text-fg">
          « {verse.text} »
        </blockquote>
        <figcaption className="mt-2 text-sm text-muted">
          <span className="font-medium text-fg">{verse.reference}</span> · {verse.attribution}
        </figcaption>
        <Button ref={remove} variant="ghost" size="icon" className="absolute top-0 right-0" aria-label={t("verseRemove")} onClick={() => update(null)}>
          <X aria-hidden="true" />
        </Button>
      </figure>
    );
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-fg">
        <BookOpen aria-hidden="true" className="size-4 text-gold-fg" />
        {t("verseTitle")}
      </legend>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={`${id}-ref`} className="sr-only">
          {t("verseLabel")}
        </label>
        <input
          ref={input}
          id={`${id}-ref`}
          value={reference}
          maxLength={80}
          placeholder={t("versePlaceholder")}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          aria-invalid={error || undefined}
          onChange={(event) => setReference(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void lookup();
            }
          }}
          className="h-11 min-w-0 flex-1 basis-48 rounded-sm border border-border-strong bg-bg-elevated px-3 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <Button variant="secondary" aria-disabled={busy || undefined} onClick={() => void (busy ? undefined : lookup())}>
          {t("verseSearch")}
        </Button>
      </div>
      <p id={`${id}-help`} className="text-sm text-muted">
        {t("verseHelp")}
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {t("verseNotFound")}
        </p>
      ) : null}
    </fieldset>
  );
}
