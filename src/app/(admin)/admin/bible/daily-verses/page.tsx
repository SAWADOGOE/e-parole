import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import {
  DAILY_VERSE_MAX_DAYS_AHEAD,
  dailyVerseMonthSchema,
  getCatalog,
  getTranslation,
  isoDay,
  listDailyVerses,
  utcDay,
} from "@/features/bible";
import { DailyVerseForm } from "@/features/bible/components/daily-verse-form";
import { DeleteDailyVerseButton } from "@/features/bible/components/delete-daily-verse-button";
import { formatReference } from "@/features/bible/lib/format";
import { requireAdminPermission } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminBible");
  return { title: t("dailyVerses") };
}

const monthKey = (date: Date): string => date.toISOString().slice(0, 7);
const shiftMonth = (year: number, month: number, delta: number): Date => new Date(Date.UTC(year, month + delta, 1));

export default async function AdminDailyVersesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPermission("daily_verse:manage", "/admin/bible/daily-verses");
  const t = await getTranslations("adminBible");
  const tAdmin = await getTranslations("admin");
  const format = await getFormatter();
  const { mois } = dailyVerseMonthSchema.parse(await searchParams);

  const today = utcDay(new Date());
  const [year, month] = (mois ?? monthKey(today)).split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const historyFrom = new Date(today.getTime() - 30 * 86_400_000);

  const translation = await getTranslation();
  const [books, rows, history] = await Promise.all([
    translation ? getCatalog(translation) : [],
    listDailyVerses(first, last),
    listDailyVerses(historyFrom, today),
  ]);
  const nameOf = (bookId: string): string => books.find((book) => book.id === bookId)?.name ?? bookId;
  const byDay = new Map(rows.map((row) => [isoDay(row.date), row]));
  const days = Array.from({ length: last.getUTCDate() }, (_, index) => new Date(Date.UTC(year, month - 1, index + 1)));
  const monthLabel = format.dateTime(first, { month: "long", year: "numeric", timeZone: "UTC" });
  const dayLabel = (date: Date): string => format.dateTime(date, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <>
      <Breadcrumbs items={[{ label: tAdmin("metaTitle"), href: "/admin" }, { label: t("title") }, { label: t("dailyVerses") }]} />
      <h1 className="font-serif text-display-md text-fg">{t("dailyVerses")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("calendarIntro", { days: DAILY_VERSE_MAX_DAYS_AHEAD })}</p>

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="calendrier">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/admin/bible/daily-verses?mois=${monthKey(shiftMonth(year, month - 1, -1))}` as Route} aria-label={t("previousMonth")} className="inline-flex size-11 items-center justify-center rounded-md hover:bg-bg-subtle">
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <h2 id="calendrier" aria-live="polite" className="text-xl font-semibold text-fg capitalize">
              {t("calendarLabel", { month: monthLabel })}
            </h2>
            <Link href={`/admin/bible/daily-verses?mois=${monthKey(shiftMonth(year, month - 1, 1))}` as Route} aria-label={t("nextMonth")} className="inline-flex size-11 items-center justify-center rounded-md hover:bg-bg-subtle">
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
          </div>
          <ol className="mt-3 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {days.map((date) => {
              const key = isoDay(date);
              const row = byDay.get(key);
              return (
                <li key={key} className="flex min-h-20 flex-col gap-1 bg-bg-elevated p-3 text-sm">
                  <span className="flex items-center justify-between gap-2 font-medium text-fg">
                    <time dateTime={key}>{dayLabel(date)}</time>
                    {row && date >= today ? (
                      <DeleteDailyVerseButton date={key} label={t("remove", { date: dayLabel(date) })} reference={formatReference(nameOf(row.bookId), row.chapter, row.verseStart, row.verseEnd)} />
                    ) : null}
                  </span>
                  {row ? (
                    <>
                      <span className="text-fg">{formatReference(nameOf(row.bookId), row.chapter, row.verseStart, row.verseEnd)}</span>
                      <span>
                        <Badge tone={row.isAutomatic ? "neutral" : "accent"}>{t(row.isAutomatic ? "automatic" : "scheduled")}</Badge>
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">{t("notScheduled")}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex flex-col gap-8">
          <DailyVerseForm defaultDate={isoDay(today)} />
          <section aria-labelledby="historique">
            <h2 id="historique" className="text-xl font-semibold text-fg">
              {t("historyTitle")}
            </h2>
            {history.length === 0 ? <p className="mt-2 text-sm text-muted">{t("historyEmpty")}</p> : null}
            <ul className="mt-2 divide-y text-sm">
              {[...history].reverse().map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-fg">
                    {dayLabel(row.date)} — {formatReference(nameOf(row.bookId), row.chapter, row.verseStart, row.verseEnd)}
                  </span>
                  <Badge tone={row.isAutomatic ? "neutral" : "accent"}>{t(row.isAutomatic ? "automatic" : "scheduled")}</Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
