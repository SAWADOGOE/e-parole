import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import { getTodayVerse } from "../server/reader";
import { VerseQuote } from "./verse-quote";

/** Verset du jour : le texte vient de la base ; la phrase éditoriale reste visuellement séparée du verset. */
export async function DailyVerseCard({ headingId, size = "md", className }: { headingId: string; size?: "md" | "lg"; className?: string }) {
  const t = await getTranslations("home");
  const today = await getTodayVerse();
  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <h2 id={headingId} className="mb-3 text-xs font-semibold tracking-[0.18em] text-gold-fg uppercase">
        {t("verseOfDayLabel")}
      </h2>
      {today ? (
        <>
          <VerseQuote passage={today.passage} size={size} />
          {today.reflection ? <p className="mt-3 text-sm text-muted">{today.reflection}</p> : null}
        </>
      ) : (
        <p className="text-sm text-muted">{t("verseOfDayEmpty")}</p>
      )}
    </section>
  );
}
