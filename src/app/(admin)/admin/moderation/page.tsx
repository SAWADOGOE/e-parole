import type { Metadata, Route } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CASE_STATUSES, REPORT_REASONS, REPORT_TARGETS, SENSITIVE_REASONS, caseListQuerySchema, moderationQueue, type CaseListItem } from "@/features/moderation";
import { SensitiveText } from "@/features/moderation/components/sensitive-text";
import { requireAdminPermission } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("moderationQueue") };
}

const PRIORITY_TONE = { 0: "danger", 1: "warning", 2: "neutral", 3: "neutral" } as const;

/** File de modération (US-41) : priorité puis ancienneté ; refus d'accès journalisé et répondu en 404. */
export default async function ModerationQueuePage(props: PageProps<"/admin/moderation">) {
  const session = await requireAdminPermission("moderation:case:read", "/admin/moderation");
  const parsed = caseListQuerySchema.safeParse(await props.searchParams);
  const query = parsed.success ? parsed.data : caseListQuerySchema.parse({});
  const { rows, total, pageSize } = await moderationQueue(session.actor, query);
  const t = await getTranslations("admin");
  const tReport = await getTranslations("report");
  const format = await getFormatter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const params = (page: number) => {
    const search = new URLSearchParams({ statut: query.statut, page: String(page) });
    if (query.priorite !== undefined) search.set("priorite", String(query.priorite));
    if (query.motif) search.set("motif", query.motif);
    if (query.type) search.set("type", query.type);
    if (query.assigne) search.set("assigne", query.assigne);
    if (query.q) search.set("q", query.q);
    return `/admin/moderation?${search.toString()}` as Route;
  };
  const select = "h-11 rounded-sm border border-border-strong bg-bg-elevated px-2 text-sm text-fg";
  const priorityBadge = (row: CaseListItem) => (
    <Badge tone={PRIORITY_TONE[row.priority as 0 | 1 | 2 | 3]}>{t("priorityLabel", { label: t(`priority.${String(row.priority) as "0" | "1" | "2" | "3"}`) })}</Badge>
  );
  const excerpt = (row: CaseListItem) => (
    <SensitiveText sensitive={SENSITIVE_REASONS.has(row.dominantReason)}>
      <span className="line-clamp-2 break-words text-fg">{row.excerpt || "—"}</span>
    </SensitiveText>
  );

  return (
    <>
      <Breadcrumbs items={[{ label: t("metaTitle"), href: "/admin" }, { label: t("moderation") }]} />
      <h1 className="font-serif text-display-md text-fg">{t("moderationQueue")}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">{t("moderationIntro")}</p>

      <form action="/admin/moderation" aria-label={t("filtersLabel")} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t("filterStatus")}
          <select name="statut" defaultValue={query.statut} className={select}>
            <option value="ouverts">{t("statusOpen")}</option>
            {CASE_STATUSES.map((status) => (
              <option key={status} value={status}>{t(`caseStatus.${status}`)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t("filterPriority")}
          <select name="priorite" defaultValue={query.priorite ?? ""} className={select}>
            <option value="">{t("filterAll")}</option>
            {(["0", "1", "2", "3"] as const).map((p) => (
              <option key={p} value={p}>{t(`priority.${p}`)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t("filterReason")}
          <select name="motif" defaultValue={query.motif ?? ""} className={select}>
            <option value="">{t("filterAll")}</option>
            {REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>{tReport(`reasons.${reason}`)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t("filterType")}
          <select name="type" defaultValue={query.type ?? ""} className={select}>
            <option value="">{t("filterAll")}</option>
            {REPORT_TARGETS.map((type) => (
              <option key={type} value={type}>{t(`targetType.${type}`)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t("filterAssigned")}
          <select name="assigne" defaultValue={query.assigne ?? ""} className={select}>
            <option value="">{t("filterAll")}</option>
            <option value="moi">{t("assignedMe")}</option>
            <option value="personne">{t("assignedNone")}</option>
          </select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm text-muted">
          {t("filterSearch")}
          <Input name="q" defaultValue={query.q ?? ""} maxLength={64} />
        </label>
        <Button type="submit" variant="secondary">{t("filterApply")}</Button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">{t("moderationEmpty")}</p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-lg border lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle text-fg">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colPriority")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colReason")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colTarget")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colExcerpt")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t("colReports")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colAge")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colAssignee")}</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-bg-elevated">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3">{priorityBadge(row)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/moderation/cases/${row.id}` as Route} className="font-medium text-accent underline-offset-4 hover:underline">
                        {tReport(`reasons.${row.dominantReason}`)}
                      </Link>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {row.autoHidden ? <Badge tone="warning">{t("autoHidden")}</Badge> : null}
                        {row.targetAuthorMinor ? <Badge tone="danger">{t("minorTarget")}</Badge> : null}
                        {row.status === "OPEN" ? null : <Badge>{t(`caseStatus.${row.status}`)}</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-3">{t(`targetType.${row.targetType}`)}</td>
                    <td className="max-w-xs px-4 py-3">{excerpt(row)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.reportCount}</td>
                    <td className="px-4 py-3 text-muted"><time dateTime={row.createdAt.toISOString()}>{format.relativeTime(row.createdAt)}</time></td>
                    <td className="px-4 py-3 text-muted">{row.assigneeHandle ? `@${row.assigneeHandle}` : t("unassigned")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 divide-y rounded-lg border bg-bg-elevated lg:hidden">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-4 py-3">
                <span className="flex flex-wrap items-center gap-2">
                  {priorityBadge(row)}
                  <Link href={`/admin/moderation/cases/${row.id}` as Route} className="font-medium text-accent underline-offset-4 hover:underline">
                    {tReport(`reasons.${row.dominantReason}`)}
                  </Link>
                </span>
                <span className="text-xs text-muted">
                  {t(`targetType.${row.targetType}`)} · {row.reportCount} · {format.relativeTime(row.createdAt)}
                </span>
                {excerpt(row)}
              </li>
            ))}
          </ul>
          <Pagination page={query.page} totalPages={totalPages} hrefFor={params} />
        </>
      )}
    </>
  );
}
