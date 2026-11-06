"use client";

import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import Composer from "./composer/composer";

/** Feuille plein écran sur mobile, boîte de dialogue centrée dès 768 px (docs/17). Chargée au premier clic. */
export default function ComposerSheet({ open, onOpenChange, isMinor }: { open: boolean; onOpenChange: (open: boolean) => void; isMinor: boolean }) {
  const t = useTranslations("composer");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel={t("close")}
        className="h-[100dvh] max-h-[100dvh] overflow-y-auto rounded-none p-4 pt-14 md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:h-auto md:max-h-[90dvh] md:w-[min(40rem,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:p-6 md:pt-14"
      >
        <SheetTitle>{t("dialogTitle")}</SheetTitle>
        <SheetDescription className="sr-only">{t("publicNotice")}</SheetDescription>
        {open ? <Composer isMinor={isMinor} onPublished={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}
