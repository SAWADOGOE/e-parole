"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

/**
 * Contenu SEXUAL ou SELF_HARM : masqué jusqu'au clic (docs/admin/ADMIN-MODERATION.md). Le bouton précède le contenu qu'il
 * révèle (ordre de lecture) et le désigne par aria-controls ; `label` le distingue des autres boutons de la file.
 */
export function SensitiveText({ sensitive, label, children }: { sensitive: boolean; label?: string; children: ReactNode }) {
  const t = useTranslations("admin");
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  if (!sensitive) return <>{children}</>;
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={revealed}
        aria-controls={id}
        onClick={() => setRevealed((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-accent hover:bg-bg-subtle"
      >
        {revealed ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        {revealed ? t("sensitiveConceal") : t("sensitiveReveal")}
        {label ? <span className="sr-only"> — {label}</span> : null}
      </button>
      <div id={id}>{revealed ? children : <p className="text-sm text-muted italic">{t("sensitiveHidden")}</p>}</div>
    </div>
  );
}
