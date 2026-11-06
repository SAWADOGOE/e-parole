"use client";

import { Info, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import { FormAlert } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { notify } from "@/lib/notify";
import { MAX_POST_IMAGES, POST_TYPES, type PostTypeName } from "../../constants";
import { createPostAction } from "../../server/actions";
import { ImageField } from "./image-field";
import { MentionTextarea } from "./mention-textarea";
import { clearDraft, readDraft, useDraftAutosave, type Draft } from "./use-draft";
import { useUploads } from "./use-uploads";
import { VerseField, type ComposerVerse } from "./verse-field";

interface ComposerProps {
  isMinor: boolean;
  /** Verset pré-rempli depuis le lecteur biblique (US-5). */
  initialVerse?: ComposerVerse | null;
  onPublished?: () => void;
}

/** Composer (US-10, US-5) : publication toujours publique, brouillon local, images prêtes avant l'envoi. */
export default function Composer({ isMinor, initialVerse = null, onPublished }: ComposerProps) {
  const t = useTranslations("composer");
  const tSocial = useTranslations("social");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const [restored] = useState<Draft | null>(() => (typeof window === "undefined" ? null : readDraft()));
  const [type, setType] = useState<PostTypeName>(restored?.type ?? "TEXT");
  const [body, setBody] = useState(restored?.body ?? "");
  const [verse, setVerse] = useState<ComposerVerse | null>(initialVerse ?? restored?.verse ?? null);
  const uploads = useUploads(restored?.images ?? [], MAX_POST_IMAGES);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (restored) notify(t("draftRestored"));
  }, [restored, t]);

  const draft = useMemo<Draft>(
    () => ({ type, body, verse, images: uploads.items.flatMap((item) => (item.assetId && item.state !== "failed" ? [{ assetId: item.assetId, altText: item.altText }] : [])) }),
    [type, body, verse, uploads.items],
  );
  useDraftAutosave(draft, !busy);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (uploads.pending) return setError(t("waitImages"));
    const images = uploads.items.flatMap((item) => (item.state === "ready" && item.assetId ? [{ assetId: item.assetId, altText: item.altText.trim() }] : []));
    if (!body.trim() && !verse && images.length === 0) return setError(t("emptyError"));
    setBusy(true);
    try {
      const result = await createPostAction({
        type,
        body: body.trim(),
        verse: verse ? { bookId: verse.bookId, chapter: verse.chapter, verseStart: verse.verseStart, verseEnd: verse.verseEnd } : null,
        images,
      });
      if (!result.ok) {
        setError(tErrors(errorKey(result.error.code)));
        return;
      }
      clearDraft();
      setBody("");
      setVerse(null);
      uploads.clear();
      notify(t("published"));
      if (onPublished) onPublished();
      else router.push("/");
      router.refresh();
    } catch {
      // Réseau coupé : le brouillon est déjà enregistré sur l'appareil.
      setError(t("offline"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-6" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg">{t("typeLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map((value) => (
            <label key={value} className="relative">
              <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="peer sr-only" />
              <span className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border-strong px-4 text-sm text-fg peer-checked:border-accent peer-checked:bg-accent-subtle peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                {tSocial(`types.${value}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <MentionTextarea value={body} onChange={setBody} label={t("bodyLabel")} help={t("bodyHelp")} placeholder={t("bodyPlaceholder")} invalid={error === t("emptyError")} />
      <VerseField verse={verse} onChange={setVerse} />
      <ImageField uploads={uploads} />

      <div className="flex flex-col gap-3 border-t pt-4">
        <p className="flex items-start gap-2 text-sm text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("publicNotice")}
        </p>
        {isMinor ? (
          <p className="flex items-start gap-2 rounded-md border border-warning px-3 py-2 text-sm text-fg">
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
            {t("minorNotice")}
          </p>
        ) : null}
        <FormAlert message={error} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {body || verse || uploads.items.length > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                clearDraft();
                setBody("");
                setVerse(null);
                uploads.clear();
              }}
            >
              {t("discardDraft")}
            </Button>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? t("submitting") : t("submit")}
          </Button>
        </div>
      </div>
    </form>
  );
}
