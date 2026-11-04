import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./empty-state";

type Namespace = "bible" | "prayers" | "communities" | "publish";

/** Page d'un module pas encore livré : vrai état vide, jamais de contenu fictif. */
export async function ComingSoonPage({ namespace, icon }: { namespace: Namespace; icon: LucideIcon }) {
  const t = await getTranslations(namespace);
  const tCommon = await getTranslations("common");
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="min-w-0 font-serif text-display-sm break-words text-fg sm:text-display-md">{t("title")}</h1>
        <Badge tone="gold">{tCommon("comingSoon")}</Badge>
      </header>
      <EmptyState icon={icon} title={t("emptyTitle")} body={t("emptyBody")} verse={t("emptyVerse")} />
    </>
  );
}
