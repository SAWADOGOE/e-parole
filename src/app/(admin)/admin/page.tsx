import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getDashboardCounts } from "@/features/administration";
import { requireAdminPage } from "@/server/auth/session";
import { can } from "@/server/policies";

export default async function AdminDashboardPage() {
  const session = await requireAdminPage();
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const showUsers = can(session.actor, "analytics:read", { analyticsScope: "global" });
  const counts = showUsers ? await getDashboardCounts() : null;

  const kpis = counts
    ? [
        { label: t("kpiUsers"), value: counts.users },
        { label: t("kpiNewUsers"), value: counts.newUsers7d },
        { label: t("kpiActiveUsers"), value: counts.activeUsers7d },
        { label: t("kpiSuspended"), value: counts.suspendedUsers },
        { label: t("kpiCommunities"), value: counts.communities },
      ]
    : [];

  return (
    <>
      <Breadcrumbs items={[{ label: t("metaTitle") }, { label: t("dashboard") }]} />
      <h1 className="font-serif text-display-md text-fg">{t("dashboard")}</h1>
      {kpis.length > 0 ? (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-bg-elevated p-5">
                <dt className="text-sm text-muted">{kpi.label}</dt>
                <dd className="mt-2 text-3xl font-semibold text-fg tabular-nums">{format.number(kpi.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted">{t("kpiNote")}</p>
        </>
      ) : (
        <p className="mt-8 text-muted">{t("kpiNote")}</p>
      )}
    </>
  );
}
