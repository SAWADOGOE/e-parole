import { Literata } from "next/font/google";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BottomNav, SideNav } from "@/components/layout/member-nav";

// Seule police préchargée de l'application (docs/29). Graisse unique : le texte biblique n'emploie que le 400,
// et un fichier statique pèse bien moins que la variable complète sur un réseau lent.
const literata = Literata({ subsets: ["latin"], weight: "400", variable: "--font-literata", display: "swap", preload: true });

/** Layout du lecteur : aucune donnée de session, pas de colonne latérale ; le texte occupe l'espace. */
export default async function ReaderLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className={`${literata.variable} min-h-dvh`}>
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-brand-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("skipToContent")}
      </a>
      <div data-reader-nav="" className="fixed top-(--header-height) left-0 z-20 hidden w-[72px] p-2 md:block lg:w-60">
        <SideNav />
      </div>
      <div className="md:pl-[72px] lg:pl-60">{children}</div>
      <div data-reader-nav="">
        <BottomNav />
      </div>
    </div>
  );
}
