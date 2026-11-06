import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_PAGE_SIZE, listUsers, userListQuerySchema } from "@/features/administration";
import { requireAdminPermission } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("users") };
}

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await requireAdminPermission("user:read:admin", "/admin/users", { linkedToCase: false });
  const t = await getTranslations("admin");
  const format = await getFormatter();
  // URL invalide (page=0, page=abc, paramètre répété) : retour aux valeurs par défaut plutôt qu'une erreur 500.
  const parsedQuery = userListQuerySchema.safeParse(await props.searchParams);
  const query = parsedQuery.success ? parsedQuery.data : userListQuerySchema.parse({});
  const { rows, total } = await listUsers(query);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const hrefFor = (page: number) =>
    `/admin/users?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), page: String(page) }).toString()}` as Route;
  if (query.page > totalPages) redirect(hrefFor(totalPages));

  return (
    <>
      <Breadcrumbs items={[{ label: t("metaTitle"), href: "/admin" }, { label: t("users") }]} />
      <h1 className="font-serif text-display-md text-fg">{t("users")}</h1>

      <form role="search" className="mt-6 flex max-w-xl gap-2" action="/admin/users">
        <label htmlFor="recherche-utilisateurs" className="sr-only">
          {t("usersSearch")}
        </label>
        <Input id="recherche-utilisateurs" name="q" defaultValue={query.q ?? ""} placeholder={t("usersSearch")} />
        <Button type="submit" variant="secondary">
          {t("usersSearchSubmit")}
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">{t("usersEmpty")}</p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-lg border lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle text-fg">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colName")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colStatus")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colRoles")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colMfa")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t("colCreated")}</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-bg-elevated">
                {rows.map((user) => (
                  <tr key={user.id} className="h-11">
                    <td className="px-4 py-2">
                      <Link href={`/admin/users/${user.id}`} className="font-medium text-accent underline-offset-4 hover:underline">
                        {user.displayName}
                      </Link>
                      <span className="block text-xs text-muted">
                        {user.handle ? `@${user.handle} · ` : ""}
                        {user.maskedEmail}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={user.status === "ACTIVE" ? "neutral" : "danger"}>{t(`status.${user.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {user.roles.length === 0 ? (
                        <span className="text-muted">{t("member")}</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} tone="accent">{t(`roles.${role}`)}</Badge>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{user.twoFactorEnabled ? t("mfaOn") : t("mfaOff")}</td>
                    <td className="px-4 py-2 text-right text-muted tabular-nums">
                      {format.dateTime(user.createdAt, { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 divide-y rounded-lg border bg-bg-elevated lg:hidden">
            {rows.map((user) => (
              <li key={user.id}>
                <Link href={`/admin/users/${user.id}`} className="flex flex-col gap-1 px-4 py-3">
                  <span className="font-medium text-accent">{user.displayName}</span>
                  <span className="text-xs text-muted">
                    {t(`status.${user.status}`)} · {user.roles.length === 0 ? t("member") : user.roles.map((r) => t(`roles.${r}`)).join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={query.page} totalPages={totalPages} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}
