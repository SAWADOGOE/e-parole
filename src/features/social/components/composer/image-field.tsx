"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_MIMES } from "@/features/media/constants";
import { ALT_TEXT_MAX, MAX_POST_IMAGES } from "../../constants";
import type { useUploads } from "./use-uploads";

type Uploads = ReturnType<typeof useUploads>;

/** Jusqu'à 4 images : état d'envoi annoncé, aperçu seulement quand l'image est prête, texte alternatif par image. */
export function ImageField({ uploads }: { uploads: Uploads }) {
  const t = useTranslations("composer");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const full = uploads.items.length >= MAX_POST_IMAGES;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-fg">{t("imagesTitle")}</legend>
      <p id={`${id}-help`} className="text-sm text-muted">
        {t("imagesHelp")}
      </p>
      {uploads.items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {uploads.items.map((item, index) => (
            <li key={item.key} className="flex flex-col gap-2 rounded-md border p-2">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-sm bg-bg-subtle">
                {item.state === "ready" && item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu d'une variante déjà traitée par le worker
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <p className="flex items-center gap-2 px-3 text-center text-sm text-muted" role="status">
                    {item.state === "failed" ? null : <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
                    {item.state === "uploading" ? t("imageUploading") : null}
                    {item.state === "processing" ? t("imageProcessing") : null}
                    {item.state === "failed" ? (
                      <span className="text-danger">{t(item.error === "tooLarge" ? "imageTooLarge" : item.error === "wrongType" ? "imageWrongType" : "imageFailed")}</span>
                    ) : null}
                  </p>
                )}
                <Button variant="secondary" size="icon" className="absolute top-1 right-1" aria-label={t("imageRemove", { index: index + 1 })} onClick={() => uploads.remove(item.key)}>
                  <X aria-hidden="true" />
                </Button>
              </div>
              {item.state === "failed" ? null : (
                <label className="flex flex-col gap-1 text-sm text-fg">
                  {t("imageAltLabel", { index: index + 1 })}
                  <input
                    value={item.altText}
                    maxLength={ALT_TEXT_MAX}
                    placeholder={t("imageAltPlaceholder")}
                    onChange={(event) => uploads.setAlt(item.key, event.target.value)}
                    className="h-11 rounded-sm border border-border-strong bg-bg-elevated px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </label>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={input}
        id={`${id}-file`}
        type="file"
        accept={ACCEPTED_IMAGE_MIMES.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          if (event.target.files) uploads.add(event.target.files);
          event.target.value = "";
        }}
      />
      <div>
        <Button variant="secondary" disabled={full} aria-describedby={`${id}-help`} onClick={() => input.current?.click()}>
          <ImagePlus aria-hidden="true" />
          {full ? t("imageLimit") : t("imagesAdd")}
        </Button>
      </div>
    </fieldset>
  );
}
