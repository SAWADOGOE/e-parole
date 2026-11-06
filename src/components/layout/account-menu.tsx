"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { LazyMenuTrigger } from "@/components/shared/lazy-menu-trigger";
import { initials } from "@/lib/initials";
import type { AccountMenuProps } from "./account-menu-full";

export type { AccountMenuProps } from "./account-menu-full";

const TRIGGER = "inline-flex size-11 items-center justify-center rounded-full border border-gold bg-accent-subtle text-sm font-semibold text-brand";
const load = () => import("./account-menu-full");
const AccountMenuFull = dynamic(load, { ssr: false, loading: () => <span aria-hidden="true" className={TRIGGER} /> });

/** Menu du compte chargé à la demande : le client d'authentification et Radix restent hors du JS initial de chaque page. */
export function AccountMenu(props: Omit<AccountMenuProps, "initialOpen">) {
  const t = useTranslations("nav");
  return (
    <LazyMenuTrigger
      label={t("accountMenu")}
      className={TRIGGER}
      icon={<span aria-hidden="true">{initials(props.displayName) || "?"}</span>}
      preload={() => void load()}
      render={() => <AccountMenuFull {...props} initialOpen />}
    />
  );
}
