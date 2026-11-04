import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { findAdminUser, ROLE_GRANT_PERMISSION } from "@/features/administration";
import { RoleManager } from "@/features/administration/components/role-manager";
import { requireAdminPage } from "@/server/auth/session";
import { can, GLOBAL_ROLES } from "@/server/policies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("userDetail") };
}

export default async function AdminUserDetailPage(props: PageProps<"/admin/users/[id]">) {
  const session = await requireAdminPage();
  if (!can(session.actor, "user:read:admin", { linkedToCase: false })) notFound();
  const { id } = await props.params;
  const user = await findAdminUser(id);
  if (!user) notFound();
  const t = await getTranslations("admin");
  const format = await getFormatter();

  const target = { targetUserId: user.id, targetGlobalRoles: user.roles };
  const roles = GLOBAL_ROLES.map((role) => ({
    role,
    held: user.roles.includes(role),
    manageable: can(session.actor, ROLE_GRANT_PERMISSION[role], target),
  }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: t("metaTitle"), href: "/admin" },
          { label: t("users"), href: "/admin/users" },
          { label: user.displayName },
        ]}
      />
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-display-md text-fg">{user.displayName}</h1>
        <Badge tone={user.status === "ACTIVE" ? "neutral" : "danger"}>{t(`status.${user.status}`)}</Badge>
      </header>
      <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-muted">{t("colHandle")}</dt>
        <dd>{user.handle ? `@${user.handle}` : "—"}</dd>
        <dt className="text-muted">{t("colEmail")}</dt>
        <dd>{user.maskedEmail}</dd>
        <dt className="text-muted">{t("colMfa")}</dt>
        <dd>{user.twoFactorEnabled ? t("mfaOn") : t("mfaOff")}</dd>
        <dt className="text-muted">{t("colCreated")}</dt>
        <dd className="tabular-nums">{format.dateTime(user.createdAt, { dateStyle: "long" })}</dd>
      </dl>
      <RoleManager userId={user.id} userName={user.displayName} roles={roles} />
    </>
  );
}
