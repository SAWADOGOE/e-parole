import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { MODERATOR_SUSPENSION_MAX_DAYS, SENSITIVE_REASONS, SUSPENSION_MAX_DAYS, moderationCase, type ReportReasonName } from "@/features/moderation";
import { AssignButton } from "@/features/moderation/components/assign-button";
import { DecisionForm } from "@/features/moderation/components/decision-form";
import { EvidenceView } from "@/features/moderation/components/evidence-view";
import { SensitiveText } from "@/features/moderation/components/sensitive-text";
import { requireAdminPermission } from "@/server/auth/session";
import { can } from "@/server/policies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("moderation") };
}

/**
 * Dossier (docs/admin/ADMIN-MODERATION.md) : copie figée + état actuel, signalements, historique, contexte de modération
 * de l'auteur. Aucun accès à ses messages, prières privées ni notes bibliques.
 */
export default async function ModerationCasePage(props: PageProps<"/admin/moderation/cases/[id]">) {
  const { id } = await props.params;
  const session = await requireAdminPermission("moderation:case:read", "/admin/moderation");
  if (!/^[a-z0-9]{1,64}$/.test(id)) notFound();
  const detail = await moderationCase(session.actor, id);
  if (!detail) notFound();
  const t = await getTranslations("admin");
  const tReport = await getTranslations("report");
  const format = await getFormatter();
  const open = detail.status === "OPEN" || detail.status === "IN_PROGRESS";
  const sensitive = SENSITIVE_REASONS.has(detail.dominantReason) || detail.reports.some((r) => SENSITIVE_REASONS.has(r.reason));
  const changed = detail.state.current !== null && detail.snapshot !== null && detail.state.current["body"] !== detail.snapshot["body"];
  const counts = new Map<ReportReasonName, number>();
  for (const report of detail.reports) counts.set(report.reason, (counts.get(report.reason) ?? 0) + 1);
  const isAdmin = can(session.actor, "moderation:sanction:ban", { targetUserId: "x", targetGlobalRoles: [] });

  return (
    <>
      <Breadcrumbs items={[{ label: t("metaTitle"), href: "/admin" }, { label: t("moderation"), href: "/admin/moderation" }, { label: t("caseTitle", { id: detail.id.slice(0, 8) }) }]} />
      <div className="flex flex-wrap items-center gap-2">
        <h1 id="titre-dossier" tabIndex={-1} className="font-serif text-display-sm text-fg">
          {tReport(`reasons.${detail.dominantReason}`)}
        </h1>
        <Badge tone={detail.priority <= 1 ? "danger" : "neutral"}>{t("priorityLabel", { label: t(`priority.${String(detail.priority) as "0" | "1" | "2" | "3"}`) })}</Badge>
        <Badge>{t(`caseStatus.${detail.status}`)}</Badge>
        <Badge>{t(`targetType.${detail.targetType}`)}</Badge>
        {detail.autoHidden ? <Badge tone="warning">{t("autoHidden")}</Badge> : null}
        {detail.targetAuthorMinor ? <Badge tone="danger">{t("minorTarget")}</Badge> : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="copie-figee">
            <h2 id="copie-figee" className="text-lg font-semibold text-fg">{t("snapshotTitle")}</h2>
            <div className="mt-3 rounded-lg border bg-bg-elevated p-4">
              <SensitiveText sensitive={sensitive}>
                <EvidenceView data={detail.snapshot} images={detail.snapshotImages} />
              </SensitiveText>
            </div>
          </section>
          <section aria-labelledby="etat-actuel">
            <h2 id="etat-actuel" className="text-lg font-semibold text-fg">{t("currentTitle")}</h2>
            <p className="mt-2 flex flex-wrap gap-2 text-sm">
              <Badge tone={detail.state.isHidden || detail.state.deleted ? "warning" : "neutral"}>
                {detail.state.removedByModeration ? t("currentRemoved") : detail.state.deleted ? t("currentDeleted") : detail.state.isHidden ? t("currentHidden") : t("currentVisible")}
              </Badge>
              {changed ? <span className="text-muted">{t("currentChanged")}</span> : null}
            </p>
            {changed ? (
              <div className="mt-3 rounded-lg border p-4">
                <SensitiveText sensitive={sensitive}>
                  <EvidenceView data={detail.state.current} images={[]} />
                </SensitiveText>
              </div>
            ) : null}
          </section>
          <section aria-labelledby="signalements">
            <h2 id="signalements" className="text-lg font-semibold text-fg">{t("reportsTitle", { count: detail.reportCount })}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {[...counts.entries()].map(([reason, count]) => (
                <li key={reason}><Badge>{tReport(`reasons.${reason}`)} × {count}</Badge></li>
              ))}
            </ul>
            <ul className="mt-3 divide-y border-y">
              {detail.reports.map((report) => (
                <li key={report.id} className="py-3 text-sm">
                  <p className="text-fg">
                    <span className="font-medium">{tReport(`reasons.${report.reason}`)}</span>
                    <span className="text-muted"> · {report.reporterHandle ? `@${report.reporterHandle}` : "—"} · {format.relativeTime(report.createdAt)}{report.trusted ? ` · ${t("trustedReporter")}` : ""}</span>
                  </p>
                  {report.details ? <p className="mt-1 break-words whitespace-pre-line text-fg">{report.details}</p> : null}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="historique">
            <h2 id="historique" className="text-lg font-semibold text-fg">{t("historyTitle")}</h2>
            {detail.actions.length === 0 ? <p className="mt-2 text-sm text-muted">{t("historyEmpty")}</p> : (
              <ul className="mt-2 divide-y border-y">
                {detail.actions.map((action) => (
                  <li key={action.id} className="py-3 text-sm">
                    <p className="font-medium text-fg">{t(`decision.${action.decision}`)}{action.durationDays ? ` · ${action.durationDays} j` : ""}</p>
                    <p className="text-muted">{action.moderatorHandle ? `@${action.moderatorHandle}` : "—"} · {format.dateTime(action.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="mt-1 text-fg">{action.publicReason}</p>
                    {action.internalNote ? <p className="mt-1 text-muted italic">{action.internalNote}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="auteur" className="rounded-lg border bg-bg-elevated p-4">
            <h2 id="auteur" className="text-base font-semibold text-fg">{t("authorTitle")}</h2>
            {detail.author ? (
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <dt className="sr-only">{t("authorTitle")}</dt>
                <dd className="font-medium text-fg">{detail.author.displayName} {detail.author.handle ? `· @${detail.author.handle}` : ""}</dd>
                <dd className="text-muted">{t("authorAge", { date: format.relativeTime(detail.author.createdAt) })}</dd>
                <dd className="text-muted">{t(`status.${detail.author.status}`)}</dd>
                <dd className="text-muted">{t("authorSanctions", { count: detail.author.sanctions.length })}</dd>
                <dd className="text-muted">{t("authorReports30", { count: detail.author.reportsReceived30d })}</dd>
                {detail.author.sanctions.map((sanction, index) => (
                  <dd key={index} className="text-xs text-muted">{t(`sanctionKind.${sanction.kind}`)} · {format.dateTime(sanction.startsAt, { dateStyle: "medium" })}</dd>
                ))}
              </dl>
            ) : <p className="mt-2 text-sm text-muted">{t("authorUnknown")}</p>}
          </section>
          {open ? (
            <section aria-label={t("decisionTitle")} className="rounded-lg border bg-bg-elevated p-4">
              {detail.assigneeId === session.actor.userId ? null : <div className="mb-4"><AssignButton caseId={detail.id} /></div>}
              <DecisionForm
                caseId={detail.id}
                targetIsProfile={detail.targetType === "PROFILE"}
                targetHandle={detail.author?.handle ?? null}
                canBan={isAdmin}
                maxSuspensionDays={isAdmin ? SUSPENSION_MAX_DAYS : MODERATOR_SUSPENSION_MAX_DAYS}
              />
            </section>
          ) : <p className="text-sm text-muted">{t("caseClosed")}</p>}
        </aside>
      </div>
    </>
  );
}
