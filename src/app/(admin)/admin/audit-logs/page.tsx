import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_PAGE_SIZE, auditListQuerySchema, listAuditLogs } from "@/features/administration";
import { requireAdminPage } from "@/server/auth/session";
import { can } from "@/server/policies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("auditLogs") };
}

export default async function AuditLogsPage(props: PageProps<"/admin/audit-logs">) {
  const session = await requireAdminPage();
  const actor = session.actor;
  const seesAll = can(actor, "audit:read", { auditActorId: null });
  const seesOwn = can(actor, "audit:read", { auditActorId: actor.userId });
  if (!seesAll && !seesOwn) notFound();

  const t = await getTranslations("admin");
  const format = await getFormatter();
  const query = auditListQuerySchema.parse(await props.searchParams);
  const { rows, total } = await listAuditLogs(query, seesAll ? null : actor.userId);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const hrefFor = (page: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (query.action) params.set("action", query.action);
    if (query.targetType) params.set("targetType", query.targetType);
    return `/admin/audit-logs?${params.toString()}` as Route;
  };

  return (
    <>
      <Breadcrumbs items={[{ label: t("metaTitle"), href: "/admin" }, { label: t("auditLogs") }]} />
      <h1 className="font-serif text-display-md text-fg">{t("auditLogs")}</h1>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/admin/audit-logs">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtre-action">{t("auditFilterAction")}</Label>
          <Input id="filtre-action" name="action" defaultValue={query.action ?? ""} className="w-56" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtre-cible">{t("auditFilterTarget")}</Label>
          <Input id="filtre-cible" name="targetType" defaultValue={query.targetType ?? ""} className="w-44" />
        </div>
        <Button type="submit" variant="secondary">
          {t("auditFilterSubmit")}
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">{t("auditEmpty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-bg-subtle text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{t("colDate")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t("colAction")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t("colActor")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t("colTarget")}</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-bg-elevated">
              {rows.map((row) => (
                <tr key={row.id} className="h-11 align-top">
                  <td className="px-4 py-2 whitespace-nowrap text-muted tabular-nums">
                    {format.dateTime(row.createdAt, { dateStyle: "short", timeStyle: "medium" })}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-2">
                    {row.actorLabel ?? t("systemActor")}
                    {row.actorRoles.length > 0 ? <span className="block text-xs text-muted">{row.actorRoles.join(", ")}</span> : null}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs break-all">
                    {row.targetType}
                    {row.targetId ? `:${row.targetId}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={query.page} totalPages={totalPages} hrefFor={hrefFor} />
    </>
  );
}
