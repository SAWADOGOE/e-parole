import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { AccountMenu, type AccountMenuProps } from "./account-menu";
import { BottomNav, SideNav } from "./member-nav";
import { VerifyEmailBanner } from "./verify-email-banner";

interface AppShellProps {
  account: (AccountMenuProps & { email: string; emailVerified: boolean }) | null;
  aside?: ReactNode;
  children: ReactNode;
}

/** Shell de l'espace membre : mobile-first, trois colonnes à partir de 1024 px (docs/14, docs/17). */
export async function AppShell({ account, aside, children }: AppShellProps) {
  const t = await getTranslations();
  return (
    <div className="min-h-dvh">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-brand-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("common.skipToContent")}
      </a>
      <header className="sticky top-0 z-30 border-b bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-(--header-height) max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/" className="rounded-md">
            <Wordmark />
            <span className="sr-only">{t("nav.home")}</span>
          </Link>
          <div className="flex items-center gap-2">
            {account ? (
              <AccountMenu
                displayName={account.displayName}
                handle={account.handle}
                showAdmin={account.showAdmin}
                manageHref={account.manageHref}
              />
            ) : (
              <>
                <ThemeToggle className="hidden sm:inline-flex" />
                <Button asChild variant="ghost" size="sm">
                  <Link href="/connexion">{t("nav.signIn")}</Link>
                </Button>
                <Button asChild size="sm" className="hidden min-[400px]:inline-flex">
                  <Link href="/inscription">{t("nav.signUp")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        {account && !account.emailVerified ? <VerifyEmailBanner email={account.email} /> : null}
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <div className="hidden md:block">
          <div className="sticky top-[calc(var(--header-height)+16px)] py-4">
            <SideNav />
          </div>
        </div>
        <main id="contenu" tabIndex={-1} className="min-w-0 pt-6 pb-[calc(var(--bottom-nav-height)+32px)] md:pb-12 lg:max-w-[40rem]">
          {children}
        </main>
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-height)+16px)] py-6">{aside}</div>
        </aside>
      </div>

      <BottomNav />
    </div>
  );
}
