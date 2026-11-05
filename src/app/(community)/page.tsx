import { Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("metaTitle") };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const session = await getCurrentSession();

  if (!session) {
    return (
      <section className="py-8 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-fg uppercase">e·Parole</p>
        <h1 className="mt-4 max-w-xl font-serif text-display-md text-fg sm:text-display-lg">{t("visitorTitle")}</h1>
        <p className="mt-5 max-w-lg text-lg text-muted">{t("visitorIntro")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/inscription">{t("visitorPrimary")}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/connexion">{t("visitorSecondary")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <p className="font-serif text-xl text-fg">{t("greeting", { name: session.displayName })}</p>

      <section aria-labelledby="verset-du-jour-mobile" className="mt-6 border-l-[3px] border-gold pl-4 lg:hidden">
        <h2 id="verset-du-jour-mobile" className="text-xs font-semibold tracking-[0.18em] text-gold-fg uppercase">
          {t("verseOfDayLabel")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("verseOfDayEmpty")}</p>
      </section>

      <h1 className="sr-only">{tNav("home")}</h1>
      <h2 className="mt-10 text-sm font-semibold text-muted">{t("feedTitle")}</h2>
      <EmptyState icon={Sprout} title={t("feedEmptyTitle")} body={t("feedEmptyBody")} verse={t("feedEmptyVerse")} />
    </>
  );
}
