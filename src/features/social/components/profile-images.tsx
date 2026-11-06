"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_MIMES } from "@/features/media/constants";
import { notifyError } from "@/lib/notify";
import { profileImageAction } from "../server/actions";
import { uploadFile, validateFile } from "./composer/use-uploads";
import { useActionRunner } from "./use-action-runner";

/** Photo de profil et bannière : même pipeline que les publications (EXIF retiré, ré-encodage), recadrage côté worker. */
export function ProfileImages({ hasAvatar, hasBanner }: { hasAvatar: boolean; hasBanner: boolean }) {
  const t = useTranslations("profile");
  const tComposer = useTranslations("composer");
  const { run } = useActionRunner();
  const [working, setWorking] = useState<"avatar" | "banner" | null>(null);
  const inputs = { avatar: useRef<HTMLInputElement>(null), banner: useRef<HTMLInputElement>(null) };

  async function upload(slot: "avatar" | "banner", file: File): Promise<void> {
    const invalid = validateFile(file);
    if (invalid) return notifyError(tComposer(invalid === "tooLarge" ? "imageTooLarge" : "imageWrongType"));
    setWorking(slot);
    try {
      const status = await uploadFile(file, slot === "avatar" ? "AVATAR" : "BANNER");
      if (status.status !== "READY") return notifyError(tComposer("imageFailed"));
      await run(() => profileImageAction({ slot, assetId: status.assetId }), t("imageUpdated"));
    } catch {
      notifyError(tComposer("imageFailed"));
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["avatar", "banner"] as const).map((slot) => {
        const present = slot === "avatar" ? hasAvatar : hasBanner;
        return (
          <section key={slot} aria-labelledby={`titre-${slot}`} className="flex flex-col gap-2 rounded-md border p-3">
            <h3 id={`titre-${slot}`} className="font-medium text-fg">
              {t(slot === "avatar" ? "avatarTitle" : "bannerTitle")}
            </h3>
            <input
              ref={inputs[slot]}
              type="file"
              accept={ACCEPTED_IMAGE_MIMES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              data-testid={`fichier-${slot}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(slot, file);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={working !== null} onClick={() => inputs[slot].current?.click()}>
                {working === slot ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
                {working === slot ? tComposer("imageProcessing") : t("imageChange")}
              </Button>
              {present ? (
                <Button variant="ghost" disabled={working !== null} onClick={() => void run(() => profileImageAction({ slot, assetId: null }), t("imageRemoved"))}>
                  {t("imageRemove")}
                </Button>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
