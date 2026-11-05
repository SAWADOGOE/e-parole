"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { restoreFocus } from "../lib/focus";

/**
 * Feuille basse sur mobile, panneau flottant façon popover à partir de 768 px : un seul composant, un seul focus trap.
 * Ces panneaux s'ouvrent sans Trigger Radix : le retour du focus à l'élément d'origine est donc assuré ici.
 */
export function ReaderSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useTranslations("common");
  const [opener] = useState(() => document.activeElement);
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        closeLabel={t("close")}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus(opener);
        }}
        className="overflow-y-auto p-4 md:inset-x-auto md:top-[calc(var(--header-height)+8px)] md:bottom-auto md:left-1/2 md:max-h-[80dvh] md:w-[28rem] md:-translate-x-1/2 md:rounded-lg md:border"
      >
        <SheetTitle className="pr-12">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
