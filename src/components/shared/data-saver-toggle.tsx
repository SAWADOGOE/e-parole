"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { DATA_SAVER_COOKIE } from "@/lib/data-saver";

/** Économie de données : les images ne se chargent qu'à la demande (≤ 60 Ko), avatars en initiales. Mémorisé un an. */
export function DataSaverToggle({ enabled }: { enabled: boolean }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const id = useId();
  const [on, setOn] = useState(enabled);

  function toggle(): void {
    const next = !on;
    setOn(next);
    document.cookie = `${DATA_SAVER_COOKIE}=${next ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby={`${id}-aide`}
      onClick={toggle}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm px-1 text-left text-sm text-fg"
    >
      <span>
        {t("dataSaver")}
        <span id={`${id}-aide`} className="block text-xs text-muted">
          {t("dataSaverHelp")}
        </span>
      </span>
      <span aria-hidden="true" className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border transition-colors ${on ? "border-accent bg-accent" : "border-border-strong bg-bg-subtle"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-bg-elevated shadow-sm transition-[left] motion-reduce:transition-none ${on ? "left-5" : "left-0.5"}`} />
      </span>
    </button>
  );
}
