"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

/** Contenu SEXUAL ou SELF_HARM : flouté et retiré de l'arbre d'accessibilité jusqu'au clic (docs/admin/ADMIN-MODERATION.md). */
export function SensitiveText({ sensitive, children }: { sensitive: boolean; children: ReactNode }) {
  const t = useTranslations("admin");
  const [revealed, setRevealed] = useState(false);
  if (!sensitive) return <>{children}</>;
  return (
    <div className="flex flex-col items-start gap-2">
      {revealed ? children : (
        <p className="text-sm text-muted italic">{t("sensitiveHidden")}</p>
      )}
      <button type="button" aria-expanded={revealed} onClick={() => setRevealed((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-accent hover:bg-bg-subtle">
        {revealed ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        {revealed ? t("sensitiveConceal") : t("sensitiveReveal")}
      </button>
    </div>
  );
}
