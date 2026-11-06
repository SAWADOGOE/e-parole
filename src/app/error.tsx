"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Cette frontière d'erreur est chargée sur TOUTES les pages : elle n'importe ni Button (Slot de Radix) ni EmptyState
 * (tailwind-merge), qui pèseraient sur le JS initial de chaque page (docs/29). Même rendu qu'EmptyState.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4">
      <section className="flex flex-col items-center px-4 py-12 text-center">
        <span className="mb-6 inline-flex size-16 items-center justify-center rounded-full border border-gold text-gold-fg">
          <CloudOff aria-hidden="true" className="size-7" strokeWidth={1.5} />
        </span>
        <h2 className="font-serif text-display-sm text-fg">{t("errors.genericTitle")}</h2>
        <p className="mt-3 max-w-md text-base text-muted">{t("errors.genericBody")}</p>
        <div className="mt-8">
          <button type="button" className={buttonVariants()} onClick={reset}>
            {t("common.retry")}
          </button>
        </div>
      </section>
      {error.digest ? <p className="text-xs text-muted">{t("common.requestId", { id: error.digest })}</p> : null}
    </main>
  );
}
