"use client";

import { Bookmark, LayoutDashboard, LogOut, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataSaverToggle } from "@/components/shared/data-saver-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/features/auth/lib/auth-client";
import { initials } from "@/lib/initials";

export interface AccountMenuProps {
  /** Ouvert dès le montage : chargé à la demande par AccountMenu (account-menu.tsx). */
  initialOpen?: boolean;
  displayName: string;
  handle: string | null;
  showAdmin: boolean;
  manageHref: string | null;
  /** Absent dans /admin : le réglage concerne l'espace membre. */
  dataSaver?: boolean;
}

export default function AccountMenuFull({ displayName, handle, showAdmin, manageHref, dataSaver, initialOpen = false }: AccountMenuProps) {
  const t = useTranslations("nav");
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return (
    <DropdownMenu defaultOpen={initialOpen}>
      <DropdownMenuTrigger
        aria-label={t("accountMenu")}
        className="inline-flex size-11 items-center justify-center rounded-full border border-gold bg-accent-subtle text-sm font-semibold text-brand"
      >
        {initials(displayName) || "?"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold text-fg">{displayName}</span>
          {handle ? <span className="block">@{handle}</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profil">
            <UserRound aria-hidden="true" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/favoris">
            <Bookmark aria-hidden="true" />
            {t("bookmarks")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/membres">
            <Search aria-hidden="true" />
            {t("people")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/parametres/securite">
            <ShieldCheck aria-hidden="true" />
            {t("security")}
          </Link>
        </DropdownMenuItem>
        {manageHref ? (
          <DropdownMenuItem asChild>
            <a href={manageHref}>
              <UsersRound aria-hidden="true" />
              {t("manage")}
            </a>
          </DropdownMenuItem>
        ) : null}
        {showAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard aria-hidden="true" />
              {t("admin")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <ThemeToggle />
        </div>
        {dataSaver === undefined ? null : (
          <div className="px-2 py-1.5">
            <DataSaverToggle enabled={dataSaver} />
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
